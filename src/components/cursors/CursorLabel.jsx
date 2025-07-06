import React from 'react'

export function CursorLabel({ cursor, position, activityState = 'active' }) {
  if (!position || !cursor.name) return null

  return (
    <div
      className={`cursor-label ${activityState}`}
      style={{
        '--cursor-color': cursor.color,
        left: position.x + 4,
        top: position.y,
      }}
    >
      {cursor.name}
    </div>
  )
}
