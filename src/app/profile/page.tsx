'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { User, Shield, Trophy, Users, MessageSquare, Settings, Coins, Plus, Loader2, Edit2, ArrowLeft, Save, Search, UserPlus, Check, X, Trash2 } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import CharacterForm from '@/components/admin/CharacterForm'
import CreateCupForm from '@/components/profile/CreateCupForm'
import { Character } from '@/types'
import { supabase } from '@/lib/supabase'

type Friend = {
  id: string
  friendId: string
  username: string
  avatarUrl: string
  status: 'pending' | 'accepted'
  isRequester: boolean
  createdAt: string
}

type SearchUser = {
  id: string
  username: string
  avatar_url: string
}

type Comment = {
  id: string
  content: string
  created_at: string
  user_id: string
}

import { usePlayCup } from '@/hooks/usePlayCup'

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" size={48} /></div>}>
      <ProfilePageContent />
    </Suspense>
  )
}

function ProfilePageContent() {
  const { user, profile, loading, refreshProfile, session } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { playCup, createRoom, isLoading: isPlayingCup } = usePlayCup()

  const [activeTab, setActiveTab] = useState<'profile' | 'fighters' | 'cups' | 'friends'>('profile')
  
  // Fighters State
  const [fighters, setFighters] = useState<Character[]>([])
  const [loadingFighters, setLoadingFighters] = useState(false)
  const [showFighterForm, setShowFighterForm] = useState(false)
  const [editingFighterId, setEditingFighterId] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingFighterId, setDeletingFighterId] = useState<string | null>(null)
  const [isDeletingFighter, setIsDeletingFighter] = useState(false)

  // Profile Edit State
  const [avatarUrl, setAvatarUrl] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Friends State
  const [friends, setFriends] = useState<Friend[]>([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)

  // Cups State
  const [userCups, setUserCups] = useState<any[]>([])
  const [loadingCups, setLoadingCups] = useState(false)
  const [showCupForm, setShowCupForm] = useState(false)
  const [selectedCup, setSelectedCup] = useState<any>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
    if (profile?.avatar_url) {
      setAvatarUrl(profile.avatar_url)
    }
  }, [user, loading, router, profile])

  useEffect(() => {
    if (!user) return
    if (activeTab === 'fighters') fetchUserFighters()
    if (activeTab === 'friends') fetchFriends()
    if (activeTab === 'cups') {
      const targetUserId = searchParams.get('userId') || user.id
      fetchUserCups(targetUserId)
    }
  }, [activeTab, user, searchParams])

  const fetchUserCups = async (targetUserId?: string) => {
    const uid = targetUserId || user?.id
    if (!uid) return
    setLoadingCups(true)
    try {
      const res = await fetch(`/api/user/cups?userId=${uid}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        const filtered = data.filter((cup: any) => {
          const origin = cup?.config?.meta?.origin
          const name = (cup?.name || '').toLowerCase()
          const isQuickMatchName = name.startsWith('quick match')
          // Show only cups created via CreateCupForm ("profile"), and also include
          // legacy manual cups without meta that are not Quick Match auto-cups.
          return origin === 'profile' || (!origin && !isQuickMatchName)
        })
        setUserCups(filtered)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingCups(false)
    }
  }

  const handleDeleteCup = async (cupId: string) => {
    if (!confirm('Are you sure you want to delete this cup?')) return
    try {
      const res = await fetch(`/api/user/cups?id=${cupId}`, { method: 'DELETE' })
      if (res.ok) {
        setUserCups(prev => prev.filter(c => c.id !== cupId))
        if (selectedCup?.id === cupId) setSelectedCup(null)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleShareCup = async (cupId: string) => {
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session: shareSession } } = await supabase.auth.getSession()
      const res = await fetch('/api/user/cups', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(shareSession?.access_token ? { 'Authorization': `Bearer ${shareSession.access_token}` } : {})
        },
        body: JSON.stringify({ id: cupId, status: 'public' })
      })
      if (res.ok) {
        fetchUserCups()
        setSelectedCup((prev: any) => prev ? { ...prev, status: 'public' } : null)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchUserFighters = async () => {
    if (!session?.access_token) return
    setLoadingFighters(true)
    try {
      const res = await fetch(`/api/user/fighters`, {
        headers: {
            'Authorization': `Bearer ${session.access_token}`
        }
      })
      const data = await res.json()
      if (Array.isArray(data)) {
        setFighters(data)
      }
    } catch (error) {
      console.error('Failed to fetch fighters', error)
    } finally {
      setLoadingFighters(false)
    }
  }

  const handleSaveFighter = async (charData: Partial<Character>) => {
    if (!session?.access_token) return
    setCreateError(null)
    
    try {
      const isEdit = !!editingFighterId
      const url = '/api/user/fighters'
      const method = isEdit ? 'PUT' : 'POST'
      
      const payload = isEdit ? { ...charData, id: editingFighterId } : charData

      const res = await fetch(url, {
        method,
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save fighter')
      }

      if (!isEdit) {
         await refreshProfile() // Update coins only on creation
      }
      
      setShowFighterForm(false)
      setEditingFighterId(null)
      fetchUserFighters()
    } catch (error: any) {
      setCreateError(error.message)
      throw error 
    }
  }

  const handleEditClick = (fighterId: string) => {
    setEditingFighterId(fighterId)
    setShowFighterForm(true)
  }

  const handleCreateClick = () => {
    setEditingFighterId(null)
    setShowFighterForm(true)
  }

  const requestDeleteFighter = (fighterId: string) => {
    setDeletingFighterId(fighterId)
    setShowDeleteModal(true)
  }

  const confirmDeleteFighter = async () => {
    if (!session?.access_token || !deletingFighterId) return
    setIsDeletingFighter(true)
    try {
      const res = await fetch(`/api/user/fighters?id=${deletingFighterId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to delete fighter')
        return
      }
      await refreshProfile()
      setFighters(prev => prev.filter(f => f.id !== deletingFighterId))
      setShowDeleteModal(false)
      setDeletingFighterId(null)
    } catch (error) {
      console.error('Failed to delete fighter', error)
    } finally {
      setIsDeletingFighter(false)
    }
  }

  const handleUpdateProfile = async () => {
     if (!user) return
     setIsSavingProfile(true)
     try {
        const { error } = await (supabase as any)
           .from('profiles')
           .update({ avatar_url: avatarUrl })
           .eq('id', user.id)
        
        if (error) throw error
        await refreshProfile()
        alert('Profile updated!')
     } catch (error) {
        console.error(error)
        alert('Error updating profile')
     } finally {
        setIsSavingProfile(false)
     }
  }

  // --- Friends Functions ---

  const fetchFriends = async () => {
    if (!session?.access_token) return
    setLoadingFriends(true)
    try {
      const res = await fetch('/api/user/friends', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      const data = await res.json()
      if (Array.isArray(data)) setFriends(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingFriends(false)
    }
  }

  const searchUsers = async () => {
    if (!searchQuery.trim() || !session?.access_token) return
    setSearching(true)
    try {
      const res = await fetch(`/api/user/friends?search=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      const data = await res.json()
      if (Array.isArray(data)) setSearchResults(data)
    } catch (err) {
      console.error(err)
    } finally {
      setSearching(false)
    }
  }

  const addFriend = async (targetUserId: string) => {
    if (!session?.access_token) return
    try {
      const res = await fetch('/api/user/friends', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({ targetUserId })
      })
      if (res.ok) {
        alert('Friend request sent!')
        setSearchResults(prev => prev.filter(u => u.id !== targetUserId))
        fetchFriends()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to send request')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleFriendAction = async (relationshipId: string, action: 'accept' | 'reject') => {
     if (!session?.access_token) return
     try {
       const res = await fetch('/api/user/friends', {
         method: 'PUT',
         headers: { 
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${session.access_token}` 
         },
         body: JSON.stringify({ relationshipId, action })
       })
       if (res.ok) {
         fetchFriends()
       }
     } catch (err) {
       console.error(err)
     }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500" size={48} />
      </div>
    )
  }

  // Filter friends lists
  const pendingIncoming = friends.filter(f => f.status === 'pending' && !f.isRequester)
  const pendingOutgoing = friends.filter(f => f.status === 'pending' && f.isRequester)
  const acceptedFriends = friends.filter(f => f.status === 'accepted')

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-12 px-6 max-w-7xl mx-auto w-full">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-end gap-8 mb-12 border-b border-zinc-800 pb-8">
          <div className="relative group">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-zinc-900 bg-zinc-800 overflow-hidden shadow-2xl">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                  <User size={64} />
                </div>
              )}
            </div>
            <button 
                onClick={() => setActiveTab('profile')}
                className="absolute bottom-2 right-2 p-2 bg-orange-500 rounded-full text-white hover:scale-110 transition-transform shadow-lg"
            >
              <Edit2 size={16} />
            </button>
          </div>
          
          <div className="flex-1 mb-2">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-2">
              {profile?.username || user.email?.split('@')[0]}
            </h1>
            <div className="flex items-center gap-6 text-sm font-bold tracking-widest text-zinc-500">
              <span className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                <Coins size={16} /> {profile?.coins || 0} COINS
              </span>
              <span className="flex items-center gap-2">
                <Users size={16} /> {acceptedFriends.length} FRIENDS
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 border-b border-zinc-800 scrollbar-hide">
          {[
            { id: 'profile', label: 'Profile', icon: Settings },
            { id: 'fighters', label: 'Fighters', icon: Shield },
            { id: 'cups', label: 'Cups', icon: Trophy },
            { id: 'friends', label: 'Friends', icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-full font-bold uppercase tracking-wider text-sm whitespace-nowrap transition-all
                ${activeTab === tab.id 
                  ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]' 
                  : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}
              `}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.id === 'friends' && pendingIncoming.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                  {pendingIncoming.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="min-h-[400px]">
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8">
                <h3 className="text-xl font-bold uppercase italic text-zinc-400 mb-6 flex items-center gap-2">
                  <Settings size={20} /> Account Settings
                </h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-600 uppercase">Username</label>
                    <input 
                      type="text" 
                      value={profile?.username || ''} 
                      readOnly
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-zinc-400 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-600 uppercase">Email</label>
                    <input 
                      type="email" 
                      value={user.email || ''} 
                      readOnly
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-zinc-400 cursor-not-allowed"
                    />
                  </div>
                  
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-zinc-600 uppercase">Avatar URL</label>
                     <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={avatarUrl} 
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          placeholder="https://example.com/avatar.jpg"
                          className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none"
                        />
                     </div>
                  </div>

                  <div className="pt-4 flex flex-col md:flex-row gap-4">
                    <button 
                        onClick={handleUpdateProfile}
                        disabled={isSavingProfile}
                        className="flex-1 bg-white hover:bg-zinc-200 text-black font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {isSavingProfile ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                      Save Profile
                    </button>
                    <button 
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 rounded-xl transition-colors"
                        onClick={() => alert('Password reset email sent!')}
                    >
                      Reset Password
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fighters' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {!showFighterForm ? (
                <>
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black italic uppercase text-zinc-300">My Fighters</h3>
                    <button 
                      onClick={handleCreateClick}
                      className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-105"
                    >
                      <Plus size={18} /> Recruit New (10 Coins)
                    </button>
                  </div>

                  {loadingFighters ? (
                    <div className="flex justify-center py-20">
                      <Loader2 className="animate-spin text-zinc-600" size={32} />
                    </div>
                  ) : fighters.length === 0 ? (
                    <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-zinc-800 border-dashed">
                      <Shield className="mx-auto text-zinc-700 mb-4" size={48} />
                      <p className="text-zinc-500 font-bold">No fighters recruited yet.</p>
                      <button 
                        onClick={handleCreateClick}
                        className="mt-4 text-orange-500 hover:text-orange-400 text-sm font-bold"
                      >
                        Start your journey
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {fighters.map(fighter => (
                        <div key={fighter.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors group relative">
                           <div className="aspect-square bg-zinc-800 relative">
                            {fighter.stages?.[0]?.thumbnail || fighter.stages?.[0]?.image ? (
                               <img src={fighter.stages[0].thumbnail || fighter.stages[0].image} alt={fighter.name} className="w-full h-full object-cover" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                 <User size={32} />
                               </div>
                             )}
                             <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                               <button 
                                 onClick={() => handleEditClick(fighter.id!)}
                                 className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform shadow-lg"
                               >
                                 <Edit2 size={20} />
                               </button>
                               <button
                                 onClick={(e) => { e.stopPropagation(); requestDeleteFighter(fighter.id!) }}
                                 className="p-3 bg-red-600 text-white rounded-full hover:scale-110 transition-transform shadow-lg"
                               >
                                 <Trash2 size={20} />
                               </button>
                             </div>
                           </div>
                           <div className="p-4">
                             <h4 className="font-bold text-white truncate">{fighter.name}</h4>
                             <p className="text-xs text-zinc-500 uppercase font-bold mt-1">
                               {profile?.username}'s Group
                             </p>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div>
                  {createError && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6">
                      {createError}
                    </div>
                  )}

                  <CharacterForm 
                    characterId={editingFighterId || undefined}
                    userMode={true} 
                    userGroup={`${profile?.username}'s Group`}
                    onSaveCustom={handleSaveFighter}
                    onCancel={() => setShowFighterForm(false)}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'cups' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               {!showCupForm ? (
                 <>
                   <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black italic uppercase text-zinc-300">My Cups</h3>
                      {(!searchParams.get('userId') || searchParams.get('userId') === user?.id) && (
                        <button 
                          onClick={() => setShowCupForm(true)}
                          className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-105 shadow-lg shadow-yellow-500/20"
                        >
                          <Plus size={18} /> Create Cup
                        </button>
                      )}
                   </div>
           
                   {loadingCups ? (
                       <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
                   ) : userCups.length === 0 ? (
                       <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-zinc-800 border-dashed">
                           <Trophy className="mx-auto text-zinc-700 mb-4" size={48} />
                           <p className="text-zinc-500 font-bold">No custom cups created yet.</p>
                           <button onClick={() => setShowCupForm(true)} className="mt-4 text-yellow-500 font-bold hover:underline">Create one now</button>
                       </div>
                   ) : (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           {userCups.map(cup => (
                               <div 
                                   key={cup.id} 
                                   onClick={() => setSelectedCup(cup)}
                                   className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 cursor-pointer hover:border-yellow-500/50 transition-all hover:bg-zinc-800 group relative overflow-hidden"
                               >
                                   <div className="flex justify-between items-start mb-4 relative z-10">
                                       <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                                           cup.status === 'public' ? 'bg-green-900/30 text-green-500' : 
                                           cup.status === 'pending' ? 'bg-blue-900/30 text-blue-500' : 
                                           'bg-zinc-800 text-zinc-500'
                                       }`}>
                                           {cup.status === 'public' ? 'Community' : cup.status === 'pending' ? 'Pending' : 'Private'}
                                       </span>
                                       {/* Delete Button */}
                                       <button 
                                           onClick={(e) => { e.stopPropagation(); handleDeleteCup(cup.id); }}
                                           className="text-zinc-600 hover:text-red-500 transition-colors"
                                       >
                                           <Trash2 size={16} />
                                       </button>
                                   </div>
                                   <h4 className="font-black text-xl italic text-white mb-2 group-hover:text-yellow-500 transition-colors relative z-10">{cup.name}</h4>
                                   <p className="text-sm text-zinc-400 line-clamp-2 mb-4 h-10 relative z-10">{cup.description || "No description"}</p>
                                   
                                   <div className="flex items-center gap-4 text-xs font-bold text-zinc-500 relative z-10">
                                       <span className="flex items-center gap-1"><Users size={12}/> {cup.config.participantCriteria.bracketSize} Teams</span>
                                       <span className="flex items-center gap-1"><Settings size={12}/> {cup.config.teamSize}v{cup.config.teamSize}</span>
                                   </div>

                                   <Trophy className="absolute -bottom-4 -right-4 text-zinc-800/50 rotate-12" size={100} />
                               </div>
                           ))}
                       </div>
                   )}
                 </>
               ) : (
                 <CreateCupForm 
                   onSuccess={() => { 
                      setShowCupForm(false); 
                      const targetUserId = searchParams.get('userId') || user?.id
                      fetchUserCups(targetUserId); 
                   }}
                   onCancel={() => setShowCupForm(false)}
                 />
               )}
             </div>
          )}

          {/* Selected Cup Modal/Overlay */}
          {selectedCup && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedCup(null)}>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-8 relative animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setSelectedCup(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={20}/></button>
                      
                      <h2 className="text-3xl font-black italic uppercase text-white mb-2">{selectedCup.name}</h2>
                      <p className="text-zinc-400 mb-6">{selectedCup.description}</p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-8">
                          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                              <span className="text-xs font-bold text-zinc-500 block mb-1">FORMAT</span>
                              <span className="font-bold text-white">{selectedCup.config.teamSize}v{selectedCup.config.teamSize}</span>
                          </div>
                          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                              <span className="text-xs font-bold text-zinc-500 block mb-1">SIZE</span>
                              <span className="font-bold text-white">{selectedCup.config.participantCriteria.bracketSize} Teams</span>
                          </div>
                      </div>
          
                      <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <button 
                              onClick={() => selectedCup && playCup(selectedCup)}
                              disabled={isPlayingCup}
                              className="py-4 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black uppercase rounded-xl flex flex-col items-center justify-center gap-1 transition-all shadow-lg shadow-yellow-500/20"
                            >
                                {isPlayingCup ? (
                                    <span className="animate-pulse">Loading...</span>
                                ) : (
                                    <>
                                        <User size={20} /> Play Solo
                                    </>
                                )}
                            </button>
                            <button 
                              onClick={() => selectedCup && createRoom(selectedCup)}
                              className="py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase rounded-xl flex flex-col items-center justify-center gap-1 transition-all"
                            >
                                <Users size={20} /> Create Room
                            </button>
                          </div>
                          
                          {selectedCup.status === 'private' && (
                              <button 
                                  onClick={() => handleShareCup(selectedCup.id)}
                                  className="w-full py-3 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white font-bold uppercase rounded-xl transition-all"
                              >
                                  Share with Community
                              </button>
                          )}
                          {selectedCup.status === 'pending' && (
                              <div className="w-full py-3 border border-blue-900/50 bg-blue-900/10 text-blue-500 font-bold uppercase rounded-xl text-center flex items-center justify-center gap-2">
                                  <Loader2 className="animate-spin" size={16} /> Waiting Approval
                              </div>
                          )}
                           {selectedCup.status === 'public' && (
                              <div className="w-full py-3 border border-green-900/50 bg-green-900/10 text-green-500 font-bold uppercase rounded-xl text-center flex items-center justify-center gap-2">
                                  <Check size={16} /> Community Cup (Public)
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'friends' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
               
               {/* Search Section */}
               <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">
                 <h3 className="text-lg font-bold uppercase italic text-zinc-400 mb-4 flex items-center gap-2">
                   <UserPlus size={20} /> Add Friends
                 </h3>
                 <div className="flex gap-4">
                   <div className="relative flex-1">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                     <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search users by username..."
                        className="w-full bg-black border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-white focus:border-orange-500 outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                     />
                   </div>
                   <button 
                     onClick={searchUsers}
                     disabled={searching}
                     className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors"
                   >
                     {searching ? <Loader2 className="animate-spin" /> : 'Search'}
                   </button>
                 </div>

                 {/* Search Results */}
                 {searchResults.length > 0 && (
                   <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                     {searchResults.map(user => (
                       <div key={user.id} className="flex items-center justify-between p-4 bg-black border border-zinc-800 rounded-xl">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
                             {user.avatar_url ? (
                               <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center"><User size={16} /></div>
                             )}
                           </div>
                           <span className="font-bold">{user.username}</span>
                         </div>
                         <button 
                           onClick={() => addFriend(user.id)}
                           className="p-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-white transition-colors"
                         >
                           <UserPlus size={18} />
                         </button>
                       </div>
                     ))}
                   </div>
                 )}
               </div>

               {/* Friend Requests */}
               {pendingIncoming.length > 0 && (
                 <div className="space-y-4">
                   <h3 className="text-lg font-bold uppercase italic text-zinc-400">Incoming Requests</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {pendingIncoming.map(req => (
                       <div key={req.id} className="p-4 bg-zinc-900 border border-orange-500/30 rounded-2xl flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
                             {req.avatarUrl ? (
                               <img src={req.avatarUrl} alt={req.username} className="w-full h-full object-cover" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center"><User size={16} /></div>
                             )}
                           </div>
                           <span className="font-bold">{req.username}</span>
                         </div>
                         <div className="flex gap-2">
                           <button 
                             onClick={() => handleFriendAction(req.id, 'accept')}
                             className="p-2 bg-green-600/20 text-green-500 hover:bg-green-600 hover:text-white rounded-lg transition-colors"
                           >
                             <Check size={18} />
                           </button>
                           <button 
                             onClick={() => handleFriendAction(req.id, 'reject')}
                             className="p-2 bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white rounded-lg transition-colors"
                           >
                             <X size={18} />
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

                {/* Pending Outgoing */}
               {pendingOutgoing.length > 0 && (
                 <div className="space-y-4">
                   <h3 className="text-lg font-bold uppercase italic text-zinc-400">Sent Requests</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {pendingOutgoing.map(req => (
                       <div key={req.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between opacity-70">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
                             {req.avatarUrl ? (
                               <img src={req.avatarUrl} alt={req.username} className="w-full h-full object-cover" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center"><User size={16} /></div>
                             )}
                           </div>
                           <span className="font-bold">{req.username}</span>
                         </div>
                         <span className="text-xs font-bold text-zinc-500 uppercase">Pending</span>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               {/* Friends List */}
               <div className="space-y-4">
                 <h3 className="text-lg font-bold uppercase italic text-zinc-400">My Friends</h3>
                 {loadingFriends ? (
                   <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
                 ) : acceptedFriends.length === 0 ? (
                   <p className="text-zinc-500">No friends yet. Search for users to add them!</p>
                 ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {acceptedFriends.map(friend => (
                       <div key={friend.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between group">
                         <div className="flex items-center gap-3">
                           <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden">
                             {friend.avatarUrl ? (
                               <img src={friend.avatarUrl} alt={friend.username} className="w-full h-full object-cover" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center"><User size={20} /></div>
                             )}
                           </div>
                           <div>
                              <span className="font-bold block">{friend.username}</span>
                              <span className="text-xs text-zinc-500">Friend</span>
                           </div>
                         </div>
                         <button 
                            onClick={() => handleFriendAction(friend.id, 'reject')}
                            className="p-2 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove Friend"
                         >
                            <Trash2 size={18} />
                         </button>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             </div>
          )}

          {showDeleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowDeleteModal(false)}>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setShowDeleteModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={20}/></button>
                <h3 className="text-xl font-black italic uppercase text-white mb-2">Remover Fighter</h3>
                <p className="text-zinc-400 mb-6">Ao remover, você recebe 10 coins de volta.</p>
                <div className="flex gap-3">
                  <button 
                    onClick={confirmDeleteFighter}
                    disabled={isDeletingFighter}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    {isDeletingFighter ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />} Confirmar
                  </button>
                  <button 
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
