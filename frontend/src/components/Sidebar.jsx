import { useState, useRef, useEffect } from 'react';
import ThemePicker from './ThemePicker.jsx';
import styles from '../css/components/Sidebar.module.css';

export default function Sidebar({
  navItems = [],
  selectedId,
  currentTitle,
  currentUrl,
  onSelect,
  onRefresh,
  isFullscreen,
  onToggleFullscreen,
  onCollapse,
  theme,
  onToggleTheme,
  onGoHome,
  isAdmin,
  colorTheme,
  onColorThemeChange,
}) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
  const handleItemClick = (e, item) => {
    e.preventDefault();
    if (item.display_mode === 'redirect') {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    } else {
      onSelect?.(item);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div
          className={styles.brand}
          onClick={onGoHome}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onGoHome?.(); } }}
          style={{ cursor: 'pointer' }}
        >
          <img src="/blue-lotus.png" alt="莲花导航" className={styles.logo} />
          <div className={styles.brandText}>
            <div className={styles.brandCnRow}>
              <span className={styles.brandCn}>莲花导航</span>
              <img src="/logo1.png" alt="印章" className={styles.stamp} />
            </div>
            <span className={styles.brandEn}>Lotus Navigation</span>
          </div>
          
        </div>
        {currentTitle && (
          <div className={styles.currentBox}>
            <div className={styles.currentTitle}>{currentTitle}</div>
            <div className={styles.currentUrl}>{currentUrl}</div>
            <div className={styles.actions}>
              <button className={styles.iconBtn} onClick={onRefresh} title="刷新">⟳</button>
              <button className={styles.iconBtn} onClick={onToggleFullscreen} title="全屏">
                {isFullscreen ? '⤓' : '⤢'}
              </button>
            </div>
          </div>
        )}
      </div>

      <nav className={styles.nav}>
        <ul className={styles.menu}>
          {navItems.map((item) => (
            <li key={item._id}>
              <a
                href="#"
                className={`${styles.link} ${selectedId === item._id ? styles.active : ''}`}
                onClick={(e) => handleItemClick(e, item)}
              >
                <span className={styles.linkIcon}>
                  {item.icon
                    ? <img src={`/images/${item.icon}`} alt="" className={styles.linkIconImg} />
                    : (item.emoji || '🔗')}
                </span>
                <span>{item.title}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.footer}>
        <button className={styles.footerBtn} onClick={onToggleTheme} title="切换主题">
          {theme === 'dark' ? '☀️' : '🌙'}
          <span className={styles.footerLabel}>{theme === 'dark' ? '日间' : '夜间'}</span>
        </button>
        {isAdmin && (
          <div className={styles.pickerWrap} ref={pickerRef}>
            <button
              className={styles.footerBtn}
              onClick={() => setShowPicker(v => !v)}
              title="主题颜色"
            >
              🎨 <span className={styles.footerLabel}>配色</span>
            </button>
            <ThemePicker
              visible={showPicker}
              currentColorTheme={colorTheme}
              onSelect={(key) => { onColorThemeChange?.(key); setShowPicker(false); }}
              onClose={() => setShowPicker(false)}
            />
          </div>
        )}
      </div>

      <button className={styles.collapseBtn} onClick={onCollapse} title="收起侧栏" aria-label="收起侧栏">
        ‹
      </button>
    </div>
  );
}
