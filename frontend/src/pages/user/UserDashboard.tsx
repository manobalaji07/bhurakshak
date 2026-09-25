import React from 'react';
import { AnalyticsSummary, Alert, NotificationItem } from '../../types';
import { HealthBadge, RiskBadge } from '../../components/common/Badges';
import { NodeHealthMatrix } from '../../components/common/NodeHealthMatrix';
import { ShieldCheck, AlertTriangle, ShieldAlert, Bell, ChevronRight } from 'lucide-react';

interface UserDashboardProps {
  summary: AnalyticsSummary | null;
  alerts: Alert[];
  notifications: NotificationItem[];
  onSelectNode: (nodeId: string) => void;
  onOpenNotifications: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  summary,
  alerts,
  notifications,
  onSelectNode,
  onOpenNotifications
}) => {
  const status = summary?.overall_status || 'SAFE';
  const nodes = summary?.nodes || [];

  return (
    <div className="space-y-6">
      {/* Top Immediate Safety Banner */}
      <div
        className={`glass-card p-6 border-l-4 ${
          status === 'CRITICAL'
            ? 'border-l-rose-500 bg-rose-50/50'
            : status === 'ATTENTION'
            ? 'border-l-amber-500 bg-amber-50/50'
            : 'border-l-emerald-500 bg-emerald-50/50'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                status === 'CRITICAL'
                  ? 'bg-rose-100 text-rose-700'
                  : status === 'ATTENTION'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {status === 'CRITICAL' ? (
                <ShieldAlert className="w-8 h-8 animate-bounce" />
              ) : status === 'ATTENTION' ? (
                <AlertTriangle className="w-8 h-8" />
              ) : (
                <ShieldCheck className="w-8 h-8" />
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold font-serif-header tracking-tight text-slate-900">
                  SYSTEM STATUS: {status}
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-slate-100 text-slate-700 border border-slate-200">
                  Mine Panel 04
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {status === 'CRITICAL'
                  ? 'Ground movement or node offline condition detected above panel. Field inspection recommended.'
                  : status === 'ATTENTION'
                  ? 'Elevated sensor tilt or vibration signatures detected. Monitoring trend progression.'
                  : 'All 3 surface sensor nodes reporting stable baseline conditions.'}
              </p>
            </div>
          </div>

          <button
            onClick={onOpenNotifications}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-mono font-bold flex items-center space-x-2 shadow-sm transition-colors shrink-0"
          >
            <Bell className="w-4 h-4 text-emerald-400" />
            <span>Notifications ({notifications.filter((n) => !n.read).length})</span>
          </button>
        </div>
      </div>

      {/* 3 Node Status Grid */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 font-mono uppercase tracking-wider mb-3">
          Surface Mesh Node Statuses
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {nodes.map((node) => (
            <div
              key={node.node_id}
              onClick={() => onSelectNode(node.node_id)}
              className="glass-card-hover p-5 space-y-4 cursor-pointer"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-base font-bold text-slate-900 font-mono">{node.node_id}</h4>
                  <p className="text-xs text-slate-500">{node.name}</p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <HealthBadge status={node.health_status} />
                  <RiskBadge level={node.current_risk_level} />
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-700">
                  <span className="text-slate-400">Tilt (Roll/Pitch):</span>
                  <span className="font-semibold">{node.latest_reading?.roll_deg ?? 0}° / {node.latest_reading?.pitch_deg ?? 0}°</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span className="text-slate-400">Vibration:</span>
                  <span className="font-semibold">{node.latest_reading?.vibration ?? 0} g</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span className="text-slate-400">Displacement:</span>
                  <span className="font-semibold">{node.latest_reading?.displacement_cm ?? 0} cm</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-emerald-700 font-mono font-bold pt-2 border-t border-slate-100">
                <span>View Node Trend</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Node Health Diagnostics Matrix */}
      <NodeHealthMatrix nodes={nodes} onSelectNode={onSelectNode} />

      {/* Active Alerts List */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-900 font-mono uppercase">Recent Active Alerts</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">Total: {alerts.length}</span>
        </div>

        {alerts.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-mono">
            No active alerts recorded. System operating safely.
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 5).map((a) => (
              <div
                key={a.alert_id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="text-xs font-bold text-slate-800">{a.node_id}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-[11px] text-slate-500">{new Date(a.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs text-slate-700">{a.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
