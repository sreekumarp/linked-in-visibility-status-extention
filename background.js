// Background script to handle API requests and message passing
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchVisibilityStatus") {
    fetchLinkedInVisibilityStatus()
      .then((status) => sendResponse({ status: status }))
      .catch((error) => {
        console.error("Background script error:", error);
        sendResponse({ status: "Error fetching status" });
      });
    return true; // Keep message channel open for async response
  } else if (request.action === "toggleVisibilityStatus") {
    toggleLinkedInVisibilityStatus(request.currentStatus)
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error("Toggle error:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }
});

async function fetchLinkedInVisibilityStatus() {
  try {
    // Fetch the LinkedIn preferences page
    const response = await fetch(
      "https://www.linkedin.com/mypreferences/d/profile-viewing-options",
      {
        method: "GET",
        credentials: "include",
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    return parseVisibilityStatus(html);
  } catch (error) {
    console.error("Error fetching LinkedIn visibility status:", error);
    return "Unable to fetch status - please check if you're logged in to LinkedIn";
  }
}

function parseVisibilityStatus(html) {
  try {
    // Look for JSON data in the HTML response
    const jsonDataMatch = html.match(/<code[^>]*>([\s\S]*?)<\/code>/g); //html.match(/<code[^>]*id="bpr-guid-\d+"[^>]*>([^<]+)<\/code>/);

    if (jsonDataMatch) {
      try {
        // Decode HTML entities and parse JSON
        const jsonString = jsonDataMatch
          .find((a) => a.includes("DISCLOSE_ANONYMOUS"))
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">");

        debugger;

        const match = jsonString.match(/<code[^>]*>([\s\S]*?)<\/code>/);
        const inner = match ? match[1] : null;
        const data = JSON.parse(inner);

        // Navigate to the settings data
        if (
          data.included &&
          data.included[0] &&
          data.included[0].settingDisplayValues
        ) {
          const settings = data.included[0].settingDisplayValues;

          // Find the selected setting
          for (let setting of settings) {
            if (setting.selected === true) {
              return setting.settingDisplayValue;
            }
          }
        }

        // Alternative: check the current value in the setting entity
        if (data.included && data.included[0] && data.included[0].value) {
          const currentValue = data.included[0].value;

          switch (currentValue) {
            case "DISCLOSE_FULL":
              return "Your name and headline";
            case "DISCLOSE_ANONYMOUS":
              return "Private profile characteristics";
            case "HIDE":
              return "Private mode";
            default:
              return `Unknown status: ${currentValue}`;
          }
        }
      } catch (jsonError) {
        //console.error('Error parsing JSON data:', jsonError);
      }
    }

    // Fallback: Look for the key patterns in the HTML
    if (
      html.includes("discloseAsProfileViewer__DISCLOSE_FULL") &&
      (html.includes('"selected":true') || html.includes("checked"))
    ) {
      return "Your name and headline";
    } else if (
      html.includes("discloseAsProfileViewer__DISCLOSE_ANONYMOUS") &&
      (html.includes('"selected":true') || html.includes("checked"))
    ) {
      return "Private profile characteristics";
    } else if (
      html.includes("discloseAsProfileViewer") &&
      html.includes("HIDE") &&
      (html.includes('"selected":true') || html.includes("checked"))
    ) {
      return "Private mode";
    }

    // Additional fallback: Look for specific value patterns
    if (
      html.includes('"value":"DISCLOSE_FULL"') &&
      html.includes('"selected":true')
    ) {
      return "Your name and headline";
    } else if (
      html.includes('"value":"DISCLOSE_ANONYMOUS"') &&
      html.includes('"selected":true')
    ) {
      return "Private profile characteristics";
    } else if (
      html.includes('"value":"HIDE"') &&
      html.includes('"selected":true')
    ) {
      return "Private mode";
    }

    // Final fallback: search for the setting display values with selected status
    const patterns = [
      { text: "Your name and headline", key: "DISCLOSE_FULL" },
      { text: "Private profile characteristics", key: "DISCLOSE_ANONYMOUS" },
      { text: "Private mode", key: "HIDE" },
    ];

    for (let pattern of patterns) {
      const regex = new RegExp(
        `"settingDisplayValue":"${pattern.text}"[^}]*"selected":true`,
        "i"
      );
      if (regex.test(html)) {
        return pattern.text;
      }
    }

    return "Unable to determine current status";
  } catch (error) {
    console.error("Error parsing visibility status:", error);
    return "Error parsing status";
  }
}

async function toggleLinkedInVisibilityStatus(currentStatus) {
  try {
    // Get the next status in the cycle
    const nextStatus = getNextStatus(currentStatus);

    // Create a hidden tab to manipulate the settings page
    const tab = await chrome.tabs.create({
      url: "https://www.linkedin.com/mypreferences/d/profile-viewing-options",
      active: false, // Hidden tab
    });

    return new Promise((resolve) => {
      // Wait for the tab to load, then manipulate it
      const onUpdated = (tabId, changeInfo, updatedTab) => {
        if (tabId === tab.id && changeInfo.status === "complete") {
          chrome.tabs.onUpdated.removeListener(onUpdated);

          // Execute script to click the radio button and submit
          chrome.scripting.executeScript(
            {
              target: { tabId: tab.id },
              func: toggleRadioButton,
              args: [nextStatus.value],
            },
            (results) => {
              // Close the hidden tab
              chrome.tabs.remove(tab.id);

              if (results && results[0] && results[0].result) {
                const result = results[0].result;
                if (result.success) {
                  resolve({
                    success: true,
                    newStatus: nextStatus.displayValue,
                    message: `Switched to: ${nextStatus.displayValue}`,
                  });
                } else {
                  resolve({
                    success: false,
                    error: result.error || "Failed to toggle setting",
                  });
                }
              } else {
                resolve({
                  success: false,
                  error: "Failed to execute toggle script",
                });
              }
            }
          );
        }
      };

      chrome.tabs.onUpdated.addListener(onUpdated);

      // Set a timeout in case the page doesn't load
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        chrome.tabs.remove(tab.id);
        resolve({
          success: false,
          error: "Timeout waiting for LinkedIn page to load",
        });
      }, 15000); // 15 second timeout
    });
  } catch (error) {
    console.error("Error toggling visibility status:", error);
    return {
      success: false,
      error: error.message || "Failed to toggle status",
    };
  }
}

