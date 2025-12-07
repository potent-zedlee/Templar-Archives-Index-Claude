"use client"

/**
 * Admin Data Deletion Requests Page
 *
 * GDPR/CCPA/PIPL compliance: Review and process user data deletion requests.
 * Migrated from Supabase to Firebase Auth
 */

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, X, Clock, CheckCircle2, XCircle, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/layout/AuthProvider"
import { useRouter } from "next/navigation"
import { isAdmin } from "@/lib/auth/auth-utils"
import type { DeletionRequestWithUser } from "@/lib/data-deletion-requests"
import {
  usePendingDeletionRequestsQuery,
  useAllDeletionRequestsQuery,
  useApproveDeletionRequestMutation,
  useRejectDeletionRequestMutation,
  useCompleteDeletionRequestMutation,
} from "@/lib/queries/admin-queries"

export default function DataDeletionRequestsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [selectedRequest, setSelectedRequest] = useState<DeletionRequestWithUser | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<"approve" | "reject" | "complete">("approve")
  const [adminNotes, setAdminNotes] = useState("")
  const [rejectedReason, setRejectedReason] = useState("")

  // React Query hooks
  const { data: pendingRequests = [], isLoading: pendingLoading } = usePendingDeletionRequestsQuery()
  const { data: allRequests = [], isLoading: allLoading } = useAllDeletionRequestsQuery()
  const approveRequestMutation = useApproveDeletionRequestMutation()
  const rejectRequestMutation = useRejectDeletionRequestMutation()
  const completeRequestMutation = useCompleteDeletionRequestMutation()

  const loading = pendingLoading || allLoading

  useEffect(() => {
    // Wait for auth loading to complete
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

  function handleActionClick(
    request: DeletionRequestWithUser,
    type: "approve" | "reject" | "complete"
  ) {
    setSelectedRequest(request)
    setActionType(type)
    setActionDialogOpen(true)
    setAdminNotes("")
    setRejectedReason("")
  }

  function handleAction() {
    if (!selectedRequest || !user) return

    if (actionType === "reject" && !rejectedReason) {
      toast.error("Please enter rejection reason")
      return
    }

    if (actionType === "approve") {
      approveRequestMutation.mutate(
        {
          requestId: selectedRequest.id,
          adminId: user.id,
          adminNotes,
        },
        {
          onSuccess: () => {
            toast.success("Deletion request approved")
            setActionDialogOpen(false)
          },
          onError: (error) => {
            console.error("Error approving deletion request:", error)
            toast.error("Failed to approve deletion request")
          },
        }
      )
    } else if (actionType === "reject") {
      rejectRequestMutation.mutate(
        {
          requestId: selectedRequest.id,
          adminId: user.id,
          rejectedReason,
          adminNotes,
        },
        {
          onSuccess: () => {
            toast.success("Deletion request rejected")
            setActionDialogOpen(false)
          },
          onError: (error) => {
            console.error("Error rejecting deletion request:", error)
            toast.error("Failed to reject deletion request")
          },
        }
      )
    } else if (actionType === "complete") {
      completeRequestMutation.mutate(
        {
          requestId: selectedRequest.id,
          adminId: user.id,
        },
        {
          onSuccess: () => {
            toast.success("Deletion request marked as completed")
            setActionDialogOpen(false)
          },
          onError: (error) => {
            console.error("Error completing deletion request:", error)
            toast.error("Failed to complete deletion request")
          },
        }
      )
    }
  }

  const getStatusBadge = (status: DeletionRequestWithUser["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending Review
          </Badge>
        )
      case "approved":
        return (
          <Badge className="gap-1 bg-orange-500">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        )
      case "completed":
        return (
          <Badge className="gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </Badge>
        )
    }
  }

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto py-16 text-center">
        <p className="text-body-lg text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6">
        <div className="mb-8">
          <h1 className="text-title-lg mb-2">Data Deletion Requests</h1>
          <p className="text-body text-muted-foreground">
            Review and process user data deletion requests (GDPR/CCPA/PIPL compliance)
          </p>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
            <TabsTrigger value="all">All ({allRequests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {pendingRequests.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-body text-muted-foreground">No pending deletion requests</p>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Requested At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={request.user.avatar_url} />
                              <AvatarFallback>{request.user.nickname.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{request.user.nickname}</p>
                              <p className="text-caption text-muted-foreground">
                                {request.user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm max-w-md line-clamp-2">{request.reason}</p>
                        </TableCell>
                        <TableCell>
                          {new Date(request.requested_at).toLocaleString("ko-KR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleActionClick(request, "approve")}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleActionClick(request, "reject")}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Requested At</TableHead>
                    <TableHead>Reviewed By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={request.user.avatar_url} />
                            <AvatarFallback>{request.user.nickname.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{request.user.nickname}</p>
                            <p className="text-caption text-muted-foreground">
                              {request.user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        <p className="text-sm max-w-md line-clamp-2">{request.reason}</p>
                      </TableCell>
                      <TableCell>
                        {new Date(request.requested_at).toLocaleString("ko-KR")}
                      </TableCell>
                      <TableCell>{request.reviewed_by_user?.nickname || "-"}</TableCell>
                      <TableCell className="text-right">
                        {request.status === "approved" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleActionClick(request, "complete")}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Mark Completed
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve"
                ? "Approve Deletion Request"
                : actionType === "reject"
                ? "Reject Deletion Request"
                : "Mark as Completed"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "Are you sure you want to approve this deletion request? User data will need to be deleted within 90 days."
                : actionType === "reject"
                ? "Are you sure you want to reject this deletion request?"
                : "Confirm that all user data has been permanently deleted."}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              {/* Request Info */}
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-caption text-muted-foreground">User</span>
                  <span className="font-medium">{selectedRequest.user.nickname}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-caption text-muted-foreground">Email</span>
                  <span className="font-medium">{selectedRequest.user.email}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-caption text-muted-foreground">Reason</span>
                  <p className="text-sm">{selectedRequest.reason}</p>
                </div>
              </div>

              {actionType === "reject" && (
                <div className="space-y-2">
                  <Label>Rejection Reason *</Label>
                  <Textarea
                    placeholder="Please enter the reason for rejecting this request"
                    value={rejectedReason}
                    onChange={(e) => setRejectedReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {actionType !== "complete" && (
                <div className="space-y-2">
                  <Label>Admin Notes (Optional)</Label>
                  <Textarea
                    placeholder="Enter internal notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              )}

              {actionType === "complete" && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">
                    <strong>Warning:</strong> Only mark as completed after verifying that ALL user
                    data has been permanently deleted from the database.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={
                actionType === "approve" ? "default" : actionType === "reject" ? "destructive" : "default"
              }
              onClick={handleAction}
              disabled={
                approveRequestMutation.isPending ||
                rejectRequestMutation.isPending ||
                completeRequestMutation.isPending
              }
            >
              {approveRequestMutation.isPending ||
              rejectRequestMutation.isPending ||
              completeRequestMutation.isPending
                ? "Processing..."
                : actionType === "approve"
                ? "Approve"
                : actionType === "reject"
                ? "Reject"
                : "Mark Completed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
