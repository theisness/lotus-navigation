import { useState, useRef, useEffect } from 'react';
import ThemePicker from '../components/ThemePicker.jsx';
import { IconEdit, IconDelete, IconSun, IconMoon, IconDownload } from '../components/Icons.jsx';
import styles from './css/MobileHomepage.module.css';

function DefaultAvatar({ name }) {
  const letter = (name && name.trim() ? name : '?').charAt(0).toUpperCase();
  return <span className={styles.defaultAvatar}>{letter}</span>;
}

export default function MobileHomepage({
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
  onOpenNavSort,
  theme,
  onToggleTheme,
  colorTheme,
  onColorThemeChange,
  isAdmin,
  onOpenDownload,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const menuRef = useRef(null);
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
              {menuOpen && (
                <div className={styles.dropdown}>
                  <button className={styles.menuItem} onClick={() => { setMenuOpen(false); onOpenProfile?.(); }}>
                    个人信息
                  </button>
                  {user.is_admin && (
                    <>
                      <button className={styles.menuItem} onClick={() => { setMenuOpen(false); onOpenMemberManage?.(); }}>
                        成员管理
                      </button>
                      <button className={styles.menuItem} onClick={() => { setMenuOpen(false); onOpenGroupManage?.(); }}>
                        管理分组
                      </button>
                      <button className={styles.menuItem} onClick={() => { setMenuOpen(false); onOpenNavSort?.(); }}>
                        导航排序
                      </button>
                    </>
                  )}
                  <div className={styles.menuDivider} />
                  <button className={styles.menuItem} onClick={() => { setMenuOpen(false); onLogout(); }}>
                    登出
                  </button>
                </div>
              )}
            </>
          ) : (
            <button className={styles.loginBtn} onClick={onLogin}>登录</button>
          )}
        </div>
      </header>

      {user && (
        <button className={styles.addBtn} onClick={onAddNav}>＋ 添加导航</button>
      )}

      <div className={styles.list}>
        {navItems.map((item) => {
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
        {navItems.length === 0 && (
          <div className={styles.empty}>暂无导航项</div>
        )}
      </div>

      <div className={styles.bottomSettings}>
        {isAdmin && (
          <div className={styles.pickerWrap} ref={pickerRef}>
            <button
              className={styles.settingBtn}
              onClick={() => setShowPicker(v => !v)}
            >
              主题颜色
            </button>
            <ThemePicker
              visible={showPicker}
              currentColorTheme={colorTheme}
              onSelect={(key) => { onColorThemeChange?.(key); setShowPicker(false); }}
              onClose={() => setShowPicker(false)}
            />
          </div>
        )}
        <button className={styles.settingBtn} onClick={onToggleTheme}>
          {theme === 'dark' ? '日间模式' : '夜间模式'}
        </button>
        <button className={styles.settingBtn} onClick={onOpenDownload}>
          下载客户端
        </button>
      </div>
    </div>
  );
}
