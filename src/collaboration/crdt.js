import * as Y from 'yjs'
import EventEmitter from 'eventemitter3'

export class CRDTManager extends EventEmitter {
  constructor() {
    super()
    this.ydoc = new Y.Doc()
    this.ytext = this.ydoc.getText('code')
    this.isDestroyed = false

    this.setupEventHandlers()
  }

  setupEventHandlers() {
    // Listen for local changes to the CRDT
    this.ytext.observe((event, transaction) => {
      if (transaction.local) {
        // Local change - broadcast to peers
        const update = Y.encodeStateAsUpdate(this.ydoc)
        this.emit('localChange', {
          update: Array.from(update),
          delta: event.delta,
        })
      } else {
        // Remote change - update UI
        this.emit('remoteChange', {
          delta: event.delta,
        })
      }
    })

    // Listen for awareness changes (cursors, selections)
    this.ydoc.on('update', (update, origin) => {
      if (origin !== 'remote') {
        this.emit('stateUpdate', Array.from(update))
      }
    })
  }

  // Apply remote update from peer
  applyRemoteUpdate(updateArray) {
    if (this.isDestroyed) return

    try {
      const update = new Uint8Array(updateArray)
      Y.applyUpdate(this.ydoc, update, 'remote')
    } catch (err) {
      console.error('Failed to apply remote update:', err)
    }
  }

  // Get current document state
  getDocumentState() {
    return Y.encodeStateAsUpdate(this.ydoc)
  }

  // Insert text at position
  insertText(index, text) {
    if (this.isDestroyed) return
    this.ytext.insert(index, text)
  }

  // Delete text from position
  deleteText(index, length) {
    if (this.isDestroyed) return
    this.ytext.delete(index, length)
  }

  // Replace text range
  replaceText(index, length, text) {
    if (this.isDestroyed) return

    this.ytext.delete(index, length)
    if (text) {
      this.ytext.insert(index, text)
    }
  }

  // Get current text content
  getText() {
    return this.ytext.toString()
  }

  // Set initial text content
  setText(text) {
    if (this.isDestroyed) return

    // Clear existing content
    this.ytext.delete(0, this.ytext.length)

    // Insert new content
    if (text) {
      this.ytext.insert(0, text)
    }
  }

  // Convert Monaco delta to Y.js operations
  applyMonacoDelta(delta) {
    if (this.isDestroyed) return

    let offset = 0

    for (const op of delta) {
      if (op.retain) {
        offset += op.retain
      } else if (op.delete) {
        this.ytext.delete(offset, op.delete)
      } else if (op.insert) {
        this.ytext.insert(offset, op.insert)
        offset += op.insert.length
      }
    }
  }

  // Convert Y.js delta to Monaco operations
  convertYDeltaToMonaco(delta) {
    const operations = []
    let index = 0

    for (const op of delta) {
      if (op.retain) {
        index += op.retain
      } else if (op.delete) {
        operations.push({
          range: {
            startLineNumber: 1,
            startColumn: index + 1,
            endLineNumber: 1,
            endColumn: index + op.delete + 1,
          },
          text: '',
        })
      } else if (op.insert) {
        operations.push({
          range: {
            startLineNumber: 1,
            startColumn: index + 1,
            endLineNumber: 1,
            endColumn: index + 1,
          },
          text: op.insert,
        })
        index += op.insert.length
      }
    }

    return operations
  }

  // Sync with new peer
  syncWithPeer(peerId) {
    if (this.isDestroyed) return null

    // Send current state to new peer
    const state = this.getDocumentState()
    return {
      type: 'sync-state',
      state: Array.from(state),
      peerId,
    }
  }

  // Handle sync request from peer
  handleSyncRequest(stateArray) {
    if (this.isDestroyed) return

    try {
      const state = new Uint8Array(stateArray)
      Y.applyUpdate(this.ydoc, state, 'remote')
    } catch (err) {
      console.error('Failed to handle sync request:', err)
    }
  }

  // Get document statistics
  getStats() {
    return {
      length: this.ytext.length,
      clientId: this.ydoc.clientID,
      stateSize: Y.encodeStateAsUpdate(this.ydoc).length,
    }
  }

  destroy() {
    if (this.isDestroyed) return

    this.isDestroyed = true
    this.ydoc.destroy()
    this.removeAllListeners()

    console.log('CRDT manager destroyed')
  }
}
