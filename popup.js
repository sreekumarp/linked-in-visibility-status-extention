// Popup script for LinkedIn Visibility Status extension
document.addEventListener('DOMContentLoaded', function() {
  const statusIcon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');
  const statusDescription = document.getElementById('statusDescription');
  const refreshBtn = document.getElementById('refreshBtn');
  const optionsBtn = document.getElementById('optionsBtn');
  
  // Settings elements
  const statusContainer = document.getElementById('statusContainer');
  const settingsContainer = document.getElementById('settingsContainer');
  const statusActions = document.getElementById('statusActions');
  const settingsActions = document.getElementById('settingsActions');
  const backToStatus = document.getElementById('backToStatus');
  const toggleModeOption = document.getElementById('toggleModeOption');
  const allIconsOption = document.getElementById('allIconsOption');
  const toggleModeRadio = document.getElementById('toggleMode');
  const allIconsRadio = document.getElementById('allIconsMode');
  const applySettingsBtn = document.getElementById('applySettingsBtn');
  const linkedinSettingsBtn = document.getElementById('linkedinSettingsBtn');

  // Load current status and settings on popup open
  loadVisibilityStatus();
  loadSettings();

  // Add event listeners
  refreshBtn.addEventListener('click', loadVisibilityStatus);
  optionsBtn.addEventListener('click', showSettings);
  backToStatus.addEventListener('click', showStatus);
  applySettingsBtn.addEventListener('click', showStatus);
  linkedinSettingsBtn.addEventListener('click', openLinkedInSettings);
  
  // Settings event listeners
  toggleModeOption.addEventListener('click', () => {
    toggleModeRadio.checked = true;
    saveSettings();
  });
  
  allIconsOption.addEventListener('click', () => {
    allIconsRadio.checked = true;  
    saveSettings();
  });

  toggleModeRadio.addEventListener('change', saveSettings);
  allIconsRadio.addEventListener('change', saveSettings);

  function loadVisibilityStatus() {
    setLoadingState();
    
    // Send message to background script to fetch status
    chrome.runtime.sendMessage({action: 'fetchVisibilityStatus'}, (response) => {
      if (chrome.runtime.lastError) {
        showError('Extension error: ' + chrome.runtime.lastError.message);
        return;
      }
      
      if (response && response.status) {
        updateStatusDisplay(response.status);
      } else {
        showError('Unable to fetch status');
      }
    });
  }

  function setLoadingState() {
    statusIcon.textContent = '⏳';
    statusText.textContent = 'Loading...';
    statusDescription.textContent = 'Checking your current profile visibility setting...';
    statusIcon.style.color = '#666';
  }

  function updateStatusDisplay(status) {
    statusText.textContent = status;
    
    // Update icon and description based on status
    if (status.includes('Your name and headline')) {
      statusIcon.textContent = '👁️';
      statusIcon.style.color = '#0a66c2';
      statusDescription.textContent = 'Your name and professional headline are visible when you view other profiles.';
    } else if (status.includes('Private profile characteristics')) {
      statusIcon.textContent = '👤';
      statusIcon.style.color = '#f5a623';
      statusDescription.textContent = 'Some profile information is shown, but your name remains private.';
    } else if (status.includes('Private mode')) {
      statusIcon.textContent = '🔒';
      statusIcon.style.color = '#666';
      statusDescription.textContent = 'You browse completely anonymously. Others cannot see who viewed their profile.';
    } else if (status.includes('Unable') || status.includes('Error')) {
      statusIcon.textContent = '❌';
      statusIcon.style.color = '#cc1016';
      statusDescription.textContent = 'Could not determine your current visibility setting. Make sure you\'re logged in to LinkedIn.';
    } else {
      statusIcon.textContent = '❓';
      statusIcon.style.color = '#999';
      statusDescription.textContent = 'Unknown status detected.';
    }
  }

  function showError(message) {
    statusIcon.textContent = '❌';
    statusIcon.style.color = '#cc1016';
    statusText.textContent = 'Error';
    statusDescription.textContent = message;
    statusDescription.style.color = '#cc1016';
  }

  function openLinkedInSettings() {
    chrome.tabs.create({
      url: 'https://www.linkedin.com/mypreferences/d/profile-viewing-options'
    });
    window.close();
  }

  function showSettings() {
    statusContainer.style.display = 'none';
    settingsContainer.classList.add('visible');
    statusActions.style.display = 'none';
    settingsActions.style.display = 'flex';
  }

  function showStatus() {
    statusContainer.style.display = 'block';
    settingsContainer.classList.remove('visible');
    statusActions.style.display = 'flex';
    settingsActions.style.display = 'none';
  }

  function loadSettings() {
    chrome.runtime.sendMessage({action: 'getSettings'}, (response) => {
      if (response && response.settings) {
        const settings = response.settings;
        
        if (settings.showAllIcons) {
          allIconsRadio.checked = true;
        } else {
          toggleModeRadio.checked = true;
        }
      }
    });
  }

  function saveSettings() {
    const settings = {
      showAllIcons: allIconsRadio.checked,
      iconMode: allIconsRadio.checked ? 'all' : 'toggle'
    };

    chrome.runtime.sendMessage({
      action: 'saveSettings',
      settings: settings
    }, (response) => {
      if (response && response.success) {
        // Settings saved successfully
        // Notify content scripts to reload with new settings
        chrome.tabs.query({url: 'https://www.linkedin.com/*'}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.reload(tab.id);
          });
        });
      }
    });
  }
});