package site.ssbx.nav;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * 自动更新：
 * 1. GET https://index.ssbx.site/api/download/app-version?t=<ts>（后端 no-store，?t= 防 CDN 缓存）
 *    期望返回 {"versionCode":2,"versionName":"1.1.0","notes":"...","force":false}
 * 2. versionCode 大于当前 → 弹更新说明对话框
 * 3. 确认后带进度下载 /api/download/latest-apk 到 getExternalFilesDir("updates")
 * 4. FileProvider 发安装 Intent；Android 8+ 未授权安装未知应用时先跳设置页
 */
public class UpdateChecker {

    private static final String VERSION_URL = "https://index.ssbx.site/api/download/app-version";
    private static final String APK_URL = "https://index.ssbx.site/api/download/latest-apk";
    private static final String PREFS = "update_checker";
    private static final String KEY_LAST_CHECK = "last_check";
    private static final long CHECK_INTERVAL_MS = 6L * 60 * 60 * 1000; // 6 小时

    private final Activity activity;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private AlertDialog progressDialog;
    private ProgressBar progressBar;
    private TextView progressText;

    public UpdateChecker(Activity activity) {
        this.activity = activity;
    }

    /** 启动时检查（受 6h 节流约束） */
    public void checkOnStart() {
        checkIfDue();
    }

    /** 回到前台时检查（受 6h 节流约束） */
    public void checkOnResume() {
        checkIfDue();
    }

    private void checkIfDue() {
        SharedPreferences prefs = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        long last = prefs.getLong(KEY_LAST_CHECK, 0);
        long now = System.currentTimeMillis();
        if (now - last < CHECK_INTERVAL_MS) return;
        prefs.edit().putLong(KEY_LAST_CHECK, now).apply();
        fetchVersionInfo();
    }

    private int currentVersionCode() {
        try {
            PackageInfo pi = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
            if (Build.VERSION.SDK_INT >= 28) return (int) pi.getLongVersionCode();
            return pi.versionCode;
        } catch (Exception e) {
            return 1;
        }
    }

    private void fetchVersionInfo() {
        new Thread(() -> {
            try {
                HttpURLConnection conn = (HttpURLConnection) new URL(VERSION_URL + "?t=" + System.currentTimeMillis()).openConnection();
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);
                conn.setUseCaches(false);
                if (conn.getResponseCode() != 200) { conn.disconnect(); return; }
                String body = readAll(conn.getInputStream());
                conn.disconnect();

                JSONObject json = new JSONObject(body);
                int remoteCode = json.optInt("versionCode", 0);
                String remoteName = json.optString("versionName", "");
                String notes = json.optString("notes", "");
                boolean force = json.optBoolean("force", false);

                if (remoteCode > currentVersionCode()) {
                    mainHandler.post(() -> showUpdateDialog(remoteName, notes, force));
                }
            } catch (Exception ignored) {
                // 网络失败静默跳过，下次再查
            }
        }, "update-check").start();
    }

    private void showUpdateDialog(String versionName, String notes, boolean force) {
        if (activity.isFinishing() || activity.isDestroyed()) return;
        String message = "v" + versionName + (notes.isEmpty() ? "" : "\n\n" + notes);
        AlertDialog.Builder builder = new AlertDialog.Builder(activity)
                .setTitle("发现新版本")
                .setMessage(message)
                .setPositiveButton("立即更新", (d, w) -> downloadAndInstall())
                .setCancelable(!force);
        if (!force) {
            builder.setNegativeButton("以后再说", null);
        }
        builder.show();
    }

    private void downloadAndInstall() {
        File dir = activity.getExternalFilesDir("updates");
        if (dir == null) {
            Toast.makeText(activity, "存储不可用", Toast.LENGTH_SHORT).show();
            return;
        }
        dir.mkdirs();
        File apkFile = new File(dir, "lotus-nav-latest.apk");
        if (apkFile.exists()) apkFile.delete();

        // 进度对话框
        progressBar = new ProgressBar(activity, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressText = new TextView(activity);
        progressText.setText("0%");
        progressText.setPadding(0, 16, 0, 0);
        LinearLayout layout = new LinearLayout(activity);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(48, 24, 48, 0);
        layout.addView(progressBar, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        layout.addView(progressText);
        progressDialog = new AlertDialog.Builder(activity)
                .setTitle("正在下载更新")
                .setView(layout)
                .setCancelable(false)
                .create();
        progressDialog.show();

        new Thread(() -> {
            try {
                HttpURLConnection conn = (HttpURLConnection) new URL(APK_URL + "?t=" + System.currentTimeMillis()).openConnection();
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(30000);
                conn.setUseCaches(false);
                conn.setInstanceFollowRedirects(true);
                if (conn.getResponseCode() != 200) throw new Exception("HTTP " + conn.getResponseCode());
                long total = conn.getContentLengthLong();
                try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(apkFile)) {
                    byte[] buf = new byte[64 * 1024];
                    long downloaded = 0;
                    int n;
                    int lastPercent = -1;
                    while ((n = in.read(buf)) != -1) {
                        out.write(buf, 0, n);
                        downloaded += n;
                        if (total > 0) {
                            int percent = (int) (downloaded * 100 / total);
                            if (percent != lastPercent) {
                                lastPercent = percent;
                                mainHandler.post(() -> {
                                    progressBar.setProgress(percent);
                                    progressText.setText(percent + "%");
                                });
                            }
                        }
                    }
                }
                conn.disconnect();
                mainHandler.post(() -> {
                    dismissProgress();
                    installApk(apkFile);
                });
            } catch (Exception e) {
                mainHandler.post(() -> {
                    dismissProgress();
                    Toast.makeText(activity, "下载失败，请稍后再试", Toast.LENGTH_LONG).show();
                });
            }
        }, "update-download").start();
    }

    private void dismissProgress() {
        if (progressDialog != null) {
            progressDialog.dismiss();
            progressDialog = null;
        }
    }

    private void installApk(File apkFile) {
        // Android 8+ 需要「安装未知应用」授权
        if (Build.VERSION.SDK_INT >= 26 && !activity.getPackageManager().canRequestPackageInstalls()) {
            Toast.makeText(activity, "请允许「莲花导航」安装应用后重试", Toast.LENGTH_LONG).show();
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + activity.getPackageName()));
            activity.startActivity(intent);
            return;
        }
        Uri uri = FileProvider.getUriForFile(activity, "site.ssbx.nav.fileprovider", apkFile);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity.startActivity(intent);
    }

    private static String readAll(InputStream in) throws Exception {
        StringBuilder sb = new StringBuilder();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) != -1) {
            sb.append(new String(buf, 0, n, "UTF-8"));
        }
        return sb.toString();
    }
}
