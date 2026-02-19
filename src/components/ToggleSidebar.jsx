import styles from '../css/components/ToggleSidebar.module.css';

export default function ToggleSidebar({ collapsed, onToggle }) {
  if (!collapsed) return null;

  return (
    <button
      className={styles.toggleFixed}
      aria-label="展开侧栏"
      onClick={onToggle}
    >
      <span className={styles.arrow}>›</span>
    </button>
  );
}
