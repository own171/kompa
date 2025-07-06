import React, { useEffect, useState } from 'react'
import { CursorDisplay } from './CursorDisplay'

export function UserCursors({ cursors, users, editor }) {
  const [cursorElements, setCursorElements] = useState([])

  useEffect(() => {
    if (!editor || !cursors) {
      setCursorElements([])
      return
    }

    const updateCursors = () => {
      try {
        const elements = Object.entries(cursors)
          .map(([peerId, cursor]) => {
            const user = users[peerId] || { name: peerId.slice(0, 8) }

            if (!cursor.position) return null

            return {
              id: peerId,
              position: cursor.position,
              color: cursor.color,
              name: user.name,
              selection: cursor.selection,
            }
          })
          .filter(Boolean)

        setCursorElements(elements)
      } catch (err) {
        console.warn('Error updating cursors:', err)
        setCursorElements([])
      }
    }

    // Update cursors initially
    updateCursors()

    // Update cursors when editor content changes
    const disposables = [
      editor.onDidChangeModelContent(updateCursors),
      editor.onDidScrollChange(updateCursors),
      editor.onDidLayoutChange(updateCursors),
    ]

    return () => {
      disposables.forEach(d => {
        if (d && typeof d.dispose === 'function') {
          d.dispose()
        }
      })
    }
  }, [editor, cursors, users])

  if (!editor || cursorElements.length === 0) {
    return null
  }

  return (
    <div className="user-cursors">
      {cursorElements.map(cursor => (
        <CursorDisplay key={cursor.id} cursor={cursor} editor={editor} />
      ))}
    </div>
  )
}
