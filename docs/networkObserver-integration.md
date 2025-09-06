# Network Observer Integration Guide

This document explains how to integrate the `networkObserver.ts` utility into your React Native projects for real-time network monitoring with the Network Observer desktop app.

## Overview

The Network Observer system consists of two components:

1. **Desktop App** (this repository): A Tauri-based app that receives and displays network data
2. **Mobile Integration** (`networkObserver.ts`): A TypeScript utility that intercepts network requests in your React Native app

## Quick Start

### 1. Copy the networkObserver.ts File

Copy `networkObserver.ts` into your React Native project:

```bash
# From your React Native project root
mkdir -p src/utils
cp path/to/networkObserver.ts src/utils/
```

### 2. Basic Integration

```typescript
// In your App.tsx or main entry file
import { setupNetworkObserver } from './src/utils/networkObserver';

export default function App() {
  useEffect(() => {
    // Set up network monitoring in development
    setupNetworkObserver({
      logging: 'minimal' // Options: 'silent', 'minimal', 'verbose'
    });

    // Optional: Clean up when app unmounts
    return () => {
      disconnectNetworkObserver();
    };
  }, []);

  return (
    // Your app components
  );
}
```

### 3. Start the Desktop App

Run the Network Observer desktop app to receive the network data:

```bash
cd path/to/network-observer
pnpm tauri dev
```

## Configuration Options

```typescript
interface NetworkObserverConfig {
  host?: string;           // WebSocket server host
  port?: number;          // WebSocket server port  
  autoReconnect?: boolean; // Enable automatic reconnection
  logging?: 'silent' | 'minimal' | 'verbose'; // Logging level
}
```

### Default Configuration

```typescript
setupNetworkObserver({
  host: Platform.OS === 'android' ? '10.0.2.2' : 'localhost',
  port: 8085,
  autoReconnect: true,
  logging: 'minimal'
});
```

### Android Development

For Android development, the utility automatically uses `10.0.2.2` (the host machine IP as seen from the Android emulator). For physical devices, you may need to specify your development machine's IP address:

```typescript
setupNetworkObserver({
  host: '192.168.1.100', // Your development machine's IP
  port: 8085
});
```

## Logging Levels

The utility supports three logging levels to control console output:

- **`'silent'`**: No logging output
- **`'minimal'`**: Connection status and errors only
- **`'verbose'`**: All network interceptions and detailed debugging info

```typescript
// For production debugging
setupNetworkObserver({ logging: 'verbose' });

// For clean console output  
setupNetworkObserver({ logging: 'minimal' });

// To completely disable logging
setupNetworkObserver({ logging: 'silent' });
```

## How It Works

### Request Interception

The utility intercepts network requests using two methods:

1. **Fetch API**: Replaces `global.fetch` to capture modern HTTP requests
2. **XMLHttpRequest**: Replaces `global.XMLHttpRequest` to capture requests from libraries like Axios

### Deduplication System

To prevent infinite loops and duplicate requests:

- Creates unique signatures based on method, URL, body hash, and response status
- Uses time-based deduplication (2-second window)
- Automatic cache cleanup to prevent memory leaks

### WebSocket Connection

- Connects to the desktop app via WebSocket on port 8085
- Automatic reconnection with exponential backoff (5s → 10s → 20s → 30s max)
- Graceful handling of connection failures

## Troubleshooting

### Common Issues

**1. Connection Refused**
```
[NetworkObserver] WebSocket error: Connection refused
```
**Solution**: Ensure the Network Observer desktop app is running and the port (8085) is not blocked.

**2. Duplicate Requests**
If you see duplicate requests despite deduplication:
- Check if multiple instances of `setupNetworkObserver()` are being called
- Verify that libraries aren't making duplicate calls
- Enable `'verbose'` logging to debug the deduplication logic

**3. Android Connectivity Issues**
**Solution**: For physical Android devices, use your development machine's IP address instead of `localhost`.

### Debug Mode

Enable verbose logging for debugging:

```typescript
setupNetworkObserver({ 
  logging: 'verbose' 
});
```

This will show:
- All intercepted requests
- WebSocket connection status  
- Deduplication decisions
- Cache cleanup operations

## Performance Considerations

### Memory Management

The utility includes automatic memory management:

- Request cache is cleaned up every minute
- Old entries (5+ minutes) are automatically removed
- Timers are cleared on disconnect

### Request Deduplication

The deduplication system prevents:
- Infinite loops from interceptor conflicts
- Duplicate submissions during reconnections  
- Memory leaks from abandoned requests

### Production Usage

⚠️ **Important**: The utility only runs in development mode (`__DEV__ === true`). It automatically disables itself in production builds to prevent performance impact.

## Advanced Configuration

### Custom WebSocket Server

If running the desktop app on a different port:

```typescript
setupNetworkObserver({
  host: 'localhost',
  port: 9090 // Custom port
});
```

### Selective Monitoring

To monitor only specific requests, you can modify the interceptor logic or add URL filtering:

```typescript
// Example: Only monitor API requests
if (url.includes('/api/')) {
  sendRequestData(requestData);
}
```

### Integration with Existing Network Libraries

The utility works automatically with:
- Fetch API
- Axios (via XMLHttpRequest interception)
- React Query / TanStack Query
- Apollo Client
- Any library using fetch or XMLHttpRequest

## Cleanup

Always clean up when the observer is no longer needed:

```typescript
import { disconnectNetworkObserver } from './src/utils/networkObserver';

// In component cleanup or app termination
disconnectNetworkObserver();
```

This will:
- Close WebSocket connections
- Restore original fetch/XMLHttpRequest
- Clear all timers and caches
- Reset internal state

## Security Notes

- The utility only operates in development builds
- Network data is sent over local WebSocket connections only
- No data is persisted or sent to external servers
- Original request/response behavior is preserved

## Support

For issues with the network observer integration:

1. Check that both the mobile app and desktop app are on the same network
2. Verify the WebSocket port (8085) is accessible
3. Enable verbose logging to debug connection issues
4. Ensure you're running in development mode (`__DEV__ === true`)
5. Check the `.logs` folders in both repositories for detailed application logs