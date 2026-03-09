# Templar Archives Deployment Guide

**Last Updated**: 2026-03-04

---

## Production URL

| Environment | URL |
|------|-----|
| **Vercel (Primary)** | https://templar-archives-index.vercel.app |

---

## Deployment Checklist

- [ ] GitHub account
- [ ] Vercel account
- [ ] Supabase project (Seoul Region recommended)

---

## Step 1: Environment Variables

### Required Variables

| Name | Description | Source |
|--------|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | Supabase Dashboard → Settings → API |
| `TWO_FACTOR_ENCRYPTION_KEY` | 2FA Encryption Key | `openssl rand -hex 32` |

---

## Step 2: Supabase Setup

### 2.1 Project Creation
1. Go to [Supabase Console](https://supabase.com).
2. Create a new project.
3. Apply migrations using Supabase CLI:
   ```bash
   npx supabase link --project-ref your-project-ref
   npx supabase db push
   ```

### 2.2 Authentication
- Enable Google Provider in Authentication → Providers.
- Add your production domain to the redirect allow list.

---

## Step 3: Vercel Setup

### 3.1 Link Project
```bash
npx vercel link
```

### 3.2 Add Environment Variables
Use the Vercel Dashboard or CLI to add all required variables.

### 3.3 GitHub Integration
Vercel automatically deploys when you push to the `main` branch.

---

## Step 4: Verification

- [ ] Homepage loading
- [ ] Supabase connection (Archive data visible)
- [ ] User authentication (Google Login)
- [ ] 2FA Setup and Login

---

## Troubleshooting

### Build Failures
```bash
# Test build locally
npm run build
npx tsc --noEmit
```

### Database Issues
Ensure RLS policies are correctly applied if data is not visible to non-admin users. Check `supabase/migrations` for the latest schema.

---

## References
- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [CLAUDE.md](../CLAUDE.md) - Project Guide
