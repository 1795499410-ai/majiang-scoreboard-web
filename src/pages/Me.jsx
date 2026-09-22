import { useState } from 'react';
import { LogOut, Shield, Database, KeyRound, Eye, EyeOff, Store } from 'lucide-react';
import {
  useAuth,
  signOut,
  changePassword,
  validateVenueName,
  VENUE_NAME_MAX_LENGTH
} from '../lib/auth';
import { Modal, ErrorBox, useToast } from '../components/ui';
import { MiniScene, WoodFrame, GoldTitle } from '../components/decor';

export default function Me() {
  const {
    username,
    venueName,
    venueNameRaw,
    profileLoading,
    updateVenueName
  } = useAuth();
  const toast = useToast();
  const [showPwd, setShowPwd] = useState(false);
  const [showVenue, setShowVenue] = useState(false);
  const [venueDraft, setVenueDraft] = useState('');
  const [venueBusy, setVenueBusy] = useState(false);
  const [venueError, setVenueError] = useState(null);
  const [plain, setPlain] = useState(false);
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const doSignOut = async () => {
    if (!window.confirm('确定要退出登录吗？')) return;
    await signOut();
  };

  const closePwd = () => {
    setShowPwd(false);
    setPlain(false);
    setP1('');
    setP2('');
    setError(null);
  };

  const openVenue = () => {
    setVenueDraft(venueNameRaw);
    setVenueError(null);
    setShowVenue(true);
  };

  const closeVenue = () => {
    if (venueBusy) return;
    setShowVenue(false);
    setVenueDraft('');
    setVenueError(null);
  };

  const doUpdateVenue = async () => {
    setVenueError(null);
    const validation = validateVenueName(venueDraft);
    if (validation) {
      setVenueError(new Error(validation));
      return;
    }
    setVenueBusy(true);
    try {
      await updateVenueName(venueDraft);
      setShowVenue(false);
      setVenueDraft('');
      toast('麻将馆名已更新');
    } catch (e) {
      setVenueError(e);
    } finally {
      setVenueBusy(false);
    }
  };

  const venueChanged = venueDraft.trim() !== venueNameRaw;

  const doChangePwd = async () => {
    setError(null);
    if (p1.length < 6) return setError(new Error('密码至少 6 位'));
    if (p1 !== p2) return setError(new Error('两次输入的密码不一致'));
    setBusy(true);
    try {
      await changePassword(p1);
      closePwd();
      toast('密码已修改');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page page-rich page-sub-rich">
      <MiniScene variant="me" />
      <GoldTitle size="sm" sub={username ? `${username} 的牌局档案` : ''}>
        我的
      </GoldTitle>

      <div className="page-inner">
        <WoodFrame title="账号">
          <div className="row">
            <div className="row-main">
              <div className="row-sub">当前账号</div>
              <div className="row-title" style={{ wordBreak: 'break-all' }}>{username}</div>
            </div>
          </div>
          <button className="row row-tap fade-rise stagger-1" style={{ width: '100%' }} onClick={openVenue}>
            <Store size={18} strokeWidth={1.5} color="var(--c-primary)" />
            <div className="row-main">
              <div className="row-title">
                {profileLoading ? '麻将馆名读取中…' : (venueNameRaw || '麻将馆名')}
              </div>
              <div className="row-sub">
                {venueNameRaw ? '用于所有分享战报' : `未设置 · 分享时显示${venueName}`}
              </div>
            </div>
          </button>
        </WoodFrame>

        <div className="card">
          <button className="row row-tap fade-rise stagger-2" style={{ width: '100%' }} onClick={() => setShowPwd(true)}>
            <KeyRound size={18} strokeWidth={1.5} color="var(--c-primary)" />
            <div className="row-main">
              <div className="row-title">修改密码</div>
              <div className="row-sub">定期更换更安全</div>
            </div>
          </button>
        </div>

        <div className="card">
          <div className="row">
            <Shield size={18} strokeWidth={1.5} color="var(--c-primary)" />
            <div className="row-main">
              <div className="row-title">数据隔离</div>
              <div className="row-sub">你的牌友与对局仅本账号可见，由数据库行级安全强制</div>
            </div>
          </div>
          <div className="row">
            <Database size={18} strokeWidth={1.5} color="var(--c-primary)" />
            <div className="row-main">
              <div className="row-title">云端存储</div>
              <div className="row-sub">数据实时同步，换设备登录即可继续</div>
            </div>
          </div>
        </div>

        <button className="btn btn-outline" onClick={doSignOut} style={{ marginTop: 'var(--s4)' }}>
          <LogOut size={18} strokeWidth={1.5} />退出登录
        </button>
      </div>

      {showPwd && (
        <Modal
          title="修改密码"
          onClose={closePwd}
          actions={
            <>
              <button className="btn btn-outline" onClick={closePwd}>取消</button>
              <button className="btn btn-primary" onClick={doChangePwd} disabled={busy}>
                {busy ? '保存中…' : '保存'}
              </button>
            </>
          }
        >
          <ErrorBox error={error} />
          <div className="field">
            <label className="field-label">新密码</label>
            <div className="input-wrap">
              <input
                className="input"
                type={plain ? 'text' : 'password'}
                placeholder="至少 6 位"
                value={p1}
                autoFocus
                onChange={(e) => setP1(e.target.value)}
              />
              <button
                type="button"
                className="input-suffix"
                onClick={() => setPlain((v) => !v)}
                aria-label={plain ? '隐藏密码' : '显示密码'}
              >
                {plain ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
              </button>
            </div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label">确认新密码</label>
            <input
              className="input"
              type={plain ? 'text' : 'password'}
              placeholder="再输一次"
              value={p2}
              onChange={(e) => setP2(e.target.value)}
            />
          </div>
        </Modal>
      )}

      {showVenue && (
        <Modal
          title="设置麻将馆名"
          onClose={closeVenue}
          actions={
            <>
              <button className="btn btn-outline" onClick={closeVenue} disabled={venueBusy}>取消</button>
              <button className="btn btn-primary" onClick={doUpdateVenue} disabled={venueBusy || !venueChanged}>
                {venueBusy ? '保存中…' : '保存'}
              </button>
            </>
          }
        >
          <ErrorBox error={venueError} />
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label" htmlFor="venue-name-input">麻将馆名</label>
            <input
              id="venue-name-input"
              className="input"
              type="text"
              maxLength={VENUE_NAME_MAX_LENGTH}
              placeholder="例如：四季麻将馆"
              value={venueDraft}
              autoFocus
              onChange={(e) => setVenueDraft(e.target.value)}
            />
            <div className="field-hint" style={{ textAlign: 'right', marginTop: 'var(--s1)' }}>
              {Array.from(venueDraft).length}/{VENUE_NAME_MAX_LENGTH}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
