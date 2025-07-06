import React, { useState } from 'react'

export function ExportCode({ code, language, roomCode }) {
  const [isExporting, setIsExporting] = useState(false)

  // Map language to file extension
  const getFileExtension = lang => {
    const extensions = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      html: 'html',
      css: 'css',
      json: 'json',
      markdown: 'md',
    }
    return extensions[lang] || 'txt'
  }

  const exportAsFile = async () => {
    if (!code.trim()) {
      alert('No code to export!')
      return
    }

    setIsExporting(true)

    try {
      const extension = getFileExtension(language)
      const fileName = `kompa-${roomCode}-${Date.now()}.${extension}`

      const blob = new Blob([code], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.style.display = 'none'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the URL object
      setTimeout(() => URL.revokeObjectURL(url), 100)
    } catch (err) {
      console.error('Export failed:', err)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const copyToClipboard = async () => {
    if (!code.trim()) {
      alert('No code to copy!')
      return
    }

    try {
      await navigator.clipboard.writeText(code)
      alert('Code copied to clipboard!')
    } catch (err) {
      console.error('Copy failed:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = code
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()

      try {
        document.execCommand('copy')
        alert('Code copied to clipboard!')
      } catch (fallbackErr) {
        alert('Copy failed. Please select and copy manually.')
      }

      document.body.removeChild(textArea)
    }
  }

  const createGist = async () => {
    if (!code.trim()) {
      alert('No code to create gist!')
      return
    }

    const extension = getFileExtension(language)
    const fileName = `kompa-session.${extension}`

    // Create GitHub Gist URL with pre-filled content
    const gistData = {
      description: `Code collaboration session from Kompa room: ${roomCode}`,
      public: true,
      files: {
        [fileName]: {
          content: code,
        },
      },
    }

    // Open GitHub Gist creation page with data
    const gistUrl = `https://gist.github.com/`
    const newWindow = window.open(gistUrl, '_blank')

    if (newWindow) {
      // Store data for the gist page to potentially pick up
      sessionStorage.setItem('kompa-gist-data', JSON.stringify(gistData))
      alert(
        'Opening GitHub Gist. Paste your code there to create a shareable link!'
      )
    } else {
      alert(
        'Please allow popups to create a GitHub Gist, or copy the code manually.'
      )
    }
  }

  return (
    <div className="export-code">
      <div className="export-dropdown">
        <button
          className="export-button"
          disabled={isExporting}
          title="Export your code"
        >
          {isExporting ? '⏳' : '📤'} Export
        </button>

        <div className="export-menu">
          <button
            onClick={exportAsFile}
            className="export-option"
            disabled={isExporting}
          >
            📁 Download File
          </button>

          <button onClick={copyToClipboard} className="export-option">
            📋 Copy to Clipboard
          </button>

          <button onClick={createGist} className="export-option">
            🌐 Create GitHub Gist
          </button>
        </div>
      </div>
    </div>
  )
}
