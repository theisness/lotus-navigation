import { useState, useRef, useEffect } from 'react';
import NavCard from '../components/NavCard.jsx';
import styles from '../css/pages/Homepage.module.css';

function DefaultAvatar({ name }) {
  const letter = (name && name.trim() ? name : '?').charAt(0).toUpperCase();
  return <span className={styles.defaultAvatar}>{letter}</span>;
}

export default function Homepage({
  navItems = [],
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

  return (
    <div className={styles.wrap}>
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          {user && <button className={styles.addBtn} onClick={onAddNav}>＋ 添加导航</button>}
        </div>
        <div className={styles.userArea} ref={menuRef}>
          {user ? (
            <>
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
              <button type="button" className={styles.logoutBtn} onClick={onLogout}>
                登出
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
                        成员分组
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <button className={styles.btn} onClick={onLogin}>登录</button>
          )}
        </div>
      </header>

      <div className={styles.grid}>
        {navItems.map((item) => (
          <NavCard
            key={item._id}
            item={item}
            onIframeOpen={onIframeOpen}
            onEdit={onEdit}
            onDelete={onDelete}
            canEdit={user && (user.is_admin || (item.user_id && item.user_id === user.id))}
          />
        ))}
        {navItems.length === 0 && (
          <div className={styles.empty}>暂无导航项</div>
        )}
      </div>
    </div>
  );
}
