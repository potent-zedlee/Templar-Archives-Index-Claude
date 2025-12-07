"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Trash2, ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react"
import { useAuth } from "@/components/layout/AuthProvider"
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"
import { firestore } from "@/lib/db/firebase"
import { toast } from "sonner"

interface DeletionRequest {
  id: string
  reason: string
  status: "pending" | "approved" | "rejected" | "completed"
  requestedAt: string
  reviewedAt?: string
  adminNotes?: string
}

export default function DeleteDataPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [existingRequest, setExistingRequest] = useState<DeletionRequest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    loadExistingRequest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const loadExistingRequest = async () => {
    if (!user) return

    try {
      const deletionRequestsRef = collection(firestore, "dataDeletionRequests")
      const q = query(
        deletionRequestsRef,
        where("userId", "==", user.id),
        where("status", "in", ["pending", "approved"]),
        orderBy("requestedAt", "desc"),
        limit(1)
      )

      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0]
        const data = docData.data()
        setExistingRequest({
          id: docData.id,
          reason: data.reason,
          status: data.status,
          requestedAt: data.requestedAt instanceof Timestamp
            ? data.requestedAt.toDate().toISOString()
            : data.requestedAt,
          reviewedAt: data.reviewedAt instanceof Timestamp
            ? data.reviewedAt.toDate().toISOString()
            : data.reviewedAt,
          adminNotes: data.adminNotes,
        })
      }
    } catch (error) {
      console.error("Error loading deletion request:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error("You must be logged in")
      return
    }

    if (existingRequest) {
      toast.error("You already have an active deletion request")
      return
    }

    if (!reason.trim()) {
      toast.error("Please provide a reason for deletion")
      return
    }

    setSubmitting(true)

    try {
      const deletionRequestsRef = collection(firestore, "dataDeletionRequests")
      await addDoc(deletionRequestsRef, {
        userId: user.id,
        reason: reason.trim(),
        status: "pending",
        requestedAt: serverTimestamp(),
      })

      toast.success("Deletion request submitted successfully")
      setReason("")
      loadExistingRequest()
    } catch (error) {
      console.error("Error submitting deletion request:", error)
      toast.error("Failed to submit deletion request")
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: DeletionRequest["status"]) => {
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
            <CheckCircle className="h-3 w-3" />
            Approved - Deletion in Progress
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
            <CheckCircle className="h-3 w-3" />
            Completed
          </Badge>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container max-w-3xl mx-auto py-16 px-4 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container max-w-3xl mx-auto py-12 px-4 md:px-6">
        {/* Back Button */}
        <Button variant="ghost" size="sm" className="mb-6" onClick={() => router.push("/profile")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Profile
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Request Data Deletion</h1>
          <p className="text-muted-foreground">
            Exercise your right to be forgotten under GDPR, CCPA, and other data protection laws.
          </p>
        </div>

        {/* Existing Request */}
        {existingRequest && (
          <Card className="p-6 mb-6 border-2">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-semibold">Your Active Request</h2>
              {getStatusBadge(existingRequest.status)}
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-sm text-muted-foreground">Reason</Label>
                <p className="text-sm mt-1">{existingRequest.reason}</p>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Submitted</Label>
                <p className="text-sm mt-1">
                  {new Date(existingRequest.requestedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              {existingRequest.adminNotes && (
                <div>
                  <Label className="text-sm text-muted-foreground">Admin Response</Label>
                  <Alert className="mt-2">
                    <AlertDescription>{existingRequest.adminNotes}</AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Warning */}
        <Alert className="mb-6 border-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> This action will permanently delete all your data, including:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Your profile and account information</li>
              <li>Posts, comments, and forum contributions</li>
              <li>Bookmarks and saved content</li>
              <li>Player claims and verification data</li>
              <li>Activity logs and statistics</li>
            </ul>
            <p className="mt-2">
              <strong>This cannot be undone.</strong> Please download your data before submitting this request.
            </p>
          </AlertDescription>
        </Alert>

        {/* Request Form */}
        {!existingRequest && (
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="reason">Reason for Deletion (Required)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please provide a reason for deleting your data..."
                  rows={6}
                  required
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This helps us improve our service and comply with data protection regulations.
                </p>
              </div>

              <div className="bg-muted/30 p-4 rounded-md text-sm">
                <h3 className="font-semibold mb-2">What happens next?</h3>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Your request will be reviewed by our team (typically within 30 days)</li>
                  <li>We may contact you to verify your identity</li>
                  <li>If approved, your data will be permanently deleted within 90 days</li>
                  <li>You will receive an email confirmation when deletion is complete</li>
                </ol>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => router.push("/profile")} className="flex-1">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={submitting}
                  className="flex-1 gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {submitting ? "Submitting..." : "Submit Deletion Request"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Legal Info */}
        <Card className="mt-6 p-4 bg-muted/30">
          <h3 className="font-semibold text-sm mb-2">Your Rights</h3>
          <p className="text-xs text-muted-foreground">
            Under GDPR (EU), CCPA (California), and PIPL (Korea), you have the right to request deletion of your personal data.
            See our{" "}
            <a href="/legal/privacy" className="text-primary hover:underline">
              Privacy Policy
            </a>{" "}
            for more information.
          </p>
        </Card>
      </div>
    </div>
  )
}
