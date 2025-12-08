/**
 * Admin Archive Manager Page
 *
 * 파일 매니저 스타일로 Tournament/Event/Stream을 관리하는 페이지
 * - 드래그앤드롭으로 항목 이동
 * - 컨텍스트 메뉴로 편집/삭제
 * - Unsorted Videos 정리
 */

import { ArchiveManager } from './_components/ArchiveManager'

export default function AdminArchiveManagePage() {
  return <ArchiveManager />
}
