
// Rank Types
// Removed D, D+, A+ to simplify the system
export type RankType = 'C' | 'C+' | 'B' | 'B+' | 'A' | 'S' | 'S+'

export const RANK_ORDER: RankType[] = ['C', 'C+', 'B', 'B+', 'A', 'S', 'S+'];

export const calculateRank = (total: number): RankType => {
  if (total < 2000) return 'C'
  if (total < 4000) return 'C+'
  if (total < 6000) return 'B'
  if (total < 8000) return 'B+'
  if (total < 10000) return 'A'
  if (total < 15000) return 'S'
  return 'S+'
}

import type { Character, CharacterStats } from '@/types'

export function getCharacterPWR(character: Character): number {
  if (!character?.stages?.length) return 0
  const stage = character.stages[0]
  const stats: CharacterStats | undefined = stage?.stats
  if (!stats) return 0
  const keys: Array<keyof CharacterStats> = ['hp', 'str', 'def', 'sta', 'sp_atk', 'int', 'spd', 'atk_spd']
  return keys.reduce((acc, key) => acc + (typeof stats[key] === 'number' ? stats[key] : 0), 0)
}

export const getRankColor = (rank: RankType): string => {
  switch (rank) {
    case 'S+': return '#FFD700' // Gold
    case 'S': return '#FFD700'
    case 'A': return '#ff4d4d' // Red
    case 'B+': return '#3b82f6' // Blue
    case 'B': return '#3b82f6'
    case 'C+': return '#22c55e' // Green
    case 'C': return '#22c55e'
    default: return '#71717a' // Zinc (Fallback)
  }
}

// ==========================================
// STAT TIERS (Human to Cosmic)
// ==========================================

export interface TierInfo {
  label: string;
  color: string;
  description: string;
  border: string;
  bg: string;
  tooltipBg: string;
}

export const TIER_RANGES = [
  { max: 100, label: 'Human', color: 'text-zinc-400', bg: 'bg-zinc-500/20', border: 'border-zinc-400', tooltipBg: 'bg-zinc-950' },
  { max: 300, label: 'Superhuman', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-400', tooltipBg: 'bg-emerald-950' },
  { max: 600, label: 'Urban', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-400', tooltipBg: 'bg-blue-950' },
  { max: 1000, label: 'Catastrophic', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-400', tooltipBg: 'bg-orange-950' },
  { max: Infinity, label: 'Cosmic', color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-400', tooltipBg: 'bg-purple-950' },
];

export const DESCRIPTIONS: Record<string, string[]> = {
  hp: [
    "Normal biological resilience. Vulnerable to conventional weapons.",
    "Enhanced durability. Can withstand small arms fire or minor falls.",
    "Tank-like resilience. Survives heavy artillery and building collapses.",
    "City-block durability. Withstands massive explosions and sustained heavy fire.",
    "Planetary resilience. Virtually indestructible by conventional means."
  ],
  str: [
    "Average to peak human strength. Can lift up to 2x body weight.",
    "Superhuman strength. Can bend steel bars and lift cars.",
    "Urban destruction. Can topple buildings and throw heavy vehicles.",
    "Catastrophic power. Can level mountains and cause earthquakes.",
    "Cosmic might. Can shatter planets and manipulate celestial bodies."
  ],
  def: [
    "Standard protection. Relies on armor or cover.",
    "Tough skin or basic force fields. Ignores light damage.",
    "Heavy armor or density. Impervious to small arms.",
    "Impenetrable defense. Requires anti-tank or bunker-busting force.",
    "Absolute defense. Requires conceptual or cosmic attacks to breach."
  ],
  sta: [
    "Normal stamina. Tires after minutes of intense activity.",
    "Enhanced endurance. Can fight for hours without rest.",
    "Relentless energy. Can fight for days.",
    "Inexhaustible. Rarely needs rest or sustenance.",
    "Infinite stamina. Self-sustaining energy source."
  ],
  sp_atk: [
    "Basic energy projection or tools. Grenade level.",
    "Potent blasts. Can destroy walls or small vehicles.",
    "Devastating power. Can level city blocks.",
    "Nuke-level output. Can destroy cities.",
    "World-ending power. Can destroy planets or stars."
  ],
  int: [
    "Average intelligence. Standard tactical awareness.",
    "Genius level. Advanced scientific or tactical knowledge.",
    "Supercomputer. Processes information instantly.",
    "Precognitive. Predicts outcomes with high accuracy.",
    "Omniscient. Knows all outcomes and possibilities."
  ],
  spd: [
    "Human speed. Up to 30km/h.",
    "Subsonic. Faster than the eye can see.",
    "Supersonic. Breaks the sound barrier.",
    "Hypersonic. Reaches orbital velocities.",
    "FTL. Moves faster than light or teleports."
  ],
  atk_spd: [
    "Human reaction time.",
    "Enhanced reflexes. Dodges bullets.",
    "Lightning reflexes. Reacts to supersonic attacks.",
    "Near-instantaneous. Reacts to light-speed attacks.",
    "Time-bending. Moves before the attack is launched."
  ]
};

export function getStatTier(stat: string, value: number): TierInfo {
  const index = TIER_RANGES.findIndex(r => value <= r.max);
  const tierIndex = index === -1 ? TIER_RANGES.length - 1 : index;
  const tier = TIER_RANGES[tierIndex];
  
  // Fallback to generic description if stat not found
  const statDesc = DESCRIPTIONS[stat] || DESCRIPTIONS['hp'];
  
  return {
    label: tier.label,
    color: tier.color,
    description: statDesc[tierIndex] || statDesc[statDesc.length - 1],
    border: tier.border,
    bg: tier.bg,
    tooltipBg: tier.tooltipBg
  };
}
