import { useState, useEffect, useMemo } from 'react';
import { Save, CheckCircle, AlertCircle, Link2, Lock, Box } from 'lucide-react';
import type { DelugeStats } from '../types/deluge';

export default function Options() {
  const [host, setHost] = useState('');
  const [password, setPassword] = useState('');
  const [webRoot, setWebRoot] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [hostTouched, setHostTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);
  const [inlineError, setInlineError] = useState<{ host?: string; password?: string }>({});

  useEffect(() => {
    chrome.storage.local.get(['host', 'password', 'webRoot'], (result) => {
      setHost(result.host || '');
      setPassword(result.password || '');
      setWebRoot(result.webRoot || '');
    });
  }, []);

  useEffect(() => {
    const errors: { host?: string; password?: string } = {};
    if (hostTouched) {
      if (!host.trim()) {
        errors.host = 'Host URL is required';
      } else if (!/^https?:\/\/.+/i.test(host.trim())) {
        errors.host = 'Start with http:// or https://';
      }
    }
    if (passwordTouched && !password.trim()) {
      errors.password = 'Password is required';
    }
    setInlineError(errors);
  }, [host, password, hostTouched, passwordTouched]);

  const hostFieldState = useMemo(() => {
    if (!hostTouched) return 'border-white/20 focus:border-white/40 focus:ring-white/15';
    return inlineError.host
      ? 'border-rose-400/60 focus:border-rose-400/80 focus:ring-rose-300/40'
      : 'border-white/30 focus:border-emerald-300/60 focus:ring-emerald-200/30';
  }, [hostTouched, inlineError.host]);

  const passwordFieldState = useMemo(() => {
    if (!passwordTouched) return 'border-white/20 focus:border-white/40 focus:ring-white/15';
    return inlineError.password
      ? 'border-rose-400/60 focus:border-rose-400/80 focus:ring-rose-300/40'
      : 'border-white/30 focus:border-emerald-300/60 focus:ring-emerald-200/30';
  }, [passwordTouched, inlineError.password]);

  const handleSave = async () => {
    setError('');
    setSaved(false);

    if (!host || !password) {
      setError('Host and password are required');
      return;
    }

    try {
      await chrome.storage.local.set({ host, password, webRoot });
      setSaved(true);
      
      // Refresh labels in background
      chrome.runtime.sendMessage({ type: 'REFRESH_LABELS' });
      
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('Failed to save settings');
    }
  };

  const handleTestConnection = async () => {
    if (!host.trim() || !password.trim()) {
      setHostTouched(true);
      setPasswordTouched(true);
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
      if (response?.error) {
        setTestResult({
          status: 'error',
          message: response.error
        });
      } else {
        const stats = response.stats as DelugeStats;
        setTestResult({
          status: 'success',
          message: `Connected. Active torrents: ${stats?.activeDownloads ?? 0}`
        });
      }
    } catch (err) {
      setTestResult({
        status: 'error',
        message: err instanceof Error ? err.message : 'Unable to reach Deluge'
      });
    } finally {
      setTesting(false);
    }
  };

  const renderFieldError = (message?: string) =>
    message ? <p className="text-xs text-rose-200 mt-1.5">{message}</p> : null;

  return (
    <div className="min-h-screen bg-page-gradient text-white px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <header className="space-y-2.5">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-[12px] tracking-[0.18em] uppercase text-white/60">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.2)] animate-[pulse_2.4s_ease_infinite]" />
            Connection
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">DelugeLink Settings</h1>
          <p className="text-sm text-white/60 leading-relaxed">
            Your credentials stay on this device. Fine-tune the connection so DelugeLink can send torrents instantly.
          </p>
        </header>

        {/* Form */}
        <div className="glass-panel p-6 space-y-6">
          <section className="space-y-1">
            <h2 className="text-sm font-semibold text-white/80 tracking-wide uppercase">Connection</h2>
            <p className="text-xs text-white/55">
              Provide the details from your Deluge web UI. You can test the connection before saving changes.
            </p>
          </section>

          <div className="space-y-4">
            <label className="block">
              <span className="flex items-center gap-2 text-xs font-medium text-white/75 uppercase tracking-[0.2em] mb-2">
                <Link2 className="w-3.5 h-3.5" />
                Host URL <span className="text-rose-300">• Required</span>
              </span>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                onBlur={() => setHostTouched(true)}
                placeholder="http://localhost:8112"
                className={`w-full rounded-lg bg-slate-950/45 border ${hostFieldState} px-4 py-3 text-sm font-semibold text-white placeholder:text-white/35 focus:outline-none transition-all duration-200`}
              />
              {renderFieldError(hostTouched ? inlineError.host : undefined)}
              <p className="text-xs text-white/45 mt-1.5">
                Include protocol and port. If you run Deluge behind HTTPS, enter the secure URL.
              </p>
            </label>

            <label className="block">
              <span className="flex items-center gap-2 text-xs font-medium text-white/75 uppercase tracking-[0.2em] mb-2">
                <Lock className="w-3.5 h-3.5" />
                Password <span className="text-rose-300">• Required</span>
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setPasswordTouched(true)}
                placeholder="Enter your Deluge web password"
                className={`w-full rounded-lg bg-slate-950/45 border ${passwordFieldState} px-4 py-3 text-sm font-semibold text-white placeholder:text-white/35 focus:outline-none transition-all duration-200`}
              />
              {renderFieldError(passwordTouched ? inlineError.password : undefined)}
            </label>

            <label className="block">
              <span className="flex items-center gap-2 text-xs font-medium text-white/75 uppercase tracking-[0.2em] mb-2">
                <Box className="w-3.5 h-3.5" />
                Web Root <span className="text-white/40">Optional</span>
              </span>
              <input
                type="text"
                value={webRoot}
                onChange={(e) => setWebRoot(e.target.value)}
                placeholder="/deluge"
                className="w-full rounded-lg bg-slate-950/30 border border-white/18 px-4 py-3 text-sm font-semibold text-white placeholder:text-white/35 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/15 transition-all duration-200"
              />
              <p className="text-xs text-white/45 mt-1.5">
                Set this only if your Deluge UI lives behind a reverse proxy with a custom path.
              </p>
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="glass-button flex-1 sm:flex-none bg-gradient-to-r from-sky-500/70 to-indigo-500/70 text-white flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(59,130,246,0.26)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {testing ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-white/50 border-t-transparent animate-spin" />
                    Testing…
                  </span>
                ) : (
                  'Test Connection'
                )}
              </button>
              <button
                onClick={handleSave}
                className="glass-button flex-1 sm:flex-none bg-gradient-to-r from-emerald-500/80 to-teal-500/75 text-white flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(16,185,129,0.25)]"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
            {testResult && (
              <div
                className={`glass-card flex-1 sm:flex-none border px-3 py-2.5 text-xs font-medium ${
                  testResult.status === 'success'
                    ? 'border-emerald-400/30 text-emerald-200'
                    : 'border-rose-400/35 text-rose-200'
                }`}
              >
                {testResult.message}
              </div>
            )}
          </div>

          {/* Feedback Messages */}
          {saved && (
            <div className="glass-card border border-emerald-400/25 text-emerald-200 px-3 py-2.5 flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>Settings saved successfully.</span>
            </div>
          )}

          {error && (
            <div className="glass-card border border-rose-400/30 text-rose-200 px-3 py-2.5 flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="glass-card p-5 border border-sky-400/25 space-y-3">
          <h3 className="font-semibold text-sky-200 flex items-center gap-2 text-sm uppercase tracking-[0.24em]">
            <span role="img" aria-hidden="true">
              💡
            </span>
            Quick Tips
          </h3>
          <ul className="space-y-2 text-xs text-white/65">
            <li>Ensure the Deluge web interface is running and reachable from this machine.</li>
            <li>Test the connection above to verify credentials without leaving the page.</li>
            <li>Right-click any magnet or .torrent once configured to send it directly to Deluge.</li>
            <li>Hold Alt/Option while clicking if you want to bypass the extension on a specific link.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
