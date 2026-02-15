import { Character } from "@/types";

export const MOCK_CHARACTERS: Character[] = [
  {
    id: "goku",
    name: "Son Goku",
    groupId: "dragon-ball",
    canonScale: 1000,
    description: "A Saiyan raised on Earth who constantly strives to break his limits.",
    specs: {
      height: 175,
      weight: 62,
      race: "Saiyan",
      gender: "Male",
    },
    stages: [
      {
        stage: "Base Form",
        image: "https://upload.wikimedia.org/wikipedia/en/thumb/3/33/Son_Goku_Dragon_Ball_Super.png/220px-Son_Goku_Dragon_Ball_Super.png", // Placeholder
        stats: { 
          hp: 500, str: 400, def: 300, sta: 500, sp_atk: 400, int: 200, spd: 400, atk_spd: 400,
          justifications: {
            str: "Can lift heavy boulders with ease.",
            sta: "Exceptional endurance from years of training.",
            int: "Combat genius but naive otherwise."
          }
        },
        combat: {
          mainSkill: {
            name: "Kamehameha",
            description: "A signature energy wave attack charged with both hands.",
            tags: ["Energy", "Ranged", "Finisher"]
          },
          secondarySkill: {
            name: "Kaioken",
            description: "Multiplies stats at cost of HP",
            tags: ["Buff", "Risk"]
          }
        },
        tags: {
          combatClass: ['Assault'],
          movement: ['Terrestrial'],
          composition: 'Organic',
          size: 'Medium',
          source: ['Ki'],
          element: ['Light'],
        }
      },
      {
        stage: "Super Saiyan",
        image: "https://upload.wikimedia.org/wikipedia/en/thumb/3/33/Son_Goku_Dragon_Ball_Super.png/220px-Son_Goku_Dragon_Ball_Super.png", // Placeholder
        stats: { 
          hp: 1000, str: 900, def: 800, sta: 800, sp_atk: 900, int: 300, spd: 950, atk_spd: 900,
        },
        combat: {
          mainSkill: {
            name: "Angry Kamehameha",
            description: "A more powerful, one-handed version of the Kamehameha used in anger.",
            tags: ["Energy", "Ranged", "Burst"]
          }
        },
        tags: {
          combatClass: ['Assault'],
          movement: ['Aerial'],
          composition: 'Organic',
          size: 'Medium',
          source: ['Ki'],
          element: ['Light'],
        }
      }
    ]
  },
  {
    id: "naruto",
    name: "Naruto Uzumaki",
    groupId: "naruto",
    canonScale: 100,
    description: "The Seventh Hokage of Konoha and Jinchuriki of the Nine-Tails.",
    specs: {
      height: 166,
      weight: 50,
      race: "Human/Jinchuriki",
      gender: "Male",
    },
    stages: [
      {
        stage: "Sage Mode",
        image: "https://upload.wikimedia.org/wikipedia/en/9/9a/Naruto_Uzumaki.png", // Placeholder
        stats: { 
          hp: 400, str: 350, def: 300, sta: 600, sp_atk: 400, int: 400, spd: 350, atk_spd: 350,
        },
        combat: {
          mainSkill: {
            name: "Rasenshuriken",
            description: "A massive shuriken made of wind chakra that severs enemies at a cellular level.",
            tags: ["Wind", "Ranged", "Finisher"],
          }
        },
        tags: {
          combatClass: ['Mage'],
          movement: ['Terrestrial'],
          composition: 'Organic',
          size: 'Medium',
          source: ['Mana'],
          element: ['Air'],
        }
      }
    ]
  }
];
