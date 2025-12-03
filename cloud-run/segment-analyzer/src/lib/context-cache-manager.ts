/**
 * Context Cache Manager - Vertex AI 캐시 관리
 *
 * 프롬프트 캐싱으로 반복 호출 시 90% 토큰 비용 절감
 * - 최소 2,048 토큰 필요
 * - TTL 기반 자동 만료
 * - Phase 2 배치 프롬프트 캐싱
 *
 * @google/genai SDK 사용
 */

import { GoogleGenAI } from '@google/genai'
import { PHASE2_BATCH_PROMPT } from './prompts/phase2-batch-prompt'

export type Platform = 'ept' | 'triton' | 'wsop'

interface CacheEntry {
  name: string
  expiresAt: Date
}

// 플랫폼별 추가 지시사항
const PLATFORM_NOTES: Record<Platform, string> = {
  ept: 'EPT: European Poker Tour standard format.',
  triton: 'Triton: Big blind ante format (SB/BB/Ante). May use HKD currency.',
  wsop: 'WSOP: World Series of Poker standard format.',
}

export class ContextCacheManager {
  private ai: GoogleGenAI
  private caches: Map<string, CacheEntry> = new Map()
  private model: string

  constructor(ai: GoogleGenAI, model: string = 'gemini-2.5-flash') {
    this.ai = ai
    this.model = model
  }

  /**
   * Phase 2 배치 프롬프트 캐시 생성 또는 기존 캐시 반환
   *
   * @param platform 포커 플랫폼 (ept, triton, wsop)
   * @returns 캐시 이름 (generateContent에서 cachedContent로 사용)
   */
  async getOrCreatePhase2Cache(platform: Platform): Promise<string> {
    const cacheKey = `phase2_batch_${platform}`
    const existing = this.caches.get(cacheKey)

    // 캐시가 존재하고 만료 5분 전이면 재사용
    if (existing && existing.expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
      console.log(`[ContextCache] 기존 캐시 재사용: ${cacheKey}`)
      return existing.name
    }

    // 기존 캐시 삭제 (만료 임박)
    if (existing) {
      try {
        await this.ai.caches.delete({ name: existing.name })
        console.log(`[ContextCache] 만료 임박 캐시 삭제: ${existing.name}`)
      } catch (e) {
        // 이미 삭제된 경우 무시
      }
      this.caches.delete(cacheKey)
    }

    // 새 캐시 생성
    const basePrompt = PHASE2_BATCH_PROMPT + `\n\n## Platform\n${PLATFORM_NOTES[platform]}`

    console.log(`[ContextCache] 새 캐시 생성 중: ${cacheKey}`)

    try {
      const cache = await this.ai.caches.create({
        model: this.model,
        config: {
          contents: [
            {
              role: 'user',
              parts: [{ text: basePrompt }],
            },
          ],
          displayName: cacheKey,
          ttl: '3600s', // 1시간 (분석 작업 평균 시간)
        },
      })

      const cacheName = cache.name!
      const expiresAt = new Date(Date.now() + 3600 * 1000)

      this.caches.set(cacheKey, { name: cacheName, expiresAt })

      console.log(`[ContextCache] 캐시 생성 완료: ${cacheName} (만료: ${expiresAt.toISOString()})`)

      return cacheName
    } catch (error) {
      console.error(`[ContextCache] 캐시 생성 실패:`, error)
      throw error
    }
  }

  /**
   * 특정 캐시 삭제
   */
  async deleteCache(platform: Platform): Promise<void> {
    const cacheKey = `phase2_batch_${platform}`
    const existing = this.caches.get(cacheKey)

    if (existing) {
      try {
        await this.ai.caches.delete({ name: existing.name })
        console.log(`[ContextCache] 캐시 삭제: ${existing.name}`)
      } catch (e) {
        // 이미 삭제된 경우 무시
      }
      this.caches.delete(cacheKey)
    }
  }

  /**
   * 만료된 캐시 정리
   */
  async cleanup(): Promise<void> {
    const now = new Date()
    const expiredKeys: string[] = []

    for (const [key, value] of this.caches.entries()) {
      if (value.expiresAt < now) {
        try {
          await this.ai.caches.delete({ name: value.name })
          console.log(`[ContextCache] 만료 캐시 삭제: ${value.name}`)
        } catch (e) {
          // 이미 삭제된 경우 무시
        }
        expiredKeys.push(key)
      }
    }

    for (const key of expiredKeys) {
      this.caches.delete(key)
    }

    if (expiredKeys.length > 0) {
      console.log(`[ContextCache] ${expiredKeys.length}개 만료 캐시 정리 완료`)
    }
  }

  /**
   * 모든 캐시 삭제 (작업 완료 시)
   */
  async clearAll(): Promise<void> {
    for (const [key, value] of this.caches.entries()) {
      try {
        await this.ai.caches.delete({ name: value.name })
        console.log(`[ContextCache] 캐시 삭제: ${value.name}`)
      } catch (e) {
        // 이미 삭제된 경우 무시
      }
    }
    this.caches.clear()
    console.log(`[ContextCache] 모든 캐시 정리 완료`)
  }

  /**
   * 현재 활성 캐시 수
   */
  get activeCacheCount(): number {
    return this.caches.size
  }
}

// 싱글톤 인스턴스 (선택적 사용)
let _cacheManager: ContextCacheManager | null = null

export function getContextCacheManager(ai: GoogleGenAI): ContextCacheManager {
  if (!_cacheManager) {
    _cacheManager = new ContextCacheManager(ai)
  }
  return _cacheManager
}

export function resetContextCacheManager(): void {
  _cacheManager = null
}
