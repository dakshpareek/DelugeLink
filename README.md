# DelugeLink

**The gold standard Chrome extension for managing Deluge torrents directly from your browser.**

Right-click any magnet link or `.torrent` file and send it straight to your Deluge server. No copy-paste. No tab switching. No friction.

---

## Features

- **Context Menu Integration**: Right-click magnet links and `.torrent` files to add to Deluge instantly
- **Label Support**: Organize torrents directly from the context menu
- **Add Paused Option**: Start torrents paused straight from the context menu
- **Real-Time Dashboard**: Popup shows download/upload speeds and active torrent count
- **Private Tracker Support**: Downloads and handles `.torrent` files (works with password-protected sites)
- **Deluge v1 & v2 Support**: Automatic version detection and compatibility
- **Session Management**: Auto-handles expired sessions—just works
- **Quick Settings**: Configure host, password, and reverse proxy path in one place
- **Duplicate Awareness**: Context menu labels show `[Already There]` when a torrent already exists in Deluge
- **Built-in Feedback**: Popup and options page link directly to GitHub for issue reporting

---

## 🛠 Tech Stack

| Component | Technology |
|-----------|------------|
| UI Framework | React 18 + TypeScript |
| Styling | Tailwind CSS |
| Build Tool | Vite |
| Extension API | Chrome Manifest V3 |
| Icons | Lucide React |

---

## Quick Start for Users

### Install

**Option 1: Load Unpacked (Development/Testing)**
1. Clone the repo and run `npm install && npm run build`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the `dist/` folder

**Option 2: Chrome Web Store**
Coming soon.

### Configure
1. Click the DelugeLink extension icon
2. Go to **Settings** (⚙️)
3. Enter your **Deluge host URL** and **password**
4. (Optional) Click **Test Connection** to verify Deluge responds
5. Done. Right-click any magnet link or `.torrent` file

### Example Usage
- Right-click `magnet:?xt=urn:btih:...` → "⚡ Add to Deluge"
- Right-click a `.torrent` download → "⚡ Add to Deluge"
- Choose "⏸️ Add Paused" to start it paused
- If the torrent already exists, the menu reads `⚡ Add to Deluge [Already There]`
- Choose "📂 Add to Label..." → pick a label from your server

> [!TIP]
> Hold **Alt/Option** while clicking a magnet link to bypass the extension and use your default torrent handler.

---

## 🚀 Quick Start for Developers

### Prerequisites
- Node.js 18+
- Chrome/Chromium browser

### Setup
```bash
git clone https://github.com/dakshpareek/DelugeLink
cd delugelink
npm install
```

### Local Development
```bash
npm run dev
```

Then in Chrome:
1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `dist/` directory

The extension reloads automatically as you edit.

### Build for Production
```bash
npm run build
```

The `dist/` folder is ready to load as an unpacked extension or submit to the Chrome Web Store.

---

## 🏗 How It Works

```
User Right-Clicks Link
        ↓
Service Worker (background/index.ts)
├─ Validates magnet/torrent URL
├─ Loads config from storage
├─ Initializes DelugeClient
└─ Handles add/pause/label logic
        ↓
DelugeClient (lib/deluge-client.ts)
├─ Manages session (_session_id cookie)
├─ Auto-detects Deluge v1 or v2
├─ Makes JSON-RPC requests to /json endpoint
└─ Re-authenticates if session expires
        ↓
Deluge Server
        ↓
Success/Error Notification
├─ Via content script (in-page toast) if possible
└─ Falls back to Chrome notification
```

### Architecture Decisions

**Why a Service Worker (not a background page)?**
Service Workers are the Manifest V3 standard. They're lighter-weight, auto-suspend when idle, and handle message passing cleanly.

**Why separate DelugeClient?**
Encapsulates all Deluge API logic. Easy to test, reuse in other tools, and swap implementations.

**Why guard against concurrent menu updates?**
Rapid successive menu creation causes "duplicate ID" errors. Flags (`setupInProgress`, `labelMenuInProgress`) prevent race conditions.

---

## ⚙️ Configuration

Access settings by clicking the extension icon → **Settings** (⚙️) or via the extension options page.

| Setting | Required | Example | Notes |
|---------|----------|---------|-------|
| **Host URL** | ✅ Yes | `http://localhost:8112` | Full URL including protocol (`http://` or `https://`) |
| **Password** | ✅ Yes | `your-deluge-password` | Your Deluge web interface password |
| **Web Root** | ❌ No | `/deluge` | Only needed if Deluge is behind a reverse proxy at a subpath |

### Example Configurations

**Local Deluge (no reverse proxy):**
```
Host: http://localhost:8112
Password: mypassword
Web Root: (leave blank)
```

