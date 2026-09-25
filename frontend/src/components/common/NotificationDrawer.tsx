import React from 'react';
import { X, CheckCircle, Bell, AlertTriangle, ShieldAlert, Info } from 'lucide-react';
import { NotificationItem } from '../../types';
import { SeverityBadge } from './Badges';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkRead: (id: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-slate-100">Notification Center</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-slate-600 opacity-60" />
              <p>No notifications recorded.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.notification_id}
                className={`p-3.5 rounded-xl border transition-all ${
                  n.read
                    ? 'bg-slate-950/40 border-slate-800/80 opacity-70'
                    : 'bg-slate-800/80 border-slate-700 shadow-md shadow-black/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <SeverityBadge severity={n.severity} />
                    <span className="font-mono text-xs text-slate-400 font-semibold">{n.node_id}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(n.created_at).toLocaleTimeString()}
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-slate-100 mt-2">{n.title}</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{n.message}</p>

                {!n.read && (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => onMarkRead(n.notification_id)}
                      className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
                    >
                      Mark as Read &rarr;
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
