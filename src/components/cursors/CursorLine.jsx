import React from 'react'

export function CursorLine({ cursor, position, activityState = 'active' }) {
  if (!position || !cursor.color) return null

  const stateClass =
    activityState === 'typing' ? 'active typing' : activityState

  return (
    <div
      className={`remote-cursor ${stateClass}`}
      style={{
        '--cursor-color': cursor.color,
        '--glow-intensity': 0.8,
        left: position.x,
        top: position.y,
      }}
    />
  )
}
