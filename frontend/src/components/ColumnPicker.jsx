import styles from '../css/components/ColumnPicker.module.css';

const COLUMNS = [1, 2, 3, 4, 5];

export default function ColumnPicker({ current, onSelect, visible, onClose }) {
  if (!visible) return null;

  return (
    <div className={styles.popover}>
      <div className={styles.title}>列数</div>
      <div className={styles.list}>
        {COLUMNS.map((n) => (
          <button
            key={n}
            className={`${styles.item} ${current === n ? styles.active : ''}`}
            onClick={() => onSelect(n)}
          >
            <span className={styles.label}>{n} 列</span>
            {current === n && (
              <span className={styles.check}>✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
