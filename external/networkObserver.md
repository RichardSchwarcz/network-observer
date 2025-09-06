import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Network Observer Interceptor for React Native
 *
 * This utility intercepts HTTP requests made via fetch() and XMLHttpRequest
 * and forwards them to a WebSocket server for real-time network monitoring.
 *
 * Key Features:
 * - Intercepts both fetch() and XMLHttpRequest APIs
 * - Automatic WebSocket reconnection with exponential backoff
 * - Request deduplication to prevent infinite loops
 * - Configurable logging levels
 * - Memory leak prevention with automatic cache cleanup
 *
 * Usage:
 *   setupNetworkObserver({
 *     host: 'localhost',
 *     port: 8085,
 *     logging: 'verbose' // 'silent', 'minimal', 'verbose'
 *   });
 */

interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  response?: NetworkResponse;
  timestamp: number;
  duration?: number;
}

interface NetworkResponse {
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body?: string;
}

interface NetworkObserverConfig {
  host?: string;
  port?: number;
  autoReconnect?: boolean;
  logging?: 'silent' | 'minimal' | 'verbose';
}

interface XHRObserverData {
  startTime: number | null;
  url: string | null;
  method: string | null;
  headers: Record<string, string>;
  body: any;
}

// Global state
let ws: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let isConnected: boolean = false;
let reconnectAttempts: number = 0;
let config: Required<NetworkObserverConfig> = {
  host: 'localhost',
  port: 8085,
  autoReconnect: true,
  logging: 'minimal',
};

// Request deduplication system
// Prevents duplicate requests from being sent when multiple interceptors
// fire for the same network call or during reconnection scenarios
let requestCache = new Map<string, number>();
let cacheCleanupTimer: NodeJS.Timeout | null = null;

// Store original methods to restore on cleanup
const originalFetch = global.fetch;
const originalXMLHttpRequest = global.XMLHttpRequest || class {};

export const useSetupNetworkObserver = () => {
  useEffect(() => {
    if (__DEV__) {
      setupNetworkObserver();
    }
  }, []);
};

/**
 * Sets up network request interception and WebSocket connection
 *
 * @param options Configuration options for the network observer
 */
function setupNetworkObserver(options: NetworkObserverConfig = {}): void {
  // Merge user config with defaults
  config = {
    host: Platform.OS === 'android' ? '10.0.2.2' : 'localhost',
    port: 8085,
    autoReconnect: true,
    logging: 'minimal',
    ...options,
  };

  if (__DEV__) {
    log('verbose', '[NetworkObserver] Setting up interceptors...');

    // Initialize WebSocket connection
    connectWebSocket();

    // Set up fetch() interception
    setupFetchInterception();

    // Set up XMLHttpRequest interception (for libraries like Axios)
    setupXHRInterception();

    log(
      'minimal',
      '[NetworkObserver] Interceptors setup complete (fetch + XHR)',
    );
  }
}

/**
 * Intercepts the global fetch() function
 */
