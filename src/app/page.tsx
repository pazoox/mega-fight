'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CharacterCard } from '@/components/CharacterCard'
import { Navbar } from '@/components/Navbar'
import { Swords, Trophy, Users, Zap, ArrowRight, Shield } from 'lucide-react'
import { VsBadge } from '@/app/fight/solo/components'

import { Character } from '@/types'

export default function LandingPage() {
  const [fighters, setFighters] = React.useState<[Character | null, Character | null]>([null, null])

  React.useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/characters?limit=50')
        const ct = res.headers.get('content-type') || ''
        if (!res.ok || !ct.includes('application/json')) return
        const data = (await res.json()) as Character[]
        if (Array.isArray(data) && data.length >= 2) {
          const shuffled = [...data].sort(() => 0.5 - Math.random())
          setFighters([shuffled[0], shuffled[1]])
        }
      } catch {}
    }
    run()
  }, [])

  const p1 = fighters[0]
  const p2 = fighters[1]

  return (
    <div className="min-h-screen bg-[#050505] text-white w-[100vw] overflow-x-hidden relative">
      
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-48 md:pt-48 md:pb-64 flex flex-col items-center justify-center min-h-screen overflow-visible">
        
        {/* Ambient Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black pointer-events-none" />
        
        {/* Main Title */}
        <div className="z-10 text-center mb-16 relative">
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8 }}
          >
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-200 to-zinc-600 italic uppercase drop-shadow-2xl mb-4 py-4 pr-4 leading-tight">
              Where Legends <br/> Collide
            </h1>
            <p className="text-zinc-400 font-mono text-sm md:text-base tracking-[0.3em] uppercase max-w-2xl mx-auto">
              The Ultimate RPG Battle Simulator. Create Matches. Debate Outcomes. Dominate the Arena.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex gap-4 justify-center mt-8"
          >
            <Link href="/fight">
              <button className="px-8 py-4 rounded-full bg-orange-600 text-white font-black tracking-wide hover:bg-orange-500 hover:scale-105 transition-all shadow-[0_0_30px_rgba(234,88,12,0.4)] flex items-center gap-2">
                <Swords size={20} />
                START BATTLE
              </button>
            </Link>
            <Link href="/explore?tab=fighters">
              <button className="px-8 py-4 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold tracking-wide hover:bg-zinc-800 transition-colors flex items-center gap-2">
                <Users size={20} />
                BROWSE FIGHTERS
              </button>
            </Link>
          </motion.div>
        </div>

        {/* Visual Duel Display */}
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-16 scale-75 md:scale-90 lg:scale-100">
          
          {/* Player 1 */}
          {p1 && (
            <div className="relative group perspective-1000">
              <div className="absolute -inset-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <CharacterCard character={p1} stageIndex={1} /> 
            </div>
          )}

          {/* VS Badge */}
          <div className="flex flex-col items-center justify-center">
            <VsBadge compact />
          </div>

          {/* Player 2 */}
          {p2 && (
            <div className="relative group perspective-1000">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <CharacterCard character={p2} stageIndex={0} />
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black py-12 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-zinc-500 text-sm font-mono">
            &copy; 2024 MEGA FIGHT PROTOCOL. ALL RIGHTS RESERVED.
          </div>
          <div className="flex gap-6">
             <Link href="#" className="text-zinc-500 hover:text-white transition-colors">Privacy</Link>
             <Link href="#" className="text-zinc-500 hover:text-white transition-colors">Terms</Link>
             <Link href="#" className="text-zinc-500 hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
