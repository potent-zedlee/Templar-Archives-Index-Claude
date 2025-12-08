/**
  * Formats chip counts into a readable string (e.g., 1.5M, 500k)
  */
export const formatChips = (chips: number): string => {
    if (chips >= 1000000) return `${(chips / 1000000).toFixed(chips % 1000000 === 0 ? 0 : 1)}M`
    if (chips >= 1000) return `${(chips / 1000).toFixed(chips % 1000 === 0 ? 0 : 1)}k`
    return chips.toString()
}

/**
 * Formats blinds and ante into a standard string format (SB/BB/Ante)
 */
export const formatBlinds = (sb?: number, bb?: number, ante?: number): string => {
    if (!bb && !sb) return ''

    const parts = []
    if (sb) parts.push(formatChips(sb))
    if (bb) parts.push(formatChips(bb))
    if (ante && ante > 0) parts.push(formatChips(ante))

    return parts.join('/')
}
