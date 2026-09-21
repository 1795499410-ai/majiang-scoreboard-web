import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import { getProfile, updateVenueName as persistVenueName } from './db';

export const DEFAULT_VENUE_NAME = '牌桌风云';
export const VENUE_NAME_MAX_LENGTH = 20;

export function validateVenueName(name) {
  const s = String(name || '').trim();
  if (!s) return '请输入麻将馆名';
  if (Array.from(s).length > VENUE_NAME_MAX_LENGTH) {
    return `麻将馆名最多 ${VENUE_NAME_MAX_LENGTH} 个字符`;
  }
  if (/[\r\n]/.test(s)) return '麻将馆名不能包含换行';
  return null;
}

export function validateEmail(email) {
  const s = String(email || '').trim();
  if (!s) return '请输入邮箱';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return '邮箱格式不正确';
  return null;
}

export function toUsername(email) {
  return String(email || '').split('@')[0];
}

/** 检测 URL hash 中是否有 recovery token（Supabase 密码重置回调） */
function isRecoveryFlow() {
  const hash = window.location.hash;
  if (!hash) return false;
  return hash.includes('type=recovery') || hash.includes('type%3Drecovery');
}

const AuthCtx = createContext({
  session: null,
  user: null,
  username: '',
  loading: true,
  profileLoading: false,
  profileError: null,
  venueName: DEFAULT_VENUE_NAME,
  venueNameRaw: '',
  updateVenueName: async () => { throw new Error('未登录'); }
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const userId = session?.user?.id;
  const navigate = useNavigate();

  useEffect(() => {
    // 页面加载时如果 hash 中有 recovery token，立即跳转到重置密码页
    // 这必须在 LoginRoute 的 session 重定向之前发生
    if (isRecoveryFlow()) {
      navigate('/reset-password', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setProfileName(null);
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setProfileName(null);
      setSession(s);
      setLoading(false);
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password', { replace: true });
      }
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    let alive = true;
    if (!userId) {
      setProfileName(null);
      setProfileError(null);
      setProfileLoading(false);
      return () => { alive = false; };
    }

    setProfileLoading(true);
    setProfileError(null);
    getProfile(userId)
      .then((profile) => {
        if (!alive) return;
        setProfileName(profile?.venue_name || null);
      })
      .catch((error) => {
        if (!alive) return;
        setProfileName(null);
        setProfileError(error);
      })
      .finally(() => alive && setProfileLoading(false));

    return () => { alive = false; };
  }, [userId]);

  const updateVenueName = useCallback(async (nextName) => {
    const value = String(nextName || '').trim();
    const validation = validateVenueName(value);
    if (validation) throw new Error(validation);
    const result = await persistVenueName(session?.user?.id, value);
    setProfileName(result?.venue_name || value);
    setProfileError(null);
    return result?.venue_name || value;
  }, [session]);

  return (
    <AuthCtx.Provider
      value={{
        session,
        user: session?.user ?? null,
        username: toUsername(session?.user?.email),
        loading,
        profileLoading,
        profileError,
        venueName: profileName || DEFAULT_VENUE_NAME,
        venueNameRaw: profileName || '',
        updateVenueName
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({
    email: String(email).trim().toLowerCase(),
    password
  });
  if (error) throw new Error(translateAuthError(error.message, 'signin'));
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email: String(email).trim().toLowerCase(),
    password,
    options: { data: { username: toUsername(email) } }
  });
  if (error) throw new Error(translateAuthError(error.message, 'signup'));

  if (!data.session) {
    const { error: le } = await supabase.auth.signInWithPassword({
      email: String(email).trim().toLowerCase(),
      password
    });
    if (le) throw new Error(translateAuthError(le.message, 'signin'));
  }
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(translateAuthError(error.message, 'update'));
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(
    String(email).trim().toLowerCase(),
    {
      redirectTo: `${window.location.origin}${window.location.pathname}#type=recovery`
    }
  );
  if (error) throw new Error(translateAuthError(error.message, 'reset'));
}

export function translateAuthError(msg, ctx) {
  const m = String(msg);
  if (/Invalid login credentials/i.test(m)) return '邮箱或密码不正确';
  if (/User already registered/i.test(m)) return '该邮箱已被注册';
  if (/Password should be at least/i.test(m)) return '密码至少 6 位';
  if (/Email address .* is invalid|Unable to validate email/i.test(m)) {
    return '邮箱格式不正确';
  }
  if (/rate limit|over_email_send/i.test(m)) {
    return '操作过于频繁，请稍后再试';
  }
  if (/Email not confirmed/i.test(m)) {
    return '邮箱未验证，请检查邮箱中的验证链接';
  }
  if (/same as the old|should be different/i.test(m)) return '新密码不能和旧密码相同';
  if (ctx === 'signup' && /signups not allowed|disabled/i.test(m)) return '当前不开放注册';
  if (ctx === 'reset' && /not found|not registered/i.test(m)) return '该邮箱未注册';
  return m;
}
