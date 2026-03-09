/**
 * Logo Management Utilities (Supabase Version)
 */

import { createClient } from '@/lib/supabase/client'

export interface LogoFile {
  name: string
  path: string
  url: string
  source: 'static' | 'uploaded'
  size?: number
  createdAt?: string
}

export const STATIC_LOGOS: LogoFile[] = [
  { name: 'EPT', path: '/logos/ept.svg', url: '/logos/ept.svg', source: 'static' },
  { name: 'WPT', path: '/logos/wpt.svg', url: '/logos/wpt.svg', source: 'static' },
  { name: 'WSOP', path: '/logos/wsop.svg', url: '/logos/wsop.svg', source: 'static' },
  { name: 'Triton', path: '/logos/triton.svg', url: '/logos/triton.svg', source: 'static' },
]

const BUCKET_NAME = 'logos'

export function getStaticLogos(): LogoFile[] {
  return STATIC_LOGOS
}

export async function getUploadedLogos(): Promise<LogoFile[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return []
  }

  try {
    const supabase = createClient()
    const storageBucket = supabase.storage.from(BUCKET_NAME)
    
    if (!storageBucket) {
      console.warn(`[logo-utils] Storage bucket "${BUCKET_NAME}" not found`)
      return []
    }

    const { data, error } = await storageBucket.list('tournament-logos')
    
    if (error) {
      console.warn(`[logo-utils] Failed to list logos:`, error)
      return []
    }

    return (data || []).map(file => {
      const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(`tournament-logos/${file.name}`)
      return {
        name: file.name.split('.')[0],
        path: `tournament-logos/${file.name}`,
        url: publicUrl,
        source: 'uploaded',
        size: (file as any).metadata?.size,
        createdAt: file.created_at
      }
    })
  } catch (error) { 
    console.error('getUploadedLogos exception:', error)
    return [] 
  }
}

export async function getAllLogos(): Promise<LogoFile[]> {
  const staticLogos = getStaticLogos()
  const uploadedLogos = await getUploadedLogos()
  return [...staticLogos, ...uploadedLogos]
}

export function filterLogos(logos: LogoFile[], query: string): LogoFile[] {
  if (!query) return logos
  const lowerQuery = query.toLowerCase()
  return logos.filter(l => l.name.toLowerCase().includes(lowerQuery))
}

export async function searchLogos(query: string): Promise<LogoFile[]> {
  const allLogos = await getAllLogos()
  return filterLogos(allLogos, query)
}

export async function findMatchingLogos(tournamentName: string, category: string): Promise<{ simpleUrl?: string; fullUrl?: string }> {
  const categorySlug = category.toLowerCase().replace(/\s+/g, '-')
  const staticLogo = STATIC_LOGOS.find(l => l.name.toLowerCase() === categorySlug)
  return { simpleUrl: staticLogo?.url }
}

export function getCategoryFallbackLogo(category: string): string {
  const categorySlug = category.toLowerCase().replace(/\s+/g, '-')
  const staticLogo = STATIC_LOGOS.find(l => l.name.toLowerCase() === categorySlug)
  return staticLogo?.url || '/logos/placeholder.svg'
}
