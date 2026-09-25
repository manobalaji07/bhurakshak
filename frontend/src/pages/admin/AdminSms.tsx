import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, PhoneCall, Radio, Sliders } from 'lucide-react';
import { api } from '../../api/client';

export const AdminSms: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nodeId, setNodeId] = useState('NODE_03');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  // Settings State
  const [provider, setProvider] = useState('SIMULATED');
  const [apiKey, setApiKey] = useState('');
  const [accountSid, setAccountSid] = useState('');
  const [fromNumber, setFromNumber] = useState('+18005550199');
  const [autoSubsidence, setAutoSubsidence] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  const fetchSmsData = async () => {
    try {
      setLoading(true);
      const [logsData, configData] = await Promise.all([
        api.getSmsLogs(),
        api.getSmsConfig()
      ]);
      setLogs(logsData || []);
      if (configData) {
        setProvider(configData.provider || 'SIMULATED');
        setApiKey(configData.api_key || '');
        setAccountSid(configData.account_sid || '');
        setFromNumber(configData.from_number || '+18005550199');
        setAutoSubsidence(configData.auto_send_subsidence ?? true);
      }
    } catch (err) {
      console.error('Error loading SMS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSmsData();
  }, []);

  const handleApplyTemplate = (templateType: string) => {
    if (templateType === 'subsidence') {
      setMessage(`BHURAKSHAK CRITICAL ALERT: Subsidence pattern confirmed on Mesh Node ${nodeId}. Evacuate surface panel zone immediately & notify mine control.`);
    } else if (templateType === 'vibration') {
      setMessage(`BHURAKSHAK WARNING: High machinery vibration / ground shock detected on Node ${nodeId}. Inspect structural mounting.`);
    } else if (templateType === 'gas') {
      setMessage(`BHURAKSHAK HAZARD ALERT: MPU/Gas threshold anomaly flagged on Node ${nodeId}. Check ventilation & atmospheric sensors.`);
    }
  };

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      setSending(true);
      setSendSuccess(null);
      const res = await api.sendSmsAlert({
        node_id: nodeId,
        message: message,
        recipient_phone: phone.trim() ? phone : undefined,
        recipient_name: recipientName.trim() ? recipientName : undefined
      });

      setSendSuccess(`Successfully dispatched ${res.count} SMS alert(s)!`);
      setMessage('');
      fetchSmsData();
      setTimeout(() => setSendSuccess(null), 4000);
    } catch (err) {
      console.error('Error sending SMS alert:', err);
    } finally {
      setSending(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingConfig(true);
      await api.updateSmsConfig({
        provider,
        api_key: apiKey,
        account_sid: accountSid,
        from_number: fromNumber,
        auto_send_subsidence: autoSubsidence
      });
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 3000);
    } catch (err) {
      console.error('Error saving SMS config:', err);
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold mb-2">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>SMS EMERGENCY DISPATCH & GATEWAY</span>
            </div>
            <h1 className="text-xl font-bold font-mono text-white tracking-tight">
              Subsidence SMS Notification System
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Automatic AI subsidence trigger & manual administrative SMS emergency dispatch console for field personnel and mine safety teams.
            </p>
          </div>

          <button
            onClick={fetchSmsData}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold rounded-xl border border-slate-700 flex items-center space-x-2 transition-colors self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh SMS Logs</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Instant SMS Emergency Broadcast Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-mono">DISPATCH EMERGENCY SMS ALERT</h3>
                  <p className="text-[11px] text-slate-500">Send immediate SMS warning to mine safety supervisors & field crews</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSendSms} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 font-mono uppercase mb-1">
                    Target Mesh Node
                  </label>
                  <select
                    value={nodeId}
                    onChange={(e) => setNodeId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="NODE_01">NODE_01 — North Surface Panel</option>
                    <option value="NODE_02">NODE_02 — Central Surface Panel</option>
                    <option value="NODE_03">NODE_03 — South Surface Panel</option>
                    <option value="GLOBAL">ALL MESH NODES (SYSTEM BROADCAST)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 font-mono uppercase mb-1">
                    Custom Recipient Mobile (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +91 9876543210 (Leave blank for ALL registered users)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Quick Template Buttons */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 font-mono uppercase mb-1.5">
                  Quick Alert Message Templates
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('subsidence')}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold hover:bg-rose-100 transition-colors flex items-center space-x-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Evacuation Alert</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('vibration')}
                    className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold hover:bg-amber-100 transition-colors flex items-center space-x-1.5"
                  >
                    <Radio className="w-3.5 h-3.5 text-amber-600" />
                    <span>Ground Shock Warning</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('gas')}
                    className="px-3 py-1.5 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-800 text-[11px] font-semibold hover:bg-cyan-100 transition-colors flex items-center space-x-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Atmospheric Anomaly</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 font-mono uppercase mb-1">
                  SMS Message Body
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type emergency alert message..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  disabled={sending || !message.trim()}
                  className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold text-white flex items-center space-x-2 transition-all shadow-md ${
                    sending || !message.trim()
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>{sending ? 'Dispatching SMS...' : 'Dispatch Emergency SMS Alert'}</span>
                </button>

                {sendSuccess && (
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs font-mono font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{sendSuccess}</span>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* SMS Outbox & Audit Logs */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 font-mono uppercase">
                SMS Outbox & Historical Dispatch Audit Logs
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono text-[11px] font-bold">
                {logs.length} Messages Logged
              </span>
            </div>

            {logs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-mono text-xs">
                No SMS alerts dispatched yet. Send an alert above or trigger subsidence to test.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">SMS ID</th>
                      <th className="py-2.5 px-3">Recipient</th>
                      <th className="py-2.5 px-3">Mobile Phone</th>
                      <th className="py-2.5 px-3">Node</th>
                      <th className="py-2.5 px-3">Message Content</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-mono">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900">{log.id}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{log.recipient_name}</td>
                        <td className="py-3 px-3 text-slate-600 font-medium">{log.recipient_phone}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold">
                            {log.node_id}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={log.message}>
                          {log.message}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              log.status.includes('DELIVERED')
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{log.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-[11px]">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: SMS Gateway Settings */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-mono uppercase">SMS GATEWAY SETTINGS</h3>
                <p className="text-[11px] text-slate-500">Configure provider & auto-dispatch policies</p>
              </div>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase">SMS Gateway Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="SIMULATED">Production Gateway Simulator (Local Live)</option>
                  <option value="TWILIO">Twilio SMS Gateway</option>
                  <option value="FAST2SMS">Fast2SMS (India)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Default: Production Simulator records live SMS dispatches directly in local database outbox.
                </p>
              </div>

              {provider === 'TWILIO' && (
                <>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1 uppercase">Twilio Account SID</label>
                    <input
                      type="text"
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={accountSid}
                      onChange={(e) => setAccountSid(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1 uppercase">Twilio Auth Token</label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••••••••••"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1 uppercase">Twilio From Number</label>
                    <input
                      type="text"
                      placeholder="+18005550199"
                      value={fromNumber}
                      onChange={(e) => setFromNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                    />
                  </div>
                </>
              )}

              {provider === 'FAST2SMS' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase">Fast2SMS API Key</label>
                  <input
                    type="password"
                    placeholder="Enter Fast2SMS API Key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>
              )}

              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSubsidence}
                    onChange={(e) => setAutoSubsidence(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Auto-Send SMS on Subsidence Detection
                  </span>
                </label>
                <p className="text-[10px] text-slate-400 mt-1 pl-6">
                  Automatically dispatches emergency SMS to registered personnel when AI ML detects subsidence.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold text-xs rounded-xl shadow-md transition-colors uppercase flex items-center justify-center space-x-2"
                >
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{savingConfig ? 'Saving Settings...' : 'Save SMS Gateway Policy'}</span>
                </button>

                {configSaved && (
                  <p className="text-[11px] text-emerald-600 font-bold text-center mt-2">
                    Gateway settings saved successfully!
                  </p>
                )}
              </div>
            </form>
          </div>

          {/* Registered Personnel Summary Card */}
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-5 shadow-sm space-y-3 font-mono">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-2">
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              <span>Registered SMS Recipients</span>
            </h4>
            <div className="space-y-2 text-xs divide-y divide-slate-800">
              <div className="pt-2 flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-200">Col. R. Vardhan</div>
                  <div className="text-[10px] text-slate-400">Chief Mine Geotech Dir</div>
                </div>
                <span className="font-mono text-emerald-300 text-[11px] font-bold">+91 9876543210</span>
              </div>
              <div className="pt-2 flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-200">Shift Supervisor A</div>
                  <div className="text-[10px] text-slate-400">Field Response Ops</div>
                </div>
                <span className="font-mono text-emerald-300 text-[11px] font-bold">+91 9123456789</span>
              </div>
              <div className="pt-2 flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-200">Mine Control Room</div>
                  <div className="text-[10px] text-slate-400">Dispatch Center</div>
                </div>
                <span className="font-mono text-emerald-300 text-[11px] font-bold">+91 9444012345</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
