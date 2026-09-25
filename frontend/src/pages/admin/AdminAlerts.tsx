import React from 'react';
import { Alert } from '../../types';
import { SeverityBadge } from '../../components/common/Badges';
import { ShieldAlert, CheckCircle } from 'lucide-react';
import { api } from '../../api/client';

interface AdminAlertsProps {
  alerts: Alert[];
  onRefresh: () => void;
}

export const AdminAlerts: React.FC<AdminAlertsProps> = ({ alerts, onRefresh }) => {
  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.acknowledgeAlert(alertId, 'admin');
      onRefresh();
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-bold text-slate-100 font-mono uppercase">
          Alert Management & Acknowledgment Log
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Historical record of subsidence warnings, isolation forest anomalies, and heartbeat timeouts
        </p>
      </div>

      <div className="glass-card p-5 space-y-4">
        {alerts.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-mono text-xs">
            No active or historical alerts recorded.
          </div>
        ) : (
          <div className="space-y-3 font-mono">
            {alerts.map((a) => (
              <div
                key={a.alert_id}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <SeverityBadge severity={a.severity} />
                    <span className="text-xs font-bold text-slate-200">{a.node_id}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-xs text-cyan-400 font-bold">{a.alert_type}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-[11px] text-slate-500">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{a.message}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await api.sendSmsAlert({
                          node_id: a.node_id,
                          message: `BHURAKSHAK ALERT DISPATCH [${a.alert_type}]: ${a.title} - ${a.message}`
                        });
                        alert(`SMS alert for ${a.node_id} dispatched to field supervisors!`);
                      } catch (e) {
                        console.error('Error dispatching SMS:', e);
                      }
                    }}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center space-x-1 uppercase"
                  >
                    <span>Dispatch SMS Alert</span>
                  </button>

                  {a.acknowledged ? (
                    <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-bold bg-emerald-950/60 px-3 py-1.5 rounded border border-emerald-800/60">
                      <CheckCircle className="w-4 h-4" />
                      <span>ACKNOWLEDGED ({a.acknowledged_by || 'Admin'})</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAcknowledge(a.alert_id)}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded shadow transition-colors uppercase"
                    >
                      Acknowledge Alert
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
