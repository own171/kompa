import '@testing-library/jest-dom'

// Mock WebSocket for tests
global.WebSocket = class WebSocket {
  constructor(url) {
    this.url = url
    this.readyState = WebSocket.CONNECTING
    setTimeout(() => {
      this.readyState = WebSocket.OPEN
      if (this.onopen) this.onopen()
    }, 0)
  }

  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  send() {}
  close() {
    this.readyState = WebSocket.CLOSED
    if (this.onclose) this.onclose()
  }
}

// Mock process.env for tests
process.env.REACT_APP_SIGNALING_URL = 'ws://localhost:8080'
process.env.REACT_APP_DEBUG = 'false'
