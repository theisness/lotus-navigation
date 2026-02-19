import NavCard from '../components/NavCard.jsx';
import styles from '../css/pages/Homepage.module.css';

export default function Homepage({ navItems = [], user, onLogin, onLogout, onAddNav, onIframeOpen, onEdit, onDelete }) {
  return (
    <div className={styles.wrap}>
      <header className={styles.topBar}>
        <h1 className={styles.brand}>🌐 莲花导航</h1>
        <div className={styles.userArea}>
          {user ? (
            <>
              <span className={styles.email}>{user.email}</span>
              <button className={styles.btn} onClick={onLogout}>登出</button>
            </>
          ) : (
            <button className={styles.btn} onClick={onLogin}>登录</button>
          )}
        </div>
      </header>

      {user && (
        <div className={styles.actions}>
          <button className={styles.addBtn} onClick={onAddNav}>＋ 添加导航</button>
        </div>
      )}

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
