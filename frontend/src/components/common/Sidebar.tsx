import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, MapPin, Activity, Radio, AlertTriangle, MessageSquare, Shield, CheckCircle2 } from 'lucide-react';
import { Role } from '../../types';

interface SidebarProps {
  role: Role;
  onSelectNode: (nodeId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, onSelectNode }) => {
  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 hidden md:flex min-h-[calc(100vh-5rem)]">
      <div className="p-6 space-y-6">
        {/* Brand Logo Header */}
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-md shadow-emerald-900/20">
            <Shield className="w-5 h-5 text-emerald-200" />
          </div>
          <div>
            <h2 className="text-base font-bold font-mono tracking-tight text-slate-900">BHURAKSHAK</h2>
            <p className="text-[10px] text-slate-500 font-medium">Geotechnical Hazard Intelligence</p>
          </div>
        </div>

        {/* Command Modules */}
        <div>
          <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 font-mono">
            COMMAND MODULES
          </h3>
          <nav className="space-y-1.5 font-sans">
            {role === 'ADMIN' ? (
              <>
                <NavLink
                  to="/admin"
                  end
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>Overview</span>
                </NavLink>

                <NavLink
                  to="/admin/analytics"
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <MapPin className="w-4 h-4" />
                  <span>Risk Geospatial Map</span>
                </NavLink>

                <NavLink
                  to="/admin/health"
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <Activity className="w-4 h-4" />
                  <span>Telemetry Streams</span>
                </NavLink>

                <NavLink
                  to="/admin/alerts"
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Alerts & Incident Dispatch</span>
                  </div>
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center">
                    3
                  </span>
                </NavLink>

                <NavLink
                  to="/admin/sms"
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>SMS Notifications</span>
                </NavLink>
              </>
            ) : (
              <>
                <NavLink
                  to="/user"
                  end
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>Mine Safety Status</span>
                </NavLink>

                <NavLink
                  to="/user/notifications"
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Notifications</span>
                </NavLink>
              </>
            )}
          </nav>
        </div>

        {/* Sensor Nodes List */}
        <div>
          <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">
            SENSOR NODES
          </h3>
          <div className="space-y-1">
            {['NODE_01', 'NODE_02', 'NODE_03'].map((nid) => (
              <button
                key={nid}
                onClick={() => onSelectNode(nid)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors border border-slate-100"
              >
                <div className="flex items-center space-x-2">
                  <Radio className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-semibold">{nid}</span>
                </div>
                <span className="text-[10px] text-slate-400">&rarr;</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Profile Card matching screenshot */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/60 space-y-3">
        <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-100/80 border border-emerald-300/80 text-[11px] font-mono text-emerald-900 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>API Connected</span>
          <span className="text-[10px] font-normal text-emerald-700 font-mono">OPERATIONAL</span>
        </div>

        <div className="flex items-center space-x-3 pt-1">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold font-mono">
            CV
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Col. R. Vardhan</div>
            <div className="text-[10px] text-slate-500 font-medium">Chief Mine Geotech Dir</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
