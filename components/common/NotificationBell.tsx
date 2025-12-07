"use client"

import { useState, useEffect } from "react"
import { Bell, Check, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import {
  useNotificationsQuery,
  useUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  notificationKeys,
} from "@/lib/queries/notification-queries"
import {
  subscribeToNotifications,
  formatNotificationTime,
  type Notification,
} from "@/lib/notifications"
import { useAuth } from "@/components/layout/AuthProvider"

export function NotificationBell() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  // React Query hooks
  const { data: notifications = [] } = useNotificationsQuery({ limit: 10 })
  const { data: unreadCount = 0 } = useUnreadCountQuery()
  const markAsReadMutation = useMarkAsReadMutation()
  const markAllAsReadMutation = useMarkAllAsReadMutation()
  const deleteNotificationMutation = useDeleteNotificationMutation()

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return

    const subscription = subscribeToNotifications(user.id, (notification) => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() })

      // Show toast notification
      toast(notification.title, {
        description: notification.message,
        action: notification.link
          ? {
              label: "View",
              onClick: () => {
                window.location.href = notification.link!
              },
            }
          : undefined,
      })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [user, queryClient])

  function handleMarkAsRead(notificationId: string) {
    markAsReadMutation.mutate(notificationId, {
      onError: () => {
        toast.error("Failed to mark as read")
      },
    })
  }

  function handleMarkAllAsRead() {
    markAllAsReadMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("All notifications marked as read")
      },
      onError: () => {
        toast.error("Failed to mark all as read")
      },
    })
  }

  function handleDelete(notificationId: string) {
    deleteNotificationMutation.mutate(notificationId, {
      onError: () => {
        toast.error("Failed to delete notification")
      },
    })
  }

  function handleNotificationClick(notification: Notification) {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id)
    }
    setOpen(false)
  }

  if (!user) {
    return null
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-muted"
          aria-label={unreadCount > 0 ? `알림 ${unreadCount}개 읽지 않음` : '알림'}
        >
          <Bell className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              aria-hidden="true"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0 bg-background border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Notifications</h3>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                className="h-8 text-xs hover:bg-muted text-muted-foreground"
                aria-label="모든 알림을 읽음으로 표시"
              >
                <Check className="h-3 w-3 mr-1" aria-hidden="true" />
                Mark all read
              </Button>
            )}
            <Link href="/notifications">
              <Button variant="ghost" size="sm" className="h-8 text-xs hover:bg-muted text-muted-foreground">
                View all
              </Button>
            </Link>
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" aria-hidden="true" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="py-2" role="list" aria-label="알림 목록">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`group relative px-4 py-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0 ${
                    !notification.is_read ? "bg-gold-50 dark:bg-gold-900/10" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  role="listitem"
                  aria-label={`${notification.is_read ? '' : '읽지 않음: '}${notification.title}`}
                >
                  {notification.link ? (
                    <Link href={notification.link} className="block">
                      <NotificationItem notification={notification} />
                    </Link>
                  ) : (
                    <NotificationItem notification={notification} />
                  )}

                  {/* Actions */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-muted"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleMarkAsRead(notification.id)
                        }}
                        aria-label="읽음으로 표시"
                      >
                        <Check className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-muted"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleDelete(notification.id)
                      }}
                      aria-label="알림 삭제"
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                    </Button>
                  </div>

                  {/* Unread indicator */}
                  {!notification.is_read && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-gold-400 dark:bg-gold-500" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NotificationItem({ notification }: { notification: Notification }) {
  return (
    <div className="flex gap-3 pl-4">
      {notification.sender && (
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={notification.sender.avatar_url || undefined} />
          <AvatarFallback className="bg-gold-100 dark:bg-gold-900 text-gold-700 dark:text-gold-300">
            {notification.sender.nickname
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium mb-1 text-foreground">{notification.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatNotificationTime(notification.created_at)}
        </p>
      </div>
    </div>
  )
}
