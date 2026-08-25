import { useEffect, useState, useRef, createContext, useContext, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { paletteColor, initial, signed, scoreClass } from '../lib/model';

/**
 * 弹层必须挂到 body，不能留在页面容器内。
 * 页面被 <Transition> 包着，且 TabBar 是 Transition 的兄弟节点：
 * 留在容器内时 z-index 只在容器的层叠上下文里比较，压不过外部的 TabBar，
 * 结果导航栏盖住弹层底部，内容滚不到底。
 */
export function Portal({ children }) {
  const [host] = useState(() =>
    typeof document === 'undefined' ? null : document.createElement('div')
  );

  useEffect(() => {
    if (!host) return;
    document.body.appendChild(host);
    // 弹层开启期间锁背景滚动，避免手指落在遮罩上时滚的是底层页面
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      document.body.removeChild(host);
    };
  }, [host]);

  if (!host) return null;
  return createPortal(children, host);
}

export function Avatar({ nickname, colorIndex, size = '' }) {
  const cls = size === 'lg' ? 'avatar avatar-lg' : size === 'sm' ? 'avatar avatar-sm' : 'avatar';
  return (
    <div className={cls} style={{ background: paletteColor(colorIndex) }}>
      {initial(nickname)}
    </div>
  );
}

/**
 * 积分显示。传入 from 时数字从 from 滚动到 value。
 *
 * 起点必须由父级传入：路由切换会卸载重挂载本组件，
 * 组件内部 ref 记的旧值会被重置成新值，动画直接跳过。
 */
export function Score({ value, className = '', style, from }) {
  const target = Number(value) || 0;
  const hasFrom = typeof from === 'number' && from !== target;

  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const [shown, setShown] = useState(hasFrom && !reduce ? from : target);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!hasFrom || reduce) { setShown(target); return; }

    // 不加「只启动一次」的守卫：StrictMode 会 setup→cleanup→setup，
    // 守卫会让第二次 setup 提前 return，而第一次的 rAF 已被 cleanup 取消，
    // 结果动画永不推进、数字卡在起点。每次 setup 都重新启动才是正确写法。
    const span = Math.abs(target - from);
    const dur = Math.min(1200, 420 + span * 14);
    const t0 = performance.now();

    let alive = true;
    const tick = (now) => {
      if (!alive) return;
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic：末尾放慢，看得清落点
      setShown(Math.round(from + (target - from) * e));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    setShown(from);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [target, from, hasFrom, reduce]);

  return (
    <span
      className={`num ${scoreClass(target)} ${shown !== target ? 'score-rolling' : ''} ${className}`}
      style={style}
    >
      {signed(shown)}
    </span>
  );
}

/** 名次变动箭头 */
export function RankDelta({ delta }) {
  if (!delta) return null;
  const up = delta > 0;
  return (
    <span className={`rank-delta ${up ? 'rd-up' : 'rd-down'}`}>
      {up ? '▲' : '▼'}{Math.abs(delta)}
    </span>
  );
}

export function Empty({ text, hint, children }) {
  return (
    <div className="empty">
      <div className="empty-text">{text}</div>
      {hint && <div className="empty-hint">{hint}</div>}
      {children && <div style={{ marginTop: 'var(--s4)' }}>{children}</div>}
    </div>
  );
}

export function Loading({ text = '加载中…' }) {
  return <div className="loading">{text}</div>;
}

export function Modal({ title, children, onClose, actions }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <Portal>
      <div className="mask" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          {title && <div className="modal-title">{title}</div>}
          {children}
          {actions && <div className="modal-actions">{actions}</div>}
        </div>
      </div>
    </Portal>
  );
}

export function Sheet({ children, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <Portal>
      <div className="sheet-mask" onClick={onClose}>
        {/* 把手放在滚动容器外层：留在内部时 sticky 会随内容滚到中间去 */}
        <div className="sheet-shell" onClick={(e) => e.stopPropagation()}>
          <span className="sheet-grip" aria-hidden="true" />
          <div className="sheet">{children}</div>
        </div>
      </div>
    </Portal>
  );
}

/* ---------- Toast ---------- */

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);

  const show = useCallback((text) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 1800);
  }, []);

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && <div className="toast">{msg}</div>}
    </ToastCtx.Provider>
  );
}

/* ---------- 错误边界 ---------- */

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="alert alert-error">
      {String(error.message || error)}
      {onRetry && (
        <button className="btn-ghost" style={{ marginLeft: 8, textDecoration: 'underline' }} onClick={onRetry}>
          重试
        </button>
      )}
    </div>
  );
}
