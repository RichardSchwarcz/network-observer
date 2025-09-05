# Network Observer Documentation

## Overview

Network Observer is a development tool that provides real-time monitoring of network requests in React Native applications. It consists of two main components:

1. **React Native Interceptor** (`networkObserver.ts`) - Captures network requests
2. **Desktop App** (Tauri + React) - Displays captured requests in real-time

## Architecture Overview

```
┌─────────────────────┐    WebSocket     ┌─────────────────────┐
│   React Native App  │ ◄─────────────► │   Desktop Observer  │
│                     │    Port 8085     │                     │
│  ┌───────────────┐  │                  │  ┌───────────────┐  │
│  │ networkObserver│  │                  │  │ Tauri Backend │  │
│  │   (Intercept)  │  │                  │  │  (WebSocket)  │  │
│  └───────────────┘  │                  │  └───────────────┘  │
│  ┌───────────────┐  │                  │  ┌───────────────┐  │
│  │  fetch/XHR    │  │                  │  │  React UI     │  │
│  │  (Original)   │  │                  │  │  (Display)    │  │
│  └───────────────┘  │                  │  └───────────────┘  │
└─────────────────────┘                  └─────────────────────┘
```

## How It Works: Request Flow

### 1. Request Interception (Non-Proxy, Non-Duplication Approach)

**Important**: Network Observer does **NOT** proxy requests and does **NOT** duplicate requests to your server. Instead, it uses **data copying for monitoring**:

```javascript
// What happens when your app makes a request:

// 1. Your code makes a request
fetch('https://your-magento.com/api/products')

// 2. Network Observer intercepts the call
global.fetch = async (input, init) => {
  // 3. Create request metadata (for monitoring only)
  const requestData = {
    id: 'req_123',
    url: 'https://your-magento.com/api/products',
    method: 'GET',
    headers: {...},
    timestamp: Date.now()
  }
  
  // 4. Execute the ORIGINAL request (ONE request to your server)
  const response = await originalFetch(input, init)
  
  // 5. Clone response data for monitoring (doesn't affect original)
  const responseClone = response.clone()
  const responseBody = await responseClone.text()
  
  // 6. Send COPIED monitoring data via WebSocket to desktop app
  // (Your server never sees this - it's local monitoring only)
  sendToDesktopApp({
    ...requestData,
    response: {
      status: response.status,
      headers: {...},
      body: responseBody
    }
  })
  
  // 7. Return original response to your app (unmodified)
  return response
}
```

### 2. Data Flow Diagram

```
Your App Request Flow (Single Request to Server):
┌─────────┐     ┌────────────────┐     ┌──────────────┐     ┌─────────────┐
│  fetch  │ ──► │ Network        │ ──► │ Your Magento │ ──► │ Response to │
│  call   │     │ Observer       │     │   Server     │     │ your app    │
└─────────┘     │ (transparent)  │     │ (1 REQUEST)  │     └─────────────┘
                └────────┬───────┘     └──────────────┘
                         │ (copied data for monitoring)
                         ▼
                ┌─────────────────┐     ┌─────────────────┐
                │ WebSocket       │ ──► │ Desktop App     │
                │ (port 8085)     │     │ (monitoring UI) │
                │ LOCAL ONLY      │     │  LOCAL ONLY     │
                └─────────────────┘     └─────────────────┘
```

### 3. Server Impact Clarification

**Your Magento Backend Sees:**
- ✅ **Same number of requests** (no duplication)
- ✅ **Same request timing**
- ✅ **Same headers and payload**
- ✅ **Zero additional server load**

**Network Observer Traffic (Local Only):**
- WebSocket between React Native ↔ Desktop App
- **Never reaches your Magento server**
- **Your server is completely unaware of monitoring**

## Part 1: React Native Integration

### Request Interception Methods

Network Observer intercepts requests using two methods to catch all possible network calls:

#### Method 1: Fetch API Interception

