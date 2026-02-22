import { useEffect, useRef } from 'react';
import styles from '../css/components/DownloadPage.module.css';

export default function DownloadPage({ onEnterWeb }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const particles = [];

    const resize = () => {
      canvas.width = canvas.parentElement.offsetWidth;
      canvas.height = canvas.parentElement.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = (Math.random() - 0.5) * 0.4;
        this.opacity = Math.random() * 0.5 + 0.2;
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${this.opacity})`;
        ctx.fill();
      }
    }

    const count = Math.min(60, Math.floor((canvas.width * canvas.height) / 10000));
    for (let i = 0; i < count; i++) particles.push(new Particle());

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) { p.update(); p.draw(); }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255,255,255,${0.06 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className={styles.wrap}>
      <canvas ref={canvasRef} className={styles.canvas} />

      <div className={styles.hero}>
        <div className={styles.logoArea}>
          <img src="/blue-lotus.png" alt="莲花导航" className={styles.logo} />
          <div className={styles.glow} />
        </div>

        <h1 className={styles.title}>莲花导航</h1>
        <p className={styles.subtitle}>Lotus Navigation</p>
        <p className={styles.desc}>
          一站聚合，万象归莲。极简优雅的多站导航门户，
          <br />
          为你打造沉浸式的浏览体验。
        </p>

        <div className={styles.features}>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>⚡</span>
            <span>极速切换</span>
          </div>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>🎨</span>
            <span>主题定制</span>
          </div>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>🔒</span>
            <span>安全私密</span>
          </div>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>📱</span>
            <span>多端适配</span>
          </div>
        </div>

        <div className={styles.buttons}>
          <button className={styles.btnPrimary} onClick={onEnterWeb}>
            <svg className={styles.btnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            进入网页版
          </button>
          <a className={styles.btnAndroid} href="#" onClick={(e) => e.preventDefault()}>
            <svg className={styles.btnIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.523 2.226l1.392-1.392a.5.5 0 0 0-.708-.708L16.6 1.733A7.96 7.96 0 0 0 12 .5a7.96 7.96 0 0 0-4.6 1.233L5.793.126a.5.5 0 0 0-.708.708l1.392 1.392A7.97 7.97 0 0 0 4 7.5V8h16v-.5a7.97 7.97 0 0 0-2.477-5.274zM9 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm6 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM4 9v8.5A2.5 2.5 0 0 0 6.5 20H7v3a1 1 0 1 0 2 0v-3h2v3a1 1 0 1 0 2 0v-3h2v3a1 1 0 1 0 2 0v-3h.5A2.5 2.5 0 0 0 20 17.5V9H4zM1 10a1 1 0 0 1 2 0v6a1 1 0 1 1-2 0v-6zm20 0a1 1 0 1 1 2 0v6a1 1 0 1 1-2 0v-6z"/>
            </svg>
            下载安卓版
          </a>
          <a className={styles.btnIos} href="#" onClick={(e) => e.preventDefault()}>
            <svg className={styles.btnIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            下载 iOS 版
          </a>
        </div>

        <p className={styles.version}>v1.0.0 · 持续更新中</p>
      </div>
    </div>
  );
}
