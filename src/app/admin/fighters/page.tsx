'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Character, Group } from '@/types'
import { Plus, Trash2 } from 'lucide-react'

export default function FightersPage() {
  const [recentCharacters, setRecentCharacters] = useState<Character[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPaging, setIsPaging] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [backfilledIds, setBackfilledIds] = useState<Set<string>>(new Set())

  const PAGE_SIZE = 7

  useEffect(() => {
    const loadInitial = async () => {
      try {
        setIsLoading(true)
        const [charsRes, groupsRes] = await Promise.all([
          fetch(`/api/characters?limit=${PAGE_SIZE}&offset=0&mode=list`),
          fetch('/api/groups')
        ])

        const charsData = await charsRes.json()
        const groupsData = await groupsRes.json()

        setRecentCharacters(Array.isArray(charsData) ? charsData : [])
        setGroups(Array.isArray(groupsData) ? groupsData : [])
        setHasMore(Array.isArray(charsData) && charsData.length === PAGE_SIZE)
        setPage(0)
      } catch (error) {
        console.error('Failed to load fighters or groups', error)
        setRecentCharacters([])
        setGroups([])
        setHasMore(false)
      } finally {
        setIsLoading(false)
      }
    }

    loadInitial()
  }, [])

  const loadPage = async (targetPage: number) => {
    if (targetPage < 0) return
    if (isPaging) return

    try {
      setIsPaging(true)
      const offset = targetPage * PAGE_SIZE
      const res = await fetch(`/api/characters?limit=${PAGE_SIZE}&offset=${offset}&mode=list`)
      const data = await res.json()
      const list = Array.isArray(data) ? data : []

      setRecentCharacters(list)
      setHasMore(list.length === PAGE_SIZE)
      setPage(targetPage)
    } catch (error) {
      console.error('Failed to load fighters page', error)
    } finally {
      setIsPaging(false)
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
      const candidates = recentCharacters.filter(c => {
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
            setRecentCharacters(prev => prev.map(x => x.id === c.id ? ({ ...x, stages: [{ ...s0, thumbnail: thumb }, ...c.stages.slice(1)] }) : x))
            setBackfilledIds(prev => new Set(prev).add(c.id))
          }
        } catch {}
      }
    }

    backfill()
  }, [isLoading, recentCharacters])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this fighter?')) return

    try {
      const res = await fetch(`/api/characters?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setRecentCharacters(prev => prev.filter(c => c.id !== id))
      } else {
        alert('Failed to delete fighter')
      }
    } catch (error) {
      console.error('Failed to delete fighter', error)
    }
  }

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

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold tracking-wider uppercase text-zinc-400">Last Modified</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadPage(Math.max(0, page - 1))}
              disabled={isPaging || page === 0}
              className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-[11px] font-bold text-zinc-300 hover:border-orange-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => loadPage(page + 1)}
              disabled={isPaging || !hasMore}
              className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-[11px] font-bold text-zinc-300 hover:border-orange-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
            {recentCharacters.map(char => {
              const groupName = groups.find(g => g.id === char.groupId)?.name || 'Unknown'
              const firstStage = char.stages[0]
              const mainImage = firstStage?.thumbnail || firstStage?.image || ''
              const totalStats = Object.values(firstStage?.stats || {}).reduce((sum, val) => 
                typeof val === 'number' ? sum + val : sum, 0) as number
              const rank = calculateRank(totalStats)
              const rankColor = getRankColor(rank)
              return (
                <Link key={char.id} href={`/admin/characters/${char.id}`} className="block h-full">
                  <div className="bg-zinc-900/30 rounded-xl border border-zinc-800 overflow-hidden group hover:border-orange-500/50 transition-all hover:shadow-xl hover:shadow-orange-900/10 flex flex-col h-full cursor-pointer relative">
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
                      <div className="absolute bottom-0 left-0 w-full p-2">
                        <h3 className="text-sm font-bold text-white leading-tight group-hover:text-orange-400 transition-colors truncate">{char.name}</h3>
                        <p className="text-zinc-400 text-[9px] font-medium uppercase tracking-wider mt-0.5 truncate">{groupName}</p>
                      </div>
                    </div>
                    <div className="p-2 bg-zinc-900/50 border-t border-zinc-800 grid grid-cols-2 gap-1 text-[9px]">
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
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-bold tracking-wider uppercase text-zinc-400 mb-3">Groups</h2>
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {groups.map(g => (
              <Link key={g.id} href={`/admin/fighters/group/${g.id}`} className="block">
                <div className="bg-zinc-900/30 rounded-xl border border-zinc-800 hover:border-orange-500/50 transition-all p-4 h-[120px] flex items-center justify-center">
                  <span className="text-zinc-300 font-bold uppercase tracking-wider">{g.name}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
