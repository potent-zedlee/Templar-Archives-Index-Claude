"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, FileJson, FileText, Table, FileCode } from "lucide-react"
import { toast } from "sonner"
import type { Hand } from "@/lib/types/archive"
import {
  exportHands,
  downloadHandAsOHH,
  downloadHandAsText,
  type ExportFormat,
} from "@/lib/export/hand-history-export"

interface HandExportButtonProps {
  /** 단일 핸드 내보내기 */
  hand?: Hand
  /** 여러 핸드 내보내기 */
  hands?: Hand[]
  /** 버튼 크기 */
  size?: "default" | "sm" | "lg" | "icon"
  /** 버튼 variant */
  variant?: "default" | "outline" | "ghost" | "secondary"
  /** 커스텀 파일명 (확장자 제외) */
  filename?: string
  /** 사이트 이름 (OHH 포맷용) */
  siteName?: string
  /** 아이콘만 표시 */
  iconOnly?: boolean
}

/**
 * 핸드 히스토리 내보내기 버튼
 *
 * 단일 핸드 또는 여러 핸드를 다양한 포맷으로 내보낼 수 있습니다.
 *
 * 지원 포맷:
 * - OHH (Open Hand History): PokerTracker 4 호환
 * - JSON: 원본 데이터
 * - Text: PokerStars 스타일 텍스트
 * - CSV: 스프레드시트용
 *
 * @example
 * // 단일 핸드 내보내기
 * <HandExportButton hand={hand} />
 *
 * // 여러 핸드 내보내기
 * <HandExportButton hands={selectedHands} />
 */
export function HandExportButton({
  hand,
  hands,
  size = "sm",
  variant = "outline",
  filename,
  siteName = "Templar Archives",
  iconOnly = false,
}: HandExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  // 내보낼 핸드 목록
  const handsToExport = hands || (hand ? [hand] : [])
  const isSingleHand = handsToExport.length === 1
  const handCount = handsToExport.length

  if (handCount === 0) {
    return null
  }

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true)

    try {
      const options = { siteName }

      if (isSingleHand) {
        const singleHand = handsToExport[0]
        const defaultFilename = filename || `hand-${singleHand.number}`

        switch (format) {
          case "ohh":
            downloadHandAsOHH(singleHand, defaultFilename, options)
            break
          case "text":
            downloadHandAsText(singleHand, defaultFilename)
            break
          default:
            exportHands([singleHand], format, defaultFilename, options)
        }
      } else {
        const defaultFilename = filename || `hands-export-${handCount}`
        exportHands(handsToExport, format, defaultFilename, options)
      }

      toast.success(`${handCount}개 핸드를 ${format.toUpperCase()} 포맷으로 내보냈습니다.`)
    } catch (error) {
      console.error("Export failed:", error)
      toast.error("내보내기에 실패했습니다.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting}>
          <Download className="h-4 w-4" />
          {!iconOnly && (
            <span className="ml-1">
              {isExporting ? "내보내는 중..." : "내보내기"}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          {isSingleHand
            ? `Hand #${handsToExport[0].number} 내보내기`
            : `${handCount}개 핸드 내보내기`}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => handleExport("ohh")}>
          <FileCode className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>OHH (Open Hand History)</span>
            <span className="text-xs text-muted-foreground">
              PokerTracker 4 호환
            </span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport("json")}>
          <FileJson className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>JSON</span>
            <span className="text-xs text-muted-foreground">원본 데이터</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport("text")}>
          <FileText className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>Text</span>
            <span className="text-xs text-muted-foreground">
              PokerStars 스타일
            </span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <Table className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>CSV</span>
            <span className="text-xs text-muted-foreground">스프레드시트용</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
