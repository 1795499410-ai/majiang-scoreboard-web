import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendPasswordReset, validateEmail } from '../lib/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const emailErr = validateEmail(email);
    if (emailErr) return setError(emailErr);

    setBusy(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败，请重试');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div style={{ padding: '2rem', maxWidth: 400, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ color: '#b8860b', marginBottom: '1rem' }}>重置邮件已发送</h2>
        <p style={{ color: '#666', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          我们已向 <strong>{email}</strong> 发送了密码重置邮件。<br />
          请检查你的邮箱（包括垃圾邮件文件夹），点击邮件中的链接完成重置。
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

  return (
    <div style={{ padding: '2rem', maxWidth: 400, margin: '0 auto' }}>
      <h2 style={{ color: '#b8860b', textAlign: 'center', marginBottom: '0.5rem' }}>
        忘记密码
      </h2>
      <p style={{ color: '#999', textAlign: 'center', fontSize: 14, marginBottom: '1.5rem' }}>
        输入注册时使用的邮箱，我们将发送重置链接
      </p>

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
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: 4, color: '#666', fontSize: 14 }}>
            邮箱
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="你的邮箱"
            required
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
          disabled={busy}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #d4a843, #b8860b)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '14px',
            fontSize: 16,
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.7 : 1
          }}
        >
          {busy ? '发送中…' : '发送重置邮件'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: 14 }}>
        <button
          onClick={() => navigate('/login', { replace: true })}
          style={{
            background: 'none',
            border: 'none',
            color: '#b8860b',
            fontSize: 14,
            cursor: 'pointer'
          }}
        >
          返回登录
        </button>
      </p>
    </div>
  );
}
