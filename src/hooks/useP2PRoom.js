import { useState, useEffect, useRef } from 'react'
import { WebSocketDiscovery } from '../p2p/websocket-discovery.js'
import { CRDTManager } from '../collaboration/crdt.js'
import { SyncManager } from '../collaboration/sync-browser.js'
import { generatePeerColor } from '../utils'

export function useP2PRoom(roomCode) {
  const [isConnected, setIsConnected] = useState(false)
  const [peers, setPeers] = useState([])
  const [connectionState, setConnectionState] = useState('disconnected')
  const [error, setError] = useState(null)

  const discovery = useRef(null)
  const crdtManager = useRef(null)
  const syncManager = useRef(null)

  const [cursors, setCursors] = useState({})
  const [users, setUsers] = useState({})

  useEffect(() => {
    if (!roomCode) return

    let mounted = true
    let initTimeout = null

    const initializeRoom = async () => {
      try {
        setConnectionState('connecting')
        setError(null)

        // Add small delay to ensure single initialization
        initTimeout = setTimeout(async () => {
          if (!mounted) return

          // Initialize CRDT manager
          crdtManager.current = new CRDTManager()

          // Initialize WebSocket discovery
          discovery.current = new WebSocketDiscovery()

          // Initialize sync manager (simplified for browser-based P2P)
          syncManager.current = new SyncManager(
            discovery.current,
            crdtManager.current
          )

          // Set up event handlers
          setupEventHandlers()

          // Join room
          await discovery.current.joinRoom(roomCode)

          if (mounted) {
            setIsConnected(true)
          }
        }, 100)
      } catch (err) {
        console.error('Failed to initialize room:', err)
        if (mounted) {
          setError(err.message)
          setConnectionState('failed')
        }
      }
    }

    const setupEventHandlers = () => {
      // Signaling server events
      discovery.current.on('signalingConnected', () => {
        if (!mounted) return
        console.log('🟢 Signaling server connected')
        setConnectionState('connecting') // Still connecting to peers
      })

      discovery.current.on('signalingDisconnected', () => {
        if (!mounted) return
        console.log('🔴 Signaling server disconnected')
        setConnectionState('disconnected')
      })

      discovery.current.on('signalingError', err => {
        if (!mounted) return
        console.error('❌ Signaling error:', err)
        setError('Signaling server connection failed')
        setConnectionState('failed')
      })

      discovery.current.on('roomJoined', ({ roomCode: joinedRoom }) => {
        if (!mounted) return
        console.log(`🏠 Joined room: ${joinedRoom}`)
        setConnectionState('connected')
      })

      // Discovery events
      discovery.current.on('peerConnected', ({ peerId }) => {
        if (!mounted) return

        console.log(`🤝 Peer connected: ${peerId.slice(0, 8)}`)
        updatePeerList()
      })

      discovery.current.on('peerDisconnected', ({ peerId }) => {
        if (!mounted) return

        console.log(`👋 Peer disconnected: ${peerId.slice(0, 8)}`)
        updatePeerList()
        removePeerFromState(peerId)
      })

      discovery.current.on('peerMessage', ({ peerId, message }) => {
        if (!mounted) return

        // Handle peer messages (collaboration data)
        syncManager.current?.handlePeerMessage?.(peerId, message)
      })

      // Sync events
      syncManager.current.on(
        'cursorUpdate',
        ({ peerId, position, selection }) => {
          if (!mounted) return

          setCursors(prev => ({
            ...prev,
            [peerId]: {
              position,
              selection,
              timestamp: Date.now(),
              color: generatePeerColor(peerId),
            },
          }))
        }
      )

      syncManager.current.on('userAwareness', ({ peerId, user }) => {
        if (!mounted) return

        setUsers(prev => ({
          ...prev,
          [peerId]: user,
        }))
      })

      // Error handling
      discovery.current.on('error', err => {
        if (!mounted) return

        console.error('Discovery error:', err)
        setError(err.message)
      })
    }

    const updatePeerList = () => {
      if (!mounted) return

      const connectedPeers = discovery.current?.getConnectedPeers() || []
      setPeers(connectedPeers)
    }

    const removePeerFromState = peerId => {
      setCursors(prev => {
        const newCursors = { ...prev }
        delete newCursors[peerId]
        return newCursors
      })

      setUsers(prev => {
        const newUsers = { ...prev }
        delete newUsers[peerId]
        return newUsers
      })
    }

    initializeRoom()

    return () => {
      mounted = false

      // Clear timeout if pending
      if (initTimeout) {
        clearTimeout(initTimeout)
        initTimeout = null
      }

      // Clean up resources in proper order
      try {
        if (syncManager.current) {
          syncManager.current.destroy()
          syncManager.current = null
        }

        if (crdtManager.current) {
          crdtManager.current.destroy()
          crdtManager.current = null
        }

        if (discovery.current) {
          discovery.current.destroy()
          discovery.current = null
        }
      } catch (err) {
        console.warn('Error during cleanup:', err)
      }
    }
  }, [roomCode])

  const sendOperation = operation => {
    if (!syncManager.current) return

    switch (operation.type) {
      case 'text-insert':
        syncManager.current.insertText(operation.index, operation.text)
        break
      case 'text-delete':
        syncManager.current.deleteText(operation.index, operation.length)
        break
      case 'text-replace':
        syncManager.current.replaceText(
          operation.index,
          operation.length,
          operation.text
        )
        break
      case 'cursor-move':
        syncManager.current.broadcastCursor(
          operation.position,
          operation.selection
        )
        break
      case 'user-awareness':
        syncManager.current.broadcastUserAwareness(operation.user)
        break
    }
  }

  const getText = () => {
    return syncManager.current?.getText() || ''
  }

  const setText = text => {
    syncManager.current?.setText(text)
  }

  const applyMonacoDelta = delta => {
    syncManager.current?.applyMonacoDelta(delta)
  }

  const getStats = () => {
    return {
      room: roomCode,
      isConnected,
      connectionState,
      peers: peers.length,
      sync: syncManager.current?.getStats() || {},
    }
  }

  return {
    isConnected,
    peers,
    connectionState,
    error,
    cursors,
    users,
    sendOperation,
    getText,
    setText,
    applyMonacoDelta,
    getStats,
    syncManager: syncManager.current,
  }
}
