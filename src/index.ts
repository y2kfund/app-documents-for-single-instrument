// src/index.ts
import documents from './views/Documents.vue'

// Named export
export { documents }

// Default export (optional)
export default documents

// Props interface
export interface documentsProps {
  symbolRoot: string    // Root symbol of the instrument
  userId?: string | null    // Current user ID for access control
}
