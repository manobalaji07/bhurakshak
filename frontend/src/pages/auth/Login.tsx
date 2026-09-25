import React, { useState } from 'react';
import { Shield, Lock, User, Key, ArrowRight, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';
import { Role } from '../../types';

interface LoginProps {
  onLoginSuccess: (role: Role, username: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login(username, password);
      localStorage.setItem('bhurakshak_token', res.access_token);
      localStorage.setItem('bhurakshak_role', res.role);
      onLoginSuccess(res.role as Role, res.username);
    } catch (err: any) {
      // For student prototype convenience, fallback mock auth if backend server is starting
      if (username === 'admin' && password === 'admin123') {
        onLoginSuccess('ADMIN', 'admin');
      } else if (username === 'user' && password === 'user123') {
        onLoginSuccess('USER', 'user');
      } else {
        setError('Invalid credentials. Use demo accounts below.');
      }
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (role: Role) => {
    if (role === 'ADMIN') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('user');
      setPassword('user123');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-950/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md glass-card p-8 relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 mx-auto flex items-center justify-center shadow-xl shadow-cyan-950/60">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Shield className="w-7 h-7 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-mono">BHURAKSHAK</h1>
          <p className="text-xs text-slate-400">
            Underground Coal Mine Surface Mesh Monitoring & AI Command Platform
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase font-mono">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                placeholder="Enter username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase font-mono">Password</label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                placeholder="Enter password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm rounded-lg shadow-lg shadow-cyan-950/50 flex items-center justify-center space-x-2 transition-all font-mono uppercase"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="border-t border-slate-800/80 pt-4 text-center space-y-2">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
            Demo Credentials & Role Shortcuts
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDemoAccount('ADMIN')}
              className="px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs text-cyan-300 font-mono font-medium transition-colors"
            >
              ADMIN (admin / admin123)
            </button>
            <button
              onClick={() => setDemoAccount('USER')}
              className="px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs text-emerald-300 font-mono font-medium transition-colors"
            >
              USER (user / user123)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
