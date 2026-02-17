
import { Character, Challenge, TeamConfig } from '@/types'
import { Team, Match, BattleSession } from '@/lib/tournament'
import { calculateRank } from '@/utils/statTiers'

export function generateChallengeTeam(
  config: TeamConfig, 
  allCharacters: Character[], 
  excludedIds: Set<string>
): Team {
  const members: Character[] = []
  
  // 1. Specific Character
  if (config.characterId) {
    const char = allCharacters.find(c => c.id === config.characterId)
    if (char) {
      members.push(char)
      excludedIds.add(char.id)
    }
  }

  // 2. Fill remaining slots
  const needed = config.count - members.length
  if (needed > 0) {
    // Filter pool
    let pool = Array.isArray(allCharacters) ? allCharacters.filter(c => !excludedIds.has(c.id)) : []
    
    if (config.groupId) {
      pool = pool.filter(c => c.groupId === config.groupId)
    }

    // -- Rank Filters (Based on Total Stats) --
    // If NOT using PowerScale (Canon), we filter by Rank/Stats
    if (!config.usePowerScale) {
       // Check for Min/Max Total Stats (which maps to Rank)
       // The user UI might send 'minRank'/'maxRank' as values or keys.
       // But based on user input: "total pwr e filtrei por la" -> "setei o filtro para Time B pwr>10000 e time b<9990"
       // This suggests we need to check if 'powerRange' is being used for STATS when usePowerScale is FALSE.
       // Or maybe the user is using the "Rank" slider which actually sets min/max stats?
       
       // Let's assume if usePowerScale is false, powerRange refers to Total Stats (0-16000+)
       // And if usePowerScale is true, powerRange refers to Canon Scale (0-1000)
       
       if (config.powerRange) {
          pool = pool.filter(c => {
             const maxStats = Math.max(...c.stages.map(s => 
                Object.values(s.stats).reduce((a, b) => (typeof a === 'number' ? a : 0) + (typeof b === 'number' ? b : 0), 0) as number
             ));
             return maxStats >= (config.powerRange?.min || 0) && maxStats <= (config.powerRange?.max || 99999);
          });
       }
       
       // Explicit Rank Selection (S+, S, A...)
       if (config.selectedRanks && config.selectedRanks.length > 0) {
          pool = pool.filter(c => {
             const maxStats = Math.max(...c.stages.map(s => 
                Object.values(s.stats).reduce((a, b) => (typeof a === 'number' ? a : 0) + (typeof b === 'number' ? b : 0), 0) as number
             ));
             const rank = calculateRank(maxStats);
             return config.selectedRanks!.includes(rank);
          });
       }
    }

    // -- Power Scale Filters (Stats-based Range) --
    if (config.usePowerScale && config.powerRange) {
        pool = pool.filter(c => {
            const maxStats = Math.max(...c.stages.map(s => 
                Object.values(s.stats).reduce((a, b) => (typeof a === 'number' ? a : 0) + (typeof b === 'number' ? b : 0), 0) as number
            ));
            return maxStats >= (config.powerRange?.min || 0) && maxStats <= (config.powerRange?.max || 99999);
        });
    }

    // -- Tag Filters --
    if (config.tags) {
        if (config.tags.include && config.tags.include.length > 0) {
             pool = pool.filter(c => {
                 const charTags = new Set<string>();
                 c.stages.forEach(s => {
                     s.tags.combatClass.forEach(t => charTags.add(t));
                     s.tags.movement.forEach(t => charTags.add(t));
                     charTags.add(s.tags.composition);
                     charTags.add(s.tags.size);
                     s.tags.source.forEach(t => charTags.add(t));
                     s.tags.element.forEach(t => charTags.add(t));
                 });
                 // Check if character has ANY of the included tags
                 return config.tags!.include.some(tag => charTags.has(tag));
             });
        }
        
        if (config.tags.exclude && config.tags.exclude.length > 0) {
             pool = pool.filter(c => {
                 const charTags = new Set<string>();
                 c.stages.forEach(s => {
                     s.tags.combatClass.forEach(t => charTags.add(t));
                     s.tags.movement.forEach(t => charTags.add(t));
                     charTags.add(s.tags.composition);
                     charTags.add(s.tags.size);
                     s.tags.source.forEach(t => charTags.add(t));
                     s.tags.element.forEach(t => charTags.add(t));
                 });
                 // If any excluded tag is present, remove character
                 return !config.tags!.exclude.some(tag => charTags.has(tag));
             });
        }
    }
    
    // Shuffle and pick
    pool = pool.sort(() => Math.random() - 0.5)
    
    for (let i = 0; i < needed && i < pool.length; i++) {
      const char = pool[i]
      members.push(char)
      excludedIds.add(char.id)
    }
  }
  
  return {
    id: `team-${Math.random().toString(36).substr(2, 9)}`,
    name: config.name || members.map(c => c.name).join(' & '),
    members
  }
}

export function generateChallengeTournament(challenge: Challenge, allCharacters: Character[]): BattleSession {
  const excludedIds = new Set<string>()
  
  // Default configs if missing
  const configA = challenge.config.teamA || { type: 'player', count: 1 }
  const configB = challenge.config.teamB || { type: 'cpu', count: 1 }

  const teamA = generateChallengeTeam(configA, allCharacters, excludedIds)
  const teamB = generateChallengeTeam(configB, allCharacters, excludedIds)
  
  const match: Match = {
    id: `match-${Math.random().toString(36).substr(2, 9)}`,
    p1: teamA,
    p2: teamB,
    winner: null,
    round: 0
  }
  
  return {
    matches: [match],
    currentMatchIndex: 0,
    history: [],
    champion: null,
    type: 'bracket' 
  }
}
