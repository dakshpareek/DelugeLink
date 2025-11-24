import { useState, useEffect } from 'react';
import { Save, CheckCircle, AlertCircle } from 'lucide-react';

export default function Options() {
  const [host, setHost] = useState('');
  const [password, setPassword] = useState('');
  const [webRoot, setWebRoot] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    chrome.storage.local.get(['host', 'password', 'webRoot'], (result) => {
      setHost(result.host || '');
      setPassword(result.password || '');
      setWebRoot(result.webRoot || '');
    });
  }, []);

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

  return (
    <div className="min-h-screen bg-deluge-darker text-white">
      <div className="max-w-2xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">DelugeLink Settings</h1>
          <p className="text-gray-400">Configure your Deluge server connection</p>
        </div>

        {/* Form */}
        <div className="bg-deluge-dark rounded-lg p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Host URL <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="http://localhost:8112"
              className="w-full bg-deluge-darker border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-deluge-accent"
            />
            <p className="text-sm text-gray-400 mt-1">
              Full URL including protocol (http:// or https://)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Password <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your Deluge web password"
              className="w-full bg-deluge-darker border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-deluge-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Web Root (Optional)
            </label>
            <input
              type="text"
              value={webRoot}
              onChange={(e) => setWebRoot(e.target.value)}
              placeholder="/deluge"
              className="w-full bg-deluge-darker border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-deluge-accent"
            />
            <p className="text-sm text-gray-400 mt-1">
              Only needed if Deluge is behind a reverse proxy with a custom path
            </p>
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              className="w-full bg-deluge-accent hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded flex items-center justify-center gap-2 transition-colors"
            >
              <Save className="w-5 h-5" />
              Save Settings
            </button>
          </div>

          {/* Feedback Messages */}
          {saved && (
            <div className="flex items-center gap-2 text-green-400 bg-green-900/20 p-3 rounded">
              <CheckCircle className="w-5 h-5" />
              <span>Settings saved successfully!</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-900/20 border border-blue-800 rounded-lg p-6">
          <h3 className="font-semibold mb-2 text-blue-300">💡 Tips</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• Make sure Deluge web interface is enabled and accessible</li>
            <li>• Test your connection by opening the host URL in your browser</li>
            <li>• Right-click any magnet link or .torrent to send it to Deluge</li>
            <li>• Hold Alt/Option while clicking to bypass the extension</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
