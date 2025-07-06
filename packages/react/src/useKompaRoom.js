import { useState, useEffect, useRef } from 'react'
import { ServerPeerDiscovery } from '../p2p/server-peer-discovery.js'
import { CRDTManager } from '../collaboration/crdt.js'
import { SyncManager } from '../collaboration/sync-browser.js'
import { generatePeerColor } from '../utils'

export function useKompaRoom(roomCode, options = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [peers, setPeers] = useState([])
  const [connectionState, setConnectionState] = useState('disconnected')
  const [error, setError] = useState(null)

  const discovery = useRef(null)
  const crdtManager = useRef(null)
  const syncManager = useRef(null)

  const [cursors, setCursors] = useState({})
  const [users, setUsers] = useState({})

  const {
    serverUrl = 'ws://localhost:8080',
    userName = 'Anonymous'
  } = options

  useEffect(() => {
    if (!roomCode) return

    let mounted = true
    let initTimeout = null

    const initializeRoom = async () => {
      try {
        setConnectionState('connecting')
        setError(null)

        initTimeout = setTimeout(async () => {
          if (!mounted) return

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
          }
        }, 100)
      } catch (err) {
        if (mounted) {
          setError(err.message)
          setConnectionState('failed')
        }
      }
    }

    const setupEventHandlers = () => {
      // Server-peer events
      discovery.current.on('serverConnected', () => {
        if (!mounted) return
        setConnectionState('connecting')
      })

      discovery.current.on('serverDisconnected', () => {
        if (!mounted) return
        setConnectionState('disconnected')
      })

      discovery.current.on('serverError', _err => {
        if (!mounted) return
        setError('Server peer connection failed')
        setConnectionState('failed')
      })

      discovery.current.on('roomJoined', ({ documentState }) => {
        if (!mounted) return
        setConnectionState('connected')
        
        if (documentState && crdtManager.current) {
          crdtManager.current.applyRemoteUpdate(documentState)
        }
      })

      discovery.current.on('peerConnected', () => {
        if (!mounted) return
        updatePeerList()
      })

      discovery.current.on('peerDisconnected', ({ peerId }) => {
        if (!mounted) return
        updatePeerList()
        removePeerFromState(peerId)
      })

      discovery.current.on('peerMessage', ({ peerId, message }) => {
        if (!mounted) return
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

      discovery.current.on('error', err => {
        if (!mounted) return
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

      if (initTimeout) {
        clearTimeout(initTimeout)
        initTimeout = null
      }

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
        // Cleanup errors are non-critical
      }
    }
  }, [roomCode, serverUrl, userName])

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
      serverUrl,
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