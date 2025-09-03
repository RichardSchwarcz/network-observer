# Network Observer

A Tauri desktop app that acts as a network inspector for React Native development, similar to browser DevTools Network tab.

## Architecture

- **Tauri Desktop App**: Displays network requests with filtering, search, and timing info
- **WebSocket Server**: Built into Tauri app to receive network data from React Native
- **React Native Integration**: JavaScript interceptor that forwards network requests to the desktop app

## Setup

```bash
pnpm install
pnpm tauri dev
```

## How It Works

1. Start the Network Observer desktop app
2. Add network interceptor to your React Native app
3. RN app sends HTTP/GraphQL request data via WebSocket to the desktop app
4. View requests in real-time with headers, bodies, timing, and filtering

## Next Steps

1. **WebSocket Server** - Add server to receive network data from RN app
2. **UI Components** - Build request list, details view, filters
3. **RN Integration** - Create JavaScript interceptor for React Native
4. **Features** - Add search, filtering, request replay

## Features

- ✅ Tauri v2 + React + Vite + Tailwind CSS
- ⏳ Real-time network request display
- ⏳ Request/response headers and bodies
- ⏳ Timing information
- ⏳ Search and filtering
- ⏳ GraphQL query support
- ⏳ Memory-only storage (no persistence)