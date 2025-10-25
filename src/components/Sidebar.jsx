import React from 'react';
import styles from '../css/components/Sidebar.module.css';

export default function Sidebar({ selected, siteInfo, currentTitle, currentUrl, onSelect, onRefresh, isFullscreen, onToggleFullscreen }) {
  const links = Object.keys(siteInfo);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.brand}>网站集成平台</div>
        <div className={styles.currentBox}>
          <div className={styles.currentTitle}>{currentTitle}</div>
          <div className={styles.currentUrl}>{currentUrl}</div>
          <div className={styles.actions}>
            <button className={styles.iconBtn} onClick={onRefresh} title="刷新">⟳</button>
            <button className={styles.iconBtn} onClick={onToggleFullscreen} title="全屏">
              {isFullscreen ? '⤢' : '⤢'}
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
                <span className={styles.linkIcon}>•</span>
                <span>{siteInfo[key].title}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}