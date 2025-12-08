"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { CardSkeleton } from "@/components/ui/skeletons/CardSkeleton"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  UserX,
  UserCheck,
  Download,
  Shield
} from "lucide-react"
import { useAuth } from "@/components/layout/AuthProvider"
import { isAdmin, type AdminRole } from "@/lib/admin"
import {
  useUsersQuery,
  useBanUserMutation,
  useUnbanUserMutation,
  useChangeRoleMutation
} from "@/lib/queries/admin-queries"
import { toast } from "sonner"
import Link from "next/link"
import { exportUsers } from "@/lib/utils/export"

type User = {
  id: string
  nickname: string
  email: string
  avatar_url?: string
  role: AdminRole
  is_banned: boolean
  ban_reason?: string
  created_at: string
  last_sign_in_at?: string
  last_activity_at?: string
  posts_count: number
  comments_count: number
}

export default function UsersClient() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [hasAccess, setHasAccess] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<AdminRole | "all">("all")
  const [bannedFilter, setBannedFilter] = useState<"all" | "banned" | "active">("all")

  // Ban dialog state
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [banReason, setBanReason] = useState("")

  // Role dialog state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [newRole, setNewRole] = useState<AdminRole>("user")

  // Dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  // React Query hooks
  const {
    data: usersData,
  } = useUsersQuery({
    page: currentPage,
    limit: 20,
    role: roleFilter === "all" ? undefined : roleFilter,
    banned: bannedFilter === "all" ? undefined : bannedFilter === "banned",
    search: searchQuery || undefined
  })

  const users = usersData?.users || []
  const totalPages = usersData?.totalPages || 1

  const banUserMutation = useBanUserMutation(user?.id || "")
  const unbanUserMutation = useUnbanUserMutation(user?.id || "")
  const changeRoleMutation = useChangeRoleMutation(user?.id || "")

  const checkAccess = useCallback(async () => {
    if (loading) return

    if (!user) {
      router.push("/auth/login")
      return
    }

    try {
      const adminStatus = await isAdmin(user.id)
      if (!adminStatus) {
        toast.error("Admin privileges required")
        router.push("/")
        return
      }

      setHasAccess(true)
    } catch (error) {
      console.error("Error checking admin access:", error)
      toast.error("Error checking permissions")
      router.push("/")
    }
  }, [user, loading, router])

  useEffect(() => {
    checkAccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading])

  function handleBanUser() {
    if (!selectedUser || !user) return

    if (!banReason.trim()) {
      toast.error("Please enter ban reason")
      return
    }

    banUserMutation.mutate(
      { userId: selectedUser.id, reason: banReason },
      {
        onSuccess: () => {
          toast.success(`${selectedUser.nickname} has been banned`)
          setBanDialogOpen(false)
          setBanReason("")
          setSelectedUser(null)
        },
        onError: (error) => {
          console.error("Error banning user:", error)
          toast.error("Failed to ban user")
        }
      }
    )
  }

  function handleUnbanUser(targetUser: any) {
    if (!user) return

    unbanUserMutation.mutate(targetUser.id, {
      onSuccess: () => {
        toast.success(`${targetUser.nickname} has been unbanned`)
      },
      onError: (error) => {
        console.error("Error unbanning user:", error)
        toast.error("Failed to unban user")
      }
    })
  }

  function handleChangeRole() {
    if (!selectedUser || !user) return

    changeRoleMutation.mutate(
      { userId: selectedUser.id, role: newRole },
      {
        onSuccess: () => {
          toast.success(`User role changed to ${newRole}`)
          setRoleDialogOpen(false)
          setSelectedUser(null)
        },
        onError: (error: any) => {
          console.error("Error changing user role:", error)
          toast.error(`Failed to change role: ${error.message || 'Unknown error'}`)
        }
      }
    )
  }

  function openBanDialog(targetUser: any) {
    setSelectedUser(targetUser)
    setBanReason("")
    setBanDialogOpen(true)
  }

  function openRoleDialog(targetUser: any) {
    setSelectedUser(targetUser)
    setNewRole(targetUser.role)
    setRoleDialogOpen(true)
  }

  if (!hasAccess) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <CardSkeleton count={4} />
      </div>
    )
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-heading mb-2">USER MANAGEMENT</h1>
          <p className="text-text-secondary">
            View and manage all users
          </p>
        </div>
        <Link href="/admin/dashboard" className="btn-secondary">
          BACK TO DASHBOARD
        </Link>
      </div>

      {/* Filters */}
      <div className="card-postmodern p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gold-400" />
              <input
                type="text"
                placeholder="SEARCH BY NICKNAME OR EMAIL..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="input-postmodern pl-10 w-full"
              />
            </div>
          </div>

          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as AdminRole | "all")
              setCurrentPage(1)
            }}
            className="input-postmodern"
          >
            <option value="all">ALL ROLES</option>
            <option value="user">USER</option>
            <option value="templar">TEMPLAR</option>
            <option value="arbiter">ARBITER</option>
            <option value="high_templar">HIGH TEMPLAR</option>
            <option value="admin">ADMIN</option>
          </select>

          <select
            value={bannedFilter}
            onChange={(e) => {
              setBannedFilter(e.target.value as "all" | "banned" | "active")
              setCurrentPage(1)
            }}
            className="input-postmodern"
          >
            <option value="all">ALL STATUS</option>
            <option value="active">ACTIVE</option>
            <option value="banned">BANNED</option>
          </select>
        </div>

        <div className="md:col-span-4 flex justify-end mt-4">
          <button
            onClick={() => {
              if (users.length === 0) {
                toast.error('No data to export')
                return
              }
              const exportData = users.map(u => ({
                id: u.id,
                email: u.email,
                name: u.nickname,
                role: u.role,
                createdAt: u.created_at,
                lastSignInAt: (u as any).last_sign_in_at || null,
                bannedAt: u.is_banned ? new Date().toISOString() : null,
              }))
              exportUsers(exportData as any, 'csv')
              toast.success('CSV downloaded')
            }}
            className="btn-secondary text-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            EXPORT CSV
          </button>
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <CardSkeleton count={5} />
      ) : users.length === 0 ? (
        <div className="card-postmodern p-8 text-center">
          <p className="text-text-secondary">
            No users match the criteria
          </p>
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {users.map((targetUser) => (
            <div key={targetUser.id} className="card-postmodern p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-12 w-12 rounded-full bg-gold-700/20 flex items-center justify-center text-gold-400 font-bold">
                    {targetUser.nickname.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-body font-semibold text-foreground">
                        {targetUser.nickname}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${targetUser.role === "admin" ? "bg-gold-700 text-black-0" :
                          targetUser.role === "high_templar" ? "bg-purple-700 text-white" :
                            targetUser.role === "arbiter" ? "bg-blue-700 text-white" :
                              targetUser.role === "templar" ? "bg-green-700 text-white" :
                                "bg-muted text-foreground"
                        }`}>
                        {targetUser.role === "admin" ? "ADMIN" :
                          targetUser.role === "high_templar" ? "HIGH TEMPLAR" :
                            targetUser.role === "arbiter" ? "ARBITER" :
                              targetUser.role === "templar" ? "TEMPLAR" :
                                "USER"}
                      </span>
                      {targetUser.is_banned && (
                        <span className="px-2 py-1 rounded bg-red-700 text-white text-xs font-medium">
                          BANNED
                        </span>
                      )}
                    </div>
                    <p className="text-caption text-text-secondary mb-1">
                      {targetUser.email}
                    </p>
                    <div className="flex gap-4 text-caption text-text-secondary">
                      <span>POSTS: {(targetUser as any).posts_count || 0}</span>
                      <span>COMMENTS: {(targetUser as any).comments_count || 0}</span>
                      <span>JOINED: {new Date(targetUser.created_at).toLocaleDateString("ko-KR")}</span>
                      {(targetUser as any).last_sign_in_at ? (
                        <span className={
                          new Date().getTime() - new Date((targetUser as any).last_sign_in_at).getTime() < 7 * 24 * 60 * 60 * 1000
                            ? "text-green-400"
                            : new Date().getTime() - new Date((targetUser as any).last_sign_in_at).getTime() > 30 * 24 * 60 * 60 * 1000
                              ? "text-muted-foreground"
                              : ""
                        }>
                          LAST SIGN IN: {new Date((targetUser as any).last_sign_in_at).toLocaleDateString("ko-KR")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">LAST SIGN IN: NEVER</span>
                      )}
                    </div>
                    {targetUser.is_banned && targetUser.ban_reason && (
                      <p className="text-caption text-red-400 mt-1">
                        Ban reason: {targetUser.ban_reason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Dropdown Menu */}
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdownId(openDropdownId === targetUser.id ? null : targetUser.id)}
                    className="btn-ghost p-2"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {openDropdownId === targetUser.id && (
                    <div className="absolute right-0 mt-2 w-48 card-postmodern py-2 z-10">
                      <Link
                        href={`/profile/${targetUser.id}`}
                        className="block px-4 py-2 text-sm hover:bg-gold-700/20 text-foreground"
                        onClick={() => setOpenDropdownId(null)}
                      >
                        VIEW PROFILE
                      </Link>
                      <button
                        onClick={() => {
                          openRoleDialog(targetUser)
                          setOpenDropdownId(null)
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gold-700/20 text-foreground flex items-center"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        CHANGE ROLE
                      </button>
                      {targetUser.is_banned ? (
                        <button
                          onClick={() => {
                            handleUnbanUser(targetUser)
                            setOpenDropdownId(null)
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gold-700/20 text-foreground flex items-center"
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          UNBAN
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            openBanDialog(targetUser)
                            setOpenDropdownId(null)
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gold-700/20 text-red-400 flex items-center"
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          BAN USER
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn-secondary p-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-body text-foreground">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="btn-secondary p-2"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Ban Dialog */}
      {banDialogOpen && (
        <div className="fixed inset-0 bg-black-0/80 z-50 flex items-center justify-center p-4">
          <div className="card-postmodern p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-heading">BAN USER</h2>
              <button onClick={() => setBanDialogOpen(false)} className="btn-ghost text-2xl">×</button>
            </div>

            <p className="text-text-secondary mb-4">
              Are you sure you want to ban {selectedUser?.nickname}?
            </p>

            <div className="mb-4">
              <label className="text-caption text-gold-400 block mb-2">BAN REASON *</label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter the reason for banning..."
                rows={4}
                className="input-postmodern w-full"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setBanDialogOpen(false)}
                className="btn-secondary"
              >
                CANCEL
              </button>
              <button
                onClick={handleBanUser}
                disabled={banUserMutation.isPending || !banReason.trim()}
                className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {banUserMutation.isPending ? "PROCESSING..." : "BAN"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Dialog */}
      {roleDialogOpen && (
        <div className="fixed inset-0 bg-black-0/80 z-50 flex items-center justify-center p-4">
          <div className="card-postmodern p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-heading">CHANGE ROLE</h2>
              <button onClick={() => setRoleDialogOpen(false)} className="btn-ghost text-2xl">×</button>
            </div>

            <p className="text-text-secondary mb-4">
              Change role for {selectedUser?.nickname}?
            </p>

            <div className="mb-4">
              <label className="text-caption text-gold-400 block mb-2">NEW ROLE</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AdminRole)}
                className="input-postmodern w-full"
              >
                <option value="user">USER</option>
                <option value="templar">TEMPLAR</option>
                <option value="arbiter">ARBITER</option>
                <option value="high_templar">HIGH TEMPLAR</option>
                <option value="admin">ADMIN</option>
              </select>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRoleDialogOpen(false)}
                className="btn-secondary"
              >
                CANCEL
              </button>
              <button
                onClick={handleChangeRole}
                disabled={changeRoleMutation.isPending}
                className="btn-primary"
              >
                {changeRoleMutation.isPending ? "PROCESSING..." : "CHANGE"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
