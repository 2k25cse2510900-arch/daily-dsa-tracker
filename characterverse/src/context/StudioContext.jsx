import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { CHARACTERS, getCharacterById } from '../data/characters';
import { BRANDING } from '../config/branding';
import { WARDROBE_CATALOG, getCatalogItemById, OUTFITS, getOutfitById } from '../data/wardrobe';
import { VEHICLES, getVehicleById } from '../data/vehicles';

const StudioContext = createContext(null);

// Build initial equipment from character data
const buildInitialEquipment = () => {
  const map = {};
  CHARACTERS.forEach((c) => {
    map[c.id] = { ...(c.defaultEquipment || {}) };
  });
  return map;
};

const INITIAL_EQUIPPED_COSMETICS = buildInitialEquipment();

// Initial default colors per character
const getInitialColors = () => {
  const map = {};
  CHARACTERS.forEach((c) => {
    map[c.id] = {
      baseColor: c.colors.baseColor,
      accentColor: c.colors.accentColor,
      secondaryColor: c.colors.secondaryColor,
      glowColor: c.colors.podiumGlow,
    };
  });
  return map;
};

const EMPTY_OWNED_VEHICLES = { 'vehicle-bike': false, 'vehicle-car': false, 'vehicle-rocket': false };
const EMPTY_OWNED_UPGRADES = { 'bike-sparks': false, 'car-coins': false, 'rocket-warp': false };

async function characterVerseRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'CharacterVerse request failed.');
  return body;
}

