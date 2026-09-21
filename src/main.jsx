import React from 'react';
import { createRoot } from 'react-dom/client';
// 用 HashRouter 而非 BrowserRouter：静态托管（OSS）不支持未知路径回退到
// index.html，BrowserRouter 下直接访问或刷新 /players 会拿到 404 XML。
// hash 段不发往服务器，因此收藏、刷新、分享链接均可用。
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { ToastProvider } from './components/ui';
import TabBar from './components/TabBar';
import Transition from './components/Transition';
import Login from './pages/Login';
import Leaderboard from './pages/Leaderboard';
import Record from './pages/Record';
import Players from './pages/Players';
import Ai from './pages/Ai';
import TableDetail from './pages/TableDetail';
import Me from './pages/Me';
import ResetPassword from './pages/ResetPassword';
import './styles.css';
import './pages.css';

function Guard({ children, withTabBar = true }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="loading" style={{ paddingTop: '40vh' }}>加载中…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return (
    <>
      <Transition>{children}</Transition>
      {withTabBar && <TabBar />}
    </>
  );
}

function LoginRoute() {
  const { session, loading } = useAuth();
  if (loading) return <div className="loading" style={{ paddingTop: '40vh' }}>加载中…</div>;
  if (session) return <Navigate to="/" replace />;
  return <Login />;
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<Guard><Leaderboard /></Guard>} />
        <Route path="/players" element={<Guard><Players /></Guard>} />
        <Route path="/ai" element={<Guard><Ai /></Guard>} />
        <Route path="/me" element={<Guard><Me /></Guard>} />
        <Route path="/record" element={<Guard withTabBar={false}><Record /></Guard>} />
        <Route path="/table/:tableId" element={<Guard withTabBar={false}><TableDetail /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);
