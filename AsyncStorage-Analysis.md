# AsyncStorage Access Analysis for Network Observer

## Executive Summary

**Can we display AsyncStorage values from React Native apps in Network Observer?**
- **Yes, with modifications to the React Native interceptor**

**Can we modify AsyncStorage like cookies in the browser?**  
- **Yes, but with important security and architectural considerations**

## Technical Feasibility

### Current State
The Network Observer currently captures network requests via WebSocket from React Native apps using the interceptor in `react-native-interceptor.js`. The app has:

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Tauri v2 with Rust WebSocket server on port 8085
- **Communication**: JSON over WebSocket

### AsyncStorage in the Mobile App
The mobile app extensively uses AsyncStorage for:
- Authentication tokens (`CustomerToken`, `CustomerGroup`, `PhpSessionId`)
- User preferences (`Locale`, `isOnboarded`)
- App state (`NotificationsOnboardedGroup`, `PendingBlikPayment`)
- Shopping data (`BoxpiCollectionPoint`, `SelectedAlternativePaymentMethod`)

## Implementation Approach

### 1. AsyncStorage Reading/Display

**Method**: Extend the React Native interceptor to capture AsyncStorage operations

```javascript
// Enhanced interceptor functionality
export function setupAsyncStorageObserver() {
  const originalAsyncStorage = {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
    removeItem: AsyncStorage.removeItem,
    clear: AsyncStorage.clear,
    getAllKeys: AsyncStorage.getAllKeys,
  };

  // Intercept AsyncStorage operations
  AsyncStorage.setItem = async (key, value) => {
    const result = await originalAsyncStorage.setItem(key, value);
    sendAsyncStorageData({
      operation: 'setItem',
      key,
      value,
      timestamp: Date.now(),
    });
    return result;
  };

  // Similar for getItem, removeItem, etc.
}
```

**Network Observer Changes Required**:
1. **Rust backend**: Add new WebSocket message types for AsyncStorage operations
2. **Frontend**: New UI panel for AsyncStorage data alongside network requests
3. **Data structure**: Extend request store to include AsyncStorage operations

### 2. AsyncStorage Modification Capabilities

**Method**: Bidirectional WebSocket communication for AsyncStorage manipulation

```javascript
// In the React Native interceptor
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'asyncstorage-command') {
    switch (message.command) {
      case 'setItem':
        AsyncStorage.setItem(message.key, message.value);
        break;
      case 'removeItem':
        AsyncStorage.removeItem(message.key);
        break;
      case 'clear':
        AsyncStorage.clear();
        break;
    }
  }
};
```

**Network Observer UI Features**:
- AsyncStorage viewer panel
- Key-value editor with add/edit/delete capabilities  
- Real-time sync with React Native app
- Search and filter functionality

## Comparison with Browser Cookie Manipulation

| Feature | Browser Cookies | React Native AsyncStorage |
|---------|----------------|---------------------------|
| **Developer Access** | Chrome DevTools Application panel | Requires custom interceptor |
| **Real-time View** | ✅ Built-in | ✅ Possible with interceptor |
| **Modification** | ✅ Direct via DevTools/JS | ✅ Via WebSocket commands |
| **Persistence** | ✅ Automatic | ✅ Automatic |
| **Security** | 🔒 Sandboxed per origin | 🔓 Unencrypted key-value store |
| **Cross-app Access** | ❌ Same origin only | ❌ Same app only |

## Security & Architectural Considerations

### Security Limitations
1. **AsyncStorage is unencrypted** - All data stored in plain text
2. **App sandbox isolation** - Cannot access other apps' AsyncStorage
3. **No built-in access control** - Any code can read/write AsyncStorage
4. **Root access vulnerability** - Jailbroken devices can access raw files

### Recommended Implementation
1. **Development mode only** - Enable AsyncStorage manipulation only in `__DEV__` mode
2. **Sensitive data warning** - Alert developers about unencrypted storage risks
3. **Selective exposure** - Allow developers to configure which keys to expose
4. **Audit logging** - Track all AsyncStorage modifications from Network Observer

## Implementation Plan

### Phase 1: AsyncStorage Reading
- [ ] Extend React Native interceptor to capture AsyncStorage operations
- [ ] Add AsyncStorage data structures to Rust backend  
- [ ] Create AsyncStorage viewer panel in frontend
- [ ] Implement real-time sync

### Phase 2: AsyncStorage Modification
- [ ] Add bidirectional WebSocket communication
- [ ] Implement AsyncStorage command system
- [ ] Build key-value editor UI
- [ ] Add safety features (dev mode only, confirmations)

### Phase 3: Advanced Features
- [ ] AsyncStorage diff viewer (before/after changes)
- [ ] Export/import AsyncStorage data
- [ ] AsyncStorage size monitoring (6MB limit tracking)
- [ ] Integration with existing network request correlation

## Technical Challenges

1. **Performance Impact**: Intercepting every AsyncStorage operation may affect app performance
2. **Data Synchronization**: Ensuring Network Observer UI stays in sync with app state
3. **Large Data Handling**: AsyncStorage can contain large JSON objects (2MB per entry limit)
4. **WebSocket Message Ordering**: Ensuring operations are processed in correct order

## Conclusion

**AsyncStorage display and modification is technically feasible** and would provide valuable debugging capabilities similar to browser cookie manipulation. The implementation requires:

1. **Moderate complexity**: Extending existing WebSocket infrastructure
2. **Development focus**: Should be limited to development/debugging scenarios
3. **Security awareness**: Clear warnings about AsyncStorage's unencrypted nature
4. **Performance considerations**: Optional opt-in feature to minimize impact

This feature would significantly enhance the Network Observer's utility for React Native developers by providing comprehensive app state visibility and manipulation capabilities.