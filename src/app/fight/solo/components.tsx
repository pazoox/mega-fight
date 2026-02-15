
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Team, Match, BattleSession } from '@/lib/tournament'
import { CharacterCard } from '@/components/CharacterCard'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Trophy, Swords, Shield, Zap, Heart, Brain, Wind, RotateCcw } from 'lucide-react'

// --- Champion Bracket Animation ---

export function ChampionBracketView({ tournament, onComplete }: { tournament: BattleSession, onComplete: () => void }) {
  const champion = tournament.champion!
  const history = tournament.history
  
  // Group matches by round
  // Round 0: Initial, Round 1: Semis, etc.
  const rounds: Record<number, Match[]> = {}
  history.forEach(m => {
    if (!rounds[m.round]) rounds[m.round] = []
    rounds[m.round].push(m)
  })

  // Sort rounds and slice to keep only the last 3 (Quarters -> Semis -> Final)
  // This prevents UI bugs when there are too many rounds (e.g. Round of 32)
  let roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b)
  if (roundNumbers.length > 3) {
    roundNumbers = roundNumbers.slice(-3)
  }
  
  useEffect(() => {
    const timer = setTimeout(onComplete, 6000) // Increased to 6s for full path
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div className="z-10 flex flex-col items-center justify-center h-full w-full px-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex gap-16 items-center justify-center overflow-x-auto p-8 w-full"
      >
        {roundNumbers.map((round, rIndex) => (
          <div key={round} className="flex flex-col gap-8 justify-center h-full relative">
             <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-xs font-bold text-zinc-600 uppercase tracking-widest whitespace-nowrap">
               {rIndex === roundNumbers.length - 1 ? 'Finals' : `Round ${rIndex + 1}`}
             </div>
             
             {rounds[round].map((match, mIndex) => {
               // Check if this match is part of champion's path
               const isChampionMatch = match.winner?.id === champion.id
               const isFinal = rIndex === roundNumbers.length - 1
               
               return (
                 <BracketNode 
                   key={match.id} 
                   match={match} 
                   isChampionPath={isChampionMatch} 
                   delay={rIndex * 0.5}
                   isFinal={isFinal}
                 />
               )
             })}
          </div>
        ))}
        
        {/* Champion Trophy Node at the end */}
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: roundNumbers.length * 0.5 + 0.5, type: "spring" }}
          className="flex flex-col items-center gap-4 ml-8"
        >
          <div className="relative">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce">
              <Crown size={32} className="text-yellow-400 drop-shadow-lg" />
            </div>
            <div className="w-24 h-24 rounded-full border-4 border-yellow-500 overflow-hidden shadow-[0_0_40px_rgba(234,179,8,0.6)]">
              <img src={champion.members[0].stages[0].image} className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="text-yellow-400 font-black text-xl tracking-tighter uppercase">{champion.name}</div>
        </motion.div>

      </motion.div>
    </div>
  )
}

type RankedTeam = {
  team: Team
  rank: number
  label: string
  medal?: 'gold' | 'silver' | 'bronze'
}

