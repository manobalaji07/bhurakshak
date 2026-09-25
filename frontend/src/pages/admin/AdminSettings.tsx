import React, { useState } from 'react';
import { Settings, Save, RefreshCw } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const [offlineTimeout, setOfflineTimeout] = useState('10.0');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-bold text-slate-100 font-mono uppercase">
          Administrative & System Configuration
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure node heartbeat timeout, transport settings, and notification policies
        </p>
      </div>

      <div className="glass-card p-6 max-w-xl space-y-6">
        <form onSubmit={handleSave} className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-slate-400 font-bold mb-1.5 uppercase">Node Offline Timeout (Seconds)</label>
            <input
              type="text"
              value={offlineTimeout}
              onChange={(e) => setOfflineTimeout(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 font-mono text-sm"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              If node fails to send telemetry within this period, node transitions to OFFLINE state.
            </p>
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1.5 uppercase">Gateway Ingestion Transport</label>
            <input
              type="text"
              disabled
              value="HTTP REST POST (http://backend:8000/api/v1/telemetry)"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-400 font-mono text-sm cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg flex items-center space-x-2 transition-colors uppercase"
          >
            <Save className="w-4 h-4" />
            <span>Save System Settings</span>
          </button>

          {saved && (
            <div className="p-2 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs">
              System configuration saved successfully.
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
