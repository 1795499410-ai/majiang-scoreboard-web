import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * 路由转场：淡入 + 轻微上移 + 缩放。
 * 用「延迟切换 children」实现，避免引入动画库。
 */
export default function Transition({ children }) {
  const location = useLocation();
  const [shown, setShown] = useState(children);
  const [stage, setStage] = useState('in');
  const keyRef = useRef(location.pathname);

  useEffect(() => {
    if (keyRef.current === location.pathname) {
      setShown(children);
      return;
    }
    setStage('out');
    const t = setTimeout(() => {
      keyRef.current = location.pathname;
      setShown(children);
      setStage('in');
    }, 150);
    return () => clearTimeout(t);
  }, [location.pathname, children]);

  // 入场动画跑完后清空 stage：animation-fill-mode:both 会把 transform 值
  // 保留在元素上，即便是 none 也会创建 containing block，
  // 使内部 position:fixed 的悬浮按钮相对本容器定位而非视口。
  useEffect(() => {
    if (stage !== 'in') return;
    const t = setTimeout(() => setStage('idle'), 320);
    return () => clearTimeout(t);
  }, [stage, shown]);

  return <div className={stage === 'idle' ? 'route-stage' : `route-stage stage-${stage}`}>{shown}</div>;
}