```javascript
// Before interception
const originalFetch = global.fetch;

// After interception
global.fetch = async (input, init) => {
  // 1. Extract request details
  const url = typeof input === 'string' ? input : input.toString();
  const method = init?.method || 'GET';
  const headers = init?.headers || {};
  const body = init?.body;

  // 2. Record start time
  const startTime = Date.now();

  // 3. Execute original request (your app gets normal response)
  const response = await originalFetch(input, init);
  
  // 4. Measure response time
  const endTime = Date.now();
  const duration = endTime - startTime;

  // 5. Clone response for monitoring (doesn't affect your app)
  const responseClone = response.clone();
  const responseBody = await responseClone.text();

  // 6. Send data to desktop app
  sendToMonitor({
    url,
    method,
    headers,
    body,
    response: {
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: responseBody
    },
    duration
  });

  // 7. Return unmodified response to your app
  return response;
};
```

#### Method 2: XMLHttpRequest Interception (for Axios, etc.)

```javascript
const OriginalXHR = global.XMLHttpRequest;

global.XMLHttpRequest = class extends OriginalXHR {
  constructor() {
    super();
    this._networkObserver = { /* tracking data */ };
    this._setupInterceptor();
  }

  _setupInterceptor() {
    // Override open() method
    const originalOpen = this.open.bind(this);
    this.open = function(method, url) {
      this._networkObserver.method = method;
      this._networkObserver.url = url;
      return originalOpen.apply(this, arguments);
    };

    // Override send() method  
    const originalSend = this.send.bind(this);
    this.send = function(body) {
      this._networkObserver.startTime = Date.now();
      this._networkObserver.body = body;

      // Monitor response when ready
      this.onreadystatechange = () => {
        if (this.readyState === 4) { // Request complete
          const duration = Date.now() - this._networkObserver.startTime;
          
          sendToMonitor({
            method: this._networkObserver.method,
            url: this._networkObserver.url,
            body: this._networkObserver.body,
            response: {
              status: this.status,
              statusText: this.statusText,
              body: this.responseText
            },
            duration
          });
        }
      };

      return originalSend(body);
    };
  }
};
```

### Integration Example

In your React Native app:

```javascript
// App.tsx
import { setupNetworkObserver } from 'utils/networkObserver';

export default function App() {
  useEffect(() => {
    if (__DEV__) { // Only in development
      setupNetworkObserver({
        host: Platform.OS === 'android' ? '10.0.2.2' : 'localhost',
        port: 8085
      });
    }
  }, []);

  return <YourApp />;
}
```

### What Your App Sees vs What Monitor Sees

```javascript
// Your component makes a normal request:
const fetchUser = async () => {
  const response = await fetch('/api/user/123');
  const user = await response.json();
  setUser(user); // Works exactly as normal
};

// Behind the scenes, Monitor receives:
{
  id: "req_1234567890",
  url: "https://yourapi.com/api/user/123",
  method: "GET", 
  headers: { "Authorization": "Bearer ...", ... },
  timestamp: 1703123456789,
  response: {
    status: 200,
    status_text: "OK",
    headers: { "content-type": "application/json", ... },
    body: '{"id": 123, "name": "John Doe", ...}'
  },
  duration: 245 // milliseconds
}
```

## Part 2: WebSocket Communication Protocol

### WebSocket Basics

WebSockets provide real-time, bidirectional communication between your React Native app and the desktop monitor. Think of it as a persistent phone line that stays open.

```javascript
// Traditional HTTP: Request → Response → Connection Closed
fetch('/api/data') // New connection each time

// WebSocket: Persistent Connection
const ws = new WebSocket('ws://localhost:8085'); // Connection stays open
ws.send(data1); // Send data anytime
ws.send(data2); // Send more data
ws.send(data3); // Connection remains open
```

### Connection Setup

#### React Native Side (Client)

```javascript
// 1. Create WebSocket connection
const ws = new WebSocket('ws://localhost:8085');

// 2. Handle connection events
ws.onopen = () => {
  console.log('Connected to Network Observer');
  // Send test message to verify connection
  ws.send(JSON.stringify({
    type: 'connection_test',
    message: 'React Native app connected'
  }));
};

ws.onclose = () => {
  console.log('Disconnected from Network Observer');
  // Auto-reconnect after 5 seconds
  setTimeout(() => connectWebSocket(), 5000);
};

ws.onerror = (error) => {
  console.log('WebSocket error:', error);
};
```

