import { 
  Swords, Shield, Wand2, Zap, Handshake, Heart, Ghost, Crosshair, Hammer, PawPrint, Star, 
  Footprints, Waves, Wind, Rocket, Layers, Move, Globe, 
  Leaf, Hexagon, Cloud, Droplets, Gem, Eye, Skull, 
  Sparkles, CircleDot, Activity, Sun, Cpu, Atom, Dna, Brain, FlaskConical, 
  Flame, Mountain, Snowflake, Moon, Orbit, Wrench, Radio, Anchor, Biohazard, Volume2,
  Sunrise, Sunset, Building2, Grid3X3, TreePine, Tent, Landmark, CloudRain, CloudLightning, CloudFog
} from 'lucide-react';

export const CANON_SCALE_OPTIONS = [
  { value: 0, label: 'Human Level' },
  { value: 50, label: 'Wall Level' },
  { value: 100, label: 'Building Level' },
  { value: 500, label: 'City Level' },
  { value: 800, label: 'Continental Level' },
  { value: 900, label: 'Planetary Level' },
  { value: 950, label: 'Galactic Level' },
  { value: 1000, label: 'Universal / Multiversal Level' }
];

export const COMBAT_CLASSES_DATA = [
  { value: 'Assault', description: 'Balanced combatant', icon: Swords },
  { value: 'Tank', description: 'High durability and HP', icon: Shield },
  { value: 'Mage', description: 'High special power and area control', icon: Wand2 },
  { value: 'Speedster', description: 'High mobility and reaction', icon: Zap },
  { value: 'Support', description: 'Strategic utility', icon: Handshake },
  { value: 'Healer', description: 'Vitality recovery', icon: Heart },
  { value: 'Assassin', description: 'Precision and burst potential', icon: Ghost },
  { value: 'Marksman', description: 'Long-range specialist', icon: Crosshair },
  { value: 'Brawler', description: 'Close-quarters physical power', icon: Hammer },
  { value: 'Summoner', description: 'Entity creation/control', icon: PawPrint },
  { value: 'Specialist', description: 'Unique or non-standard mechanics', icon: Star }
] as const;

export const MOVEMENT_DATA = [
  { value: 'Terrestrial', description: 'Ground-based', icon: Footprints },
  { value: 'Aquatic', description: 'Water-based', icon: Waves },
  { value: 'Aerial', description: 'Flight/Air', icon: Wind },
  { value: 'Spatial', description: 'Vacuum/Space', icon: Rocket },
  { value: 'Phasing', description: 'Passing through matter', icon: Layers },
  { value: 'Warping', description: 'Short-range teleportation', icon: Move },
  { value: 'Omnipresent', description: 'Existing everywhere simultaneously', icon: Globe }
] as const;

export const COMPOSITION_DATA = [
  { value: 'Organic', description: 'Biological flesh', icon: Leaf },
  { value: 'Metallic', description: 'Solid inorganic', icon: Hexagon },
  { value: 'Spiritual', description: 'Non-material', icon: Cloud },
  { value: 'Gaseous / Liquid', description: 'Fluid states', icon: Droplets },
  { value: 'Energy', description: 'Pure radiation/plasma', icon: Zap },
  { value: 'Crystalline', description: 'Structural minerals', icon: Gem },
  { value: 'Eldritch', description: 'Anomalous matter', icon: Eye },
  { value: 'Undead', description: 'Reanimated organic', icon: Skull }
] as const;

export const SOURCE_DATA = [
  { value: 'Mana', description: 'Classic magic', icon: Sparkles },
  { value: 'Chakra', description: 'Internal pathways', icon: CircleDot },
  { value: 'Ki', description: 'Life force', icon: Activity },
  { value: 'Divine', description: 'Celestial power', icon: Sun },
  { value: 'Tech', description: 'Artificial/Digital', icon: Cpu },
  { value: 'Force', description: 'Fundamental physics', icon: Atom },
  { value: 'Biological', description: 'Organic evolution', icon: Dna },
  { value: 'Psionic', description: 'Mental energy', icon: Brain },
  { value: 'Alchemical', description: 'Transmutation', icon: FlaskConical },
  { value: 'Stellar', description: 'Star-based radiation', icon: Star },
  { value: 'Demonic', description: 'Pact with the Devil, Possessed by a Demon or Devil itself.', icon: Skull },
  { value: 'Spiritual', description: 'Spiritual Connection', icon: Ghost }
] as const;

export const ELEMENT_DATA = [
  { value: 'Fire', description: 'Heat/Plasma', icon: Flame },
  { value: 'Water', description: 'Fluid/Cold', icon: Droplets },
  { value: 'Earth', description: 'Solid/Mineral', icon: Mountain },
  { value: 'Air', description: 'Gas/Motion', icon: Wind },
  { value: 'Lightning', description: 'Electric/Speed', icon: Zap },
  { value: 'Ice', description: 'Solidified Cold', icon: Snowflake },
  { value: 'Light', description: 'Photonic/Divine', icon: Sun },
  { value: 'Dark', description: 'Shadow/Eldritch', icon: Moon },
  { value: 'Aether', description: 'Space/Void', icon: Orbit },
  { value: 'Nature', description: 'Biological/Flora', icon: Leaf },
  { value: 'Metal', description: 'Magnetism/Ferromancy', icon: Wrench },
  { value: 'Radiation', description: 'Nuclear/Atomic decay', icon: Radio },
  { value: 'Gravity', description: 'Weight/Spatial curvature', icon: Anchor },
  { value: 'Toxic', description: 'Poison/Corrosion', icon: Biohazard },
  { value: 'Sound', description: 'Vibration/Frequency', icon: Volume2 },
  { value: 'Sand', description: 'Small Minerals', icon: Tent },
  { value: 'Energy', description: 'Spiritual Control', icon: Sparkles }
] as const;