**Reverse proxy with subpath:**
```
Host: https://media.example.com
Password: mypassword
Web Root: /deluge
```

The extension will connect to: `https://media.example.com/deluge/json`

> [!NOTE]
> Your password is stored locally in Chrome's `chrome.storage.local`. It is **never** sent anywhere except your Deluge server.

---

## 💬 Feedback & Support

- Use the **Report Issue** link in the popup or options page for a quick jump to GitHub.
- Prefer a direct link? [Open a new GitHub issue](https://github.com/dakshpareek/DelugeLink/issues/new).
- DelugeLink collects zero telemetry; configuration and activity stay on your machine.

---

## 🐛 Troubleshooting

### "Connection Error" in popup
**Cause:** Deluge is unreachable or not configured.

**Fix:**
1. Go to Settings (⚙️)
2. Test your **Host URL** in your browser directly (you should see the Deluge web interface)
3. Verify your **password** is correct
4. If using HTTPS, ensure your certificate is valid

### "Torrent already in session"
**Cause:** You've already added this exact torrent.

**Expected behavior:** The extension shows a warning but doesn't error out. You can safely ignore it.

### Context menu doesn't appear
**Cause:** Extension not properly loaded or permissions missing.

**Fix:**
1. Reload the extension: `chrome://extensions` → Find DelugeLink → Click reload
2. Hard refresh the page (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows/Linux)

### Labels aren't showing up
**Cause:** Labels haven't synced yet.

**Fix:**
1. Go to Settings and save (triggers a label refresh)
2. Wait 5-10 seconds for the background sync
3. Reload the extension

> [!WARNING]
> If you delete labels in Deluge, they won't disappear from the context menu until the extension refreshes (every 5 minutes or on restart).

### CORS errors or "Failed to download torrent"
**Cause:** Downloading `.torrent` files from private trackers fails due to CORS or auth requirements.

**Note:** DelugeLink handles this by downloading through your browser's context (which has your cookies). If it still fails, the tracker may be blocking extension requests.

---

## 🤝 Contributing

### Code Style
- **TypeScript**: Strict mode enabled. Use explicit types.
- **Error Handling**: Always catch and log errors. User-facing errors should be friendly (not stack traces).
- **Logging**: Use `console.log('[DelugeLink]...')` for debugging. Remove before shipping.
- **Async/Await**: Prefer async/await over `.then()` chains.

### Adding a New Feature

**Example: Add a "Remove Torrent" context menu**

1. **Update `src/background/index.ts`:**
   ```typescript
   // In setupContextMenus()
   await createMenu({
     id: 'delugelink-remove',
     title: '🗑️ Remove Torrent',
     contexts: ['link']
   });

   // In onClicked listener
   if (info.menuItemId === 'delugelink-remove') {
     // Call a new client method
     await client.removeTorrent(torrentHash);
   }
   ```

2. **Update `src/lib/deluge-client.ts`:**
   ```typescript
   async removeTorrent(hash: string): Promise<void> {
     await this.ensureConnected();
     await this.makeRequest('core.remove_torrent', [hash, true]); // true = remove data
   }
   ```

3. **Test locally** (`npm run dev`)
4. **Submit a PR** with a clear description of the change

### Testing Locally
1. Load the unpacked extension in `chrome://extensions`
2. Open the extension popup and verify basic functionality
3. Right-click a magnet link and verify menus appear
4. Check the background service worker console for errors:
   - Open `chrome://extensions` → **DelugeLink** → **Inspect views: service worker**

---

## 📦 Building & Distribution

### Development Build
```bash
npm run dev
```
Watches for changes and rebuilds automatically. Load the unpacked extension to see live changes.

### Production Build
```bash
npm run build
```

Output in `dist/`:
- `background.js` - Service worker
- `content.js` - Content script
- `popup.html` + `popup.js` - Popup UI
- `options.html` + `options.js` - Settings page
- `manifest.json` - Extension metadata
- `icons/` - Extension icons

### Chrome Web Store Submission
1. Zip the `dist/` folder
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Upload the zip file, fill in store listing, and publish

> [!TIP]
> Keep a clean `dist/` folder. Delete it before each build to avoid stale files: `rm -rf dist && npm run build`

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.

---

## 🔗 Links

- **Report a Bug**: [GitHub Issues](https://github.com/dakshpareek/DelugeLink/issues)
- **Request a Feature**: [GitHub Discussions](https://github.com/dakshpareek/DelugeLink/discussions)
- **Deluge Documentation**: [deluge-torrent.org](https://deluge-torrent.org/)

---

## 💡 Why DelugeLink?

Deluge is a powerful torrent client, but its web interface buries torrent addition behind menus and page loads. **DelugeLink puts torrents one click away.** No context switching. No copy-paste. Just right-click and go.

Built for users who value speed and simplicity.
