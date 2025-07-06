#!/usr/bin/env node

// Simple WebSocket signaling server for P2P connections
// Run with: node signaling-server.js

import { WebSocketServer } from 'ws'
import { createServer } from 'http'

const PORT = 8080
const server = createServer()
const wss = new WebSocketServer({ server })

const rooms = new Map() // roomCode -> Set of connections
const connections = new Map() // ws -> { peerId, roomCode }

console.log(`🚀 P2P Signaling Server starting on port ${PORT}`)

wss.on('connection', (ws) => {
  console.log('📱 New connection')

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString())
      handleMessage(ws, message)
    } catch (err) {
      console.error('❌ Invalid message:', err)
    }
  })

  ws.on('close', () => {
    handleDisconnection(ws)
  })

  ws.on('error', (err) => {
    console.error('❌ WebSocket error:', err)
    handleDisconnection(ws)
  })
})

function handleMessage(ws, message) {
  const { type, roomCode, peerId, targetPeer, data } = message

  switch (type) {
    case 'join':
      handleJoin(ws, roomCode, peerId)
      break
    case 'leave':
      handleLeave(ws)
      break
    case 'signal':
      handleSignal(ws, targetPeer, data)
      break
    default:
      console.warn('⚠️ Unknown message type:', type)
  }
}

function handleJoin(ws, roomCode, peerId) {
  // Leave current room if any
  handleLeave(ws)

  // Join new room
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, new Set())
  }

  const room = rooms.get(roomCode)
  room.add(ws)
  connections.set(ws, { peerId, roomCode })

  console.log(`✅ Peer ${peerId.slice(0, 8)} joined room ${roomCode}`)

  // Notify peer of existing peers in room
  const existingPeers = Array.from(room)
    .filter(conn => conn !== ws)
    .map(conn => connections.get(conn)?.peerId)
    .filter(Boolean)

  ws.send(JSON.stringify({
    type: 'joined',
    peerId,
    roomCode,
    existingPeers
  }))

  // Notify existing peers of new peer
  broadcastToRoom(roomCode, {
    type: 'peer-joined',
    peerId
  }, ws)
}

function handleLeave(ws) {
  const connection = connections.get(ws)
  if (!connection) return

  const { peerId, roomCode } = connection
  const room = rooms.get(roomCode)

  if (room) {
    room.delete(ws)
    
    // Clean up empty rooms
    if (room.size === 0) {
      rooms.delete(roomCode)
    } else {
      // Notify remaining peers
      broadcastToRoom(roomCode, {
        type: 'peer-left',
        peerId
      })
    }
  }

  connections.delete(ws)
  console.log(`👋 Peer ${peerId?.slice(0, 8)} left room ${roomCode}`)
}

function handleSignal(ws, targetPeer, signalData) {
  const senderConnection = connections.get(ws)
  if (!senderConnection) return

  const { roomCode, peerId: senderPeerId } = senderConnection
  const room = rooms.get(roomCode)
  if (!room) return

  // Find target peer in same room
  for (const conn of room) {
    const connData = connections.get(conn)
    if (connData?.peerId === targetPeer) {
      conn.send(JSON.stringify({
        type: 'signal',
        fromPeer: senderPeerId,
        data: signalData
      }))
      break
    }
  }
}

function handleDisconnection(ws) {
  handleLeave(ws)
}

function broadcastToRoom(roomCode, message, exclude = null) {
  const room = rooms.get(roomCode)
  if (!room) return

  const messageStr = JSON.stringify(message)
  
  for (const conn of room) {
    if (conn !== exclude && conn.readyState === 1) {
      conn.send(messageStr)
    }
  }
}

server.listen(PORT, () => {
  console.log(`🎉 Signaling server running on ws://localhost:${PORT}`)
  console.log('📋 Available commands:')
  console.log('   - Join room: {"type":"join","roomCode":"test","peerId":"abc123"}')
  console.log('   - Signal peer: {"type":"signal","targetPeer":"def456","data":{...}}')
  console.log('   - Leave room: {"type":"leave"}')
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down signaling server...')
  wss.close(() => {
    server.close(() => {
      console.log('✅ Server closed')
      process.exit(0)
    })
  })
})