import React from 'react'
import { CursorLine } from './CursorLine'
import { CursorLabel } from './CursorLabel'
import { SelectionHighlight } from './SelectionHighlight'

export function CursorDisplay({ cursor, editor }) {
  if (!cursor || !cursor.id || !editor) return null

  // Calculate cursor position from Monaco editor
  const rawPosition = cursor.position ? editor.getScrolledVisiblePosition(cursor.position) : null
  
  // Validate position has valid numeric coordinates
  const position = rawPosition && 
    typeof rawPosition.left === 'number' && 
    typeof rawPosition.top === 'number' &&
    !isNaN(rawPosition.left) && 
    !isNaN(rawPosition.top) ? 
    { x: rawPosition.left, y: rawPosition.top } : null
  
  if (!position) return null

  const hasValidSelection = cursor.selection && 
    cursor.selection.getStartPosition && 
    cursor.selection.getEndPosition &&
    typeof cursor.selection.getStartPosition === 'function'

  return (
    <div key={cursor.id} className="cursor-container">
      {/* Cursor line */}
      <CursorLine cursor={cursor} position={position} />
      
      {/* Cursor label */}
      <CursorLabel cursor={cursor} position={position} />
      
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