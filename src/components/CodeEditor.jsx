import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Editor } from '@monaco-editor/react'
import { useKompaRoom } from '../hooks/useKompaRoom'
import { UserCursors } from './cursors'
import { ExportCode } from './ExportCode'
import { debounce } from '../utils'
import { CURSOR_UPDATE_DEBOUNCE } from '../constants'

export function CodeEditor({ roomCode, userName = 'Anonymous', serverUrl = 'ws://localhost:8080' }) {
  const editorRef = useRef(null)
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [isUpdating, setIsUpdating] = useState(false)
  const lastRemoteUpdate = useRef(0)

  // Create debounced cursor update function
  const debouncedCursorUpdate = useCallback(
    (position, selection) => {
      const debouncedFn = debounce(() => {
        sendOperation({
          type: 'cursor-move',
          position,
          selection,
        })
      }, CURSOR_UPDATE_DEBOUNCE)
      debouncedFn()
    },
    [sendOperation]
  )

  const {
    peers,
    connectionState,
    error,
    cursors,
    users,
    sendOperation,
    getText,
    syncManager,
  } = useKompaRoom(roomCode, { userName, serverUrl })

  // Handle editor mounting
  const handleEditorDidMount = (editor, _monaco) => {
    editorRef.current = editor

    // Set up change listener
    editor.onDidChangeModelContent(event => {
      if (isUpdating) return

      const currentTime = Date.now()
      if (currentTime - lastRemoteUpdate.current < 100) {
        // Skip if this change is likely from a remote update
        return
      }

      handleLocalChanges(event.changes)
    })

    // Set up cursor position listener with debouncing
    editor.onDidChangeCursorPosition(event => {
      if (isUpdating) return
      debouncedCursorUpdate(event.position, editor.getSelection())
    })

    // Set up selection listener with debouncing
    editor.onDidChangeCursorSelection(event => {
      if (isUpdating) return
      debouncedCursorUpdate(event.selection.getStartPosition(), event.selection)
    })

    // Initial content sync
    const initialContent = getText()
    if (initialContent) {
      setCode(initialContent)
    }
  }

  // Handle local changes
  const handleLocalChanges = changes => {
    for (const change of changes) {
      const { range, text, rangeLength } = change
      const startOffset = editorRef.current
        .getModel()
        .getOffsetAt(range.getStartPosition())

      if (rangeLength > 0) {
        // Delete operation
        sendOperation({
          type: 'text-delete',
          index: startOffset,
          length: rangeLength,
        })
      }

      if (text) {
        // Insert operation
        sendOperation({
          type: 'text-insert',
          index: startOffset,
          text,
        })
      }
    }

    // Update local code state
    const newCode = editorRef.current.getValue()
    setCode(newCode)
  }

  // Handle remote document changes
  useEffect(() => {
    if (!syncManager) return

    const handleRemoteChange = ({ delta }) => {
      if (!editorRef.current) return

      setIsUpdating(true)
      lastRemoteUpdate.current = Date.now()

      try {
        const model = editorRef.current.getModel()
        const operations = convertDeltaToMonacoOperations(delta)

        if (operations.length > 0) {
          model.pushEditOperations([], operations, () => null)
        }

        // Update local state
        const newCode = model.getValue()
        setCode(newCode)
      } catch (err) {
        console.error('Failed to apply remote change:', err)
      } finally {
        setTimeout(() => {
          setIsUpdating(false)
        }, 50)
      }
    }

    syncManager.on('documentChange', handleRemoteChange)

    return () => {
      syncManager.off('documentChange', handleRemoteChange)
    }
  }, [syncManager])

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedCursorUpdate.cancel()
    }
  }, [debouncedCursorUpdate])

  // Convert Y.js delta to Monaco operations
  const convertDeltaToMonacoOperations = delta => {
    if (!editorRef.current) return []

    const model = editorRef.current.getModel()
    const operations = []
    let offset = 0

    for (const op of delta) {
      if (op.retain) {
        offset += op.retain
      } else if (op.delete) {
        const startPos = model.getPositionAt(offset)
        const endPos = model.getPositionAt(offset + op.delete)

        operations.push({
          range: {
            startLineNumber: startPos.lineNumber,
            startColumn: startPos.column,
            endLineNumber: endPos.lineNumber,
            endColumn: endPos.column,
          },
          text: '',
        })
      } else if (op.insert) {
        const pos = model.getPositionAt(offset)

        operations.push({
          range: {
            startLineNumber: pos.lineNumber,
            startColumn: pos.column,
            endLineNumber: pos.lineNumber,
            endColumn: pos.column,
          },
          text: op.insert,
        })

        offset += op.insert.length
      }
    }

    return operations
  }

  const handleLanguageChange = newLanguage => {
    setLanguage(newLanguage)
  }

  if (error) {
    return (
      <div className="code-editor error">
        <div className="error-message">
          <h3>Connection Error</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="code-editor">
      <div className="editor-header">
        <div className="editor-controls">
          <select
            value={language}
            onChange={e => handleLanguageChange(e.target.value)}
            className="language-select"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="json">JSON</option>
            <option value="markdown">Markdown</option>
          </select>
          
          <ExportCode
            code={code}
            language={language}
            roomCode={roomCode}
          />
        </div>

        <div className="connection-info">
          <span className={`connection-status ${connectionState}`}>
            {connectionState === 'connected'
              ? `Connected (${peers.length} peers)`
              : connectionState === 'connecting'
                ? 'Connecting...'
                : connectionState === 'failed'
                  ? 'Connection Failed'
                  : 'Disconnected'}
          </span>
          {error && <span className="error-info">Error: {error}</span>}
        </div>
      </div>

      <div className="editor-container">
        <Editor
          height="600px"
          language={language}
          value={code}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            wordWrap: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderLineHighlight: 'none',
            occurrencesHighlight: false,
            selectionHighlight: false,
            codeLens: false,
            folding: false,
            lineNumbers: 'on',
            glyphMargin: false,
            lineNumbersMinChars: 4,
            lineDecorationsWidth: 0,
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
            },
          }}
        />

        <UserCursors
          cursors={cursors}
          users={users}
          editor={editorRef.current}
        />
      </div>
    </div>
  )
}
