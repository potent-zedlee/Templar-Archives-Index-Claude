import "@testing-library/jest-dom"
import { vi } from "vitest"

// Mock Supabase to avoid initialization errors in tests
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
  })),
}))

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "dummy-key"
