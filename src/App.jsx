import React, { useState } from 'react'
import { CodeEditor } from './components/CodeEditor'
import { RoomJoin } from './components/RoomJoin'
import { ErrorBoundary } from './components/ErrorBoundary'
import './App.css'

function App() {
  const [roomCode, setRoomCode] = useState('')
  const [isInRoom, setIsInRoom] = useState(false)
  const [userName, setUserName] = useState('')
  const [serverUrl, setServerUrl] = useState('ws://localhost:8080')

  const handleJoinRoom = (code, options = {}) => {
    setRoomCode(code)
    setIsInRoom(true)
    if (options.userName) setUserName(options.userName)
    if (options.serverUrl) setServerUrl(options.serverUrl)
  }

  const handleLeaveRoom = () => {
    setRoomCode('')
    setIsInRoom(false)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🐙 Kompa - P2P Code Collaboration</h1>
        {isInRoom && (
          <div className="room-info">
            <span>Room: {roomCode}</span>
            <span className="connection-mode">🐙 Server-Peer</span>
            {userName && <span>User: {userName}</span>}
            <button onClick={handleLeaveRoom} className="leave-button">
              Leave Room
            </button>
          </div>
        )}
      </header>
      
      <main className="app-main">
        {!isInRoom ? (
          <ErrorBoundary>
            <RoomJoin onJoin={handleJoinRoom} />
          </ErrorBoundary>
        ) : (
          <ErrorBoundary>
            <CodeEditor 
              roomCode={roomCode}
              userName={userName}
              serverUrl={serverUrl}
            />
          </ErrorBoundary>
        )}
      </main>
    </div>
  )
}

export default App