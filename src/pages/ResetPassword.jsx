import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { translateAuthError } from '../lib/auth';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

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
      // PASSWORD_RECOVERY 事件触发时 Supabase 已验证 token 并建立 session
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        throw new Error(translateAuthError(updateError.message, 'update'));
      }
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败，请重试');
    }
  };

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
