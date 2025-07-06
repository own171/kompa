/**
 * @kompa/core - Headless collaboration engine
 */

// CRDT and sync
export { CRDTManager } from './collaboration/crdt.js'
export { SyncManager } from './collaboration/sync-browser.js'

// P2P connections
export { ServerPeerDiscovery } from './p2p/server-peer-discovery.js'

// Utilities
export { 
  generateRoomCode, 
  validateRoomCode, 
  sanitizeRoomCode,
  generatePeerColor,
  debounce
} from './utils/index.js'

// Constants
export { 
  CURSOR_UPDATE_DEBOUNCE,
  DEBUG_MODE
} from './constants.js'