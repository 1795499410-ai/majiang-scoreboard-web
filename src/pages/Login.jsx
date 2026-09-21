import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { signIn, signUp, validateEmail } from '../lib/auth';
import { ErrorBox } from '../components/ui';
import { MiniScene, GoldTitle, SealMark } from '../components/decor';

export default function Login() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const switchMode = (m) => {
    setMode(m);
    setError(null);
    setConfirm('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    const emailErr = validateEmail(email);
    if (emailErr) return setError(new Error(emailErr));
    if (!password) return setError(new Error('请输入密码'));
    if (mode === 'signup') {
      if (password.length < 6) return setError(new Error('密码至少 6 位'));
      if (password !== confirm) return setError(new Error('两次输入的密码不一致'));
    }

    setBusy(true);
    try {
      if (mode === 'signin') await signIn(email, password);
      else await signUp(email, password);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <MiniScene variant="login" />

      <div className="login-wrap">
        <div className="login-card">
          <div className="login-brand">
            <SealMark size={68} />
            <GoldTitle size="sm" slogan="四方入局 · 一榜定风云">
              牌桌风云
            </GoldTitle>
          </div>

          <div className="login-panel">
            <div className="login-switch">
              <button
                type="button"
                className={`login-switch-item ${mode === 'signin' ? 'active' : ''}`}
                onClick={() => switchMode('signin')}
              >
                登录
              </button>
              <button
                type="button"
                className={`login-switch-item ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => switchMode('signup')}
              >
                注册
              </button>
            </div>

            <form onSubmit={submit} noValidate>
              <ErrorBox error={error} />

              <div className="field">
                <label className="field-label">邮箱</label>
                <input
                  className="input"
                  type="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="email"
                  placeholder={mode === 'signup' ? '你的邮箱' : '你的邮箱'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="field">
                <label className="field-label">密码</label>
                <div className="input-wrap">
                  <input
                    className="input"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    placeholder={mode === 'signup' ? '至少 6 位' : '请输入密码'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="input-suffix"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? '隐藏密码' : '显示密码'}
                  >
                    {showPwd ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div className="field">
                  <label className="field-label">确认密码</label>
                  <input
                    className="input"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="再输一次"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
              )}

              <button className="btn btn-gold" type="submit" disabled={busy}>
                {busy ? '处理中…' : mode === 'signin' ? '入局' : '注册并入局'}
              </button>
            </form>
          </div>

          <p className="login-foot">
            {mode === 'signup'
              ? '使用邮箱注册，记住邮箱和密码即可'
              : '每个账号的数据完全独立，其他人看不到你的记录'}
          </p>
        </div>
      </div>
    </div>
  );
}
