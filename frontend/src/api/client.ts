import { AnalyticsSummary, NodeState, Alert, NotificationItem, User } from '../types';

// In local/LAN mode (backend serves frontend) this is '' (same origin).
// In cloud mode (Vercel + Railway) set VITE_API_BASE_URL in .env.production.
const BASE_URL: string = (import.meta.env.VITE_API_BASE_URL as string) || '';

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('bhurakshak_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText}`);
  }
  return response.json();
}

export const api = {
  // Auth
  login: async (username: string, password: string) => {
    return fetchJson<{ access_token: string; role: 'ADMIN' | 'USER'; username: string; full_name: string }>(
      '/api/v1/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }
    );
  },
  getMe: async () => {
    return fetchJson<User>('/api/v1/auth/me');
  },

  // Nodes
  getNodes: async (): Promise<NodeState[]> => {
    return fetchJson<NodeState[]>('/api/v1/nodes');
  },
  getNodeDetails: async (nodeId: string): Promise<{ node: NodeState; recent_history: any[] }> => {
    return fetchJson<{ node: NodeState; recent_history: any[] }>(`/api/v1/nodes/${nodeId}`);
  },

  // Analytics & Summary
  getAnalyticsSummary: async (): Promise<AnalyticsSummary> => {
    return fetchJson<AnalyticsSummary>('/api/v1/analytics/summary');
  },
  getNodeTrends: async (nodeId: string): Promise<any> => {
    return fetchJson<any>(`/api/v1/analytics/nodes/${nodeId}`);
  },

  // Alerts
  getAlerts: async (): Promise<Alert[]> => {
    return fetchJson<Alert[]>('/api/v1/alerts');
  },
  acknowledgeAlert: async (alertId: string, userId: string = 'admin'): Promise<{ success: boolean }> => {
    return fetchJson<{ success: boolean }>(`/api/v1/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  },

  // Notifications
  getNotifications: async (): Promise<NotificationItem[]> => {
    return fetchJson<NotificationItem[]>('/api/v1/notifications');
  },
  markNotificationRead: async (notificationId: string): Promise<{ success: boolean }> => {
    return fetchJson<{ success: boolean }>(`/api/v1/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  },

  // Telemetry Simulation Trigger
  sendSimulationReading: async (payload: any) => {
    return fetchJson<{ success: boolean; node_id: string }>('/api/v1/telemetry', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // SMS Management
  getSmsLogs: async (): Promise<any[]> => {
    return fetchJson<any[]>('/api/v1/sms/logs');
  },
  sendSmsAlert: async (payload: { node_id?: string; message: string; recipient_phone?: string; recipient_name?: string }) => {
    return fetchJson<{ success: boolean; count: number; logs: any[] }>('/api/v1/sms/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getSmsConfig: async () => {
    return fetchJson<{ provider: string; api_key: string; account_sid: string; from_number: string; auto_send_subsidence: boolean }>('/api/v1/sms/config');
  },
  updateSmsConfig: async (config: { provider: string; api_key?: string; account_sid?: string; from_number?: string; auto_send_subsidence: boolean }) => {
    return fetchJson<{ success: boolean; config: any }>('/api/v1/sms/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }
};
