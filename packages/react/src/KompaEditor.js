/**
 * KompaEditor - Drop-in collaborative code editor component
 */

import React, { useState } from 'react'
import { Editor } from '@monaco-editor/react'
import { useKompaRoom } from './useKompaRoom.js'

export function KompaEditor({ 
  roomCode, 
  serverUrl = 'ws://localhost:8080',
  userName = 'Anonymous',
  language = 'javascript',
  theme = 'vs-dark',
  height = '500px',
  width = '100%',
  onReady = () => {},
  onError = () => {},
  ...editorProps 
}) {
  const [code, setCode] = useState('')
  
  const { 
    isConnected, 
    connectionState, 
    error,
    peers,
    sendOperation,
    getText,
    syncManager 
  } = useKompaRoom(roomCode, {
    mode: 'server-peer',
    serverUrl,
    userName
  })

  React.useEffect(() => {
    if (syncManager) {
      // Get initial content
      const initialContent = getText()
      if (initialContent !== code) {
        setCode(initialContent)
      }

      // Listen for remote changes
      const handleRemoteChange = ({ delta }) => {
        // Apply remote changes to editor
        // This would need Monaco integration
      }

      syncManager.on('documentChange', handleRemoteChange)
      
      return () => {
        syncManager.off('documentChange', handleRemoteChange)
      }
    }
  }, [syncManager, getText, code])

  React.useEffect(() => {
    if (isConnected) {
      onReady({ roomCode, peers, connectionState })
    }
  }, [isConnected, roomCode, peers, connectionState, onReady])

  React.useEffect(() => {
    if (error) {
      onError(error)
    }
  }, [error, onError])

  const handleEditorChange = (value) => {
    setCode(value || '')
    
    // Convert change to CRDT operations
    // This would need to calculate the diff and send operations
    if (syncManager && value !== getText()) {
      // Simple approach - replace entire content
      // Production version would calculate proper diff
      syncManager.setText(value || '')
    }
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        border: '1px solid #ff6b6b', 
        borderRadius: '4px',
        backgroundColor: '#ffe0e0',
        color: '#d63031'
      }}>
        <h3>Connection Error</h3>
        <p>{error}</p>
        <p>Make sure the Kompa server is running at {serverUrl}</p>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width, height }}>
      {/* Connection status */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        padding: '5px 10px',
        borderRadius: '4px',
        backgroundColor: isConnected ? '#00b894' : '#fdcb6e',
        color: 'white',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {connectionState === 'connected' ? `🐙 Connected (${peers.length} peers)` : 
         connectionState === 'connecting' ? '🔄 Connecting...' : 
         '❌ Disconnected'}
      </div>

      {/* Code editor */}
      <Editor
        height={height}
        width={width}
        language={language}
        theme={theme}
        value={code}
        onChange={handleEditorChange}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          readOnly: !isConnected,
          ...editorProps.options
        }}
        {...editorProps}
      />
    </div>
  )
}