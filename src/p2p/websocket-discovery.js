import EventEmitter from 'eventemitter3'
import { WebRTCPeer } from './webrtc-peer.js'
import { v4 as uuidv4 } from 'uuid'
import { SIGNALING_URL, WS_RECONNECT_DELAY, DEBUG_MODE } from '../constants'

export class WebSocketDiscovery extends EventEmitter {
  constructor() {
    super()
    this.peerId = uuidv4()
    this.peers = new Map()
    this.roomCode = null
    this.isDestroyed = false
    this.ws = null
    this.reconnectTimeout = null

    console.log(`WebSocket discovery with peer ID: ${this.peerId.slice(0, 8)}`)
  }

  async joinRoom(roomCode) {
    this.roomCode = roomCode

    try {
      await this.connectToSignalingServer()

      // Join room on signaling server
      const joinMessage = {
        type: 'join',
        roomCode,
        peerId: this.peerId,
      }
      console.log('📤 Sending join message:', joinMessage)
      this.sendToServer(joinMessage)

      console.log(`Joining room: ${roomCode}`)
    } catch (err) {
      console.error('Failed to join room:', err)
      this.emit('error', err)
    }
  }

  async connectToSignalingServer() {
    return new Promise((resolve, reject) => {
      try {
        if (DEBUG_MODE) {
          console.log(
            `🔌 Attempting to connect to signaling server at ${SIGNALING_URL}`
          )
        }
        this.ws = new WebSocket(SIGNALING_URL)

        this.ws.onopen = () => {
          console.log('✅ Connected to signaling server')
          this.emit('signalingConnected')
          resolve()
        }

        this.ws.onclose = event => {
          console.log(
            '📴 Signaling server connection closed:',
            event.code,
            event.reason
          )
          this.emit('signalingDisconnected')
          this.handleSignalingDisconnect()
        }

        this.ws.onerror = err => {
          console.error('❌ Signaling server error:', err)
          this.emit('signalingError', err)
          reject(err)
        }

        this.ws.onmessage = event => {
          try {
            const message = JSON.parse(event.data)
            console.log('📩 Received signaling message:', message)
            this.handleSignalingMessage(message)
          } catch (err) {
            console.error('❌ Invalid signaling message:', err)
          }
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  handleSignalingMessage(message) {
    const { type, peerId, roomCode, existingPeers, fromPeer, data } = message

    switch (type) {
      case 'joined':
        console.log(
          `✅ Joined room ${roomCode} with ${existingPeers.length} existing peers`
        )
        this.emit('roomJoined', { roomCode, peerId: this.peerId })

        // Initiate connections to existing peers
        for (const existingPeerId of existingPeers) {
          this.initiateConnection(existingPeerId)
        }
        break

      case 'peer-joined':
        console.log(`👋 New peer joined: ${peerId.slice(0, 8)}`)
        // New peer will initiate connection to us, no action needed
        break

      case 'peer-left':
        console.log(`👋 Peer left: ${peerId.slice(0, 8)}`)
        this.handlePeerDisconnected(peerId)
        break

      case 'signal':
        this.handleWebRTCSignal(fromPeer, data)
        break
    }
  }

  handleSignalingDisconnect() {
    if (this.isDestroyed) return

    // Attempt to reconnect after configured delay
    this.reconnectTimeout = setTimeout(() => {
      if (this.roomCode && !this.isDestroyed) {
        console.log('🔄 Attempting to reconnect to signaling server...')
        this.connectToSignalingServer()
          .then(() => {
            this.sendToServer({
              type: 'join',
              roomCode: this.roomCode,
              peerId: this.peerId,
            })
          })
          .catch(err => {
            console.error('Reconnection failed:', err)
          })
      }
    }, WS_RECONNECT_DELAY)
  }

  sendToServer(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('📤 Sending to server:', message)
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn(
        '❌ Cannot send to signaling server - not connected. ReadyState:',
        this.ws?.readyState
      )
    }
  }

  async initiateConnection(peerId) {
    if (this.peers.has(peerId)) return

    console.log(`🤝 Initiating connection to peer: ${peerId.slice(0, 8)}`)

    const peer = new WebRTCPeer(true, peerId)
    this.peers.set(peerId, peer)
    this.setupPeerHandlers(peerId, peer)
  }

  async acceptConnection(peerId) {
    if (this.peers.has(peerId)) return this.peers.get(peerId)

    console.log(`🤝 Accepting connection from peer: ${peerId.slice(0, 8)}`)

    const peer = new WebRTCPeer(false, peerId)
    this.peers.set(peerId, peer)
    this.setupPeerHandlers(peerId, peer)

    return peer
  }

  setupPeerHandlers(peerId, peer) {
    peer.on('signal', signalData => {
      // Send signaling data through WebSocket server
      this.sendToServer({
        type: 'signal',
        targetPeer: peerId,
        data: signalData,
      })
    })

    peer.on('connect', () => {
      console.log(`🎉 WebRTC connected to peer: ${peerId.slice(0, 8)}`)
      this.emit('peerConnected', { peerId, peer })
    })

    peer.on('data', data => {
      this.emit('peerMessage', { peerId, message: data })
    })

    peer.on('close', () => {
      this.handlePeerDisconnected(peerId)
    })

    peer.on('error', err => {
      console.error(`❌ Peer error ${peerId.slice(0, 8)}:`, err)
      this.handlePeerDisconnected(peerId)
    })
  }

  async handleWebRTCSignal(fromPeer, signalData) {
    let peer = this.peers.get(fromPeer)

    if (!peer) {
      peer = await this.acceptConnection(fromPeer)
    }

    peer.signal(signalData)
  }

  handlePeerDisconnected(peerId) {
    const peer = this.peers.get(peerId)
    if (peer) {
      peer.destroy()
      this.peers.delete(peerId)
    }

    this.emit('peerDisconnected', { peerId })
  }

  sendToPeer(peerId, message) {
    const peer = this.peers.get(peerId)
    if (!peer || !peer.isConnected()) {
      console.warn(`Cannot send to peer ${peerId.slice(0, 8)} - not connected`)
      return false
    }

    return peer.send(message)
  }

  broadcast(message) {
    let successCount = 0

    for (const [_peerId, peer] of this.peers) {
      if (peer.isConnected()) {
        if (peer.send(message)) {
          successCount++
        }
      }
    }

    return successCount
  }

  getConnectedPeers() {
    return Array.from(this.peers.entries())
      .filter(([_, peer]) => peer.isConnected())
      .map(([peerId, peer]) => ({
        peerId,
        state: peer.getConnectionState(),
      }))
  }

  leaveRoom() {
    if (!this.roomCode) return

    // Notify signaling server
    this.sendToServer({
      type: 'leave',
    })

    // Clean up all connections
    for (const [_peerId, peer] of this.peers) {
      peer.destroy()
    }
    this.peers.clear()

    this.roomCode = null
    this.emit('roomLeft')
  }

  destroy() {
    if (this.isDestroyed) return

    this.isDestroyed = true

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    this.leaveRoom()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.removeAllListeners()

    console.log('WebSocket discovery destroyed')
  }
}