function BracketNode({ match, isChampionPath, delay, isFinal }: { match: Match, isChampionPath: boolean, delay: number, isFinal: boolean }) {
  const winner = match.winner!
  const loser = match.p1.id === winner.id ? match.p2 : match.p1
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay }}
      className={`
        relative flex flex-col w-48 bg-zinc-900 border rounded-lg overflow-hidden
        ${isChampionPath ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : 'border-zinc-800 opacity-50'}
      `}
    >
      {/* Winner Slot */}
      <div className={`flex items-center gap-3 p-2 border-b border-zinc-800/50 ${isChampionPath ? 'bg-yellow-500/10' : ''}`}>
        {winner.members?.[0]?.stages?.[0]?.thumbnail || winner.members?.[0]?.stages?.[0]?.image ? (
          <img src={winner.members[0].stages[0].thumbnail || winner.members[0].stages[0].image} className="w-8 h-8 rounded object-cover" />
        ) : (
          <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-bold">?</div>
        )}
        <span className={`text-xs font-bold truncate ${isChampionPath ? 'text-yellow-400' : 'text-zinc-300'}`}>
          {winner.name || 'Unknown'}
        </span>
        {isChampionPath && <Trophy size={12} className="text-yellow-500 ml-auto" />}
      </div>
      
      {/* Loser Slot */}
      <div className="flex items-center gap-3 p-2 opacity-60">
        {loser.id === 'bye' ? (
           <div className="w-8 h-8 rounded bg-zinc-800/50 flex items-center justify-center text-[10px] text-zinc-600 font-bold">BYE</div>
        ) : loser.members?.[0]?.stages?.[0]?.thumbnail || loser.members?.[0]?.stages?.[0]?.image ? (
           <img src={loser.members[0].stages[0].thumbnail || loser.members[0].stages[0].image} className="w-8 h-8 rounded object-cover grayscale" />
        ) : (
           <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-bold">?</div>
        )}
        <span className="text-xs font-bold truncate text-zinc-500">
          {loser.name || 'Unknown'}
        </span>
      </div>

      {/* Connection Line to Next Round (Right) */}
      {!isFinal && (
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "4rem" }} // 16 * 4 = 64px gap
          transition={{ delay: delay + 0.3, duration: 0.5 }}
          className={`absolute top-1/2 -right-16 h-0.5 ${isChampionPath ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]' : 'bg-zinc-800'}`}
        />
      )}
    </motion.div>
  )
}


