# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Network Observer is a Tauri v2 desktop application that acts as a network inspector for React Native development. It consists of:

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **Backend**: Tauri v2 with Rust for desktop app functionality
- **Purpose**: Real-time network request monitoring for React Native apps via WebSocket

## Development Commands

```bash
# Install dependencies
pnpm install

# Run development mode (starts both Vite dev server and Tauri)
pnpm tauri dev

# Build the application
pnpm run build

# Preview production build
pnpm run preview
```

## Architecture

### Frontend Structure
- `src/App.tsx` - Main React component (currently basic Tauri template)
- `src/main.tsx` - React app entry point
- Vite dev server runs on port 1420 with HMR on 1421

### Backend Structure  
- `src-tauri/src/lib.rs` - Main Tauri application logic with commands
- `src-tauri/src/main.rs` - Application entry point
- `src-tauri/Cargo.toml` - Rust dependencies including serde for JSON handling

### Key Technical Details
- Uses Tauri's `invoke` API for frontend-backend communication
- TypeScript strict mode enabled with modern ES2020 target
- Tailwind CSS v4 with PostCSS for styling
- WebSocket server (planned) will listen on port 8080 for React Native connections

## Planned Features
- WebSocket server to receive network data from React Native apps
- Real-time request/response display with headers, bodies, and timing
- Search and filtering capabilities
- GraphQL operation support
- Memory-only storage (no persistence)
- React Native interceptor integration