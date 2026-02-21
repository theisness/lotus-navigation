import styles from '../css/components/NavCard.module.css';

export default function NavCard({ item, onIframeOpen, onEdit, onDelete, canEdit, compact }) {
  const { url, title, description, emoji, icon, display_mode, bg_image, bg_position } = item;

  const bgStyle = bg_image
    ? { backgroundImage: `url(/images/${bg_image})`, backgroundPosition: bg_position || 'center' }
    : {};

  const cardClass = `${styles.card} ${!bg_image ? styles.cardThemed : ''} ${compact ? styles.compact : ''}`;

  const handleClick = () => {
    if (display_mode === 'redirect') {
      window.open(url, '_blank', 'noopener,noreferrer');
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
    <div
      className={cardClass}
      style={bgStyle}
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      aria-label={`${title} - ${description || ''}`}
    >
      <div className={styles.overlay} />
      <div className={styles.content}>
        <div>
          <h3 className={styles.title}>{title}</h3>
          {description && <p className={styles.desc}>{description}</p>}
        </div>
      </div>
      <div className={styles.mode}>
        {display_mode === 'redirect' ? '↗ 新标签页' : '◫ iframe'}
      </div>
      {canEdit && (
        <div className={styles.actions}>
          <button className={styles.actionBtn} onClick={handleEdit} aria-label="编辑">✎</button>
          <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={handleDelete} aria-label="删除">✕</button>
        </div>
      )}
    </div>
  );
}
