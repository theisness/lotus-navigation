import { IconEdit, IconDelete } from './Icons.jsx';
import { useTilt } from '../hooks/useTilt.js';
import { runCardTransition } from '../utils/cardTransition.js';
import styles from '../css/components/NavCard.module.css';

export default function NavCard({ item, onIframeOpen, onEdit, onDelete, canEdit, compact, index = 0 }) {
  const { url, title, description, display_mode, bg_image, bg_position } = item;
  const { ref, handlers } = useTilt({ max: 12, scale: 1.03, speed: 350 });

  const bgStyle = bg_image
    ? { backgroundImage: `url(/images/${bg_image})`, backgroundPosition: bg_position || 'center' }
    : {};

  const cardClass = `${styles.card} ${!bg_image ? styles.cardThemed : ''} ${compact ? styles.compact : ''}`;
  // 卡片进场渐次浮现：每张延后 80ms
  const enterStyle = { animationDelay: `${Math.min(index, 24) * 80}ms` };

  const handleClick = () => {
    if (display_mode === 'redirect') {
      // 新标签必须在用户手势同步栈里开（否则被弹窗拦截），转场当欢送动画
      window.open(url, '_blank', 'noopener,noreferrer');
      if (ref.current) runCardTransition(ref.current, item, null);
    } else if (ref.current) {
      runCardTransition(ref.current, item, () => onIframeOpen?.(item));
    } else {
      onIframeOpen?.(item);
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit?.(item);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirm('确定删除该导航项？')) {
      onDelete?.(item._id);
    }
  };

  return (
    <div className={styles.cardWrap} style={enterStyle}>
      <div
        ref={ref}
        className={cardClass}
        onClick={handleClick}
        {...handlers}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
        aria-label={`${title} - ${description || ''}`}
      >
        {bg_image && <div className={styles.bgLayer} style={bgStyle} />}
        <div className={styles.metalLayer} aria-hidden="true" />
        <div className={styles.shineLayer} aria-hidden="true" />
        <div className={styles.overlay} />
        <div className={styles.content}>
          <div>
            <h3 className={styles.title}>{title}</h3>
            {description && <p className={styles.desc}>{description}</p>}
          </div>
        </div>
        {canEdit && (
          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={handleEdit} aria-label="编辑"><IconEdit size={13} /></button>
            <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={handleDelete} aria-label="删除"><IconDelete size={13} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
