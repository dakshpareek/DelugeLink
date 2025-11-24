import { useEffect, useState } from 'react';
import { Activity, Download, Upload, Settings } from 'lucide-react';
import type { DelugeStats } from '../types/deluge';

const SPEED_FAST = 1024 * 1024; // 1 MB/s
const SPEED_ACTIVE = 200 * 1024; // 200 KB/s
const baseCardClass =
  'glass-card px-3 py-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(8,12,24,0.3)]';

const getSpeedVisual = (rate: number) => {
  if (rate >= SPEED_FAST) {
    return {
      accent: 'text-emerald-200',
      iconAccent: 'text-emerald-300',
      card: `${baseCardClass} border border-emerald-400/40 shadow-[0_18px_44px_rgba(16,185,129,0.22)]`,
      indicator: 'bg-emerald-400/90 shadow-[0_0_0_3px_rgba(16,185,129,0.25)] animate-[pulse_1.8s_ease-in-out_infinite]'
    };
  }
  if (rate >= SPEED_ACTIVE) {
    return {
      accent: 'text-amber-200',
      iconAccent: 'text-amber-300',
      card: `${baseCardClass} border border-amber-300/35 shadow-[0_16px_40px_rgba(245,158,11,0.2)]`,
      indicator: 'bg-amber-400/80 shadow-[0_0_0_3px_rgba(245,158,11,0.18)] animate-[pulse_2.2s_ease-in-out_infinite]'
    };
  }
  return {
    accent: 'text-slate-200',
    iconAccent: 'text-slate-400',
    card: `${baseCardClass} border border-white/10 shadow-[0_14px_32px_rgba(6,10,24,0.4)]`,
    indicator: 'bg-slate-500/70'
  };
};

const getActivityVisual = (count: number) => {
  if (count >= 5) {
    return {
      accent: 'text-fuchsia-200',
      iconAccent: 'text-fuchsia-300',
      card: `${baseCardClass} border border-fuchsia-400/35 shadow-[0_18px_42px_rgba(168,85,247,0.2)]`
    };
  }
  if (count > 0) {
    return {
      accent: 'text-sky-200',
      iconAccent: 'text-sky-300',
      card: `${baseCardClass} border border-sky-400/35 shadow-[0_16px_38px_rgba(56,189,248,0.18)]`
    };
  }
  return {
    accent: 'text-slate-200',
    iconAccent: 'text-slate-400',
    card: `${baseCardClass} border border-white/10 shadow-[0_14px_30px_rgba(8,12,24,0.38)]`
  };
};

export default function Popup() {
  const [stats, setStats] = useState<DelugeStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = () => {
    chrome.runtime.sendMessage({ type: 'GET_STATS' }, (response) => {
      setLoading(false);
      if (response.error) {
        setError(response.error);
      } else {
        setStats(response.stats);
        setError(null);
      }
    });
  };

  const formatSpeed = (bytesPerSecond: number) => {
    if (!bytesPerSecond || bytesPerSecond <= 0) return '0 B/s';
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
    let value = bytesPerSecond;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  };

  if (loading) {
    return (
      <div className="w-[18.5rem] h-[15rem] glass-panel flex items-center justify-center text-white">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-[16.5rem] glass-panel text-white p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.18)] animate-[pulse_2.2s_ease-in-out_infinite]" />
          <h2 className="text-base font-semibold tracking-tight">Connection Error</h2>
        </div>
        <p className="text-[11px] text-white/65 leading-relaxed">{error}</p>
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="glass-button w-full bg-gradient-to-r from-sky-500/70 to-blue-500/70 text-white flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(59,130,246,0.28)]"
        >
          <Settings className="w-4 h-4" />
          Open Settings
        </button>
      </div>
    );
  }

  const downloadSpeed = stats?.downloadSpeed ?? 0;
  const uploadSpeed = stats?.uploadSpeed ?? 0;
  const activeDownloads = stats?.activeDownloads ?? 0;

  const downloadVisual = getSpeedVisual(downloadSpeed);
  const uploadVisual = getSpeedVisual(uploadSpeed);
  const overallVisual = getSpeedVisual(Math.max(downloadSpeed, uploadSpeed));
  const activityVisual = getActivityVisual(activeDownloads);

  const openFeedbackLink = () => {
    chrome.tabs.create({ url: 'https://github.com/dakshpareek/DelugeLink/issues/new' });
  };

  return (
    <div className="w-[16.5rem] glass-panel text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 backdrop-blur-sm bg-white/5">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full transition-all duration-500 ${overallVisual.indicator}`} />
          <h1 className="text-sm font-semibold tracking-tight">DelugeLink</h1>
        </div>
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="glass-button p-1.5 rounded-full text-white/70 hover:text-white transition-colors duration-200"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="px-3 py-2.5 grid grid-cols-2 gap-2.5">
        <div className={downloadVisual.card}>
          <div className={`flex items-center gap-2 text-xs uppercase tracking-[0.2em] ${downloadVisual.iconAccent}`}>
            <Download className="w-4 h-4" />
            <span>Download</span>
          </div>
          <div className={`mt-1.5 text-xl font-mono font-semibold leading-none tracking-tight ${downloadVisual.accent}`}>
            {formatSpeed(downloadSpeed)}
          </div>
        </div>

        <div className={uploadVisual.card}>
          <div className={`flex items-center gap-2 text-xs uppercase tracking-[0.2em] ${uploadVisual.iconAccent}`}>
            <Upload className="w-4 h-4" />
            <span>Upload</span>
          </div>
          <div className={`mt-1.5 text-xl font-mono font-semibold leading-none tracking-tight ${uploadVisual.accent}`}>
            {formatSpeed(uploadSpeed)}
          </div>
        </div>
      </div>

      {/* Active Downloads */}
      <div className="px-3 pb-3">
        <div className={activityVisual.card}>
          <div className={`flex items-center gap-2 text-xs uppercase tracking-[0.2em] ${activityVisual.iconAccent}`}>
            <Activity className="w-4 h-4" />
            <span>Active Downloads</span>
          </div>
          <div className={`mt-1.5 text-xl font-mono font-semibold leading-none tracking-tight ${activityVisual.accent}`}>
            {activeDownloads}
          </div>
        </div>
      </div>

      <div className="px-3 py-2 border-t border-white/10 bg-white/5 backdrop-blur-sm flex justify-end">
        <button
          onClick={openFeedbackLink}
          className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/60 hover:text-white transition-colors duration-200"
        >
          Report Issue
        </button>
      </div>
    </div>
  );
}
