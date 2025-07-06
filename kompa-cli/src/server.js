/**
 * Kompa Server-as-Peer Implementation
 * 
 * This server PARTICIPATES in collaboration rather than just relaying signals.
 * It maintains Y.js CRDT documents and synchronizes with browser peers via WebSocket.
 */

import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import * as Y from 'yjs'
import EventEmitter from 'eventemitter3'

// Export main server class
export class KompaServer extends EventEmitter {
  constructor(options = {}) {
    super()
    this.port = options.port || 8080
    this.host = options.host || '0.0.0.0'
    this.maxRooms = options.maxRooms || 100
    this.roomTimeout = options.roomTimeout || 3600000 // 1 hour
    this.quiet = options.quiet || false
    
    this.server = null
    this.wss = null
    this.peer = null
  }

  async start() {
    this.server = createServer()
    this.peer = new KompaServerPeer(this.maxRooms, this.roomTimeout, this.quiet)
    
    this.setupRoutes()
    
    return new Promise((resolve, reject) => {
      this.server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${this.port} is already in use. Try a different port with -p option.`))
        } else {
          reject(err)
        }
      })
      
      this.server.listen(this.port, this.host, () => {
        // Only create WebSocket server after HTTP server is successfully listening
        try {
          this.wss = new WebSocketServer({ server: this.server })
          this.setupWebSocket()
          resolve()
        } catch (err) {
          reject(err)
        }
      })
    })
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close(() => {
          if (this.server) {
            this.server.close(() => resolve())
          } else {
            resolve()
          }
        })
      } else {
        resolve()
      }
    })
  }

  setupRoutes() {
    this.server.on('request', (req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          status: 'healthy',
          ...this.peer.getStats()
        }))
      } else if (req.url === '/stats') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(this.peer.getStats(), null, 2))
      } else {
        res.writeHead(404)
        res.end('Not Found')
      }
    })
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          this.peer.handleMessage(ws, message)
        } catch (err) {
          // Invalid message ignored
        }
      })

      ws.on('close', () => {
        this.peer.handleLeave(ws)
      })

      ws.on('error', (_err) => {
        this.peer.handleLeave(ws)
      })
    })
  }
}

// Internal server peer manages rooms and participates in CRDT collaboration  
class KompaServerPeer extends EventEmitter {
  constructor(maxRooms = 100, roomTimeout = 3600000, quiet = false) {
    super()
    this.rooms = new Map() // roomCode -> Room instance
    this.connections = new Map() // ws -> ConnectionInfo
    this.serverPeerId = 'server-' + Math.random().toString(36).substr(2, 8)
    this.maxRooms = maxRooms
    this.roomTimeout = roomTimeout
    this.quiet = quiet
    
  }

  // Get or create a room with CRDT document
  getOrCreateRoom(roomCode) {
    if (!this.rooms.has(roomCode)) {
      const room = new Room(roomCode, this.serverPeerId)
      this.rooms.set(roomCode, room)
    }
    return this.rooms.get(roomCode)
  }

  // Handle new browser peer joining
  handleJoin(ws, roomCode, peerId, userName = 'Anonymous') {
    // Leave current room if any
    this.handleLeave(ws)

    const room = this.getOrCreateRoom(roomCode)
    const connectionInfo = {
      peerId,
      roomCode,
      userName,
      ws,
      joinTime: Date.now()
    }

    // Add to room and connection tracking
    room.addPeer(connectionInfo)
    this.connections.set(ws, connectionInfo)


    // Send current document state to new peer
    const documentState = room.getDocumentState()
    const existingPeers = room.getPeerList().filter(p => p.peerId !== peerId)

    ws.send(JSON.stringify({
      type: 'joined',
      peerId,
      roomCode,
      serverPeerId: this.serverPeerId,
      documentState: Array.from(documentState),
      existingPeers: existingPeers.map(p => ({
        peerId: p.peerId,
        userName: p.userName
      }))
    }))

    // Notify other peers of new arrival
    room.broadcast({
      type: 'peer-joined',
      peerId,
      userName
    }, peerId)

    this.emit('peerJoined', { roomCode, peerId, userName })
  }

  // Handle incoming WebSocket messages
  handleMessage(ws, message) {
    const { type, roomCode, peerId, userName, update } = message

    switch (type) {
      case 'join':
        this.handleJoin(ws, roomCode, peerId, userName)
        break
        
      case 'leave':
        this.handleLeave(ws)
        break
        
      case 'crdt-update':
        this.handleCRDTUpdate(ws, update)
        break
        
      case 'cursor-update':
        this.handleCursorUpdate(ws, message)
        break
        
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
        break
        
      default:
    }
  }

  // Handle browser peer leaving
  handleLeave(ws) {
    const connection = this.connections.get(ws)
    if (!connection) return

    const { peerId, roomCode, userName } = connection
    const room = this.rooms.get(roomCode)

    if (room) {
      room.removePeer(peerId)
      
      // Notify remaining peers
      room.broadcast({
        type: 'peer-left',
        peerId
      })

      // Clean up empty rooms (but keep server peer alive briefly)
      if (room.getPeerCount() === 0) {
        setTimeout(() => {
          if (room.getPeerCount() === 0) {
            this.rooms.delete(roomCode)
          }
        }, 30000) // 30 second grace period
      }
    }

    this.connections.delete(ws)

    this.emit('peerLeft', { roomCode, peerId, userName })
  }

  // Handle CRDT updates from browser peers
  handleCRDTUpdate(ws, updateArray) {
    const connection = this.connections.get(ws)
    if (!connection) return

    const { roomCode, peerId } = connection
    const room = this.rooms.get(roomCode)
    if (!room) return

    try {
      // Server applies the update to its CRDT document
      room.applyUpdate(updateArray, peerId)
      
      // Broadcast to all other peers (server participates!)
      room.broadcast({
        type: 'crdt-update',
        update: updateArray,
        fromPeer: peerId
      }, peerId)

      this.emit('documentUpdate', { roomCode, peerId, updateSize: updateArray.length })
    } catch {
      // Update errors ignored
    }
  }

  // Handle cursor updates
  handleCursorUpdate(ws, cursorData) {
    const connection = this.connections.get(ws)
    if (!connection) return

    const { roomCode, peerId } = connection
    const room = this.rooms.get(roomCode)
    if (!room) return

    // Broadcast cursor position to other peers
    room.broadcast({
      type: 'cursor-update',
      peerId,
      position: cursorData.position,
      selection: cursorData.selection,
      timestamp: Date.now()
    }, peerId)
  }

  // Get server statistics
  getStats() {
    const totalPeers = Array.from(this.rooms.values())
      .reduce((sum, room) => sum + room.getPeerCount(), 0)

    return {
      rooms: this.rooms.size,
      totalPeers,
      serverPeerId: this.serverPeerId,
      uptime: process.uptime(),
      roomDetails: Array.from(this.rooms.entries()).map(([code, room]) => ({
        code,
        peers: room.getPeerCount(),
        documentLength: room.getDocumentLength(),
        lastActivity: room.getLastActivity()
      }))
    }
  }
}

// Room class manages a single collaboration session
class Room extends EventEmitter {
  constructor(roomCode, serverPeerId) {
    super()
    this.roomCode = roomCode
    this.serverPeerId = serverPeerId
    this.peers = new Map() // peerId -> ConnectionInfo
    this.lastActivity = Date.now()
    
    // Server participates in CRDT collaboration
    this.ydoc = new Y.Doc()
    this.ytext = this.ydoc.getText('code')
    
    // Track document changes
    this.ytext.observe((_event, _transaction) => {
      this.lastActivity = Date.now()
      
    })
  }

  addPeer(connectionInfo) {
    this.peers.set(connectionInfo.peerId, connectionInfo)
    this.lastActivity = Date.now()
  }

  removePeer(peerId) {
    this.peers.delete(peerId)
    this.lastActivity = Date.now()
  }

  getPeerList() {
    return Array.from(this.peers.values())
  }

  getPeerCount() {
    return this.peers.size
  }

  // Server applies CRDT update to its document
  applyUpdate(updateArray, _fromPeerId) {
    const update = new Uint8Array(updateArray)
    Y.applyUpdate(this.ydoc, update, 'remote')
    this.lastActivity = Date.now()
    
  }

  // Get current document state for new peers
  getDocumentState() {
    return Y.encodeStateAsUpdate(this.ydoc)
  }

  getDocumentLength() {
    return this.ytext.length
  }

  getLastActivity() {
    return this.lastActivity
  }

  // Broadcast message to all peers except sender
  broadcast(message, excludePeerId = null) {
    const messageStr = JSON.stringify(message)
    
    for (const peer of this.peers.values()) {
      if (peer.peerId !== excludePeerId && peer.ws.readyState === 1) {
        try {
          peer.ws.send(messageStr)
        } catch {
          // Send errors ignored
        }
      }
    }
  }
}