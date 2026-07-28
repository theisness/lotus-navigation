package site.ssbx.nav;

import android.content.Context;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

/**
 * 配合下拉的 SwipeRefreshLayout：
 * 页面滚动发生在 WebView 内部的可滚动 div（overflow-y:auto）里时，
 * WebView.canScrollVertically(-1) 恒为 false，默认实现会在任何下滑时误触发刷新。
 * 这里改为由注入 JS 实时上报「是否有滚动容器不在顶部」，只有回到最顶部才允许下拉刷新。
 */
public class WebViewSwipeRefreshLayout extends SwipeRefreshLayout {

    private final WebView webView;
    private volatile boolean jsCanScrollUp = false;

    public WebViewSwipeRefreshLayout(Context context, WebView webView) {
        super(context);
        this.webView = webView;
    }

    @Override
    public boolean canChildScrollUp() {
        return jsCanScrollUp || (webView != null && webView.canScrollVertically(-1));
    }

    /** 注入到页面里的滚动监听（capture 阶段能捕到内部 div 的 scroll） */
    public static final String INJECT_JS = "(function(){"
            + "if(window.__lotusScrollWatch)return;window.__lotusScrollWatch=1;"
            + "var scrolled=new Set();"
            // 跨域 iframe（如影院 ssbx.site）内部滚动位置拿不到：
            // 只要有大 iframe 覆盖视口就禁掉下拉刷新，手势全部让给页面滚动
            + "function iframeCovers(){"
            + "  var fs=document.querySelectorAll('iframe');"
            + "  for(var i=0;i<fs.length;i++){var r=fs[i].getBoundingClientRect();"
            + "    if(r.width>window.innerWidth*0.8&&r.height>window.innerHeight*0.6&&r.top<window.innerHeight*0.5&&r.bottom>window.innerHeight*0.5)return true;}"
            + "  return false;}"
            + "function report(){"
            + "  scrolled.forEach(function(e){if(!e.isConnected||e.scrollTop<=0)scrolled.delete(e);});"
            + "  var up=(window.scrollY>0)||scrolled.size>0||iframeCovers();"
            + "  if(window.NativeScroll)NativeScroll.setCanScrollUp(up);"
            + "}"
            + "document.addEventListener('scroll',function(ev){"
            + "  var t=ev.target;"
            + "  if(t===document){report();return;}"
            + "  if(t&&t.nodeType===1){if(t.scrollTop>0){scrolled.add(t);}else{scrolled.delete(t);}}"
            + "  report();"
            + "},true);"
            + "setInterval(report,1500);"
            + "report();"
            + "})();";

    /** JS 桥：页面调用 NativeScroll.setCanScrollUp(boolean) */
    public class ScrollBridge {
        @JavascriptInterface
        public void setCanScrollUp(boolean canScrollUp) {
            jsCanScrollUp = canScrollUp;
        }

        @JavascriptInterface
        public void reset() {
            jsCanScrollUp = false;
        }
    }
}
