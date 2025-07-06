import { describe, it, expect } from 'vitest'
import { generateRoomCode, validateRoomCode, sanitizeRoomCode } from '../roomCode'

describe('roomCode utilities', () => {
  describe('generateRoomCode', () => {
    it('should generate a room code with correct format', () => {
      const roomCode = generateRoomCode()
      expect(roomCode).toMatch(/^[a-z]+-[a-z]+-\d{1,2}$/)
    })
    
    it('should generate different codes on multiple calls', () => {
      const code1 = generateRoomCode()
      const code2 = generateRoomCode()
      // Very unlikely to be the same given the random nature
      expect(code1).not.toBe(code2)
    })
  })

  describe('validateRoomCode', () => {
    it('should validate correct room codes', () => {
      expect(validateRoomCode('swift-fox-42')).toBe(true)
      expect(validateRoomCode('test-123')).toBe(true)
      expect(validateRoomCode('a_b_c')).toBe(true)
    })
    
    it('should reject invalid room codes', () => {
      expect(validateRoomCode('')).toBe(false)
      expect(validateRoomCode(null)).toBe(false)
      expect(validateRoomCode(undefined)).toBe(false)
      expect(validateRoomCode('test@123')).toBe(false)
      expect(validateRoomCode('test 123')).toBe(false)
    })
    
    it('should reject overly long room codes', () => {
      const longCode = 'a'.repeat(60)
      expect(validateRoomCode(longCode)).toBe(false)
    })
  })

  describe('sanitizeRoomCode', () => {
    it('should trim and lowercase room codes', () => {
      expect(sanitizeRoomCode('  Swift-Fox-42  ')).toBe('swift-fox-42')
      expect(sanitizeRoomCode('TEST123')).toBe('test123')
    })
    
    it('should handle empty/null inputs', () => {
      expect(sanitizeRoomCode('')).toBe('')
      expect(sanitizeRoomCode(null)).toBe('')
      expect(sanitizeRoomCode(undefined)).toBe('')
    })
    
    it('should truncate overly long codes', () => {
      const longCode = 'a'.repeat(60)
      const sanitized = sanitizeRoomCode(longCode)
      expect(sanitized.length).toBe(50)
    })
  })
})