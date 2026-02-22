import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Portal from './pages/Portal.jsx';
import MobilePortal from './mobile/MobilePortal.jsx';
import './css/common.css';

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
  const Page = isMobile ? MobilePortal : Portal;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Page />} />
        <Route path="/download" element={<Page />} />
        <Route path="/nav/:navId/*" element={<Page />} />
      </Routes>
    </BrowserRouter>
  );
}
