import type {
  DelugeConfig,
  DelugeVersion,
  TorrentAddResult,
  DelugeStats,
  DelugeLabel,
  DelugeTorrentSummary
} from '../types/deluge';

export class DelugeClient {
  private config: DelugeConfig;
  private sessionId: string | null = null;
  private version: DelugeVersion | null = null;
  private requestId = 1;

  constructor(config: DelugeConfig) {
    this.config = config;
  }

  private getBaseUrl(): string {
    const root = this.config.webRoot || '';
    return `${this.config.host}${root}`;
  }

  private async makeRequest(method: string, params: any[] = []): Promise<any> {
    const url = `${this.getBaseUrl()}/json`;
    
    const body = {
      method,
      params,
      id: this.requestId++
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.sessionId) {
      headers['Cookie'] = `_session_id=${this.sessionId}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'Unknown error');
    }

    // Extract session from response headers
    const setCookie = response.headers.get('set-cookie');
    if (setCookie && setCookie.includes('_session_id=')) {
      const match = setCookie.match(/_session_id=([^;]+)/);
      if (match) {
        this.sessionId = match[1];
      }
    }

    return data.result;
  }

  async detectVersion(): Promise<DelugeVersion> {
    try {
      // Try v2 method first
      await this.makeRequest('web.get_host_status');
      this.version = 'v2';
      return 'v2';
    } catch {
      // Fall back to v1
      this.version = 'v1';
      return 'v1';
    }
  }

  async login(): Promise<boolean> {
    try {
      // Detect version if not already done
      if (!this.version) {
        await this.detectVersion();
      }

      const result = await this.makeRequest('auth.login', [this.config.password]);
      
      if (result === true) {
        return true;
      }
      
      throw new Error('Invalid password');
    } catch (error) {
      throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async checkSession(): Promise<boolean> {
    try {
      const result = await this.makeRequest('auth.check_session');
      return result === true;
    } catch {
      return false;
    }
  }

  async ensureConnected(): Promise<void> {
    const isValid = await this.checkSession();
    if (!isValid) {
      await this.login();
    }
  }

  async addMagnet(magnetUrl: string, options: { label?: string; paused?: boolean } = {}): Promise<TorrentAddResult> {
    try {
      await this.ensureConnected();

      const addOptions: Record<string, any> = {};
      
      if (options.label) {
        addOptions.label = options.label;
      }
      
      if (options.paused) {
        addOptions.add_paused = true;
      }

      const hash = await this.makeRequest('core.add_torrent_magnet', [magnetUrl, addOptions]);
      
      if (hash) {
        return {
          success: true,
          message: `Added to ${options.label || 'Default'}`,
          hash
        };
      } else {
        return {
          success: false,
          message: 'Torrent already exists'
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to add torrent';
      
      // Parse Deluge error messages
      if (errorMsg.includes('already in session')) {
        return {
          success: false,
          message: 'Torrent already in session'
        };
      }
      
      return {
        success: false,
        message: errorMsg
      };
    }
  }

  async addTorrentFile(fileData: string, filename: string, options: { label?: string; paused?: boolean } = {}): Promise<TorrentAddResult> {
    try {
      await this.ensureConnected();

      const addOptions: Record<string, any> = {};
      
      if (options.label) {
        addOptions.label = options.label;
      }
      
      if (options.paused) {
        addOptions.add_paused = true;
      }

      // Remove data URL prefix if present
      const base64Data = fileData.replace(/^data:.*?;base64,/, '');

      const hash = await this.makeRequest('core.add_torrent_file', [filename, base64Data, addOptions]);
      
      if (hash) {
        return {
          success: true,
          message: `Added to ${options.label || 'Default'}`,
          hash
        };
      } else {
        return {
          success: false,
          message: 'Torrent already exists'
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to add torrent';
      
      // Parse Deluge error messages
      if (errorMsg.includes('already in session')) {
        return {
          success: false,
          message: 'Torrent already in session'
        };
      }
      
      return {
        success: false,
        message: errorMsg
      };
    }
  }

  async getLabels(): Promise<DelugeLabel[]> {
    try {
      await this.ensureConnected();
      
      const labels = await this.makeRequest('label.get_labels');
      
      return labels.map((name: string) => ({
        name,
        count: 0
      }));
    } catch {
      return [];
    }
  }

  async getStats(): Promise<DelugeStats> {
    try {
      await this.ensureConnected();
      
      const stats = await this.makeRequest('web.update_ui', [
        [
          'download_rate',
          'upload_rate',
          'payload_download_rate',
          'payload_upload_rate',
          'num_connections'
        ],
        {}
      ]);

      const downloadRate =
        stats?.stats?.download_rate ??
        stats?.stats?.payload_download_rate ??
        0;

      const uploadRate =
        stats?.stats?.upload_rate ??
        stats?.stats?.payload_upload_rate ??
        0;

      return {
        downloadSpeed: typeof downloadRate === 'number' ? downloadRate : 0,
        uploadSpeed: typeof uploadRate === 'number' ? uploadRate : 0,
        activeDownloads: Object.keys(stats?.torrents || {}).length
      };
    } catch {
      return {
        downloadSpeed: 0,
        uploadSpeed: 0,
        activeDownloads: 0
      };
    }
  }

  async getTorrentSummaries(): Promise<DelugeTorrentSummary[]> {
    try {
      await this.ensureConnected();

      const data = await this.makeRequest('web.update_ui', [
        ['name', 'progress'],
        {}
      ]);

      const torrents = data?.torrents || {};

      return Object.entries(torrents).map(([hash, torrent]: [string, any]) => ({
        hash: hash.toLowerCase(),
        name: typeof torrent?.name === 'string' ? torrent.name : '',
        progress: typeof torrent?.progress === 'number' ? torrent.progress : 0
      }));
    } catch {
      return [];
    }
  }

  async pauseAll(): Promise<void> {
    await this.ensureConnected();
    await this.makeRequest('core.pause_all_torrents');
  }

  async resumeAll(): Promise<void> {
    await this.ensureConnected();
    await this.makeRequest('core.resume_all_torrents');
  }
}
