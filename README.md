# LinkedIn Visibility Status Extension

A Chrome browser extension that displays your LinkedIn profile visibility status as a small overlay on LinkedIn pages.

## Features

- **Visual Status Indicator**: Shows your current visibility setting with an intuitive icon
- **Three Status Types**:
  - 👁️ **Your name and headline** - Public visibility
  - 👤 **Private profile characteristics** - Semi-private visibility  
  - 🔒 **Private mode** - Anonymous browsing
- **Hover Tooltip**: Displays the full status text when hovering over the icon
- **Real-time Status**: Fetches current status from LinkedIn's preferences API
- **Extension Popup**: Click the extension icon for detailed information and quick access to settings

## Installation

### Option 1: Load as Unpacked Extension (Development)

1. **Download or Clone** this repository to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** by clicking the toggle in the top-right corner
4. **Click "Load unpacked"** and select the extension folder
5. **Create Icons** (optional): Open `icons/create-icons.html` in your browser and download the generated icon files to the `icons/` folder
6. **Refresh** the extensions page to ensure the extension loads properly

### Option 2: Chrome Web Store (Future)
*This extension is not yet available on the Chrome Web Store*

## How It Works

1. **Content Script**: Injects a floating overlay on LinkedIn pages
2. **Background Script**: Fetches your visibility status from `https://www.linkedin.com/mypreferences/d/profile-viewing-options`
3. **Status Parsing**: Analyzes the HTML response to determine your current setting
4. **Visual Display**: Updates the overlay icon and tooltip with your current status

## Files Structure

```
linkedin-visibility-status-extension/
├── manifest.json          # Extension configuration
├── content.js             # Content script for overlay injection
├── background.js           # Background script for API calls
├── overlay.css            # Styles for the overlay
├── popup.html             # Extension popup interface
├── popup.js               # Popup functionality
├── icons/                 # Extension icons
│   ├── create-icons.html  # Icon generator
│   ├── icon16.png         # 16x16 icon
│   ├── icon48.png         # 48x48 icon
│   └── icon128.png        # 128x128 icon
└── README.md              # This file
```

## Permissions

The extension requires the following permissions:
- `activeTab`: To access the current LinkedIn page
- `storage`: To cache status information
- `https://www.linkedin.com/*`: To fetch visibility preferences and inject overlay

## Privacy

- This extension only accesses LinkedIn pages you're already viewing
- No personal data is collected or transmitted to external servers
- Status information is fetched directly from LinkedIn's own API
- All processing happens locally in your browser

## Troubleshooting

### Extension Not Working
1. Make sure you're logged in to LinkedIn
2. Refresh the LinkedIn page after installing the extension
3. Check if the extension is enabled in `chrome://extensions/`

### Status Shows "Unable to fetch status"
1. Ensure you're logged in to LinkedIn
2. Try refreshing the page
3. Check if LinkedIn's page structure has changed (may require extension update)

### Overlay Not Appearing
1. Check browser console for JavaScript errors
2. Ensure content script is loading properly
3. Try disabling other extensions that might conflict

## Development

To modify or enhance the extension:

1. **Edit Files**: Make changes to the relevant files
2. **Reload Extension**: Go to `chrome://extensions/` and click the refresh icon
3. **Test Changes**: Navigate to LinkedIn and test functionality
4. **Debug**: Use Chrome DevTools to debug content and background scripts

## Known Limitations

- LinkedIn may change their HTML structure, requiring updates to the parsing logic
- Extension only works on linkedin.com domain
- Requires active LinkedIn session to fetch status

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve this extension.

## License

This project is open source. Use responsibly and in accordance with LinkedIn's Terms of Service.