'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import NotificationChat from '@/components/NotificationChat'

interface Notification {
  id: string
  title: string
  message: string
  status: string
  createdAt: string
  metadata?: {
    currentValue?: number
    threshold?: number
  }
  alertRule?: {
    name: string
    conditionType: string
  }
}

interface AlertRule {
  id: string
  name: string
  description: string | null
  conditionType: string
  frequency: string
  isActive: boolean
  createdAt: string
  lastTriggeredAt: string | null
  notifications?: Notification[]
}

export default function NotificationsPage() {
  const { user } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [alertRules, setAlertRules] = useState<AlertRule[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [loading, setLoading] = useState(true)
  const [alertsLoading, setAlertsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchNotifications() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/notifications?status=${filter}`)
        if (!res.ok) {
          throw new Error('Failed to fetch notifications')
        }
        const data = await res.json()
        setNotifications(data.notifications)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load notifications'
        setError(message)
        console.error('Failed to fetch notifications:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [filter])

  useEffect(() => {
    async function fetchAlertRules() {
      setAlertsLoading(true)
      try {
        const res = await fetch('/api/alerts')
        if (!res.ok) {
          throw new Error('Failed to fetch alert rules')
        }
        const data = await res.json()
        setAlertRules(data.alerts)
      } catch (err) {
        console.error('Failed to fetch alert rules:', err)
      } finally {
        setAlertsLoading(false)
      }
    }

    if (user) {
      fetchAlertRules()
    }
  }, [user])

  async function markAsRead(id: string) {
    // Optimistically update UI
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, status: 'read' } : n))
    )

    try {
      const res = await fetch(`/api/notifications?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'read' }),
      })

      if (!res.ok) {
        throw new Error('Failed to mark notification as read')
      }
    } catch (err) {
      // Revert optimistic update on error
      const message = err instanceof Error ? err.message : 'Failed to mark as read'
      setError(message)
      console.error('Failed to mark as read:', err)

      // Refetch to restore correct state
      const res = await fetch(`/api/notifications?status=${filter}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
      }
    }
  }

  async function archiveNotification(id: string) {
    // Optimistically remove from UI
    const previousNotifications = notifications
    setNotifications(prev => prev.filter(n => n.id !== id))

    try {
      const res = await fetch(`/api/notifications?id=${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete notification')
      }
    } catch (err) {
      // Revert optimistic update on error
      const message = err instanceof Error ? err.message : 'Failed to delete notification'
      setError(message)
      console.error('Failed to archive notification:', err)

      // Restore previous state
      setNotifications(previousNotifications)
    }
  }

  const handleAlertCreated = async () => {
    // Refresh both notifications and alert rules when a new alert is created
    const [notifRes, alertsRes] = await Promise.all([
      fetch(`/api/notifications?status=${filter}`),
      fetch('/api/alerts')
    ])

    if (notifRes.ok) {
      const data = await notifRes.json()
      setNotifications(data.notifications)
    }

    if (alertsRes.ok) {
      const data = await alertsRes.json()
      setAlertRules(data.alerts)
    }
  }

  async function toggleAlert(id: string, currentState: boolean) {
    try {
      const res = await fetch(`/api/alerts?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentState }),
      })

      if (!res.ok) {
        throw new Error('Failed to toggle alert')
      }

      // Update local state
      setAlertRules(prev =>
        prev.map(alert =>
          alert.id === id ? { ...alert, isActive: !currentState } : alert
        )
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle alert'
      setError(message)
    }
  }

  async function deleteAlert(id: string) {
    try {
      const res = await fetch(`/api/alerts?id=${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete alert')
      }

      // Remove from local state
      setAlertRules(prev => prev.filter(alert => alert.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete alert'
      setError(message)
    }
  }

  async function triggerCronCheck() {
    setError(null)
    try {
      const res = await fetch('/api/cron/trigger', {
        method: 'POST',
      })

      if (!res.ok) {
        throw new Error('Failed to trigger cron job')
      }

      const data = await res.json()

      // Refresh notifications after cron runs
      const notifRes = await fetch(`/api/notifications?status=${filter}`)
      if (notifRes.ok) {
        const notifData = await notifRes.json()
        setNotifications(notifData.notifications)
      }

      // Show success message
      setError(`✅ Checked ${data.result.checked} alerts, ${data.result.triggered} triggered`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to trigger cron'
      setError(message)
    }
  }

  return (
    <div className="bg-gray-900 h-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-full">
        {/* Left: Create Alert Chat */}
        <div className="flex flex-col h-full border-r border-gray-700">
          {user && <NotificationChat userId={user.id} onAlertCreated={handleAlertCreated} />}
        </div>

        {/* Right: Alert Rules & Notifications */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-6 flex-shrink-0">
            <h1 className="text-3xl font-bold mb-6 text-white">My Alerts & Notifications</h1>

            {/* Active Alert Rules Section */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Active Alert Rules</h2>
                {process.env.NODE_ENV !== 'production' && (
                  <button
                    onClick={triggerCronCheck}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm"
                  >
                    🔄 Check Alerts Now (Dev)
                  </button>
                )}
              </div>
              {alertsLoading ? (
                <div className="text-gray-400">Loading alerts...</div>
              ) : alertRules.length === 0 ? (
                <div className="text-gray-400 bg-gray-800 border border-gray-700 rounded-lg p-4">
                  No alert rules yet. Create one using the chat on the left!
                </div>
              ) : (
                <div className="space-y-3">
                  {alertRules.map((alert) => (
                    <div
                      key={alert.id}
                      className={`border rounded-lg p-4 ${
                        alert.isActive
                          ? 'bg-gray-800 border-gray-700'
                          : 'bg-gray-800/50 border-gray-700/50 opacity-60'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white">{alert.name}</h3>
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                alert.isActive
                                  ? 'bg-green-600/20 text-green-400'
                                  : 'bg-gray-600/20 text-gray-400'
                              }`}
                            >
                              {alert.isActive ? 'Active' : 'Paused'}
                            </span>
                          </div>
                          {alert.description && (
                            <p className="text-gray-400 text-sm mt-1">{alert.description}</p>
                          )}
                          <div className="mt-2 text-xs text-gray-500">
                            Frequency: {alert.frequency}
                            {alert.lastTriggeredAt && (
                              <span className="ml-3">
                                Last triggered: {new Date(alert.lastTriggeredAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => toggleAlert(alert.id, alert.isActive)}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                              alert.isActive
                                ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {alert.isActive ? 'Pause' : 'Resume'}
                          </button>
                          <button
                            onClick={() => deleteAlert(alert.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Triggered Notifications Section */}
            <h2 className="text-xl font-semibold text-white mb-4">Triggered Notifications</h2>

            {/* Filters */}
            <div className="mb-6 flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded transition-colors ${
                  filter === 'unread'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-4 py-2 rounded transition-colors ${
                  filter === 'read'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
              >
                Read
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-900/30 border border-red-600 rounded-lg text-red-200">
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-4 text-red-400 underline hover:text-red-300"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          {/* Notifications List - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`border rounded-lg p-4 ${
                      notif.status === 'unread'
                        ? 'bg-blue-900/20 border-blue-600'
                        : 'bg-gray-800 border-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-white">{notif.title}</h3>
                        <p className="text-gray-300 mt-1">{notif.message}</p>

                        {notif.metadata && (
                          <div className="mt-2 text-sm text-gray-400">
                            <span className="font-semibold">Current Value:</span> $
                            {notif.metadata.currentValue?.toLocaleString()} |
                            <span className="font-semibold ml-2">Threshold:</span> $
                            {notif.metadata.threshold?.toLocaleString()}
                          </div>
                        )}

                        <div className="mt-2 text-xs text-gray-500">
                          {new Date(notif.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        {notif.status === 'unread' && (
                          <button
                            onClick={() => markAsRead(notif.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => archiveNotification(notif.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {notifications.length === 0 && (
                  <div className="text-center text-gray-400 py-12">
                    No notifications found
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
