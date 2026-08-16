package site.ssbx.nav;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.res.Configuration;
import android.graphics.Color;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 莲花导航 WebView 壳
 * - 加载 https://index.ssbx.site
 * - UA 追加 LotusNavApp/<versionName>（前端据此隐藏「下载安卓版」）
 * - target=_blank / 非 http(s) 链接 → 系统浏览器
 * - 断网 → 本地错误页（assets/error.html），可点重试
 * - 下拉刷新、返回键后退、文件选择（头像上传）、下载走系统 DownloadManager
 * - 自动更新见 UpdateChecker
 */
public class MainActivity extends Activity {

    private static final String HOME_URL = "https://index.ssbx.site/";
    private static final String ERROR_URL = "file:///android_asset/error.html";
    private static final int REQ_FILE_CHOOSER = 1001;
    static final int REQ_INSTALL_PERMISSION = 1002;

    private WebView webView;
    private WebViewSwipeRefreshLayout swipeLayout;
    private UpdateChecker updateChecker;
    private ValueCallback<Uri[]> filePathCallback;
    private boolean errorPageShown = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        swipeLayout = new WebViewSwipeRefreshLayout(this, webView);
        swipeLayout.addView(webView);
        swipeLayout.setColorSchemeColors(Color.parseColor("#667eea"));
        swipeLayout.setOnRefreshListener(() -> {
            errorPageShown = false;
            webView.reload();
        });
        setContentView(swipeLayout);

        webView.addJavascriptInterface(swipeLayout.new ScrollBridge(), "NativeScroll");
        // 前端下载桥：站点（如蓝莲花聊天）检测到 LotusNavNative 后，
        // 绕过 blob: URL，把真实地址交原生下载
        webView.addJavascriptInterface(new DownloadBridge(), "LotusNavNative");

