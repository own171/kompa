import EventEmitter from 'eventemitter3'

export class SyncManager extends EventEmitter {
  constructor(discovery, crdtManager) {
    super()
    this.discovery = discovery
    this.crdtManager = crdtManager
    this.syncedPeers = new Set()
    this.isDestroyed = false

    this.setupEventHandlers()
  }

  setupEventHandlers() {
    // Handle peer connections
    this.discovery.on('peerConnected', ({ peerId, peer: _peer }) => {
      this.handlePeerConnected(peerId)
    })

    this.discovery.on('peerDisconnected', ({ peerId }) => {
      this.handlePeerDisconnected(peerId)
    })

    // Handle peer messages
    this.discovery.on('peerMessage', ({ peerId, message }) => {
      this.handlePeerMessage(peerId, message)
    })

    // Handle CRDT changes
    this.crdtManager.on('localChange', ({ update, delta: _delta }) => {
      this.broadcastUpdate(update)
    })

    this.crdtManager.on('remoteChange', ({ delta }) => {
      this.emit('documentChange', { delta })
    })

    this.crdtManager.on('stateUpdate', update => {
      this.broadcastUpdate(update)
    })
  }

  handlePeerConnected(peerId) {
    if (this.isDestroyed) return

    // Send current document state to new peer
    const syncMessage = this.crdtManager.syncWithPeer(peerId)
    if (syncMessage) {
      this.discovery.sendToPeer(peerId, syncMessage)
    }

    this.syncedPeers.add(peerId)
    this.emit('peerSynced', { peerId })
  }

  handlePeerDisconnected(peerId) {
    if (this.isDestroyed) return

    this.syncedPeers.delete(peerId)
    this.emit('peerUnsynced', { peerId })
  }

  handlePeerMessage(peerId, message) {
    if (this.isDestroyed) return

    switch (message.type) {
      case 'sync-state':
        this.handleSyncState(peerId, message.state)
        break
      case 'crdt-update':
        this.handleCRDTUpdate(peerId, message.update)
        break
      case 'cursor-update':
        this.handleCursorUpdate(peerId, message)
        break
      case 'user-awareness':
        this.handleUserAwareness(peerId, message)
        break
      default:
        // Unknown message type
    }
  }

  handleSyncState(peerId, stateArray) {
    this.crdtManager.handleSyncRequest(stateArray)
  }

  handleCRDTUpdate(peerId, updateArray) {
    this.crdtManager.applyRemoteUpdate(updateArray)
  }

  handleCursorUpdate(peerId, message) {
    this.emit('cursorUpdate', {
      peerId,
      position: message.position,
      selection: message.selection,
    })
  }

  handleUserAwareness(peerId, message) {
    this.emit('userAwareness', {
      peerId,
      user: message.user,
    })
  }

  broadcastUpdate(update) {
    if (this.isDestroyed) return

    const message = {
      type: 'crdt-update',
      update: Array.from(update),
    }

    this.discovery.broadcast(message)
  }

  // Send cursor position to peers
  broadcastCursor(position, selection = null) {
    if (this.isDestroyed) return

    const message = {
      type: 'cursor-update',
      position,
      selection,
      timestamp: Date.now(),
    }

    this.discovery.broadcast(message)
  }

  // Send user awareness info to peers
  broadcastUserAwareness(user) {
    if (this.isDestroyed) return

    const message = {
      type: 'user-awareness',
      user,
      timestamp: Date.now(),
    }

    this.discovery.broadcast(message)
  }

  // Insert text at position
  insertText(index, text) {
    this.crdtManager.insertText(index, text)
  }

  // Delete text from position
  deleteText(index, length) {
    this.crdtManager.deleteText(index, length)
  }

  // Replace text range
  replaceText(index, length, text) {
    this.crdtManager.replaceText(index, length, text)
  }

  // Get current text content
  getText() {
    return this.crdtManager.getText()
  }

  // Set initial text content
  setText(text) {
    this.crdtManager.setText(text)
  }

  // Apply Monaco editor changes
  applyMonacoDelta(delta) {
    this.crdtManager.applyMonacoDelta(delta)
  }

  // Get sync statistics
  getStats() {
    return {
      syncedPeers: this.syncedPeers.size,
      peers: Array.from(this.syncedPeers).map(peerId => peerId.slice(0, 8)),
      crdt: this.crdtManager.getStats(),
    }
  }

  destroy() {
    if (this.isDestroyed) return

    this.isDestroyed = true
    this.syncedPeers.clear()
    this.removeAllListeners()

  }
}
