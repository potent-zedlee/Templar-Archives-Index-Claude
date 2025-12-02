"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/components/layout/AuthProvider"
import { isAdmin } from "@/lib/admin"
import { type HandEditRequest } from "@/lib/hand-edit-requests"
import {
  useEditRequestsQuery,
  useApproveEditRequestMutation,
  useRejectEditRequestMutation,
} from "@/lib/queries/admin-queries"
import { CheckCircle, XCircle, Download } from "lucide-react"
import Link from "next/link"
import { exportHandEditRequests } from "@/lib/export-utils"

const EDIT_TYPE_LABELS: Record<string, string> = {
  "basic_info": "Basic Info",
  "board": "Board & Pot",
  "players": "Players",
  "actions": "Actions"
}

export default function EditRequestsClient() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [selectedRequest, setSelectedRequest] = useState<HandEditRequest | null>(null)
  const [adminComment, setAdminComment] = useState("")
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null)
  const [activeTab, setActiveTab] = useState<"pending" | "reviewed">("pending")

  // React Query hooks
  const { data: requests = [], isLoading: loading } = useEditRequestsQuery()
  const approveEditRequestMutation = useApproveEditRequestMutation()
  const rejectEditRequestMutation = useRejectEditRequestMutation()

  useEffect(() => {
    async function checkAdminAccess() {
      // Wait for auth loading to complete
      if (authLoading) return

      if (!user) {
        router.push("/auth/login")
        return
      }

      const adminStatus = await isAdmin(user.id)
      if (!adminStatus) {
        router.push("/")
        return
      }
    }

    checkAdminAccess()
  }, [user, authLoading, router])

  function handleReviewClick(request: HandEditRequest, action: "approve" | "reject") {
    setSelectedRequest(request)
    setActionType(action)
    setAdminComment("")
  }

  function handleSubmitReview() {
    if (!selectedRequest || !user || !actionType) return

    if (actionType === "approve") {
      approveEditRequestMutation.mutate(
        { requestId: selectedRequest.id, adminId: user.id },
        {
          onSuccess: () => {
            setSelectedRequest(null)
            setActionType(null)
            setAdminComment("")
          },
          onError: (error) => {
            console.error("Error approving edit request:", error)
            alert("Failed to approve request.")
          }
        }
      )
    } else {
      rejectEditRequestMutation.mutate(
        { requestId: selectedRequest.id, adminId: user.id, adminComment: adminComment },
        {
          onSuccess: () => {
            setSelectedRequest(null)
            setActionType(null)
            setAdminComment("")
          },
          onError: (error) => {
            console.error("Error rejecting edit request:", error)
            alert("Failed to reject request.")
          }
        }
      )
    }
  }

  function getDiffView(request: HandEditRequest) {
    const { originalData, proposedData } = request

    return (
      <div className="space-y-4">
        {Object.keys(proposedData).map((key) => {
          const originalValue = originalData[key]
          const proposedValue = proposedData[key]

          // Handle arrays (players)
          if (Array.isArray(proposedValue)) {
            return (
              <div key={key} className="space-y-2">
                <label className="text-sm font-semibold">{key}</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Original</div>
                    <div className="space-y-2">
                      {Array.isArray(originalValue) && originalValue.map((item: any, i: number) => (
                        <div key={i} className="p-2 bg-red-50 dark:bg-red-950/20 border border-border rounded-lg text-xs">
                          {JSON.stringify(item, null, 2)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Modified</div>
                    <div className="space-y-2">
                      {proposedValue.map((item: any, i: number) => (
                        <div key={i} className="p-2 bg-green-50 dark:bg-green-950/20 border border-border rounded-lg text-xs">
                          {JSON.stringify(item, null, 2)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          // Handle simple values
          if (originalValue !== proposedValue) {
            return (
              <div key={key} className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">{key} (Original)</label>
                  <div className="mt-1 p-2 bg-red-50 dark:bg-red-950/20 rounded text-sm line-through">
                    {String(originalValue || "-")}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{key} (Modified)</label>
                  <div className="mt-1 p-2 bg-green-50 dark:bg-green-950/20 rounded text-sm font-semibold">
                    {String(proposedValue || "-")}
                  </div>
                </div>
              </div>
            )
          }

          return null
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const pendingRequests = requests.filter((r: any) => r.status === "pending")
  const reviewedRequests = requests.filter((r: any) => r.status !== "pending")

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-title-lg mb-2">Hand Edit Request Management</h1>
        <p className="text-body text-muted-foreground">
          Review and approve or reject hand edit requests submitted by users
        </p>
      </div>

      {/* Custom Tabs */}
      <div className="space-y-6">
        {/* Tab List */}
        <div className="border-b border-border">
          <nav className="flex gap-6 -mb-px" aria-label="Edit request tabs">
            <button
              onClick={() => setActiveTab("pending")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "pending"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
              aria-current={activeTab === "pending" ? "page" : undefined}
            >
              Pending
              {pendingRequests.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-destructive text-destructive-foreground">
                  {pendingRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("reviewed")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "reviewed"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
              aria-current={activeTab === "reviewed" ? "page" : undefined}
            >
              Reviewed
            </button>
          </nav>
        </div>

        {/* Pending Requests */}
        {activeTab === "pending" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => {
                  if (pendingRequests.length === 0) {
                    toast.error('내보낼 데이터가 없습니다')
                    return
                  }
                  const exportData = pendingRequests.map((r: any) => ({
                    id: r.id,
                    hand_id: r.hand_id,
                    requester_id: r.requester_id,
                    edit_type: r.edit_type,
                    status: r.status,
                    suggested_changes: r.proposed_data,
                    reason: r.reason,
                    created_at: r.created_at,
                    reviewed_at: r.reviewed_at,
                  }))
                  exportHandEditRequests(exportData as any, 'csv')
                  toast.success('CSV 파일이 다운로드되었습니다')
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
            <div className="border rounded-lg p-6">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No pending edit requests
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 text-sm font-medium">Hand</th>
                        <th className="text-left py-3 px-2 text-sm font-medium">Edit Type</th>
                        <th className="text-left py-3 px-2 text-sm font-medium">Submitter</th>
                        <th className="text-left py-3 px-2 text-sm font-medium">Submitted</th>
                        <th className="text-left py-3 px-2 text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRequests.map((request: any) => (
                        <tr key={request.id} className="border-b border-border last:border-0">
                          <td className="py-3 px-2">
                            <div className="space-y-1">
                              <div className="font-medium">
                                #{(request as any).hand?.number}
                              </div>
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {(request as any).hand?.stream?.event?.tournament?.name}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium border border-border rounded">
                              {EDIT_TYPE_LABELS[request.edit_type]}
                            </span>
                          </td>
                          <td className="py-3 px-2">{request.requester_name}</td>
                          <td className="py-3 px-2">
                            {new Date(request.created_at).toLocaleDateString("ko-KR")}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleReviewClick(request, "approve")}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleReviewClick(request, "reject")}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                              >
                                <XCircle className="h-4 w-4" />
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reviewed Requests */}
        {activeTab === "reviewed" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => {
                  if (reviewedRequests.length === 0) {
                    toast.error('내보낼 데이터가 없습니다')
                    return
                  }
                  const exportData = reviewedRequests.map((r: any) => ({
                    id: r.id,
                    hand_id: r.hand_id,
                    requester_id: r.requester_id,
                    edit_type: r.edit_type,
                    status: r.status,
                    suggested_changes: r.proposed_data,
                    reason: r.reason,
                    created_at: r.created_at,
                    reviewed_at: r.reviewed_at,
                  }))
                  exportHandEditRequests(exportData as any, 'csv')
                  toast.success('CSV 파일이 다운로드되었습니다')
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
            <div className="border rounded-lg p-6">
              {reviewedRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No reviewed requests
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 text-sm font-medium">Hand</th>
                        <th className="text-left py-3 px-2 text-sm font-medium">Edit Type</th>
                        <th className="text-left py-3 px-2 text-sm font-medium">Submitter</th>
                        <th className="text-left py-3 px-2 text-sm font-medium">Status</th>
                        <th className="text-left py-3 px-2 text-sm font-medium">Reviewed At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewedRequests.map((request: any) => (
                        <tr key={request.id} className="border-b border-border last:border-0">
                          <td className="py-3 px-2">
                            <Link
                              href={`/archive?hand=${request.hand_id}`}
                              className="font-medium hover:underline"
                            >
                              #{(request as any).hand?.number}
                            </Link>
                          </td>
                          <td className="py-3 px-2">
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium border border-border rounded">
                              {EDIT_TYPE_LABELS[request.edit_type]}
                            </span>
                          </td>
                          <td className="py-3 px-2">{request.requester_name}</td>
                          <td className="py-3 px-2">
                            {request.status === "approved" ? (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-600 text-white rounded">Approved</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-destructive text-destructive-foreground rounded">Rejected</span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            {request.reviewed_at
                              ? new Date(request.reviewed_at).toLocaleDateString("ko-KR")
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Review Dialog */}
      {selectedRequest && actionType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto"
          onClick={() => setSelectedRequest(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-background rounded-lg shadow-xl max-w-4xl w-full mx-4 my-8 p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-2">
              Edit Request {actionType === "approve" ? "Approve" : "Reject"}
            </h2>
            <p className="text-muted-foreground mb-6">
              #{(selectedRequest as any).hand?.number} - {EDIT_TYPE_LABELS[selectedRequest.editType]}
            </p>

            <div className="space-y-6">
              {/* Request Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-muted-foreground">Submitter</label>
                  <p>{selectedRequest.requesterName}</p>
                </div>
                <div>
                  <label className="text-muted-foreground">Submitted</label>
                  <p>{new Date(selectedRequest.createdAt).toLocaleString("ko-KR")}</p>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="font-medium">Edit Reason</label>
                <div className="mt-1 p-3 bg-muted/30 border border-border rounded-lg">
                  <p className="text-sm">{selectedRequest.reason}</p>
                </div>
              </div>

              {/* Diff View */}
              <div>
                <label className="text-lg font-semibold">Changes</label>
                <div className="mt-3">
                  {getDiffView(selectedRequest)}
                </div>
              </div>

              {/* Admin Comment */}
              <div>
                <label htmlFor="admin-comment" className="block mb-1 font-medium">Admin Comment (Optional)</label>
                <textarea
                  id="admin-comment"
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  placeholder="Comments on review result..."
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setSelectedRequest(null)
                  setActionType(null)
                  setAdminComment("")
                }}
                disabled={approveEditRequestMutation.isPending || rejectEditRequestMutation.isPending}
                className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={approveEditRequestMutation.isPending || rejectEditRequestMutation.isPending}
                className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  actionType === "approve"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                }`}
              >
                {(approveEditRequestMutation.isPending || rejectEditRequestMutation.isPending)
                  ? "Processing..."
                  : actionType === "approve"
                  ? "Approve & Apply"
                  : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
