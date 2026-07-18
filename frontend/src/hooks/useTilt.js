import { useRef, useCallback, useEffect } from 'react';

// 3D 倾斜：不走 React state（每次 mousemove setState 会整树重渲染导致卡顿），
// 用 rAF 节流后直接写 DOM style / CSS 变量，60fps 零重渲染。
// 高光位置通过 --shine-x/--shine-y/--shine-o 变量传给 CSS 的 shineLayer。
export function useTilt({ max = 10, scale = 1.02, speed = 400 } = {}) {
  const ref = useRef(null);
  const rafRef = useRef(0);
  const enteredRef = useRef(false);
  const lastEvtRef = useRef(null);

  const apply = useCallback(() => {
    rafRef.current = 0;
    const el = ref.current;
    const e = lastEvtRef.current;
    if (!el || !e) return;

    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // 以卡片中心为原点，范围 [-1, 1]；鼠标在上半部 => 上边缘向里倾斜
    const cx = x * 2 - 1;
    const cy = y * 2 - 1;
    const rotateX = -cy * max;
    const rotateY = cx * max;

    // 进入后的第一次 move 用慢过渡起势，之后跟手（持续挂长过渡会永远追不上鼠标）
    el.style.transition = enteredRef.current
      ? 'transform 60ms ease-out'
      : `transform ${speed}ms cubic-bezier(0.23, 1, 0.32, 1)`;
    enteredRef.current = true;
    el.style.transform =
      `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`;
    el.style.setProperty('--shine-x', `${x * 100}%`);
    el.style.setProperty('--shine-y', `${y * 100}%`);
    el.style.setProperty('--shine-o', '1');
  }, [max, scale, speed]);

  const handleMouseMove = useCallback((e) => {
    lastEvtRef.current = { clientX: e.clientX, clientY: e.clientY };
    if (!rafRef.current) rafRef.current = requestAnimationFrame(apply);
  }, [apply]);

  const handleMouseLeave = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
    enteredRef.current = false;
    const el = ref.current;
    if (!el) return;
    el.style.transition = `transform ${speed}ms cubic-bezier(0.23, 1, 0.32, 1)`;
    el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    el.style.setProperty('--shine-o', '0');
  }, [speed]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  return {
    ref,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
    },
  };
}
