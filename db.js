const DB_NAME = "producao-db"
const STORE_NAME = "queue"
const STATE_STORE = "state" // Added store for current state

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2) // Incremented version

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true })
      }
      if (!db.objectStoreNames.contains(STATE_STORE)) {
        db.createObjectStore(STATE_STORE, { keyPath: "key" })
      }
    }

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

async function saveToQueue(data) {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, "readwrite")
  tx.objectStore(STORE_NAME).add(data)
  return tx.complete
}

async function getAllQueue() {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, "readonly")
  return tx.objectStore(STORE_NAME).getAll()
}

async function removeFromQueue(id) {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, "readwrite")
  tx.objectStore(STORE_NAME).delete(id)
  return tx.complete
}

async function saveCurrentState(state) {
  try {
    const db = await openDB()
    const tx = db.transaction(STATE_STORE, "readwrite")
    await tx.objectStore(STATE_STORE).put({ key: "current", data: state, timestamp: Date.now() })
    // Also save to localStorage as backup
    localStorage.setItem("producao-state", JSON.stringify(state))
    localStorage.setItem("producao-state-time", Date.now().toString())
  } catch (error) {
    console.error("Error saving state:", error)
    // Fallback to localStorage only
    localStorage.setItem("producao-state", JSON.stringify(state))
    localStorage.setItem("producao-state-time", Date.now().toString())
  }
}

async function getCurrentState() {
  try {
    const db = await openDB()
    const tx = db.transaction(STATE_STORE, "readonly")
    const result = await tx.objectStore(STATE_STORE).get("current")
    return result ? result.data : null
  } catch (error) {
    console.error("Error loading state:", error)
    // Fallback to localStorage
    const stored = localStorage.getItem("producao-state")
    return stored ? JSON.parse(stored) : null
  }
}

async function clearCurrentState() {
  try {
    const db = await openDB()
    const tx = db.transaction(STATE_STORE, "readwrite")
    await tx.objectStore(STATE_STORE).delete("current")
    localStorage.removeItem("producao-state")
    localStorage.removeItem("producao-state-time")
  } catch (error) {
    console.error("Error clearing state:", error)
    localStorage.removeItem("producao-state")
    localStorage.removeItem("producao-state-time")
  }
}
