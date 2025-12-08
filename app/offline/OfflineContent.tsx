'use client'

import Link from 'next/link'
import { WifiOff, Home, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function OfflineContent() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-6 px-4 max-w-md">
                <div className="flex justify-center">
                    <div className="rounded-full bg-muted p-6">
                        <WifiOff className="h-16 w-16 text-muted-foreground" aria-hidden="true" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">
                        오프라인 상태입니다
                    </h1>
                    <p className="text-muted-foreground">
                        인터넷 연결을 확인하고 다시 시도해주세요.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                        variant="default"
                        onClick={() => window.location.reload()}
                        className="gap-2"
                    >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        다시 시도
                    </Button>
                    <Link href="/">
                        <Button variant="outline" className="gap-2">
                            <Home className="h-4 w-4" aria-hidden="true" />
                            홈으로
                        </Button>
                    </Link>
                </div>

                <div className="pt-6 border-t border-border">
                    <h2 className="text-sm font-semibold mb-2">오프라인 중 가능한 기능</h2>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>- 최근 조회한 핸드 히스토리 보기</li>
                        <li>- 캐시된 페이지 탐색</li>
                        <li>- 저장된 북마크 확인</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
