import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { NodeState, NodeReading } from '../../types';
import { HealthBadge, RiskBadge } from '../../components/common/Badges';
import { ArrowLeft, Activity, Radio, Cpu, Compass, Layers, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface NodeDetailProps {
  nodeId: string;
  onBack: () => void;
}

export const NodeDetail: React.FC<NodeDetailProps> = ({ nodeId, onBack }) => {
  const [nodeData, setNodeData] = useState<NodeState | null>(null);
  const [history, setHistory] = useState<NodeReading[]>([]);
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const details = await api.getNodeDetails(nodeId);
        const trendData = await api.getNodeTrends(nodeId);

        if (isMounted) {
          setNodeData(details.node);
          setHistory(details.recent_history);
          setTrends(trendData);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading node details:', err);
      }
    };

    loadData();
    const interval = setInterval(loadData, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [nodeId]);

  if (loading || !nodeData) {
    return (
      <div className="py-20 text-center text-slate-500 font-mono">
        <Activity className="w-8 h-8 mx-auto mb-2 animate-spin text-cyan-400" />
        Loading {nodeId} telemetry pipeline...
      </div>
    );
  }

  const r = nodeData.latest_reading || {};

  // Recharts Chart Format
  const chartData = (trends?.timestamps || []).map((ts: string, idx: number) => ({
    time: ts,
    roll: trends.series.roll_deg?.[idx] ?? 0,
    pitch: trends.series.pitch_deg?.[idx] ?? 0,
    vibration: trends.series.vibration?.[idx] ?? 0,
    distance: trends.series.ultrasonic_distance_cm?.[idx] ?? 0,
    displacement: trends.series.displacement_cm?.[idx] ?? 0,
    gas: trends.series.gas_detection?.[idx] ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-5">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold font-mono text-slate-100">{nodeData.node_id}</h2>
              <HealthBadge status={nodeData.health_status} />
              <RiskBadge level={nodeData.current_risk_level} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{nodeData.name} — Surface Mesh Node</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
          <div>
            <span className="text-slate-500 block text-[10px]">LAST HEARTBEAT</span>
            <span className="text-slate-200">{nodeData.last_seen ? new Date(nodeData.last_seen).toLocaleTimeString() : 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">SIGNAL STRENGTH</span>
            <span className="text-cyan-300 font-bold">{nodeData.signal_strength_dbm} dBm</span>
          </div>
        </div>
      </div>

      {/* Kinematic Projection & Hardware Speaker Alert Panel */}
      {(() => {
        const k = nodeData.latest_kinematic_projection;
        const isSpeakerActive = nodeData.speaker_alert || nodeData.current_risk_level === 'CRITICAL';
        return (
          <div className="glass-card p-5 border-l-4 border-l-cyan-500 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wide">
                  KINEMATIC PROJECTION MODEL & SPEAKER ALERT STATUS
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-mono px-2.5 py-1 rounded font-bold border ${
                  isSpeakerActive ? 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}>
                  {isSpeakerActive ? '🔊 MAX98357A SPEAKER ALERT ACTIVE (1500Hz)' : '🔊 SPEAKER STANDBY'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono">
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase block">TIME TO THRESHOLD</span>
                <div className={`text-xl font-bold mt-1 ${k?.status_code === 'EXCEEDED' ? 'text-rose-400' : 'text-amber-400'}`}>
                  {k?.time_to_threshold || 'Calculating...'}
                </div>
                <span className="text-[10px] text-slate-500">Rate: +{(k?.rate_per_hour ?? 0).toFixed(2)} {k?.driver_unit ?? 'mm'}/hr</span>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase block">THRESHOLD DRIVER</span>
                <div className="text-xl font-bold text-slate-100 mt-1">{k?.threshold_driver ?? 'Displacement'}</div>
                <span className="text-[10px] text-slate-500">{(k?.current_value ?? 0).toFixed(1)} / {k?.threshold_value ?? 15} {k?.driver_unit ?? 'mm'} limit</span>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase block">MODEL CONFIDENCE (R²)</span>
                <div className="text-xl font-bold text-emerald-400 mt-1">{(k?.model_confidence_pct ?? 0).toFixed(1)}%</div>
                <span className="text-[10px] text-slate-500">Linear regression fit score</span>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase block">SAFETY MARGIN</span>
                <div className={`text-xl font-bold mt-1 ${k?.status_code === 'EXCEEDED' ? 'text-rose-400' : 'text-slate-100'}`}>
                  {k?.safety_margin ?? '15.0 mm'}
                </div>
                <span className="text-[10px] text-slate-500">Remaining to breach limit</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Primary Telemetry Metric Cards Grid — 8 cards in 2 rows */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <span className="text-xs text-slate-500 font-mono block mb-1 uppercase">Tilt (Roll / Pitch)</span>
          <div className="text-xl font-bold text-slate-100 font-mono">
            {(r.roll_deg ?? 0).toFixed(2)}° / {(r.pitch_deg ?? 0).toFixed(2)}°
          </div>
          <span className="text-[10px] text-slate-400">Inclination angle</span>
        </div>

        <div className="glass-card p-4">
          <span className="text-xs text-slate-500 font-mono block mb-1 uppercase">Surface Vibration</span>
          {(r.vibration ?? 0) <= 1 && Number.isInteger(r.vibration ?? 0) ? (
            // Digital sensor (0 or 1)
            <div className={`text-xl font-bold font-mono ${r.vibration ? 'text-rose-400' : 'text-emerald-400'}`}>
              {r.vibration ? 'DETECTED' : 'CLEAR'}
            </div>
          ) : (
            // Analog / float value from emulator
            <div className="text-xl font-bold text-amber-300 font-mono">{(r.vibration ?? 0).toFixed(3)} g</div>
          )}
          <span className="text-[10px] text-slate-400">Micro-ground shaking</span>
        </div>

        <div className="glass-card p-4">
          <span className="text-xs text-slate-500 font-mono block mb-1 uppercase">Ultrasonic Distance</span>
          <div className="text-xl font-bold text-cyan-300 font-mono">{(r.ultrasonic_distance_cm ?? 0).toFixed(1)} cm</div>
          <span className="text-[10px] text-slate-400">Roof / crack distance</span>
        </div>

        <div className="glass-card p-4">
          <span className="text-xs text-slate-500 font-mono block mb-1 uppercase">Relative Displacement</span>
          <div className="text-xl font-bold text-rose-300 font-mono">{(r.displacement_cm ?? 0).toFixed(2)} cm</div>
          <span className="text-[10px] text-slate-400">Node mesh movement</span>
        </div>

        <div className="glass-card p-4">
          <span className="text-xs text-slate-500 font-mono block mb-1 uppercase">MQ2 Gas (Raw ADC)</span>
          <div className={`text-xl font-bold font-mono ${
            (r.gas_detection ?? 0) > 300 ? 'text-rose-400' :
            (r.gas_detection ?? 0) > 150 ? 'text-amber-400' : 'text-emerald-300'
          }`}>
            {(r.gas_detection ?? 0).toFixed(0)}
          </div>
          <span className="text-[10px] text-slate-400">
            {(r.gas_detection ?? 0) > 300 ? '⚠ High gas level' : (r.gas_detection ?? 0) > 150 ? '⚠ Elevated' : 'Normal range'}
          </span>
        </div>

        <div className="glass-card p-4">
          <span className="text-xs text-slate-500 font-mono block mb-1 uppercase">Battery Voltage</span>
          <div className={`text-xl font-bold font-mono ${
            (r.potential_difference_v ?? 0) > 0 && (r.potential_difference_v ?? 0) < 3.5
              ? 'text-rose-400' : (r.potential_difference_v ?? 0) > 0 ? 'text-emerald-300' : 'text-slate-400'
          }`}>
            {(r.potential_difference_v ?? 0) > 0 ? `${(r.potential_difference_v ?? 0).toFixed(2)} V` : '--'}
          </div>
          <span className="text-[10px] text-slate-400">Node power supply</span>
        </div>

        <div className="glass-card p-4">
          <span className="text-xs text-slate-500 font-mono block mb-1 uppercase">Tilt Flag</span>
          <div className={`text-xl font-bold font-mono ${
            (r.mpu_detection ?? 0) ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
          }`}>
            {(r.mpu_detection ?? 0) ? 'TILTED ⚠' : 'LEVEL ✓'}
          </div>
          <span className="text-[10px] text-slate-400">MPU tilt threshold detect</span>
        </div>

        <div className="glass-card p-4">
          <span className="text-xs text-slate-500 font-mono block mb-1 uppercase">Event Count</span>
          <div className={`text-xl font-bold font-mono ${
            (r.count ?? 0) >= 3 ? 'text-rose-400' :
            (r.count ?? 0) >= 1 ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {(r.count ?? 0)}
          </div>
          <span className="text-[10px] text-slate-400">
            {(r.count ?? 0) >= 3 ? 'CRITICAL threshold' : (r.count ?? 0) >= 1 ? 'Warning level' : 'No anomalies'}
          </span>
        </div>
      </div>

      {/* MPU6050 Breakdown */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Compass className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-100 font-mono uppercase">
            MPU6050 Motion & Orientation Telemetry Decomposition
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Accelerometer */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 font-mono uppercase">Accelerometer (g)</h4>
            <div className="grid grid-cols-3 gap-2 font-mono text-center">
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">X-AXIS</span>
                <span className="text-sm font-bold text-slate-200">{r.accel_x_g ?? 0}</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Y-AXIS</span>
                <span className="text-sm font-bold text-slate-200">{r.accel_y_g ?? 0}</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Z-AXIS</span>
                <span className="text-sm font-bold text-slate-200">{r.accel_z_g ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Gyroscope */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 font-mono uppercase">Gyroscope (dps)</h4>
            <div className="grid grid-cols-3 gap-2 font-mono text-center">
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">X-AXIS</span>
                <span className="text-sm font-bold text-slate-200">{r.gyro_x_dps ?? 0}</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Y-AXIS</span>
                <span className="text-sm font-bold text-slate-200">{r.gyro_y_dps ?? 0}</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Z-AXIS</span>
                <span className="text-sm font-bold text-slate-200">{r.gyro_z_dps ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI ML Decision Support Panel */}
      {(() => {
        const mlRes = nodeData.latest_ml_result;
        const subDetected = mlRes?.subsidence_detected ?? false;
        const subLabel = mlRes?.subsidence_label ?? 'NO_SUBSIDENCE';
        const subProb = mlRes?.subsidence_probability ?? 0.0;
        const anoDetected = mlRes?.anomaly_detected ?? false;
        const anoLabel = mlRes?.anomaly_label ?? 'NORMAL';
        const anoScore = mlRes?.anomaly_score ?? 0.0;
        const scenario = mlRes?.scenario_context ?? 'NORMAL_STABLE_MINE';

        return (
          <div className="glass-card p-5 border-l-4 border-l-teal-500 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-900/40 pb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-teal-600" />
                <h3 className="text-sm font-bold text-emerald-950 font-mono uppercase tracking-wide">
                  AI/ML Inference Engine Outputs (30-Sample Window Features)
                </h3>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-teal-100 text-teal-800 border border-teal-300 font-semibold">
                {mlRes ? '30/30 Window Complete — ML Active' : 'Collecting 30-sample baseline window...'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
              {/* Subsidence Model */}
              <div className="p-4 bg-white/80 rounded-xl border border-emerald-900/10 space-y-2 shadow-sm">
                <span className="text-[11px] text-emerald-700 font-semibold uppercase block">Primary ML Model</span>
                <h4 className="text-sm font-bold text-emerald-950">Binary Random Forest</h4>
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-emerald-700">Prediction:</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded ${subDetected ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'}`}>
                    {subLabel}
                  </span>
                </div>
                <div className="pt-1 text-[11px] text-emerald-700 flex justify-between">
                  <span>Confidence / Prob:</span>
                  <span className="font-bold text-emerald-950">{(subProb * 100).toFixed(1)}%</span>
                </div>
              </div>

              {/* Isolation Forest */}
              <div className="p-4 bg-white/80 rounded-xl border border-emerald-900/10 space-y-2 shadow-sm">
                <span className="text-[11px] text-emerald-700 font-semibold uppercase block">Secondary Anomaly Signal</span>
                <h4 className="text-sm font-bold text-emerald-950">Isolation Forest</h4>
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-emerald-700">Status:</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded ${anoDetected ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'}`}>
                    {anoLabel}
                  </span>
                </div>
                <div className="pt-1 text-[11px] text-emerald-700 flex justify-between">
                  <span>Anomaly Score:</span>
                  <span className="font-bold text-emerald-950">{anoScore.toFixed(4)}</span>
                </div>
              </div>

              {/* Context Model */}
              <div className="p-4 bg-white/80 rounded-xl border border-emerald-900/10 space-y-2 shadow-sm">
                <span className="text-[11px] text-emerald-700 font-semibold uppercase block">Scenario Context</span>
                <h4 className="text-sm font-bold text-emerald-950">20-Class Scenario RF</h4>
                <div className="pt-2 text-xs text-teal-800 font-bold truncate">
                  {scenario}
                </div>
                <div className="pt-1 text-[11px] text-emerald-600">
                  Classified underground event pattern
                </div>
              </div>
            </div>

            {/* Synthetic Prototype Disclaimer Notice */}
            <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center space-x-2 font-mono">
              <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0"></span>
              <span>{mlRes?.is_synthetic_notice || 'Prototype Decision-Support Signal (Synthetic Data Baseline — Not certified mine-safety device)'}</span>
            </div>
          </div>
        );
      })()}

      {/* Real-time Recharts Trends */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-100 font-mono uppercase">
          Live Sensor Time-Series Trends (Tilt & Vibration)
        </h3>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
              <Line type="monotone" dataKey="roll" stroke="#06b6d4" strokeWidth={2} name="Roll (°)" dot={false} />
              <Line type="monotone" dataKey="pitch" stroke="#3b82f6" strokeWidth={2} name="Pitch (°)" dot={false} />
              <Line type="monotone" dataKey="vibration" stroke="#f59e0b" strokeWidth={2} name="Vibration (g)" dot={false} />
              <Line type="monotone" dataKey="gas" stroke="#ef4444" strokeWidth={1.5} name="Gas ADC" dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
