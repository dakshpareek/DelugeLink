// Simple notification system for content script
function showNotification(title: string, message: string, type: string) {
  const container = document.getElementById('delugelink-notifications');
  if (!container) return;

  const notification = document.createElement('div');
  notification.className = `delugelink-notification delugelink-notification-${type}`;
  notification.textContent = `${title}: ${message}`;
  
  container.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Create notification container
const notifContainer = document.createElement('div');
notifContainer.id = 'delugelink-notifications';
notifContainer.style.cssText = `
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 99999;
  font-family: system-ui, -apple-system, sans-serif;
`;
document.body.appendChild(notifContainer);

// Inject styles for notifications
const style = document.createElement('style');
style.textContent = `
  .delugelink-notification {
    padding: 12px 16px;
    margin-bottom: 8px;
    border-radius: 6px;
    background: #1a1a1a;
    color: white;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease-out;
  }
  
  .delugelink-notification-success {
    background: #10b981;
  }
  
  .delugelink-notification-warning {
    background: #f59e0b;
    color: black;
  }
  
  .delugelink-notification-error {
    background: #ef4444;
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
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

// Intercept magnet links
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const link = target.closest('a[href^="magnet:"]') as HTMLAnchorElement;
  
  if (link && !e.altKey && !e.metaKey) {
    e.preventDefault();
    e.stopPropagation();
    
    chrome.runtime.sendMessage({
      type: 'ADD_TORRENT',
      url: link.href,
      options: {}
    });
  }
}, true);
