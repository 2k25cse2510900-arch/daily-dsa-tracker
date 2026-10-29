/**
 * Character Data Architecture
 *
 * Quality-first approach: Two polished GLB-backed characters.
 * Models sourced from KayKit Character Pack Adventures 1.0
 * Licence: CC0 1.0 Universal (Public Domain)
 * Creator: Kay Lousberg (www.kaylousberg.com)
 *
 * Future-proofed for:
 * - Phase 3 shop pricing / unlock flags
 * - Phase 4 idle animations, emotes, and gameplay stats
 * - Phase 5 user persistence / saved presets
 */

const modelPath = (name) => `${import.meta.env.BASE_URL}models/${name}`;

export const CHARACTERS = [
  {
    id: "buster-blitz",
    name: "Buster Blitz",
    rarity: "RARE",
    role: "Urban Runner & Brawler",
    description: "An energetic street racer with lightning-fast reflexes and iconic cyan shockwave gear. Always ready to leap over obstacles.",
    quote: "\"Catch me if your graphics card can keep up!\"",

    // GLB model path (served from /public)
    modelFile: modelPath("Knight.glb"),

    // Core color styling - default #ffffff preserves pristine original GLB textures!
    colors: {
      baseColor: "#ffffff",       // Default: Pure White (preserves original GLB armor & clothing texture)
      themeColor: "#0284c7",      // Urban Electric Blue (UI badge / theme accent)
      accentColor: "#38bdf8",     // Vibrant Cyan for accessories & decals
      secondaryColor: "#ffffff",  // Default: Pure White (preserves cape texture)
      skinColor: "#fed7aa",       // Peach/Tan (preserved skin tone)
      eyeColor: "#0284c7",        // Blue pupil
      visorColor: "#00f0ff",      // Cyan neon visor
      podiumGlow: "#00f0ff",      // Podium neon ring glow
      backdropGradient: "from-cyan-950/30 via-slate-900 to-slate-950",
    },

    // Default cosmetic loadout keys (matching wardrobe catalog IDs)
    defaultEquipment: {
      head: 'head-headphones-dj',
      face: null,
      upperBody: null,
      lowerBody: null,
      footwear: null,
      backAccessory: null,
      effect: 'effect-cyan-sparks',
    },

    // Prepared Phase 4 Character Attributes (Gameplay attributes distinct from cosmetics)
    attributes: {
      agility: 88,
      dashSpeed: 94,
      jumpForce: 82,
      recovery: 80,
    },

    // Prepared Phase 3 Shop metadata
    shopData: {
      owned: true,
      price: 0,
      currency: "coins",
      featured: false,
    },
  },

  {
    id: "nebula-nova",
    name: "Nebula Nova",
    rarity: "LEGENDARY",
    role: "Cosmic Astral Voyager",
    description: "A star-forged explorer from the deep Andromeda reaches, cloaked in astral gold armor and orbiting graviton levitation rings.",
    quote: "\"The stars don't wait for anyone, rookie.\"",

    // GLB model path
    modelFile: modelPath("Rogue.glb"),

    // Core color styling - default #ffffff preserves pristine original GLB textures!
    colors: {
      baseColor: "#ffffff",       // Default: Pure White (preserves original GLB rogue clothing texture)
      themeColor: "#4f46e5",      // Royal Indigo (UI badge / theme accent)
      accentColor: "#fbbf24",     // Radiant Astral Gold for accessories
      secondaryColor: "#ffffff",  // Default: Pure White (preserves cape texture)
      skinColor: "#ffe4e6",       // Pale Starlight
      eyeColor: "#fbbf24",        // Golden Star Pupils
      visorColor: "#fde047",      // Astral Yellow
      podiumGlow: "#fbbf24",      // Podium neon ring glow
      backdropGradient: "from-amber-950/30 via-indigo-950/40 to-slate-950",
    },

    // Default cosmetic loadout
    defaultEquipment: {
      head: 'head-halo-nova',
      face: null,
      upperBody: null,
      lowerBody: null,
      footwear: null,
      backAccessory: 'back-dual-thruster',
      effect: 'effect-solar-flare',
    },

    // Prepared Phase 4 Character Attributes
    attributes: {
      agility: 75,
      dashSpeed: 86,
      jumpForce: 96,
      recovery: 90,
    },

    // Prepared Phase 3 Shop metadata
    shopData: {
      owned: false,
      price: 2000,
      currency: "coins",
      featured: true,
    },
  },

  {
    id: "superman",
    name: "Superman",
    category: "Superhero",
    rarity: "LEGENDARY",
    role: "The Man of Steel",
    description: "The iconic superhero in royal blue, red trunks, and flowing cape, powered by the yellow sun. A champion standing for truth and justice.",
    quote: "\"Up, up, and away!\"",

    // GLB model path (served from /public)
    modelFile: modelPath("Superman.glb"),

    // Core color styling - default #ffffff preserves pristine custom GLB textures!
    colors: {
      baseColor: "#ffffff",       // Default: Pure White (preserves royal blue suit, red trunks, boots, shield & belt)
      themeColor: "#0b5ed7",      // Superman Royal Blue (UI badge / theme accent)
      accentColor: "#f59e0b",     // Radiant Hero Gold (harmonious UI attribute bars)
      secondaryColor: "#ffffff",  // Default: Pure White (preserves red cape texture)
      skinColor: "#fed7aa",       // Peach/Tan (preserved skin tone)
      eyeColor: "#0b5ed7",        // Blue eyes
      visorColor: "#ffc107",      // Yellow/Gold accent
      podiumGlow: "#0b5ed7",      // Blue podium glow
      backdropGradient: "from-blue-950/40 via-red-950/20 to-slate-950",
    },

    // Default cosmetic loadout keys (matching wardrobe catalog IDs)
    defaultEquipment: {
      head: null,
      face: null,
      upperBody: null,
      lowerBody: null,
      footwear: null,
      backAccessory: null,
      effect: 'none',
    },

    // Prepared Phase 4 Character Attributes
    attributes: {
      agility: 95,
      dashSpeed: 98,
      jumpForce: 99,
      recovery: 96,
    },

    // Superman exclusively supports his iconic default tournament suit (no Warrior or Royal modes)
    supportedOutfits: ['outfit-default'],

    // Prepared Phase 3 Shop metadata: Legendary price of 2000 coins
    shopData: {
      owned: false,
      price: 2000,
      currency: "coins",
      featured: true,
    },
  },
];

/**
 * Helper to safely find a character by ID, with graceful fallback.
 */
export const getCharacterById = (id) => {
  return CHARACTERS.find((char) => char.id === id) || CHARACTERS[0];
};
