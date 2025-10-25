import React from 'react';
import styles from '../css/components/ToggleSidebar.module.css';

export default function ToggleSidebar({ collapsed, onToggle }) {
  const left = collapsed ? 0 : 'calc(14rem - 24px)';
  return (
    <button
      className={styles.toggle}
      style={{ left }}
      aria-label="切换侧栏"
      onClick={onToggle}
    >
      <span className={collapsed ? styles.right : styles.left}>{collapsed ? '›' : '‹'}</span>
    </button>
  );
}