        setupWebView();

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            // 支持 adb / 外部 Intent 打开指定 https 链接（验收内嵌站时用）
            Uri launch = getIntent() != null ? getIntent().getData() : null;
            if (launch != null && ("http".equals(launch.getScheme()) || "https".equals(launch.getScheme()))) {
                webView.loadUrl(launch.toString());
            } else {
                webView.loadUrl(HOME_URL);
            }
        }

        updateChecker = new UpdateChecker(this);
        updateChecker.checkOnStart();
    }

    private void setupWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportMultipleWindows(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setBuiltInZoomControls(false);
        // Android App 固定为 Chrome 网页字号的 110%；WebView 会叠乘系统 font_scale，
        // 因此用 textZoom 先抵消系统字体缩放，再保留 1.10 倍产品字号。
        applyAppTextZoom(s);
        s.setUserAgentString(s.getUserAgentString() + " LotusNavApp/" + versionName());
        // 禁止 WebView 算法/强制暗色：避免把浅色站整页反色
        disableWebViewForceDark(s);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if ("http".equals(scheme) || "https".equals(scheme)) {
                    return false; // WebView 内打开
                }
                return openExternally(uri);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    errorPageShown = true;
                    view.loadUrl(ERROR_URL);
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                swipeLayout.setRefreshing(false);
                if (!ERROR_URL.equals(url)) errorPageShown = false;
                // 注入滚动监听：内部 div 滚动时禁用下拉刷新，回顶才允许
                view.evaluateJavascript(WebViewSwipeRefreshLayout.INJECT_JS, null);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, android.os.Message resultMsg) {
                // target=_blank / window.open → 系统浏览器
                WebView temp = new WebView(MainActivity.this);
                temp.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                        return openExternally(request.getUrl());
                    }
                });
                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(temp);
                resultMsg.sendToTarget();
                return true;
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                Intent intent = params.createIntent();
                try {
                    startActivityForResult(intent, REQ_FILE_CHOOSER);
                } catch (ActivityNotFoundException e) {
                    filePathCallback = null;
                    return false;
                }
                return true;
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) -> {
            // blob: URL 是页面内存对象，原生无法直接下载；
            // 站点应改用 LotusNavNative 桥（见蓝莲花图片下载）。这里给个指引。
            if (url != null && url.startsWith("blob:")) {
                Toast.makeText(this, "该文件由网页内存生成，请用页面内的下载按钮保存", Toast.LENGTH_LONG).show();
                return;
            }
            String fileName = android.webkit.URLUtil.guessFileName(url, contentDisposition, mimetype);
            if (!enqueueSystemDownload(url, userAgent, contentDisposition, mimetype, fileName)) {
                // 系统 DownloadManager 不可用（国产 ROM 停用下载管理 / 旧系统缺存储权限等）→ 应用内自研下载兜底
                downloadWithApp(url, userAgent, fileName);
            }
        });
    }

    /** 前端 JS 桥：LotusNavNative.download(url, fileName) */
    private class DownloadBridge {
        @android.webkit.JavascriptInterface
        public void download(String url, String fileName) {
            runOnUiThread(() -> {
                if (!enqueueSystemDownload(url, webView.getSettings().getUserAgentString(), null, null, fileName)) {
                    downloadWithApp(url, webView.getSettings().getUserAgentString(), fileName);
                }
            });
        }
    }

    /**
     * 优先走系统 DownloadManager（通知栏进度、无需留在 App）。
     * 失败（组件不可用 / 权限缺失 / 参数非法）返回 false，由调用方降级。
     */
    private boolean enqueueSystemDownload(String url, String userAgent, String contentDisposition, String mimetype, String fileName) {
        try {
            DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
            if (mimetype != null && !mimetype.isEmpty()) req.setMimeType(mimetype);
            if (userAgent == null || userAgent.isEmpty()) userAgent = webView.getSettings().getUserAgentString();
            req.addRequestHeader("User-Agent", userAgent);
            // 登录态站点（论坛/社区附件）必须带 Cookie，否则 403
            String cookie = CookieManager.getInstance().getCookie(url);
            if (cookie != null && !cookie.isEmpty()) req.addRequestHeader("Cookie", cookie);
            req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
            DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            if (dm == null) return false;
            dm.enqueue(req);
            Toast.makeText(this, "开始下载：" + fileName, Toast.LENGTH_SHORT).show();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 应用内自研下载：HttpURLConnection 直接下载到 App 专属 Download 目录
     * （getExternalFilesDir 全版本免权限），完成后扫描进媒体库并弹出打开入口。
     */
    private void downloadWithApp(String url, String userAgent, String fallbackName) {
        Toast.makeText(this, "开始下载（应用内）", Toast.LENGTH_SHORT).show();
        new Thread(() -> {
            InputStream in = null;
            OutputStream out = null;
            try {
                URL u = new URL(url);
                HttpURLConnection conn = (HttpURLConnection) u.openConnection();
                conn.setInstanceFollowRedirects(true);
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(60000);
                if (userAgent != null) conn.setRequestProperty("User-Agent", userAgent);
                String cookie = CookieManager.getInstance().getCookie(url);
                if (cookie != null && !cookie.isEmpty()) conn.setRequestProperty("Cookie", cookie);
                int code = conn.getResponseCode();
                if (code != 200) throw new IOException("HTTP " + code);

                String fileName = parseFileName(conn, url, fallbackName);
                File dir = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "community");
                if (!dir.exists() && !dir.mkdirs()) throw new IOException("无法创建下载目录");
                File target = new File(dir, fileName);
                int i = 1;
                while (target.exists()) {
                    String base = fileName, ext = "";
                    int dot = fileName.lastIndexOf('.');
                    if (dot > 0) { base = fileName.substring(0, dot); ext = fileName.substring(dot); }
                    target = new File(dir, base + " (" + i + ")" + ext);
                    i++;
                }

                in = new BufferedInputStream(conn.getInputStream());
                out = new BufferedOutputStream(new FileOutputStream(target));
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
                out.flush();

                MediaScannerConnection.scanFile(this, new String[]{target.getAbsolutePath()}, null, null);
                File done = target;
                runOnUiThread(() -> {
                    Toast.makeText(this, "下载完成：" + done.getName(), Toast.LENGTH_LONG).show();
                    openDownloadedFile(done);
                });
            } catch (Exception e) {
                final String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                runOnUiThread(() -> Toast.makeText(this, "下载失败：" + msg, Toast.LENGTH_LONG).show());
            } finally {
                closeQuietly(in);
                closeQuietly(out);
            }
        }).start();
    }

    /** 文件名解析：Content-Disposition → URL 最后一段 → 兜底时间戳名。绝不出现「未命名」。 */
    private String parseFileName(HttpURLConnection conn, String url, String fallbackName) {
        String cd = conn.getHeaderField("Content-Disposition");
        if (cd != null) {
            Matcher m = Pattern.compile("filename\\*?=(?:UTF-8'')?\"?([^\";]+)").matcher(cd);
            if (m.find()) {
                String name = m.group(1).trim();
                if (!name.isEmpty()) return sanitizeFileName(name);
            }
        }
        String path = Uri.parse(url).getPath();
        if (path != null && !path.isEmpty()) {
            String last = path.substring(path.lastIndexOf('/') + 1);
            if (!last.isEmpty()) return sanitizeFileName(last);
        }
        if (fallbackName != null && !fallbackName.isEmpty() && !"download".equals(fallbackName)) {
            return sanitizeFileName(fallbackName);
        }
        String ext = MimeTypeMap.getFileExtensionFromUrl(url);
        String mime = conn.getContentType();
        if ((ext == null || ext.isEmpty()) && mime != null) {
            String e = MimeTypeMap.getSingleton().getExtensionFromMimeType(mime);
            if (e != null) ext = e;
        }
        String base = "lotus-nav-" + System.currentTimeMillis();
        return ext == null || ext.isEmpty() ? base : base + "." + ext;
    }

    private String sanitizeFileName(String name) {
        String n = name.replaceAll("[\\\\/:*?\"<>|\\r\\n]", "_").trim();
        return n.isEmpty() ? "lotus-nav-" + System.currentTimeMillis() : n;
    }

    /** FileProvider 打开已下载文件；失败则告知路径。 */
    private void openDownloadedFile(File file) {
        try {
            Uri uri = androidx.core.content.FileProvider.getUriForFile(this, "site.ssbx.nav.fileprovider", file);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, MimeTypeMap.getSingleton().getMimeTypeFromExtension(
                    MimeTypeMap.getFileExtensionFromUrl(file.getName())));
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "文件已保存：" + file.getAbsolutePath(), Toast.LENGTH_LONG).show();
        }
    }

    private void closeQuietly(java.io.Closeable c) {
        if (c != null) {
            try {
                c.close();
            } catch (IOException ignored) {
            }
        }
    }

    private boolean openExternally(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException ignored) {
        }
        return true;
    }

    /**
     * 让 WebView 正文字号保持为 Chrome 默认的 110%。
     * 系统「显示大小/字体大小」会进 Configuration.fontScale；WebView 再叠 textZoom，
     * 不抵消时会比 Chrome 明显偏大。
     */
    private void applyAppTextZoom(WebSettings s) {
        float fontScale = getResources().getConfiguration().fontScale;
        if (fontScale <= 0.01f) fontScale = 1f;
        int zoom = Math.round(110f / fontScale);
        if (zoom < 50) zoom = 50;
        if (zoom > 200) zoom = 200;
        s.setTextZoom(zoom);
    }

    /** WebView 暗色：跟 App theme 的 isLightTheme 走 prefers-color-scheme；再叠加 FORCE_DARK 会双杀。 */
    private void disableWebViewForceDark(WebSettings s) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            s.setAlgorithmicDarkeningAllowed(false);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // FORCE_DARK_OFF = 0；API 29-32
            try {
                s.getClass().getMethod("setForceDark", int.class).invoke(s, 0);
            } catch (Exception ignored) {
            }
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        // 用户改了系统字体大小后，重新对齐网页字号
        if (webView != null) {
            applyAppTextZoom(webView.getSettings());
        }
    }

    private String versionName() {
        try {
            PackageInfo pi = getPackageManager().getPackageInfo(getPackageName(), 0);
            return pi.versionName;
        } catch (Exception e) {
            return "1.0.0";
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_FILE_CHOOSER) {
            if (filePathCallback != null) {
                Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
        } else if (requestCode == REQ_INSTALL_PERMISSION) {
            // 从「安装未知应用」设置页返回：有权限则继续装已下好的 APK
            if (updateChecker != null) updateChecker.retryPendingInstall();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
        if (updateChecker != null) {
            updateChecker.retryPendingInstall();
            updateChecker.checkOnResume();
        }
    }

    @Override
    protected void onPause() {
        webView.onPause();
        super.onPause();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (errorPageShown) {
            errorPageShown = false;
            webView.loadUrl(HOME_URL);
        } else if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            swipeLayout.removeView(webView);
            webView.destroy();
        }
        super.onDestroy();
    }
}
