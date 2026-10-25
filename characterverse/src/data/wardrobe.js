/**
 * CharacterVerse - Cosmetic Catalog & Wardrobe Data
 *
 * Reusable cosmetic items architecture for Phase 2:
 * - Categories: head, face, upperBody, lowerBody, footwear, backAccessory, effect
 * - Procedural 3D attachment configurations
 * - Rarity tiers, compatibility, ownership, and color configurations
 */

export const WARDROBE_CATEGORIES = [
  { id: 'outfits', label: 'Outfits', icon: 'Sparkles', description: 'Coordinated 3D outfit sets' },
  { id: 'head', label: 'Headwear', icon: 'Crown', description: 'Hats, crowns, helmets, and cyber headgear' },
  { id: 'face', label: 'Face', icon: 'Eye', description: 'Visors, glasses, cybernetics, and masks' },
  { id: 'upperBody', label: 'Upper Body', icon: 'Shirt', description: 'Vests, armor plates, jackets, and decals' },
  { id: 'lowerBody', label: 'Lower Body', icon: 'Footprints', description: 'Pants, cargo joggers, and armored greaves' },
  { id: 'footwear', label: 'Footwear', icon: 'Zap', description: 'Sneakers, hover boots, and punk stompers' },
  { id: 'backAccessory', label: 'Back', icon: 'Shield', description: 'Jetpacks, batteries, wings, and capes' },
  { id: 'effect', label: 'Effects', icon: 'Sparkles', description: 'Cosmetic particle auras and energy halos' },
];

/**
 * 3 Coordinated Outfits: Default (free), Warrior, and Royal.
 * Each outfit bundles curated 3D accessories and a tuned color palette.
 */
export const OUTFITS = [
  {
    id: 'outfit-default',
    name: 'Default (free)',
    badge: 'Standard',
    rarity: 'COMMON',
    price: 'Free',
    description: 'Original tournament battle gear with factory textures.',
    equipment: {
      head: null,
      face: null,
      upperBody: null,
      lowerBody: null,
      footwear: null,
      backAccessory: null,
      effect: null,
    },
    colors: {
      baseColor: '#ffffff',
      secondaryColor: '#ffffff',
      accentColor: '#38bdf8',
      glowColor: '#00f0ff',
    },
    features: ['Original armor textures', 'Protected skin & sword steel', 'Unmodified gear'],
  },
  {
    id: 'outfit-warrior',
    name: 'Warrior',
    badge: 'Combat Set',
    rarity: 'EPIC',
    price: 'Unlocked',
    description: 'Crimson battle armor, twin plasma cyber-horns, heavy titan cuirass, and twin crossed katanas.',
    equipment: {
      head: 'head-cyber-horns',
      face: 'face-cyber-visor',
      upperBody: 'upper-bolted-armor',
      lowerBody: 'lower-track-pants',
      footwear: 'feet-plasma-stompers',
      backAccessory: 'back-cyber-katana',
      effect: 'effect-lightning-storm',
    },
    colors: {
      baseColor: '#fca5a5',
      secondaryColor: '#fee2e2',
      accentColor: '#dc2626',
      glowColor: '#ef4444',
    },
    features: ['Twin Cyber Horns', 'Crossed Katanas', 'Titan Cuirass', 'Crimson Armor Tint'],
  },
  {
    id: 'outfit-royal',
    name: 'Royal',
    badge: 'Regalia Set',
    rarity: 'LEGENDARY',
    price: 'Unlocked',
    description: 'Astral golden spiked crown, ceremonial champion satin cape, star reactor core, and sunforged gold armor.',
    equipment: {
      head: 'head-crown-astral',
      face: 'face-cyber-plate',
      upperBody: 'upper-star-core',
      lowerBody: 'lower-armored-greaves',
      footwear: 'feet-hover-boots',
      backAccessory: 'back-hero-cape',
      effect: 'effect-solar-flare',
    },
    colors: {
      baseColor: '#fde047',
      secondaryColor: '#fef08a',
      accentColor: '#d97706',
      glowColor: '#fbbf24',
    },
    features: ['Astral Golden Crown', 'Champion Satin Cape', 'Star Reactor Core', 'Sunforged Gold Armor'],
  },
];

