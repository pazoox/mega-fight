import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trophy, Swords, Zap, Activity, Info } from 'lucide-react'
import { DESCRIPTIONS, TIER_RANGES } from '@/utils/statTiers'

interface GameRulesModalProps {
  isOpen: boolean
  onClose: () => void
}

export function GameRulesModal({ isOpen, onClose }: GameRulesModalProps) {
  const [selectedStat, setSelectedStat] = useState('str')

  if (!isOpen) return null

  const stats = [
    { id: 'hp', label: 'HP' },
    { id: 'str', label: 'STR' },
    { id: 'def', label: 'DEF' },
    { id: 'sta', label: 'STA' },
    { id: 'sp_atk', label: 'SP.ATK' },
    { id: 'int', label: 'INT' },
    { id: 'spd', label: 'SPD' },
    { id: 'atk_spd', label: 'ATK.SPD' },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-4xl max-h-[85vh] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-900/30 rounded-lg border border-red-500/20">
                  <Info className="text-red-500" size={24} />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-wide">GAME INFO & RULES</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              
              {/* How to Play */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-xl font-bold text-zinc-200">
                  <Swords className="text-orange-500" />
                  <h3>How to Play</h3>
                </div>
                <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50 space-y-3 text-zinc-400 text-sm leading-relaxed">
                  <p>
                    <strong className="text-zinc-200">Mega Fight</strong> is a strategic RPG Battler where characters from various universes compete for dominance.
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong className="text-white">Hybrid Victory System:</strong> The winner is determined by YOU (the Vote). However, the <span className="text-blue-400">Simulation</span> runs in real-time to inform your decision.
                    </li>
                    <li>
                      <strong className="text-white">Live Stats:</strong> Watch as the battle progresses. Arena modifiers, environmental effects, and character stats update dynamically.
                    </li>
                    <li>
                      <strong className="text-white">Fair Play:</strong> In Power Scale mode, characters are tiered to ensure balanced matchups, but strategy and environment play a huge role.
                    </li>
                  </ul>
                </div>
              </section>

              {/* Buffs & Debuffs */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-xl font-bold text-zinc-200">
                  <Zap className="text-yellow-500" />
                  <h3>Buffs & Debuffs Mechanics</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
                    <h4 className="text-green-400 font-bold mb-2 flex items-center gap-2">
                      <span className="text-lg">▲</span> Buffs (Advantages)
                    </h4>
                    <p className="text-zinc-400 text-sm">
                      Characters gain stats when they have an affinity with the current Arena. 
                      <br/>
                      <span className="text-xs text-zinc-500 mt-2 block">Example: A <span className="text-zinc-300">Fire</span> character in a <span className="text-zinc-300">Volcano</span> arena gets a significant stat boost.</span>
                    </p>
                  </div>
                  <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
                    <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                      <span className="text-lg">▼</span> Nerfs (Disadvantages)
                    </h4>
                    <p className="text-zinc-400 text-sm">
                      Characters lose stats when the environment opposes their nature.
                      <br/>
                      <span className="text-xs text-zinc-500 mt-2 block">Example: A <span className="text-zinc-300">Large</span> character in a <span className="text-zinc-300">Tiny Room</span> suffers penalties to Speed and Dexterity.</span>
                    </p>
                  </div>
                </div>
              </section>

              {/* Power Scale */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-xl font-bold text-zinc-200">
                  <Activity className="text-purple-500" />
                  <h3>Power Scale Tiers</h3>
                </div>
                
                {/* Stat Slicer (Tabs) */}
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {stats.map((stat) => (
                    <button
                      key={stat.id}
                      onClick={() => setSelectedStat(stat.id)}
                      className={`
                        px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border
                        ${selectedStat === stat.id 
                          ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_10px_rgba(147,51,234,0.5)]' 
                          : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700'}
                      `}
                    >
                      {stat.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  {TIER_RANGES.map((tier, index) => {
                    // Fallback to generic description if stat not found
                    const statDesc = DESCRIPTIONS[selectedStat] || DESCRIPTIONS['hp'];
                    const description = statDesc[index] || statDesc[statDesc.length - 1];

                    return (
                      <div key={tier.label} className={`flex flex-col md:flex-row md:items-center p-3 rounded-lg bg-zinc-900 border ${tier.border}`}>
                        <div className="flex items-center gap-3 mb-2 md:mb-0 md:w-48">
                          <div className={`font-bold ${tier.color}`}>{tier.label}</div>
                          <div className="px-2 py-0.5 rounded bg-zinc-950 text-xs font-mono text-zinc-500 border border-zinc-800">
                             Max: {tier.max === Infinity ? '∞' : tier.max}
                          </div>
                        </div>
                        <div className="flex-1 text-zinc-300 text-sm pl-0 md:pl-4 border-l-0 md:border-l border-zinc-800">
                          {description}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* Ranking System */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-xl font-bold text-zinc-200">
                  <Trophy className="text-yellow-400" />
                  <h3>Ranking System</h3>
                </div>
                <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
                  <p className="text-zinc-400 text-sm mb-4">
                    A character's Rank is determined by their <strong className="text-zinc-200">Total Stats</strong> (Sum of all 8 attributes). 
                    Maximum possible total is <strong className="text-white">16,000</strong>.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {[
                      { rank: 'S+', score: '15,000+', color: 'text-yellow-300 bg-yellow-900/40 border-yellow-400/50' },
                      { rank: 'S', score: '10,000 - 14,999', color: 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30' },
                      { rank: 'A', score: '8,000 - 9,999', color: 'text-red-400 bg-red-900/20 border-red-500/30' },
                      { rank: 'B+', score: '6,000 - 7,999', color: 'text-blue-300 bg-blue-900/40 border-blue-400/50' },
                      { rank: 'B', score: '4,000 - 5,999', color: 'text-blue-400 bg-blue-900/20 border-blue-500/30' },
                      { rank: 'C+', score: '2,000 - 3,999', color: 'text-green-300 bg-green-900/40 border-green-400/50' },
                      { rank: 'C', score: '< 2,000', color: 'text-green-400 bg-green-900/20 border-green-500/30' },
                    ].map((r) => (
                      <div key={r.rank} className={`flex flex-col items-center p-3 rounded-lg border ${r.color}`}>
                        <span className="text-xl font-black mb-1">{r.rank}</span>
                        <span className="text-[10px] font-mono opacity-80 whitespace-nowrap">{r.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
