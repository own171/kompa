import SimplePeer from 'simple-peer'
import EventEmitter from 'eventemitter3'
import { ICE_SERVERS } from '../constants'

// Polyfill process.nextTick for browser
if (typeof window !== 'undefined') {
  if (typeof global === 'undefined') {
    window.global = globalThis
  }

  if (typeof process === 'undefined') {
    window.process = {}
  }

  if (typeof process.nextTick !== 'function') {
    window.process.nextTick = (fn, ...args) => {
      setTimeout(() => fn(...args), 0)
    }
    // Also set on global process
    if (typeof global !== 'undefined' && global.process) {
      global.process.nextTick = window.process.nextTick
    }
  }
}

export class WebRTCPeer extends EventEmitter {
  constructor(isInitiator = false, peerId = null) {
    super()
    this.peerId = peerId
    this.isInitiator = isInitiator
    this.peer = null
    this.isDestroyed = false
    this.connectionState = 'disconnected'

    this.createPeer()
  }

  createPeer() {
    try {
      this.peer = new SimplePeer({
        initiator: this.isInitiator,
        trickle: false, // Wait for all ICE candidates
        config: {
          iceServers: ICE_SERVERS,
        },
      })

      this.setupPeerEvents()
    } catch (err) {
      console.error('Failed to create WebRTC peer:', err)
      this.emit('error', err)
    }
  }

  setupPeerEvents() {
    this.peer.on('signal', data => {
      console.log(
        `Signaling data from peer ${this.peerId?.slice(0, 8) || 'unknown'}`
      )
      this.emit('signal', data)
    })

    this.peer.on('connect', () => {
      console.log(
        `WebRTC connected to peer ${this.peerId?.slice(0, 8) || 'unknown'}`
      )
      this.connectionState = 'connected'
      this.emit('connect')
    })

    this.peer.on('data', data => {
      try {
        const message = JSON.parse(data.toString())
        this.emit('data', message)
      } catch (err) {
        console.error('Failed to parse peer data:', err)
      }
    })

    this.peer.on('close', () => {
      console.log(
        `WebRTC connection closed with peer ${this.peerId?.slice(0, 8) || 'unknown'}`
      )
      this.connectionState = 'closed'
      this.emit('close')
    })

    this.peer.on('error', err => {
      console.error(
        `WebRTC error with peer ${this.peerId?.slice(0, 8) || 'unknown'}:`,
        err
      )
      this.connectionState = 'failed'
      this.emit('error', err)
    })
  }

  // Handle signaling data from remote peer
  signal(data) {
    if (this.isDestroyed || !this.peer) return

    try {
      this.peer.signal(data)
    } catch (err) {
      console.error('Failed to process signal:', err)
      this.emit('error', err)
    }
  }

  // Send data to peer
  send(data) {
    if (this.isDestroyed || !this.peer || !this.peer.connected) {
      console.warn('Cannot send data - peer not connected')
      return false
    }

    try {
      const message = JSON.stringify(data)
      this.peer.send(message)
      return true
    } catch (err) {
      console.error('Failed to send data:', err)
      return false
    }
  }

  // Get connection status
  isConnected() {
    return (
      this.peer && this.peer.connected && this.connectionState === 'connected'
    )
  }

  getConnectionState() {
    return this.connectionState
  }

  // Clean up peer connection
  destroy() {
    if (this.isDestroyed) return

    this.isDestroyed = true
    this.connectionState = 'destroyed'

    if (this.peer) {
      this.peer.destroy()
      this.peer = null
    }

    this.removeAllListeners()
    console.log(
      `WebRTC peer destroyed: ${this.peerId?.slice(0, 8) || 'unknown'}`
    )
  }
}