// Function to be injected into the LinkedIn preferences page
function toggleRadioButton(targetValue) {
  try {
    // Map values to radio button IDs
    const radioButtonMap = {
      DISCLOSE_FULL: "discloseAsProfileViewer__DISCLOSE_FULL",
      DISCLOSE_ANONYMOUS: "discloseAsProfileViewer__DISCLOSE_ANONYMOUS",
      HIDE: "discloseAsProfileViewer__HIDE",
    };

    const radioId = radioButtonMap[targetValue];
    if (!radioId) {
      return { success: false, error: `Unknown target value: ${targetValue}` };
    }

    // Wait for the page to be fully loaded
    const waitForElement = (selector, timeout = 10000) => {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const checkElement = () => {
          const element = document.querySelector(selector);
          if (element) {
            resolve(element);
          } else if (Date.now() - startTime > timeout) {
            reject(
              new Error(`Element ${selector} not found within ${timeout}ms`)
            );
          } else {
            setTimeout(checkElement, 100);
          }
        };

        checkElement();
      });
    };

    return waitForElement(`#${radioId}`)
      .then((radioButton) => {
        if (!radioButton) {
          throw new Error(`Radio button not found: ${radioId}`);
        }

        // Check if it's already selected
        if (radioButton.checked) {
          return { success: true, message: "Setting already active" };
        }

        // Click the radio button
        radioButton.click();

        // Trigger change event manually in case it's needed
        radioButton.dispatchEvent(new Event("change", { bubbles: true }));
        radioButton.dispatchEvent(new Event("click", { bubbles: true }));

        // Wait a moment for any JavaScript to process the change
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ success: true, message: "Setting changed (auto-save)" });
          }, 500);
        });
      })
      .catch((error) => {
        return { success: false, error: error.message };
      });
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getNextStatus(currentStatus) {
  const statusCycle = [
    { displayValue: "Your name and headline", value: "DISCLOSE_FULL" },
    {
      displayValue: "Private profile characteristics",
      value: "DISCLOSE_ANONYMOUS",
    },
    { displayValue: "Private mode", value: "HIDE" },
  ];

  const currentIndex = statusCycle.findIndex(
    (status) => status.displayValue === currentStatus
  );
  const nextIndex = (currentIndex + 1) % statusCycle.length;

  return statusCycle[nextIndex];
}

function createTogglePayload(nextStatus) {
  // Create the settings display values array with the new selection
  const settingDisplayValues = [
    {
      settingDisplayValue: "Your name and headline",
      value: "DISCLOSE_FULL",
      selected: nextStatus.value === "DISCLOSE_FULL",
    },
    {
      settingDisplayValue: "Private profile characteristics",
      value: "DISCLOSE_ANONYMOUS",
      selected: nextStatus.value === "DISCLOSE_ANONYMOUS",
    },
    {
      settingDisplayValue: "Private mode",
      value: "HIDE",
      selected: nextStatus.value === "HIDE",
    },
  ];

  return {
    value: nextStatus.value,
    settingDisplayType: "RADIO",
    notationDescription:
      "Selecting Private profile characteristics or Private mode will disable Who's Viewed Your Profile and erase your viewer history.",
    description: "Select what others see when you've viewed their profile",
    a11yName:
      "Profile viewing options. Choose whether you're visible or viewing in private mode",
    offValue: "HIDE",
    entityUrn: "urn:li:settingEntity:300101",
    a11yNotationDescription:
      "Selecting Private profile characteristics or Private mode will disable Who's Viewed Your Profile and erase your viewer history.",
    key: "discloseAsProfileViewer",
    onValue: "DISCLOSE_FULL",
    primaryDescription:
      "Select what others see when you've viewed their profile",
    hasChild: false,
    settingDisplayValues: settingDisplayValues,
    a11yPrimaryDescription:
      "Select what others see when you've viewed their profile",
  };
}

