# Network Observer

A desktop application for monitoring HTTP/GraphQL requests from React Native apps in real-time.

## Features

- 🚀 Real-time network request monitoring
- 📱 Works with React Native (iOS & Android)
- 🔍 Search and filter requests by URL, method, or status
- 📊 View request/response headers, body, and timing
- 🎯 GraphQL support with operation names and variables
- 🧹 Clear request history
- 🔄 Zero-config setup for most apps

## Quick Start

### 1. Start the Desktop App

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev
```

You should see "Listening on port 8081" in the app header.

### 2. Add to Your React Native App

Copy `react-native-interceptor.js` to your React Native project and add this to your `App.js` or `index.js`:

```javascript
import { setupNetworkObserver } from './react-native-interceptor';

// Only enable in development
if (__DEV__) {
  setupNetworkObserver();
}
```

That's it! The interceptor will automatically capture:
- `fetch()` requests
- `XMLHttpRequest` requests
- Requests from popular libraries like Axios
- GraphQL requests

### 3. Make Network Requests

Run your React Native app and make some network requests. You'll see them appear in the Network Observer desktop app in real-time.

## React Native Setup Examples

### Basic Setup
```javascript
// App.js
import { setupNetworkObserver } from './networkObserver';

export default function App() {
  // Initialize network observer
  useEffect(() => {
    if (__DEV__) {
      setupNetworkObserver();
    }
  }, []);

  return (
    // Your app content
  );
}
```

### With Custom Configuration
```javascript
import { setupNetworkObserver } from './networkObserver';

if (__DEV__) {
  setupNetworkObserver({
    host: 'localhost',    // Default
    port: 8081,          // Default
    autoReconnect: true  // Default
  });
}
```

### With Connection Status
```javascript
import NetworkObserver, { isNetworkObserverConnected } from './networkObserver';

// Check if connected
console.log('Connected:', isNetworkObserverConnected());

// Disconnect manually
NetworkObserver.disconnect();
```

## Supported Libraries

The interceptor works with:
- ✅ `fetch()` API
- ✅ `XMLHttpRequest`
- ✅ Axios
- ✅ Apollo GraphQL
- ✅ React Query/TanStack Query
- ✅ SWR
- ✅ Any library that uses fetch or XMLHttpRequest

## Development

### Building

```bash
# Build for production
pnpm tauri build

# Build for development (faster)
pnpm tauri build --debug
```

### Project Structure

```
network-observer/
├── src/                          # React frontend
│   ├── App.tsx                   # Main UI component
│   └── App.css                   # Styles
├── src-tauri/                    # Tauri backend
│   └── src/
│       └── lib.rs                # WebSocket server & request storage
├── react-native-interceptor.js   # RN interceptor code
└── README.md
```

## Troubleshooting

### "WebSocket connection failed"
- Make sure the desktop app is running
- Check that port 8081 is not blocked by firewall
- Verify your React Native app can reach localhost:8081

### "No requests showing up"
- Ensure the interceptor is initialized before making requests
- Check that `__DEV__` is true in your RN app
- Look for console logs: `[NetworkObserver] Interceptors setup complete`

### GraphQL requests not showing variables
- The interceptor captures the raw request body
- Variables are included in the POST body for most GraphQL clients

## Technical Details

- **WebSocket Server**: Runs on localhost:8081
- **Data Storage**: In-memory only (no persistence)
- **Request Format**: JSON with url, method, headers, body, response, timing
- **Platform Support**: macOS, Windows, Linux (via Tauri)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with a React Native app
5. Submit a pull request