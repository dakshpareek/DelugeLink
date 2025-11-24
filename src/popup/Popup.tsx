import { useEffect, useState } from 'react';
import { Activity, Download, Upload, Pause, Play, Settings } from 'lucide-react';
import type { DelugeStats } from '../types/deluge';

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

  const handlePauseAll = () => {
    chrome.runtime.sendMessage({ type: 'PAUSE_ALL' });
  };

  const handleResumeAll = () => {
    chrome.runtime.sendMessage({ type: 'RESUME_ALL' });
  };

  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond === 0) return '0 B/s';
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(1024));
    return `${(bytesPerSecond / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  };

  if (loading) {
    return (
      <div className="w-96 h-64 bg-deluge-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-deluge-accent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-96 bg-deluge-dark text-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <h2 className="text-lg font-semibold">Connection Error</h2>
        </div>
        <p className="text-gray-400 mb-4">{error}</p>
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="w-full bg-deluge-accent hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded flex items-center justify-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Open Settings
        </button>
      </div>
    );
  }

  return (
    <div className="w-96 bg-deluge-dark text-white">
      {/* Header */}
      <div className="bg-deluge-darker p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            <h1 className="text-lg font-semibold">DelugeLink</h1>
          </div>
          <button
            onClick={() => chrome.runtime.openOptionsPage()}
            className="p-2 hover:bg-deluge-dark rounded"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-2 gap-4">
        <div className="bg-deluge-darker p-4 rounded-lg">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Download</span>
          </div>
          <div className="text-2xl font-bold">{formatSpeed(stats?.downloadSpeed || 0)}</div>
        </div>

        <div className="bg-deluge-darker p-4 rounded-lg">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium">Upload</span>
          </div>
          <div className="text-2xl font-bold">{formatSpeed(stats?.uploadSpeed || 0)}</div>
        </div>
      </div>

      {/* Active Downloads */}
      <div className="px-4 pb-4">
        <div className="bg-deluge-darker p-4 rounded-lg">
          <div className="flex items-center gap-2 text-purple-400 mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-sm font-medium">Active Downloads</span>
          </div>
          <div className="text-2xl font-bold">{stats?.activeDownloads || 0}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 grid grid-cols-2 gap-4 border-t border-gray-800">
        <button
          onClick={handlePauseAll}
          className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded flex items-center justify-center gap-2"
        >
          <Pause className="w-4 h-4" />
          Pause All
        </button>
        <button
          onClick={handleResumeAll}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4" />
          Resume All
        </button>
      </div>
    </div>
  );
}
