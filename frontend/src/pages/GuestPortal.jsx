import { useCallback, useState } from 'react';
// 衬线字体已在 App.jsx 全局引入一次，这里不重复 import
import AuthForm from '../components/AuthForm.jsx';
import heroLotus from '../assets/hero-lotus.jpg';
import styles from '../css/pages/GuestPortal.module.css';

// 品牌登录门：所有导航数据均登录后可见，这里不拉取、不展示任何站点信息
export default function GuestPortal({ onLoginSuccess }) {
  const [showAuth, setShowAuth] = useState(false);

  const handleLoginSuccess = useCallback(() => {
    setShowAuth(false);
    onLoginSuccess?.();
  }, [onLoginSuccess]);

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <img src="/blue-lotus.png" alt="莲花导航" className={styles.brandLogo} />
        <span className={styles.brandText}>莲花导航</span>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroLotusWrap} aria-hidden="true">
          <img src={heroLotus} alt="" className={styles.heroLotus} />
        </div>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>
            莲花导航
            <img src="/logo1.png" alt="" className={styles.stamp} />
          </h1>
          <div className={styles.subtitleEn}>LOTUS NAVIGATION</div>
          <div className={styles.slogan}>莲开处处 · 一站直达</div>

          <button type="button" className={styles.loginBtn} onClick={() => setShowAuth(true)}>
            登录
          </button>
          <a href="/download" className={styles.downloadLink}>
            下载安卓 App
          </a>
        </div>
      </section>

      <footer className={styles.footer}>
        <span className={styles.footerOrnament} aria-hidden="true">&#10047;</span>
        <span>&#169; 2026 ssbx.site &middot; 莲花导航</span>
        <span className={styles.footerOrnament} aria-hidden="true">&#10047;</span>
      </footer>

      <AuthForm
        visible={showAuth}
        onClose={() => setShowAuth(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
