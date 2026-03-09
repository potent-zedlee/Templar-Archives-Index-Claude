# Templar Archives PRD

## 1. Project Overview
Templar Archives is a professional platform for managing, sharing, and studying poker tournament hand histories.

## 2. Core Features
- **Archive**: Hierarchical management of poker data (Tournament > Event > Stream > Hand).
- **Search**: Advanced filtering and search for specific hands, players, and tournaments.
- **Community**: Forum-style discussion board for strategy and tournament recaps.
- **Players**: Global player database with performance statistics.
- **Security**: Supabase Auth with TOTP 2-Factor Authentication.

## 3. Tech Stack
- **Frontend**: Next.js 16, React 19, Tailwind CSS 4.1
- **Backend/DB**: Supabase (PostgreSQL), Supabase Storage
- **State Management**: React Query 5, Zustand 5

## 4. Hierarchy Structure
```
Tournament (WSOP, Triton, etc.)
  └── Event (Main Event, High Roller, etc.)
        └── Stream (Day 1, Final Table, etc.)
              └── Hand (Individual poker hands)
```
