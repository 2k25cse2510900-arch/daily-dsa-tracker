/**
 * Rarity tier definitions, color palettes, and visual treatments.
 * Tailored for rich readable contrast on light lavender and white cards.
 */

export const RARITIES = {
  COMMON: {
    key: "common",
    label: "Common",
    textColor: "text-slate-700",
    bgColor: "bg-slate-100",
    borderColor: "border-slate-300",
    glowColor: "rgba(100, 116, 139, 0.25)",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    pillBg: "bg-slate-100",
    accentHex: "#64748b",
  },
  RARE: {
    key: "rare",
    label: "Rare",
    textColor: "text-sky-700",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-300",
    glowColor: "rgba(14, 165, 233, 0.30)",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-300 shadow-xs",
    pillBg: "bg-sky-50",
    accentHex: "#0284c7",
  },
  EPIC: {
    key: "epic",
    label: "Epic",
    textColor: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-300",
    glowColor: "rgba(117, 68, 174, 0.30)",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-300 shadow-xs",
    pillBg: "bg-purple-50",
    accentHex: "#7544ae",
  },
  LEGENDARY: {
    key: "legendary",
    label: "Legendary",
    textColor: "text-amber-800",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-300",
    glowColor: "rgba(200, 136, 50, 0.35)",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-300 shadow-xs",
    pillBg: "bg-amber-50",
    accentHex: "#c88832",
  },
};

export const getRarityConfig = (rarityKey) => {
  if (!rarityKey) return RARITIES.COMMON;
  const upper = rarityKey.toUpperCase();
  return RARITIES[upper] || RARITIES.COMMON;
};