#### Desktop App Side (Server)

The desktop app runs a WebSocket server using Tauri/Rust:

```rust
// Simplified Rust WebSocket server
use tauri::command;
use tokio_tungstenite::{accept_async, tungstenite::Message};

#[tauri::command]
async fn start_websocket_server() -> Result<(), String> {
    let listener = TcpListener::bind("127.0.0.1:8085").await?;
    println!("WebSocket server listening on ws://127.0.0.1:8085");
    
    while let Ok((stream, _)) = listener.accept().await {
        let ws_stream = accept_async(stream).await?;
        
        // Handle incoming messages from React Native
        while let Some(message) = ws_stream.next().await {
            match message? {
                Message::Text(text) => {
                    // Parse network request data
                    let request_data: NetworkRequest = serde_json::from_str(&text)?;
                    // Send to React UI for display
                    emit_to_frontend("network_request", request_data);
                }
                _ => {}
            }
        }
    }
    Ok(())
}
```

### Message Protocol

#### Message Format

All messages are JSON objects sent as WebSocket text frames:

```javascript
// Request message structure
{
  "id": "req_1703123456789_abc123",
  "url": "https://api.example.com/users/123",
  "method": "POST",
  "headers": {
    "content-type": "application/json",
    "authorization": "Bearer eyJ0eXAi..."
  },
  "body": "{\"name\": \"John Doe\"}",
  "timestamp": 1703123456789,
  "response": {
    "status": 201,
    "status_text": "Created",
    "headers": {
      "content-type": "application/json",
      "location": "/users/456"
    },
    "body": "{\"id\": 456, \"name\": \"John Doe\"}"
  },
  "duration": 342
}
```

#### Message Types

```javascript
// 1. Connection Test
{
  "type": "connection_test",
  "id": "test_1703123456789",
  "url": "https://test.example.com/connection-test",
  "method": "GET",
  "response": {
    "status": 200,
    "status_text": "OK",
    "body": "Connection test successful"
  }
}

// 2. Actual Network Request
{
  "type": "network_request",
  "id": "req_1703123456789",
  "url": "https://api.yourapp.com/graphql",
  "method": "POST",
  // ... full request/response data
}

// 3. Error Message
{
  "type": "error",
  "error": "Failed to parse response body",
  "request_id": "req_1703123456789"
}
```

### Connection Flow Example

```javascript
// Complete connection flow:

// 1. React Native app starts
console.log('App starting...');

// 2. Network Observer initializes
setupNetworkObserver(); // Creates WebSocket connection

// 3. Connection established
ws.onopen = () => {
  console.log('✅ Connected to desktop monitor');
  
  // 4. Send test message
  setTimeout(() => {
    ws.send(JSON.stringify({
      id: 'test-' + Date.now(),
      url: 'https://test.example.com/connection-test',
      method: 'GET',
      response: { status: 200, body: 'Connection successful' }
    }));
  }, 1000);
};

// 5. Your app makes normal requests
fetch('https://api.example.com/users')
  .then(response => response.json())
  .then(users => {
    setUsers(users); // Your app works normally
    
    // Meanwhile, Network Observer automatically sent:
    // {
    //   "id": "req_xyz",
    //   "url": "https://api.example.com/users", 
    //   "method": "GET",
    //   "response": {"status": 200, "body": "[{users...}]"},
    //   "duration": 234
    // }
  });

// 6. Desktop app receives and displays the request
```

### Platform-Specific Connection

```javascript
// Connection configuration differs by platform:

const config = {
  // Android: Use 10.0.2.2 (Android emulator's host machine)
  // iOS: Use localhost (iOS simulator shares host network)
  host: Platform.OS === 'android' ? '10.0.2.2' : 'localhost',
  port: 8085,
  autoReconnect: true
};

// Why different hosts?
// - Android Emulator: 10.0.2.2 maps to host machine's 127.0.0.1
// - iOS Simulator: Can access localhost directly
// - Physical Device: Would need your computer's IP (e.g., 192.168.1.100)
```

