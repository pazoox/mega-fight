export type StatLevel = number; // 0-1000+

export type EnvironmentType = 'Neutral' | 'Volcanic' | 'Aquatic' | 'Storm' | 'Earth' | 'Holy' | 'Dark';

export type CombatClass = 'Assault' | 'Tank' | 'Mage' | 'Speedster' | 'Support' | 'Healer' | 'Assassin' | 'Marksman' | 'Brawler' | 'Summoner' | 'Specialist';
export type MovementType = 'Terrestrial' | 'Aquatic' | 'Aerial' | 'Spatial' | 'Phasing' | 'Warping' | 'Omnipresent';
export type CompositionType = 'Organic' | 'Metallic' | 'Spiritual' | 'Gaseous / Liquid' | 'Energy' | 'Crystalline' | 'Eldritch' | 'Undead';
export type SizeType = 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Giant' | 'Colossal';
export type SourceType = 'Mana' | 'Chakra' | 'Ki' | 'Divine' | 'Tech' | 'Force' | 'Biological' | 'Psionic' | 'Alchemical' | 'Stellar';
export type ElementType = 'Fire' | 'Water' | 'Earth' | 'Air' | 'Lightning' | 'Ice' | 'Light' | 'Dark' | 'Aether' | 'Nature' | 'Metal' | 'Radiation' | 'Gravity' | 'Toxic' | 'Sound';
export type GenderType = 'Male' | 'Female' | 'Both' | 'None';

export interface CharacterSpecs {
  height: number; // cm
  weight: number; // kg
  race: string;
  gender: GenderType;
}

export interface Skill {
  name: string;
  description: string;
  tags: string[]; // List of tags relevant to this skill (e.g., "Fire", "Ranged", "Burst")
  scalingStat?: string;
}

export interface CharacterCombat {
  mainSkill: Skill;
  secondarySkill?: Skill;
}

export interface CharacterTags {
  // New granular system
  combatClass: CombatClass[];
  movement: MovementType[];
  composition: CompositionType;
  size: SizeType;
  
  // Legacy / Simplified
  source: SourceType[];
  element: ElementType[]; // Updated to use ElementType
}

export interface CharacterStats {
  hp: number;
  str: number;
  def: number;
  sta: number; // Replaces mana (Stamina)
  sp_atk: number; // Special Attack Power
  int: number; // Intelligence/Strategy
  spd: number;
  atk_spd: number; // Attack/Reaction Speed
  
  // Justifications for stats
  justifications?: {
    hp?: string;
    str?: string;
    def?: string;
    sta?: string;
    sp_atk?: string;
    int?: string;
    spd?: string;
    atk_spd?: string;
  };
}

export interface CharacterStage {
  stage: string; // e.g. "Base", "Super Saiyan"
  image: string; // URL
  thumbnail?: string;
  stats: CharacterStats;
  combat: CharacterCombat;
  tags: CharacterTags;
  isActive?: boolean;
  // Overrides
  name?: string;
  alias?: string;
  description?: string;
  race?: string;
}

export interface Character {
  id: string;
  name: string;
  alias?: string; // Alter Ego or Real Name (e.g. "Eren Yeager" for "Attack Titan")
  description?: string; // Short bio/lore
  groupId: string; // Previously franchiseId
  canonScale?: number;
  wins?: number;
  matches?: number;
  specs: CharacterSpecs;
  stages: CharacterStage[];
  isActive?: boolean;
  cardLayout?: 'classic' | 'bottom_focused';
}

export interface Group {
  id: string;
  name: string;
  logo?: string;
  type?: 'Franchise' | 'Platform' | 'Community' | 'User';
  isActive?: boolean;
}

export interface Arena {
  id: string;
  name: string;
  description: string;
  image?: string;
  video?: string;
  folder?: string; // New field for Folder Name
  daytime?: string; // Slicer (e.g. 'Day', 'Night')
  weather?: string; // Single Select
  environment: EnvironmentType[]; // Changed to Array (Max 2)
  difficulty: {
    space: number;
    magic: number;
    complexity: number;
  };
}

export interface BattleModifier {
  label: string;
  value: number; // e.g. 1.2 (for percentage) or 100 (for flat)
  type?: 'percentage' | 'flat'; // Defaults to 'percentage' if undefined
  category: 'Scale' | 'Environment' | 'Physics' | 'Magic' | 'Complexity' | 'Synergy' | 'Immunity' | 'Weather';
  targetStat?: keyof CharacterStats | 'all';
  trigger: string;
  triggerType?: string;
  relationType?: 'versus' | 'synergy';
  targetType?: string;
  targetValue?: string;
}

