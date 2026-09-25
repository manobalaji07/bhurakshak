import React, { useState } from 'react';
import { NodeState } from '../../types';
import { HealthBadge, RiskBadge } from '../common/Badges';
import { MapPin, Activity, ShieldAlert, Cpu, Layers } from 'lucide-react';

interface MineHeatmapProps {
  nodes: NodeState[];
  onSelectNode: (nodeId: string) => void;
}

export const MineHeatmap: React.FC<MineHeatmapProps> = ({ nodes, onSelectNode }) => {
  const [activePopupNode, setActivePopupNode] = useState<NodeState | null>(null);

  // Maps node position (150, 320, etc.) to percentages inside 800x400 SVG box
  const getCoordinates = (node: NodeState) => {
    // Normalizing spatial_x (0..600) and spatial_y (0..400)
    const xPct = Math.min(Math.max((node.spatial_x / 650) * 100, 15), 85);
    const yPct = Math.min(Math.max((node.spatial_y / 450) * 100, 20), 80);
    return { xPct, yPct };
  };

  const getMarkerColor = (node: NodeState) => {
    if (node.health_status === 'OFFLINE') return { bg: 'bg-slate-600', ring: 'ring-slate-500/40', text: 'text-slate-400' };
    if (node.current_risk_level === 'CRITICAL') return { bg: 'bg-rose-500 animate-ping-slow', ring: 'ring-rose-500/60 shadow-lg shadow-rose-950', text: 'text-rose-400' };
    if (node.current_risk_level === 'WARNING') return { bg: 'bg-amber-400 animate-pulse', ring: 'ring-amber-400/50 shadow-md shadow-amber-950', text: 'text-amber-300' };
    return { bg: 'bg-emerald-400', ring: 'ring-emerald-400/40 shadow-sm shadow-emerald-950', text: 'text-emerald-300' };
  };

  return (
    <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wide">
              UNDERGROUND MINE PANEL 04 — GIS SURFACE DEFORMATION MAP
            </h3>
            <p className="text-xs text-slate-500 font-sans">
              Real-time surface spatial deformation mesh & risk zone visualization above coal seam
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300">Normal</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span className="text-slate-300">Warning</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span className="text-slate-300">Critical</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
            <span className="text-slate-400">Offline</span>
          </div>
        </div>
      </div>

      {/* Map Canvas Box */}
      <div className="relative w-full h-[360px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
        {/* Mine Panel Grid Overlay */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px), linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)`,
            backgroundSize: `20px 20px, 40px 40px, 40px 40px`
          }}
        ></div>

        {/* Conceptual Mine Pillars & Longwall Panel Outline SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-slate-800" fill="none">
          {/* Main underground seam boundary */}
          <rect x="5%" y="10%" width="90%" height="80%" rx="12" strokeWidth="1.5" strokeDasharray="6 4" className="stroke-slate-700/60" fill="rgba(15, 23, 42, 0.4)" />
          
          {/* Panel pillars */}
          <rect x="15%" y="25%" width="20%" height="50%" rx="6" strokeWidth="1" className="stroke-slate-800" fill="rgba(30, 41, 59, 0.3)" />
          <rect x="42%" y="25%" width="20%" height="50%" rx="6" strokeWidth="1" className="stroke-slate-800" fill="rgba(30, 41, 59, 0.3)" />
          <rect x="68%" y="25%" width="20%" height="50%" rx="6" strokeWidth="1" className="stroke-slate-800" fill="rgba(30, 41, 59, 0.3)" />

          {/* Connectors / Mesh Wireframe between N01, N02, N03 */}
          <line x1="23%" y1="70%" x2="52%" y2="46%" strokeWidth="1.5" className="stroke-cyan-500/30" strokeDasharray="3 3" />
          <line x1="52%" y1="46%" x2="80%" y2="78%" strokeWidth="1.5" className="stroke-cyan-500/30" strokeDasharray="3 3" />
          <line x1="23%" y1="70%" x2="80%" y2="78%" strokeWidth="1.5" className="stroke-cyan-500/30" strokeDasharray="3 3" />
        </svg>

        {/* Underground Coal Seam Labels */}
        <div className="absolute top-3 left-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          MINE PANEL 04 — COAL SEAM EXTRACT ZONE A3
        </div>
        <div className="absolute bottom-3 right-4 text-[10px] font-mono text-slate-600">
          SURFACE WIRELESS MESH GEOMETRY
        </div>

        {/* Node Spatial Markers */}
        {nodes.map((node) => {
          const { xPct, yPct } = getCoordinates(node);
          const color = getMarkerColor(node);

          return (
            <div
              key={node.node_id}
              style={{ left: `${xPct}%`, top: `${yPct}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
            >
              {/* Outer Anomaly Radius Ring */}
              <div
                className={`w-16 h-16 rounded-full absolute -inset-4 border ${
                  node.current_risk_level === 'CRITICAL'
                    ? 'border-rose-500/40 bg-rose-500/10 animate-ping-slow'
                    : node.current_risk_level === 'WARNING'
                    ? 'border-amber-400/30 bg-amber-400/5'
                    : 'border-emerald-500/20'
                }`}
              ></div>

              {/* Interactive Node Button */}
              <button
                onClick={() => {
                  setActivePopupNode(node);
                  onSelectNode(node.node_id);
                }}
                className={`w-8 h-8 rounded-full ${color.bg} flex items-center justify-center text-slate-950 font-bold font-mono text-xs ring-4 ${color.ring} cursor-pointer hover:scale-115 transition-transform shadow-xl`}
              >
                {node.node_id.replace('NODE_', 'N')}
              </button>

              {/* Node ID Tag */}
              <div className="absolute top-9 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-slate-700/80 px-2 py-0.5 rounded text-[10px] font-mono text-slate-200 shadow-md whitespace-nowrap">
                {node.node_id}
              </div>
            </div>
          );
        })}

        {/* Selected Node Quick Popup Modal Card overlay */}
        {activePopupNode && (
          <div className="absolute bottom-4 left-4 z-30 bg-slate-900/95 border border-slate-700 rounded-xl p-4 shadow-2xl max-w-xs animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span className="font-mono font-bold text-sm text-slate-100">{activePopupNode.node_id}</span>
              </div>
              <button
                onClick={() => setActivePopupNode(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <HealthBadge status={activePopupNode.health_status} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Risk Level:</span>
                <RiskBadge level={activePopupNode.current_risk_level} />
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Roll / Pitch:</span>
                <span>{activePopupNode.latest_reading?.roll_deg ?? 0}° / {activePopupNode.latest_reading?.pitch_deg ?? 0}°</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Vibration:</span>
                <span>{activePopupNode.latest_reading?.vibration ?? 0} g</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Displacement:</span>
                <span>{activePopupNode.latest_reading?.displacement_cm ?? 0} cm</span>
              </div>
            </div>

            <button
              onClick={() => onSelectNode(activePopupNode.node_id)}
              className="mt-3 w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg transition-colors font-mono uppercase"
            >
              Open Complete Sensor Analytics &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
