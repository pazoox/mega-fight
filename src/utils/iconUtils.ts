import { 
  Sword, Shield, Wand2, Zap, Handshake, Heart, Ghost, Crosshair, Hammer, PawPrint, Star, 
  Footprints, Waves, Wind, Rocket, Layers, Move, Globe, 
  Leaf, Hexagon, Cloud, Droplets, Gem, Eye, Skull, 
  Sparkles, CircleDot, Activity, Sun, Cpu, Atom, Dna, Brain, FlaskConical, 
  Flame, Mountain, Snowflake, Moon, Orbit, Wrench, Radio, Anchor, Biohazard, Volume2,
  Sunrise, Sunset, Building2, Grid3X3, TreePine, Tent, Landmark, CloudRain, CloudLightning, CloudFog,
  ArrowLeftRight, ArrowRight
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { 
  COMBAT_CLASSES_DATA, MOVEMENT_DATA, COMPOSITION_DATA, SOURCE_DATA, ELEMENT_DATA, 
  ARENA_DAYTIME_DATA, ENVIRONMENTS_DATA, WEATHERS_DATA, SKILL_TAGS_DATA 
} from '@/constants';
import systemVars from '@/data/systemVars.json';

// Type for the icon component
export type IconComponent = React.ElementType;

// Helper to get Lucide icon by name string
function getIconByName(name: string): IconComponent {
  // @ts-ignore
  return LucideIcons[name] || CircleDot;
}

export function getRelationIcon(relationType?: 'versus' | 'synergy'): IconComponent {
  if (relationType === 'synergy') return ArrowLeftRight;
  return ArrowRight;
}

export function getVariableIcon(category: string, value: string): IconComponent {
  // Normalize category/type keys to match our data structures
  const normalizedCategory = {
    'CombatClass': 'Combat Class',
    'Source': 'Power Source',
    'Tag': 'Combat Tags',
    'Daytime': 'Daytime'
  }[category] || category;

  // 1. Check System Vars (Races)
  if (normalizedCategory === 'Race' || category === 'Race') {
    const race = systemVars.races.find(r => r.value === value);
    if (race && race.icon) return getIconByName(race.icon);
    return Dna;
  }

  // 2. Check Constants Data
  let foundItem: { icon: any } | undefined;

  switch (normalizedCategory) {
    case 'Combat Class':
      foundItem = COMBAT_CLASSES_DATA.find(i => i.value === value);
      break;
    case 'Movement':
      foundItem = MOVEMENT_DATA.find(i => i.value === value);
      break;
    case 'Composition':
      foundItem = COMPOSITION_DATA.find(i => i.value === value);
      break;
    case 'Power Source':
    case 'Source':
      foundItem = SOURCE_DATA.find(i => i.value === value);
      break;
    case 'Element':
      foundItem = ELEMENT_DATA.find(i => i.value === value);
      break;
    case 'Daytime':
      foundItem = ARENA_DAYTIME_DATA.find(i => i.value === value);
      break;
    case 'Environment':
      foundItem = ENVIRONMENTS_DATA.find(i => i.value === value);
      break;
    case 'Weather':
      foundItem = WEATHERS_DATA.find(i => i.value === value);
      break;
    case 'Combat Tags':
    case 'Tag':
      foundItem = SKILL_TAGS_DATA.find(i => i.value === value);
      break;
  }

  if (foundItem) {
    return foundItem.icon;
  }

  // 3. Fallback based on Category
  switch (normalizedCategory) {
    case 'Environment': return Globe;
    case 'Weather': return Cloud;
    case 'Synergy': return Handshake; // Users?
    case 'Magic': return Sparkles;
    case 'Physics': return Activity;
    case 'Scale': return LucideIcons.Maximize;
    case 'Complexity': return Brain;
    case 'Immunity': return Shield;
    default: return CircleDot;
  }
}
