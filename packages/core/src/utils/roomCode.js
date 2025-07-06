import {
  ROOM_CODE_ADJECTIVES,
  ROOM_CODE_NOUNS,
  MAX_ROOM_CODE_LENGTH,
} from '../constants'

/**
 * Generate a readable room code
 * @returns {string} Room code in format "adjective-noun-number"
 */
export const generateRoomCode = () => {
  const adjective =
    ROOM_CODE_ADJECTIVES[
      Math.floor(Math.random() * ROOM_CODE_ADJECTIVES.length)
    ]
  const noun =
    ROOM_CODE_NOUNS[Math.floor(Math.random() * ROOM_CODE_NOUNS.length)]
  const number = Math.floor(Math.random() * 100)

  return `${adjective}-${noun}-${number}`
}

/**
 * Validate a room code
 * @param {string} code - Room code to validate
 * @returns {boolean} True if valid
 */
export const validateRoomCode = code => {
  if (!code || typeof code !== 'string') return false
  if (code.length > MAX_ROOM_CODE_LENGTH) return false

  // Allow alphanumeric, hyphens, and underscores
  const validPattern = /^[a-zA-Z0-9-_]+$/
  return validPattern.test(code)
}

/**
 * Sanitize a room code
 * @param {string} code - Room code to sanitize
 * @returns {string} Sanitized room code
 */
export const sanitizeRoomCode = code => {
  if (!code) return ''
  return code.trim().toLowerCase().slice(0, MAX_ROOM_CODE_LENGTH)
}
