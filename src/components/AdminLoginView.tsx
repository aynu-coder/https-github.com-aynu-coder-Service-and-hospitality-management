import React, { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  UtensilsCrossed,
} from 'lucide-react';
import { useHospitality } from '../context/HospitalityContext';
import { Employee } from '../types/hospitality';

interface AdminLoginViewProps {
  onSuccess: (employee: Employee) => void;
  onBackToMenu: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onSuccess,
  onBackToMenu,
}) => {
  const { state, loginWithPassword } = useHospitality();
  const [username, setUsername] = useState('selam.admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = loginWithPassword(username, password);
    if (res.ok && res.employee) {
      setPassword('');
      onSuccess(res.employee);
    } else {
      setError(res.error || 'Authentication failed.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F8FA] px-4 py-10 text-[#111827]">
      <div className="w-full max-w-md space-y-5">
        {/* Top Property Identity */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#181C24] text-white shadow-sm">
            <UtensilsCrossed className="h-6 w-6 text-[#FF5A1F]" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-[#111827]">
              {state.config.hotelName}
            </h1>
            <p className="text-xs text-slate-500">
              Admin &amp; Staff Control Portal · <span className="font-mono">/admin</span>
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-[#E8ECF2] bg-white shadow-lg overflow-hidden">
          <div className="flex items-center gap-3 border-b border-[#E8ECF2] bg-[#181C24] px-6 py-4 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF5A1F]">
              <Lock className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold">Sign In to Admin Control</h2>
              <p className="text-[11px] text-slate-400">
                Authorized hospitality staff credentials required
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label
                htmlFor="admin-username"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                Employee Username
              </label>
              <input
                id="admin-username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. selam.admin"
                className="w-full rounded-lg border border-[#E8ECF2] bg-[#F7F8FA] px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#FF5A1F] focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-[#E8ECF2] bg-[#F7F8FA] py-2.5 pl-3.5 pr-10 text-sm text-slate-900 outline-none focus:border-[#FF5A1F] focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF5A1F] py-2.5 text-sm font-semibold text-white hover:bg-[#E64A12] transition-colors"
            >
              <ShieldCheck className="h-4 w-4" />
              Sign In to Admin Dashboard
            </button>

            {/* Optional Staff Credentials Directory */}
            <div className="border-t border-[#E8ECF2] pt-3">
              <button
                type="button"
                onClick={() => setShowDirectory((v) => !v)}
                className="flex w-full items-center justify-between text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                <span className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" />
                  {showDirectory ? 'Hide Demo Staff Credentials' : 'View Demo Staff Credentials'}
                </span>
                <span>{showDirectory ? '−' : '+'}</span>
              </button>

              {showDirectory && (
                <div className="mt-2.5 max-h-44 overflow-y-auto rounded-lg border border-[#E8ECF2] bg-[#F7F8FA] divide-y divide-[#E8ECF2] text-[11px]">
                  {state.employees.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => {
                        setUsername(emp.username);
                        setError(null);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-white transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{emp.role}</div>
                        <div className="font-mono text-slate-500">{emp.username}</div>
                      </div>
                      <span className="font-mono font-semibold text-[#FF5A1F]">
                        {emp.password}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={onBackToMenu}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#111827] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Public Order Menu
          </button>
        </div>
      </div>
    </div>
  );
};
