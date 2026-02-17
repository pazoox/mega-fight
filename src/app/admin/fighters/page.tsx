'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Character, Group } from '@/types'
import { Plus, Search, Filter, Edit2, Trash2 } from 'lucide-react'

export default function FightersPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [backfilledIds, setBackfilledIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)

  const PAGE_SIZE = 50
  const UI_PAGE_SIZE = 21

  useEffect(() => {
    const loadInitial = async () => {
      try {
        setIsLoading(true)
        const [charsRes, groupsRes] = await Promise.all([
          fetch(`/api/characters?limit=${PAGE_SIZE}&offset=0`),
          fetch('/api/groups')
        ])

        const charsData = await charsRes.json()
        const groupsData = await groupsRes.json()

        setCharacters(Array.isArray(charsData) ? charsData : [])
        setGroups(Array.isArray(groupsData) ? groupsData : [])
        setHasMore(Array.isArray(charsData) && charsData.length === PAGE_SIZE)
        setPage(1)
      } catch (error) {
        console.error('Failed to load fighters or groups', error)
        setCharacters([])
        setGroups([])
        setHasMore(false)
      } finally {
        setIsLoading(false)
      }
    }

    loadInitial()
  }, [])

  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return

    try {
      setIsLoadingMore(true)
      const offset = page * PAGE_SIZE
      const res = await fetch(`/api/characters?limit=${PAGE_SIZE}&offset=${offset}`)
      const data = await res.json()

      if (Array.isArray(data) && data.length > 0) {
        setCharacters(prev => [...prev, ...data])
        setHasMore(data.length === PAGE_SIZE)
        setPage(prev => prev + 1)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('Failed to load more fighters', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    const createThumb = (imageUrl: string) => {
      return new Promise<string>((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = imageUrl
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            const size = 256
            canvas.width = size
            canvas.height = size
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.drawImage(img, 0, 0, size, size)
              const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
              resolve(dataUrl)
              return
            }
          } catch {}
          resolve(imageUrl)
        }
        img.onerror = () => resolve(imageUrl)
      })
    }

    const backfill = async () => {
      if (isLoading) return
      const candidates = characters.filter(c => {
        const s = c.stages?.[0]
        return s && !s.thumbnail && s.image && !backfilledIds.has(c.id)
      }).slice(0, 10)

      for (const c of candidates) {
        const s0 = c.stages[0]
        const thumb = await createThumb(s0.image)
        try {
          const res = await fetch('/api/characters', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: c.id,
              stages: [{ ...s0, thumbnail: thumb }, ...c.stages.slice(1)]
            })
          })
          if (res.ok) {
            setCharacters(prev => prev.map(x => x.id === c.id ? ({ ...x, stages: [{ ...s0, thumbnail: thumb }, ...c.stages.slice(1)] }) : x))
            setBackfilledIds(prev => new Set(prev).add(c.id))
          }
        } catch {}
      }
    }

    backfill()
  }, [isLoading, characters])

  const filteredCharacters = characters.filter(char => {
    const matchesSearch = char.name.toLowerCase().includes(search.toLowerCase())
    const matchesGroup = selectedGroup ? char.groupId === selectedGroup : true
    return matchesSearch && matchesGroup
  })

  const totalPages = Math.max(1, Math.ceil(filteredCharacters.length / UI_PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * UI_PAGE_SIZE
  const endIndex = startIndex + UI_PAGE_SIZE
  const paginatedCharacters = filteredCharacters.slice(startIndex, endIndex)

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this fighter?')) return

    try {
      const res = await fetch(`/api/characters?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setCharacters(prev => prev.filter(c => c.id !== id))
      } else {
        alert('Failed to delete fighter')
      }
    } catch (error) {
      console.error('Failed to delete fighter', error)
    }
  }

  React.useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedGroup])

  // Rank Helpers (Duplicated to avoid complex imports if not shared)
  const calculateRank = (total: number) => {
    if (total < 2000) return 'C'
    if (total < 4000) return 'C+'
    if (total < 6000) return 'B'
    if (total < 8000) return 'B+'
    if (total < 10000) return 'A'
    if (total < 15000) return 'S'
    return 'S+'
  }

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'S+': return '#FFD700'
      case 'S': return '#FFD700'
      case 'A': return '#ff4d4d'
      case 'B+': return '#3b82f6'
      case 'B': return '#3b82f6'
      case 'C+': return '#22c55e'
      case 'C': return '#22c55e'
      default: return '#71717a'
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 pb-32">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white mb-2">
            FIGHTER <span className="text-orange-500">MANAGEMENT</span>
          </h1>
          <p className="text-zinc-500 text-sm">Manage all combatants registered in the tournament.</p>
        </div>
        <Link 
          href="/admin/characters/new"
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-bold transition-colors"
        >
          <Plus size={18} />
          <span>New Fighter</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            placeholder="Search fighter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-white focus:border-orange-500 outline-none transition-colors placeholder-zinc-600"
          />
        </div>
        <div className="w-full md:w-64 relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-white focus:border-orange-500 outline-none transition-colors appearance-none"
          >
            <option value="">All Groups</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
          {paginatedCharacters.map(char => {
            const groupName = groups.find(g => g.id === char.groupId)?.name || 'Unknown'
            
            // Find strongest stage for display
            const strongestStage = char.stages.reduce((prev, current) => {
                const prevTotal = Object.values(prev.stats).reduce((a, b) => (typeof b === 'number' ? a + b : a), 0) as number
                const currTotal = Object.values(current.stats).reduce((a, b) => (typeof b === 'number' ? a + b : a), 0) as number
                return currTotal > prevTotal ? current : prev
            }, char.stages[0])

            const mainImage = strongestStage?.thumbnail || strongestStage?.image || char.stages[0]?.thumbnail || char.stages[0]?.image
            
            // Calculate Rank
            const totalStats = Object.values(strongestStage.stats).reduce((sum, val) => 
                typeof val === 'number' ? sum + val : sum, 0) as number
            const rank = calculateRank(totalStats)
            const rankColor = getRankColor(rank)

            return (
              <Link key={char.id} href={`/admin/characters/${char.id}`} className="block h-full">
              <div className="bg-zinc-900/30 rounded-xl border border-zinc-800 overflow-hidden group hover:border-orange-500/50 transition-all hover:shadow-xl hover:shadow-orange-900/10 flex flex-col h-full cursor-pointer relative">
                
                {/* Delete Button */}
                <button 
                  onClick={(e) => handleDelete(e, char.id)}
                  className="absolute top-2 right-2 z-20 bg-black/60 hover:bg-red-600 p-2 rounded-lg backdrop-blur-sm border border-white/10 text-white transition-all opacity-0 group-hover:opacity-100 transform translate-y-[-10px] group-hover:translate-y-0"
                >
                  <Trash2 size={16} />
                </button>
                
                <div className="aspect-square bg-zinc-950 relative overflow-hidden">
                  {mainImage ? (
                    <img src={mainImage} alt={char.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">No Image</div>
                  )}
                  
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                  <div className="absolute bottom-0 left-0 w-full p-2">
                    <h3 className="text-sm font-bold text-white leading-tight group-hover:text-orange-400 transition-colors truncate">{char.name}</h3>
                    <p className="text-zinc-400 text-[9px] font-medium uppercase tracking-wider mt-0.5 truncate">{groupName}</p>
                  </div>
                </div>
                
                <div className="p-2 bg-zinc-900/50 border-t border-zinc-800 grid grid-cols-2 gap-1 text-[9px]">
                  <div className="bg-zinc-950/50 p-1 rounded text-center border border-zinc-800/50">
                    <span className="block text-zinc-500 uppercase text-[9px] tracking-wider mb-0.5">Race</span>
                    <span className="text-zinc-300 font-medium truncate px-1">{char.specs.race}</span>
                  </div>
                  <div className="bg-zinc-950/50 p-1 rounded text-center border border-zinc-800/50">
                    <span className="block text-zinc-500 uppercase text-[9px] tracking-wider mb-0.5">Modes</span>
                    <span className="text-zinc-300 font-medium">{char.stages.length} Forms</span>
                  </div>
                  <div className="bg-zinc-950/50 p-1 rounded text-center border border-zinc-800/50">
                    <span className="block text-zinc-500 uppercase text-[9px] tracking-wider mb-0.5">Power</span>
                    <span className="text-orange-400 font-bold">{totalStats}</span>
                  </div>
                  <div className="bg-zinc-950/50 p-1 rounded text-center border border-zinc-800/50 relative overflow-hidden">
                    <span className="block text-zinc-500 uppercase text-[9px] tracking-wider mb-0.5">Rank</span>
                    <span className="font-black text-sm relative z-10" style={{ color: rankColor }}>{rank}</span>
                    <div className="absolute inset-0 opacity-10" style={{ backgroundColor: rankColor }}></div>
                  </div>
                </div>
              </div>
              </Link>
            )
          })}
        </div>
        {filteredCharacters.length > 0 && (
          <div className="flex items-center justify-between mt-4 text-xs text-zinc-400">
            <span>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredCharacters.length)} of {filteredCharacters.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-[11px] font-bold text-zinc-300 hover:border-orange-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-zinc-500">
                Page {safePage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-[11px] font-bold text-zinc-300 hover:border-orange-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
        {hasMore && (
          <div className="flex justify-center mt-8">
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm font-bold text-zinc-200 hover:border-orange-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoadingMore ? 'Loading more...' : 'Load more fighters'}
            </button>
          </div>
        )}
        </>
      )}
    </div>
  )
}
