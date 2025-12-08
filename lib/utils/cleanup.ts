/**
 * Cleanup Utilities
 *
 * 임시 파일, 리소스, 프로세스 정리 유틸리티
 */

import fs from 'fs/promises'
import path from 'path'

/**
 * 임시 디렉토리 삭제
 */
export async function cleanupTempDirectory(dirPath: string): Promise<void> {
  try {
    const exists = await fs
      .access(dirPath)
      .then(() => true)
      .catch(() => false)

    if (exists) {
      await fs.rm(dirPath, { recursive: true, force: true })
      console.log(`[cleanup] Deleted temp directory: ${dirPath}`)
    }
  } catch (error) {
    console.error(`[cleanup] Failed to delete temp directory ${dirPath}:`, error)
    // 실패해도 에러를 throw하지 않음 (정리 작업은 best-effort)
  }
}

/**
 * 여러 임시 디렉토리 삭제
 */
export async function cleanupTempDirectories(dirPaths: string[]): Promise<void> {
  await Promise.all(dirPaths.map((dir) => cleanupTempDirectory(dir)))
}

/**
 * 임시 파일 삭제
 */
export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath)
    console.log(`[cleanup] Deleted temp file: ${filePath}`)
  } catch (error) {
    console.error(`[cleanup] Failed to delete temp file ${filePath}:`, error)
  }
}

/**
 * 여러 임시 파일 삭제
 */
export async function cleanupTempFiles(filePaths: string[]): Promise<void> {
  await Promise.all(filePaths.map((file) => cleanupTempFile(file)))
}

/**
 * /tmp 디렉토리의 오래된 파일 정리 (1시간 이상)
 */
export async function cleanupOldTempFiles(maxAgeMs: number = 3600000): Promise<void> {
  try {
    const tmpDir = '/tmp'
    const entries = await fs.readdir(tmpDir, { withFileTypes: true })
    const now = Date.now()

    for (const entry of entries) {
      // frames_로 시작하는 디렉토리만 처리
      if (entry.isDirectory() && entry.name.startsWith('frames_')) {
        const fullPath = path.join(tmpDir, entry.name)
        try {
          const stats = await fs.stat(fullPath)
          const age = now - stats.mtimeMs

          if (age > maxAgeMs) {
            await cleanupTempDirectory(fullPath)
            console.log(`[cleanup] Deleted old temp directory: ${entry.name} (age: ${Math.round(age / 60000)}m)`)
          }
        } catch (error) {
          console.error(`[cleanup] Failed to check/delete ${entry.name}:`, error)
        }
      }
    }
  } catch (error) {
    console.error(`[cleanup] Failed to cleanup old temp files:`, error)
  }
}

/**
 * Cleanup Context - 정리 작업 추적
 */
export class CleanupContext {
  private tempDirs: Set<string> = new Set()
  private tempFiles: Set<string> = new Set()

  /**
   * 임시 디렉토리 등록
   */
  registerTempDir(dirPath: string): void {
    this.tempDirs.add(dirPath)
  }

  /**
   * 임시 파일 등록
   */
  registerTempFile(filePath: string): void {
    this.tempFiles.add(filePath)
  }

  /**
   * 모든 리소스 정리
   */
  async cleanup(): Promise<void> {
    console.log(`[cleanup] Starting cleanup: ${this.tempDirs.size} dirs, ${this.tempFiles.size} files`)

    // 파일 정리
    await cleanupTempFiles(Array.from(this.tempFiles))
    this.tempFiles.clear()

    // 디렉토리 정리
    await cleanupTempDirectories(Array.from(this.tempDirs))
    this.tempDirs.clear()

    console.log(`[cleanup] Cleanup completed`)
  }

  /**
   * 특정 디렉토리 등록 해제 (이미 정리된 경우)
   */
  unregisterTempDir(dirPath: string): void {
    this.tempDirs.delete(dirPath)
  }

  /**
   * 특정 파일 등록 해제
   */
  unregisterTempFile(filePath: string): void {
    this.tempFiles.delete(filePath)
  }
}

/**
 * try-finally 패턴 헬퍼
 */
export async function withCleanup<T>(
  fn: (ctx: CleanupContext) => Promise<T>
): Promise<T> {
  const ctx = new CleanupContext()
  try {
    return await fn(ctx)
  } finally {
    await ctx.cleanup()
  }
}
