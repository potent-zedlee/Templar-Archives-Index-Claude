import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Firebase to avoid initialization errors in tests
vi.mock('@/lib/firebase', () => ({
  app: {},
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(),
  },
  firestore: {
    collection: vi.fn(),
    doc: vi.fn(),
  },
}))
