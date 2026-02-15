'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Character, Group } from '@/types'
import FighterTechnicalSheet from '@/components/FighterTechnicalSheet'
import { Navbar } from '@/components/Navbar'

export default function FighterDetailsPage() {
  const params = useParams()
  const characterId = params.id as string

  const [character, setCharacter] = useState<Character | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!characterId) return

    Promise.all([
      fetch(`/api/characters?id=${characterId}`).then(res => res.json()),
      fetch('/api/groups').then(res => res.json())
    ]).then(([charData, groupsData]) => {
      // API might return array or object depending on implementation, handle both
      const foundChar = Array.isArray(charData) 
        ? charData.find((c: any) => c.id === characterId) 
        : charData

      if (foundChar) {
          // Normalize tags to arrays to prevent crashes in display
          foundChar.stages = foundChar.stages.map((s: any) => ({
              ...s,
              tags: {
                  ...s.tags,
                  combatClass: Array.isArray(s.tags.combatClass) ? s.tags.combatClass : [s.tags.combatClass].filter(Boolean),
                  movement: Array.isArray(s.tags.movement) ? s.tags.movement : [s.tags.movement].filter(Boolean),
                  source: Array.isArray(s.tags.source) ? s.tags.source : [s.tags.source].filter(Boolean),
                  element: Array.isArray(s.tags.element) ? s.tags.element : [s.tags.element].filter(Boolean),
              },
              combat: {
                  ...s.combat,
                  mainSkill: typeof s.combat.mainSkill === 'string' 
                      ? { name: s.combat.mainSkill, description: '', tags: [] }
                      : (s.combat.mainSkill 
                          ? { ...s.combat.mainSkill, tags: s.combat.mainSkill.tags || [] } 
                          : { name: '', description: '', tags: [] }),
                  secondarySkill: typeof s.combat.secondarySkill === 'string'
                      ? { name: s.combat.secondarySkill, description: '', tags: [] }
                      : (s.combat.secondarySkill 
                          ? { ...s.combat.secondarySkill, tags: s.combat.secondarySkill.tags || [] } 
                          : { name: '', description: '', tags: [] })
              }
          }))
      }

      setCharacter(foundChar)
      setGroups(groupsData)
      setLoading(false)
    }).catch(err => {
      console.error("Failed to fetch fighter data:", err)
      setLoading(false)
    })
  }, [characterId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col">
        <Navbar active="explore" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </div>
    )
  }

  if (!character) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col">
        <Navbar active="explore" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <h1 className="text-4xl font-black italic text-zinc-700 uppercase">Fighter Not Found</h1>
          <p className="text-zinc-500">The requested fighter data could not be retrieved.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar active="explore" />
      <FighterTechnicalSheet character={character} groups={groups} />
    </div>
  )
}
