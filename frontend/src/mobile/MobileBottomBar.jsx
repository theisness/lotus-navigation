import { IconHome, IconLink } from '../components/Icons.jsx';
import styles from './css/MobileBottomBar.module.css';

export default function MobileBottomBar({ navItems = [], activeId, onGoHome, onSelect, isHomepage }) {
  return (
    <nav className={styles.bar}>
      <button
        className={`${styles.tab} ${isHomepage ? styles.active : ''}`}
        onClick={onGoHome}
        aria-label="主页"
      >
        <span className={styles.icon}><IconHome size={18} /></span>
      </button>
      {navItems.map((item) => (
        <button
          key={item._id}
          className={`${styles.tab} ${activeId === item._id ? styles.active : ''}`}
          onClick={() => onSelect(item)}
          aria-label={item.title}
        >
          <span className={styles.icon}>
            {item.icon
              ? <img src={`/images/${item.icon}`} alt="" className={styles.iconImg} />
              : <IconLink size={18} />
            }
          </span>
        </button>
      ))}
    </nav>
  );
}
