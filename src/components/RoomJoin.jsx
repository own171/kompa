import React, { useState } from 'react'
import { generateRoomCode, validateRoomCode, sanitizeRoomCode } from '../utils'

export function RoomJoin({ onJoin }) {
  const [roomCode, setRoomCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [userName, setUserName] = useState('')
  const [serverUrl, setServerUrl] = useState('ws://localhost:8080')
  const [, setError] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    const sanitized = sanitizeRoomCode(roomCode)
    if (!sanitized || !validateRoomCode(sanitized)) return

    setIsJoining(true)
    setError('')
    try {
      await onJoin(sanitized, {
        userName: userName.trim() || 'Anonymous',
        serverUrl: serverUrl.trim() || 'ws://localhost:8080',
      })
    } catch (err) {
      setError('Failed to join room')
    } finally {
      setIsJoining(false)
    }
  }

  const createRoom = () => {
    const newRoomCode = generateRoomCode()
    setRoomCode(newRoomCode)
  }

  return (
    <div className="room-join">
      <h2>🐙 Join a Kompa Collaboration Room</h2>

      <form onSubmit={handleSubmit} className="room-join-form">
        <div>
          <label htmlFor="roomCode">Room Code:</label>
          <input
            id="roomCode"
            type="text"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value)}
            placeholder="Enter room code or create new"
            disabled={isJoining}
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="userName">Your Name:</label>
          <input
            id="userName"
            type="text"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            placeholder="Enter your name (optional)"
            disabled={isJoining}
          />
        </div>

        <div>
          <label htmlFor="serverUrl">Server URL:</label>
          <input
            id="serverUrl"
            type="text"
            value={serverUrl}
            onChange={e => setServerUrl(e.target.value)}
            placeholder="ws://localhost:8080"
            disabled={isJoining}
          />
        </div>

        <div className="room-actions">
          <button
            type="button"
            onClick={createRoom}
            disabled={isJoining}
            className="secondary"
          >
            Create New Room
          </button>

          <button type="submit" disabled={!roomCode.trim() || isJoining}>
            {isJoining ? 'Joining...' : 'Join Room'}
          </button>
        </div>
      </form>

      <div className="room-info">
        <h3>🐙 Server-Peer Collaboration</h3>
        <ul>
          <li>
            <strong>Universal compatibility:</strong> Works on any network via
            WebSocket
          </li>
          <li>
            <strong>No setup required:</strong> Just connect to any Kompa server
          </li>
          <li>
            <strong>Real-time sync:</strong> Conflict-free collaborative editing
          </li>
          <li>
            <strong>Ephemeral rooms:</strong> Disappear when everyone leaves
          </li>
        </ul>
        <h3>How to use:</h3>
        <ul>
          <li>Create a new room or enter an existing room code</li>
          <li>Share the room code with others to collaborate</li>
          <li>Make sure everyone connects to the same server URL</li>
          <li>Start collaborating instantly!</li>
        </ul>
      </div>
    </div>
  )
}
