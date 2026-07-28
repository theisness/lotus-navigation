package site.ssbx.nav;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

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
            try {
                DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
                req.setMimeType(mimetype);
                req.addRequestHeader("User-Agent", userAgent);
                req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                String fileName = android.webkit.URLUtil.guessFileName(url, contentDisposition, mimetype);
                req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
                DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                dm.enqueue(req);
                Toast.makeText(this, "开始下载：" + fileName, Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                Toast.makeText(this, "下载失败", Toast.LENGTH_SHORT).show();
            }
        });
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
