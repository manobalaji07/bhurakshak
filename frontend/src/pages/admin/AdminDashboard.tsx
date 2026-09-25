import React, { useState, useEffect } from 'react';
import { MineHeatmap } from '../../components/heatmap/MineHeatmap';
import { NodeHealthMatrix } from '../../components/common/NodeHealthMatrix';
import { AnalyticsSummary, Alert } from '../../types';
import { AlertTriangle, Shield, Activity, Radio, Cpu, Layers, Play, CheckCircle2, ChevronRight, Eye, Volume2, VolumeX } from 'lucide-react';
import { api } from '../../api/client';
import { startSpeakerAlert, stopSpeakerAlert, toggleAudioMute, getAudioMuted } from '../../utils/audioAlert';

interface AdminDashboardProps {
  summary: AnalyticsSummary | null;
  alerts: Alert[];
  onSelectNode: (nodeId: string) => void;
  onRefresh: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  summary,
  alerts,
  onSelectNode,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'normal' | 'developing' | 'alert' | 'critical'>('alert');
  const [advisoryDismissed, setAdvisoryDismissed] = useState(false);
  const [simMessage, setSimMessage] = useState<string | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(getAudioMuted());

  const nodes = summary?.nodes || [];

  // Hardware Speaker Sound Generator effect matching MAX98357A speaker tones
  useEffect(() => {
    const hasDanger = nodes.some((n) => n.speaker_alert || n.current_risk_level === 'CRITICAL');
    const hasWarning = nodes.some((n) => n.current_risk_level === 'WARNING');

    if (hasDanger) {
      startSpeakerAlert('DANGER');
    } else if (hasWarning) {
      startSpeakerAlert('WARNING');
    } else {
      stopSpeakerAlert();
    }
  }, [nodes]);

  const handleToggleMute = () => {
    const muted = toggleAudioMute();
    setIsAudioMuted(muted);
  };

  const handleRunSimulationStep = async (mode: 'normal' | 'developing' | 'alert' | 'critical') => {
    setActiveTab(mode);
    try {
      const ts = new Date().toISOString();
      let roll = 0.5;
      let pitch = 0.5;
      let vib = 0.2;
      let dist = 42.0;
      let displacement = 0.0;
      let targetNode = 'NODE_02';

      if (mode === 'developing') {
        vib = 2.1;
        roll = 2.8;
        pitch = 2.1;
        displacement = 1.1;
        targetNode = 'NODE_02';
      } else if (mode === 'alert') {
        vib = 4.8;
        roll = 5.2;
        pitch = 4.1;
        dist = 48.5;
        displacement = 2.87;
        targetNode = 'NODE_03';
      } else if (mode === 'critical') {
        vib = 8.5;
        roll = 10.2;
        pitch = 8.4;
        dist = 56.2;
        displacement = 7.4;
        targetNode = 'NODE_01';
      }

      await api.sendSimulationReading({
        node_id: targetNode,
        timestamp: ts,
        roll_deg: roll,
        pitch_deg: pitch,
        vibration: vib,
        ultrasonic_distance_cm: dist,
        displacement_cm: displacement,
        accel_x_g: roll * 0.05,
        accel_y_g: pitch * 0.05,
        accel_z_g: 0.98,
        gyro_x_dps: roll * 0.5,
        gyro_y_dps: pitch * 0.5,
        gyro_z_dps: 0.1,
        communication_ok: true,
        connection_status: 'CONNECTED'
      });

      setSimMessage(`Updated scenario posture to [${mode.toUpperCase()}] for ${targetNode}`);
      onRefresh();
      setTimeout(() => setSimMessage(null), 4000);
    } catch (err: any) {
      setSimMessage(`Simulation error: ${err.message}`);
    }
  };

  // Derive live KPI values from real summary data (zeros when no data)
  const nodesOnline = nodes.filter((n) => n.health_status === 'ONLINE').length;
  const nodesTotal = nodes.length;
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const alertCount = alerts.filter((a) => a.severity === 'WARNING').length;
  const safeNodes = nodes.filter((n) => n.current_risk_level === 'NORMAL').length;
  const watchNodes = nodes.filter((n) => n.current_risk_level === 'WARNING').length;
  const alertNodes = nodes.filter((n) => n.current_risk_level === 'CRITICAL').length;

  // Highest displacement from live node readings
  const maxDisplacement = nodes.reduce((max, n) => {
    const d = n.latest_reading?.displacement_cm ?? 0;
    return d > max ? d : max;
  }, 0);
  const maxRoll = nodes.reduce((max, n) => {
    const r = n.latest_reading?.roll_deg ?? 0;
    return r > max ? r : max;
  }, 0);

  // Show advisory only when there is real critical data
  const showAdvisory = !advisoryDismissed && criticalCount > 0;
  const advisoryNode = nodes.find((n) => n.current_risk_level === 'CRITICAL');