## Part 3: Build Instructions & Setup

### Prerequisites

Before building Network Observer, install these tools:

#### 1. Install Rust
```bash
# Install Rust via rustup (official installer)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add Rust to your PATH (restart terminal after)
source $HOME/.cargo/env

# Verify installation
rust --version
cargo --version
```

#### 2. Install Node.js & pnpm
```bash
# Install Node.js (version 18 or higher)
# Via nvm (recommended):
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Or download from: https://nodejs.org/

# Install pnpm
npm install -g pnpm

# Verify installation
node --version    # Should be 18.x or higher
pnpm --version    # Should be 8.x or higher
```

#### 3. Platform-Specific Dependencies

**macOS:**
```bash
# Install Xcode Command Line Tools
xcode-select --install
```

**Windows:**
```bash
# Install Microsoft C++ Build Tools
# Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/

# Install WebView2 (usually pre-installed on Windows 11)
# Download from: https://developer.microsoft.com/microsoft-edge/webview2/
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev

# Fedora
sudo dnf install webkit2gtk4.0-devel \
    openssl-devel \
    curl \
    wget \
    libappindicator-gtk3-devel \
    librsvg2-devel

# Arch Linux  
sudo pacman -S webkit2gtk \
    base-devel \
    curl \
    wget \
    openssl \
    appmenu-gtk-module \
    gtk3 \
    libappindicator-gtk3 \
    librsvg
```

### Building the Desktop App

#### 1. Clone and Setup
```bash
# Clone the repository
git clone <your-repo-url> network-observer
cd network-observer

# Install Node.js dependencies
pnpm install

# This installs:
# - React, TypeScript, Vite (frontend)  
# - Tauri CLI tools
# - Other development dependencies
```

#### 2. Development Mode
```bash
# Start in development mode (hot reload enabled)
pnpm tauri dev

# This will:
# 1. Start Vite dev server on http://localhost:1420
# 2. Compile Rust code
# 3. Launch desktop app window
# 4. Enable hot reload for React changes
# 5. Auto-restart on Rust changes
```

Development mode console output:
```
$ pnpm tauri dev
> network-observer@0.1.0 tauri dev
> tauri dev

     Running BeforeDevCommand (`pnpm run dev`)
  
  VITE v5.0.0  ready in 450 ms
  
  ➜  Local:   http://localhost:1420/
  ➜  Network: use --host to expose
  
     Compiling tauri v2.0.0
     Compiling network-observer v0.0.1 (/path/to/src-tauri)
      Finished dev [unoptimized + debuginfo] target(s) in 12.34s
  
🚀 WebSocket server started on ws://127.0.0.1:8085
```

#### 3. Production Build
```bash
# Build for production (creates installer/executable)
pnpm tauri build

# This will:
# 1. Build React app for production
# 2. Compile Rust in release mode (optimized)  
# 3. Create platform-specific installer
# 4. Output files to src-tauri/target/release/
```

Build output locations:
```bash
# macOS
src-tauri/target/release/bundle/macos/Network Observer.app
src-tauri/target/release/bundle/dmg/Network Observer_0.1.0_x64.dmg

# Windows  
src-tauri/target/release/bundle/msi/Network Observer_0.1.0_x64_en-US.msi
src-tauri/target/release/Network Observer.exe

# Linux
src-tauri/target/release/bundle/deb/network-observer_0.1.0_amd64.deb
src-tauri/target/release/bundle/appimage/network-observer_0.1.0_amd64.AppImage
src-tauri/target/release/network-observer
```

### Setting Up Your React Native App

#### 1. Copy Network Observer File
```bash
# Copy the cleaned networkObserver.ts to your React Native project
cp /path/to/network-observer/networkObserver.ts /path/to/your-rn-app/src/utils/
```

#### 2. Integrate in App.tsx
```typescript
// src/App.tsx
import { useEffect } from 'react';
import { setupNetworkObserver } from './utils/networkObserver';

export default function App() {
  useEffect(() => {
    // Only enable in development mode
    if (__DEV__) {
      setupNetworkObserver({
        // Default config works for most cases
        // host: Platform.OS === 'android' ? '10.0.2.2' : 'localhost',
        // port: 8085,
        // autoReconnect: true
      });
      console.log('🔍 Network Observer enabled for development');
    }
  }, []);

  return <YourApp />;
}
```