async function extractTokensFromLinkedIn() {
  try {
    // First try to get CSRF token from LinkedIn's Ember application context
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true,
      url: "https://www.linkedin.com/*",
    });

    if (tabs.length > 0) {
      try {
        // Inject script to get CSRF token from Ember context
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            try {
              // Try to access Ember application context
              if (window.Ember && window.Ember.Application) {
                const app = window.Ember.Application.NAMESPACES[0];
                if (app && app.__container__) {
                  const router = app.__container__.lookup("router:main");
                  if (router && typeof Ember.get === "function") {
                    const headers = Ember.get(router, "headers");
                    if (headers && headers["Csrf-Token"]) {
                      return {
                        csrfToken: headers["Csrf-Token"],
                        method: "ember",
                      };
                    }
                  }
                }
              }

              // Alternative: try to find CSRF token in global variables
              if (window.lio && window.lio.csrfToken) {
                return {
                  csrfToken: window.lio.csrfToken,
                  method: "lio",
                };
              }

              // Fallback: search in script tags or meta tags
              const metaTag = document.querySelector('meta[name="csrf-token"]');
              if (metaTag) {
                return {
                  csrfToken: metaTag.getAttribute("content"),
                  method: "meta",
                };
              }

              // Search in inline scripts
              const scripts = document.querySelectorAll("script");
              for (let script of scripts) {
                if (script.textContent) {
                  const csrfMatch =
                    script.textContent.match(
                      /['""]csrfToken['""]:\s*['""]([^'""]+)['""]/
                    ) ||
                    script.textContent.match(
                      /['""]Csrf-Token['""]:\s*['""]([^'""]+)['""]/
                    ) ||
                    script.textContent.match(
                      /csrfToken:\s*['""]([^'""]+)['""]/
                    ) ||
                    script.textContent.match(
                      /csrf[_-]?token['""]?\s*[:=]\s*['""]([^'""]+)['""]?/i
                    );
                  if (csrfMatch) {
                    return {
                      csrfToken: csrfMatch[1],
                      method: "script",
                    };
                  }
                }
              }

              return { csrfToken: null, method: "none" };
            } catch (e) {
              console.error("Error extracting CSRF token:", e);
              return { csrfToken: null, method: "error", error: e.message };
            }
          },
        });

        if (
          results &&
          results[0] &&
          results[0].result &&
          results[0].result.csrfToken
        ) {
          console.log(`CSRF token extracted via ${results[0].result.method}`);
          return {
            csrfToken: results[0].result.csrfToken,
            pageInstance: null, // We'll extract this separately if needed
          };
        }
      } catch (scriptError) {
        console.error("Error executing script in tab:", scriptError);
      }
    }

    // Fallback: Fetch the LinkedIn preferences page to extract tokens from HTML
    const response = await fetch(
      "https://www.linkedin.com/mypreferences/d/profile-viewing-options",
      {
        method: "GET",
        credentials: "include",
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch LinkedIn page: ${response.status}`);
    }

    const html = await response.text();

    // Extract CSRF token from HTML
    let csrfToken = null;
    const csrfPatterns = [
      /['""]csrfToken['""]:\s*['""]([^'""]+)['""]/,
      /['""]Csrf-Token['""]:\s*['""]([^'""]+)['""]/,
      /name=['""]csrfToken['""][^>]*content=['""]([^'""]+)['""]/,
      /csrf[_-]?token['""]?\s*[:=]\s*['""]([^'""]+)['""]?/i,
    ];

    for (let pattern of csrfPatterns) {
      const match = html.match(pattern);
      if (match) {
        csrfToken = match[1];
        break;
      }
    }

    // Extract page instance
    let pageInstance = null;
    const pageInstanceMatch =
      html.match(/['""]pageInstance['""]:\s*['""]([^'""]+)['""]/) ||
      html.match(/pageInstance:\s*['""]([^'""]+)['""]/) ||
      html.match(/page-instance['""]?\s*[:=]\s*['""]([^'""]+)['""]?/);
    if (pageInstanceMatch) {
      pageInstance = pageInstanceMatch[1];
    }

    console.log("CSRF token extracted via HTML parsing");
    return { csrfToken, pageInstance };
  } catch (error) {
    console.error("Error extracting tokens:", error);
    return { csrfToken: null, pageInstance: null };
  }
}