export interface BattleContext {
  character: Character;
  stageIndex: number;
  arena: Arena | null;
  teammates?: Character[]; // For Synergy
  opponents?: Character[]; // For Immunity/Counter checks
  baseStatsOverride?: CharacterStats; // For Power Equalization or custom scaling
}

// Challenges System
export type ChallengeMode = 'squad_4v4' | 'boss_raid' | 'stats_battle' | '1v1' | '2v2';

export interface SlotConfig {
  id: string; // e.g. 'p1', 'boss'
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  scale?: number; // 0.5 - 2.0
  type: 'player' | 'opponent';
}

export interface ChallengeLayout {
  slots: SlotConfig[];
  backgroundUrl?: string; // Optional override for preview
}

export interface TeamConfig {
  name?: string;
  type: 'player' | 'cpu';
  count: number;
  groupId?: string; // Filter by Group/Franchise (Single - Legacy)
  groupIds?: string[]; // Multiple Groups
  characterId?: string; // Specific character restriction (Single - Legacy)
  stageId?: string; // Specific stage restriction (name) (Single - Legacy)
  
  // Advanced Selection
  includedFighters?: string[]; // Specific Character IDs included
  excludedFighters?: string[]; // Specific Character IDs excluded (from groups)
  excludedStages?: string[]; // Specific Stages excluded (Format: "charId:stageName")

  // Power & Rank System
  usePowerScale?: boolean; // If true, uses powerRange. If false, uses ranks.
  powerRange?: { min: number; max: number };
  selectedRanks?: string[]; // Discrete selection (Slicer)
  minRank?: string; // Legacy/Range Support
  maxRank?: string; // Legacy/Range Support
  
  stageMode?: 'random' | 'weakest' | 'strongest'; // How to pick the character's form

  tags?: {
    include: string[];
    exclude: string[];
  };
  modifiers?: boolean; // Apply arena modifiers?
}

export interface ChallengeConfig {
  // Common
  tournamentType?: 'classic' | 'last_standing' | 'tournament' | 'boss_fight' | 'hero_tale' | 'stat_attack';
  fixedArenaId?: string;
  arenaPool?: string[]; // Multiple arenas for the challenge
  layout?: ChallengeLayout; // Visual layout configuration (Legacy/Optional)
  
  // Teams Configuration (New Rule System)
  teamA?: TeamConfig;
  teamB?: TeamConfig;
  powerScale?: boolean; // Global Power Equalization

  // Boss Raid
  
  // Boss Raid
  bossId?: string;
  bossMultiplier?: number; // e.g. 2.0 for double stats
  
  // Stats Battle
  deckSize?: number;
  roundsToWin?: number;
  limit?: number; // Max number of participants (Bracket Size)
  timeLimit?: number; // Seconds per round (0 = infinite)
  
  // Squad / General
  teamSize?: number; // 4 for Squad Out
  
  // Environment
  modifiersEnabled?: boolean;
  musicUrl?: string; // Background music for the lobby/battle

  // UI Configuration
  ui?: {
    showTimer?: boolean;
    showStats?: boolean; // Detailed stats panel
    showTrumpButton?: boolean; // "Select Stat" / Trunfo Mode
    showExitButton?: boolean;
  };
  
  // Bracket Defaults
  bracket?: {
    type?: 'classic' | 'last_standing' | 'round_robin';
    defaultSize?: number; // 4, 8, 16...
    enableThirdPlace?: boolean; // true/false
  };

  // End Game Experience
  endGame?: {
    showBracketPath?: boolean;
    showChampionReveal?: boolean;
    showLeaderboard?: boolean;
  };

  // Constraints
  allowedTags?: string[]; // "Tech", "Hero", etc.
  bannedTags?: string[];
  minPowerScale?: number;
  maxPowerScale?: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  mode: 'squad_4v4' | 'boss_raid' | 'stats_battle' | '1v1' | '2v2';
  config: ChallengeConfig;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Tournament {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'completed';
  currentRound: number;
  totalRounds: number;
  participants: TournamentParticipant[];
  matches: TournamentMatch[];
  createdAt: string;
}

export interface TournamentParticipant {
  characterId: string;
  characterName: string; // Cache for display
  characterImage: string; // Cache for display
  stats: {
    points: number;
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    voteBalance: number; // Tie breaker (Total Upvotes - Total Downvotes/Opponent Votes)
  };
}

export interface TournamentMatch {
  id: string;
  round: number;
  participantA: string; // Character ID
  participantB: string; // Character ID
  status: 'scheduled' | 'active' | 'completed';
  votesA: number;
  votesB: number;
  winner?: string; // Character ID or 'draw'
  scheduledDate?: string; // YYYY-MM-DD
}
