"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Clock, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/layout/AuthProvider"
import { type EditRequestStatus } from "@/lib/hand-edit-requests"
import { useUserEditRequestsQuery } from "@/lib/queries/edit-requests-queries"

const EDIT_TYPE_LABELS: Record<string, string> = {
  "basic_info": "기본 정보",
  "board": "보드 & 팟",
  "players": "플레이어",
  "actions": "액션"
}

export default function EditRequestsClient() {
  const router = useRouter()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved" | "rejected">("all")

  // React Query hook
  const statusFilter: EditRequestStatus | undefined = activeTab === "all" ? undefined : activeTab as EditRequestStatus
  const { data: requests = [], isLoading: loading } = useUserEditRequestsQuery(
    user?.id || "",
    statusFilter
  )

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
    }
  }, [user, router])

  function getStatusBadge(status: string) {
    switch (status) {
      case "pending":
        return (
          <span className="px-2 py-1 border border-gold-600 bg-black-200 text-xs uppercase flex items-center gap-1">
            <Clock className="h-3 w-3" />
            대기 중
          </span>
        )
      case "approved":
        return (
          <span className="px-2 py-1 border border-gold-400 bg-gold-700/20 text-gold-400 text-xs uppercase flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            승인됨
          </span>
        )
      case "rejected":
        return (
          <span className="px-2 py-1 border border-destructive bg-destructive/10 text-destructive text-xs uppercase flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            거부됨
          </span>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container max-w-7xl mx-auto py-8 px-4">
          <div className="text-center text-black-600">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-heading text-2xl mb-2">내 수정 제안</h1>
          <p className="text-black-600">
            제출한 핸드 수정 제안 내역을 확인하세요
          </p>
        </div>

        {/* Tabs */}
        <div className="space-y-6">
          <div className="flex gap-2 flex-wrap border-b-2 border-black-300">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 border-b-2 -mb-0.5 transition-colors ${
                activeTab === "all"
                  ? "border-gold-400 text-gold-400"
                  : "border-transparent text-black-600 hover:text-black-800"
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-2 border-b-2 -mb-0.5 transition-colors flex items-center gap-2 ${
                activeTab === "pending"
                  ? "border-gold-400 text-gold-400"
                  : "border-transparent text-black-600 hover:text-black-800"
              }`}
            >
              대기 중
              {requests.filter(r => r.status === "pending").length > 0 && (
                <span className="px-2 py-0.5 border border-gold-600 bg-gold-700/20 text-xs font-mono">
                  {requests.filter(r => r.status === "pending").length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("approved")}
              className={`px-4 py-2 border-b-2 -mb-0.5 transition-colors ${
                activeTab === "approved"
                  ? "border-gold-400 text-gold-400"
                  : "border-transparent text-black-600 hover:text-black-800"
              }`}
            >
              승인됨
            </button>
            <button
              onClick={() => setActiveTab("rejected")}
              className={`px-4 py-2 border-b-2 -mb-0.5 transition-colors ${
                activeTab === "rejected"
                  ? "border-gold-400 text-gold-400"
                  : "border-transparent text-black-600 hover:text-black-800"
              }`}
            >
              거부됨
            </button>
          </div>

          <div>
            {requests.length === 0 ? (
              <div className="card-postmodern p-12 text-center">
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 border-2 border-black-400 bg-black-200 flex items-center justify-center">
                    <Clock className="h-8 w-8 text-black-600" />
                  </div>
                </div>
                <h3 className="text-heading mb-2">수정 제안이 없습니다</h3>
                <p className="text-black-600 mb-6">
                  핸드 상세 페이지에서 수정이 필요한 내용을 제안할 수 있습니다
                </p>
              </div>
            ) : (
              <div className="card-postmodern overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-6 gap-4 p-4 border-b-2 border-black-300 bg-black-200">
                  <div className="text-caption">핸드</div>
                  <div className="text-caption">수정 유형</div>
                  <div className="text-caption">제출 날짜</div>
                  <div className="text-caption">상태</div>
                  <div className="text-caption">검토 날짜</div>
                  <div className="text-caption">액션</div>
                </div>

                {/* Table Body */}
                {requests.map((request, index) => (
                  <div
                    key={request.id}
                    className={`grid grid-cols-6 gap-4 p-4 border-b border-black-300 hover:bg-black-200 transition-colors ${
                      index === requests.length - 1 ? 'border-b-0' : ''
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="font-medium font-mono">
                        #{(request as any).hand?.number}
                      </div>
                      <div className="text-xs text-black-600">
                        {(request as any).hand?.stream?.event?.tournament?.name}
                      </div>
                    </div>
                    <div>
                      <span className="px-2 py-1 border border-black-400 text-xs uppercase">
                        {EDIT_TYPE_LABELS[request.editType]}
                      </span>
                    </div>
                    <div className="font-mono text-sm">
                      {new Date(request.createdAt).toLocaleDateString("ko-KR")}
                    </div>
                    <div>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="font-mono text-sm">
                      {request.reviewedAt
                        ? new Date(request.reviewedAt).toLocaleDateString("ko-KR")
                        : "-"}
                    </div>
                    <div>
                      <Link
                        href={`/archive?hand=${request.handId}`}
                        className="btn-secondary text-sm"
                      >
                        핸드 보기
                      </Link>
                    </div>
                  </div>
                ))}

                {/* Admin comment for rejected/approved requests */}
                {requests.some(r => (r.status !== "pending" && r.adminComment)) && (
                  <div className="p-6 border-t-2 border-black-300 space-y-3">
                    <h3 className="text-caption">관리자 코멘트</h3>
                    {requests
                      .filter(r => r.status !== "pending" && r.adminComment)
                      .map(r => (
                        <div key={r.id} className="card-postmodern p-4 bg-black-200">
                          <div className="flex items-start gap-3">
                            <span className="px-2 py-1 border border-black-400 text-xs uppercase font-mono">
                              #{(r as any).hand?.number}
                            </span>
                            <div className="flex-1 text-sm">
                              <p className="text-black-600">{r.adminComment}</p>
                              <p className="text-xs text-black-600 mt-1 font-mono">
                                {new Date(r.reviewedAt!).toLocaleString("ko-KR")}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
