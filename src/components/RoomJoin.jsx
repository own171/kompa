import React, { useState } from 'react'
import { generateRoomCode, validateRoomCode, sanitizeRoomCode } from '../utils'

export function RoomJoin({ onJoin }) {
  const [roomCode, setRoomCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    const sanitized = sanitizeRoomCode(roomCode)
    if (!sanitized || !validateRoomCode(sanitized)) return

    setIsJoining(true)
    try {
      await onJoin(sanitized)
    } catch (err) {
      console.error('Failed to join room:', err)
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
      <h2>Join a Collaboration Room</h2>

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
        <h3>How it works:</h3>
        <ul>
          <li>Create a new room or enter an existing room code</li>
          <li>Share the room code with others to collaborate</li>
          <li>Edit code together in real-time</li>
          <li>Rooms are ephemeral - they disappear when everyone leaves</li>
        </ul>
      </div>
    </div>
  )
}
