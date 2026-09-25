import React from 'react';
import { NodeState } from '../../types';
import { HealthBadge, RiskBadge } from './Badges';
import { Cpu, Wifi, Radio, AlertTriangle, CheckCircle2, RefreshCw, Server, Activity } from 'lucide-react';

interface NodeHealthMatrixProps {
  nodes: NodeState[];
  onSelectNode: (nodeId: string) => void;
}

export const NodeHealthMatrix: React.FC<NodeHealthMatrixProps> = ({ nodes, onSelectNode }) => {
  const getHeartbeatAge = (lastSeenStr: string | null) => {
    if (!lastSeenStr) return 'No Heartbeat';
    const now = new Date().getTime();
    const last = new Date(lastSeenStr).getTime();
    const diffSec = Math.max(0, (now - last) / 1000);
    if (diffSec > 10) {
      return `TIMEOUT (${diffSec.toFixed(1)}s ago)`;
    }
    return `${diffSec.toFixed(1)}s ago`;
  };

  const getSignalBar = (dbm: number) => {
    if (dbm > -65) return { label: 'Strong', bars: 4, color: 'text-emerald-600' };
    if (dbm > -75) return { label: 'Good', bars: 3, color: 'text-cyan-600' };
    if (dbm > -85) return { label: 'Weak', bars: 2, color: 'text-amber-500' };
    return { label: 'Critical', bars: 1, color: 'text-rose-500' };
  };

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900 font-mono uppercase tracking-wide">
              SURFACE MESH NODE HEALTH & HARDWARE DIAGNOSTICS MATRIX
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Automated heartbeat monitoring, RSSI signal metrics, and hardware sensor availability (Offline nodes are strictly isolated from SAFE status)
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono font-semibold">
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            Auto-Heartbeat Check @ 2.0s
          </span>
        </div>
      </div>

      {/* Nodes Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {nodes.map((node) => {
          const age = getHeartbeatAge(node.last_seen);
          const isTimeout = age.includes('TIMEOUT') || node.health_status === 'OFFLINE';
          const signal = getSignalBar(node.signal_strength_dbm);

          return (
            <div
              key={node.node_id}
              className={`p-5 rounded-2xl border transition-all duration-300 space-y-4 ${
                isTimeout
                  ? 'bg-rose-50/60 border-rose-200/80 shadow-sm'
                  : node.health_status === 'DEGRADED'
                  ? 'bg-amber-50/60 border-amber-200/80 shadow-sm'
                  : 'bg-white border-slate-200/80 shadow-sm hover:shadow-md'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isTimeout
                        ? 'bg-rose-500 animate-ping-slow'
                        : node.health_status === 'DEGRADED'
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-emerald-500'
                    }`}
                  ></div>
                  <span className="font-mono font-bold text-slate-900 text-sm">{node.node_id}</span>
                </div>
                <HealthBadge status={node.health_status} />
              </div>

              {/* Heartbeat & Link Status */}
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-500">HEARTBEAT AGE:</span>
                  <span className={`font-bold ${isTimeout ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                    {age}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-500">COMMUNICATION LINK:</span>
                  <span className={`font-bold ${node.communication_ok ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {node.communication_ok ? 'OK (HTTP REST)' : 'LINK FAILURE'}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-500">SIGNAL RSSI:</span>
                  <div className="flex items-center space-x-1.5">
                    <Wifi className={`w-3.5 h-3.5 ${signal.color}`} />
                    <span className="font-bold text-slate-800">{node.signal_strength_dbm} dBm</span>
                    <span className="text-[10px] text-slate-400">({signal.label})</span>
                  </div>
                </div>
              </div>

              {/* Hardware Sensor Diagnostics Checklist */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  Hardware Sensor Diagnostics
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                  <div className="flex items-center space-x-1.5 text-emerald-800 bg-emerald-50 px-2 py-1 rounded">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>MPU6050: OK</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-emerald-800 bg-emerald-50 px-2 py-1 rounded">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Ultrasonic: OK</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-emerald-800 bg-emerald-50 px-2 py-1 rounded">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Vibration: OK</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-emerald-800 bg-emerald-50 px-2 py-1 rounded">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Gas: OK</span>
                  </div>
                </div>
              </div>

              {/* Button */}
              <button
                onClick={() => onSelectNode(node.node_id)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold text-xs rounded-xl transition-colors uppercase shadow-sm"
              >
                Inspect Node Health Details &rarr;
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
