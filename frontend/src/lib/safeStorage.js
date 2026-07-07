const safeStorage = {
  getItem(key) {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem(key) : null
    } catch (err) {
      return null
    }
  },
  setItem(key, value) {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value)
        return true
      }
      return false
    } catch (err) {
      return false
    }
  },
  removeItem(key) {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key)
        return true
      }
      return false
    } catch (err) {
      return false
    }
  }
}

export default safeStorage
