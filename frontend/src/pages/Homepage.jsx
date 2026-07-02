import { useState, useRef, useEffect, useMemo } from 'react';
import NavCard from '../components/NavCard.jsx';
import { IconPlus } from '../components/Icons.jsx';
import styles from '../css/pages/Homepage.module.css';

function DefaultAvatar({ name }) {
  const letter = (name && name.trim() ? name : '?').charAt(0).toUpperCase();
  return <span className={styles.defaultAvatar}>{letter}</span>;
}

const WEEKDAYS_CN = ['日', '一', '二', '三', '四', '五', '六'];

function formatDateCn(d) {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${WEEKDAYS_CN[d.getDay()]}`;
}

function getGreeting(hour) {
  if (hour >= 5 && hour < 11) return '晨安';
  if (hour >= 11 && hour < 18) return '午安';
  return '晚安';
}

export default function Homepage({
  navItems = [],
  groups = [],
  user,
  onLogin,
  onLogout,
  onAddNav,
  onIframeOpen,
  onEdit,
  onDelete,
  onOpenProfile,
  onOpenMemberManage,
  onOpenGroupManage,
  onOpenPermGroupManage,
  onOpenNavSort,
  layoutMode,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const now = useMemo(() => new Date(), []);
  const displayName = user?.nickname || (user?.email ? user.email.split('@')[0] : '');

  // 按 nav_group_id 分区块渲染；未分组的项单独归一组（沿用 Sidebar 里同样的判定：无 nav_group_id 即未分组）
  const sections = useMemo(() => {
    const list = groups.map(g => ({
      id: g._id,
      title: g.title,
      items: navItems.filter(it => it.nav_group_id === g._id),
    }));
    const ungrouped = navItems.filter(it => !it.nav_group_id);
    if (ungrouped.length > 0) {
      list.push({ id: '__ungrouped__', title: groups.length > 0 ? '未分组' : '', items: ungrouped });
    }
    return list.filter(s => s.items.length > 0);
  }, [navItems, groups]);

  let cardCursor = 0;

  return (
    <div className={styles.wrap}>
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          {user && (
            <>
              <div className={styles.greeting}>{getGreeting(now.getHours())}{displayName ? `，${displayName}` : ''}</div>
              <div className={styles.dateText}>{formatDateCn(now)}</div>
            </>
          )}
        </div>
        <div className={styles.userArea} ref={menuRef}>
          {user ? (
            <>
              {user && (
                <button className={styles.addIconBtn} onClick={onAddNav} title="添加导航" aria-label="添加导航">
                  <IconPlus size={18} />
                </button>
              )}
              <button
                type="button"
                className={styles.avatarBtn}
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={menuOpen}
                aria-label="用户菜单"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar.startsWith('/') ? user.avatar : `/images/${user.avatar}`}
                    alt=""
                    className={styles.avatarImg}
                  />
                ) : (
                  <DefaultAvatar name={user.nickname || user.email} />
                )}
              </button>
              {menuOpen && (
                <div className={styles.dropdown}>
                  <button
                    type="button"
                    className={styles.menuItem}
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenProfile?.();
                    }}
                  >
                    个人信息
                  </button>
                  {user.is_admin && (
                    <>
                      <button
                        type="button"
                        className={styles.menuItem}
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenMemberManage?.();
                        }}
                      >
                        成员管理
                      </button>
                      <button
                        type="button"
                        className={styles.menuItem}
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenGroupManage?.();
                        }}
                      >
                        菜单栏分组
                      </button>
                      <button
                        type="button"
                        className={styles.menuItem}
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenPermGroupManage?.();
                        }}
                      >
                        权限分组
                      </button>
                      <button
                        type="button"
                        className={styles.menuItem}
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenNavSort?.();
                        }}
                      >
                        导航排序
                      </button>
                    </>
                  )}
                  <div className={styles.menuDivider} />
                  <button
                    type="button"
                    className={styles.menuItem}
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout?.();
                    }}
                  >
                    登出
                  </button>
                </div>
              )}
            </>
          ) : (
            <button className={styles.btn} onClick={onLogin}>登录</button>
          )}
        </div>
      </header>

      {sections.map((section) => (
        <section key={section.id} id={`group-section-${section.id}`} className={styles.section}>
          {section.title && (
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionLine} />
              <span className={styles.sectionOrnament}>&#10047;</span>
              <span className={styles.sectionLabel}>{section.title}</span>
              <span className={styles.sectionOrnament}>&#10047;</span>
              <span className={styles.sectionLine} />
            </h2>
          )}
          <div
            className={layoutMode === 1 ? styles.listMode : styles.gridMode}
            style={layoutMode !== 1 ? { '--col-count': layoutMode } : undefined}
          >
            {section.items.map((item) => {
              const idx = cardCursor++;
              return (
                <NavCard
                  key={item._id}
                  item={item}
                  index={idx}
                  onIframeOpen={onIframeOpen}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  canEdit={user && (user.is_admin || (item.user_id && item.user_id === user.id))}
                  compact={layoutMode > 1}
                />
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
