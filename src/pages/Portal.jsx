import React, { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import ToggleSidebar from '../components/ToggleSidebar.jsx';
import Loader from '../components/Loader.jsx';
import IframeView from '../components/IframeView.jsx';
import styles from '../css/pages/Portal.module.css';

const siteInfo = {
  siteA: { title: '影院', url: 'https://ssbx.site' },
  siteB: { title: '社区', url: 'https://blog.ssbx.site' },
  siteC: { title: '命理社区', url: 'https://destiny.ssbx.site' }
};

export default function Portal() {
  const [selected, setSelected] = useState('siteA');
  const [collapsed, setCollapsed] = useState(false);
  const [loaderVisible, setLoaderVisible] = useState(false);
  const [reloadCounters, setReloadCounters] = useState({ siteA: 0, siteB: 0, siteC: 0 });
  const mainRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const current = useMemo(() => siteInfo[selected], [selected]);

  const handleSelect = (site) => {
    if (site === selected) return;
    setLoaderVisible(true);
    setSelected(site);
    // 若iframe已缓存，保障最迟也会隐藏加载
    setTimeout(() => setLoaderVisible(false), 400);
  };

  const handleRefresh = () => {
    setLoaderVisible(true);
    setReloadCounters((prev) => ({ ...prev, [selected]: prev[selected] + 1 }));
  };

  const handleToggleSidebar = () => {
    setCollapsed((v) => !v);
  };

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
          />
        </aside>
      )}

      <main className={styles.main} ref={mainRef}>
        <ToggleSidebar collapsed={collapsed} onToggle={handleToggleSidebar} />

        <div className={styles.content}>
          <Loader visible={loaderVisible} />

          <IframeView
            visible={selected === 'siteA'}
            url={siteInfo.siteA.url}
            reloadKey={reloadCounters.siteA}
            onLoad={() => setLoaderVisible(false)}
          />
          <IframeView
            visible={selected === 'siteB'}
            url={siteInfo.siteB.url}
            reloadKey={reloadCounters.siteB}
            onLoad={() => setLoaderVisible(false)}
          />
          <IframeView
            visible={selected === 'siteC'}
            url={siteInfo.siteC.url}
            reloadKey={reloadCounters.siteC}
            onLoad={() => setLoaderVisible(false)}
          />
        </div>
      </main>
    </div>
  );
}