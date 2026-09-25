import React from 'react';
import { Bell, User, Radio, ChevronDown } from 'lucide-react';
import { Role, NotificationItem } from '../../types';

interface HeaderProps {
  currentRole: Role;
  onToggleRole: () => void;
  notifications: NotificationItem[];
  unreadCount: number;
  onOpenNotifications: () => void;
  wsConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onToggleRole,
  notifications,
  unreadCount,
  onOpenNotifications,
  wsConnected
}) => {
  return (
    <header className="h-20 bg-[#F0FDF9] border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
      {/* Title & Subheader matching reference screenshot */}
      <div>
        <div className="text-[11px] font-mono font-bold tracking-widest text-slate-500 uppercase">
          OPERATIONAL NODE &middot; LIVE MONITOR
        </div>
        <div className="flex items-center space-x-3 mt-0.5">
          <h1 className="text-2xl font-bold font-serif-header text-slate-900 tracking-tight">
            BhuRakshak
          </h1>
          <span className="text-slate-400 font-light text-lg">|</span>
          <span className="text-slate-600 font-medium text-sm font-mono tracking-tight">
            Geotechnical Hazard Intelligence
          </span>
        </div>
      </div>

      {/* Right Controls matching reference screenshot */}
      <div className="flex items-center space-x-4">
        {/* Live Streaming Badge */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300/80 text-emerald-800 text-xs font-mono font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="uppercase tracking-wider font-bold">LIVE</span>
          <span className="text-emerald-700/80 text-[11px]">Streaming HTTP @ 1Hz</span>
        </div>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 transition-colors border border-slate-200/80 shadow-sm"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Role Profile Button */}
        <button
          onClick={onToggleRole}
          className="flex items-center space-x-2.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs transition-colors shadow-sm"
          title="Click to toggle role (ADMIN / USER)"
        >
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-bold text-[11px]">
            {currentRole === 'ADMIN' ? 'A' : 'U'}
          </div>
          <span className="font-mono font-semibold text-slate-200">{currentRole}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </header>
  );
};
