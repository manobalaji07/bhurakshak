import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { NotificationDrawer } from './components/common/NotificationDrawer';
import { Login } from './pages/auth/Login';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { AdminSystemHealth } from './pages/admin/AdminSystemHealth';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminAlerts } from './pages/admin/AdminAlerts';
import { AdminSms } from './pages/admin/AdminSms';
import { UserDashboard } from './pages/user/UserDashboard';
import { NodeDetail } from './pages/shared/NodeDetail';
import { Role, AnalyticsSummary, Alert, NotificationItem } from './types';
import { api } from './api/client';

const NodeDetailWrapper: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { nodeId } = useParams<{ nodeId: string }>();
  return <NodeDetail nodeId={nodeId || 'NODE_01'} onBack={onBack} />;
};

export const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [role, setRole] = useState<Role>((localStorage.getItem('bhurakshak_role') as Role) || 'ADMIN');
  const [user, setUser] = useState<string | null>(localStorage.getItem('bhurakshak_user') || 'admin');

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Load initial REST state
  const loadData = async () => {
    try {
      const sumData = await api.getAnalyticsSummary();
      const alertData = await api.getAlerts();
      const notifData = await api.getNotifications();

      setSummary(sumData);
      setAlerts(alertData);
      setNotifications(notifData);
    } catch (err) {
      console.warn('Initial REST load error:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket Live Stream
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWS = () => {
      let wsUrl = '';
      const envUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
        || (window.location.hostname.includes('vercel.app') ? 'https://bhurakshak-oa9h.onrender.com' : '');
      if (envUrl) {
        const clean = envUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
        const wsProto = envUrl.startsWith('https://') ? 'wss:' : 'ws:';
        wsUrl = `${wsProto}//${clean}/ws/telemetry`;
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
        wsUrl = `${protocol}//${host}/ws/telemetry`;
      }

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'telemetry_update' || data.event === 'node_status_change') {
            loadData();
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        reconnectTimeout = setTimeout(connectWS, 3000);
      };

      ws.onerror = () => {
        setWsConnected(false);
        ws?.close();
      };
    };

    connectWS();
    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  const handleToggleRole = () => {
    const newRole: Role = role === 'ADMIN' ? 'USER' : 'ADMIN';
    setRole(newRole);
    localStorage.setItem('bhurakshak_role', newRole);
    if (newRole === 'ADMIN') {
      navigate('/admin');
    } else {
      navigate('/user');
    }
  };

  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    navigate(`/node/${nodeId}`);
  };

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const handleMarkNotifRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      loadData();
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return (
      <Login
        onLoginSuccess={(userRole, username) => {
          setRole(userRole);
          setUser(username);
          if (userRole === 'ADMIN') navigate('/admin');
          else navigate('/user');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F0FDF9] text-slate-800 flex flex-col font-sans">
      <Header
        currentRole={role}
        onToggleRole={handleToggleRole}
        notifications={notifications}
        unreadCount={unreadNotifCount}
        onOpenNotifications={() => setIsNotifDrawerOpen(true)}
        wsConnected={wsConnected}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar role={role} onSelectNode={handleSelectNode} />

        <main className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full">
          <Routes>
            <Route
              path="/admin"
              element={
                <AdminDashboard
                  summary={summary}
                  alerts={alerts}
                  onSelectNode={handleSelectNode}
                  onRefresh={loadData}
                />
              }
            />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/health" element={<AdminSystemHealth summary={summary} />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/alerts" element={<AdminAlerts alerts={alerts} onRefresh={loadData} />} />
            <Route path="/admin/sms" element={<AdminSms />} />

            <Route
              path="/user"
              element={
                <UserDashboard
                  summary={summary}
                  alerts={alerts}
                  notifications={notifications}
                  onSelectNode={handleSelectNode}
                  onOpenNotifications={() => setIsNotifDrawerOpen(true)}
                />
              }
            />
            <Route
              path="/user/notifications"
              element={
                <UserDashboard
                  summary={summary}
                  alerts={alerts}
                  notifications={notifications}
                  onSelectNode={handleSelectNode}
                  onOpenNotifications={() => setIsNotifDrawerOpen(true)}
                />
              }
            />

            <Route
              path="/node/:nodeId"
              element={
                <NodeDetailWrapper
                  onBack={() => (role === 'ADMIN' ? navigate('/admin') : navigate('/user'))}
                />
              }
            />

            <Route path="*" element={<Navigate to={role === 'ADMIN' ? '/admin' : '/user'} replace />} />
          </Routes>
        </main>
      </div>

      <NotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkNotifRead}
      />
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
