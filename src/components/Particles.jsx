/**
 * 全局飘动光尘粒子 —— 纯 CSS 动画，零 JS 开销
 * 挂在 #root 内最底层，pointer-events: none 不拦截交互
 */
export default function Particles() {
  return (
    <div className="particles" aria-hidden="true">
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} className="particle" />
      ))}
    </div>
  );
}
