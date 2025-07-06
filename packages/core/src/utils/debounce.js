/**
 * Create a debounced function that delays execution until after a specified delay
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, delay) => {
  let timeoutId

  const debounced = (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(this, args), delay)
  }

  // Add cancel method to clear pending execution
  debounced.cancel = () => {
    clearTimeout(timeoutId)
  }

  return debounced
}

/**
 * Create a throttled function that limits execution to at most once per interval
 * @param {Function} func - Function to throttle
 * @param {number} interval - Interval in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, interval) => {
  let lastExecution = 0
  let timeoutId

  const throttled = (...args) => {
    const now = Date.now()
    const timeSinceLastExecution = now - lastExecution

    if (timeSinceLastExecution >= interval) {
      lastExecution = now
      func.apply(this, args)
    } else {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        lastExecution = Date.now()
        func.apply(this, args)
      }, interval - timeSinceLastExecution)
    }
  }

  // Add cancel method
  throttled.cancel = () => {
    clearTimeout(timeoutId)
  }

  return throttled
}
