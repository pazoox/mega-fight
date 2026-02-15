'use client'

import React, { useState, useEffect } from 'react'
import ArenaForm from '@/components/admin/ArenaForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Arena } from '@/types'
import { useParams } from 'next/navigation'

export default function EditArenaPage() {
  const params = useParams()
  const [arena, setArena] = useState<Arena | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchArena(params.id as string)
    }
  }, [params.id])

  const fetchArena = async (id: string) => {
    try {
      const res = await fetch(`/api/arenas/${id}`) // Note: API might not support single fetch yet, assuming it does or we filter client side
      // If API doesn't support /id, we might need to fetch all and find. 
      // But typically we should implement GET /api/arenas/[id]
      
      if (res.ok) {
        const data = await res.json()
        setArena(data)
      } else {
        // Fallback: Fetch all and find (if API structure is simple JSON file)
        const allRes = await fetch('/api/arenas')
        const allData = await allRes.json()
        const found = allData.find((a: Arena) => a.id === id)
        if (found) setArena(found)
      }
    } catch (error) {
      console.error('Failed to fetch arena', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="text-white">Loading...</div>
  }

  if (!arena) {
    return <div className="text-white">Arena not found</div>
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 pb-32">
      <ArenaForm initialData={arena} />
    </div>
  )
}
