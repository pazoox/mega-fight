 'use client'
 
 import React, { useEffect, useState } from 'react'
 import { useParams, useRouter } from 'next/navigation'
 import { Navbar } from '@/components/Navbar'
 import { useAuth } from '@/context/AuthContext'
 import { usePlayCup } from '@/hooks/usePlayCup'
import { Trophy, Users, ArrowLeft, Play, Loader2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
 
 type Cup = any
 
 export default function CupDetailsPage() {
   const params = useParams()
   const router = useRouter()
  const { user, session } = useAuth()
  const { playCup, isLoading: isPlaying } = usePlayCup()
 
   const [cup, setCup] = useState<Cup | null>(null)
   const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState<Array<{ id: string, content: string, user_id: string, created_at: string, profiles?: any }>>([])
  const [newComment, setNewComment] = useState('')
  const [savingComment, setSavingComment] = useState(false)
 
   useEffect(() => {
     const id = params.id as string
     if (!id) return
     ;(async () => {
       try {
         const res = await fetch(`/api/user/cups?id=${id}`)
         const data = await res.json()
         const found = Array.isArray(data) ? data[0] : data
         setCup(found || null)
 
         // Fetch comments for this cup
         const cres = await fetch(`/api/cups/comments?cupId=${id}`)
         if (cres.ok) {
           const cdata = await cres.json()
           setComments(Array.isArray(cdata) ? cdata : [])
         }
       } catch (e) {
         console.error('Failed to load cup', e)
       } finally {
         setLoading(false)
       }
     })()
   }, [params.id])
 
   const submitComment = async () => {
     if (!newComment.trim() || !cup?.id) return
    if (!session?.access_token) {
      toast.error('Faça login para comentar')
      return
    }
     setSavingComment(true)
     try {
       const res = await fetch('/api/cups/comments', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${session.access_token}`
         },
         body: JSON.stringify({ cupId: cup.id, content: newComment })
       })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to post comment')
       setNewComment('')
       // Prepend for instant feedback
      setComments(prev => [{ ...data }, ...prev])
      toast.success('Comentário publicado')
     } catch (e: any) {
      toast.error(e.message || 'Falha ao postar comentário')
     } finally {
       setSavingComment(false)
     }
   }
 
   if (loading) {
     return (
       <div className="min-h-screen bg-[#050505] text-white">
         <Navbar active="explore" />
         <main className="pt-24 px-6 max-w-6xl mx-auto">
           <div className="flex items-center gap-2 text-zinc-500">
             <Loader2 className="animate-spin" /> Loading...
           </div>
         </main>
       </div>
     )
   }
 
   if (!cup) {
     return (
       <div className="min-h-screen bg-[#050505] text-white">
         <Navbar active="explore" />
         <main className="pt-24 px-6 max-w-6xl mx-auto">
           <button onClick={() => router.back()} className="text-zinc-500 hover:text-white flex items-center gap-2 mb-6">
             <ArrowLeft size={18} /> Back
           </button>
           <div className="text-zinc-400">Cup not found</div>
         </main>
       </div>
     )
   }
 
   return (
     <div className="min-h-screen bg-[#050505] text-white">
       <Navbar active="explore" />
       <main className="pt-24 pb-24 px-6 max-w-6xl mx-auto">
         <button onClick={() => router.back()} className="text-zinc-500 hover:text-white flex items-center gap-2 mb-6">
           <ArrowLeft size={18} /> Back
         </button>
 
        <div className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-black">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
          <div className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-yellow-500/10 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
          
          <div className="flex items-center gap-6 p-8">
            <div className="hidden md:flex w-28 h-28 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 items-center justify-center shadow-[0_0_40px_-10px_rgba(234,179,8,0.35)]">
              <Trophy size={56} className="text-yellow-500" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tight">{cup.name}</h1>
              <div className="mt-3 flex items-center gap-3 text-sm text-zinc-400">
                <span className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-zinc-700 overflow-hidden relative">
                    {cup.profiles?.avatar_url ? (
                      <img src={cup.profiles.avatar_url} alt={cup.profiles?.username} className="w-full h-full object-cover" />
                    ) : (
                      <Users size={14} className="text-zinc-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  <span>by {cup.profiles?.username || 'Unknown'}</span>
                </span>
                <span className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700">
                  {cup.config?.format === 'queue' ? 'Queue Mode' : 'Elimination'}
                </span>
                <span className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700">
                  {cup.config?.teamSize}v{cup.config?.teamSize}
                </span>
                <span className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700">
                  {cup.config?.participantCriteria?.bracketSize} Fighters
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3 items-end">
              <button 
                onClick={() => playCup(cup)}
                disabled={isPlaying}
                className="px-6 h-11 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black uppercase rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-yellow-500/20"
              >
                {isPlaying ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
                Play Cup
              </button>
            </div>
          </div>
        </div>
 
        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-black italic uppercase text-zinc-300 mb-2">Description</h2>
          <p className="text-zinc-400 text-sm">
            {cup.description || 'No description provided.'}
          </p>
        </div>
 
         {/* Config & Rules */}
         <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <span className="text-xs font-bold text-zinc-500 block mb-2">FORMAT</span>
              <div className="text-white font-bold">{cup.config?.format === 'queue' ? 'Queue Mode' : 'Elimination'}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <span className="text-xs font-bold text-zinc-500 block mb-2">TEAM SIZE</span>
              <div className="text-white font-bold">{cup.config?.teamSize}v{cup.config?.teamSize}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <span className="text-xs font-bold text-zinc-500 block mb-2">BRACKET</span>
              <div className="text-white font-bold">{cup.config?.participantCriteria?.bracketSize} Fighters</div>
            </div>
         </div>
 
         {/* Comments */}
         <div className="mt-12">
            <h2 className="text-xl font-black italic uppercase text-zinc-300 mb-4 flex items-center gap-2"><MessageSquare size={18}/> Comments</h2>
            
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-orange-500 outline-none"
              />
              <div className="flex justify-end mt-3">
                <button 
                  onClick={submitComment}
                  disabled={savingComment || !newComment.trim()}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingComment ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
 
            <div className="mt-6 space-y-4">
              {comments.length === 0 ? (
                <div className="text-zinc-500">No comments yet.</div>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden relative shrink-0">
                      {c.profiles?.avatar_url ? (
                        <img src={c.profiles.avatar_url} alt={c.profiles?.username} className="w-full h-full object-cover" />
                      ) : (
                        <Users size={16} className="text-zinc-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm text-zinc-300">{c.profiles?.username || 'User'}</div>
                      <div className="text-sm text-zinc-400">{c.content}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
         </div>
       </main>
     </div>
   )
 }