function setupFetchInterception(): void {
  global.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const startTime = Date.now();
    const url = typeof input === 'string' ? input : input.toString();
    const method = init.method || 'GET';
    const headers = init.headers || {};
    const body = init.body;

    log('verbose', `[NetworkObserver] Intercepted fetch: ${method} ${url}`);

    // Create request object with unique ID
    const request: NetworkRequest = {
      id: generateId(),
      url,
      method: method.toUpperCase(),
      headers: normalizeHeaders(headers),
      body: body ? String(body) : undefined,
      timestamp: startTime,
    };

    try {
      // Execute original fetch
      const response = await originalFetch(input, init);
      const endTime = Date.now();

      // Clone response to read body without affecting original
      const responseClone = response.clone();
      let responseBody: string;

      try {
        responseBody = await responseClone.text();
      } catch (e) {
        responseBody = '[Unable to read response body]';
      }

      const networkResponse: NetworkResponse = {
        status: response.status,
        status_text: response.statusText || 'Unknown',
        headers: normalizeHeaders(response.headers),
        body: responseBody,
      };

      // Send complete request data to observer
      sendRequestData({
        ...request,
        response: networkResponse,
        duration: endTime - startTime,
      });

      return response;
    } catch (error: any) {
      const endTime = Date.now();

      // Send error response to observer
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
}

/**
 * Intercepts XMLHttpRequest for libraries that don't use fetch()
 */
function setupXHRInterception(): void {
  if (!global.XMLHttpRequest) {
    return;
  }

  const OriginalXHR = global.XMLHttpRequest;

  global.XMLHttpRequest = class extends OriginalXHR {
    private _networkObserver: XHRObserverData;

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

    private _setupInterceptor() {
      const originalOpen = this.open.bind(this);
      const originalSend = this.send.bind(this);
      const originalSetRequestHeader = this.setRequestHeader.bind(this);

      // Intercept open() to capture method and URL
      this.open = (method: string, url: string | URL, ...args: any[]) => {
        this._networkObserver.method = method.toUpperCase();
        this._networkObserver.url =
          typeof url === 'string' ? url : url.toString();
        log(
          'verbose',
          `[NetworkObserver] Intercepted XHR: ${method.toUpperCase()} ${url.toString()}`,
        );
        return originalOpen.call(
          this,
          method,
          typeof url === 'string' ? url : url.toString(),
          ...args,
        );
      };

      // Intercept setRequestHeader() to capture headers
      this.setRequestHeader = (header: string, value: string) => {
        this._networkObserver.headers[header] = value;
        return originalSetRequestHeader(header, value);
      };

      // Intercept send() to capture body and set up response handling
      this.send = (body?: any) => {
        this._networkObserver.startTime = Date.now();
        this._networkObserver.body = body;

        const request: NetworkRequest = {
          id: generateId(),
          url: this._networkObserver.url!,
          method: this._networkObserver.method!,
          headers: this._networkObserver.headers,
          body: body ? String(body) : undefined,
          timestamp: this._networkObserver.startTime,
        };

        // Set up response handler
        const originalOnReadyStateChange = this.onreadystatechange;
        this.onreadystatechange = () => {
          if (this.readyState === 4) {
            const endTime = Date.now();

            // Parse response headers
            const responseHeaders: Record<string, string> = {};
            try {
              const headersString = this.getAllResponseHeaders();
              if (headersString) {
                headersString.split('\r\n').forEach((line) => {
                  const [key, value] = line.split(': ');
                  if (key && value) {
                    responseHeaders[key.toLowerCase()] = value;
                  }
                });
              }
            } catch (e) {
              // Ignore header parsing errors
            }

            // Handle different response types safely
            let responseBody: string;
            try {
              if (this.responseType === '' || this.responseType === 'text') {
                responseBody = this.responseText;
              } else if (this.responseType === 'json') {
                responseBody = JSON.stringify(this.response);
              } else if (this.responseType === 'blob') {
                responseBody = '[Blob data - unable to read as text]';
              } else if (this.responseType === 'arraybuffer') {
                responseBody = '[ArrayBuffer data - unable to read as text]';
              } else {
                responseBody = String(this.response || '[Unknown response type]');
              }
            } catch (e) {
              responseBody = '[Unable to read response body]';
            }

            const networkResponse: NetworkResponse = {
              status: this.status,
              status_text: this.statusText || 'Unknown',
              headers: responseHeaders,
              body: responseBody,
            };

            // Send complete request data to observer
            sendRequestData({
              ...request,
              response: networkResponse,
              duration: endTime - this._networkObserver.startTime!,
            });
          }

          // Call original handler if it exists
          if (originalOnReadyStateChange) {
            (originalOnReadyStateChange as any).call(this);
          }
        };

        return originalSend.call(this, body);
      };
    }
  };
}

/**
 * Establishes WebSocket connection with automatic reconnection
 */
function connectWebSocket(): void {
  // Prevent multiple simultaneous connection attempts
  if (
    ws &&
    (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
  ) {
    log(
      'verbose',
      '[NetworkObserver] WebSocket already connected/connecting, skipping',
    );
    return;
  }

  try {
    ws = new WebSocket(`ws://${config.host}:${config.port}`);

    ws.onopen = () => {
      isConnected = true;
      reconnectAttempts = 0; // Reset on successful connection
      log('minimal', '[NetworkObserver] WebSocket connected');

      // Clear any pending reconnection timers
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    ws.onclose = () => {
      isConnected = false;
      log('minimal', '[NetworkObserver] WebSocket disconnected');

      // Implement exponential backoff for reconnection
      if (config.autoReconnect && !reconnectTimer) {
        const backoffDelay = Math.min(
          5000 * Math.pow(2, reconnectAttempts),
          30000,
        ); // Max 30s
        reconnectAttempts++;

        reconnectTimer = setTimeout(() => {
          log(
            'verbose',
            `[NetworkObserver] Attempting to reconnect (attempt ${reconnectAttempts})...`,
          );
          connectWebSocket();
        }, backoffDelay);
      }
    };

    ws.onerror = (error) => {
      log('minimal', '[NetworkObserver] WebSocket error:', error);
    };
  } catch (error) {
    log(
      'minimal',
      '[NetworkObserver] Failed to create WebSocket connection:',
      error,
    );

    // Schedule reconnection attempt
    if (config.autoReconnect && !reconnectTimer) {
      const backoffDelay = Math.min(
        5000 * Math.pow(2, reconnectAttempts),
        30000,
      );
      reconnectAttempts++;

      reconnectTimer = setTimeout(() => {
        connectWebSocket();
      }, backoffDelay);
    }
  }
}

/**
 * Sends request data to WebSocket with advanced deduplication
 *
 * Deduplication strategy:
 * 1. Creates unique signature based on method, URL, body hash, and response status
 * 2. Uses Map with timestamps to allow same request after time window
 * 3. Prevents infinite loops from interceptor conflicts
 */
function sendRequestData(requestData: NetworkRequest): void {
  // Create comprehensive signature for deduplication
  // Include response status to differentiate between request/response phases
  const bodyHash = requestData.body
    ? requestData.body.length > 100
      ? requestData.body.slice(0, 50) + '...' + requestData.body.slice(-50)
      : requestData.body
    : '';

  const responseStatus = requestData.response?.status?.toString() || 'pending';
  const requestSignature = `${requestData.method}:${requestData.url}:${bodyHash}:${responseStatus}`;

  // Check for recent duplicates (within last 2 seconds)
  const now = Date.now();
  const lastSent = requestCache.get(requestSignature);

  if (lastSent && now - lastSent < 2000) {
    log(
      'verbose',
      '[NetworkObserver] Duplicate request detected, skipping:',
      requestData.method,
      requestData.url,
    );
    return;
  }

  // Update cache with current timestamp
  requestCache.set(requestSignature, now);

  // Set up periodic cache cleanup to prevent memory leaks
  if (!cacheCleanupTimer) {
    cacheCleanupTimer = setTimeout(() => {
      // Remove entries older than 5 minutes
      const cutoff = Date.now() - 300000;
      const entries = Array.from(requestCache.entries());
      for (const [signature, timestamp] of entries) {
        if (timestamp < cutoff) {
          requestCache.delete(signature);
        }
      }
      cacheCleanupTimer = null;
      log('verbose', '[NetworkObserver] Request cache cleanup completed');
    }, 60000); // Run cleanup every minute
  }

  log(
    'verbose',
    '[NetworkObserver] Sending request data:',
    requestData.method,
    requestData.url,
  );

  // Ensure WebSocket is ready
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    log('verbose', '[NetworkObserver] WebSocket not ready, skipping request');
    return;
  }

  try {
    ws.send(JSON.stringify(requestData));
    log(
      'verbose',
      '[NetworkObserver] Successfully sent request data to WebSocket',
    );
  } catch (error) {
    log('minimal', '[NetworkObserver] Failed to send request data:', error);
  }
}

/**
 * Generates unique ID for requests
 * Uses timestamp + random component for uniqueness
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Normalizes headers from various formats to consistent object
 */
function normalizeHeaders(headers: any): Record<string, string> {
  const normalized: Record<string, string> = {};

  if (!headers) {
    return normalized;
  }

  // Handle Headers object (from fetch API)
  if (headers.forEach) {
    headers.forEach((value: string, key: string) => {
      normalized[key.toLowerCase()] = value;
    });
  }
  // Handle plain object
  else if (typeof headers === 'object') {
    Object.keys(headers).forEach((key) => {
      normalized[key.toLowerCase()] = headers[key];
    });
  }

  return normalized;
}

/**
 * Logging utility that respects the configured logging level
 */
function log(level: 'silent' | 'minimal' | 'verbose', ...args: any[]): void {
  if (config.logging === 'silent') {
    return;
  }

  if (
    level === 'minimal' &&
    (config.logging === 'minimal' || config.logging === 'verbose')
  ) {
    console.log(...args);
  } else if (level === 'verbose' && config.logging === 'verbose') {
    console.log(...args);
  }
}

/**
 * Disconnects WebSocket and restores original network functions
 * Call this to clean up when the observer is no longer needed
 */
export function disconnectNetworkObserver(): void {
  if (__DEV__) {
    log('minimal', '[NetworkObserver] Disconnecting...');

    // Clear reconnection timer
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    // Clear cache cleanup timer
    if (cacheCleanupTimer) {
      clearTimeout(cacheCleanupTimer);
      cacheCleanupTimer = null;
    }

    // Close WebSocket connection
    if (ws) {
      ws.close();
      ws = null;
    }

    isConnected = false;
    reconnectAttempts = 0;

    // Restore original functions
    global.fetch = originalFetch;
    global.XMLHttpRequest = originalXMLHttpRequest as any;

    // Clear caches
    requestCache.clear();

    log('minimal', '[NetworkObserver] Disconnected and cleaned up');
  }
}

/**
 * Returns current connection status
 */
export function isNetworkObserverConnected(): boolean {
  return isConnected;
}
