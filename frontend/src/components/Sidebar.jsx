import styles from '../css/components/Sidebar.module.css';

export default function Sidebar({ selected, siteInfo, currentTitle, currentUrl, onSelect, onRefresh, isFullscreen, onToggleFullscreen, onCollapse, theme, onToggleTheme }) {
  const links = Object.keys(siteInfo);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.brand}>🌐 莲花导航</div>
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
      </div>

      <nav className={styles.nav}>
        <ul className={styles.menu}>
          {links.map((key) => (
            <li key={key}>
              <a
                href="#"
                className={`${styles.link} ${selected === key ? styles.active : ''}`}
                onClick={(e) => { e.preventDefault(); onSelect(key); }}
              >
                <span className={styles.linkIcon}>{siteInfo[key].emoji}</span>
                <span>{siteInfo[key].title}</span>
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
        <button className={styles.footerBtn} onClick={onCollapse} title="收起侧栏">
          ‹ <span className={styles.footerLabel}>收起</span>
        </button>
      </div>
    </div>
  );
}
