import React from 'react'

export function CursorLabel({ cursor, position }) {
  if (!position || !cursor.name) return null

  return (
    <div
      className="cursor-label"
      style={{
        position: 'absolute',
        left: position.x + 4,
        top: position.y - 20,
        backgroundColor: cursor.color,
        color: '#ffffff',
        padding: '2px 6px',
        borderRadius: '3px',
        fontSize: '11px',
        fontWeight: '500',
        whiteSpace: 'nowrap',
        zIndex: 1001,
        pointerEvents: 'none',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      }}
    >
      {cursor.name}
    </div>
  )
}
