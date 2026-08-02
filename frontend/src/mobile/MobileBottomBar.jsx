import { IconHome, IconLink, IconUser } from '../components/Icons.jsx';
import styles from './css/MobileBottomBar.module.css';

// 移动端底栏固定三个 tab：主页 / 当前正在看的导航项 / 我的
export default function MobileBottomBar({
  currentItem,
  activeId,
  onGoHome,
  onSelect,
  isHomepage,
  user,
  sheetOpen,
  onOpenSheet,
}) {
  const currentActive = !isHomepage && Boolean(activeId);
  const avatarSrc = user?.avatar
    ? (user.avatar.startsWith('/') ? user.avatar : `/images/${user.avatar}`)
    : null;

  return (
    <nav className={styles.bar}>
      <button
        className={`${styles.tab} ${isHomepage && !sheetOpen ? styles.active : ''}`}
        onClick={onGoHome}
        aria-label="主页"
      >
        <span className={styles.icon}><IconHome size={20} /></span>
        <span className={styles.label}>主页</span>
      </button>

      {/* 还没打开过任何导航项时不占位，只留主页 / 我的两个 tab */}
      {currentItem && (
        <button
          className={`${styles.tab} ${currentActive && !sheetOpen ? styles.active : ''}`}
          onClick={() => onSelect?.(currentItem)}
          aria-label={currentItem.title}
        >
          <span className={styles.icon}>
            {currentItem.icon
              ? <span className={styles.iconImg} style={{ maskImage: `url(/images/${currentItem.icon})`, WebkitMaskImage: `url(/images/${currentItem.icon})` }} />
              : <IconLink size={20} />
            }
          </span>
          <span className={styles.label}>{currentItem.title}</span>
        </button>
      )}

      <button
        className={`${styles.tab} ${sheetOpen ? styles.active : ''}`}
        onClick={onOpenSheet}
        aria-label="我的"
      >
        <span className={styles.icon}>
          {avatarSrc
            ? <img src={avatarSrc} alt="" className={styles.avatarImg} />
            : <IconUser size={20} />
          }
        </span>
        <span className={styles.label}>我的</span>
      </button>
    </nav>
  );
}
