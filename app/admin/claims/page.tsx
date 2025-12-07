"use client"

/**
 * Admin Claims Page
 *
 * Player profile claim management.
 * Migrated from Supabase to Firebase Auth
 */

import { useState, useEffect } from "react"
import { Check, X, ExternalLink, Clock, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/layout/AuthProvider"
import { useRouter } from "next/navigation"
import { isAdmin } from "@/lib/auth/auth-utils"
import { type PlayerClaimWithDetails } from "@/lib/player-claims"
import {
  usePendingClaimsQuery,
  useAllClaimsQuery,
  useApproveClaimMutation,
  useRejectClaimMutation,
} from "@/lib/queries/admin-queries"

export default function ClaimsClient() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [selectedClaim, setSelectedClaim] = useState<PlayerClaimWithDetails | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<"approve" | "reject">("approve")
  const [adminNotes, setAdminNotes] = useState("")
  const [rejectedReason, setRejectedReason] = useState("")
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending")

  // React Query hooks
  const { data: pendingClaims = [], isLoading: pendingLoading } = usePendingClaimsQuery()
  const { data: allClaims = [], isLoading: allLoading } = useAllClaimsQuery()
  const approveClaimMutation = useApproveClaimMutation()
  const rejectClaimMutation = useRejectClaimMutation()

  const loading = pendingLoading || allLoading

  useEffect(() => {
    if (authLoading) return

    // Check if user is authenticated and is admin
    if (!user) {
      router.push("/auth/login")
      return
    }

    // user.email comes from Firebase Auth via AuthProvider
    if (user.email && !isAdmin(user.email)) {
      router.push("/")
      toast.error("Admin access only")
    }
  }, [user, authLoading, router])

  function handleActionClick(claim: PlayerClaimWithDetails, type: "approve" | "reject") {
    setSelectedClaim(claim)
    setActionType(type)
    setActionDialogOpen(true)
    setAdminNotes("")
    setRejectedReason("")
  }

  function handleAction() {
    if (!selectedClaim || !user) return

    if (actionType === "reject" && !rejectedReason) {
      toast.error("Please enter rejection reason")
      return
    }

    if (actionType === "approve") {
      approveClaimMutation.mutate(
        {
          claimId: selectedClaim.id,
          adminId: user.id,
          adminNotes,
        },
        {
          onSuccess: () => {
            toast.success("Claim approved")
            setActionDialogOpen(false)
          },
          onError: (error) => {
            console.error("Error approving claim:", error)
            toast.error("Failed to approve claim")
          }
        }
      )
    } else {
      rejectClaimMutation.mutate(
        {
          claimId: selectedClaim.id,
          adminId: user.id,
          rejectedReason,
          adminNotes,
        },
        {
          onSuccess: () => {
            toast.success("Claim rejected")
            setActionDialogOpen(false)
          },
          onError: (error) => {
            console.error("Error rejecting claim:", error)
            toast.error("Failed to reject claim")
          }
        }
      )
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="px-2 py-1 rounded bg-gold-700/30 text-gold-400 text-xs font-medium inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            PENDING
          </span>
        )
      case "approved":
        return (
          <span className="px-2 py-1 rounded bg-green-700/30 text-green-400 text-xs font-medium inline-flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            APPROVED
          </span>
        )
      case "rejected":
        return (
          <span className="px-2 py-1 rounded bg-red-700/30 text-red-400 text-xs font-medium inline-flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            REJECTED
          </span>
        )
      default:
        return null
    }
  }

  const getVerificationMethodLabel = (method: string) => {
    switch (method) {
      case "social_media":
        return "SOCIAL MEDIA"
      case "email":
        return "EMAIL"
      case "admin":
        return "ADMIN"
      case "other":
        return "OTHER"
      default:
        return method.toUpperCase()
    }
  }

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto py-16 text-center">
        <p className="text-text-secondary">LOADING...</p>
      </div>
    )
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6">
        <div className="mb-8">
          <h1 className="text-heading mb-2">PLAYER CLAIM MANAGEMENT</h1>
          <p className="text-text-secondary">
            Approve or reject player profile claim requests
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gold-700/20">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "pending"
                ? "border-b-2 border-gold-700 text-gold-400"
                : "text-text-secondary hover:text-foreground"
            }`}
          >
            PENDING ({pendingClaims.length})
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "all"
                ? "border-b-2 border-gold-700 text-gold-400"
                : "text-text-secondary hover:text-foreground"
            }`}
          >
            ALL ({allClaims.length})
          </button>
        </div>

        {/* Pending Tab */}
        {activeTab === "pending" && (
          pendingClaims.length === 0 ? (
            <div className="card-postmodern p-12 text-center">
              <p className="text-text-secondary">
                No pending claim requests
              </p>
            </div>
          ) : (
            <div className="card-postmodern overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gold-700">
                    <th className="text-caption text-gold-400 text-left p-3">PLAYER</th>
                    <th className="text-caption text-gold-400 text-left p-3">REQUESTER</th>
                    <th className="text-caption text-gold-400 text-left p-3">VERIFICATION METHOD</th>
                    <th className="text-caption text-gold-400 text-left p-3">EVIDENCE</th>
                    <th className="text-caption text-gold-400 text-left p-3">REQUESTED AT</th>
                    <th className="text-caption text-gold-400 text-right p-3">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingClaims.map((claim) => (
                    <tr key={claim.id} className="border-b border-gold-700/20 hover:bg-black-200">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gold-700/20 flex items-center justify-center text-gold-400 text-xs font-bold">
                            {claim.player.name.charAt(0)}
                          </div>
                          <span className="font-medium text-foreground">{claim.player.name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gold-700/20 flex items-center justify-center text-gold-400 text-xs font-bold">
                            {claim.user.nickname.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{claim.user.nickname}</p>
                            <p className="text-caption text-text-secondary">
                              {claim.user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-text-secondary">
                        {getVerificationMethodLabel(claim.verificationMethod)}
                      </td>
                      <td className="p-3">
                        {claim.verificationData?.socialMediaUrl &&
                         typeof claim.verificationData.socialMediaUrl === 'string' ? (
                          <a
                            href={String(claim.verificationData.socialMediaUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-gold-400 hover:underline"
                          >
                            View Link
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                        {claim.verificationData?.email &&
                         typeof claim.verificationData.email === 'string' ? (
                          <span className="text-text-secondary">{String(claim.verificationData.email)}</span>
                        ) : null}
                        {claim.verificationData?.additionalInfo &&
                         typeof claim.verificationData.additionalInfo === 'string' ? (
                          <p className="text-caption text-text-secondary mt-1">
                            {String(claim.verificationData.additionalInfo)}
                          </p>
                        ) : null}
                      </td>
                      <td className="p-3 text-text-secondary">
                        {new Date(claim.claimedAt).toLocaleString("ko-KR")}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleActionClick(claim, "approve")}
                            className="btn-primary text-sm px-3 py-1"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            APPROVE
                          </button>
                          <button
                            onClick={() => handleActionClick(claim, "reject")}
                            className="bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                          >
                            <X className="h-4 w-4 mr-1" />
                            REJECT
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* All Tab */}
        {activeTab === "all" && (
          <div className="card-postmodern overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gold-700">
                  <th className="text-caption text-gold-400 text-left p-3">PLAYER</th>
                  <th className="text-caption text-gold-400 text-left p-3">REQUESTER</th>
                  <th className="text-caption text-gold-400 text-left p-3">STATUS</th>
                  <th className="text-caption text-gold-400 text-left p-3">VERIFICATION METHOD</th>
                  <th className="text-caption text-gold-400 text-left p-3">PROCESSED AT</th>
                  <th className="text-caption text-gold-400 text-left p-3">PROCESSED BY</th>
                </tr>
              </thead>
              <tbody>
                {allClaims.map((claim) => (
                  <tr key={claim.id} className="border-b border-gold-700/20 hover:bg-black-200">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gold-700/20 flex items-center justify-center text-gold-400 text-xs font-bold">
                          {claim.player.name.charAt(0)}
                        </div>
                        <span className="font-medium text-foreground">{claim.player.name}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gold-700/20 flex items-center justify-center text-gold-400 text-xs font-bold">
                          {claim.user.nickname.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-white">{claim.user.nickname}</p>
                          <p className="text-caption text-text-secondary">
                            {claim.user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">{getStatusBadge(claim.status)}</td>
                    <td className="p-3 text-text-secondary">
                      {getVerificationMethodLabel(claim.verificationMethod)}
                    </td>
                    <td className="p-3 text-text-secondary">
                      {claim.verifiedAt
                        ? new Date(claim.verifiedAt).toLocaleString("ko-KR")
                        : "-"}
                    </td>
                    <td className="p-3 text-text-secondary">
                      {claim.verifiedByUser?.nickname || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* Action Dialog */}
      {actionDialogOpen && selectedClaim && (
        <div className="fixed inset-0 bg-black-0/80 z-50 flex items-center justify-center p-4">
          <div className="card-postmodern p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-heading">
                {actionType === "approve" ? "APPROVE CLAIM" : "REJECT CLAIM"}
              </h2>
              <button onClick={() => setActionDialogOpen(false)} className="btn-ghost text-2xl">x</button>
            </div>

            <p className="text-text-secondary mb-4">
              {actionType === "approve"
                ? "Are you sure you want to approve this claim?"
                : "Are you sure you want to reject this claim?"}
            </p>

            {/* Claim Info */}
            <div className="p-4 bg-black-200 rounded mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-caption text-text-secondary">PLAYER</span>
                <span className="font-medium text-foreground">{selectedClaim.player.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-caption text-text-secondary">REQUESTER</span>
                <span className="font-medium text-foreground">{selectedClaim.user.nickname}</span>
              </div>
            </div>

            {actionType === "reject" && (
              <div className="mb-4">
                <label className="text-caption text-gold-400 block mb-2">REJECTION REASON *</label>
                <textarea
                  placeholder="Please enter the reason for rejecting this claim"
                  value={rejectedReason}
                  onChange={(e) => setRejectedReason(e.target.value)}
                  rows={3}
                  className="input-postmodern w-full"
                />
              </div>
            )}

            <div className="mb-4">
              <label className="text-caption text-gold-400 block mb-2">ADMIN NOTES (OPTIONAL)</label>
              <textarea
                placeholder="Enter internal notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
                className="input-postmodern w-full"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setActionDialogOpen(false)}
                className="btn-secondary"
              >
                CANCEL
              </button>
              <button
                onClick={handleAction}
                disabled={approveClaimMutation.isPending || rejectClaimMutation.isPending}
                className={actionType === "approve" ? "btn-primary" : "bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded"}
              >
                {(approveClaimMutation.isPending || rejectClaimMutation.isPending)
                  ? "PROCESSING..."
                  : actionType === "approve"
                  ? "APPROVE"
                  : "REJECT"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
