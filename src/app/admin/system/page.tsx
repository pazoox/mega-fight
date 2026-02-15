'use client'

import { useState, useEffect, useMemo } from 'react'
import { UserProfile } from '@/context/AuthContext'
import { useAuth } from '@/context/AuthContext'
import { 
  Users, 
  Shield, 
  Ban, 
  CheckCircle2, 
  Search, 
  Activity, 
  Coins, 
  AlertTriangle,
  LayoutDashboard,
  UserCog
} from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function SystemPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users'>('dashboard')
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [grant, setGrant] = useState<Record<string, string>>({})
  const { profile } = useAuth()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const email = session?.user?.email?.toLowerCase()

      // Pre-bootstrap: se for o email alvo, tenta promover antes de buscar
      if (email === 'pazin1999@gmail.com') {
        try {
          await fetch('/api/admin/bootstrap', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ email })
          })
        } catch {}
      }
      const res = await fetch('/api/admin/users', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(Array.isArray(data) ? data : [])
      } else if (res.status === 403) {
        // Try bootstrap if requester email matches desired admin
        const email = session?.user?.email
        if (email && email.toLowerCase() === 'pazin1999@gmail.com') {
          const bootstrap = await fetch('/api/admin/bootstrap', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ email })
          })
          if (bootstrap.ok) {
            const again = await fetch('/api/admin/users', {
              headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
            })
            if (again.ok) {
              const data = await again.json()
              setUsers(data)
              toast.success('Perfil promovido a Admin')
              return
            }
          }
          toast.error('Acesso negado: requer perfil admin')
        } else {
          toast.error('Acesso negado: requer perfil admin')
        }
      } else if (res.status === 401) {
        const email = session?.user?.email
        if (email && email.toLowerCase() === 'pazin1999@gmail.com') {
          const bootstrap = await fetch('/api/admin/bootstrap', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ email })
          })
          if (bootstrap.ok) {
            const again = await fetch('/api/admin/users', {
              headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
            })
            if (again.ok) {
              const data = await again.json()
              setUsers(data)
              toast.success('Perfil promovido a Admin')
              return
            }
          }
        }
        toast.error('Faça login para acessar Admin System')
      }
    } catch (error) {
      console.error('Failed to fetch users', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async (id: string, updates: Partial<UserProfile>) => {
    setActionLoading(id)
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ id, ...updates })
      })
      
      if (res.ok) {
        const updatedUser = await res.json()
        setUsers(users.map(u => u.id === id ? { ...u, ...updatedUser } : u))
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Falha ao atualizar usuário')
      }
    } catch (error) {
      console.error('Failed to update user', error)
      toast.error('Erro de rede ao atualizar usuário')
    } finally {
      setActionLoading(null)
    }
  }

  const handleGrantCoins = async (id: string) => {
    const amount = parseInt(grant[id] || '0', 10)
    if (!amount || amount <= 0) return
    setActionLoading(id)
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ id, grantCoins: amount })
      })
      if (res.ok) {
        const updated = await res.json()
        setUsers(prev => prev.map(u => u.id === id ? { ...u, coins: updated.coins } : u))
        setGrant(prev => ({ ...prev, [id]: '' }))
        toast.success(`Coins enviados: +${amount}`)
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Falha ao enviar coins')
      }
    } catch (error) {
      toast.error('Erro de rede ao enviar coins')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRefreshUsers = async () => {
    setActionLoading('refresh')
    await fetchUsers()
    setActionLoading(null)
  }
  const filteredUsers = useMemo(() => {
    if (!search) return users
    const lower = search.toLowerCase()
    return users.filter(u => {
      const name = (u.username || '').toLowerCase()
      const idStr = String(u.id || '').toLowerCase()
      return name.includes(lower) || idStr.includes(lower)
    })
  }, [users, search])

  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter(u => u.role === 'admin').length,
      banned: users.filter(u => u.is_banned).length,
      active: users.filter(u => !u.is_banned).length,
      totalCoins: users.reduce((acc, u) => acc + (u.coins || 0), 0)
    }
  }, [users])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-2 flex items-center gap-3">
          <Shield className="text-orange-500" size={32} />
          System <span className="text-zinc-500">Control</span>
        </h1>
        <p className="text-zinc-500 text-sm font-mono tracking-widest">
          User Management & System Health
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-zinc-800 pb-1">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase transition-colors ${
            activeTab === 'dashboard' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-zinc-500 hover:text-white'
          }`}
        >
          <LayoutDashboard size={18} />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase transition-colors ${
            activeTab === 'users' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-zinc-500 hover:text-white'
          }`}
        >
          <Users size={18} />
          User List ({users.length})
        </button>
      </div>

      {/* Dashboard View */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zinc-500 font-bold uppercase text-xs tracking-wider">Total Users</h3>
              <Users className="text-zinc-400" size={20} />
            </div>
            <div className="text-4xl font-black text-white">{stats.total}</div>
          </div>
          <div className="p-3 text-xs text-zinc-500">{users.length === 0 ? 'Nenhum usuário encontrado' : null}</div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zinc-500 font-bold uppercase text-xs tracking-wider">Active Admins</h3>
              <Shield className="text-blue-500" size={20} />
            </div>
            <div className="text-4xl font-black text-white">{stats.admins}</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zinc-500 font-bold uppercase text-xs tracking-wider">Economy (Coins)</h3>
              <Coins className="text-yellow-500" size={20} />
            </div>
            <div className="text-4xl font-black text-white">{stats.totalCoins.toLocaleString()}</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zinc-500 font-bold uppercase text-xs tracking-wider">Banned Users</h3>
              <Ban className="text-red-500" size={20} />
            </div>
            <div className="text-4xl font-black text-white">{stats.banned}</div>
          </div>

          {/* Traffic Placeholder */}
          <div className="col-span-1 md:col-span-2 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-zinc-500 font-bold uppercase text-xs tracking-wider flex items-center gap-2">
                <Activity size={16} />
                Traffic Overview
              </h3>
              <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400">Last 24h</span>
            </div>
            <div className="h-32 flex items-end gap-2 opacity-50">
              {/* Mock Bars */}
              {Array.from({ length: 24 }).map((_, i) => (
                <div 
                  key={i} 
                  className="flex-1 bg-orange-500 rounded-t-sm transition-all hover:bg-orange-400"
                  style={{ height: `${Math.random() * 100}%` }}
                />
              ))}
            </div>
            <div className="absolute bottom-4 right-6 text-right">
              <div className="text-2xl font-bold text-white">~1.2k</div>
              <div className="text-xs text-zinc-500">Page Views</div>
            </div>
          </div>
        </div>
      )}

      {/* User List View */}
      {activeTab === 'users' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {/* Search Bar */}
          <div className="p-4 border-b border-zinc-800 flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="Search users..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <button
              onClick={handleRefreshUsers}
              disabled={actionLoading === 'refresh'}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold uppercase"
            >
              Refresh Users
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-500 uppercase font-mono text-xs">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Usage</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center text-zinc-500">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                          ) : (
                            <UserCog size={20} />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white">{user.username}</div>
                          <div className="text-xs text-zinc-500 font-mono">{user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                        user.role === 'admin' 
                          ? 'bg-blue-900/20 border-blue-800 text-blue-400' 
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                      }`}>
                        {user.role === 'admin' ? <Shield size={12} /> : <Users size={12} />}
                        {user.role === 'admin' ? 'ADMIN' : 'USER'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <Coins size={14} className="text-yellow-500" />
                          <span>{user.coins}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.is_banned ? (
                        <div className="inline-flex items-center gap-1.5 text-red-500 font-bold text-xs">
                          <Ban size={14} /> BANNED
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-green-500 font-bold text-xs">
                          <CheckCircle2 size={14} /> ACTIVE
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleUpdateUser(user.id, { role: user.role === 'admin' ? 'user' : 'admin' })}
                          disabled={actionLoading === user.id}
                          className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
                          title={user.role === 'admin' ? "Demote to User" : "Promote to Admin"}
                        >
                          <Shield size={16} />
                        </button>
                        <button
                          onClick={() => handleUpdateUser(user.id, { is_banned: !user.is_banned })}
                          disabled={actionLoading === user.id}
                          className={`p-2 rounded-lg transition-colors ${
                            user.is_banned 
                              ? 'hover:bg-green-900/20 text-green-500 hover:text-green-400' 
                              : 'hover:bg-red-900/20 text-red-500 hover:text-red-400'
                          }`}
                          title={user.is_banned ? "Unban User" : "Ban User"}
                        >
                          {user.is_banned ? <CheckCircle2 size={16} /> : <Ban size={16} />}
                        </button>
                        <div className="flex items-center gap-2 ml-2">
                          <input
                            type="number"
                            min={1}
                            value={grant[user.id] || ''}
                            onChange={e => setGrant(prev => ({ ...prev, [user.id]: e.target.value }))}
                            placeholder="+Coins"
                            className="w-24 bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500"
                          />
                          <button
                            onClick={() => handleGrantCoins(user.id)}
                            disabled={actionLoading === user.id}
                            className="px-3 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg text-xs font-bold uppercase"
                            title="Send Coins"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-zinc-500">
                No users found matching "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
