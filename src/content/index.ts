// Simple notification system for content script
function getTorrentLinkFromTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;

  const anchor = target.closest('a[href]');
  if (!anchor) return null;

  const href = (anchor as HTMLAnchorElement).href;
  if (!href) return null;

  if (href.startsWith('magnet:')) {
    return href;
  }

  if (/\.torrent([?#].*)?$/i.test(href)) {
    return href;
  }

  return null;
}

function showNotification(title: string, message: string, type: string) {
  const container = document.getElementById('delugelink-notifications');
  if (!container) return;

  const notification = document.createElement('div');
  notification.className = `delugelink-notification delugelink-notification-${type}`;
  notification.setAttribute('role', 'status');
  notification.setAttribute('aria-live', 'polite');

  const titleEl = document.createElement('div');
  titleEl.className = 'delugelink-notification-title';
  titleEl.textContent = title;

  const messageEl = document.createElement('div');
  messageEl.className = 'delugelink-notification-message';
  messageEl.textContent = message;

  notification.appendChild(titleEl);
  if (message) {
    notification.appendChild(messageEl);
  }
  
  container.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('delugelink-notification-hide');
    setTimeout(() => notification.remove(), 220);
  }, 5200);
}

// Create notification container
const notifContainer = document.createElement('div');
notifContainer.id = 'delugelink-notifications';
notifContainer.style.cssText = `
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 99999;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-end;
  pointer-events: none;
`;
document.body.appendChild(notifContainer);

// Inject styles for notifications
const style = document.createElement('style');
style.textContent = `
  .delugelink-notification {
    padding: 16px 20px;
    min-width: 240px;
    border-radius: 16px;
    background: linear-gradient(155deg, rgba(22, 28, 42, 0.85), rgba(12, 16, 28, 0.75));
    color: #f8fafc;
    font-size: 14px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 15px 45px rgba(8, 12, 24, 0.45);
    backdrop-filter: blur(18px);
    animation: delugelink-toast-in 0.24s ease-out;
    pointer-events: all;
  }
  
  .delugelink-notification-success {
    border-color: rgba(16, 185, 129, 0.4);
    box-shadow: 0 18px 50px rgba(16, 185, 129, 0.25);
  }
  
  .delugelink-notification-warning {
    border-color: rgba(245, 158, 11, 0.35);
    color: #fff7ed;
    box-shadow: 0 18px 48px rgba(245, 158, 11, 0.25);
  }
  
  .delugelink-notification-error {
    border-color: rgba(239, 68, 68, 0.4);
    box-shadow: 0 18px 48px rgba(239, 68, 68, 0.28);
  }
  
  .delugelink-notification-title {
    font-weight: 600;
    letter-spacing: 0.03em;
    margin-bottom: 2px;
  }

  .delugelink-notification-message {
    font-size: 13px;
    color: rgba(226, 232, 240, 0.85);
    line-height: 1.4;
  }

  .delugelink-notification-hide {
    animation: delugelink-toast-out 0.18s ease-in forwards;
  }

  @keyframes delugelink-toast-in {
    from {
      transform: translateY(-8px) scale(0.96);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  @keyframes delugelink-toast-out {
    from {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
    to {
      transform: translateY(-6px) scale(0.95);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Listen for messages from background
chrome.runtime.onMessage.addListener((request) => {
  if (request.type === 'SHOW_TOAST') {
    const { title, message, type } = request.data;
    showNotification(title, message, type);
  }
});

// Track right-clicks to prime duplicate detection
document.addEventListener(
  'contextmenu',
  (event) => {
    const url = getTorrentLinkFromTarget(event.target);
    chrome.runtime.sendMessage({
      type: 'CHECK_DUPLICATE',
      url: url || undefined
    });
  },
  true
);

// Intercept magnet links
document.addEventListener('click', (e) => {
  const linkUrl = getTorrentLinkFromTarget(e.target);

  if (linkUrl && linkUrl.startsWith('magnet:') && !e.altKey && !e.metaKey) {
    e.preventDefault();
    e.stopPropagation();
    
    chrome.runtime.sendMessage({
      type: 'ADD_TORRENT',
      url: linkUrl,
      options: {}
    });
  }
}, true);
