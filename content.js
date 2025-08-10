// Content script to inject LinkedIn visibility status overlay
class LinkedInVisibilityOverlay {
  constructor() {
    this.overlay = null;
    this.statusIcon = null;
    this.allIconsContainer = null;
    this.tooltip = null;
    this.currentStatus = 'Loading...';
    this.settings = null;
    this.init();
  }

  init() {
    // Load settings first
    chrome.runtime.sendMessage({action: 'getSettings'}, (response) => {
      this.settings = response.settings;
      
      // Wait for page to load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.createOverlay());
      } else {
        this.createOverlay();
      }
    });
  }

  createOverlay() {
    // Create overlay container
    this.overlay = document.createElement('div');
    this.overlay.id = 'linkedin-visibility-overlay';
    
    // Create tooltip (shared between modes)
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tooltip';
    this.tooltip.textContent = this.currentStatus;

    if (this.settings && this.settings.showAllIcons) {
      this.createMultiIconOverlay();
    } else {
      this.createSingleIconOverlay();
    }

    // Inject into page
    document.body.appendChild(this.overlay);

    // Fetch current status
    this.fetchVisibilityStatus();
  }

  createSingleIconOverlay() {
    this.overlay.className = 'linkedin-visibility-overlay single-icon';

    // Create status icon
    this.statusIcon = document.createElement('div');
    this.statusIcon.className = 'status-icon';
    this.statusIcon.innerHTML = '👁️';

    // Add event listeners
    this.statusIcon.addEventListener('mouseenter', () => this.showTooltip());
    this.statusIcon.addEventListener('mouseleave', () => this.hideTooltip());
    this.statusIcon.addEventListener('click', () => this.toggleStatus());

    // Assemble overlay
    this.overlay.appendChild(this.statusIcon);
    this.overlay.appendChild(this.tooltip);
  }

  createMultiIconOverlay() {
    this.overlay.className = 'linkedin-visibility-overlay multi-icon';

    // Create container for all icons
    this.allIconsContainer = document.createElement('div');
    this.allIconsContainer.className = 'all-icons-container';

    // Create all three status icons
    const statusOptions = [
      { name: 'Your name and headline', icon: '👁️', color: '#0a66c2', value: 'public' },
      { name: 'Private profile characteristics', icon: '👤', color: '#f5a623', value: 'semi-private' },
      { name: 'Private mode', icon: '🔒', color: '#666', value: 'private' }
    ];

    statusOptions.forEach(status => {
      const iconElement = document.createElement('div');
      iconElement.className = `status-icon-option ${status.value}`;
      iconElement.innerHTML = status.icon;
      iconElement.style.color = status.color;
      iconElement.dataset.status = status.name;

      // Add event listeners for each icon
      iconElement.addEventListener('mouseenter', () => this.showTooltip(status.name));
      iconElement.addEventListener('mouseleave', () => this.hideTooltip());
      iconElement.addEventListener('click', () => this.setSpecificStatus(status.name));

      this.allIconsContainer.appendChild(iconElement);
    });

    // Assemble overlay
    this.overlay.appendChild(this.allIconsContainer);
    this.overlay.appendChild(this.tooltip);
  }

  showTooltip(customText = null) {
    if (customText) {
      this.tooltip.textContent = customText;
    }
    this.tooltip.style.opacity = '1';
    this.tooltip.style.visibility = 'visible';
  }

  hideTooltip() {
    this.tooltip.style.opacity = '0';
    this.tooltip.style.visibility = 'hidden';
    // Restore original tooltip text
    this.tooltip.textContent = this.currentStatus;
  }

  async fetchVisibilityStatus() {
    try {
      // Send message to background script to fetch status
      chrome.runtime.sendMessage({action: 'fetchVisibilityStatus'}, (response) => {
        if (response && response.status) {
          this.updateStatus(response.status);
        } else {
          this.updateStatus('Unable to fetch status');
        }
      });
    } catch (error) {
      console.error('Error fetching visibility status:', error);
      this.updateStatus('Error loading status');
    }
  }

  updateStatus(status) {
    this.currentStatus = status;
    this.tooltip.textContent = status;

    if (this.settings && this.settings.showAllIcons) {
      // Multi-icon mode: highlight the active option
      this.updateMultiIconStatus(status);
    } else {
      // Single icon mode: update the single icon
      this.updateSingleIconStatus(status);
    }
  }

  updateSingleIconStatus(status) {
    if (!this.statusIcon) return;
    
    // Update icon based on status
    if (status.includes('Your name and headline')) {
      this.statusIcon.innerHTML = '👁️';
      this.statusIcon.style.color = '#0a66c2';
      this.overlay.className = 'linkedin-visibility-overlay single-icon public';
    } else if (status.includes('Private profile characteristics')) {
      this.statusIcon.innerHTML = '👤';
      this.statusIcon.style.color = '#f5a623';
      this.overlay.className = 'linkedin-visibility-overlay single-icon semi-private';
    } else if (status.includes('Private mode')) {
      this.statusIcon.innerHTML = '🔒';
      this.statusIcon.style.color = '#666';
      this.overlay.className = 'linkedin-visibility-overlay single-icon private';
    } else {
      this.statusIcon.innerHTML = '❓';
      this.statusIcon.style.color = '#999';
      this.overlay.className = 'linkedin-visibility-overlay single-icon error';
    }
  }

  updateMultiIconStatus(status) {
    if (!this.allIconsContainer) return;

    // Remove active class from all icons
    const icons = this.allIconsContainer.querySelectorAll('.status-icon-option');
    icons.forEach(icon => icon.classList.remove('active'));

    // Add active class to current status
    let activeClass = '';
    if (status.includes('Your name and headline')) {
      activeClass = 'public';
      this.overlay.className = 'linkedin-visibility-overlay multi-icon public';
    } else if (status.includes('Private profile characteristics')) {
      activeClass = 'semi-private';
      this.overlay.className = 'linkedin-visibility-overlay multi-icon semi-private';
    } else if (status.includes('Private mode')) {
      activeClass = 'private';
      this.overlay.className = 'linkedin-visibility-overlay multi-icon private';
    }

    if (activeClass) {
      const activeIcon = this.allIconsContainer.querySelector(`.${activeClass}`);
      if (activeIcon) {
        activeIcon.classList.add('active');
      }
    }
  }

  async toggleStatus() {
    if (!this.statusIcon) return; // Single icon mode only
    
    // Show loading state
    const originalIcon = this.statusIcon.innerHTML;
    const originalTooltip = this.tooltip.textContent;
    
    this.statusIcon.innerHTML = '⏳';
    this.tooltip.textContent = 'Switching...';
    this.showTooltip();

    try {
      // Send toggle request to background script
      chrome.runtime.sendMessage({
        action: 'toggleVisibilityStatus',
        currentStatus: this.currentStatus
      }, (response) => {
        if (response && response.success) {
          // Update to new status
          this.updateStatus(response.newStatus);
          
          // Show success message briefly
          this.tooltip.textContent = response.message;
          setTimeout(() => {
            this.tooltip.textContent = response.newStatus;
          }, 2000);
        } else {
          // Restore original state on error
          this.statusIcon.innerHTML = originalIcon;
          this.tooltip.textContent = `Error: ${response?.error || 'Failed to toggle'}`;
          
          // Restore original tooltip after showing error
          setTimeout(() => {
            this.tooltip.textContent = originalTooltip;
          }, 3000);
        }
      });
    } catch (error) {
      console.error('Error toggling status:', error);
      this.statusIcon.innerHTML = originalIcon;
      this.tooltip.textContent = 'Toggle failed';
      
      setTimeout(() => {
        this.tooltip.textContent = originalTooltip;
      }, 3000);
    }
  }

  async setSpecificStatus(targetStatus) {
    // Check if already active
    if (this.currentStatus === targetStatus) {
      this.tooltip.textContent = 'Already active';
      this.showTooltip();
      setTimeout(() => {
        this.hideTooltip();
      }, 1500);
      return;
    }

    // Show loading state
    const originalTooltip = this.tooltip.textContent;
    
    // Find the clicked icon and show loading
    const targetIcon = this.allIconsContainer?.querySelector(`[data-status="${targetStatus}"]`);
    if (targetIcon) {
      const originalIconHtml = targetIcon.innerHTML;
      targetIcon.innerHTML = '⏳';
    }
    
    this.tooltip.textContent = 'Switching...';
    this.showTooltip();

    try {
      // Send set status request to background script
      chrome.runtime.sendMessage({
        action: 'setVisibilityStatus',
        targetStatus: targetStatus
      }, (response) => {
        // Restore icon
        if (targetIcon) {
          const statusOptions = {
            'Your name and headline': '👁️',
            'Private profile characteristics': '👤', 
            'Private mode': '🔒'
          };
          targetIcon.innerHTML = statusOptions[targetStatus] || '❓';
        }

        if (response && response.success) {
          // Update to new status
          this.updateStatus(response.newStatus);
          
          // Show success message briefly
          this.tooltip.textContent = response.message;
          setTimeout(() => {
            this.tooltip.textContent = response.newStatus;
          }, 2000);
        } else {
          // Show error
          this.tooltip.textContent = `Error: ${response?.error || 'Failed to set status'}`;
          
          // Restore original tooltip after showing error
          setTimeout(() => {
            this.tooltip.textContent = originalTooltip;
          }, 3000);
        }
      });
    } catch (error) {
      console.error('Error setting status:', error);
      this.tooltip.textContent = 'Set status failed';
      
      setTimeout(() => {
        this.tooltip.textContent = originalTooltip;
      }, 3000);
    }
  }
}

// Initialize overlay when script loads
new LinkedInVisibilityOverlay();