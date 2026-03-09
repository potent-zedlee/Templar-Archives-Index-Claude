/**
 * Time utility functions
 */

/**
 * Format seconds into HH:MM:SS or MM:SS
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00"

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  const parts = []
  if (h > 0) {
    parts.push(h.toString().padStart(2, "0"))
  }
  parts.push(m.toString().padStart(2, "0"))
  parts.push(s.toString().padStart(2, "0"))

  return parts.join(":")
}

/**
 * Parse HH:MM:SS or MM:SS to seconds
 */
export function timeToSeconds(timeStr: string): number {
  if (!timeStr) return 0
  const parts = timeStr.split(":").map(Number)
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return parts[0] || 0
}