export const WARDROBE_CATALOG = [
  /* ─────────────────────────────────────────────────────────────
     HEADWEAR (head)
  ───────────────────────────────────────────────────────────── */
  {
    id: 'head-blitz-visor',
    name: 'Blitz Runner Cap',
    category: 'head',
    rarity: 'RARE',
    description: 'Aerodynamic street cap with forward visor brim and shock absorption padding.',
    attachmentType: 'cap',
    defaultColor: '#0284c7',
    accentColor: '#38bdf8',
    isOwned: true,
    compatibleCharacterIds: null, // Compatible with all
  },
  {
    id: 'head-headphones-dj',
    name: 'Sonic Over-Ear Headset',
    category: 'head',
    rarity: 'RARE',
    description: 'Heavy bass tournament headphones that synchronize beat pulses with movement.',
    attachmentType: 'headphones',
    defaultColor: '#38bdf8',
    accentColor: '#0284c7',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'head-crown-astral',
    name: 'Astral Golden Crown',
    category: 'head',
    rarity: 'LEGENDARY',
    description: 'Forged from celestial asteroid ore. Emits radiant solar corona spikes.',
    attachmentType: 'crown',
    defaultColor: '#fbbf24',
    accentColor: '#f59e0b',
    glowColor: '#fbbf24',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'head-halo-nova',
    name: 'Levitating Astral Halo',
    category: 'head',
    rarity: 'LEGENDARY',
    description: 'A zero-gravity plasma ring that hovers perpetually above your champion.',
    attachmentType: 'halo',
    defaultColor: '#fbbf24',
    accentColor: '#fde047',
    glowColor: '#f59e0b',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'head-cyber-horns',
    name: 'Twin Plasma Cyber-Horns',
    category: 'head',
    rarity: 'EPIC',
    description: 'Twin high-voltage horns channeling raw mischievous cyber energy.',
    attachmentType: 'cyberHorns',
    defaultColor: '#f97316',
    accentColor: '#10b981',
    glowColor: '#f97316',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'head-space-helmet',
    name: 'Cosmic Explorer Dome',
    category: 'head',
    rarity: 'EPIC',
    description: 'Pressurized retro-futuristic astronaut bubble dome with golden intake rim.',
    attachmentType: 'spaceHelmet',
    defaultColor: '#6366f1',
    accentColor: '#38bdf8',
    isOwned: true,
    compatibleCharacterIds: null,
  },

  /* ─────────────────────────────────────────────────────────────
     FACE ACCESSORIES (face)
  ───────────────────────────────────────────────────────────── */
  {
    id: 'face-cyber-visor',
    name: 'Neon Cyber Visor',
    category: 'face',
    rarity: 'RARE',
    description: 'Full-width optical HUD display scanning incoming obstacles and race terrain.',
    attachmentType: 'visor',
    defaultColor: '#00f0ff',
    accentColor: '#0284c7',
    glowColor: '#00f0ff',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'face-punk-goggles',
    name: 'Industrial Bolt Goggles',
    category: 'face',
    rarity: 'RARE',
    description: 'Dual brass-trimmed blast lenses designed to withstand neon sparks and explosions.',
    attachmentType: 'goggles',
    defaultColor: '#f97316',
    accentColor: '#334155',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'face-rebel-shades',
    name: 'Rebel Tint Shades',
    category: 'face',
    rarity: 'COMMON',
    description: 'Angular dark sunglasses with polarized anti-glare reflection.',
    attachmentType: 'glasses',
    defaultColor: '#1e293b',
    accentColor: '#38bdf8',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'face-ninja-mask',
    name: 'Shadow Runner Half-Mask',
    category: 'face',
    rarity: 'EPIC',
    description: 'Lightweight nanofiber face mask filtering toxic arena exhaust fumes.',
    attachmentType: 'mask',
    defaultColor: '#0f172a',
    accentColor: '#8b5cf6',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'face-cyber-plate',
    name: 'Robotic Jaw Breather',
    category: 'face',
    rarity: 'LEGENDARY',
    description: 'Titanium cybernetic lower-jaw augment with glowing ventilation valves.',
    attachmentType: 'faceplate',
    defaultColor: '#e2e8f0',
    accentColor: '#fbbf24',
    glowColor: '#fbbf24',
    isOwned: true,
    compatibleCharacterIds: null,
  },

  /* ─────────────────────────────────────────────────────────────
     UPPER BODY (upperBody)
  ───────────────────────────────────────────────────────────── */
  {
    id: 'upper-racing-vest',
    name: 'Acrobat Racing Vest',
    category: 'upperBody',
    rarity: 'RARE',
    description: 'High-visibility speedway stripes with kinetic dampeners.',
    attachmentType: 'stripes',
    defaultColor: '#38bdf8',
    accentColor: '#0284c7',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'upper-star-core',
    name: 'Astral Star Reactor',
    category: 'upperBody',
    rarity: 'LEGENDARY',
    description: 'Glowing core harness channeling mini stellar fusion power.',
    attachmentType: 'starCore',
    defaultColor: '#fbbf24',
    accentColor: '#4f46e5',
    glowColor: '#fbbf24',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'upper-lightning-bolt',
    name: 'Overcharge Lightning Decal',
    category: 'upperBody',
    rarity: 'EPIC',
    description: 'Electrified chest insignia indicating high kinetic discharge capability.',
    attachmentType: 'lightning',
    defaultColor: '#f97316',
    accentColor: '#10b981',
    glowColor: '#f97316',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'upper-bolted-armor',
    name: 'Titan Heavy Cuirass',
    category: 'upperBody',
    rarity: 'EPIC',
    description: 'Reinforced dual-plate chest plating with heavy bolted shoulder pauldron trim.',
    attachmentType: 'armorPlate',
    defaultColor: '#334155',
    accentColor: '#f59e0b',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'upper-tactical-vest',
    name: 'Stealth Tactical Rig',
    category: 'upperBody',
    rarity: 'COMMON',
    description: 'Durable utility vest with harness straps and dual supply pouches.',
    attachmentType: 'vest',
    defaultColor: '#1e293b',
    accentColor: '#64748b',
    isOwned: true,
    compatibleCharacterIds: null,
  },

  /* ─────────────────────────────────────────────────────────────
     LOWER BODY (lowerBody)
  ───────────────────────────────────────────────────────────── */
  {
    id: 'lower-track-pants',
    name: 'Flex Track Joggers',
    category: 'lowerBody',
    rarity: 'COMMON',
    description: 'Streamlined athletic pants with neon side racing stripes.',
    attachmentType: 'trackPants',
    defaultColor: '#0f172a',
    accentColor: '#38bdf8',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'lower-armored-greaves',
    name: 'Graviton Leg Greaves',
    category: 'lowerBody',
    rarity: 'LEGENDARY',
    description: 'Heavy star-alloy thigh and knee protection with glowing pressure seals.',
    attachmentType: 'greaves',
    defaultColor: '#9333ea',
    accentColor: '#fbbf24',
    glowColor: '#fbbf24',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'lower-cargo-joggers',
    name: 'Patched Cargo Trousers',
    category: 'lowerBody',
    rarity: 'RARE',
    description: 'Tough ripstop cargo trousers with stitched utility knee patches.',
    attachmentType: 'cargoJoggers',
    defaultColor: '#1e293b',
    accentColor: '#f97316',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'lower-cyber-stripes',
    name: 'Cyber Circuit Pants',
    category: 'lowerBody',
    rarity: 'EPIC',
    description: 'Conductive fiber pants glowing with electric circuit path tracers.',
    attachmentType: 'cyberPants',
    defaultColor: '#090d16',
    accentColor: '#00f0ff',
    glowColor: '#00f0ff',
    isOwned: true,
    compatibleCharacterIds: null,
  },

  /* ─────────────────────────────────────────────────────────────
     FOOTWEAR (footwear)
  ───────────────────────────────────────────────────────────── */
  {
    id: 'feet-aero-kicks',
    name: 'Aero Glide Kicks',
    category: 'footwear',
    rarity: 'RARE',
    description: 'Chunky high-cushion rubber running sneakers built for hard arena impacts.',
    attachmentType: 'sneakers',
    defaultColor: '#38bdf8',
    accentColor: '#0284c7',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'feet-hover-boots',
    name: 'Graviton Hover Boots',
    category: 'footwear',
    rarity: 'LEGENDARY',
    description: 'Zero-friction hover thruster pads emitting a perpetual anti-grav ring.',
    attachmentType: 'hoverBoots',
    defaultColor: '#4f46e5',
    accentColor: '#fbbf24',
    glowColor: '#fbbf24',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'feet-plasma-stompers',
    name: 'Plasma Heavy Stompers',
    category: 'footwear',
    rarity: 'EPIC',
    description: 'Oversized reinforced combat boots that shake the platform on landings.',
    attachmentType: 'stompers',
    defaultColor: '#1e293b',
    accentColor: '#f97316',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'feet-speed-wings',
    name: 'Winged Hermes Cleats',
    category: 'footwear',
    rarity: 'RARE',
    description: 'Lightweight track boots with aerodynamic side stabilizer wings.',
    attachmentType: 'speedKicks',
    defaultColor: '#e0e7ff',
    accentColor: '#6366f1',
    isOwned: true,
    compatibleCharacterIds: null,
  },

  /* ─────────────────────────────────────────────────────────────
     BACK ACCESSORIES (backAccessory)
  ───────────────────────────────────────────────────────────── */
  {
    id: 'back-dual-thruster',
    name: 'Cosmic Micro-Thruster',
    category: 'backAccessory',
    rarity: 'LEGENDARY',
    description: 'Dual orbital booster nozzles providing explosive forward jump thrust.',
    attachmentType: 'thrusterPack',
    defaultColor: '#fbbf24',
    accentColor: '#4f46e5',
    glowColor: '#fbbf24',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'back-flux-battery',
    name: 'Neon Flux Battery',
    category: 'backAccessory',
    rarity: 'EPIC',
    description: 'High-density energy capacitor pulsing with green plasma recharge bars.',
    attachmentType: 'batteryPack',
    defaultColor: '#10b981',
    accentColor: '#00ff99',
    glowColor: '#00ff99',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'back-energy-wings',
    name: 'Holographic Plasma Wings',
    category: 'backAccessory',
    rarity: 'LEGENDARY',
    description: 'Hard-light energy wing blades that fan out behind your champion.',
    attachmentType: 'energyWings',
    defaultColor: '#00f0ff',
    accentColor: '#8b5cf6',
    glowColor: '#00f0ff',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'back-cyber-katana',
    name: 'Twin Cyber Blades',
    category: 'backAccessory',
    rarity: 'EPIC',
    description: 'Crossed ceremonial composite blades sheathed in carbon fiber.',
    attachmentType: 'katana',
    defaultColor: '#1e293b',
    accentColor: '#f43f5e',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'back-hero-cape',
    name: 'Champion Satin Cape',
    category: 'backAccessory',
    rarity: 'RARE',
    description: 'Flowing tournament mantle pinned with golden shoulder brooches.',
    attachmentType: 'cape',
    defaultColor: '#dc2626',
    accentColor: '#fef08a',
    isOwned: true,
    compatibleCharacterIds: null,
  },

  /* ─────────────────────────────────────────────────────────────
     EFFECTS (effect)
  ───────────────────────────────────────────────────────────── */
  {
    id: 'effect-cyan-sparks',
    name: 'Static Spark Trails',
    category: 'effect',
    rarity: 'RARE',
    description: 'Orbiting electric sparks leaping from the champion into the podium ring.',
    attachmentType: 'cyanSparks',
    defaultColor: '#38bdf8',
    glowColor: '#00f0ff',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'effect-solar-flare',
    name: 'Solar Flare Corona',
    category: 'effect',
    rarity: 'LEGENDARY',
    description: 'Rippling astral energy rings pulsating continuously outward.',
    attachmentType: 'solarRings',
    defaultColor: '#fbbf24',
    glowColor: '#f59e0b',
    isOwned: true,
    compatibleCharacterIds: null,
  },
  {
    id: 'effect-lightning-storm',
    name: 'Plasma Arc Overload',
    category: 'effect',
    rarity: 'EPIC',
    description: 'Jagged neon lightning arcs crackling around the character silhouette.',
    attachmentType: 'lightningArcs',
    defaultColor: '#f97316',
    glowColor: '#10b981',
    isOwned: true,
    compatibleCharacterIds: null,
  },
];