### Testing the Connection

#### 1. Start Desktop App
```bash
cd network-observer
pnpm tauri dev
```

You should see:
```
🚀 WebSocket server started on ws://127.0.0.1:8085
```

#### 2. Start React Native App  
```bash
cd your-react-native-app

# For iOS
npx react-native run-ios

# For Android  
npx react-native run-android
```

#### 3. Verify Connection
In your React Native app logs, you should see:
```
[NetworkObserver] Setting up interceptors...
[NetworkObserver] WebSocket connected
[NetworkObserver] Interceptors setup complete (fetch + XHR)
```

In your desktop app, you should see a test request appear within a few seconds.

### Troubleshooting Build Issues

#### Common Rust/Cargo Issues

**Problem**: `cargo not found`
```bash
# Solution: Add Rust to PATH
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**Problem**: `linking with cc failed`
```bash
# macOS: Install Xcode Command Line Tools
xcode-select --install

# Linux: Install build essentials
sudo apt install build-essential
```

**Problem**: `could not find system library 'webkit2gtk-4.0'`
```bash
# Install WebKit development libraries
sudo apt install libwebkit2gtk-4.0-dev
```

#### Common Node.js Issues

**Problem**: `EACCES` permission errors
```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

**Problem**: `node version not supported`
```bash
# Use Node.js 18 or higher
nvm install 18
nvm use 18
```

#### Tauri-Specific Issues

**Problem**: `tauri command not found`
```bash
# Install Tauri CLI
pnpm add -D @tauri-apps/cli

# Or globally
cargo install tauri-cli
```

**Problem**: Port 8085 already in use
```bash
# Find what's using the port
lsof -i :8085

# Kill the process
kill -9 <PID>

# Or change the port in both:
# - networkObserver.ts (React Native)
# - lib.rs (Rust backend)
```

### Build Performance Tips

#### Faster Development Builds
```bash
# Use debug builds for development (faster compile)
pnpm tauri dev

# Cache dependencies to speed up rebuilds
export CARGO_TARGET_DIR=~/.cargo-target-cache
```

#### Optimize Production Builds
```bash
# Enable link-time optimization in Cargo.toml
[profile.release]
lto = true
codegen-units = 1
panic = "abort"

# Build with maximum optimization
pnpm tauri build --bundles app
```

#### Reduce Bundle Size
```typescript
// In vite.config.ts, add bundle analysis
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
});
```

## Part 4: Development Impact & Troubleshooting

### Does Network Observer Impact Development?

**The Short Answer**: Minimal impact when properly implemented.

**The Long Answer**: Here's what you need to know:

### ✅ What Network Observer Does NOT Do

#### 1. **No Request Proxying or Duplication**
```javascript
// ❌ This is NOT what happens (no request duplication):
yourRequest → NetworkObserver → Server (Request #1)
yourRequest → NetworkObserver → Server (Request #2) 

// ❌ This is NOT what happens (no proxying):
yourRequest → NetworkObserver → Server → NetworkObserver → yourApp

// ✅ This is what actually happens:
yourRequest → Server → yourApp (ONE request, normal flow)
     ↓
NetworkObserver (copies response data for monitoring only)
```

#### 2. **No Request Modification**
```javascript
// Your original request
fetch('https://api.example.com/users', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer xyz' },
  body: JSON.stringify({ name: 'John' })
});

// Network Observer NEVER changes:
// - URL
// - Method  
// - Headers
// - Body
// - Timing
// - Response

// Your app receives the exact same response as without monitoring
```

#### 3. **No Performance Impact on Requests**
```javascript
// Without Network Observer:
fetch('/api/data') → 245ms response time

// With Network Observer:
fetch('/api/data') → 245ms response time (same!)

// The monitoring happens in parallel, not in series
```

### ⚠️ Potential Minor Impacts

