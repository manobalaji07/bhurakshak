import React from 'react';
import { Activity, Cpu, Layers, CheckCircle } from 'lucide-react';

export const AdminAnalytics: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h2 className="text-lg font-bold text-slate-100 font-mono uppercase">
          AI Machine Learning Model Analytics & Metrics
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Synthetic dataset evaluation baseline metrics & model precision metrics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
        {/* Binary RF */}
        <div className="glass-card p-5 space-y-3 border-l-4 border-l-cyan-500">
          <span className="text-xs text-cyan-400 font-bold uppercase">PRIMARY MODEL</span>
          <h3 className="text-base font-bold text-slate-100">Binary Random Forest</h3>
          <p className="text-xs text-slate-400">Subsidence Detector (SUBSIDENCE vs NO_SUBSIDENCE)</p>
          <div className="pt-2 space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">Accuracy:</span><span className="text-cyan-300 font-bold">96.0%</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Precision:</span><span className="text-cyan-300 font-bold">1.00</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Recall:</span><span className="text-cyan-300 font-bold">0.77</span></div>
            <div className="flex justify-between"><span className="text-slate-500">F1 Score:</span><span className="text-cyan-300 font-bold">0.87</span></div>
          </div>
        </div>

        {/* Isolation Forest */}
        <div className="glass-card p-5 space-y-3 border-l-4 border-l-amber-500">
          <span className="text-xs text-amber-400 font-bold uppercase">SECONDARY SIGNAL</span>
          <h3 className="text-base font-bold text-slate-100">Isolation Forest</h3>
          <p className="text-xs text-slate-400">Structural Anomaly Signal Detector</p>
          <div className="pt-2 space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">Accuracy:</span><span className="text-amber-300 font-bold">42.47%</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Anomaly Precision:</span><span className="text-amber-300 font-bold">98.51%</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Anomaly Recall:</span><span className="text-amber-300 font-bold">36.63%</span></div>
            <div className="flex justify-between"><span className="text-slate-500">F1 Score:</span><span className="text-amber-300 font-bold">53.40%</span></div>
          </div>
        </div>

        {/* Feature Windowing */}
        <div className="glass-card p-5 space-y-3 border-l-4 border-l-blue-500">
          <span className="text-xs text-blue-400 font-bold uppercase">FEATURE PIPELINE</span>
          <h3 className="text-base font-bold text-slate-100">30s Window Feature Extractor</h3>
          <p className="text-xs text-slate-400">17 Sensors x 8 Statistical Metrics = 136 Features</p>
          <div className="pt-2 space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">Sampling Rate:</span><span className="text-slate-200">1 Hz</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Window Size:</span><span className="text-slate-200">30 samples</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Feature Count:</span><span className="text-slate-200 font-bold">136 Columns</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
