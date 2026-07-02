import { useState } from 'react';
import styles from '../css/components/ThemePicker.module.css';

const COLOR_THEMES = [
  { key: 'purple', color: '#667eea', label: '紫色' },
  { key: 'blue', color: '#3b82f6', label: '蓝色' },
  { key: 'green', color: '#10b981', label: '绿色' },
  { key: 'orange', color: '#f59e0b', label: '橙色' },
  { key: 'red', color: '#ef4444', label: '红色' },
  { key: 'pink', color: '#ec4899', label: '粉色' },
  { key: 'teal', color: '#14b8a6', label: '青色' },
  { key: 'lotus', color: '#d9b96c', label: '云上净土' },
];

export default function ThemePicker({ currentColorTheme, onSelect, visible, onClose }) {
  if (!visible) return null;

  return (
    <div className={styles.popover}>
      <div className={styles.title}>主题颜色</div>
      <div className={styles.grid}>
        {COLOR_THEMES.map((t) => (
          <button
            key={t.key}
            className={`${styles.swatch} ${currentColorTheme === t.key ? styles.active : ''}`}
            style={{ background: t.color }}
            onClick={() => onSelect(t.key)}
            title={t.label}
            aria-label={t.label}
          />
        ))}
      </div>
    </div>
  );
}
