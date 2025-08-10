// Popup script for LinkedIn Visibility Status extension
document.addEventListener('DOMContentLoaded', function() {
  const statusIcon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');
  const statusDescription = document.getElementById('statusDescription');
  const refreshBtn = document.getElementById('refreshBtn');
  const settingsBtn = document.getElementById('settingsBtn');

  // Load current status on popup open
  loadVisibilityStatus();

  // Add event listeners
  refreshBtn.addEventListener('click', loadVisibilityStatus);
  settingsBtn.addEventListener('click', openLinkedInSettings);

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
});