export function BattleLeaderboardView({ tournament }: { tournament: BattleSession }) {
  const history = tournament.history
  const champion = tournament.champion
  
  if (!champion || !history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-zinc-500">
        <p>No tournament results available.</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-zinc-800 rounded-full text-white">
           Restart
        </button>
      </div>
    )
  }

  // --- Logic for Queue / Tag Team Mode (Win Count based) ---
  if (tournament.type === 'queue') {
    const winCounts = new Map<string, number>()
    const teamsMap = new Map<string, Team>()

    // Count wins and collect teams
    history.forEach(m => {
      if (m.winner) {
        winCounts.set(m.winner.id, (winCounts.get(m.winner.id) || 0) + 1)
        teamsMap.set(m.winner.id, m.winner)
      }
      if (m.p1) teamsMap.set(m.p1.id, m.p1)
      if (m.p2) teamsMap.set(m.p2.id, m.p2)
    })

    // Create sorted ranking
    const ranking: RankedTeam[] = []
    const sortedTeams = Array.from(teamsMap.values()).sort((a, b) => {
      const winsA = winCounts.get(a.id) || 0
      const winsB = winCounts.get(b.id) || 0
      // Sort by wins descending
      if (winsB !== winsA) return winsB - winsA
      // Tie-breaker: If one is champion, they are first
      if (a.id === champion.id) return -1
      if (b.id === champion.id) return 1
      return 0
    })

    let currentRank = 1
    let previousWins = -1

    sortedTeams.forEach((team, index) => {
      // Filter out BYE team
      if (team.id === 'bye') return
      
      const wins = winCounts.get(team.id) || 0
      
      // Handle ties in rank
      if (wins !== previousWins) {
         currentRank = index + 1
      }
      previousWins = wins

      let medal: 'gold' | 'silver' | 'bronze' | undefined
      // Only give medals based on RANK, not just index
      if (currentRank === 1) medal = 'gold'
      else if (currentRank === 2) medal = 'silver'
      else if (currentRank === 3) medal = 'bronze'
      
      // Override for champion (always gold/1st)
      if (team.id === champion.id) {
         currentRank = 1
         medal = 'gold'
      }

      ranking.push({
        team,
        rank: currentRank,
        label: `${wins} Wins`,
        medal
      })
    })

    return <LeaderboardRender ranking={ranking} />
  }
  
  // --- Logic for Bracket Mode (Standard) ---
  
  // 1. Champion is 1st
  // 2. Loser of the LAST match is 2nd (Finals)
  // 3. Check for 3rd place match (it should be the one BEFORE the final)
  
  const finalMatch = history[history.length - 1]
  // Safety check for finalMatch
  if (!finalMatch) return null 

  const runnerUp = finalMatch.winner?.id === finalMatch.p1.id ? finalMatch.p2 : finalMatch.p1
  
  let thirdPlace: Team | null = null
  let fourthPlace: Team | null = null
  
  // Find 3rd Place Match safely
  const thirdPlaceMatch = history.find((m: any) => m.isThirdPlaceMatch)
  
  if (thirdPlaceMatch && thirdPlaceMatch.winner) {
    thirdPlace = thirdPlaceMatch.winner
    fourthPlace = thirdPlaceMatch.winner.id === thirdPlaceMatch.p1.id ? thirdPlaceMatch.p2 : thirdPlaceMatch.p1
  }
  
  const processedTeamIds = new Set<string>()
  const ranking: RankedTeam[] = []
  
  // 1st
  ranking.push({ team: champion, rank: 1, label: 'Champion', medal: 'gold' })
  processedTeamIds.add(champion.id)
  
  // 2nd
  if (runnerUp && runnerUp.id !== 'bye') {
    ranking.push({ team: runnerUp, rank: 2, label: 'Runner Up', medal: 'silver' })
    processedTeamIds.add(runnerUp.id)
  }
  
  // 3rd & 4th
  if (thirdPlace && fourthPlace) {
    if (thirdPlace.id !== 'bye') {
      ranking.push({ team: thirdPlace, rank: 3, label: '3rd Place', medal: 'bronze' })
      processedTeamIds.add(thirdPlace.id)
    }
    
    if (fourthPlace.id !== 'bye') {
      ranking.push({ team: fourthPlace, rank: 4, label: '4th Place' })
      processedTeamIds.add(fourthPlace.id)
    }
  }
  
  // Group losers by round
  const losersByRound: Record<number, Team[]> = {}
  
  history.forEach(m => {
    // Skip if match has no winner yet or is malformed
    if (!m.winner || !m.p1 || !m.p2) return

    // Identify loser
    const winnerId = m.winner.id
    const p1Id = m.p1.id
    
    if (!winnerId || !p1Id) return

    const loser = winnerId === p1Id ? m.p2 : m.p1
    
    // Safety check for loser
    if (!loser || !loser.id || loser.id === 'bye') return
    
    // If this team is already ranked (e.g. they are 3rd/4th place but we are looking at their semi-final loss), skip
    if (processedTeamIds.has(loser.id)) return
    
    const roundKey = m.round || 0 // Default to round 0 if undefined
    if (!losersByRound[roundKey]) losersByRound[roundKey] = []
    losersByRound[roundKey].push(loser)
    
    // Mark as processed
    processedTeamIds.add(loser.id)
  })
  
  // Iterate rounds from high to low to assign ranks
  const rounds = Object.keys(losersByRound).map(Number).sort((a, b) => b - a)
  
  let currentRankCursor = (thirdPlace ? 4 : 2) + 1
  
  rounds.forEach(r => {
    const losers = losersByRound[r]
    losers.forEach(team => {
      ranking.push({
        team,
        rank: currentRankCursor, 
        label: `Top ${Math.pow(2, (history[history.length-1].round - r) + 2)}` 
      })
    })
    currentRankCursor += losers.length
  })
  
  return <LeaderboardRender ranking={ranking} />
}

function LeaderboardRender({ ranking }: { ranking: RankedTeam[] }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="z-10 flex flex-col items-center w-full max-w-4xl px-4 py-8 h-screen overflow-y-auto no-scrollbar"
    >
      <h1 className="text-4xl font-black italic uppercase mb-8 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 drop-shadow-lg text-center">
        BATTLE RESULTS
      </h1>

      <div className="w-full flex flex-col gap-3 pb-20">
        {ranking.map((item, index) => (
          <LeaderboardRow 
            key={item.team.id} 
            item={item} 
            delay={index * 0.1} 
          />
        ))}
      </div>

      {/* Footer Buttons */}
      <div className="fixed bottom-8 flex gap-4 z-20">
        <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform flex items-center gap-2 shadow-lg shadow-white/20">
          <RotateCcw size={18} />
          NEW BATTLE
        </button>
        <Link href="/" className="px-8 py-3 bg-zinc-900 border border-zinc-800 text-white font-bold rounded-full hover:bg-zinc-800 transition-colors shadow-lg">
          HOME
        </Link>
      </div>
    </motion.div>
  )
}

