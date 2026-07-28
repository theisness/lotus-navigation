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
 * 自动更新流程：
 * 1. 冷启动必查 GET /api/download/app-version?t=（后端 no-store；?t= 防 CDN）
 *    {"versionCode":3,"versionName":"1.0.2","notes":"...","force":false}
 * 2. remote versionCode &gt; 本地 → 弹「发现新版本 / 立即更新 / 以后再说」
 * 3. 确认后下载 /api/download/latest-apk 到 getExternalFilesDir("updates")，带进度条
 * 4. FileProvider 调起系统安装器；Android 8+ 未开「安装未知应用」时先跳设置，
 *    返回后自动继续安装（pending apk 路径落 SharedPreferences）
 *
 * onResume 仅 6h 节流复查，避免反复弹窗；冷启动不受节流。
 */
public class UpdateChecker {

    private static final String VERSION_URL = "https://index.ssbx.site/api/download/app-version";
    private static final String APK_URL = "https://index.ssbx.site/api/download/latest-apk";
    private static final String PREFS = "update_checker";
    private static final String KEY_LAST_CHECK = "last_check";
    private static final String KEY_PENDING_APK = "pending_apk";
    private static final String KEY_SKIPPED_CODE = "skipped_version_code";
    private static final long RESUME_CHECK_INTERVAL_MS = 6L * 60 * 60 * 1000; // resume 节流 6h
    private static final long START_DELAY_MS = 800; // 等首屏出来再弹，避免抢 splash

    private final Activity activity;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private AlertDialog progressDialog;
    private ProgressBar progressBar;
    private TextView progressText;
    private boolean checking;
    private boolean dialogShowing;

    public UpdateChecker(Activity activity) {
        this.activity = activity;
    }

    /** 冷启动：始终检查（不节流） */
    public void checkOnStart() {
        mainHandler.postDelayed(this::fetchVersionInfo, START_DELAY_MS);
    }

    /** 回前台：节流复查 + 尝试装挂起的 APK */
    public void checkOnResume() {
        SharedPreferences prefs = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        long last = prefs.getLong(KEY_LAST_CHECK, 0);
        long now = System.currentTimeMillis();
        if (now - last < RESUME_CHECK_INTERVAL_MS) return;
        fetchVersionInfo();
    }

    /** 安装权限设置页返回 / onResume：若有挂起 APK 且已授权 → 继续装 */
    public void retryPendingInstall() {
        SharedPreferences prefs = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String path = prefs.getString(KEY_PENDING_APK, null);
        if (path == null || path.isEmpty()) return;
        File apk = new File(path);
        if (!apk.isFile() || apk.length() < 1024) {
            prefs.edit().remove(KEY_PENDING_APK).apply();
            return;
        }
        if (Build.VERSION.SDK_INT >= 26 && !activity.getPackageManager().canRequestPackageInstalls()) {
            return; // 仍未授权，等下次
        }
        prefs.edit().remove(KEY_PENDING_APK).apply();
        installApk(apk);
    }

    private int currentVersionCode() {
        try {
            PackageInfo pi = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
            if (Build.VERSION.SDK_INT >= 28) return (int) pi.getLongVersionCode();
            //noinspection deprecation
            return pi.versionCode;
        } catch (Exception e) {
            return 1;
        }
    }

