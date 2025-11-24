export interface DelugeConfig {
  host: string;
  password: string;
  webRoot?: string;
}

export interface DelugeStats {
  downloadSpeed: number;
  uploadSpeed: number;
  activeDownloads: number;
}

export interface TorrentAddResult {
  success: boolean;
  message: string;
  hash?: string;
}

export interface DelugeLabel {
  name: string;
  count: number;
}

export interface DelugeTorrentSummary {
  hash: string;
  name: string;
  progress: number;
}

export type DelugeVersion = 'v1' | 'v2';

export interface SessionState {
  sessionId: string | null;
  version: DelugeVersion | null;
  connected: boolean;
  lastCheck: number;
}
