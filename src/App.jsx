import React, { useState } from 'react'
import { CodeEditor } from './components/CodeEditor'
import { RoomJoin } from './components/RoomJoin'
import { ErrorBoundary } from './components/ErrorBoundary'
import './App.css'

function App() {
  const [roomCode, setRoomCode] = useState('')
  const [isInRoom, setIsInRoom] = useState(false)

  const handleJoinRoom = (code) => {
    setRoomCode(code)
    setIsInRoom(true)
  }

  const handleLeaveRoom = () => {
    setRoomCode('')
    setIsInRoom(false)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>P2P Code Collaboration</h1>
        {isInRoom && (
          <div className="room-info">
            <span>Room: {roomCode}</span>
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
            <CodeEditor roomCode={roomCode} />
          </ErrorBoundary>
        )}
      </main>
    </div>
  )
}

export default App