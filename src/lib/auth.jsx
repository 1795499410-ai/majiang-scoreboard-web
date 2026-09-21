import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { getProfile, updateVenueName as persistVenueName } from './db';

/**
 * 账号体系：用户只输入「账号 + 密码」。
 * Supabase Auth 底层要求 email 格式，这里用固定内部域名合成，
 * 该地址永不收发邮件，仅作唯一标识。用户全程看不到它。
 */
const INTERNAL_DOMAIN = 'mjscore.local';
export const DEFAULT_VENUE_NAME = '牌桌风云';
export const VENUE_NAME_MAX_LENGTH = 20;

export const USERNAME_RULE = '3-20 位，字母、数字、下划线';

export function validateVenueName(name) {
  const s = String(name || '').trim();
  if (!s) return '请输入麻将馆名';
  if (Array.from(s).length > VENUE_NAME_MAX_LENGTH) {
    return `麻将馆名最多 ${VENUE_NAME_MAX_LENGTH} 个字符`;
  }
  if (/[\r\n]/.test(s)) return '麻将馆名不能包含换行';
  return null;
}

export function validateUsername(name) {
  const s = String(name || '').trim();
  if (!s) return '请输入账号';
  if (s.length < 3) return '账号至少 3 位';
  if (s.length > 20) return '账号最多 20 位';
  if (!/^[A-Za-z0-9_]+$/.test(s)) return '账号只能用字母、数字、下划线';
  if (/^\d+$/.test(s)) return '账号不能全是数字';
  return null;
}

export function toEmail(username) {
  return `${String(username).trim().toLowerCase()}@${INTERNAL_DOMAIN}`;
}

export function toUsername(email) {
  return String(email || '').split('@')[0];
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

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setProfileName(null);
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setProfileName(null);
      setSession(s);
      setLoading(false);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

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
        // 配置读取失败不应阻断记分主流，分享时使用默认名称。
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

export async function signIn(username, password) {
  const { error } = await supabase.auth.signInWithPassword({
    email: toEmail(username),
    password
  });
  if (error) throw new Error(translateAuthError(error.message, 'signin'));
}

export async function signUp(username, password) {
  const { data, error } = await supabase.auth.signUp({
    email: toEmail(username),
    password,
    options: { data: { username: String(username).trim() } }
  });
  if (error) throw new Error(translateAuthError(error.message, 'signup'));

  // 关闭邮箱确认后 signUp 直接返回 session；若为空则补一次登录
  if (!data.session) {
    const { error: le } = await supabase.auth.signInWithPassword({
      email: toEmail(username),
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

export function translateAuthError(msg, ctx) {
  const m = String(msg);
  if (/Invalid login credentials/i.test(m)) return '账号或密码不正确';
  if (/User already registered/i.test(m)) return '该账号已被注册，换一个试试';
  if (/Password should be at least/i.test(m)) return '密码至少 6 位';
  if (/Email address .* is invalid|Unable to validate email/i.test(m)) {
    return '账号格式不被支持，请只用字母、数字、下划线';
  }
  if (/rate limit|over_email_send/i.test(m)) {
    return '操作过于频繁，请稍后再试';
  }
  if (/Email not confirmed/i.test(m)) {
    return '账号验证未关闭，请联系管理员在后台关闭邮箱确认';
  }
  if (/same as the old|should be different/i.test(m)) return '新密码不能和旧密码相同';
  if (ctx === 'signup' && /signups not allowed|disabled/i.test(m)) return '当前不开放注册';
  return m;
}
