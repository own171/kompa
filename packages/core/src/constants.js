// Application constants
export const WS_RECONNECT_DELAY = 3000
export const CURSOR_UPDATE_DEBOUNCE = 100
export const MAX_ROOM_CODE_LENGTH = 50
export const REMOTE_UPDATE_DEBOUNCE = 50
export const PEER_CONNECTION_TIMEOUT = 30000

// WebSocket and signaling
export const SIGNALING_URL = process.env.REACT_APP_SIGNALING_URL || 'ws://localhost:8080'

// UI constants
export const CURSOR_LINE_HEIGHT = 18
export const CURSOR_LABEL_OFFSET = 20
export const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#FFB347', '#87CEEB', '#F0E68C', '#FFE4E1'
]

// Room code generation
export const ROOM_CODE_ADJECTIVES = [
  'swift', 'bright', 'quiet', 'calm', 'bold', 'clever', 'gentle', 'happy', 'kind', 'warm'
]

export const ROOM_CODE_NOUNS = [
  'fox', 'wolf', 'bear', 'eagle', 'tiger', 'shark', 'lion', 'hawk', 'deer', 'owl'
]

// WebRTC configuration
export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]

// Debug mode
export const DEBUG_MODE = process.env.REACT_APP_DEBUG === 'true'