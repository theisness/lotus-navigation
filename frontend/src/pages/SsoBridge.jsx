import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import AuthForm from '../components/AuthForm.jsx';
import { getToken, ssoApi } from '../api.js';

// chat SSO 落地页完整 URL（构建期注入，.env.production.local 不进 git）
const CHAT_SSO_LOGIN_URL = import.meta.env.VITE_CHAT_SSO_LOGIN_URL || '';

// SSO 桥页：/oauth/authorize（社区）与 /sso/mediacms（影院）共用。
// 已登录 → 直接调后端拿 redirect 跳走；未登录 → 内嵌 AuthForm，登完继续，query 不丢。
// 在门户 iframe 里也会渲染这页（同源，localStorage 可读）。
export default function SsoBridge() {
  const location = useLocation();
  const isOauth = location.pathname === '/oauth/authorize';
  const isChat = location.pathname === '/sso/chat';
  const siteName = isOauth ? '施家远布社区' : isChat ? '蓝莲花聊天' : '莲花影院';

  const [needAuth, setNeedAuth] = useState(false);
  const [error, setError] = useState('');
  const startedRef = useRef(false);

  const run = useCallback(async () => {
    setError('');
    if (!getToken()) {
      setNeedAuth(true);
      return;
    }
    const q = new URLSearchParams(location.search);
    try {
      let data;
      if (isOauth) {
        data = await ssoApi.oauthAuthorize({
          client_id: q.get('client_id') || '',
          redirect_uri: q.get('redirect_uri') || '',
          response_type: q.get('response_type') || 'code',
          state: q.get('state') ?? undefined,
        });
      } else if (isChat) {
        // 断言回导航签好后 302 到 chat 前端（query 携带，与影院同构）
        if (!CHAT_SSO_LOGIN_URL) throw new Error('chat 入口未配置');
        data = await ssoApi.chat();
        window.location.href =
          `${CHAT_SSO_LOGIN_URL}?assertion=${encodeURIComponent(data.assertion)}&sig=${data.sig}`;
        return;
      } else {
        data = await ssoApi.mediacms({
          nonce: q.get('nonce') || '',
          return: q.get('return') || '',
          sig: q.get('sig') || '',
        });
      }
      window.location.href = data.redirect;
    } catch (err) {
      setError(err.message || '跳转失败，请稍后再试');
    }
  }, [isOauth, isChat, location.search]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    run();
  }, [run]);

  const handleLoginSuccess = useCallback(() => {
    setNeedAuth(false);
    run();
  }, [run]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f1420', color: '#e8e4d8', fontFamily: 'inherit', padding: '24px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        {error ? (
          <>
            <p style={{ fontSize: 15, lineHeight: 1.8 }}>无法进入{siteName}：{error}</p>
            <a href="/" style={{ color: '#c9a86a' }}>回莲花导航</a>
          </>
        ) : (
          <p style={{ fontSize: 15, lineHeight: 1.8 }}>
            正在进入{siteName}…
          </p>
        )}
      </div>
      <AuthForm visible={needAuth} onClose={() => setError('需要先登录莲花导航')} onLoginSuccess={handleLoginSuccess} />
    </div>
  );
}
