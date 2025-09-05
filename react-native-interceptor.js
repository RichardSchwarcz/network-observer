/**
 * Network Observer Interceptor for React Native
 *
 * Copy this code into your React Native project and call setupNetworkObserver()
 * in your App.js or index.js file.
 *
 * This interceptor will capture all network requests made by your app and send
 * them to the Network Observer desktop app via WebSocket.
 *
 * Usage:
 *   import { setupNetworkObserver } from './networkObserver';
 *
 *   // In your app initialization
 *   if (__DEV__) {
 *     setupNetworkObserver();
 *   }
 */

let ws = null;
let reconnectTimer = null;
let isConnected = false;

// Store original methods
const originalFetch = global.fetch;
const originalXMLHttpRequest = global.XMLHttpRequest || class {};

/**
 * Setup the network observer interceptor
 * @param {Object} options - Configuration options
 * @param {string} options.host - WebSocket host (default: 'localhost')
 * @param {number} options.port - WebSocket port (default: 8081)
 * @param {boolean} options.autoReconnect - Auto-reconnect on connection loss (default: true)
 */
export function setupNetworkObserver(options = {}) {
  const config = {
    host: "localhost",
    port: 8081,
    autoReconnect: true,
    ...options,
  };

  console.log("[NetworkObserver] Setting up interceptors...");

  // Initialize WebSocket connection
  connectWebSocket(config);

  // Intercept fetch
  global.fetch = async (input, init = {}) => {
    const startTime = Date.now();
    const url = typeof input === "string" ? input : input.url;
    const method = init.method || "GET";
    const headers = init.headers || {};
    const body = init.body;

    // Create request object
    const request = {
      id: generateId(),
      url,
      method: method.toUpperCase(),
      headers: normalizeHeaders(headers),
      body: body ? String(body) : undefined,
      timestamp: startTime,
    };

    try {
      const response = await originalFetch(input, init);
      const endTime = Date.now();

      // Clone response to read body without consuming it
      const responseClone = response.clone();
      let responseBody;

      try {
        responseBody = await responseClone.text();
      } catch (e) {
        responseBody = "[Unable to read response body]";
      }

      // Create response object
      const networkResponse = {
        status: response.status,
        status_text: response.statusText,
        headers: normalizeHeaders(response.headers),
        body: responseBody,
      };

      // Send complete request data
      sendRequestData({
        ...request,
        response: networkResponse,
        duration: endTime - startTime,
      });

      return response;
    } catch (error) {
      const endTime = Date.now();

      // Send request data with error info
      sendRequestData({
        ...request,
        response: {
          status: 0,
          status_text: error.message,
          headers: {},
          body: `Error: ${error.message}`,
        },
        duration: endTime - startTime,
      });

      throw error;
    }
  };

  // Intercept XMLHttpRequest (only if it exists)
  if (global.XMLHttpRequest) {
    global.XMLHttpRequest = class extends originalXMLHttpRequest {
      constructor() {
        super();
        this._networkObserver = {
          startTime: null,
          url: null,
          method: null,
          headers: {},
          body: null,
        };
        this._setupInterceptor();
      }

      _setupInterceptor() {
        const originalOpen = this.open;
        const originalSend = this.send;
        const originalSetRequestHeader = this.setRequestHeader;

        this.open = function (method, url, async, user, password) {
          this._networkObserver.method = method.toUpperCase();
          this._networkObserver.url = url;
          return originalOpen.call(this, method, url, async, user, password);
        };

        this.setRequestHeader = function (header, value) {
          this._networkObserver.headers[header] = value;
          return originalSetRequestHeader.call(this, header, value);
        };

        this.send = function (body) {
          this._networkObserver.startTime = Date.now();
          this._networkObserver.body = body;

          // Create request object
          const request = {
            id: generateId(),
            url: this._networkObserver.url,
            method: this._networkObserver.method,
            headers: this._networkObserver.headers,
            body: body ? String(body) : undefined,
            timestamp: this._networkObserver.startTime,
          };

          // Listen for response
          const originalOnReadyStateChange = this.onreadystatechange;
          this.onreadystatechange = function () {
            if (this.readyState === 4) {
              const endTime = Date.now();

              // Get response headers
              const responseHeaders = {};
              try {
                const headersString = this.getAllResponseHeaders();
                if (headersString) {
                  headersString.split("\r\n").forEach((line) => {
                    const [key, value] = line.split(": ");
                    if (key && value) {
                      responseHeaders[key.toLowerCase()] = value;
                    }
                  });
                }
              } catch (e) {
                // Ignore header parsing errors
              }

              // Create response object
              const networkResponse = {
                status: this.status,
                status_text: this.statusText,
                headers: responseHeaders,
                body: this.responseText,
              };

              // Send complete request data
              sendRequestData({
                ...request,
                response: networkResponse,
                duration: endTime - this._networkObserver.startTime,
              });
            }

            if (originalOnReadyStateChange) {
              originalOnReadyStateChange.call(this);
            }
          };

          return originalSend.call(this, body);
        };
      }
    };
  }

  console.log("[NetworkObserver] Interceptors setup complete");
}

/**
 * Connect to WebSocket server
 */
function connectWebSocket(config) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    return;
  }

  try {
    ws = new WebSocket(`ws://${config.host}:${config.port}`);

    ws.onopen = () => {
      isConnected = true;
      console.log("[NetworkObserver] WebSocket connected");
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    ws.onclose = () => {
      isConnected = false;
      console.log("[NetworkObserver] WebSocket disconnected");

      if (config.autoReconnect && !reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          console.log("[NetworkObserver] Attempting to reconnect...");
          connectWebSocket(config);
        }, 5000);
      }
    };

    ws.onerror = (error) => {
      console.log("[NetworkObserver] WebSocket error:", error);
    };
  } catch (error) {
    console.log(
      "[NetworkObserver] Failed to create WebSocket connection:",
      error,
    );

    if (config.autoReconnect && !reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        connectWebSocket(config);
      }, 5000);
    }
  }
}

/**
 * Send request data to WebSocket server
 */
function sendRequestData(requestData) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.log(
      "[NetworkObserver] WebSocket not connected, skipping request data",
    );
    return;
  }

  try {
    ws.send(JSON.stringify(requestData));
  } catch (error) {
    console.log("[NetworkObserver] Failed to send request data:", error);
  }
}

/**
 * Generate unique ID for requests
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Normalize headers to a plain object
 */
function normalizeHeaders(headers) {
  const normalized = {};

  if (!headers) return normalized;

  if (headers.forEach) {
    // Headers object (fetch API)
    headers.forEach((value, key) => {
      normalized[key.toLowerCase()] = value;
    });
  } else if (typeof headers === "object") {
    // Plain object
    Object.keys(headers).forEach((key) => {
      normalized[key.toLowerCase()] = headers[key];
    });
  }

  return normalized;
}

/**
 * Disconnect and cleanup
 */
export function disconnectNetworkObserver() {
  console.log("[NetworkObserver] Disconnecting...");

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (ws) {
    ws.close();
    ws = null;
  }

  isConnected = false;

  // Restore original methods
  global.fetch = originalFetch;
  global.XMLHttpRequest = originalXMLHttpRequest;

  console.log("[NetworkObserver] Disconnected and cleaned up");
}

/**
 * Check connection status
 */
export function isNetworkObserverConnected() {
  return isConnected;
}

// Default export for easier importing
export default {
  setup: setupNetworkObserver,
  disconnect: disconnectNetworkObserver,
  isConnected: isNetworkObserverConnected,
};
