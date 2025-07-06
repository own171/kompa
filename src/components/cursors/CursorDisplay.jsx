import React, { useState, useEffect, useRef, useMemo } from 'react'
import { CursorLine } from './CursorLine'
import { CursorLabel } from './CursorLabel'
import { SelectionHighlight } from './SelectionHighlight'

export function CursorDisplay({ cursor, editor }) {
  const [activityState, setActivityState] = useState('active')
  const lastActivity = useRef(Date.now())
  const lastPosition = useRef(null)
  const activityTimer = useRef(null)

  // Calculate cursor position from Monaco editor
  const position = useMemo(() => {
    if (!cursor || !cursor.id || !editor) return null
    
    const rawPosition = cursor.position
      ? editor.getScrolledVisiblePosition(cursor.position)
      : null

    // Validate position has valid numeric coordinates  
    return rawPosition &&
      typeof rawPosition.left === 'number' &&
      typeof rawPosition.top === 'number' &&
      !isNaN(rawPosition.left) &&
      !isNaN(rawPosition.top)
        ? { x: rawPosition.left, y: rawPosition.top }
        : null
  }, [cursor, editor])

  // Track cursor activity and state changes
  useEffect(() => {
    if (!position) return

    const now = Date.now()
    const hasPositionChanged = 
      !lastPosition.current ||
      lastPosition.current.x !== position.x ||
      lastPosition.current.y !== position.y

    if (hasPositionChanged) {
      // Cursor moved - mark as active/typing
      lastActivity.current = now
      lastPosition.current = position
      
      // Determine if user is typing (recent activity)
      const isTyping = cursor.timestamp && (now - cursor.timestamp < 1000)
      
      if (isTyping) {
        setActivityState('typing')
      } else {
        setActivityState('active')
      }

      // Clear existing timer
      if (activityTimer.current) {
        clearTimeout(activityTimer.current)
      }

      // Set timer for idle state
      activityTimer.current = setTimeout(() => {
        setActivityState('idle')
      }, 3000)

      // Set timer for away state
      setTimeout(() => {
        const timeSinceActivity = Date.now() - lastActivity.current
        if (timeSinceActivity >= 30000) {
          setActivityState('away')
        }
      }, 30000)
    }

    return () => {
      if (activityTimer.current) {
        clearTimeout(activityTimer.current)
      }
    }
  }, [position, cursor.timestamp])

  if (!cursor || !cursor.id || !editor || !position) return null

  const hasValidSelection =
    cursor.selection &&
    cursor.selection.getStartPosition &&
    cursor.selection.getEndPosition &&
    typeof cursor.selection.getStartPosition === 'function'

  return (
    <div key={cursor.id} className="cursor-container">
      {/* Cursor line */}
      <CursorLine 
        cursor={cursor} 
        position={position} 
        activityState={activityState}
      />

      {/* Cursor label */}
      <CursorLabel cursor={cursor} position={position} activityState={activityState} />

      {/* Selection highlight - only if selection is valid */}
      {hasValidSelection && (
        <SelectionHighlight
          editor={editor}
          selection={cursor.selection}
          color={cursor.color}
        />
      )}
    </div>
  )
}
