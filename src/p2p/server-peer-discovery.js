import EventEmitter from 'eventemitter3'
import { v4 as uuidv4 } from 'uuid'

/**
 * Server-Peer Discovery
 *
 * Connects directly to server-as-peer via WebSocket for collaboration.
 * No WebRTC complexity - server IS the peer we collaborate with.
 */
export class ServerPeerDiscovery extends EventEmitter {
  constructor(serverUrl = 'ws://localhost:8080') {
    super()
    this.peerId = uuidv4()
    this.serverUrl = serverUrl
    this.roomCode = null
    this.userName = 'Anonymous'
    this.isDestroyed = false
    this.ws = null
    this.reconnectTimeout = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.isConnected = false
    this.serverPeerId = null
    this.peers = new Map() // Track other browser peers in room
  }

  async joinRoom(roomCode, userName = 'Anonymous') {
    this.roomCode = roomCode
    this.userName = userName
    this.reconnectAttempts = 0

    try {
      await this.connectToServerPeer()

      // Join room on server peer
      const joinMessage = {
        type: 'join',
        roomCode,
        peerId: this.peerId,
        userName,
      }

      this.sendToServerPeer(joinMessage)
    } catch (err) {
      this.emit('error', err)
    }
  }

  async connectToServerPeer() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl)

        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'))
        }, 10000)

        this.ws.onopen = () => {
          clearTimeout(timeout)
          this.isConnected = true
          this.reconnectAttempts = 0
          this.emit('serverConnected')
          resolve()
        }

        this.ws.onclose = _event => {
          clearTimeout(timeout)
          this.isConnected = false
          this.emit('serverDisconnected')
          this.handleServerDisconnect()
        }

        this.ws.onerror = err => {
          clearTimeout(timeout)
          this.isConnected = false
          this.emit('serverError', err)
          reject(err)
        }

        this.ws.onmessage = event => {
          try {
            const message = JSON.parse(event.data)
            this.handleServerMessage(message)
          } catch {
            // Invalid message ignored
          }
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  handleServerMessage(message) {
    const { type } = message

    switch (type) {
      case 'joined':
        this.handleRoomJoined(message)
        break

      case 'peer-joined':
        this.handlePeerJoined(message)
        break

      case 'peer-left':
        this.handlePeerLeft(message)
        break

      case 'crdt-update':
        this.handleCRDTUpdate(message)
        break

      case 'cursor-update':
        this.handleCursorUpdate(message)
        break

      case 'pong':
        // Keep-alive response
        break

      default:
      // Unknown message type
    }
  }

  handleRoomJoined(message) {
    const { roomCode, serverPeerId, existingPeers, documentState } = message

    this.serverPeerId = serverPeerId

    // Track existing peers
    if (existingPeers) {
      for (const peer of existingPeers) {
        this.peers.set(peer.peerId, {
          peerId: peer.peerId,
          userName: peer.userName,
          isServerPeer: false,
        })
      }
    }

    // Add server as a special peer
    this.peers.set(serverPeerId, {
      peerId: serverPeerId,
      userName: 'Server',
      isServerPeer: true,
    })

    // Emit room joined with initial document state
    this.emit('roomJoined', {
      roomCode,
      peerId: this.peerId,
      documentState, // Server provides current document state
    })

    // Server peer is immediately "connected" for collaboration
    this.emit('peerConnected', {
      peerId: serverPeerId,
      peer: this, // We ARE the connection to server
      isServerPeer: true,
    })
  }

  handlePeerJoined(message) {
    const { peerId, userName } = message

    this.peers.set(peerId, {
      peerId,
      userName,
      isServerPeer: false,
    })

    // Emit as if this peer connected directly (compatibility)
    this.emit('peerConnected', {
      peerId,
      peer: this, // All communication goes through server
      isServerPeer: false,
    })
  }

  handlePeerLeft(message) {
    const { peerId } = message
    const peer = this.peers.get(peerId)

    if (peer) {
      this.peers.delete(peerId)
      this.emit('peerDisconnected', { peerId })
    }
  }

  handleCRDTUpdate(message) {
    const { update, fromPeer } = message

    // Server relayed a CRDT update from another peer
    this.emit('peerMessage', {
      peerId: fromPeer || this.serverPeerId,
      message: {
        type: 'crdt-update',
        update,
      },
    })
  }

  handleCursorUpdate(message) {
    const { peerId, position, selection } = message

    // Server relayed cursor update from another peer
    this.emit('peerMessage', {
      peerId,
      message: {
        type: 'cursor-update',
        position,
        selection,
        timestamp: message.timestamp,
      },
    })
  }

  handleServerDisconnect() {
    if (this.isDestroyed) return

    // Clear all peer connections since they go through server
    const peerIds = Array.from(this.peers.keys())
    for (const peerId of peerIds) {
      this.emit('peerDisconnected', { peerId })
    }
    this.peers.clear()

    // Attempt reconnection
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)

      this.reconnectTimeout = setTimeout(() => {
        if (this.roomCode && !this.isDestroyed) {
          this.connectToServerPeer()
            .then(() => {
              return this.joinRoom(this.roomCode, this.userName)
            })
            .catch(_err => {
              // Reconnection errors ignored
            })
        }
      }, delay)
    } else {
      this.emit('error', new Error('Unable to reconnect to server peer'))
    }
  }

  sendToServerPeer(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
      return true
    } else {
      return false
    }
  }

  // Compatibility methods for existing code

  sendToPeer(peerId, message) {
    // All messages go through server peer
    if (peerId === this.serverPeerId) {
      // Direct message to server peer
      return this.sendToServerPeer(message)
    } else {
      // Message to another browser peer via server
      return this.sendToServerPeer({
        type: message.type,
        targetPeer: peerId,
        ...message,
      })
    }
  }

  broadcast(message) {
    // Broadcast through server peer
    return this.sendToServerPeer(message) ? 1 : 0
  }

  getConnectedPeers() {
    return Array.from(this.peers.entries()).map(([peerId, peer]) => ({
      peerId,
      state: this.isConnected ? 'connected' : 'disconnected',
      userName: peer.userName,
      isServerPeer: peer.isServerPeer,
    }))
  }

  // Keep connection alive
  startKeepAlive() {
    this.keepAliveInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendToServerPeer({ type: 'ping' })
      }
    }, 30000) // 30 seconds
  }

  stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval)
      this.keepAliveInterval = null
    }
  }

  leaveRoom() {
    if (!this.roomCode) return

    // Notify server peer
    this.sendToServerPeer({
      type: 'leave',
    })

    // Clear local state
    this.peers.clear()
    this.roomCode = null
    this.serverPeerId = null

    this.emit('roomLeft')
  }

  destroy() {
    if (this.isDestroyed) return

    this.isDestroyed = true
    this.isConnected = false

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    this.stopKeepAlive()
    this.leaveRoom()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.removeAllListeners()
  }
}