export const StudioProvider = ({ children, navigationTarget = null }) => {
  const [selectedCharacterId, setSelectedCharacterId] = useState(() => {
    if (typeof window !== 'undefined') {
      const char = new URLSearchParams(window.location.search).get('char');
      if (char && CHARACTERS.some((c) => c.id === char)) return char;
    }
    return 'buster-blitz';
  });
  const [equippedCharacterId, setEquippedCharacterId] = useState('buster-blitz');
  const [ownedCharacterIds, setOwnedCharacterIds] = useState(() =>
    CHARACTERS.filter((c) => c.shopData?.owned !== false).map((c) => c.id)
  );
  const [ownedCosmeticIds, setOwnedCosmeticIds] = useState([]);
  const [ownedOutfitIds, setOwnedOutfitIds] = useState(['outfit-default']);
  const [activeTab, setActiveTab] = useState(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    return ['studio', 'characters', 'wardrobe', 'vehicles', 'shop', 'inventory'].includes(tab) ? tab : 'studio';
  });
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [cameraResetTrigger, setCameraResetTrigger] = useState(0);
  const [zoomAction, setZoomAction] = useState({ delta: 0, count: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [rarityFilter, setRarityFilter] = useState('ALL');

  // Wardrobe UI state (defaults to outfits selector)
  const [activeWardrobeCategory, setActiveWardrobeCategory] = useState('outfits');
  const [wardrobeSearchQuery, setWardrobeSearchQuery] = useState('');
  const [wardrobeRarityFilter, setWardrobeRarityFilter] = useState('ALL');
  const [selectedWardrobeItemId, setSelectedWardrobeItemId] = useState('head-headphones-dj');

  // Equipped cosmetics per character: { [charId]: { head: id, face: id, ... } }
  const [equippedCosmetics, setEquippedCosmetics] = useState(INITIAL_EQUIPPED_COSMETICS);

  // Active preview overrides: { [charId]: { [slot]: itemId } }
  const [previewCosmetics, setPreviewCosmetics] = useState({});

  // Dynamic custom colors per character: { [charId]: { baseColor, accentColor, secondaryColor, glowColor } }
  const [customColors, setCustomColors] = useState(getInitialColors);

  // Active outfit tracking: { [charId]: outfitId }
  const [equippedOutfits, setEquippedOutfits] = useState({
    'buster-blitz': 'outfit-default',
  });
  const [previewOutfitId, setPreviewOutfitId] = useState(null);
  const [previewColors, setPreviewColors] = useState({});

  // ─── Virtual Coins & Vehicle System ───
  const [coins, setCoins] = useState(BRANDING.currencies.coins.amount);
  const [rewardHistory, setRewardHistory] = useState([]);
  const [walletTotals, setWalletTotals] = useState({ earned: 0, spent: 0 });
  const [ownedVehicles, setOwnedVehicles] = useState(EMPTY_OWNED_VEHICLES);
  const [ownedVehicleUpgrades, setOwnedVehicleUpgrades] = useState(EMPTY_OWNED_UPGRADES);
  const [equippedVehicleId, setEquippedVehicleId] = useState(null);
  const [equippedVehicleUpgrades, setEquippedVehicleUpgrades] = useState({ 'vehicle-bike': null, 'vehicle-car': null, 'vehicle-rocket': null });
  const [previewVehicleId, setPreviewVehicleId] = useState(null);
  const [previewVehicleUpgradeId, setPreviewVehicleUpgradeId] = useState(null);
  const [isDrivingMode, setIsDrivingMode] = useState(false);

  const [profileReady, setProfileReady] = useState(false);

  // Modal for Phase 3/5 placeholders
  const [placeholderModal, setPlaceholderModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    targetPhase: '',
  });

  // Floating feedback toast
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success',
  });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 2800);
  };

  const applyServerProfile = (profile) => {
    const appearance = profile.appearance || {};
    const defaultOwned = CHARACTERS.filter((c) => c.shopData?.owned !== false).map((c) => c.id);
    const serverOwned = profile.inventory?.characters || ['buster-blitz'];
    const mergedOwned = Array.from(new Set([...defaultOwned, ...serverOwned]));
    setCoins(profile.wallet?.coins ?? 0);
    setOwnedCharacterIds(mergedOwned);
    setOwnedCosmeticIds(profile.inventory?.cosmetics || []);
    setOwnedOutfitIds(profile.inventory?.outfits || ['outfit-default']);
    setOwnedVehicles(Object.fromEntries(VEHICLES.map((vehicle) => [vehicle.id, (profile.inventory?.vehicles || []).includes(vehicle.id)])));
    setOwnedVehicleUpgrades(Object.fromEntries(VEHICLES.map((vehicle) => [vehicle.upgradeEffect.id, (profile.inventory?.vehicleUpgrades || []).includes(vehicle.upgradeEffect.id)])));
    const urlChar = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('char') : null;
    const initialChar = urlChar && CHARACTERS.some((c) => c.id === urlChar) ? urlChar : (appearance.selectedCharacterId || 'buster-blitz');
    setSelectedCharacterId(initialChar);
    setEquippedCharacterId(appearance.equippedCharacterId || 'buster-blitz');
    setEquippedCosmetics(appearance.equippedCosmetics || INITIAL_EQUIPPED_COSMETICS);
    setEquippedOutfits(appearance.equippedOutfits || { 'buster-blitz': 'outfit-default' });
    setCustomColors(appearance.customColors || getInitialColors());
    setEquippedVehicleId(appearance.equippedVehicleId || null);
    setEquippedVehicleUpgrades(appearance.equippedVehicleUpgrades || { 'vehicle-bike': null, 'vehicle-car': null, 'vehicle-rocket': null });
  };

  useEffect(() => {
    let active = true;
    characterVerseRequest('/api/characterverse/me')
      .then((profile) => { if (active) { applyServerProfile(profile); setProfileReady(true); } })
      .catch((error) => { if (active) showToast(error.message, 'error'); });
    characterVerseRequest('/api/characterverse/me/rewards')
      .then((wallet) => { if (active) { setCoins(wallet.balance); setRewardHistory(Array.isArray(wallet.history) ? wallet.history : []); setWalletTotals({ earned: wallet.totalEarned || 0, spent: wallet.totalSpent || 0 }); } })
      .catch(() => { /* Profile remains usable when reward history is temporarily unavailable. */ });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!navigationTarget) return undefined;
    const receiveTab = (event) => {
      const tab = event.detail?.tab;
      if (['studio', 'characters', 'wardrobe', 'vehicles', 'shop', 'inventory'].includes(tab)) setActiveTab(tab);
    };
    navigationTarget.addEventListener('characterverse-tab', receiveTab);
    return () => navigationTarget.removeEventListener('characterverse-tab', receiveTab);
  }, [navigationTarget]);

  useEffect(() => {
    if (!profileReady) return undefined;
    const timer = setTimeout(() => {
      const sanitizedCosmetics = {};
      const sanitizedOutfits = {};
      const sanitizedColors = {};
      ownedCharacterIds.forEach((charId) => {
        if (equippedCosmetics[charId]) sanitizedCosmetics[charId] = equippedCosmetics[charId];
        if (equippedOutfits[charId]) sanitizedOutfits[charId] = equippedOutfits[charId];
        if (customColors[charId]) sanitizedColors[charId] = customColors[charId];
      });

      const payload = {
        equippedCharacterId: ownedCharacterIds.includes(equippedCharacterId) ? equippedCharacterId : (ownedCharacterIds[0] || 'buster-blitz'),
        equippedCosmetics: sanitizedCosmetics,
        equippedOutfits: sanitizedOutfits,
        customColors: sanitizedColors,
        equippedVehicleId,
        equippedVehicleUpgrades,
      };
      if (ownedCharacterIds.includes(selectedCharacterId)) {
        payload.selectedCharacterId = selectedCharacterId;
      }
      characterVerseRequest('/api/characterverse/me/appearance', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }).catch((error) => showToast(error.message, 'error'));
    }, 350);
    return () => clearTimeout(timer);
  }, [profileReady, selectedCharacterId, equippedCharacterId, equippedCosmetics, equippedOutfits, customColors, equippedVehicleId, equippedVehicleUpgrades, ownedCharacterIds]);

  useEffect(() => {
    const receiveTab = (event) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'characterverse-tab') return;
      if (['studio', 'characters', 'wardrobe', 'vehicles', 'shop', 'inventory'].includes(event.data.tab)) setActiveTab(event.data.tab);
    };
    window.addEventListener('message', receiveTab);
    return () => window.removeEventListener('message', receiveTab);
  }, []);

  const selectedCharacter = useMemo(() => {
    return getCharacterById(selectedCharacterId);
  }, [selectedCharacterId]);

  const equippedCharacter = useMemo(() => {
    return getCharacterById(equippedCharacterId);
  }, [equippedCharacterId]);

  const availableOutfits = useMemo(() => {
    if (selectedCharacter?.supportedOutfits) {
      return OUTFITS.filter((o) => selectedCharacter.supportedOutfits.includes(o.id));
    }
    return OUTFITS;
  }, [selectedCharacter]);

  const selectCharacter = (id) => {
    const target = CHARACTERS.find((c) => c.id === id);
    if (!target) {
      showToast('Unknown character selected.', 'error');
      return;
    }
    setSelectedCharacterId(id);
    // Clear any temporary preview overrides when switching character
    setPreviewCosmetics((prev) => ({ ...prev, [id]: {} }));
    setPreviewColors((prev) => ({ ...prev, [id]: undefined }));
    setPreviewOutfitId(null);
  };

  const equipCurrentCharacter = () => {
    if (!ownedCharacterIds.includes(selectedCharacterId)) {
      showToast(`${selectedCharacter.name} must be unlocked before equipping.`, 'error');
      return;
    }
    setEquippedCharacterId(selectedCharacterId);
    showToast(`Equipped ${selectedCharacter.name} as active hero!`, 'success');
  };

  const unlockCharacter = async (characterId) => {
    const char = getCharacterById(characterId);
    if (!char) return;
    if (ownedCharacterIds.includes(characterId)) {
      showToast(`You already own ${char.name}!`, 'info');
      return;
    }
    try {
      const updated = await characterVerseRequest(`/api/characterverse/me/purchases/character/${encodeURIComponent(characterId)}`, {
        method: 'POST',
        body: '{}',
      });
      applyServerProfile(updated);
      showToast(`Unlocked and equipped ${char.name}!`, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const triggerCameraReset = () => {
    setCameraResetTrigger((prev) => prev + 1);
    showToast('Camera reset to center view', 'info');
  };

  const triggerZoomIn = () => {
    setZoomAction((prev) => ({ delta: -0.5, count: prev.count + 1 }));
  };

  const triggerZoomOut = () => {
    setZoomAction((prev) => ({ delta: 0.5, count: prev.count + 1 }));
  };

  const toggleAutoRotate = () => {
    setIsAutoRotating((prev) => {
      const next = !prev;
      showToast(next ? 'Turntable Auto-Rotation enabled' : 'Turntable Auto-Rotation paused', 'info');
      return next;
    });
  };

  const openPlaceholderModal = (tabItem) => {
    setPlaceholderModal({
      isOpen: true,
      title: tabItem.label,
      description: tabItem.description,
      targetPhase: tabItem.badge || 'Future Phase',
    });
  };

  const closePlaceholderModal = () => {
    setPlaceholderModal((prev) => ({ ...prev, isOpen: false }));
  };

  /* ─────────────────────────────────────────────────────────────
     WARDROBE & EQUIPMENT LOGIC
  ───────────────────────────────────────────────────────────── */

  // Check if an item is compatible with a given character
  const checkCompatibility = (item, charId = selectedCharacterId) => {
    if (!item) return { compatible: false, reason: 'Item not found' };
    if (!item.compatibleCharacterIds || item.compatibleCharacterIds.length === 0) {
      return { compatible: true };
    }
    const isAllowed = item.compatibleCharacterIds.includes(charId);
    const targetChar = getCharacterById(charId);
    return {
      compatible: isAllowed,
      reason: isAllowed
        ? null
        : `This cosmetic is exclusive to ${item.compatibleCharacterIds.map((id) => getCharacterById(id)?.name).join(', ')} and cannot be worn by ${targetChar.name}.`,
    };
  };

  // Preview an item in 3D viewer (non-permanent until equipped)
  const previewItem = (item) => {
    if (!item) return;
    setSelectedWardrobeItemId(item.id);

    const check = checkCompatibility(item, selectedCharacterId);
    if (!check.compatible) {
      showToast(check.reason, 'error');
      return;
    }

    setPreviewCosmetics((prev) => ({
      ...prev,
      [selectedCharacterId]: {
        ...(prev[selectedCharacterId] || {}),
        [item.category]: item.id,
      },
    }));
  };

  // Permanently equip an item to its slot for the current character
  const equipItem = (item) => {
    if (!item) return;
    const check = checkCompatibility(item, selectedCharacterId);
    if (!check.compatible) {
      showToast(check.reason, 'error');
      return;
    }

    setEquippedCosmetics((prev) => ({
      ...prev,
      [selectedCharacterId]: {
        ...(prev[selectedCharacterId] || {}),
        [item.category]: item.id,
      },
    }));

    // Also update preview
    setPreviewCosmetics((prev) => ({
      ...prev,
      [selectedCharacterId]: {
        ...(prev[selectedCharacterId] || {}),
        [item.category]: item.id,
      },
    }));

    setEquippedOutfits((prev) => ({
      ...prev,
      [selectedCharacterId]: null,
    }));

    showToast(`Equipped ${item.name} to ${item.category}!`, 'success');
  };

  // Unequip a slot for current character
  const unequipSlot = (slotKey) => {
    setEquippedCosmetics((prev) => ({
      ...prev,
      [selectedCharacterId]: {
        ...(prev[selectedCharacterId] || {}),
        [slotKey]: null,
      },
    }));

    setPreviewCosmetics((prev) => ({
      ...prev,
      [selectedCharacterId]: {
        ...(prev[selectedCharacterId] || {}),
        [slotKey]: null,
      },
    }));

    setEquippedOutfits((prev) => ({
      ...prev,
      [selectedCharacterId]: null,
    }));

    showToast(`Unequipped ${slotKey} accessory`, 'info');
  };

  // Reset appearance back to character factory defaults
  const resetCharacterAppearance = () => {
    const defaultEquipment = INITIAL_EQUIPPED_COSMETICS[selectedCharacterId] || {};
    const baseColors = {
      baseColor: selectedCharacter.colors.baseColor,
      accentColor: selectedCharacter.colors.accentColor,
      secondaryColor: selectedCharacter.colors.secondaryColor,
      glowColor: selectedCharacter.colors.podiumGlow,
    };

    setEquippedCosmetics((prev) => ({
      ...prev,
      [selectedCharacterId]: { ...defaultEquipment },
    }));

    setPreviewCosmetics((prev) => ({
      ...prev,
      [selectedCharacterId]: {},
    }));

    setCustomColors((prev) => ({
      ...prev,
      [selectedCharacterId]: { ...baseColors },
    }));

    setEquippedOutfits((prev) => ({
      ...prev,
      [selectedCharacterId]: 'outfit-default',
    }));

    setPreviewOutfitId(null);
    setPreviewColors((prev) => ({
      ...prev,
      [selectedCharacterId]: undefined,
    }));

    showToast(`Reset ${selectedCharacter.name} to default appearance!`, 'info');
  };

  /* ─────────────────────────────────────────────────────────────
     OUTFIT SELECTION & PREVIEW LOGIC
  ───────────────────────────────────────────────────────────── */

  const previewOutfit = (outfit) => {
    if (!outfit) return;
    if (selectedCharacter?.supportedOutfits && !selectedCharacter.supportedOutfits.includes(outfit.id)) {
      showToast(`${selectedCharacter.name} does not support this outfit.`, 'error');
      return;
    }
    setPreviewOutfitId(outfit.id);
    setPreviewCosmetics((prev) => ({
      ...prev,
      [selectedCharacterId]: { ...outfit.equipment },
    }));
    setPreviewColors((prev) => ({
      ...prev,
      [selectedCharacterId]: { ...outfit.colors },
    }));
    showToast(`Previewing ${outfit.name} outfit in 3D`, 'info');
  };

  const equipOutfit = (outfit) => {
    if (!outfit) return;
    if (selectedCharacter?.supportedOutfits && !selectedCharacter.supportedOutfits.includes(outfit.id)) {
      showToast(`${selectedCharacter.name} does not support this outfit.`, 'error');
      return;
    }
    if (!outfit.isFree && !ownedOutfitIds.includes(outfit.id)) {
      showToast(`Unlock ${outfit.name} (${outfit.priceCoins} coins) before equipping!`, 'error');
      return;
    }
    setEquippedOutfits((prev) => ({
      ...prev,
      [selectedCharacterId]: outfit.id,
    }));
    setEquippedCosmetics((prev) => ({
      ...prev,
      [selectedCharacterId]: { ...outfit.equipment },
    }));
    setPreviewCosmetics((prev) => ({
      ...prev,
      [selectedCharacterId]: { ...outfit.equipment },
    }));
    setCustomColors((prev) => ({
      ...prev,
      [selectedCharacterId]: { ...outfit.colors },
    }));
    setPreviewColors((prev) => ({
      ...prev,
      [selectedCharacterId]: undefined,
    }));
    setPreviewOutfitId(null);
    showToast(`Equipped ${outfit.name} outfit!`, 'success');
  };

  const unlockOutfit = async (outfitId) => {
    const outfit = OUTFITS.find((o) => o.id === outfitId);
    if (!outfit) {
      showToast('Unknown outfit.', 'error');
      return;
    }
    if (selectedCharacter?.supportedOutfits && !selectedCharacter.supportedOutfits.includes(outfitId)) {
      showToast(`${selectedCharacter.name} does not support this outfit.`, 'error');
      return;
    }
    if (outfit.isFree || ownedOutfitIds.includes(outfitId)) {
      showToast(`You already own the ${outfit.name} outfit!`, 'info');
      return;
    }
    const price = outfit.priceCoins || (outfitId === 'outfit-warrior' ? 250 : outfitId === 'outfit-royal' ? 500 : 0);
    if (coins < price) {
      showToast(`Insufficient coins! You need ${price} coins for ${outfit.name} (have ${coins.toLocaleString()}).`, 'error');
      return;
    }
    try {
      const updatedProfile = await characterVerseRequest(`/api/characterverse/me/purchases/outfit/${encodeURIComponent(outfitId)}`, {
        method: 'POST',
        body: '{}',
      });
      applyServerProfile(updatedProfile);
      showToast(`Unlocked the ${outfit.name} outfit for ${price} coins!`, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const clearOutfitPreview = () => {
    setPreviewOutfitId(null);
    setPreviewCosmetics((prev) => ({
      ...prev,
      [selectedCharacterId]: {},
    }));
    setPreviewColors((prev) => ({
      ...prev,
      [selectedCharacterId]: undefined,
    }));
    showToast('Restored equipped outfit', 'info');
  };

  /* ─────────────────────────────────────────────────────────────
     COLOR CUSTOMIZATION LOGIC
  ───────────────────────────────────────────────────────────── */

  const setCustomColor = (colorKey, hexValue) => {
    setCustomColors((prev) => ({
      ...prev,
      [selectedCharacterId]: {
        ...(prev[selectedCharacterId] || {}),
        [colorKey]: hexValue,
      },
    }));
  };

  const applyColorPalette = (palette) => {
    setCustomColors((prev) => ({
      ...prev,
      [selectedCharacterId]: {
        baseColor: palette.base,
        accentColor: palette.accent,
        secondaryColor: palette.secondary,
        glowColor: palette.glow,
      },
    }));
    showToast(`Applied ${palette.name} color palette!`, 'success');
  };

  const resetCustomColors = () => {
    setCustomColors((prev) => ({
      ...prev,
      [selectedCharacterId]: {
        baseColor: selectedCharacter.colors.baseColor,
        accentColor: selectedCharacter.colors.accentColor,
        secondaryColor: selectedCharacter.colors.secondaryColor,
        glowColor: selectedCharacter.colors.podiumGlow,
      },
    }));
    showToast(`Reset colors to ${selectedCharacter.name} defaults!`, 'info');
  };

  /* ─────────────────────────────────────────────────────────────
     VEHICLES & TRAIL UPGRADES LOGIC
  ───────────────────────────────────────────────────────────── */

  const previewVehicle = (vehicleId, upgradeId = null) => {
    const v = getVehicleById(vehicleId);
    setPreviewVehicleId(vehicleId);
    setPreviewVehicleUpgradeId(upgradeId);
    showToast(`Previewing ${v.name} in 3D!`, 'info');
  };

  const clearVehiclePreview = () => {
    setPreviewVehicleId(null);
    setPreviewVehicleUpgradeId(null);
    showToast('Restored equipped vehicle configuration', 'info');
  };

  const unlockVehicle = async (vehicleId) => {
    const v = getVehicleById(vehicleId);
    if (!v) return;
    if (ownedVehicles[vehicleId]) {
      showToast(`You already own ${v.name}!`, 'info');
      return;
    }
    try {
      applyServerProfile(await characterVerseRequest(`/api/characterverse/me/purchases/vehicle/${encodeURIComponent(vehicleId)}`, { method: 'POST', body: '{}' }));
      if (previewVehicleId === vehicleId) { setPreviewVehicleId(null); setPreviewVehicleUpgradeId(null); }
      showToast(`Unlocked and equipped ${v.name}!`, 'success');
    } catch (error) { showToast(error.message, 'error'); }
  };

  const equipVehicle = (vehicleId) => {
    const v = getVehicleById(vehicleId);
    if (!v) return;
    if (!ownedVehicles[vehicleId]) {
      showToast(`Must unlock ${v.name} before equipping!`, 'error');
      return;
    }
    setEquippedVehicleId(vehicleId);
    if (previewVehicleId) {
      setPreviewVehicleId(null);
      setPreviewVehicleUpgradeId(null);
    }
    showToast(`Equipped ${v.name}!`, 'success');
  };

  const unequipVehicle = () => {
    setEquippedVehicleId(null);
    setPreviewVehicleId(null);
    setPreviewVehicleUpgradeId(null);
    showToast('Unequipped vehicle (on foot)', 'info');
  };

  const unlockVehicleUpgrade = async (vehicleId, upgradeKey) => {
    const v = getVehicleById(vehicleId);
    if (!v || !v.upgradeEffect || v.upgradeEffect.id !== upgradeKey) return;
    const upgrade = v.upgradeEffect;
    if (ownedVehicleUpgrades[upgradeKey]) {
      showToast(`You already own ${upgrade.name}!`, 'info');
      return;
    }
    try {
      applyServerProfile(await characterVerseRequest(`/api/characterverse/me/purchases/upgrade/${encodeURIComponent(upgradeKey)}`, { method: 'POST', body: '{}' }));
      if (previewVehicleUpgradeId === upgradeKey) setPreviewVehicleUpgradeId(null);
      showToast(`Unlocked and equipped ${upgrade.name}!`, 'success');
    } catch (error) { showToast(error.message, 'error'); }
  };

  const toggleVehicleUpgrade = (vehicleId, upgradeKey) => {
    if (!ownedVehicleUpgrades[upgradeKey]) {
      showToast('Upgrade must be purchased first!', 'error');
      return;
    }
    const current = equippedVehicleUpgrades[vehicleId];
    const next = current === upgradeKey ? null : upgradeKey;
    setEquippedVehicleUpgrades((prev) => ({ ...prev, [vehicleId]: next }));
    if (previewVehicleId === vehicleId) {
      setPreviewVehicleUpgradeId(next);
    }
    showToast(next ? 'Equipped upgraded trail effect!' : 'Reverted to default trail effect', 'info');
  };

  const toggleDrivingMode = () => {
    setIsDrivingMode((prev) => {
      const next = !prev;
      showToast(next ? 'Active Run & Drive Mode enabled' : 'Returned to Idle Showcase', 'info');
      return next;
    });
  };

  const resetVehicleLoadout = () => {
    setEquippedVehicleId(null);
    setEquippedVehicleUpgrades({
      'vehicle-bike': null,
      'vehicle-car': null,
      'vehicle-rocket': null,
    });
    setPreviewVehicleId(null);
    setPreviewVehicleUpgradeId(null);
    showToast('Unequipped all vehicles (on foot)', 'info');
  };

  /* ─────────────────────────────────────────────────────────────
     EFFECTIVE 3D CHARACTER (merges colors & equipped items for 3D)
  ───────────────────────────────────────────────────────────── */

  const activeCharEquipped = equippedCosmetics[selectedCharacterId] || {};
  const activeCharPreview = previewCosmetics[selectedCharacterId] || {};
  const activeCharColors = previewColors[selectedCharacterId] || customColors[selectedCharacterId] || {
    baseColor: selectedCharacter.colors.baseColor,
    accentColor: selectedCharacter.colors.accentColor,
    secondaryColor: selectedCharacter.colors.secondaryColor,
    glowColor: selectedCharacter.colors.podiumGlow,
  };

  // Get active item id for slot (preview overrides equipped)
  const getActiveItemForSlot = (slotKey) => {
    if (activeCharPreview[slotKey] !== undefined) {
      return getCatalogItemById(activeCharPreview[slotKey]);
    }
    return getCatalogItemById(activeCharEquipped[slotKey]);
  };

  // Active Vehicle resolution (preview overrides equipped)
  const activeVehicleId = previewVehicleId !== null ? previewVehicleId : equippedVehicleId;
  const activeVehicleObj = useMemo(() => {
    return activeVehicleId ? getVehicleById(activeVehicleId) : null;
  }, [activeVehicleId]);

  const activeVehicleUpgradeId = useMemo(() => {
    if (previewVehicleUpgradeId !== null) return previewVehicleUpgradeId;
    if (!activeVehicleId) return null;
    return equippedVehicleUpgrades[activeVehicleId] || null;
  }, [previewVehicleUpgradeId, activeVehicleId, equippedVehicleUpgrades]);

  // Compiled character data passed into the 3D Canvas
  const effectiveCharacter = useMemo(() => {
    const headItem = getActiveItemForSlot('head');
    const faceItem = getActiveItemForSlot('face');
    const upperItem = getActiveItemForSlot('upperBody');
    const lowerItem = getActiveItemForSlot('lowerBody');
    const footwearItem = getActiveItemForSlot('footwear');
    const backItem = getActiveItemForSlot('backAccessory');
    const effectItem = getActiveItemForSlot('effect');

    return {
      ...selectedCharacter,
      colors: {
        ...selectedCharacter.colors,
        baseColor: activeCharColors.baseColor,
        accentColor: activeCharColors.accentColor,
        secondaryColor: activeCharColors.secondaryColor,
        podiumGlow: activeCharColors.glowColor,
        visorColor: faceItem?.glowColor || activeCharColors.glowColor,
      },
      // Accessory attachment types for GLB bone attachment
      accessories: {
        headAccessory: headItem ? headItem.attachmentType : 'none',
        faceAccessory: faceItem ? faceItem.attachmentType : 'none',
        upperBodyAccessory: upperItem ? upperItem.attachmentType : 'none',
        lowerBodyAccessory: lowerItem ? lowerItem.attachmentType : 'none',
        footwearAccessory: footwearItem ? footwearItem.attachmentType : 'none',
        backAccessory: backItem ? backItem.attachmentType : 'none',
        effectType: effectItem ? effectItem.attachmentType : 'none',
      },
      // Active cosmetic references for UI inspection
      equippedItems: {
        head: headItem,
        face: faceItem,
        upperBody: upperItem,
        lowerBody: lowerItem,
        footwear: footwearItem,
        backAccessory: backItem,
        effect: effectItem,
      },
      // 3D Vehicle & Running Animation Integration
      vehicle: activeVehicleObj,
      vehicleUpgrade: activeVehicleUpgradeId,
      isDrivingMode,
    };
  }, [
    selectedCharacter,
    activeCharEquipped,
    activeCharPreview,
    activeCharColors,
    activeVehicleObj,
    activeVehicleUpgradeId,
    isDrivingMode,
  ]);

  // Filtered characters for Roster & Left Collection
  const filteredCharacters = useMemo(() => {
    return CHARACTERS.filter((char) => {
      const matchesSearch = char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            char.role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRarity = rarityFilter === 'ALL' || char.rarity.toUpperCase() === rarityFilter.toUpperCase();
      return matchesSearch && matchesRarity;
    });
  }, [searchQuery, rarityFilter]);

  // Filtered wardrobe items for Wardrobe view
  const filteredWardrobeItems = useMemo(() => {
    return WARDROBE_CATALOG.filter((item) => {
      const matchesCategory = activeWardrobeCategory === 'all' || item.category === activeWardrobeCategory;
      const matchesSearch = item.name.toLowerCase().includes(wardrobeSearchQuery.toLowerCase()) ||
                            item.description.toLowerCase().includes(wardrobeSearchQuery.toLowerCase());
      const matchesRarity = wardrobeRarityFilter === 'ALL' || item.rarity.toUpperCase() === wardrobeRarityFilter.toUpperCase();
      return matchesCategory && matchesSearch && matchesRarity;
    });
  }, [activeWardrobeCategory, wardrobeSearchQuery, wardrobeRarityFilter]);

  return (
    <StudioContext.Provider
      value={{
        // Character & Roster
        characters: CHARACTERS,
        ownedCharacterIds,
        filteredCharacters,
        selectedCharacterId,
        selectedCharacter,
        effectiveCharacter,
        equippedCharacterId,
        equippedCharacter,
        selectCharacter,
        equipCurrentCharacter,
        unlockCharacter,

        // Navigation & Studio State
        activeTab,
        setActiveTab,
        isAutoRotating,
        toggleAutoRotate,
        cameraResetTrigger,
        triggerCameraReset,
        zoomAction,
        triggerZoomIn,
        triggerZoomOut,
        searchQuery,
        setSearchQuery,
        rarityFilter,
        setRarityFilter,

        // Wardrobe state & actions
        activeWardrobeCategory,
        setActiveWardrobeCategory,
        wardrobeSearchQuery,
        setWardrobeSearchQuery,
        wardrobeRarityFilter,
        setWardrobeRarityFilter,
        selectedWardrobeItemId,
        setSelectedWardrobeItemId,
        filteredWardrobeItems,
        equippedCosmetics,
        activeCharEquipped,
        previewCosmetics,
        activeCharPreview,
        previewItem,
        equipItem,
        unequipSlot,
        resetCharacterAppearance,
        checkCompatibility,

        // Outfits
        outfits: availableOutfits,
        ownedCosmeticIds,
        ownedOutfitIds,
        equippedOutfits,
        previewOutfitId,
        previewOutfit,
        equipOutfit,
        unlockOutfit,
        clearOutfitPreview,

        // Color Customizer
        activeCharColors,
        setCustomColor,
        applyColorPalette,
        resetCustomColors,

        // Vehicles & Store
        vehicles: VEHICLES,
        coins,
        rewardHistory,
        walletTotals,
        ownedVehicles,
        ownedVehicleUpgrades,
        equippedVehicleId,
        equippedVehicleUpgrades,
        previewVehicleId,
        previewVehicleUpgradeId,
        isDrivingMode,
        previewVehicle,
        clearVehiclePreview,
        unlockVehicle,
        equipVehicle,
        unequipVehicle,
        unlockVehicleUpgrade,
        toggleVehicleUpgrade,
        toggleDrivingMode,
        resetVehicleLoadout,

        // Modals & Feedback
        placeholderModal,
        openPlaceholderModal,
        closePlaceholderModal,
        toast,
        showToast,
        branding: BRANDING,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
};

export const useStudio = () => {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
};
