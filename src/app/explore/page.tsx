'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { Character, Group, Challenge } from '@/types'
import { getCharacterPWR } from '@/utils/statTiers'
import { Navbar } from '@/components/Navbar'
import { ChallengeFallbackCard } from '@/components/ChallengeFallbackCard'
import { Search, Filter, Layers, Zap, Shield, Users, Play, Globe, Trophy } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { usePlayCup } from '@/hooks/usePlayCup'
import { useAuth } from '@/context/AuthContext'

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">Loading...</div>}>
      <ExplorePageContent />
    </Suspense>
  )
}

function ExplorePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const initialTab = (searchParams.get('tab') as 'challenges' | 'community' | 'fighters') || 'challenges'

  const { playCup, isLoading: isPlayingCup } = usePlayCup()
  const { user } = useAuth()

  const [characters, setCharacters] = useState<Character[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [userCups, setUserCups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoadingMoreFighters, setIsLoadingMoreFighters] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'challenges' | 'community' | 'fighters'>(initialTab)
  const [cupSearch, setCupSearch] = useState('')
  const [cupTeamFilter, setCupTeamFilter] = useState<'all' | '1' | '2' | '3' | '4'>('all')
  const [fighterPage, setFighterPage] = useState(0)
  const [fightersHasMore, setFightersHasMore] = useState(true)

  const FIGHTERS_PAGE_SIZE = 32

  const nextMatch = null;

  const handleTabChange = (tab: 'challenges' | 'community' | 'fighters') => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    const tab = (searchParams.get('tab') as 'challenges' | 'community' | 'fighters') || 'challenges'
    setActiveTab(tab)
  }, [searchParams])

  useEffect(() => {
    const safeJson = async (url: string) => {
      try {
        const res = await fetch(url)
        const ct = res.headers.get('content-type') || ''
        if (!res.ok || !ct.includes('application/json')) return null
        return await res.json()
      } catch {
        return null
      }
    }

    ;(async () => {
      const [groupsData, challengesData, cupsData] = await Promise.all([
        safeJson('/api/groups'),
        safeJson('/api/challenges'),
        safeJson('/api/user/cups?status=public')
      ])

      setGroups(Array.isArray(groupsData) ? groupsData : [])
      setChallenges(Array.isArray(challengesData) ? challengesData : [])
      setUserCups(Array.isArray(cupsData) ? cupsData : [])
    })()
  }, [user])

  useEffect(() => {
    const safeJson = async (url: string) => {
      try {
        const res = await fetch(url)
        const ct = res.headers.get('content-type') || ''
        if (!res.ok || !ct.includes('application/json')) return null
        return await res.json()
      } catch {
        return null
      }
    }

    if (activeTab !== 'fighters') return

    ;(async () => {
      try {
        setLoading(true)
        const charsData = await safeJson(`/api/characters?limit=${FIGHTERS_PAGE_SIZE}&offset=0&mode=list`)
        setCharacters(Array.isArray(charsData) ? charsData : [])
        setFightersHasMore(Array.isArray(charsData) && charsData.length === FIGHTERS_PAGE_SIZE)
        setFighterPage(1)
      } finally {
        setLoading(false)
      }
    })()
  }, [activeTab])

  const loadMoreFighters = async () => {
    if (isLoadingMoreFighters || !fightersHasMore || activeTab !== 'fighters') return

    try {
      setIsLoadingMoreFighters(true)
      const offset = fighterPage * FIGHTERS_PAGE_SIZE
      const res = await fetch(`/api/characters?limit=${FIGHTERS_PAGE_SIZE}&offset=${offset}&mode=list`)
      const data = await res.json()

      if (Array.isArray(data) && data.length > 0) {
        setCharacters(prev => [...prev, ...data])
        setFightersHasMore(data.length === FIGHTERS_PAGE_SIZE)
        setFighterPage(prev => prev + 1)
      } else {
        setFightersHasMore(false)
      }
    } catch (error) {
      console.error('Failed to load more fighters', error)
    } finally {
      setIsLoadingMoreFighters(false)
    }
  }

  const filteredCharacters = characters.filter(c => {
    // Basic search filter
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.stages[0]?.combat.mainSkill?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    // Group selection filter
    const matchesGroup = selectedGroup === 'all' || c.groupId === selectedGroup
    
    // Tab-based filtering
    // 'fighters' tab -> Show ONLY Platform/Franchise groups
    // 'community' tab -> Show ONLY User/Community groups
    // 'challenges' tab -> Doesn't use this list directly usually, but safe to default
    let matchesTab = true
    if (activeTab === 'fighters') {
       const group = groups.find(g => g.id === c.groupId)
       matchesTab = group?.type === 'Platform' || group?.type === 'Franchise' || !group?.type // Default to Platform if type missing
    } else if (activeTab === 'community') {
       const group = groups.find(g => g.id === c.groupId)
       matchesTab = group?.type === 'Community' || group?.type === 'User'
    }

    return matchesSearch && matchesGroup && matchesTab
  })

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <Navbar active="explore" />

      <main className="flex-1 pt-24 pb-12 px-6 max-w-7xl mx-auto w-full">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
          <div>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 mb-2">
              Explore
            </h1>
            <p className="text-zinc-500 font-mono tracking-widest">
              Discover scenarios and fighters
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-12 border-b border-zinc-800 pb-1 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => handleTabChange('challenges')}
            className={`px-6 py-3 font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${activeTab === 'challenges' ? 'text-orange-500 border-orange-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
          >
            Challenges
          </button>
          <button 
            onClick={() => setActiveTab('community')}
            className={`px-6 py-3 font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${activeTab === 'community' ? 'text-orange-500 border-orange-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
          >
            Community Cups
          </button>
          <button 
            onClick={() => handleTabChange('fighters')}
            className={`px-6 py-3 font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${activeTab === 'fighters' ? 'text-orange-500 border-orange-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
          >
            Fighters
          </button>
        </div>

        {/* Content */}
        {activeTab === 'challenges' && (
           <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              

              {/* Regular Challenges Grid */}
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {challenges.length === 0 ? (
                      <div className="col-span-full text-center py-20 text-zinc-500">
                          <Zap size={48} className="mx-auto mb-4 opacity-50" />
                          <h3 className="text-xl font-bold">No Challenges Active</h3>
                          <p>Check back later for new events!</p>
                      </div>
                    ) : (
                      challenges.map(challenge => (
                          <Link href={`/challenges/${challenge.id}`} key={challenge.id} className="group">
                            <div className="relative aspect-video bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-orange-500/50 transition-all cursor-pointer h-full shadow-lg group-hover:shadow-orange-900/10">
                                {challenge.imageUrl ? (
                                  <img src={challenge.imageUrl} alt={challenge.title} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                                ) : (
                                  <ChallengeFallbackCard challenge={challenge} />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                                

                            </div>
                          </Link>
                      ))
                    )}
                </div>
              </div>
           </div>
        )}

        {activeTab === 'community' && (
           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Search + Filters */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                 <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input 
                      value={cupSearch}
                      onChange={(e) => setCupSearch(e.target.value)}
                      placeholder="Search cup or player..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white focus:border-orange-500 outline-none"
                    />
                 </div>
                 <div className="flex items-center gap-2">
                    {(['all','1','2','3','4'] as const).map(opt => (
                      <button
                        key={opt}
                        onClick={() => setCupTeamFilter(opt)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border ${cupTeamFilter===opt ? 'bg-orange-900/20 border-orange-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                      >
                        {opt==='all' ? 'All' : `${opt}v${opt}`}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {userCups
                  .filter(cup => {
                     const matchesSearch = (cup.name || '').toLowerCase().includes(cupSearch.toLowerCase()) || (cup.profiles?.username || '').toLowerCase().includes(cupSearch.toLowerCase())
                     const size = Number(cup.config?.teamSize || 1)
                     const matchesTeam = cupTeamFilter === 'all' || String(size) === cupTeamFilter
                     return matchesSearch && matchesTeam
                  })
                  .map((cup) => (
                    <Link href={`/cups/${cup.id}`} key={cup.id} className="group relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-yellow-500/50 transition-all duration-300">
                        {/* Default image/banner */}
                        <div className="h-32 bg-gradient-to-br from-zinc-800 to-zinc-900 relative">
                           <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
                           <div className="absolute inset-0 flex items-center justify-center">
                              <Trophy size={40} className="text-zinc-700 opacity-60 group-hover:text-yellow-500 transition-colors" />
                           </div>
                           <div className="absolute bottom-4 left-4 right-4">
                              <h3 className="text-xl font-black text-white uppercase italic truncate">{cup.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                  <div className="w-5 h-5 rounded-full bg-zinc-700 overflow-hidden relative">
                                      {cup.profiles?.avatar_url ? (
                                          <img src={cup.profiles.avatar_url} alt={cup.profiles.username} className="w-full h-full object-cover" />
                                      ) : (
                                          <Users size={12} className="text-zinc-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                      )}
                                  </div>
                                  <span className="text-xs text-zinc-400">by {cup.profiles?.username || 'Unknown'}</span>
                              </div>
                           </div>
                        </div>

                        <div className="p-4 space-y-4">
                            <p className="text-sm text-zinc-400 line-clamp-2 min-h-[2.5rem]">
                                {cup.description || 'No description provided.'}
                            </p>
                            
                            <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-1 rounded bg-zinc-800 text-xs text-zinc-300 border border-zinc-700">
                                    {cup.config?.format === 'queue' ? 'Queue Mode' : 'Elimination'}
                                </span>
                                <span className="px-2 py-1 rounded bg-zinc-800 text-xs text-zinc-300 border border-zinc-700">
                                    {cup.config.teamSize}v{cup.config.teamSize}
                                </span>
                                <span className="px-2 py-1 rounded bg-zinc-800 text-xs text-zinc-300 border border-zinc-700">
                                    {cup.config.participantCriteria?.bracketSize || 8} Fighters
                                </span>
                            </div>

                            <button 
                                onClick={(e) => { e.preventDefault(); playCup(cup) }}
                                disabled={isPlayingCup}
                                className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black uppercase rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-yellow-500/20"
                            >
                                {isPlayingCup ? (
                                    <span className="animate-pulse">Loading...</span>
                                ) : (
                                    <>
                                        <Play size={18} /> Play Cup
                                    </>
                                )}
                            </button>
                        </div>
                    </Link>
                  ))
                }
                {userCups.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-500">
                        <Globe size={48} className="mb-4 opacity-50" />
                        <p className="text-lg">No community cups available yet.</p>
                    </div>
                )}
              </div>
           </div>
        )}

        {activeTab === 'fighters' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto mb-8 justify-end">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text"
                placeholder="Search fighters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 bg-zinc-900 border border-zinc-800 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <select 
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full sm:w-48 bg-zinc-900 border border-zinc-800 rounded-full py-2 pl-10 pr-8 text-sm focus:outline-none focus:border-orange-500 transition-colors appearance-none cursor-pointer"
              >
                <option value="all">All Franchises</option>
                {groups
                  .filter(g => {
                     // Filter groups in the dropdown based on the active tab
                     if (activeTab === 'fighters') {
                        return g.type === 'Platform' || g.type === 'Franchise' || !g.type
                     } else if (activeTab === 'community') {
                        return g.type === 'Community' || g.type === 'User'
                     }
                     return true
                  })
                  .map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredCharacters.length > 0 ? (
                  filteredCharacters.map(char => (
                    <Link href={`/explore/${char.id}`} key={char.id} className="group">
                      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-orange-500/50 hover:shadow-[0_0_30px_rgba(234,88,12,0.15)] transition-all h-full flex flex-col">
                        {/* Image */}
                        <div className="aspect-square relative overflow-hidden bg-black">
                          {char.stages[0]?.thumbnail && char.stages[0]?.thumbnail.trim() !== "" ? (
                            <img 
                              src={char.stages[0].thumbnail} 
                              alt={char.name} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : char.stages[0]?.image && char.stages[0]?.image.trim() !== "" ? (
                            <img 
                              src={char.stages[0].image} 
                              alt={char.name} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-700 font-bold">NO IMAGE</div>
                          )}
                        </div>
                        {/* Info */}
                        <div className="p-4 flex flex-col flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-black italic text-white leading-tight group-hover:text-orange-500 transition-colors">
                              {char.name}
                            </h3>
                            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                              {char.stages[0]?.combat.mainSkill?.name || 'Skill'}
                            </span>
                          </div>
                          
                          <div className="mt-auto pt-4 border-t border-zinc-800/50 flex items-center justify-between text-xs text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Shield size={12} /> {getGroupName(char.groupId, groups)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Zap size={12} /> {getFighterPWR(char)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-500">
                    <Users size={48} className="mb-4 opacity-50" />
                    <p className="text-lg font-medium">No fighters found in this category.</p>
                  </div>
                )}
              </div>
              {fightersHasMore && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={loadMoreFighters}
                    disabled={isLoadingMoreFighters}
                    className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm font-bold text-zinc-200 hover:border-orange-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoadingMoreFighters ? 'Loading more...' : 'Load more fighters'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        )}

      </main>
    </div>
  )
}

function getGroupName(id: string, groups: Group[]) {
  const g = groups.find(x => x.id === id)
  return g ? g.name : 'Unknown'
}

function getFighterPWR(char: Character) {
  return getCharacterPWR(char)
}
