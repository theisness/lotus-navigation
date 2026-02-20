import { useState, useCallback, useRef } from 'react';
import { navApi } from '../api.js';
import styles from '../css/components/NavSortModal.module.css';

export default function NavSortModal({ visible, onClose, navItems, onSuccess }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const dragItem = useRef(null);
  const dragOver = useRef(null);

  // 每次打开时同步列表
  useState(() => {
    if (visible && navItems.length > 0) {
      setItems(navItems.map((it, i) => ({ ...it, sort_order: it.sort_order ?? i })));
    }
  }, [visible, navItems]);

  // visible 变化时重新同步
  const prevVisible = useRef(false);
  if (visible && !prevVisible.current) {
    const synced = navItems.map((it, i) => ({ ...it, sort_order: it.sort_order ?? i }));
    if (JSON.stringify(synced.map(i => i._id)) !== JSON.stringify(items.map(i => i._id))) {
      setItems(synced);
    }
  }
  prevVisible.current = visible;

  const handleDragStart = (idx) => { dragItem.current = idx; };
  const handleDragEnter = (idx) => { dragOver.current = idx; };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOver.current === null) return;
    const copy = [...items];
    const [dragged] = copy.splice(dragItem.current, 1);
    copy.splice(dragOver.current, 0, dragged);
    setItems(copy.map((it, i) => ({ ...it, sort_order: i })));
    dragItem.current = null;
    dragOver.current = null;
  };

  const handleOrderChange = useCallback((id, val) => {
    setItems(prev => prev.map(it => it._id === id ? { ...it, sort_order: Number(val) || 0 } : it));
  }, []);

  const handleSortByOrder = useCallback(() => {
    setItems(prev => [...prev].sort((a, b) => a.sort_order - b.sort_order));
  }, []);

  const handleSave = useCallback(async () => {
    setLoading(true);
    try {
      const orders = items.map((it, i) => ({ id: it._id, sort_order: i }));
      await navApi.reorderNavItems(orders);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error('排序保存失败:', err);
    } finally {
      setLoading(false);
    }
  }, [items, onSuccess, onClose]);

  if (!visible) return null;

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">✕</button>
        <h2 className={styles.title}>导航项排序</h2>
        <p className={styles.hint}>拖动调整顺序，或修改序号后点击"按序号排列"</p>

        <div className={styles.list}>
          {items.map((item, idx) => (
            <div
              key={item._id}
              className={styles.item}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragEnter={() => handleDragEnter(idx)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
            >
              <span className={styles.dragHandle}>⠿</span>
              <span className={styles.itemTitle}>{item.emoji || '🔗'} {item.title}</span>
              <input
                type="number"
                className={styles.orderInput}
                value={item.sort_order}
                onChange={(e) => handleOrderChange(item._id, e.target.value)}
                min={0}
              />
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.secondaryBtn} onClick={handleSortByOrder}>按序号排列</button>
          <button type="button" className={styles.primaryBtn} onClick={handleSave} disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
