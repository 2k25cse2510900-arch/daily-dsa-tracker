import React from 'react';
import {
  Star, Zap, Shield, Shirt, Footprints, Eye, Smile, Crown,
  Sparkles, ChevronRight, Info, Palette, Check, RotateCcw, Swords, Gauge
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { getRarityConfig } from '../../config/rarity';

const OUTFIT_ICON_MAP = {
  'outfit-default': Shield,
  'outfit-warrior': Swords,
  'outfit-royal': Crown,
};

const SLOT_ICON_MAP = {
  head: Crown,
  face: Eye,
  upperBody: Shirt,
  lowerBody: Footprints,
  footwear: Zap,
  backAccessory: Shield,
  effect: Sparkles,
  emote: Smile,
};

const SLOT_LABELS = {
  head: 'Headwear',
  face: 'Face',
  upperBody: 'Upper Body',
  lowerBody: 'Lower Body',
  footwear: 'Footwear',
  backAccessory: 'Back',
  effect: 'Effect',
};

function StatBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[#766c83] w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-[#ebe3f0] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="text-[10px] font-bold text-[#261b35] w-6 text-right">{value}</span>
    </div>
  );
}

function EquipSlot({ slotKey, item, onOpenSlot }) {
  const Icon = SLOT_ICON_MAP[slotKey] || Shield;
  const slotRarity = getRarityConfig(item?.rarity || 'COMMON');

  return (
    <button
      onClick={() => onOpenSlot(slotKey)}
      className="w-full flex items-center gap-2.5 py-2 border-b border-[#f0e8f4] last:border-0 group text-left hover:bg-[#fbf7fd] px-1.5 rounded-lg transition-all"
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-xs transition-transform group-hover:scale-105"
        style={{ background: item ? slotRarity.accentHex + '20' : '#f0e8f7' }}
      >
        <Icon
          className="w-3.5 h-3.5"
          style={{ color: item ? slotRarity.accentHex : '#9e94aa' }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[#766c83]">{SLOT_LABELS[slotKey]}</p>
        <p className={`text-xs font-semibold truncate ${item ? 'text-[#261b35] group-hover:text-[#7544ae]' : 'text-[#9e94aa]'}`}>
          {item ? item.name : '— Empty Slot —'}
        </p>
      </div>

      {/* Tag */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {item && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${slotRarity.badgeClass}`}>
            {slotRarity.label.slice(0, 3).toUpperCase()}
          </span>
        )}
        <ChevronRight className="w-3 h-3 text-[#9e94aa] group-hover:text-[#7544ae] group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  );
}

export default function CharacterDetails() {
  const {
    effectiveCharacter,
    selectedCharacter,
    equippedCharacterId,
    equipCurrentCharacter,
    selectCharacter,
    setActiveTab,
    setActiveWardrobeCategory,
    outfits,
    equippedOutfits,
    previewOutfitId,
    previewOutfit,
    equipOutfit,
    clearOutfitPreview,
  } = useStudio();

  if (!selectedCharacter) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[#766c83] text-sm">No character selected</p>
      </div>
    );
  }

  const rarity = getRarityConfig(selectedCharacter.rarity);
  const isEquipped = equippedCharacterId === selectedCharacter.id;
  const { attributes, colors, equippedItems } = effectiveCharacter;
  const activeEquippedOutfitId = equippedOutfits?.[selectedCharacter.id] || 'outfit-default';

  const handleOpenWardrobeSlot = (slotKey) => {
    setActiveWardrobeCategory(slotKey);
    setActiveTab('wardrobe');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">

        {/* Character identity */}
        <div>
          {/* Rarity & status row */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border ${rarity.badgeClass}`}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: rarity.accentHex }} />
              {rarity.label.toUpperCase()}
            </span>
            {isEquipped && (
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 px-2 py-1 rounded-md">
                ✓ Active Hero
              </span>
            )}
          </div>

          {/* Name + role */}
          <h2
            className="text-xl font-black leading-tight"
            style={{ color: rarity.accentHex }}
          >
            {selectedCharacter.name}
          </h2>
          <p className="text-xs text-[#766c83] mt-0.5 font-medium">{selectedCharacter.role}</p>

          {/* Active Colors Swatch Row */}
          <div className="flex items-center gap-3 mt-2.5 bg-[#f8f4fb] p-2 rounded-xl border border-[#dbcee2]">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-md border border-[#dbcee2] shadow-xs" style={{ background: colors.baseColor }} />
              <span className="text-[10px] text-[#766c83]">Clothing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-md border border-[#dbcee2] shadow-xs" style={{ background: colors.secondaryColor }} />
              <span className="text-[10px] text-[#766c83]">Cape</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-md border border-[#dbcee2] shadow-xs" style={{ background: colors.accentColor }} />
              <span className="text-[10px] text-[#766c83]">Accent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-md border border-[#dbcee2] shadow-xs" style={{ background: colors.podiumGlow }} />
              <span className="text-[10px] text-[#766c83]">Glow</span>
            </div>
            <button
              onClick={() => { setActiveWardrobeCategory('color'); setActiveTab('wardrobe'); }}
              className="ml-auto text-[10px] font-bold text-[#7544ae] hover:underline flex items-center gap-1"
            >
              <Palette className="w-3 h-3" />
              <span>Paint</span>
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="bg-[#fbf9fc] rounded-xl p-3 border border-[#dbcee2]">
          <p className="text-xs text-[#261b35] leading-relaxed">{selectedCharacter.description}</p>
          <p className="text-[11px] text-[#766c83] mt-2 italic">{selectedCharacter.quote}</p>
        </div>

        {/* 3 Coordinated Outfits Selector */}
        <div className="bg-[#fbf9fc] rounded-2xl p-3 border border-[#dbcee2] space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <h3 className="text-[11px] font-bold text-[#261b35] uppercase tracking-wider">
                Hero Outfits (3 Available)
              </h3>
            </div>
            {previewOutfitId ? (
              <button
                onClick={clearOutfitPreview}
                className="text-[10px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 shadow-xs"
                title="Cancel 3D preview and restore equipped outfit"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Revert</span>
              </button>
            ) : (
              <span className="text-[10px] text-[#766c83] font-medium">1-Click Select</span>
            )}
          </div>

          {/* 3 Outfit Cards */}
          <div className="grid grid-cols-3 gap-2">
            {outfits?.map((outfit) => {
              const isOutfitEquipped = activeEquippedOutfitId === outfit.id;
              const isOutfitPreviewing = previewOutfitId === outfit.id;
              const Icon = OUTFIT_ICON_MAP[outfit.id] || Sparkles;

              return (
                <div
                  key={outfit.id}
                  onClick={() => previewOutfit(outfit)}
                  className={[
                    'p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1.5 relative overflow-hidden group select-none',
                    isOutfitPreviewing
                      ? 'bg-gradient-to-b from-[#fbf8fe] to-[#f4edf8] border-[#7544ae] ring-2 ring-[#7544ae]/50 shadow-sm scale-[1.02]'
                      : isOutfitEquipped
                      ? 'bg-emerald-50 border-emerald-300 shadow-xs'
                      : 'bg-white border-[#dbcee2] hover:bg-[#f8f4fb] hover:border-[#ba9fcb]',
                  ].join(' ')}
                  title={`${outfit.name}: Click to Preview on 3D turntable`}
                >
                  {/* Top: Icon + Name */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shadow-xs relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${outfit.colors.baseColor === '#ffffff' ? '#475569' : outfit.colors.baseColor}, ${outfit.colors.accentColor})`,
                    }}
                  >
                    <Icon className="w-4 h-4 text-white drop-shadow" />
                    <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 rounded-t-lg" />
                  </div>

                  <span className="text-[11px] font-bold text-[#261b35] block truncate w-full leading-tight">
                    {outfit.name.replace(' (free)', '')}
                  </span>

                  {/* Color dots preview */}
                  <div className="flex items-center gap-1">
                    {[outfit.colors.baseColor, outfit.colors.secondaryColor, outfit.colors.accentColor].map((c, i) => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-full border border-black/15 shadow-xs"
                        style={{ background: c }}
                      />
                    ))}
                  </div>

                  {/* Status Indicator / Badge */}
                  {isOutfitEquipped ? (
                    <span className="w-full text-[8.5px] font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-300 py-0.5 rounded-md uppercase tracking-wider flex items-center justify-center gap-0.5">
                      <Check className="w-2.5 h-2.5" />
                      EQUIPPED
                    </span>
                  ) : isOutfitPreviewing ? (
                    <span className="w-full text-[8.5px] font-extrabold text-[#7544ae] bg-[#f4edf8] border border-[#dbcee2] py-0.5 rounded-md uppercase tracking-wider flex items-center justify-center gap-0.5">
                      <Eye className="w-2.5 h-2.5" />
                      PREVIEW
                    </span>
                  ) : (
                    <span className="w-full text-[9px] font-bold text-[#766c83] bg-[#f3edf7] border border-[#dbcee2] py-0.5 rounded-md">
                      {outfit.price}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Row below cards: Instant Equip or Status */}
          {previewOutfitId ? (
            (() => {
              const previewed = outfits?.find((o) => o.id === previewOutfitId);
              if (!previewed) return null;
              return (
                <div className="space-y-1.5 pt-0.5">
                  <button
                    onClick={() => equipOutfit(previewed)}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-105 active:scale-98 text-white text-xs font-bold shadow-md shadow-emerald-950/20 transition-all flex items-center justify-center gap-1.5 border border-emerald-400/30"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Equip {previewed.name.replace(' (free)', '')} Outfit</span>
                  </button>
                  <p className="text-[10px] text-[#766c83] text-center">
                    Previewing gear on 3D turntable. Click above to permanently equip.
                  </p>
                </div>
              );
            })()
          ) : (
            <div className="flex items-center justify-between text-[10px] text-[#766c83] bg-[#f8f4fb] px-2.5 py-1.5 rounded-xl border border-[#dbcee2]">
              <span>Current: <strong className="text-[#261b35] capitalize">{activeEquippedOutfitId?.replace('outfit-', '') || 'Custom'}</strong></span>
              <span className="text-[#766c83]">Click any outfit to test in 3D</span>
            </div>
          )}
        </div>

        {/* Equipped Vehicle Row */}
        <div className="bg-[#fbf9fc] rounded-xl p-3 border border-[#dbcee2] flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-300 flex items-center justify-center flex-shrink-0">
              <Gauge className="w-4 h-4 text-amber-700" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-[#766c83]">Active Ride</p>
              <p className="text-xs font-bold text-[#261b35] truncate">
                {effectiveCharacter.vehicle ? effectiveCharacter.vehicle.name : 'On Foot'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('vehicles')}
            className="text-[10px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 flex-shrink-0"
          >
            <span>Vehicle Store</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Equipped Cosmetics Slots — Phase 2 Interactive */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-bold text-[#766c83] uppercase tracking-widest">Equipped Cosmetics</h3>
            <button
              onClick={() => setActiveTab('wardrobe')}
              className="text-[10px] font-bold text-[#7544ae] hover:underline flex items-center gap-0.5"
            >
              <span>Open Wardrobe</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="bg-[#fbf9fc] rounded-xl p-2 border border-[#dbcee2] space-y-0.5">
            {['head', 'face', 'upperBody', 'lowerBody', 'footwear', 'backAccessory', 'effect'].map((slotKey) => (
              <EquipSlot
                key={slotKey}
                slotKey={slotKey}
                item={equippedItems?.[slotKey]}
                onOpenSlot={handleOpenWardrobeSlot}
              />
            ))}
          </div>
        </div>

        {/* Attributes — Phase 4 note */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-semibold text-[#766c83] uppercase tracking-widest">Attributes</h3>
            <div className="flex items-center gap-1 text-[10px] text-[#766c83]">
              <Info className="w-3 h-3" />
              <span>Cosmetics do not affect stats</span>
            </div>
          </div>
          <div className="space-y-2 bg-[#fbf9fc] rounded-xl p-3 border border-[#dbcee2]">
            <StatBar label="Agility" value={attributes.agility} color={colors.accentColor} />
            <StatBar label="Dash Speed" value={attributes.dashSpeed} color={colors.accentColor} />
            <StatBar label="Jump Force" value={attributes.jumpForce} color={colors.accentColor} />
            <StatBar label="Recovery" value={attributes.recovery} color={colors.accentColor} />
          </div>
        </div>

      </div>

      {/* Action footer */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2 space-y-2 border-t border-[#dbcee2]">
        {isEquipped ? (
          <div className="w-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-bold rounded-xl py-2.5 text-center shadow-xs">
            ✓ Currently Active Match Hero
          </div>
        ) : (
          <button
            onClick={equipCurrentCharacter}
            className="w-full rounded-xl py-2.5 text-sm font-bold transition-all duration-200 text-white relative overflow-hidden group shadow-md bg-gradient-to-r from-[#7544ae] to-[#542b82]"
          >
            <span className="relative z-10">Set as Active Match Hero</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('wardrobe')}
          className="w-full rounded-xl py-2 text-xs font-semibold bg-white hover:bg-[#f8f4fb] text-[#7544ae] hover:text-[#542b82] border border-[#dbcee2] transition-all flex items-center justify-center gap-1.5 shadow-xs"
        >
          <Crown className="w-3.5 h-3.5" />
          <span>Customize Cosmetics &amp; Paint</span>
        </button>
      </div>
    </div>
  );
}
