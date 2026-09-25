import React from 'react';
import { Cpu, Radio, Database, ShieldCheck, Wifi } from 'lucide-react';
import { AnalyticsSummary } from '../../types';

export const AdminSystemHealth: React.FC<{ summary: AnalyticsSummary | null }> = ({ summary }) => {
  const nodes = summary?.nodes || [];

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-bold text-slate-100 font-mono uppercase">
          System Infrastructure & Heartbeat Monitor
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Gateway REST connectivity, database health, and heartbeat timeouts
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Backend & DB status */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Database className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100 font-mono uppercase">Backend Services</h3>
          </div>
          <div className="space-y-3 text-xs font-mono">
            <div className="flex justify-between p-2.5 bg-slate-950/80 rounded border border-slate-800">
              <span className="text-slate-400">FastAPI API Server:</span>
              <span className="text-emerald-400 font-bold">ONLINE (Port 8000)</span>
            </div>
            <div className="flex justify-between p-2.5 bg-slate-950/80 rounded border border-slate-800">
              <span className="text-slate-400">Database Engine:</span>
              <span className="text-emerald-400 font-bold">SQLite / MongoDB Persistent</span>
            </div>
            <div className="flex justify-between p-2.5 bg-slate-950/80 rounded border border-slate-800">
              <span className="text-slate-400">WebSocket Transport:</span>
              <span className="text-cyan-300 font-bold">ACTIVE (/ws/telemetry)</span>
            </div>
          </div>
        </div>

        {/* Node Mesh Heartbeats */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Wifi className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100 font-mono uppercase">Surface Mesh Nodes Heartbeats</h3>
          </div>
          <div className="space-y-2">
            {nodes.map((n) => (
              <div key={n.node_id} className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-slate-200 font-bold">{n.node_id}</span>
                  <span className="text-slate-500 block text-[10px]">{n.name}</span>
                </div>
                <div className="text-right">
                  <span className={n.health_status === 'OFFLINE' ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {n.health_status}
                  </span>
                  <span className="text-slate-500 block text-[10px]">Signal: {n.signal_strength_dbm} dBm</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
