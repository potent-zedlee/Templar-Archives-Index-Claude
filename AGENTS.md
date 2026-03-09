# Templar Archives Index - Engineering Standards

## 1. Core Principles
- **Accuracy First**: Poker hand data must be 100% accurate. Curation over automation.
- **Performance**: High-speed replayer and efficient data fetching.
- **B2B Ready**: Multi-tenant data isolation and role-based access control.

## 2. Technical Guidelines
- **Framework**: Next.js 16 (App Router) + React 19.
- **Language**: Strict TypeScript 5.9. No `any` types.
- **Styling**: Tailwind CSS 4.1. Use standard naming conventions.
- **State**: React Query 5 for server state, Zustand 5 for client state.
- **Database**: Supabase (PostgreSQL). Use snake_case for DB fields.
- **Auth**: Supabase Auth + TOTP 2FA.

## 3. Implementation Patterns
- **Server Actions**: All data mutations (writes) must use Next.js Server Actions.
- **Type Safety**: Derive TypeScript types from Zod schemas using `z.infer`.
- **Naming**:
  - Components: `PascalCase.tsx`
  - Functions/Variables: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`

## 4. Testing & Validation
- **Unit Testing**: Vitest for utility and logic testing.
- **Build**: Ensure `npm run build` succeeds before finalizing tasks.
- **Security**: Always verify RLS policies and admin permissions.

---
**Note**: This project uses Supabase for database, authentication, and storage.
