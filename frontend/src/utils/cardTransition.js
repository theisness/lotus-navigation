// 点卡片 → 卡片放大铺满全屏的影视转场。
// 用 Web Animations API 在 body 上放一个克隆层做 FLIP 式扩张，
// 展开完成后回调真正的跳转（iframe 挂载被覆盖在转场层下面，加载闪烁全被遮住），
// 再淡出移除自己。全程不动 React 树。
export function runCardTransition(cardEl, item, onArrive) {
  const rect = cardEl.getBoundingClientRect();
  const EXPAND_MS = 620;
  const easing = 'cubic-bezier(0.32, 0.72, 0.12, 1)';

  const ov = document.createElement('div');
  ov.style.cssText = `
    position: fixed;
    left: ${rect.left}px; top: ${rect.top}px;
    width: ${rect.width}px; height: ${rect.height}px;
    border-radius: 16px;
    overflow: hidden;
    z-index: 9999;
    pointer-events: none;
    background-color: #0c1030;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
    will-change: left, top, width, height;
  `;

  // 背景画面（与卡片一致），展开时缓慢推近（Ken Burns）
  const bg = document.createElement('div');
  bg.style.cssText = `
    position: absolute; inset: 0;
    background-size: cover;
    background-position: ${item.bg_position || 'center'};
    ${item.bg_image ? `background-image: url(/images/${item.bg_image});` : ''}
    transform: scale(1);
    will-change: transform;
  `;
  ov.appendChild(bg);

  // 暗角 + 底部纱幕，电影画幅氛围
  const grade = document.createElement('div');
  grade.style.cssText = `
    position: absolute; inset: 0;
    background:
      radial-gradient(120% 100% at 50% 45%, transparent 55%, rgba(4, 6, 20, 0.5) 100%),
      linear-gradient(100deg, rgba(8, 10, 26, 0.3) 0%, transparent 55%);
    opacity: 1;
  `;
  ov.appendChild(grade);

  // 标题：随展开推向画面中央并放大，像片头字幕
  const title = document.createElement('div');
  title.textContent = item.title || '';
  title.style.cssText = `
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Noto Serif SC', 'Source Han Serif SC', 'STSong', serif;
    font-size: 30px; font-weight: 700; color: #fff;
    letter-spacing: 4px;
    text-shadow: 0 2px 18px rgba(0, 0, 0, 0.65);
    opacity: 0;
    will-change: transform, opacity;
  `;
  ov.appendChild(title);

  // 鎏金闪光帘：扩张中段斜扫过一道金光
  const flash = document.createElement('div');
  flash.style.cssText = `
    position: absolute; inset: -20%;
    background: linear-gradient(115deg, transparent 30%,
      rgba(255, 240, 200, 0.32) 48%, rgba(255, 255, 255, 0.5) 50%,
      rgba(255, 240, 200, 0.32) 52%, transparent 70%);
    transform: translateX(-70%);
    opacity: 0;
    will-change: transform, opacity;
  `;
  ov.appendChild(flash);

  document.body.appendChild(ov);

  const expand = ov.animate(
    [
      { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, borderRadius: '16px' },
      { left: '0px', top: '0px', width: '100vw', height: '100vh', borderRadius: '0px' },
    ],
    { duration: EXPAND_MS, easing, fill: 'forwards' }
  );
  bg.animate(
    [{ transform: 'scale(1.12)' }, { transform: 'scale(1.02)' }],
    { duration: EXPAND_MS + 500, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
  );
  title.animate(
    [
      { opacity: 0, transform: 'scale(0.86)' },
      { opacity: 1, transform: 'scale(1)', offset: 0.55 },
      { opacity: 1, transform: 'scale(1.04)' },
    ],
    { duration: EXPAND_MS + 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
  );
  flash.animate(
    [
      { transform: 'translateX(-70%)', opacity: 0 },
      { opacity: 0.9, offset: 0.5 },
      { transform: 'translateX(70%)', opacity: 0 },
    ],
    { duration: EXPAND_MS + 200, delay: 120, easing: 'ease-in-out' }
  );

  // 转场一开始就挂载目标页：iframe 在转场层下方并行加载，揭幕时基本就绪
  requestAnimationFrame(() => onArrive?.());

  expand.onfinish = () => {
    // 展开完成后稍作停留再揭幕，给下方页面留加载时间
    setTimeout(() => {
      const fade = ov.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 480, easing: 'ease-out', fill: 'forwards' }
      );
      fade.onfinish = () => ov.remove();
    }, 360);
  };
}
