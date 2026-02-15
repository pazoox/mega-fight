import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Activity, BarChart2 } from 'lucide-react'
import { BattleSimulation } from './BattleSimulation'
import { CharacterStats } from '@/types'
import { ArenaModifiers } from '@/utils/fightUtils'

interface BattleSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  p1Name: string;
  p2Name: string;
  p1Stats: CharacterStats | null;
  p2Stats: CharacterStats | null;
  p1Modifiers?: ArenaModifiers;
  p2Modifiers?: ArenaModifiers;
  compact?: boolean;
  maxStatValue?: number;
}

export function BattleSimulationModal({ 
  isOpen, 
  onClose, 
  p1Name, 
  p2Name, 
  p1Stats, 
  p2Stats,
  p1Modifiers,
  p2Modifiers,
  compact = false,
  maxStatValue = 1200
}: BattleSimulationModalProps) {
  if (!isOpen) return null

  const hasStats = p1Stats && p2Stats

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
            className="relative w-full max-w-6xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-900/30 rounded-lg border border-blue-500/20">
                  <Activity className="text-blue-500" size={24} />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-wide">BATTLE SIMULATION</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar">
              {hasStats ? (
                <BattleSimulation 
                  p1Name={p1Name}
                  p2Name={p2Name}
                  p1Stats={p1Stats}
                  p2Stats={p2Stats}
                  p1Modifiers={p1Modifiers}
                  p2Modifiers={p2Modifiers}
                  compact={compact}
                  maxStatValue={maxStatValue}
                />
              ) : (
                <div className="text-center text-zinc-500 py-12">
                  Waiting for battle data...
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
