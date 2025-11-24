import { DelugeClient } from '../lib/deluge-client';
import type { DelugeConfig } from '../types/deluge';

let client: DelugeClient | null = null;
let labels: string[] = [];
let setupInProgress = false;
let labelMenuInProgress = false;
const DEFAULT_ADD_TITLE = '⚡ Add to Deluge';
const DEFAULT_PAUSED_TITLE = '⏸️ Add Paused';
const DUPLICATE_SUFFIX = ' [Already There]';
const TORRENT_CACHE_TTL = 30 * 1000;
const contextMenusApi = chrome.contextMenus as any;

let torrentCache = {
  hashes: new Set<string>(),
  names: new Set<string>(),
  lastUpdated: 0
};

let torrentCachePromise: Promise<void> | null = null;
let lastDuplicateMenuState: boolean | null = null;

// Initialize on install or startup
chrome.runtime.onInstalled.addListener(() => {
  console.log('[DelugeLink] Extension installed');
  chrome.tabs.create({ url: 'options.html' });
});

// Setup menus immediately
console.log('[DelugeLink] Service worker loaded, setting up context menus');
setupContextMenus();

// Setup context menus
async function setupContextMenus() {
  if (setupInProgress) {
    console.log('[DelugeLink] Setup already in progress, skipping');
    return;
  }
  
  setupInProgress = true;
  try {
    console.log('[DelugeLink] Starting context menu setup');
    
    // Remove all existing menus
    await chrome.contextMenus.removeAll();
    console.log('[DelugeLink] Removed old context menus');

    // Helper to create menu items with promises
    const createMenu = (options: any) => {
      return new Promise<void>((resolve) => {
        chrome.contextMenus.create(options, () => {
          if (chrome.runtime.lastError) {
            console.error('[DelugeLink] Error creating menu:', chrome.runtime.lastError, options.id);
          } else {
            console.log('[DelugeLink] Menu created:', options.id);
          }
          resolve();
        });
      });
    };

    // Create main menu
    await createMenu({
      id: 'delugelink-add',
      title: DEFAULT_ADD_TITLE,
      contexts: ['link']
    });

    // Create paused menu (as sibling, not child)
    await createMenu({
      id: 'delugelink-paused',
      title: DEFAULT_PAUSED_TITLE,
      contexts: ['link']
    });

    // Add label submenu
    const config = await getConfig();
    if (config) {
      console.log('[DelugeLink] Config found, loading labels');
      await refreshLabels();
      updateLabelMenus();
      await refreshTorrentCache(true);
    } else {
      console.log('[DelugeLink] No config found, skipping labels');
    }
    
    console.log('[DelugeLink] Context menu setup complete');
  } catch (error) {
    console.error('[DelugeLink] Error in setupContextMenus:', error);
  } finally {
    setupInProgress = false;
  }
}

async function updateLabelMenus() {
  if (labelMenuInProgress) {
    console.log('[DelugeLink] Label menu update already in progress, skipping');
    return;
  }

  labelMenuInProgress = true;

  try {
    // Remove old label menus (only the parent, which removes children too)
    await new Promise<void>((resolve) => {
      chrome.contextMenus.remove('delugelink-labels', () => {
        // Ignore error if menu doesn't exist
        chrome.runtime.lastError;
        console.log('[DelugeLink] Cleaned up old label menus');
        resolve();
      });
    });

    if (labels.length === 0) {
      console.log('[DelugeLink] No labels found, skipping label menu creation');
      return;
    }

    console.log('[DelugeLink] Creating label menus for:', labels);

    // Create parent labels menu
    await new Promise<void>((resolve) => {
      chrome.contextMenus.create(
        {
          id: 'delugelink-labels',
          title: '📂 Add to Label...',
          contexts: ['link']
        },
        () => {
          if (chrome.runtime.lastError) {
            console.warn('[DelugeLink] Could not create label parent menu:', chrome.runtime.lastError);
            chrome.runtime.lastError; // Clear the error
          } else {
            console.log('[DelugeLink] Label parent menu created');
          }
          resolve();
        }
      );
    });

    // Create each label submenu
    for (const label of labels) {
      await new Promise<void>((resolve) => {
        chrome.contextMenus.create(
          {
            id: `label-${label}`,
            title: label,
            contexts: ['link'],
            parentId: 'delugelink-labels'
          },
          () => {
            if (chrome.runtime.lastError) {
              console.warn(
                '[DelugeLink] Could not create label menu for:',
                label,
                chrome.runtime.lastError
              );
              chrome.runtime.lastError; // Clear the error
            } else {
              console.log('[DelugeLink] Label menu created:', label);
            }
            resolve();
          }
        );
      });
    }
  } finally {
    labelMenuInProgress = false;
  }
}