/**
 * Pre-set color palettes for the color customizer.
 * Tuned with high luminance so model textures remain bright, detailed, and crisp.
 */
export const COLOR_PALETTES = [
  {
    name: 'Original Classic',
    base: '#ffffff',     // 100% natural GLB texture colors
    accent: '#38bdf8',
    secondary: '#ffffff',
    glow: '#00f0ff',
    isOriginal: true,
  },
  {
    name: 'Azure Champion',
    base: '#7dd3fc',     // Crisp sky blue armor tint
    accent: '#0284c7',
    secondary: '#e0f2fe',
    glow: '#38bdf8',
  },
  {
    name: 'Astral Gold',
    base: '#fde047',     // Sunforged gold armor tint
    accent: '#d97706',
    secondary: '#fef08a',
    glow: '#fbbf24',
  },
  {
    name: 'Ruby Knight',
    base: '#fca5a5',     // Vibrant crimson armor tint
    accent: '#dc2626',
    secondary: '#fee2e2',
    glow: '#ef4444',
  },
  {
    name: 'Emerald Warden',
    base: '#86efac',     // Vibrant jade/forest armor tint
    accent: '#059669',
    secondary: '#dcfce7',
    glow: '#10b981',
  },
  {
    name: 'Amethyst Royal',
    base: '#d8b4fe',     // Royal violet armor tint
    accent: '#7c3aed',
    secondary: '#f3e8ff',
    glow: '#a855f7',
  },
  {
    name: 'Silver Aegis',
    base: '#e2e8f0',     // Polished steel armor tint
    accent: '#475569',
    secondary: '#f8fafc',
    glow: '#64748b',
  },
];

export const getCatalogItemById = (id) => {
  return WARDROBE_CATALOG.find((item) => item.id === id) || null;
};

export const getOutfitById = (id) => {
  return OUTFITS.find((outfit) => outfit.id === id) || OUTFITS[0];
};

export const getItemsByCategory = (category) => {
  return WARDROBE_CATALOG.filter((item) => item.category === category);
};
