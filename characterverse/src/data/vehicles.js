/**
 * CharacterVerse - Vehicles & Trail Upgrades Data
 *
 * 3 Premium Vehicles:
 * 1. Ninja Superbike — Common (350 coins)
 * 2. Sports Car — Epic (Locked, Lamborghini-inspired supercar)
 * 3. Rocket — Legendary (Locked, futuristic rocket-ride)
 */

export const VEHICLES = [
  {
    id: 'vehicle-bike',
    name: 'Ninja Superbike',
    modelType: 'bike',
    rarity: 'COMMON',
    price: 400,
    isDefault: false,
    tagline: 'High-Performance Street Racer',
    description: 'Aggressive superbike with aerodynamic fairings, supercharged engine, and wide sport tires. Inspired by elite Japanese hyperbikes.',
    features: ['Aerodynamic full fairings', 'Multi-spoke sport rims', 'Supercharged powertrain'],
    speedRating: 82,
    handlingRating: 94,
    defaultEffect: {
      id: 'effect-dust',
      name: 'Puff Dust Trail',
      description: 'Subtle natural arena dust billowing from the rear tire.',
      icon: 'Wind',
      price: 0,
      type: 'dust',
    },
    upgradeEffect: {
      id: 'bike-sparks',
      name: 'High-Voltage Sparks',
      description: 'Bright electric plasma sparks that violently skip and streak across the pavement.',
      icon: 'Zap',
      price: 250,
      type: 'sparks',
      accentColor: '#38bdf8',
    },
    colors: {
      primary: '#10b981',
      secondary: '#0f172a',
      glow: '#34d399',
      wheels: '#f8fafc',
    },
  },
  {
    id: 'vehicle-car',
    name: 'Apex Supercar',
    modelType: 'car',
    rarity: 'EPIC',
    price: 900,
    isDefault: false,
    tagline: 'Futuristic High-Performance Speeder',
    description: 'Low-slung twin-turbo aero speeder inspired by hypercars, featuring a floating rear wing and neon ground effect.',
    features: ['Aerodynamic wedge chassis', 'Quad low-profile mag wheels', 'Downforce rear spoiler'],
    speedRating: 95,
    handlingRating: 84,
    defaultEffect: {
      id: 'effect-tire-smoke',
      name: 'Tire Friction Smoke',
      description: 'Subtle ground-hugging heat friction haze behind the rear tires.',
      icon: 'Smoke',
      price: 0,
      type: 'tireSmoke',
    },
    upgradeEffect: {
      id: 'car-coins',
      name: 'Astral Coin Trail',
      description: 'Streams of spinning golden virtual coins and radiant star particles bursting from the dual exhausts.',
      icon: 'Coins',
      price: 500,
      type: 'coins',
      accentColor: '#fbbf24',
    },
    colors: {
      primary: '#dc2626',
      secondary: '#18181b',
      glow: '#f43f5e',
      wheels: '#ef4444',
    },
  },
  {
    id: 'vehicle-rocket',
    name: 'Cosmic Titan Rocket',
    modelType: 'rocket',
    rarity: 'LEGENDARY',
    price: 1500,
    isDefault: false,
    tagline: 'Sub-Orbital Jet Pod',
    description: 'Heavy plasma thruster rocket ride with sweeping atmospheric fins and a roaring supersonic engine nozzle.',
    features: ['Swept stabilizer fins', 'Tri-core fusion reactor', 'Sub-orbital boost envelope'],
    speedRating: 100,
    handlingRating: 70,
    defaultEffect: {
      id: 'effect-fire-flame',
      name: 'Blazing Fire Exhaust',
      description: 'Pulsing orange and crimson flame plumes billowing continuously from the rocket bell.',
      icon: 'Flame',
      price: 0,
      type: 'flames',
    },
    upgradeEffect: {
      id: 'rocket-warp',
      name: 'Hyper-Drive Ultra Boost',
      description: 'Supercharged cyan-white warp flame accompanied by supersonic shock diamonds and plasma rings.',
      icon: 'Sparkles',
      price: 750,
      type: 'ultraBoost',
      accentColor: '#a855f7',
    },
    colors: {
      primary: '#7c3aed',
      secondary: '#1e1b4b',
      glow: '#22d3ee',
      accents: '#fbbf24',
    },
  },
];

export const getVehicleById = (id) => {
  return VEHICLES.find((v) => v.id === id) || VEHICLES[0];
};