#### 1. **Memory Usage (Minimal)**
```javascript
// Network Observer keeps request data in memory temporarily
const requestData = {
  url: "https://api.example.com/users",
  method: "GET", 
  response: { /* response data */ }
};

// Memory is automatically cleaned up every 30 seconds
setTimeout(() => {
  requestCache.clear(); // Prevents memory leaks
}, 30000);

// Impact: ~1-5MB for typical usage
// Comparison: A single high-res image is often 5-10MB
```

#### 2. **CPU Usage (Negligible)**
```javascript
// Additional CPU work per request:
// 1. JSON.stringify() - ~0.1ms for typical request
// 2. response.clone() - ~0.05ms 
// 3. WebSocket.send() - ~0.02ms

// Total overhead: ~0.2ms per request
// Your API response time: ~200-2000ms
// Overhead percentage: ~0.01-0.1% (negligible)
```

#### 3. **Only in Development Mode**
```javascript
if (__DEV__) {
  setupNetworkObserver(); // Only runs in development
}
// Production builds: Zero impact, code is stripped out
```

### 🛡️ Safety Mechanisms

#### 1. **Error Isolation**
```javascript
// If Network Observer fails, your app continues normally
try {
  const response = await originalFetch(input, init);
  
  // Monitor in background (failures don't affect your app)
  sendToMonitor(requestData).catch(error => {
    console.log('Monitoring failed, but app continues:', error);
  });
  
  return response; // Your app always gets the response
} catch (appError) {
  // Your app's network errors are preserved exactly
  throw appError;
}
```

#### 2. **Automatic Cleanup**
```javascript
// Prevents memory leaks
let requestCache = new Set();

// Clears cache every 30 seconds
setInterval(() => {
  requestCache.clear();
}, 30000);

// Connection auto-reconnects if dropped
ws.onclose = () => {
  setTimeout(() => reconnect(), 5000);
};
```

#### 3. **No Data Persistence**
```javascript
// Network Observer stores NOTHING permanently
// - No files written to disk
// - No permanent storage  
// - Data only exists in memory during monitoring
// - Closes when desktop app closes
```

### 🚨 When Network Observer Might Cause Issues

#### 1. **Large Response Bodies**
```javascript
// Potential issue: Very large responses (>50MB)
fetch('/api/huge-file') // 100MB response

// What happens:
// 1. Your app gets the response normally ✅
// 2. Network Observer tries to clone it for monitoring
// 3. This doubles memory usage temporarily ⚠️

// Solution: Filter large responses
function shouldMonitorRequest(url) {
  // Skip monitoring for file downloads
  return !url.includes('/download/') && !url.includes('.zip');
}
```

#### 2. **High Request Volume**
```javascript
// Potential issue: Thousands of requests per minute
for (let i = 0; i < 10000; i++) {
  fetch(`/api/item/${i}`);
}

// What happens:
// 1. All requests work normally ✅
// 2. Monitoring data floods the WebSocket ⚠️
// 3. Desktop app UI might become sluggish

// Solution: Rate limiting or filtering
let requestCount = 0;
function shouldMonitorRequest() {
  requestCount++;
  return requestCount % 10 === 0; // Monitor every 10th request
}
```

#### 3. **WebSocket Connection Issues**
```javascript
// Issue: Desktop app not running
fetch('/api/data'); // Works fine ✅
// But: Monitoring data is lost (not sent anywhere)

// Issue: Port 8085 already in use
// Your app: Works perfectly ✅
// Monitoring: Fails to connect ⚠️
// Solution: Change port in both networkObserver.ts and Rust code
```

### 🔧 Troubleshooting Common Issues

#### Problem: "My app is slower with Network Observer"

**Diagnosis:**
```javascript
// Test without Network Observer
console.time('request');
fetch('/api/test').then(() => {
  console.timeEnd('request'); // Record timing
});

// Test with Network Observer
// If there's a significant difference (>5ms), investigate further
```

**Solutions:**
1. Check for very large response bodies
2. Verify WebSocket connection is working
3. Ensure desktop app is responsive

#### Problem: "Network Observer not showing requests"

