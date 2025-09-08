# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Vue 3 + Vite application that embeds a Unity WebGL page via iframe and provides action buttons to trigger animations through postMessage communication. The app displays a digital avatar (袋袋/Daidai) and allows users to trigger various animations like greetings, gestures, and presentation modes.

## Development Commands

```bash
# Install dependencies
yarn

# Start development server (runs on http://localhost:5173)
yarn dev

# Build for production (includes type checking)
yarn build

# Preview production build
yarn preview

# Type checking only
yarn type-check

# Lint and auto-fix
yarn lint

# Format code
yarn format
```

## Architecture

### Core Components

- **src/App.vue**: Main component containing iframe integration and animation controls
- **src/actions.json**: Animation definitions with metadata (not currently used in App.vue)
- **src/main.ts**: Vue app entry point

### Unity Integration

The app communicates with a Unity WebGL application hosted at `https://cdn.fangmiaokeji.cn/daizi/v2.2/index.html?cc=daidai_2` using postMessage:

- **Outbound**: Send animation commands with structure `{ command: "play_ani", ani_name: "idle06_Happy", requestId: "..." }`
- **Inbound**: Listen for animation completion events with `type: "play_ani_done"`
- **Message Queue**: Buffers messages until Unity signals ready state
- **Request Tracking**: Uses requestId system with 15-second timeout for animation completion

### Animation System

Hardcoded actions array in App.vue:15-33 defines available animations:
- Idle animations (idle01-07): Basic expressions and gestures
- Presentation modes (J00-J05): Lecturing and explanation gestures  
- Special modes (ZZ_mode): Focus/professional mode

### State Management

Key reactive state in App.vue:
- `isUnityReady`: Whether Unity has signaled readiness
- `messageQueue`: Queued messages for Unity
- `pendingRequests`: Map tracking animation completion promises
- `currentUnityUrl`: Unity iframe source URL

## Docker Deployment

Multi-stage build using Node 20 and Nginx:

```bash
# Build and run with Docker Compose
sudo docker compose up -d --build
```

Container runs on port 8888, connects to `avatar-mgmt-jc21-network` external network.

## Code Conventions

- Vue 3 Composition API with TypeScript
- ESLint + Prettier for code formatting
- Vite for bundling with Vue DevTools integration
- Uses `ref()` for reactive state, not reactive objects
- PostMessage communication uses specific TARGET_ORIGIN for security