async function refreshLabels() {
  const config = await getConfig();
  if (!config) return;

  if (!client) {
    client = new DelugeClient(config);
  }

  try {
    const fetchedLabels = await client.getLabels();
    labels = fetchedLabels.map(l => l.name);
    updateLabelMenus();
  } catch (error) {
    console.error('Failed to refresh labels:', error);
  }
}

function normalizeName(name?: string | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

function extractTorrentKey(url: string): { hash?: string; name?: string } | null {
  if (!url) return null;

  if (url.startsWith('magnet:')) {
    const query = url.split('?')[1] || '';
    const params = new URLSearchParams(query);
    const xt = params.getAll('xt').find((value) => value?.toLowerCase().startsWith('urn:btih:'));
    const dn = params.get('dn');

    const hash = xt ? xt.split('urn:btih:')[1]?.toLowerCase() : undefined;
    const name = dn ? decodeURIComponent(dn) : undefined;

    return { hash, name };
  }

  if (url.includes('.torrent')) {
    const rawName = url.split('/').pop();
    if (!rawName) return null;
    const cleaned = rawName.split('?')[0];
    const decoded = decodeURIComponent(cleaned || '');
    return { name: decoded };
  }

  return null;
}

function isDuplicateTorrent(key: { hash?: string; name?: string } | null): boolean {
  if (!key) return false;

  if (key.hash && torrentCache.hashes.has(key.hash.toLowerCase())) {
    return true;
  }

  const normalizedName = normalizeName(key.name);
  if (normalizedName && torrentCache.names.has(normalizedName)) {
    return true;
  }

  return false;
}

async function refreshTorrentCache(force = false) {
  if (!force && Date.now() - torrentCache.lastUpdated < TORRENT_CACHE_TTL) {
    return;
  }

  if (torrentCachePromise) {
    return torrentCachePromise;
  }

  torrentCachePromise = (async () => {
    try {
      const config = await getConfig();
      if (!config) return;

      if (!client) {
        client = new DelugeClient(config);
      }

      const summaries = await client.getTorrentSummaries();

      torrentCache = {
        hashes: new Set(summaries.map((summary) => summary.hash)),
        names: new Set(
          summaries
            .map((summary) => normalizeName(summary.name))
            .filter((value): value is string => Boolean(value))
        ),
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('Failed to refresh torrent cache:', error);
    } finally {
      torrentCachePromise = null;
    }
  })();

  return torrentCachePromise;
}

function updateContextMenuTitle(id: string, title: string) {
  return new Promise<void>((resolve) => {
    chrome.contextMenus.update(id, { title }, () => {
      chrome.runtime.lastError;
      resolve();
    });
  });
}

async function setDuplicateMenuState(isDuplicate: boolean) {
  if (lastDuplicateMenuState === isDuplicate) {
    return;
  }

  lastDuplicateMenuState = isDuplicate;

  const addTitle = isDuplicate ? `${DEFAULT_ADD_TITLE}${DUPLICATE_SUFFIX}` : DEFAULT_ADD_TITLE;
  const pausedTitle = isDuplicate ? `${DEFAULT_PAUSED_TITLE}${DUPLICATE_SUFFIX}` : DEFAULT_PAUSED_TITLE;

  await Promise.all([
    updateContextMenuTitle('delugelink-add', addTitle),
    updateContextMenuTitle('delugelink-paused', pausedTitle)
  ]);

  contextMenusApi.refresh?.();
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.linkUrl) return;

  const url = info.linkUrl;
  
  // Only handle magnet links and torrent files
  if (!url.startsWith('magnet:') && !url.includes('.torrent')) {
    console.log('[DelugeLink] Ignoring non-torrent URL:', url);
    showNotification(
      '❌ Invalid Link',
      'Only magnet links and .torrent files are supported',
      'error',
      tab?.id
    );
    return;
  }

  const paused = info.menuItemId === 'delugelink-paused';
  let label: string | undefined;

  if (typeof info.menuItemId === 'string' && info.menuItemId.startsWith('label-')) {
    label = info.menuItemId.replace('label-', '');
  }

  console.log('[DelugeLink] Context menu clicked:', { url, paused, label });
  await addTorrent(url, { label, paused }, tab?.id);
});

contextMenusApi.onShown?.addListener((info: any) => {
  (async () => {
    const url = info.linkUrl;
    let isDuplicate = false;

    if (url && (url.startsWith('magnet:') || url.includes('.torrent'))) {
      await refreshTorrentCache();
      isDuplicate = isDuplicateTorrent(extractTorrentKey(url));
    }

    await setDuplicateMenuState(isDuplicate);
  })().catch((error) => {
    console.error('[DelugeLink] Failed to update context menu titles:', error);
  });
});

async function getConfig(): Promise<DelugeConfig | null> {
  const result = await chrome.storage.local.get(['host', 'password', 'webRoot']);
  
  if (!result.host || !result.password) {
    return null;
  }

  return {
    host: result.host,
    password: result.password,
    webRoot: result.webRoot || ''
  };
}

