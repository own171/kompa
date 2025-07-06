import React, { useEffect, useState } from 'react'

export function SelectionHighlight({ editor, selection, color }) {
  const [highlights, setHighlights] = useState([])

  useEffect(() => {
    if (!editor || !selection || !color) {
      setHighlights([])
      return
    }

    // Safety check for selection methods
    if (!selection.getStartPosition || !selection.getEndPosition) {
      setHighlights([])
      return
    }

    const updateHighlights = () => {
      try {
        const startPos = selection.getStartPosition()
        const endPos = selection.getEndPosition()
        
        if (!startPos || !endPos || startPos.equals(endPos)) {
          setHighlights([])
          return
        }

        const highlights = []
        
        // Handle single line selection
        if (startPos.lineNumber === endPos.lineNumber) {
          const startCoords = editor.getScrolledVisiblePosition(startPos)
          const endCoords = editor.getScrolledVisiblePosition(endPos)
          
          if (startCoords && endCoords) {
            highlights.push({
              left: startCoords.left,
              top: startCoords.top,
              width: endCoords.left - startCoords.left,
              height: 18
            })
          }
        } else {
          // Handle multi-line selection
          for (let line = startPos.lineNumber; line <= endPos.lineNumber; line++) {
            const lineStartColumn = line === startPos.lineNumber ? startPos.column : 1
            const lineEndColumn = line === endPos.lineNumber ? 
              endPos.column : 
              editor.getModel().getLineMaxColumn(line)
            
            const lineStartPos = { lineNumber: line, column: lineStartColumn }
            const lineEndPos = { lineNumber: line, column: lineEndColumn }
            
            const startCoords = editor.getScrolledVisiblePosition(lineStartPos)
            const endCoords = editor.getScrolledVisiblePosition(lineEndPos)
            
            if (startCoords && endCoords) {
              highlights.push({
                left: startCoords.left,
                top: startCoords.top,
                width: endCoords.left - startCoords.left,
                height: 18
              })
            }
          }
        }
        
        setHighlights(highlights)
      } catch (err) {
        console.warn('Selection highlight error:', err)
        setHighlights([])
      }
    }

    updateHighlights()

    // Update highlights when editor content or layout changes
    const disposables = [
      editor.onDidChangeModelContent(updateHighlights),
      editor.onDidScrollChange(updateHighlights),
      editor.onDidLayoutChange(updateHighlights)
    ]

    return () => {
      disposables.forEach(d => {
        if (d && typeof d.dispose === 'function') {
          d.dispose()
        }
      })
    }
  }, [editor, selection, color])

  if (highlights.length === 0) return null

  return (
    <>
      {highlights.map((highlight, index) => (
        <div
          key={index}
          className="selection-highlight"
          style={{
            position: 'absolute',
            left: highlight.left,
            top: highlight.top,
            width: highlight.width,
            height: highlight.height,
            backgroundColor: color,
            opacity: 0.2,
            pointerEvents: 'none',
            zIndex: 999
          }}
        />
      ))}
    </>
  )
}