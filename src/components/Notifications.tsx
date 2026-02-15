'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, UserPlus, Trophy, Gift, CheckCircle2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

interface Notification {
  id: string
  type: 'friend_request' | 'cup_approved' | 'reward'
  title: string
  message: string
  data: any
  read: boolean
  created_at: string
}

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const fetchNotifications = async () => {
    try {
      const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession())
      const token = session?.access_token

      if (!token) {
        console.log('Skipping fetchNotifications: No token')
        return
      }

      const res = await fetch('/api/user/notifications', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        console.log('Fetched notifications:', data.length)
        setNotifications(data)
        setUnreadCount(data.filter((n: Notification) => !n.read).length)
      } else {
        console.error('Fetch notifications error:', res.status)
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error)
    }
  }

  useEffect(() => {
    let channel: any

    const init = async () => {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
          if (nextSession?.user) {
            init()
            subscription.unsubscribe()
          }
        })
        return
      }

      fetchNotifications()

      channel = supabase
        .channel('notifications_global_v2')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications'
          },
          payload => {
            const newNotif = payload.new as any
            if (newNotif.user_id === session.user.id) {
              setNotifications(prev => [newNotif, ...prev])
              setUnreadCount(prev => prev + 1)
              toast.info(newNotif.title || 'New Notification', {
                description: newNotif.message,
                action: {
                  label: 'View',
                  onClick: () => router.push('/profile?tab=notifications')
                }
              })
            }
          }
        )
        .subscribe()
    }

    init()

    return () => {
      if (channel) {
        import('@/lib/supabase').then(m => m.supabase.removeChannel(channel))
      }
    }
  }, [])

  // Close on click outside
  useEffect(() => {
    if (isOpen) {
        fetchNotifications() // Force refresh when opening
    }
    
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [dropdownRef, isOpen]) // Added isOpen dependency

  const markAsRead = async (id?: string) => {
    try {
      const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession())
      const token = session?.access_token

      await fetch('/api/user/notifications', {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(id ? { id } : { all: true })
      })
      
      if (id) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
      } else {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Failed to mark read', error)
    }
  }

  const handleNotificationClick = (n: Notification) => {
    if (!n.read) markAsRead(n.id)
    setIsOpen(false)

    // Action based on type
    if (n.type === 'friend_request') {
      router.push('/profile?tab=friends')
    } else if (n.type === 'cup_approved') {
      router.push('/profile?tab=cups')
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'friend_request': return <UserPlus size={16} className="text-blue-500" />
      case 'cup_approved': return <CheckCircle2 size={16} className="text-green-500" />
      case 'reward': return <Gift size={16} className="text-yellow-500" />
      default: return <Bell size={16} className="text-zinc-500" />
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right z-50">
          <div className="p-3 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/50">
            <h3 className="font-bold text-sm text-zinc-300">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={(e) => { e.stopPropagation(); markAsRead(); }}
                className="text-[10px] font-bold uppercase tracking-wider text-orange-500 hover:text-orange-400"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 text-xs font-mono uppercase tracking-widest">
                No notifications
              </div>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-4 border-b border-zinc-900/50 hover:bg-zinc-900 transition-colors cursor-pointer flex gap-3 ${!n.read ? 'bg-zinc-900/20' : ''}`}
                >
                  <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center border border-zinc-800 bg-zinc-950 shrink-0`}>
                    {getIcon(n.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`text-sm font-bold ${!n.read ? 'text-white' : 'text-zinc-400'}`}>
                        {n.title}
                      </h4>
                      {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-zinc-600 mt-2 block font-mono">
                      {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