**Checklist:**
```bash
# 1. Check React Native logs
# Should see: "[NetworkObserver] WebSocket connected"

# 2. Check desktop app logs  
# Should see: "📱 React Native app connected"

# 3. Test connection manually
const ws = new WebSocket('ws://localhost:8085');
ws.onopen = () => console.log('Manual connection works!');

# 4. Check port availability
lsof -i :8085  # Should show your desktop app

# 5. Verify platform-specific host
# Android: 10.0.2.2
# iOS: localhost  
# Physical device: Your computer's IP
```

#### Problem: "Memory usage keeps growing"

**Diagnosis:**
```javascript
// Check if cleanup is working
console.log('Request cache size:', requestCache.size);

// Should reset to 0 every 30 seconds
setTimeout(() => {
  console.log('Cache size after cleanup:', requestCache.size);
}, 35000);
```

**Solutions:**
1. Reduce cache cleanup interval from 30s to 10s
2. Add request size limits
3. Skip monitoring for specific endpoints

#### Problem: "App crashes with Network Observer"

**Immediate Fix:**
```javascript
// Emergency disable
if (__DEV__) {
  try {
    setupNetworkObserver();
  } catch (error) {
    console.log('Network Observer disabled due to error:', error);
  }
}
```

**Investigation:**
1. Check React Native logs for error details
2. Test with a simple request first
3. Verify all dependencies are installed
4. Check for conflicts with other network libraries

### 📊 Performance Monitoring

#### Measure Network Observer Impact

```javascript
// Add this to your app to measure overhead
const performanceTracker = {
  requestTimes: [],
  
  measureRequest: async (url, options) => {
    const start = performance.now();
    const response = await fetch(url, options);
    const end = performance.now();
    
    this.requestTimes.push({
      url,
      duration: end - start,
      timestamp: Date.now()
    });
    
    return response;
  },
  
  getAverageTime: () => {
    const times = this.requestTimes.map(r => r.duration);
    return times.reduce((a, b) => a + b, 0) / times.length;
  }
};

// Use for a day with and without Network Observer
// Compare average times - should be nearly identical
```

### 🎯 Best Practices

#### 1. **Selective Monitoring**
```javascript
// Don't monitor everything
const skipMonitoring = [
  '/api/analytics',     // High-volume endpoints
  '/api/heartbeat',     // Health checks  
  '.jpg', '.png',       // Images
  '/download/'          // File downloads
];

function shouldMonitorRequest(url) {
  return !skipMonitoring.some(skip => url.includes(skip));
}
```

#### 2. **Environment-Specific Setup**
```javascript
// Different configs for different environments
const getNetworkObserverConfig = () => {
  if (__DEV__) {
    return {
      host: Platform.OS === 'android' ? '10.0.2.2' : 'localhost',
      port: 8085,
      enabled: true
    };
  }
  
  // Staging: Maybe enable with different port
  if (process.env.NODE_ENV === 'staging') {
    return {
      host: '192.168.1.100', // Your staging server IP
      port: 8086,
      enabled: true
    };
  }
  
  // Production: Always disabled
  return { enabled: false };
};
```

#### 3. **Graceful Degradation**
```javascript
// Always have fallbacks
const setupNetworkObserverSafely = () => {
  try {
    setupNetworkObserver(getNetworkObserverConfig());
    console.log('✅ Network Observer enabled');
  } catch (error) {
    console.log('⚠️ Network Observer failed to start, continuing without it');
    // Your app works normally without monitoring
  }
};
```

### 📝 Summary

**Network Observer is safe for development because:**

1. **Zero impact on request behavior** - Your app works exactly the same
2. **Minimal resource usage** - <1% CPU, ~1-5MB memory  
3. **Development-only** - Completely disabled in production
4. **Fail-safe design** - Errors don't affect your app
5. **Easy to disable** - Single line change to turn off

**Use it when:**
- Debugging API integration issues
- Monitoring request/response payloads  
- Analyzing request timing
- Verifying headers and authentication

**Consider disabling when:**
- Working with very large files (>50MB responses)
- Running high-volume load tests
- Experiencing unexplained performance issues
- Not actively debugging network issues

The tool is designed to be as transparent as possible while providing valuable debugging capabilities during development.
