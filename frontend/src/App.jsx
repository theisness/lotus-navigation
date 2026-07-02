import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Portal from './pages/Portal.jsx';
import MobilePortal from './mobile/MobilePortal.jsx';
import GuestPortal from './pages/GuestPortal.jsx';
import { getToken } from './api.js';
import './css/common.css';
// 衬线字体全局引入一次：登录态卡片标题/顶栏问候语、游客门户品牌字都用得到
import '@fontsource/noto-serif-sc/700.css';
import '@fontsource/noto-serif-sc/900.css';

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

export default function App() {
  const isMobile = useIsMobile();
  // 是否曾登录过（有本地 token）。只在首次挂载判定一次，
  // 登录态的整套 Portal/MobilePortal + usePortal 逻辑保持原样不动；
  // 游客态（无 token）改走全新的 GuestPortal，桌面/移动共用一套响应式布局。
  const [hasToken, setHasToken] = useState(() => Boolean(getToken()));

  if (!hasToken) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<GuestPortal onLoginSuccess={() => setHasToken(true)} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  const Page = isMobile ? MobilePortal : Portal;
  const onLoggedOut = () => setHasToken(false); // 登出后退回品牌登录门

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Page onLoggedOut={onLoggedOut} />} />
        <Route path="/download" element={<Page onLoggedOut={onLoggedOut} />} />
        <Route path="/nav/:navId/*" element={<Page onLoggedOut={onLoggedOut} />} />
      </Routes>
    </BrowserRouter>
  );
}
