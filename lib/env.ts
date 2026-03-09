/**
 * Environment Variables Central Management (Supabase Version)
 */

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

const REQUIRED_SERVER_ENV_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

export function validateEnv() {
  const missing: string[] = []
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) missing.push(key)
  }
  if (typeof window === 'undefined') {
    for (const key of REQUIRED_SERVER_ENV_VARS) {
      if (!process.env[key]) missing.push(key)
    }
  }
  if (missing.length > 0) {
    console.warn(`Missing env vars: ${missing.join(', ')}`)
  }
}

function getEnvVarSafe(key: string, fallback: string = ''): string {
  return process.env[key] || fallback
}

export const supabaseEnv = {
  get url() { return getEnvVarSafe('NEXT_PUBLIC_SUPABASE_URL') },
  get anonKey() { return getEnvVarSafe('NEXT_PUBLIC_SUPABASE_ANON_KEY') },
  get serviceRoleKey() {
    if (typeof window !== 'undefined') return ''
    return getEnvVarSafe('SUPABASE_SERVICE_ROLE_KEY')
  },
}

export const youtubeEnv = {
  get apiKey() { return getEnvVarSafe('NEXT_PUBLIC_YOUTUBE_API_KEY') },
}

export const appEnv = {
  get nodeEnv() { return getEnvVarSafe('NODE_ENV', 'development') },
  get isDevelopment() { return process.env.NODE_ENV === 'development' },
  get isProduction() { return process.env.NODE_ENV === 'production' },
}
