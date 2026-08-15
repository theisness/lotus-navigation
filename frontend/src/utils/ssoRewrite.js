// 社区 / 影院 / chat 入口 SSO 改写（方案 §7.2）。
// 打开 URL 的所有入口统一过 rewriteSsoUrl；开关关掉时原样返回。
// 目标站 host 构建期经环境变量注入（frontend/.env.production.local，不进 git），
// 默认空串 = 永不命中 = 不改写；开源仓不含真实域名。

export const REWRITE_CINEMA = true;
export const REWRITE_BLOG = true; // 2026-08-15 社区 oauth2-basic 已上线（rebuild 完成）
export const REWRITE_CHAT = true; // 2026-08-15 chat sso_login 已上线 .204

const BLOG_HOST = import.meta.env.VITE_SSO_BLOG_HOST || '';
const CINEMA_HOST = import.meta.env.VITE_SSO_CINEMA_HOST || '';
const CHAT_HOST = import.meta.env.VITE_SSO_CHAT_HOST || '';

export function rewriteSsoUrl(rawUrl) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  // 社区：走 oauth2-basic 授权（几乎都是从站点根进，深链第一版也落根）
  if (u.host === BLOG_HOST && REWRITE_BLOG) {
    return `https://${BLOG_HOST}/auth/oauth2_basic`;
  }

  // 影院：HMAC 跳转，next 带原 path+search（只许站内相对路径）
  if (u.host === CINEMA_HOST && REWRITE_CINEMA) {
    const next = `${u.pathname}${u.search}` || '/';
    return `https://${CINEMA_HOST}/accounts/lotus-sso/?next=${encodeURIComponent(next)}`;
  }

  // 蓝莲花 chat：去导航桥页签断言（桥页同源能读 JWT），再由桥页 302 到 chat /sso-login
  if (u.host === CHAT_HOST && REWRITE_CHAT) {
    return '/sso/chat';
  }

  return rawUrl;
}