export const COMMON_RACES = [
  'Human', 'Saiyan', 'Titan', 'Demon', 'Angel', 'Cyborg', 'Alien', 'Mutant', 
  'Spirit', 'God', 'Vampire', 'Werewolf', 'Undead', 'Dragon', 'Elf', 'Dwarf', 
  'Orc', 'Android', 'Shinigami', 'Hollow', 'Arrancar', 'Quincy', 'Wizard', 'Witch', 
  'Meta-Human', 'Curse', 'Sorcerer', 'Pirate', 'Marine', 'Ninja', 'Samurai',
  'Majin', 'Ghoul', 'Esper', 'Devil', 'Celestial', 'Giant', 'Fairy', 'Beastman'
];

export const ARENA_DAYTIME_DATA = [
  { value: 'Neutral', description: 'No specific time influence', icon: CircleDot },
  { value: 'Day', description: 'Bright sunlight, standard visibility', icon: Sun },
  { value: 'Night', description: 'Darkness, reduced visibility, moon buffs', icon: Moon },
  { value: 'Dawn', description: 'Rising sun, spiritual awakening', icon: Sunrise },
  { value: 'Dusk', description: 'Setting sun, fading light', icon: Sunset }
] as const;

export const ENVIRONMENTS_DATA = [
  { value: 'Neutral', description: 'Standard battlefield', icon: CircleDot },
  { value: 'Volcanic', description: 'Extreme heat and lava', icon: Flame },
  { value: 'Aquatic', description: 'Submerged or water-heavy', icon: Droplets },
  { value: 'Mountain', description: 'High altitude, rocky terrain', icon: Mountain },
  { value: 'City', description: 'Urban environment with cover', icon: Building2 },
  { value: 'Spectral', description: 'Ghostly realm, ethereal physics', icon: Ghost },
  { value: 'Dark', description: 'Abyssal darkness, fear inducement', icon: Skull },
  { value: 'Space', description: 'Zero gravity, vacuum', icon: Orbit },
  { value: 'Cage', description: 'Enclosed arena, no escape', icon: Grid3X3 },
  { value: 'Forest', description: 'Dense vegetation and cover', icon: TreePine },
  { value: 'Desert', description: 'Sand, heat, and difficult terrain', icon: Tent },
  { value: 'Ruins', description: 'Ancient structures, unstable ground', icon: Landmark },
  { value: 'Cyber', description: 'Digital/Synthetic landscape', icon: Cpu }
] as const;

export const WEATHERS_DATA = [
  { value: 'Neutral', description: 'Standard atmospheric conditions', icon: CircleDot },
  { value: 'Sunny', description: 'Clear skies', icon: Sun },
  { value: 'Rainy', description: 'Precipitation', icon: CloudRain },
  { value: 'Windy', description: 'Strong gusts', icon: Wind },
  { value: 'Snowy', description: 'Freezing temperatures', icon: Snowflake },
  { value: 'Stormy', description: 'Thunder and lightning', icon: CloudLightning },
  { value: 'Foggy', description: 'Reduced visibility due to fog', icon: CloudFog }
] as const;

export const ENVIRONMENTS = ENVIRONMENTS_DATA.map(e => e.value);

export const WEATHERS = WEATHERS_DATA.map(w => w.value);

export const SKILL_TAGS_DATA = [
  { value: 'Melee', description: 'Close-quarters combat', icon: Swords },
  { value: 'Ranged', description: 'Distance fighting', icon: Crosshair },
  { value: 'AoE', description: 'Area of Effect', icon: Grid3X3 },
  { value: 'Single Target', description: 'Focused attack on one enemy', icon: CircleDot },
  { value: 'Buff', description: 'Enhances stats or abilities', icon: Sparkles },
  { value: 'Debuff', description: 'Reduces stats or hinders enemies', icon: Biohazard },
  { value: 'Control', description: 'Restricts enemy movement/actions', icon: Anchor },
  { value: 'Burst', description: 'High damage in short time', icon: Flame },
  { value: 'Sustain', description: 'Recovery and endurance', icon: Heart },
  { value: 'Finisher', description: 'High power execute move', icon: Skull },
  { value: 'Physical', description: 'Kinetic impact damage', icon: Hammer },
  { value: 'Magic', description: 'Spell-based damage', icon: Wand2 },
  { value: 'Energy', description: 'Beam/Projectile energy damage', icon: Zap }
] as const;

export const SKILL_TAGS = SKILL_TAGS_DATA.map(t => t.value);
