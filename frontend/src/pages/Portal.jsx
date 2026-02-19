import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import ToggleSidebar from '../components/ToggleSidebar.jsx';
import Loader from '../components/Loader.jsx';
import IframeView from '../components/IframeView.jsx';
import styles from '../css/pages/Portal.module.css';

const siteInfo = {
  siteA: { title: '影院', url: 'https://ssbx.site', emoji: '🎬' },
  siteB: { title: '社区', url: 'https://blog.ssbx.site', emoji: '💬' },
  siteC: { title: '命理社区', url: 'https://destiny.ssbx.site', emoji: '🔮' }
};

export default function Portal() {
  const [selected, setSelected] = useState('siteA');
  const [collapsed, setCollapsed] = useState(false);
  const [loaderVisible, setLoaderVisible] = useState(false);
  const [reloadCounters, setReloadCounters] = useState({ siteA: 0, siteB: 0, siteC: 0 });
  const mainRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  const current = useMemo(() => siteInfo[selected], [selected]);

  // 主题切换
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleToggleTheme = useCallback(() => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  }, []);

  const handleSelect = (site) => {
    if (site === selected) return;
    setLoaderVisible(true);
    setSelected(site);
    setTimeout(() => setLoaderVisible(false), 400);
  };

  const handleRefresh = () => {
    setLoaderVisible(true);
    setReloadCounters((prev) => ({ ...prev, [selected]: prev[selected] + 1 }));
  };

  const handleToggleSidebar = () => setCollapsed((v) => !v);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && mainRef.current) {
        await mainRef.current.requestFullscreen();
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('全屏切换错误:', err);
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  return (
    <div className={styles.app}>
      {!collapsed && (
        <aside className={styles.sidebar}>
          <Sidebar
            selected={selected}
            siteInfo={siteInfo}
            currentTitle={current.title}
            currentUrl={current.url}
            onSelect={handleSelect}
            onRefresh={handleRefresh}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            onCollapse={handleToggleSidebar}
            theme={theme}
            onToggleTheme={handleToggleTheme}
          />
        </aside>
      )}

      <main className={styles.main} ref={mainRef}>
        {!isFullscreen && <ToggleSidebar collapsed={collapsed} onToggle={handleToggleSidebar} />}

        <div className={styles.content}>
          <Loader visible={loaderVisible} />
          {Object.keys(siteInfo).map((key) => (
            <IframeView
              key={key}
              visible={selected === key}
              url={siteInfo[key].url}
              reloadKey={reloadCounters[key]}
              onLoad={() => setLoaderVisible(false)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
