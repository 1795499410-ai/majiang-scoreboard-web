import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import { savePoster } from '../lib/poster';
import { Portal } from './ui';

/**
 * 战报预览弹层。render 为返回 blobUrl 的异步函数。
 * blob URL 在关闭时必须 revoke，否则内存泄漏。
 */
export default function PosterModal({ render, filename, onClose }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    let alive = true;
    let created = null;
    render()
      .then((u) => {
        if (!alive) { URL.revokeObjectURL(u); return; }
        created = u;
        setUrl(u);
      })
      .catch((e) => alive && setError(e));
    return () => {
      alive = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [render]);

  const doSave = () => {
    if (!url) return;
    const mode = savePoster(url, filename);
    setSaved(mode);
  };

  return (
    <Portal>
    <div className="mask poster-mask" onClick={onClose}>
      <div className="poster-box" onClick={(e) => e.stopPropagation()}>
        <button className="poster-close" onClick={onClose} aria-label="关闭">
          <X size={20} strokeWidth={2} />
        </button>

        {error ? (
          <div className="alert alert-error" style={{ margin: 'var(--s5)' }}>
            {String(error.message || error)}
          </div>
        ) : !url ? (
          <div className="poster-loading">正在生成战报…</div>
        ) : (
          <>
            <div className="poster-scroll">
              <img className="poster-img" src={url} alt="战报" />
            </div>
            <div className="poster-actions">
              <p className="poster-tip">
                {saved === 'download'
                  ? '已保存到下载目录'
                  : saved === 'longpress'
                    ? '长按上方图片，选择「存储到相册」'
                    : '长按图片可直接保存，或点下方按钮'}
              </p>
              <button className="btn btn-primary" onClick={doSave}>
                <Download size={18} strokeWidth={1.5} />保存图片
              </button>
            </div>
          </>
        )}
      </div>
    </div>
    </Portal>
  );
}
