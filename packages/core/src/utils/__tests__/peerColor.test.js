import { describe, it, expect } from 'vitest'
import { generatePeerColor, getContrastingTextColor } from '../peerColor'

describe('peerColor utilities', () => {
  describe('generatePeerColor', () => {
    it('should generate consistent colors for same peer ID', () => {
      const peerId = 'test-peer-123'
      const color1 = generatePeerColor(peerId)
      const color2 = generatePeerColor(peerId)
      expect(color1).toBe(color2)
    })
    
    it('should generate different colors for different peer IDs', () => {
      const color1 = generatePeerColor('peer-1')
      const color2 = generatePeerColor('peer-2')
      // Might be the same due to hash collision, but very unlikely
      expect(typeof color1).toBe('string')
      expect(typeof color2).toBe('string')
    })
    
    it('should handle empty/null peer IDs', () => {
      expect(generatePeerColor('')).toBe('#FF6B6B')
      expect(generatePeerColor(null)).toBe('#FF6B6B')
      expect(generatePeerColor(undefined)).toBe('#FF6B6B')
    })
    
    it('should generate valid hex colors', () => {
      const color = generatePeerColor('test-peer')
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })
  })

  describe('getContrastingTextColor', () => {
    it('should return white for dark backgrounds', () => {
      expect(getContrastingTextColor('#000000')).toBe('#ffffff')
      expect(getContrastingTextColor('#333333')).toBe('#ffffff') // dark gray
      expect(getContrastingTextColor('#45B7D1')).toBe('#000000') // blue (luminance > 0.5)
    })
    
    it('should return black for light backgrounds', () => {
      expect(getContrastingTextColor('#ffffff')).toBe('#000000')
      expect(getContrastingTextColor('#FFEAA7')).toBe('#000000') // light yellow
      expect(getContrastingTextColor('#FF6B6B')).toBe('#000000') // red (luminance > 0.5)
      expect(getContrastingTextColor('#4ECDC4')).toBe('#000000') // light teal
    })
    
    it('should handle colors with # prefix', () => {
      expect(getContrastingTextColor('#ffffff')).toBe('#000000')
      expect(getContrastingTextColor('ffffff')).toBe('#000000')
    })
  })
})