import { CURSOR_COLORS } from '../constants'

/**
 * Generate a consistent color for a peer based on their ID
 * @param {string} peerId - Peer identifier
 * @returns {string} Hex color code
 */
export const generatePeerColor = peerId => {
  if (!peerId) return CURSOR_COLORS[0]

  const hash = peerId
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return CURSOR_COLORS[hash % CURSOR_COLORS.length]
}

/**
 * Get a contrasting text color for a given background color
 * @param {string} backgroundColor - Hex color code
 * @returns {string} Either '#ffffff' or '#000000'
 */
export const getContrastingTextColor = backgroundColor => {
  // Remove # if present
  const hex = backgroundColor.replace('#', '')

  // Handle short hex codes (3 chars)
  let r, g, b
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16)
    g = parseInt(hex[1] + hex[1], 16)
    b = parseInt(hex[2] + hex[2], 16)
  } else {
    r = parseInt(hex.substring(0, 2), 16)
    g = parseInt(hex.substring(2, 4), 16)
    b = parseInt(hex.substring(4, 6), 16)
  }

  // Calculate luminance using relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Return contrasting color - threshold of 0.5
  return luminance > 0.5 ? '#000000' : '#ffffff'
}
