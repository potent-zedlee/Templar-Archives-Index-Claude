/**
 * 2FA (Two-Factor Authentication) 유틸리티
 *
 * TOTP (Time-based One-Time Password) 방식의 2FA 기능을 제공합니다.
 *
 * @module lib/two-factor
 */

import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import crypto from 'crypto'

// TOTP 설정
authenticator.options = {
  digits: 6,
  step: 30, // 30초 주기
  window: 1, // 앞뒤 1단계 허용 (총 90초 유효)
}

// 암호화 설정
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16

/**
 * 암호화 키 생성 (환경변수에서 가져옴)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.TWO_FACTOR_ENCRYPTION_KEY
  if (!key) {
    throw new Error('TWO_FACTOR_ENCRYPTION_KEY 환경변수가 설정되지 않았습니다.')
  }
  // 32바이트 키로 해시
  return crypto.createHash('sha256').update(key).digest()
}

/**
 * TOTP 시크릿 생성
 *
 * @returns Base32로 인코딩된 시크릿 문자열
 */
export function generateTOTPSecret(): string {
  return authenticator.generateSecret()
}

/**
 * TOTP 시크릿 암호화
 *
 * @param secret - 암호화할 시크릿
 * @returns 암호화된 문자열 (iv:encrypted:tag 형식)
 */
export function encryptSecret(secret: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv)

  let encrypted = cipher.update(secret, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`
}

/**
 * TOTP 시크릿 복호화
 *
 * @param encryptedSecret - 암호화된 시크릿 문자열
 * @returns 복호화된 시크릿
 */
export function decryptSecret(encryptedSecret: string): string {
  const key = getEncryptionKey()
  const parts = encryptedSecret.split(':')

  if (parts.length !== 3) {
    throw new Error('잘못된 암호화 형식입니다.')
  }

  const [ivHex, encrypted, tagHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * QR 코드 Data URL 생성
 *
 * @param secret - TOTP 시크릿
 * @param email - 사용자 이메일
 * @param issuer - 서비스 이름 (기본값: Templar Archives)
 * @returns QR 코드 Data URL
 */
export async function generateQRCode(
  secret: string,
  email: string,
  issuer: string = 'Templar Archives'
): Promise<string> {
  const otpAuthUrl = authenticator.keyuri(email, issuer, secret)

  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      margin: 2,
      width: 256,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
    return qrCodeDataUrl
  } catch (error) {
    console.error('QR 코드 생성 실패:', error)
    throw new Error('QR 코드를 생성하는데 실패했습니다.')
  }
}

/**
 * TOTP 코드 검증
 *
 * @param code - 사용자가 입력한 6자리 코드
 * @param secret - TOTP 시크릿
 * @returns 검증 결과 (true: 유효, false: 무효)
 */
export function verifyTOTPCode(code: string, secret: string): boolean {
  try {
    return authenticator.verify({ token: code, secret })
  } catch {
    return false
  }
}

/**
 * 백업 코드 생성
 *
 * @param count - 생성할 백업 코드 개수 (기본값: 8)
 * @returns 백업 코드 배열 (각 코드는 8자리 영숫자)
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = []
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

  for (let i = 0; i < count; i++) {
    let code = ''
    for (let j = 0; j < 8; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    // 4-4 형식으로 포맷팅 (예: ABCD-1234)
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
  }

  return codes
}

/**
 * 백업 코드 해시화
 *
 * @param code - 평문 백업 코드
 * @returns SHA256 해시 문자열
 */
export function hashBackupCode(code: string): string {
  // 하이픈 제거하고 대문자로 정규화
  const normalizedCode = code.replace(/-/g, '').toUpperCase()
  return crypto.createHash('sha256').update(normalizedCode).digest('hex')
}

/**
 * 백업 코드 배열 해시화
 *
 * @param codes - 평문 백업 코드 배열
 * @returns 해시된 백업 코드 배열
 */
export function hashBackupCodes(codes: string[]): string[] {
  return codes.map(hashBackupCode)
}

/**
 * 백업 코드 검증
 *
 * @param inputCode - 사용자가 입력한 백업 코드
 * @param hashedCodes - 해시된 백업 코드 배열
 * @returns 일치하는 코드의 인덱스 (-1이면 불일치)
 */
export function verifyBackupCode(inputCode: string, hashedCodes: string[]): number {
  const inputHash = hashBackupCode(inputCode)
  return hashedCodes.findIndex((hash) => hash === inputHash)
}

/**
 * TOTP 시크릿을 사람이 읽기 쉬운 형식으로 포맷팅
 *
 * @param secret - TOTP 시크릿
 * @returns 4자리씩 분리된 문자열
 */
export function formatSecret(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(' ') || secret
}
