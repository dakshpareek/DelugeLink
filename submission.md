# Chrome Web Store Submission Checklist – DelugeLink

## I. Basic Listing Information

- **Name**: DelugeLink
- **Short Description**: The definitive Deluge WebUI browser extension. 5-Star reliability guaranteed with Dual-API support, robust authentication, and seamless private tracker integration.
- **Full Description (HTML ready)**:
  ```
  <h2>Accelerate Your Deluge Workflow</h2>
  <p>DelugeLink is the gold-standard Chrome extension for self-hosters, seedbox owners, and Deluge power users. Add torrents directly from any page, monitor live stats, and control Deluge without juggling tabs or copy-pasting magnet links.</p>

  <h3>Why DelugeLink?</h3>
  <ul>
    <li><strong>Instant Add:</strong> Right-click any magnet or <code>.torrent</code> file to send it to Deluge immediately.</li>
    <li><strong>Duplicate Awareness:</strong> Smart menus show <em>[Already There]</em> when the torrent exists, saving guesswork.</li>
    <li><strong>Label & Paused Support:</strong> Assign labels or add paused straight from the context menu.</li>
    <li><strong>Real-Time Dashboard:</strong> Check download/upload speeds and active torrents from a glassmorphism-inspired popup.</li>
    <li><strong>Private Tracker Friendly:</strong> Blob downloads respect your session cookies for authenticated trackers.</li>
    <li><strong>Deluge v1 &amp; v2:</strong> Automatically detects and connects to both API versions.</li>
    <li><strong>Reliable Auth:</strong> Session handling keeps you logged in, and the options page offers one-click “Test Connection”.</li>
  </ul>

  <h3>Key Features</h3>
  <ul>
    <li>Context menu actions: Add, Add Paused, Add to Label…</li>
    <li>Popup dashboard with live speeds and active torrent count</li>
    <li>Inline toasts for success/error feedback (with Chrome notification fallback)</li>
    <li>Settings page for host, password, and optional reverse proxy path</li>
    <li>One-click GitHub issue reporting from popup/options</li>
  </ul>

  <h3>Ideal For</h3>
  <p>Home lab enthusiasts, seedbox users, and anyone running Deluge WebUI who wants a frictionless browser companion.</p>

  <p><strong>Install now</strong> and level up your Deluge experience.</p>
  ```
- **Category**: Productivity
- **Primary Language**: English (United States)

## II. Visual Assets

- **Icons**:
  - 128×128: `icons/icon128.png`
  - 48×48: `icons/icon48.png`
  - 16×16: `icons/icon16.png`
- **Screenshots** (prepare at 1280×800):
  1. Popup dashboard showing live stats, duplicate indicator, and feedback link.
  2. Options/settings page with Test Connection and GitHub link.
  3. (Optional) In-page toast notification confirming torrent addition.
- **Promotional Tile (optional)**: 440×280 graphic highlighting “DelugeLink – Add torrents instantly from your browser”.

## III. Developer & Privacy Information

- **Developer Email**: `<your-support-email@example.com>`
- **Website / Support URL**: `https://github.com/dakshpareek/DelugeLink`
- **Privacy Policy URL**: `https://github.com/dakshpareek/DelugeLink/blob/main/PRIVACY.md`
  - *Action*: create `PRIVACY.md` outlining local storage of credentials, no telemetry, and data flow only between user and their Deluge server.

## IV. Permissions & Technical Details

- **Declared Permissions** (from `manifest.json`):
  - `contextMenus`
  - `notifications`
  - `activeTab`
  - `storage`
  - `host_permissions`: `<all_urls>` (needed to send magnet/HTTP requests to Deluge and download torrent files)
- **Justification**:
  - `contextMenus`: Provide right-click “Add to Deluge” actions.
  - `notifications`: Fallback notifications if in-page toast fails.
  - `activeTab`: Required for messaging between popup/content scripts and current tab.
  - `storage`: Save Deluge host/password/config locally.
  - `host_permissions`: Allow fetching `.torrent` files and posting to the Deluge WebUI regardless of domain.
- **Initial Release Notes**: “Initial release featuring context menu integration, label/paused support, duplicate detection, live popup stats, and Test Connection settings.”

## V. Monetization

- Pricing: Free
- In-App Purchases: None

## VI. Additional Tasks Before Submission

- [ ] Capture/store screenshots and promotional image.
- [ ] Publish repository with README, LICENSE, and PRIVACY.md.
- [ ] Verify manifest/version numbers match release.
- [ ] Update developer email in Manifest/Store listing.
- [ ] Run `npm run build` and load `dist/` to double-check extension before packaging.

---

*Use this file to copy-paste answers directly into the Chrome Web Store dashboard during submission.*
