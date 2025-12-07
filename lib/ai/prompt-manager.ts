/**
 * AI Prompt Manager
 *
 * Dynamically loads AI prompts from systemConfigs collection with caching
 * Falls back to hardcoded prompts if DB fetch fails
 *
 * Firestore 버전으로 마이그레이션됨
 */

import { firestore } from '@/lib/db/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { COLLECTION_PATHS } from '@/lib/db/firestore-types'
import { EPT_PROMPT, TRITON_POKER_PROMPT } from '@/lib/ai/prompts'

type Platform = 'ept' | 'triton'

interface CachedPrompt {
  content: string
  timestamp: number
}

// In-memory cache (5 minutes TTL)
const promptCache = new Map<string, CachedPrompt>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get AI prompt for specified platform
 *
 * 1. Check memory cache
 * 2. Fetch from database (systemConfigs collection)
 * 3. Fallback to hardcoded prompts if DB fails
 *
 * @param platform - 'ept' or 'triton'
 * @returns Prompt string
 */
export async function getPrompt(platform: Platform): Promise<string> {
  const cacheKey = `ai_prompt_${platform}`

  // 1. Check cache
  const cached = promptCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.content
  }

  try {
    // 2. Fetch from Firestore
    const configRef = doc(firestore, COLLECTION_PATHS.SYSTEM_CONFIGS, cacheKey)
    const configSnap = await getDoc(configRef)

    if (!configSnap.exists()) {
      console.warn(`[prompt-manager] Config not found for ${platform}, using fallback`)
      return getFallbackPrompt(platform)
    }

    const data = configSnap.data()
    const content = data?.value?.content as string

    if (!content || typeof content !== 'string') {
      console.warn(`[prompt-manager] Invalid prompt content for ${platform}, using fallback`)
      return getFallbackPrompt(platform)
    }

    // 3. Update cache
    promptCache.set(cacheKey, { content, timestamp: Date.now() })

    return content
  } catch (error) {
    console.error(`[prompt-manager] Error fetching prompt for ${platform}:`, error)
    return getFallbackPrompt(platform)
  }
}

/**
 * Get fallback prompt from hardcoded constants
 */
function getFallbackPrompt(platform: Platform): string {
  return platform === 'ept' ? EPT_PROMPT : TRITON_POKER_PROMPT
}

/**
 * Clear prompt cache
 *
 * Call this after updating prompts in the database
 * to ensure fresh prompts are fetched
 */
export function clearPromptCache(): void {
  promptCache.clear()
  console.log('[prompt-manager] Prompt cache cleared')
}

/**
 * Clear specific prompt from cache
 */
export function clearPromptCacheForPlatform(platform: Platform): void {
  const cacheKey = `ai_prompt_${platform}`
  promptCache.delete(cacheKey)
  console.log(`[prompt-manager] Cache cleared for ${platform}`)
}

/**
 * Prefetch prompts into cache
 *
 * Useful for warming up the cache on server start
 */
export async function prefetchPrompts(): Promise<void> {
  try {
    await Promise.all([
      getPrompt('ept'),
      getPrompt('triton'),
    ])
    console.log('[prompt-manager] Prompts prefetched successfully')
  } catch (error) {
    console.error('[prompt-manager] Error prefetching prompts:', error)
  }
}
