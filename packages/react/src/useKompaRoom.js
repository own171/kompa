/**
 * useKompaRoom - React hook for Kompa collaboration
 * Simplified version of the full useP2PRoom hook
 */

import { useState, useEffect, useRef } from 'react'
import { 
  ServerPeerDiscovery, 
  CRDTManager, 
  SyncManager,
  generatePeerColor 
} from '@kompa/core'

export function useKompaRoom(roomCode, options = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [peers, setPeers] = useState([])
  const [connectionState, setConnectionState] = useState('disconnected')
  const [error, setError] = useState(null)
  const [cursors, setCursors] = useState({})

  const discovery = useRef(null)
  const crdtManager = useRef(null)
  const syncManager = useRef(null)

  const {
    mode = 'server-peer',
    serverUrl = 'ws://localhost:8080',
    userName = 'Anonymous'
  } = options

  useEffect(() => {
    if (!roomCode) return

    let mounted = true

    const initializeRoom = async () => {
      try {
        setConnectionState('connecting')
        setError(null)

        // Initialize CRDT manager
        crdtManager.current = new CRDTManager()

        // Initialize server-peer discovery
        discovery.current = new ServerPeerDiscovery(serverUrl)

        // Initialize sync manager
        syncManager.current = new SyncManager(
          discovery.current,
          crdtManager.current
        )

        // Set up event handlers
        setupEventHandlers()

        // Join room
        await discovery.current.joinRoom(roomCode, userName)

        if (mounted) {
          setIsConnected(true)
          setConnectionState('connected')
        }
      } catch (err) {
        console.error('Failed to initialize Kompa room:', err)
        if (mounted) {
          setError(err.message)
          setConnectionState('failed')
        }
      }
    }

    const setupEventHandlers = () => {
      // Server connection events
      discovery.current.on('serverConnected', () => {
        if (!mounted) return
        setConnectionState('connecting')
      })

      discovery.current.on('serverDisconnected', () => {
        if (!mounted) return
        setConnectionState('disconnected')
        setIsConnected(false)
      })

      discovery.current.on('serverError', (err) => {
        if (!mounted) return
        setError('Server connection failed: ' + err.message)
        setConnectionState('failed')
      })

      // Room events
      discovery.current.on('roomJoined', ({ roomCode: joinedRoom, documentState }) => {
        if (!mounted) return
        setConnectionState('connected')
        setIsConnected(true)
        
        // Apply initial document state
        if (documentState && crdtManager.current) {
          crdtManager.current.applyRemoteUpdate(documentState)
        }
      })

      // Peer events
      discovery.current.on('peerConnected', ({ peerId, isServerPeer }) => {
        if (!mounted) return
        updatePeerList()
      })

      discovery.current.on('peerDisconnected', ({ peerId }) => {
        if (!mounted) return
        updatePeerList()
        removePeerCursor(peerId)
      })

      // Collaboration events
      syncManager.current.on('cursorUpdate', ({ peerId, position, selection }) => {
        if (!mounted) return
        
        setCursors(prev => ({
          ...prev,
          [peerId]: {
            position,
            selection,
            timestamp: Date.now(),
            color: generatePeerColor(peerId)
          }
        }))
      })

      syncManager.current.on('documentChange', ({ delta }) => {
        if (!mounted) return
        // Document changed - this would trigger editor updates
      })
    }

    const updatePeerList = () => {
      if (!mounted || !discovery.current) return
      
      const connectedPeers = discovery.current.getConnectedPeers() || []
      setPeers(connectedPeers)
    }

    const removePeerCursor = (peerId) => {
      setCursors(prev => {
        const newCursors = { ...prev }
        delete newCursors[peerId]
        return newCursors
      })
    }

    initializeRoom()

    return () => {
      mounted = false
      
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
        console.warn('Error during Kompa cleanup:', err)
      }
    }
  }, [roomCode, serverUrl, userName])

  // API methods
  const sendOperation = (operation) => {
    if (!syncManager.current) return

    switch (operation.type) {
      case 'text-insert':
        syncManager.current.insertText(operation.index, operation.text)
        break
      case 'text-delete':
        syncManager.current.deleteText(operation.index, operation.length)
        break
      case 'text-replace':
        syncManager.current.replaceText(operation.index, operation.length, operation.text)
        break
      case 'cursor-move':
        syncManager.current.broadcastCursor(operation.position, operation.selection)
        break
    }
  }

  const getText = () => {
    return syncManager.current?.getText() || ''
  }

  const setText = (text) => {
    syncManager.current?.setText(text)
  }

  const getStats = () => {
    return {
      room: roomCode,
      mode,
      isConnected,
      connectionState,
      peers: peers.length,
      serverUrl
    }
  }

  return {
    isConnected,
    peers,
    connectionState,
    error,
    cursors,
    sendOperation,
    getText,
    setText,
    getStats,
    syncManager: syncManager.current
  }
}