function LeaderboardRow({ item, delay }: { item: { team: Team, rank: number, label: string, medal?: string }, delay: number }) {
  const char = item.team.members?.[0]
  
  if (!char) return null // Skip invalid rows

  let bgClass = "bg-zinc-900/50 border-zinc-800"
  let textClass = "text-zinc-400"
  let rankDisplay = `#${item.rank}`
  
  if (item.medal === 'gold') {
    bgClass = "bg-yellow-900/30 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]"
    textClass = "text-yellow-400"
    rankDisplay = "1ST"
  } else if (item.medal === 'silver') {
    bgClass = "bg-zinc-400/10 border-zinc-400/50"
    textClass = "text-zinc-300"
    rankDisplay = "2ND"
  } else if (item.medal === 'bronze') {
    bgClass = "bg-orange-900/20 border-orange-600/50"
    textClass = "text-orange-400"
    rankDisplay = "3RD"
  } else if (item.rank === 4) {
    rankDisplay = "4TH"
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay }}
      className={`flex items-center gap-4 p-3 rounded-xl border backdrop-blur-sm ${bgClass}`}
    >
      {/* Rank */}
      <div className={`text-2xl font-black italic w-16 text-center ${textClass}`}>
        {rankDisplay}
      </div>
      
      {/* Avatar */}
      <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/10">
        <img src={char.stages[0].image} className="w-full h-full object-cover" />
      </div>
      
      {/* Name & Label */}
      <div className="flex flex-col flex-1">
        <span className={`font-bold text-lg leading-none ${item.medal === 'gold' ? 'text-white' : 'text-zinc-200'}`}>
          {item.team.name}
        </span>
        <span className="text-xs font-mono uppercase tracking-wider text-white/30">
          {item.label}
        </span>
      </div>
      
      {/* Medal Icon */}
      {item.medal === 'gold' && <Crown className="text-yellow-400 mr-4" />}
      {item.medal === 'silver' && <Trophy className="text-zinc-400 mr-4" size={20} />}
      {item.medal === 'bronze' && <Trophy className="text-orange-600 mr-4" size={18} />}
      
    </motion.div>
  )
}

export function VsBadge({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`relative flex items-center justify-center ${compact ? 'w-[240px] h-[240px]' : 'w-[500px] h-[500px]'}`}>
      {/* Lightning Effects */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
         <motion.svg
           viewBox="0 0 100 100"
           className={`${compact ? 'w-40 h-40' : 'w-64 h-64'} text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.8)] opacity-50`}
           animate={{ opacity: [0, 1, 0, 0.5, 0] }}
           transition={{ duration: 3, repeat: Infinity, times: [0, 0.1, 0.2, 0.3, 1] }}
         >
           <path d="M45,10 L55,40 L90,30 L40,90 L50,60 L10,70 Z" fill="currentColor" />
         </motion.svg>
      </div>

      {/* Main VS Text */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <div className={`relative ${compact ? 'p-3' : 'p-12'}`}> {/* Reduced padding for compact */}
           <h2 className={`${compact ? 'text-6xl' : 'text-9xl'} font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-zinc-600 drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] leading-none ${compact ? 'pr-2' : 'pr-6'}`}
               style={{ filter: "drop-shadow(0 0 30px rgba(255,255,255,0.2))" }}>
             VS
           </h2>
           {/* Electric Overlay Text for Shine */}
           <h2 className={`absolute inset-0 flex items-center justify-center ${compact ? 'p-3 text-6xl' : 'p-12 text-9xl'} font-black italic text-orange-500/30 blur-md animate-pulse leading-none pointer-events-none ${compact ? 'pr-2' : 'pr-6'}`} aria-hidden="true">
             VS
           </h2>
        </div>
        
        <div className={`text-orange-500 font-bold tracking-[0.5em] ${compact ? 'text-xs mt-3' : 'text-sm mt-4'} animate-pulse drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]`}>
          FIGHT
        </div>
      </div>
    </div>
  )
}
