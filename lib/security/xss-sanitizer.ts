/**
 * XSS 방지 유틸리티
 *
 * 사용자 입력을 sanitize하여 XSS 공격을 방지
 */

/**
 * HTML 특수 문자 이스케이프
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * 위험한 HTML 태그 목록
 */
const DANGEROUS_TAGS = [
  "script",
  "iframe",
  "object",
  "embed",
  "applet",
  "meta",
  "link",
  "style",
  "form",
  "input",
  "button",
]

/**
 * 위험한 HTML 속성 목록
 */
const DANGEROUS_ATTRIBUTES = [
  "onclick",
  "onload",
  "onerror",
  "onmouseover",
  "onfocus",
  "onblur",
  "onchange",
  "onsubmit",
]

/**
 * HTML에서 위험한 태그 감지
 */
export function detectDangerousHtml(html: string): boolean {
  const lowerHtml = html.toLowerCase()

  // 위험한 태그 검사
  for (const tag of DANGEROUS_TAGS) {
    if (lowerHtml.includes(`<${tag}`)) {
      return true
    }
  }

  // 위험한 속성 검사
  for (const attr of DANGEROUS_ATTRIBUTES) {
    if (lowerHtml.includes(attr)) {
      return true
    }
  }

  // javascript: protocol 검사
  if (lowerHtml.includes("javascript:")) {
    return true
  }

  // data: URL 검사 (일부 경우 위험할 수 있음)
  if (lowerHtml.includes("data:text/html")) {
    return true
  }

  return false
}

/**
 * Markdown을 안전한 HTML로 변환
 * (실제로는 markdown 라이브러리 사용을 권장)
 */
export function sanitizeMarkdown(markdown: string): string {
  // 간단한 구현: 기본 태그만 허용
  let safe = escapeHtml(markdown)

  // 허용된 Markdown 문법만 변환
  // **bold** -> <strong>bold</strong>
  safe = safe.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")

  // *italic* -> <em>italic</em>
  safe = safe.replace(/\*(.*?)\*/g, "<em>$1</em>")

  // [link](url) -> <a href="url">link</a> (URL 검증 필요)
  safe = safe.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    // URL이 안전한지 검증
    if (isSafeUrl(url)) {
      return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
        text
      )}</a>`
    }
    return escapeHtml(match)
  })

  return safe
}

/**
 * URL이 안전한지 검증
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)

    // http, https 프로토콜만 허용
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false
    }

    // javascript:, data:, file: 등 위험한 프로토콜 차단
    if (url.toLowerCase().startsWith("javascript:")) {
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * 사용자 입력 텍스트 sanitize
 * (일반 텍스트, 검색어 등)
 */
export function sanitizeText(text: string, maxLength: number = 1000): string {
  // HTML 이스케이프
  let safe = escapeHtml(text)

  // 길이 제한
  if (safe.length > maxLength) {
    safe = safe.substring(0, maxLength)
  }

  // 공백 정규화
  safe = safe.trim().replace(/\s+/g, " ")

  return safe
}

/**
 * 파일명 sanitize
 */
export function sanitizeFilename(filename: string): string {
  // 위험한 문자 제거 (/, \, .., null bytes 등)
  let safe = filename
    .replace(/\.\./g, "") // 디렉토리 탐색 방지
    .replace(/[/\\]/g, "") // 경로 구분자 제거
    .replace(/\0/g, "") // null byte 제거
    .replace(/[<>:"|?*]/g, "") // Windows 금지 문자 제거

  // 길이 제한 (255자, 대부분의 파일시스템 제한)
  if (safe.length > 255) {
    const ext = safe.split(".").pop()
    const name = safe.substring(0, 255 - (ext ? ext.length + 1 : 0))
    safe = ext ? `${name}.${ext}` : name
  }

  return safe
}

/**
 * JSON 입력 sanitize
 */
export function sanitizeJsonInput(input: unknown): unknown {
  if (typeof input === "string") {
    return sanitizeText(input)
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeJsonInput)
  }

  if (input && typeof input === "object") {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input)) {
      // 키도 sanitize
      const safeKey = sanitizeText(key, 100)
      sanitized[safeKey] = sanitizeJsonInput(value)
    }
    return sanitized
  }

  return input
}

/**
 * 허용된 도메인 목록 (이미지, 비디오 등)
 */
const ALLOWED_DOMAINS = [
  "youtube.com",
  "youtu.be",
  "i.ytimg.com",
  "img.youtube.com",
  "googleusercontent.com",
  "supabase.co",
]

/**
 * 외부 리소스 URL 검증
 */
export function isAllowedResourceUrl(url: string): boolean {
  try {
    const parsed = new URL(url)

    // HTTPS만 허용
    if (parsed.protocol !== "https:") {
      return false
    }

    // 허용된 도메인인지 확인
    const hostname = parsed.hostname
    return ALLOWED_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    )
  } catch {
    return false
  }
}

/**
 * 사용자 생성 콘텐츠 sanitize (포스트, 댓글 등)
 */
export function sanitizeUserContent(content: string, allowMarkdown: boolean = false): {
  safe: string
  warnings: string[]
} {
  const warnings: string[] = []

  // 위험한 HTML 감지
  if (detectDangerousHtml(content)) {
    warnings.push("위험한 HTML 태그가 감지되어 제거되었습니다")
  }

  // Markdown 허용 여부에 따라 처리
  const safe = allowMarkdown ? sanitizeMarkdown(content) : sanitizeText(content)

  // 길이 제한 (포스트: 10000자, 댓글: 2000자)
  const maxLength = allowMarkdown ? 10000 : 2000
  if (safe.length > maxLength) {
    warnings.push(`콘텐츠가 ${maxLength}자로 제한되었습니다`)
  }

  return {
    safe: safe.substring(0, maxLength),
    warnings,
  }
}