async function downloadTorrentFile(url: string): Promise<{ data: string; filename: string }> {
  const response = await fetch(url, {
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Failed to download torrent: ${response.statusText}`);
  }

  const blob = await response.blob();
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const filename = url.split('/').pop()?.split('?')[0] || 'downloaded.torrent';
        resolve({
          data: reader.result,
          filename
        });
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(blob);
  });
}

async function addTorrent(url: string, options: { label?: string; paused?: boolean }, tabId?: number) {
  try {
    console.log('[DelugeLink] addTorrent called with:', { url, options, tabId });
    
    const config = await getConfig();
    
    if (!config) {
      console.log('[DelugeLink] No config found');
      showNotification('⚠️ Setup Required', 'Please configure DelugeLink in settings', 'warning', tabId);
      chrome.runtime.openOptionsPage();
      return;
    }

    if (!client) {
      console.log('[DelugeLink] Creating new DelugeClient');
      client = new DelugeClient(config);
    }

    let result;

    if (url.startsWith('magnet:')) {
      console.log('[DelugeLink] Adding magnet link');
      result = await client.addMagnet(url, options);
    } else {
      // Download .torrent file (for private trackers)
      console.log('[DelugeLink] Downloading torrent file');
      const { data, filename } = await downloadTorrentFile(url);
      result = await client.addTorrentFile(data, filename, options);
    }

    console.log('[DelugeLink] Result:', result);

    if (result.success) {
      console.log('[DelugeLink] Success, showing success notification');

      if (result.hash) {
        torrentCache.hashes.add(result.hash.toLowerCase());
      }

      const key = extractTorrentKey(url);
      const normalizedName = normalizeName(key?.name || null);
      if (normalizedName) {
        torrentCache.names.add(normalizedName);
      }

      torrentCache.lastUpdated = Date.now();

      showNotification(
        '✅ Torrent Added',
        result.message,
        'success',
        tabId
      );
    } else {
      console.log('[DelugeLink] Failure, showing warning notification');
      showNotification(
        '⚠️ Warning',
        result.message,
        'warning',
        tabId
      );
    }
  } catch (error) {
    console.error('[DelugeLink] Error in addTorrent:', error);
    showNotification(
      '❌ Error',
      error instanceof Error ? error.message : 'Failed to add torrent',
      'error',
      tabId
    );
  }
}

function showNotification(title: string, message: string, type: 'success' | 'warning' | 'error', tabId?: number) {
  if (tabId) {
    chrome.tabs.sendMessage(tabId, {
      type: 'SHOW_TOAST',
      data: { title, message, type }
    }).catch(() => {
      // Fallback to chrome notification if content script not available
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title,
        message
      });
    });
  } else {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title,
      message
    });
  }
}

// Handle messages from popup/content
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ADD_TORRENT') {
    addTorrent(request.url, request.options, sender.tab?.id).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.type === 'GET_STATS') {
    (async () => {
      const config = await getConfig();
      if (!config) {
        sendResponse({ error: 'Not configured' });
        return;
      }

      if (!client) {
        client = new DelugeClient(config);
      }

      try {
        const stats = await client.getStats();
        sendResponse({ stats });
      } catch (error) {
        sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    })();
    return true;
  }

  if (request.type === 'PAUSE_ALL' || request.type === 'RESUME_ALL') {
    (async () => {
      const config = await getConfig();
      if (!config || !client) {
        sendResponse({ error: 'Not configured' });
        return;
      }

      try {
        if (request.type === 'PAUSE_ALL') {
          await client.pauseAll();
        } else {
          await client.resumeAll();
        }
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    })();
    return true;
  }

  if (request.type === 'REFRESH_LABELS') {
    refreshLabels().then(() => sendResponse({ success: true }));
    return true;
  }

  if (request.type === 'CHECK_DUPLICATE') {
    (async () => {
      try {
        const url: string | undefined = request.url;
        let isDuplicate = false;

        if (url && (url.startsWith('magnet:') || url.includes('.torrent'))) {
          await refreshTorrentCache();
          isDuplicate = isDuplicateTorrent(extractTorrentKey(url));
        }

        await setDuplicateMenuState(isDuplicate);
        sendResponse({ duplicate: isDuplicate });
      } catch (error) {
        console.error('[DelugeLink] Failed duplicate check:', error);
        await setDuplicateMenuState(false);
        sendResponse({ duplicate: false, error: error instanceof Error ? error.message : String(error) });
      }
    })();
    return true;
  }
});

// Refresh labels periodically
setInterval(refreshLabels, 5 * 60 * 1000); // Every 5 minutes
setInterval(() => refreshTorrentCache(true), 60 * 1000);