    private void fetchVersionInfo() {
        if (checking || dialogShowing) return;
        checking = true;
        activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putLong(KEY_LAST_CHECK, System.currentTimeMillis())
                .apply();

        new Thread(() -> {
            try {
                HttpURLConnection conn = (HttpURLConnection) new URL(
                        VERSION_URL + "?t=" + System.currentTimeMillis()).openConnection();
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);
                conn.setUseCaches(false);
                conn.setRequestProperty("Cache-Control", "no-cache");
                int code = conn.getResponseCode();
                if (code != 200) {
                    conn.disconnect();
                    return;
                }
                String body = readAll(conn.getInputStream());
                conn.disconnect();

                JSONObject json = new JSONObject(body);
                int remoteCode = json.optInt("versionCode", 0);
                String remoteName = json.optString("versionName", "");
                String notes = json.optString("notes", "");
                boolean force = json.optBoolean("force", false);

                int local = currentVersionCode();
                if (remoteCode <= local) return;

                // 非强制：用户点过「以后再说」则本版本不再弹（直到出更新版本）
                SharedPreferences prefs = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
                if (!force && prefs.getInt(KEY_SKIPPED_CODE, 0) == remoteCode) return;

                mainHandler.post(() -> showUpdateDialog(remoteCode, remoteName, notes, force));
            } catch (Exception ignored) {
                // 网络失败静默，下次启动再查
            } finally {
                checking = false;
            }
        }, "update-check").start();
    }

    private void showUpdateDialog(int remoteCode, String versionName, String notes, boolean force) {
        if (activity.isFinishing() || activity.isDestroyed()) return;
        if (dialogShowing) return;
        dialogShowing = true;

        String message = "当前 v" + currentVersionName() + " → 新版本 v" + versionName
                + (notes.isEmpty() ? "" : "\n\n" + notes);
        AlertDialog.Builder builder = new AlertDialog.Builder(activity)
                .setTitle("发现新版本")
                .setMessage(message)
                .setPositiveButton("立即更新", (d, w) -> {
                    dialogShowing = false;
                    // 点更新则清掉 skip
                    activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                            .edit().remove(KEY_SKIPPED_CODE).apply();
                    downloadAndInstall();
                })
                .setOnDismissListener(d -> dialogShowing = false)
                .setCancelable(!force);

        if (!force) {
            builder.setNegativeButton("以后再说", (d, w) -> {
                activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                        .edit().putInt(KEY_SKIPPED_CODE, remoteCode).apply();
                dialogShowing = false;
            });
        }
        builder.show();
    }

    private String currentVersionName() {
        try {
            return activity.getPackageManager()
                    .getPackageInfo(activity.getPackageName(), 0).versionName;
        } catch (Exception e) {
            return "?";
        }
    }

    private void downloadAndInstall() {
        File dir = activity.getExternalFilesDir("updates");
        if (dir == null) {
            Toast.makeText(activity, "存储不可用", Toast.LENGTH_SHORT).show();
            return;
        }
        //noinspection ResultOfMethodCallIgnored
        dir.mkdirs();
        File apkFile = new File(dir, "lotus-nav-latest.apk");
        if (apkFile.exists()) //noinspection ResultOfMethodCallIgnored
            apkFile.delete();

        progressBar = new ProgressBar(activity, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressText = new TextView(activity);
        progressText.setText("准备下载…");
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
                HttpURLConnection conn = (HttpURLConnection) new URL(
                        APK_URL + "?t=" + System.currentTimeMillis()).openConnection();
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(60000);
                conn.setUseCaches(false);
                conn.setInstanceFollowRedirects(true);
                conn.setRequestProperty("Cache-Control", "no-cache");
                int status = conn.getResponseCode();
                // 跟随手动重定向（个别 CDN 对 POST/HEAD 行为怪，GET 一般 200）
                if (status / 100 == 3) {
                    String loc = conn.getHeaderField("Location");
                    conn.disconnect();
                    conn = (HttpURLConnection) new URL(loc).openConnection();
                    conn.setConnectTimeout(15000);
                    conn.setReadTimeout(60000);
                    conn.setInstanceFollowRedirects(true);
                    status = conn.getResponseCode();
                }
                if (status != 200) throw new Exception("HTTP " + status);

                long total = conn.getContentLengthLong();
                try (InputStream in = conn.getInputStream();
                     FileOutputStream out = new FileOutputStream(apkFile)) {
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
                                final int p = percent;
                                final long dl = downloaded;
                                final long tot = total;
                                mainHandler.post(() -> {
                                    if (progressBar != null) progressBar.setProgress(p);
                                    if (progressText != null) {
                                        progressText.setText(p + "%  ("
                                                + formatMb(dl) + " / " + formatMb(tot) + ")");
                                    }
                                });
                            }
                        } else {
                            final long dl = downloaded;
                            mainHandler.post(() -> {
                                if (progressText != null) {
                                    progressText.setText("已下载 " + formatMb(dl));
                                }
                            });
                        }
                    }
                }
                conn.disconnect();

                if (apkFile.length() < 10_000) {
                    throw new Exception("APK 过小，可能下载失败");
                }

                mainHandler.post(() -> {
                    dismissProgress();
                    // 挂起路径：若缺安装权限，设置页返回后 retryPendingInstall
                    activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                            .edit()
                            .putString(KEY_PENDING_APK, apkFile.getAbsolutePath())
                            .apply();
                    installApk(apkFile);
                });
            } catch (Exception e) {
                //noinspection ResultOfMethodCallIgnored
                apkFile.delete();
                mainHandler.post(() -> {
                    dismissProgress();
                    Toast.makeText(activity,
                            "下载失败：" + (e.getMessage() != null ? e.getMessage() : "请稍后再试"),
                            Toast.LENGTH_LONG).show();
                });
            }
        }, "update-download").start();
    }

    private static String formatMb(long bytes) {
        return String.format(java.util.Locale.US, "%.1f MB", bytes / (1024.0 * 1024.0));
    }

    private void dismissProgress() {
        if (progressDialog != null) {
            try {
                progressDialog.dismiss();
            } catch (Exception ignored) {
            }
            progressDialog = null;
        }
        progressBar = null;
        progressText = null;
    }

    private void installApk(File apkFile) {
        if (Build.VERSION.SDK_INT >= 26 && !activity.getPackageManager().canRequestPackageInstalls()) {
            Toast.makeText(activity, "请允许「莲花导航」安装应用，返回后将自动继续", Toast.LENGTH_LONG).show();
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + activity.getPackageName()));
            try {
                activity.startActivityForResult(intent, MainActivity.REQ_INSTALL_PERMISSION);
            } catch (Exception e) {
                activity.startActivity(intent);
            }
            return;
        }
        try {
            Uri uri = FileProvider.getUriForFile(activity, "site.ssbx.nav.fileprovider", apkFile);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(intent);
            // 已成功拉起安装器，清 pending（装完 versionCode 会变；取消安装则文件还在，可手动重进）
            activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit().remove(KEY_PENDING_APK).apply();
        } catch (Exception e) {
            Toast.makeText(activity, "无法打开安装器", Toast.LENGTH_LONG).show();
        }
    }

    private static String readAll(InputStream in) throws Exception {
        StringBuilder sb = new StringBuilder();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) != -1) {
            sb.append(new String(buf, 0, n, java.nio.charset.StandardCharsets.UTF_8));
        }
        return sb.toString();
    }
}
