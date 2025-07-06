import React from 'react'

export function CursorLine({ cursor, position }) {
  if (!position || !cursor.color) return null

  return (
    <div
      className="remote-cursor"
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: '2px',
        height: '18px',
        backgroundColor: cursor.color,
        zIndex: 1000,
        pointerEvents: 'none'
      }}
    />
  )
}