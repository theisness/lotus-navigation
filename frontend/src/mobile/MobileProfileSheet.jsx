import { useState } from 'react';
import { COLOR_THEMES } from '../components/ThemePicker.jsx';
import { IconSun, IconMoon, IconDownload, IconPalette, IconGrid, IconList } from '../components/Icons.jsx';
import styles from './css/MobileProfileSheet.module.css';

function DefaultAvatar({ name }) {
  const letter = (name && name.trim() ? name : '?').charAt(0).toUpperCase();
  return <span className={styles.defaultAvatar}>{letter}</span>;
}

// 「我的」tab 的底部弹层：个人信息 / 管理入口 + 原来散在首页底部的设置开关
export default function MobileProfileSheet({
  visible,
  onClose,
  user,
  isAdmin,
  theme,
  onToggleTheme,
  colorTheme,
  onColorThemeChange,
  colMode,
  onToggleColMode,
  onLogin,
  onLogout,
  onOpenProfile,
  onOpenMemberManage,
  onOpenGroupManage,
  onOpenPermGroupManage,
  onOpenNavSort,
  onOpenDownload,
}) {
  const [showPicker, setShowPicker] = useState(false);

  if (!visible) return null;

  const close = () => { setShowPicker(false); onClose?.(); };
  const run = (fn) => { close(); fn?.(); };

  const avatarSrc = user?.avatar
    ? (user.avatar.startsWith('/') ? user.avatar : `/images/${user.avatar}`)
    : null;

  return (
    <div className={styles.overlay} onClick={close}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="我的">
        <div className={styles.handle} />

        <div className={styles.userCard}>
          <div className={styles.avatar}>
            {avatarSrc
              ? <img src={avatarSrc} alt="" className={styles.avatarImg} />
              : <DefaultAvatar name={user?.nickname || user?.email} />
            }
          </div>
          <div className={styles.userText}>
            <div className={styles.userName}>{user ? (user.nickname || user.email) : '未登录'}</div>
            {user?.email && <div className={styles.userMail}>{user.email}</div>}
          </div>
          {!user && (
            <button className={styles.loginBtn} onClick={() => run(onLogin)}>登录</button>
          )}
        </div>

        <div className={styles.quickRow}>
          {isAdmin && (
            <button
              className={`${styles.quickBtn} ${showPicker ? styles.quickBtnOn : ''}`}
              onClick={() => setShowPicker((v) => !v)}
              aria-label="主题颜色"
              aria-expanded={showPicker}
            >
              <IconPalette size={18} />
              <span className={styles.quickLabel}>主题色</span>
            </button>
          )}
          <button
            className={styles.quickBtn}
            onClick={onToggleColMode}
            aria-label={colMode === 1 ? '切换双列视图' : '切换单列视图'}
          >
            {colMode === 1 ? <IconGrid size={18} /> : <IconList size={18} />}
            <span className={styles.quickLabel}>{colMode === 1 ? '双列' : '单列'}</span>
          </button>
          <button
            className={styles.quickBtn}
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? '切换日间模式' : '切换夜间模式'}
          >
            {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            <span className={styles.quickLabel}>{theme === 'dark' ? '日间' : '夜间'}</span>
          </button>
          <button className={styles.quickBtn} onClick={() => run(onOpenDownload)} aria-label="下载客户端">
            <IconDownload size={18} />
            <span className={styles.quickLabel}>客户端</span>
          </button>
        </div>

        {/* 色卡在弹层里内联展开：popover 形式会被 sheet 的滚动容器裁掉 / 顶出屏幕 */}
        {isAdmin && showPicker && (
          <div className={styles.swatchPanel}>
            <div className={styles.swatchTitle}>主题颜色</div>
            <div className={styles.swatchRow}>
              {COLOR_THEMES.map((t) => (
                <button
                  key={t.key}
                  className={`${styles.swatch} ${colorTheme === t.key ? styles.swatchActive : ''}`}
                  style={{ background: t.color }}
                  onClick={() => { onColorThemeChange?.(t.key); setShowPicker(false); }}
                  title={t.label}
                  aria-label={t.label}
                />
              ))}
            </div>
          </div>
        )}

        {user && (
          <div className={styles.menu}>
            <button className={styles.menuItem} onClick={() => run(onOpenProfile)}>个人信息</button>
            {user.is_admin && (
              <>
                <button className={styles.menuItem} onClick={() => run(onOpenMemberManage)}>成员管理</button>
                <button className={styles.menuItem} onClick={() => run(onOpenGroupManage)}>菜单栏分组</button>
                <button className={styles.menuItem} onClick={() => run(onOpenPermGroupManage)}>权限分组</button>
                <button className={styles.menuItem} onClick={() => run(onOpenNavSort)}>导航排序</button>
              </>
            )}
          </div>
        )}

        {user && (
          <button className={`${styles.menuItem} ${styles.logout}`} onClick={() => run(onLogout)}>登出</button>
        )}
      </div>
    </div>
  );
}
