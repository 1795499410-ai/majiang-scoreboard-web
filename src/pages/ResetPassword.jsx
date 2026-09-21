import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { translateAuthError } from '../lib/auth';

/**
 * 从 HashRouter 的 hash 中提取 query 参数。
 * hash 形如 #/reset-password?access_token=xxx&type=recovery
 * location.search 在 HashRouter 下为空，必须从 hash 解析。
 */
function getHashQueryParams(hash) {
  const qIdx = hash.indexOf('?');
  if (qIdx === -1) return new URLSearchParams();
  return new URLSearchParams(hash.substring(qIdx + 1));
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);

  useEffect(() => {
    const restoreSession = async () => {
      // HashRouter 下，Supabase 重置链接形如：
      // #/reset-password?access_token=xxx&type=recovery
      // detectSessionInUrl 只认 #access_token=xxx，不认 hash 路由的 query，
      // 所以这里手动从 location.hash 提取 token 并设置 session。
      const params = getHashQueryParams(location.hash);
      const accessToken = params.get('access_token');
      const type = params.get('type');

      if (accessToken && type === 'recovery') {
        try {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: params.get('refresh_token') || ''
          });
          if (error) throw error;
          setSessionValid(true);
        } catch {
          setSessionValid(false);
        }
      } else {
        // 没有 token，检查是否已有 session
        const { data } = await supabase.auth.getSession();
        setSessionValid(!!data.session);
      }
      setVerifying(false);
    };

    restoreSession();
  }, [location.hash]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('密码至少 6 位');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        throw new Error(translateAuthError(updateError.message, 'update'));
      }
      setSuccess(true);
      await supabase.auth.signOut();
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败，请重试');
    }
  };

  if (verifying) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
        <div style={{ color: '#666', fontSize: 16 }}>验证链接中…</div>
      </div>
    );
  }

  if (!sessionValid) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
        <h2 style={{ color: '#dc2626', marginBottom: '1rem' }}>链接无效或已过期</h2>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          重置链接无效或已过期，请重新申请密码重置
        </p>
        <button
          onClick={() => navigate('/login', { replace: true })}
          style={{
            background: 'linear-gradient(135deg, #d4a843, #b8860b)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '12px 32px',
            fontSize: 16,
            cursor: 'pointer'
          }}
        >
          返回登录
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
        <h2 style={{ color: '#b8860b', marginBottom: '1rem' }}>✓ 密码已重置</h2>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          密码已成功修改，即将跳转到登录页…
        </p>
        <button
          onClick={() => navigate('/login', { replace: true })}
          style={{
            background: 'linear-gradient(135deg, #d4a843, #b8860b)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '12px 32px',
            fontSize: 16,
            cursor: 'pointer'
          }}
        >
          立即登录
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 400, margin: '0 auto' }}>
      <h2 style={{ color: '#b8860b', textAlign: 'center', marginBottom: '1.5rem' }}>
        重置密码
      </h2>

      {error && (
        <div style={{
          background: '#fef2f2',
          color: '#dc2626',
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: '1rem',
          fontSize: 14
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 14 }}>
            新密码
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 6 位"
            required
            minLength={6}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: 8,
              fontSize: 16,
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 14 }}>
            确认新密码
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="再次输入新密码"
            required
            minLength={6}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: 8,
              fontSize: 16,
              boxSizing: 'border-box'
            }}
          />
        </div>

        <button
          type="submit"
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #d4a843, #b8860b)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '14px',
            fontSize: 16,
            cursor: 'pointer'
          }}
        >
          确认重置
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: 14 }}>
        <a href="/#/login" style={{ color: '#b8860b', textDecoration: 'none' }}>
          返回登录
        </a>
      </p>
    </div>
  );
}
