/**
 * CharacterVerse - Branding & Configuration
 * Centralized to allow quick renaming and theme configuration.
 */

export const BRANDING = {
  appName: "CharacterVerse",
  tagline: "3D Character Customization Studio",
  shortName: "CV Studio",
  version: "Phase 2: Wardrobe & Customization",
  phaseName: "Phase 2 — Interactive Wardrobe & 3D Studio",
  currencies: {
    coins: {
      name: "Gold Coins",
      short: "Coins",
      amount: 0,
      icon: "Coins",
    },
    gems: {
      name: "Astral Gems",
      short: "Gems",
      amount: 140,
      icon: "Gem",
    },
  },
  playerProfile: {
    username: "StarChampion_99",
    level: 14,
    xpCurrent: 680,
    xpTotal: 1000,
    avatarBadge: "CV",
  },
  navigationTabs: [
    {
      id: "studio",
      label: "Studio",
      isInteractive: true,
      badge: null,
      description: "Customize and inspect characters in 3D real-time scene.",
    },
    {
      id: "characters",
      label: "Characters",
      isInteractive: true,
      badge: "3",
      description: "Browse all available roster heroes and unlocked champions.",
    },
    {
      id: "wardrobe",
      label: "Wardrobe",
      isInteractive: true,
      badge: "Customizer",
      description: "Equip hats, visors, jackets, pants, boots, back gear, and custom colors.",
    },
    {
      id: "vehicles",
      label: "Vehicle Store",
      isInteractive: true,
      badge: "3 Rides",
      description: "Unlock futuristic bikes, supercars, rockets, and custom particle trail effects.",
    },
    {
      id: "shop",
      label: "Store",
      isInteractive: true,
      badge: "Garage",
      description: "Buy server-authorized vehicles and trail upgrades with coins.",
    },
    {
      id: "inventory",
      label: "Inventory",
      isInteractive: true,
      badge: "Owned",
      description: "Review owned wardrobe items, outfits, vehicles, and upgrades.",
    },
  ],
};
