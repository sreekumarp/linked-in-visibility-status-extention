// Content script to inject LinkedIn visibility status overlay
class LinkedInVisibilityOverlay {
  constructor() {
    this.overlay = null;
    this.statusIcon = null;
    this.tooltip = null;
    this.currentStatus = 'Loading...';
    this.init();
  }

  init() {
    // Wait for page to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.createOverlay());
    } else {
      this.createOverlay();
    }
  }

  createOverlay() {
    // Create overlay container
    this.overlay = document.createElement('div');
    this.overlay.id = 'linkedin-visibility-overlay';
    this.overlay.className = 'linkedin-visibility-overlay';

    // Create status icon
    this.statusIcon = document.createElement('div');
    this.statusIcon.className = 'status-icon';
    this.statusIcon.innerHTML = '👁️';

    // Create tooltip
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tooltip';
    this.tooltip.textContent = this.currentStatus;

    // Assemble overlay
    this.overlay.appendChild(this.statusIcon);
    this.overlay.appendChild(this.tooltip);

    // Add event listeners
    this.statusIcon.addEventListener('mouseenter', () => this.showTooltip());
    this.statusIcon.addEventListener('mouseleave', () => this.hideTooltip());
    this.statusIcon.addEventListener('click', () => this.toggleStatus());

    // Inject into page
    document.body.appendChild(this.overlay);

    // Fetch current status
    this.fetchVisibilityStatus();
  }

  showTooltip() {
    this.tooltip.style.opacity = '1';
    this.tooltip.style.visibility = 'visible';
  }

  hideTooltip() {
    this.tooltip.style.opacity = '0';
    this.tooltip.style.visibility = 'hidden';
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
    
    // Update icon based on status
    if (status.includes('Your name and headline')) {
      this.statusIcon.innerHTML = '👁️';
      this.statusIcon.style.color = '#0a66c2';
      this.overlay.className = 'linkedin-visibility-overlay public';
    } else if (status.includes('Private profile characteristics')) {
      this.statusIcon.innerHTML = '👤';
      this.statusIcon.style.color = '#f5a623';
      this.overlay.className = 'linkedin-visibility-overlay semi-private';
    } else if (status.includes('Private mode')) {
      this.statusIcon.innerHTML = '🔒';
      this.statusIcon.style.color = '#666';
      this.overlay.className = 'linkedin-visibility-overlay private';
    } else {
      this.statusIcon.innerHTML = '❓';
      this.statusIcon.style.color = '#999';
      this.overlay.className = 'linkedin-visibility-overlay error';
    }
  }

  async toggleStatus() {
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
}

// Initialize overlay when script loads
new LinkedInVisibilityOverlay();