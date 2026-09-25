import React from 'react';
import { HealthStatus, RiskLevel } from '../../types';

export const HealthBadge: React.FC<{ status: HealthStatus }> = ({ status }) => {
  switch (status) {
    case 'ONLINE':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
          ONLINE
        </span>
      );
    case 'DEGRADED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5"></span>
          DEGRADED
        </span>
      );
    case 'OFFLINE':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
          OFFLINE
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
          NO DATA
        </span>
      );
  }
};

export const RiskBadge: React.FC<{ level: RiskLevel }> = ({ level }) => {
  switch (level) {
    case 'NORMAL':
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
          NORMAL
        </span>
      );
    case 'WARNING':
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/60 animate-pulse">
          WARNING
        </span>
      );
    case 'CRITICAL':
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-rose-950/80 text-rose-200 border border-rose-700/80 animate-pulse shadow-lg shadow-rose-950/50">
          CRITICAL
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-400">
          UNKNOWN
        </span>
      );
  }
};

export const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const s = severity.toUpperCase();
  if (s === 'CRITICAL' || s === 'HIGH') {
    return (
      <span className="px-2 py-0.5 text-xs font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
        {s}
      </span>
    );
  }
  if (s === 'WARNING' || s === 'MEDIUM') {
    return (
      <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
        {s}
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 text-xs font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
      {s}
    </span>
  );
};
