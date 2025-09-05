# User Stories - Network Observer

## Core Functionality

**As a React Native developer, I want to:**

1. **Start the observer** - Launch the Tauri desktop app and see "Listening on port 8080" status

2. **Connect RN app** - Add interceptor code to my RN app that sends network data to localhost:8080

3. **See requests live** - View HTTP/GraphQL requests in real-time as my RN app makes them

4. **View request details** - Click a request to see headers, body, response, and timing

5. **Filter requests** - Type in search box to filter by URL, method, or status code

6. **Clear history** - Click "Clear" button to remove all requests from the list

## Request Display

**As a developer debugging network issues, I want to:**

7. **See request status** - Identify failed requests with red status codes

8. **View timing info** - See request duration and response times

9. **Copy request data** - Right-click to copy URL, headers, or body

10. **GraphQL support** - See GraphQL operation names and variables clearly

## Integration

**As a team member, I want to:**

11. **Easy setup** - Copy-paste a simple code snippet into my RN app

12. **Zero config** - The interceptor should work with fetch, axios, and GraphQL clients

13. **Dev-only** - The interceptor should only run in development mode

## Technical Requirements

- Desktop app listens on WebSocket port 8080
- RN interceptor sends JSON: `{url, method, headers, body, response, timing}`
- In-memory storage only (no persistence)
- Works with iOS and Android RN apps