  return (
    <div className="space-y-6">
      {/* Top Advisory Banner — only shown when real critical alerts exist */}
      {showAdvisory && (
        <div className="bg-[#FEF3C7] border border-[#FCD34D] rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/20 text-[#D97706] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-[#B45309] tracking-wider uppercase bg-[#FDE68A] px-2 py-0.5 rounded">
                  SYSTEM HAZARD ADVISORY
                </span>
                <span className="text-xs text-[#92400E] font-medium font-mono">
                  Node: {advisoryNode?.node_id ?? '—'} &middot; Live stream
                </span>
              </div>
              <p className="text-xs text-[#78350F] mt-1 font-sans">
                <strong>{maxDisplacement.toFixed(2)} mm displacement</strong> &middot; Roll {maxRoll.toFixed(2)}°. Values update automatically.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 font-mono text-xs">
            <button
              onClick={handleToggleMute}
              className={`px-3 py-2 rounded-xl font-bold flex items-center space-x-1.5 transition-colors ${
                isAudioMuted ? 'bg-slate-200 text-slate-700' : 'bg-rose-600 text-white shadow-sm hover:bg-rose-700'
              }`}
              title={isAudioMuted ? 'Unmute Audio Alarms' : 'Mute Hardware Audio Beeps'}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
              <span>{isAudioMuted ? 'MUTED' : 'SPEAKER ON'}</span>
            </button>
            <button
              onClick={() => setAdvisoryDismissed(true)}
              className="px-4 py-2 bg-[#D97706] hover:bg-[#B45309] text-white font-bold rounded-xl shadow-sm transition-colors"
            >
              Acknowledge
            </button>
            <button
              onClick={() => setAdvisoryDismissed(true)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-[#92400E] font-semibold border border-[#FCD34D] rounded-xl transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Aggregate Assessment + Kinematic Projection Model */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: AGGREGATE ASSESSMENT MODULE */}
        <div className="lg:col-span-2 glass-card p-6 space-y-6">
          <div>
            <div className="text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase mb-3">
              AGGREGATE ASSESSMENT MODULE
            </div>

            {/* Status Pills */}
            <div className="inline-flex bg-slate-100 p-1 rounded-xl space-x-1 font-mono text-xs font-semibold text-slate-600 mb-4">
              {(['normal', 'developing', 'alert', 'critical'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleRunSimulationStep(tab)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                    activeTab === tab
                      ? 'bg-[#D97706] text-white shadow-sm font-bold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Huge Serif Header — status derived from live data */}
            <h2 className="text-3xl font-bold font-serif-header text-slate-900 tracking-tight">
              {summary?.overall_status === 'CRITICAL'
                ? 'CRITICAL · Immediate Action Required'
                : summary?.overall_status === 'ATTENTION'
                ? 'ELEVATED · Live Shear Monitoring'
                : summary
                ? 'STABLE · All Nodes Nominal'
                : 'AWAITING DATA · Connect Backend'}
            </h2>

            <p className="text-xs text-slate-600 leading-relaxed mt-2 max-w-2xl font-sans">
              {summary
                ? `Live posture derived from ${nodesTotal} active surface mesh nodes. Overall status: ${summary.overall_status}.`
                : 'No telemetry data received yet. Start the emulator or connect ESP32 nodes to populate live readings.'}
            </p>
          </div>

          {/* 3 Metric Sub-cards — zeroed until real data arrives */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">VECTOR TREND</span>
              <div className="text-base font-bold font-mono text-slate-900 mt-1">
                {maxDisplacement > 0 ? `${maxDisplacement.toFixed(2)} mm` : '0.00 mm'}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Max node displacement</span>
            </div>

            <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">BASAL SLIP RISK</span>
              <div className="text-base font-bold font-mono text-slate-900 mt-1">
                {summary?.overall_status === 'CRITICAL' ? 'Class IV' : summary?.overall_status === 'ATTENTION' ? 'Class II' : summary ? 'Class I' : '—'}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {summary ? `${criticalCount + alertCount} active flags` : 'Awaiting data'}
              </span>
            </div>

            <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">HAZARD PROTOCOL</span>
              <div className={`text-base font-bold font-mono mt-1 ${
                summary?.overall_status === 'CRITICAL' ? 'text-rose-600' :
                summary?.overall_status === 'ATTENTION' ? 'text-amber-600' :
                summary ? 'text-emerald-700' : 'text-slate-400'
              }`}>
                {summary?.overall_status === 'CRITICAL' ? 'LEVEL-4' : summary?.overall_status === 'ATTENTION' ? 'LEVEL-2' : summary ? 'LEVEL-0' : '—'}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {summary ? 'Live response state' : 'No backend data'}
              </span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: KINEMATIC PROJECTION MODEL */}
        {(() => {
          const activeKinematicNode = nodes.find((n) => n.current_risk_level === 'CRITICAL') ||
            nodes.find((n) => n.current_risk_level === 'WARNING') ||
            nodes[0];
          const kProj = activeKinematicNode?.latest_kinematic_projection;
          const progPct = kProj?.progress_percent ?? 0;
          const hasData = summary && nodes.length > 0;

          return (
            <div className="glass-card p-6 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                    KINEMATIC PROJECTION MODEL
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    hasData ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {hasData ? `LIVE #${activeKinematicNode?.node_id ?? '403'}` : 'NO DATA'}
                  </span>
                </div>

                <div className="mt-4">
                  <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase block tracking-wider">
                    ESTIMATED TIME TO THRESHOLD
                  </span>
                  <div className={`text-3xl md:text-4xl font-bold font-serif-header mt-2 tracking-tight ${
                    kProj?.status_code === 'EXCEEDED' ? 'text-rose-600' :
                    kProj?.status_code === 'PROJECTED' ? 'text-[#D97706]' :
                    hasData ? 'text-emerald-700' : 'text-slate-300'
                  }`}>
                    {hasData ? (kProj?.time_to_threshold || 'Calculating projection...') : '0 HOURS'}
                  </div>
                  {kProj?.rate_per_hour !== undefined && kProj.rate_per_hour > 0 && (
                    <span className="text-[10px] font-mono text-amber-700 font-semibold block mt-1">
                      Rate: +{kProj.rate_per_hour.toFixed(2)} {kProj.driver_unit}/hr
                    </span>
                  )}
                </div>

                {/* Progress Bar — dynamic ratio of current value vs threshold */}
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-4">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      progPct >= 90 || kProj?.status_code === 'EXCEEDED' ? 'bg-rose-600' :
                      progPct >= 50 ? 'bg-[#D97706]' : 'bg-emerald-600'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, progPct))}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1">
                  <span>Driver: {kProj?.threshold_driver ?? 'Displacement'}</span>
                  <span>{progPct.toFixed(1)}% limit</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-slate-400 text-[10px] block">Model Confidence</span>
                  <span className={hasData ? 'text-emerald-700 font-bold' : 'text-slate-400 font-bold'}>
                    {hasData && kProj ? `${kProj.model_confidence_pct.toFixed(1)}%` : '0%'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] block">Safety Margin</span>
                  <span className={kProj?.status_code === 'EXCEEDED' ? 'text-rose-600 font-bold' : hasData ? 'text-slate-800 font-bold' : 'text-slate-400 font-bold'}>
                    {hasData && kProj ? kProj.safety_margin : '0 mm'}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 4 Quick Metric KPI Cards — live data driven, zeros until backend connected */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">ACTIVE ALERTS</span>
            <div className="text-xl font-bold font-mono text-slate-900">{alerts.length}</div>
            <span className="text-[10px] text-slate-500 font-mono">{criticalCount} critical &middot; {alertCount} warning</span>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">NODES ONLINE</span>
            <div className="text-xl font-bold font-mono text-slate-900">{nodesOnline} / {nodesTotal}</div>
            <span className="text-[10px] text-slate-500 font-mono">FastAPI telemetry stream</span>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">MONITORED AREA</span>
            <div className="text-xl font-bold font-mono text-slate-900">{nodesTotal > 0 ? `${(nodesTotal * 0.6).toFixed(1)} km²` : '0 km²'}</div>
            <span className="text-[10px] text-slate-500 font-mono">{nodesTotal} node mesh coverage</span>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">NODE BREAKDOWN</span>
            <div className="text-xl font-bold font-mono text-slate-900">{safeNodes}/{watchNodes}/{alertNodes}</div>
            <span className="text-[10px] text-slate-500 font-mono">safe / watch / alert+</span>
          </div>
        </div>
      </div>

      {/* Node Health Diagnostics Matrix */}
      <NodeHealthMatrix nodes={nodes} onSelectNode={onSelectNode} />

      {/* Main Mine Panel Heatmap Component */}
      <MineHeatmap nodes={nodes} onSelectNode={onSelectNode} />

      {/* Bottom Scenario Simulation Bar matching screenshot */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Play className="w-4 h-4 text-emerald-600" />
              <h4 className="text-sm font-bold text-slate-900 font-mono uppercase">
                SCENARIO SIMULATION
              </h4>
              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                LIVE API
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-sans">
              Change the simulated field condition. New ESP32/MPU6050-style readings are generated continuously by FastAPI.
            </p>
          </div>

          <div className="inline-flex bg-slate-100 p-1 rounded-xl space-x-1 font-mono text-xs font-semibold text-slate-600">
            {(['normal', 'developing', 'alert', 'critical'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => handleRunSimulationStep(tab)}
                className={`px-3.5 py-1.5 rounded-lg capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-[#D97706] text-white shadow-sm font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {simMessage && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{simMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
