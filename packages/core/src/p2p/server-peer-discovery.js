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

    console.log(`🐙 Server-Peer Discovery with peer ID: ${this.peerId.slice(0, 8)}`)
    console.log(`🔗 Will connect to: ${serverUrl}`)
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
        userName
      }
      
      console.log('📤 Sending join message to server peer:', joinMessage)
      this.sendToServerPeer(joinMessage)
      
    } catch (err) {
      console.error('❌ Failed to join room via server peer:', err)
      this.emit('error', err)
    }
  }

  async connectToServerPeer() {
    return new Promise((resolve, reject) => {
      try {
        console.log(`🔌 Connecting to server peer at ${this.serverUrl}`)
        this.ws = new WebSocket(this.serverUrl)

        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'))
        }, 10000)

        this.ws.onopen = () => {
          clearTimeout(timeout)
          this.isConnected = true
          this.reconnectAttempts = 0
          console.log('✅ Connected to server peer')
          this.emit('serverConnected')
          resolve()
        }

        this.ws.onclose = (event) => {
          clearTimeout(timeout)
          this.isConnected = false
          console.log('📴 Server peer connection closed:', event.code, event.reason)
          this.emit('serverDisconnected')
          this.handleServerDisconnect()
        }

        this.ws.onerror = (err) => {
          clearTimeout(timeout)
          this.isConnected = false
          console.error('❌ Server peer connection error:', err)
          this.emit('serverError', err)
          reject(err)
        }

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            this.handleServerMessage(message)
          } catch (err) {
            console.error('❌ Invalid message from server peer:', err)
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
        console.warn('⚠️ Unknown message type from server peer:', type)
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
          isServerPeer: false
        })
      }
    }
    
    // Add server as a special peer
    this.peers.set(serverPeerId, {
      peerId: serverPeerId,
      userName: 'Server',
      isServerPeer: true
    })

    console.log(`✅ Joined room ${roomCode} via server peer`)
    console.log(`📋 ${existingPeers?.length || 0} existing peers in room`)
    
    // Emit room joined with initial document state
    this.emit('roomJoined', { 
      roomCode, 
      peerId: this.peerId,
      documentState // Server provides current document state
    })

    // Server peer is immediately "connected" for collaboration
    this.emit('peerConnected', { 
      peerId: serverPeerId, 
      peer: this, // We ARE the connection to server
      isServerPeer: true
    })
  }

  handlePeerJoined(message) {
    const { peerId, userName } = message
    
    this.peers.set(peerId, {
      peerId,
      userName,
      isServerPeer: false
    })
    
    console.log(`👋 New peer joined via server: ${userName} (${peerId.slice(0, 8)})`)
    
    // Emit as if this peer connected directly (compatibility)
    this.emit('peerConnected', { 
      peerId, 
      peer: this, // All communication goes through server
      isServerPeer: false
    })
  }

  handlePeerLeft(message) {
    const { peerId } = message
    const peer = this.peers.get(peerId)
    
    if (peer) {
      console.log(`👋 Peer left: ${peer.userName} (${peerId.slice(0, 8)})`)
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
        update
      }
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
        timestamp: message.timestamp
      }
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
      
      console.log(`🔄 Reconnecting to server peer in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      
      this.reconnectTimeout = setTimeout(() => {
        if (this.roomCode && !this.isDestroyed) {
          this.connectToServerPeer()
            .then(() => {
              return this.joinRoom(this.roomCode, this.userName)
            })
            .catch(err => {
              console.error('❌ Reconnection failed:', err)
            })
        }
      }, delay)
    } else {
      console.error('❌ Max reconnection attempts reached')
      this.emit('error', new Error('Unable to reconnect to server peer'))
    }
  }

  sendToServerPeer(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
      return true
    } else {
      console.warn('❌ Cannot send to server peer - not connected')
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
        ...message
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
      isServerPeer: peer.isServerPeer
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

    console.log(`👋 Leaving room ${this.roomCode}`)

    // Notify server peer
    this.sendToServerPeer({
      type: 'leave'
    })

    // Clear local state
    this.peers.clear()
    this.roomCode = null
    this.serverPeerId = null
    
    this.emit('roomLeft')
  }

  destroy() {
    if (this.isDestroyed) return

    console.log('🗑️ Destroying server peer discovery')
    
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