import { useMemo } from 'react';
import { IconEdit, IconDelete } from '../components/Icons.jsx';
import styles from './css/MobileHomepage.module.css';

// 用户菜单与设置开关已移到底栏「我的」tab（MobileProfileSheet），此处只管导航内容
export default function MobileHomepage({
  navItems = [],
  groups = [],
  user,
  onAddNav,
  onIframeOpen,
  onEdit,
  onDelete,
  colMode = 1,
}) {
  // 与桌面首页同一套分区规则：按 nav_group_id 分块，空分组不出标题，未分组归一组
  const sections = useMemo(() => {
    const sameId = (a, b) => a != null && b != null && String(a) === String(b);
    const list = groups
      .map((g) => ({
        id: g._id,
        title: g.title,
        items: navItems.filter((it) => sameId(it.nav_group_id, g._id)),
      }))
      .filter((s) => s.items.length > 0);
    const ungrouped = navItems.filter((it) => !it.nav_group_id);
    if (ungrouped.length > 0) {
      list.push({ id: '__ungrouped__', title: list.length > 0 ? '未分组' : '', items: ungrouped });
    }
    return list;
  }, [navItems, groups]);

  return (
    <div className={styles.wrap}>
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <img src="/blue-lotus.png" alt="莲花导航" className={styles.logo} />
          <div className={styles.brandText}>
            <div className={styles.brandCnRow}>
              <span className={styles.brandName}>莲花导航</span>
              <img src="/logo1.png" alt="印章" className={styles.stamp} />
            </div>
            <span className={styles.brandEn}>Lotus Navigation</span>
          </div>
        </div>
      </header>

      {user && (
        <button className={styles.addBtn} onClick={onAddNav}>＋ 添加导航</button>
      )}

      {sections.map((section) => (
        <section key={section.id} className={styles.section}>
          {section.title && (
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionLine} />
              <span className={styles.sectionLabel}>{section.title}</span>
              <span className={styles.sectionLine} />
            </h2>
          )}
          <div className={`${styles.list} ${colMode === 2 ? styles.twoCol : ''}`}>
            {section.items.map((item) => {
              const bgStyle = item.bg_image
                ? { backgroundImage: `url(/images/${item.bg_image})`, backgroundPosition: item.bg_position || 'center' }
                : {};
              const cardClass = `${styles.card} ${!item.bg_image ? styles.cardThemed : ''}`;
              return (
                <div
                  key={item._id}
                  className={cardClass}
                  style={bgStyle}
                  onClick={() => {
                    if (item.display_mode === 'redirect') {
                      window.open(item.url, '_blank', 'noopener,noreferrer');
                    } else {
                      onIframeOpen?.(item);
                    }
                  }}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onIframeOpen?.(item); } }}
                  aria-label={`${item.title} - ${item.description || ''}`}
                >
                  <div className={styles.cardOverlay} />
                  <div className={styles.cardContent}>
                    <h3 className={styles.cardTitle}>{item.title}</h3>
                    {item.description && <p className={styles.cardDesc}>{item.description}</p>}
                  </div>
                  {user && (user.is_admin || (item.user_id && item.user_id === user.id)) && (
                    <div className={styles.cardActions}>
                      <button className={styles.cardActionBtn} onClick={(e) => { e.stopPropagation(); onEdit?.(item); }} aria-label="编辑"><IconEdit size={13} /></button>
                      <button className={`${styles.cardActionBtn} ${styles.deleteBtn}`} onClick={(e) => { e.stopPropagation(); if (confirm('确定删除该导航项？')) onDelete?.(item._id); }} aria-label="删除"><IconDelete size={13} /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {sections.length === 0 && (
        <div className={styles.empty}>暂无导航项</div>
      )}

    </div>
  );
}
