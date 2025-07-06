import { useState, useEffect, useRef } from 'react'

/**
 * Custom hook for smooth cursor interpolation with advanced easing
 */
export function useSmoothCursor(targetPosition, isActive = true) {
  const [currentPosition, setCurrentPosition] = useState(targetPosition)
  const animationRef = useRef(null)
  const startPosition = useRef(targetPosition)
  const startTime = useRef(null)
  const lastVelocity = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!targetPosition || !isActive) {
      setCurrentPosition(targetPosition)
      return
    }

    // If position hasn't changed, don't animate
    if (
      currentPosition &&
      targetPosition.x === currentPosition.x &&
      targetPosition.y === currentPosition.y
    ) {
      return
    }

    // Calculate distance and velocity-based duration
    const distance = currentPosition
      ? Math.sqrt(
          Math.pow(targetPosition.x - currentPosition.x, 2) +
          Math.pow(targetPosition.y - currentPosition.y, 2)
        )
      : 0

    // Adaptive duration based on distance (120ms base + distance factor)
    const baseDuration = 120
    const maxDuration = 400
    const duration = Math.min(baseDuration + distance * 0.5, maxDuration)

    // Store animation start values
    startPosition.current = currentPosition || targetPosition
    startTime.current = Date.now()

    // Calculate velocity for momentum effects
    if (currentPosition) {
      const timeDelta = duration / 1000 // Convert to seconds
      lastVelocity.current = {
        x: (targetPosition.x - currentPosition.x) / timeDelta,
        y: (targetPosition.y - currentPosition.y) / timeDelta,
      }
    }

    // Advanced easing function with slight overshoot
    const easeOutBack = (t) => {
      const c1 = 1.70158
      const c3 = c1 + 1
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
    }

    // Alternative: Smooth ease-out for subtle movement
    const easeOut = (t) => 1 - Math.pow(1 - t, 3)

    // Use subtle easing for small movements, overshoot for large movements
    const easingFunction = distance > 50 ? easeOutBack : easeOut

    const animate = () => {
      const elapsed = Date.now() - startTime.current
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easingFunction(progress)

      const newPosition = {
        x: startPosition.current.x + 
           (targetPosition.x - startPosition.current.x) * easedProgress,
        y: startPosition.current.y + 
           (targetPosition.y - startPosition.current.y) * easedProgress,
      }

      setCurrentPosition(newPosition)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Ensure we end exactly at target position
        setCurrentPosition(targetPosition)
      }
    }

    // Cancel previous animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    // Start new animation
    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [targetPosition, isActive])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return {
    position: currentPosition,
    velocity: lastVelocity.current,
    isAnimating: animationRef.current !== null,
  }
}