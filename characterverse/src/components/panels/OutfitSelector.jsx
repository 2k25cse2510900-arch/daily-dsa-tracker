import React from 'react';
import { Sparkles, Check, Eye, Crown, Shield, Swords, RotateCcw, Lock, Coins } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { getRarityConfig } from '../../config/rarity';

const OUTFIT_ICON_MAP = {
  'outfit-default': Shield,
  'outfit-warrior': Swords,
  'outfit-royal': Crown,
};

function OutfitCard({ outfit, isEquipped, isUnlocked, isLocked, isPreviewing, onPreview, onEquip, onUnlock }) {
  const rarity = getRarityConfig(outfit.rarity);
  const Icon = OUTFIT_ICON_MAP[outfit.id] || Sparkles;

  return (
    <div
      onClick={onPreview}
      className={[
        'rounded-2xl border p-4 transition-all duration-200 relative overflow-hidden flex flex-col justify-between gap-3 cursor-pointer group select-none shadow-xs',
        isPreviewing
          ? 'bg-gradient-to-b from-[#fbf8fe] to-[#f4edf8] border-[#7544ae] ring-2 ring-[#7544ae]/40 shadow-sm'
          : isEquipped
          ? 'bg-emerald-50 border-emerald-300'
          : isLocked
          ? 'bg-slate-50/80 border-slate-200 hover:border-amber-300'
          : 'bg-white border-[#dbcee2] hover:bg-[#f8f4fb] hover:border-[#ba9fcb]',
      ].join(' ')}
      style={isPreviewing ? { boxShadow: `0 0 16px -4px ${rarity.glowColor}` } : {}}
    >
      {/* Top row: Rarity & Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${rarity.badgeClass}`}
          >
            {rarity.label.toUpperCase()}
          </span>
          <span className="text-[9px] font-semibold text-[#766c83] bg-[#f4edf8] px-1.5 py-0.5 rounded border border-[#dbcee2]">
            {outfit.badge}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
            {outfit.price}
          </span>
          {isEquipped ? (
            <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
              <Check className="w-2.5 h-2.5" />
              EQUIPPED
            </span>
          ) : isLocked ? (
            <span className="flex items-center gap-1 text-[10px] font-bold bg-slate-200/80 text-slate-700 border border-slate-300 px-2 py-0.5 rounded-full">
              <Lock className="w-2.5 h-2.5" />
              LOCKED
            </span>
          ) : isPreviewing ? (
            <span className="flex items-center gap-1 text-[10px] font-bold bg-[#f4edf8] text-[#7544ae] border border-[#dbcee2] px-2 py-0.5 rounded-full animate-pulse">
              <Eye className="w-2.5 h-2.5" />
              PREVIEWING
            </span>
          ) : (
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
              UNLOCKED
            </span>
          )}
        </div>
      </div>

      {/* Outfit Title & Icon Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${outfit.colors.baseColor === '#ffffff' ? '#475569' : outfit.colors.baseColor}, ${outfit.colors.accentColor})`,
          }}
        >
          <Icon className="w-6 h-6 text-white drop-shadow" />
          <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 rounded-t-xl" />
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-black text-[#261b35] leading-tight">{outfit.name}</h4>
          <p className="text-[11px] text-[#766c83] line-clamp-2 mt-0.5 leading-snug">
            {outfit.description}
          </p>
        </div>
      </div>

      {/* Coordinated Palette Swatches */}
      <div className="flex items-center justify-between bg-[#f8f4fb] p-2 rounded-xl border border-[#dbcee2]">
        <span className="text-[10px] font-semibold text-[#766c83]">Palette:</span>
        <div className="flex items-center gap-1.5">
          {[
            { label: 'Clothing', color: outfit.colors.baseColor },
            { label: 'Cape', color: outfit.colors.secondaryColor },
            { label: 'Accent', color: outfit.colors.accentColor },
            { label: 'Glow', color: outfit.colors.glowColor },
          ].map((c, i) => (
            <div key={i} className="flex items-center gap-1" title={`${c.label}: ${c.color}`}>
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-xs"
                style={{ background: c.color }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Features tags */}
      <div className="flex flex-wrap gap-1">
        {outfit.features.map((feat, i) => (
          <span
            key={i}
            className="text-[9px] font-medium text-[#7544ae] bg-[#f4edf8] border border-[#dbcee2] px-1.5 py-0.5 rounded-md"
          >
            {feat}
          </span>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1 border-t border-[#dbcee2]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          className={[
            'flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border shadow-xs',
            isPreviewing
              ? 'bg-[#f4edf8] text-[#7544ae] border-[#7544ae]'
              : 'bg-white hover:bg-[#f8f4fb] text-[#4c3c5b] border-[#dbcee2]',
          ].join(' ')}
          title="Preview this outfit in 3D without equipping permanently"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{isPreviewing ? 'Previewing' : 'Preview 3D'}</span>
        </button>

        {isEquipped ? (
          <div className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>Equipped</span>
          </div>
        ) : isLocked ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnlock();
            }}
            className="flex-1 py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:brightness-105 active:scale-95 text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5 border border-amber-400/30"
            title={`Unlock ${outfit.name} for ${outfit.priceCoins} coins`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Unlock ({outfit.priceCoins} Coins)</span>
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEquip();
            }}
            className="flex-1 py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-105 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 border border-emerald-400/30"
            title="Equip this entire outfit and color set"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Equip</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function OutfitSelector() {
  const {
    outfits,
    ownedOutfitIds = ['outfit-default'],
    equippedOutfits,
    previewOutfitId,
    previewOutfit,
    equipOutfit,
    unlockOutfit,
    clearOutfitPreview,
    selectedCharacterId,
    selectedCharacter,
  } = useStudio();

  const activeEquippedOutfitId = equippedOutfits[selectedCharacterId] || 'outfit-default';
  const previewingOutfit = outfits.find((o) => o.id === previewOutfitId);
  const isPreviewingUnlocked = previewingOutfit ? Boolean(previewingOutfit.isFree || ownedOutfitIds.includes(previewingOutfit.id)) : false;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#7544ae] uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Hero Outfit Sets (3 Available)
          </h3>
          {previewOutfitId && (
            <button
              onClick={clearOutfitPreview}
              className="flex items-center gap-1 text-[10px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 border border-amber-300 px-2 py-1 rounded-lg transition-all shadow-xs"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Exit Preview</span>
            </button>
          )}
        </div>
        <p className="text-xs text-[#766c83] mt-0.5">
          Equip complete 3D gear packages for {selectedCharacter.name} with one click.
        </p>
      </div>

      {/* Preview Alert Banner */}
      {previewingOutfit && (
        <div className="bg-[#f8f4fb] border border-[#dbcee2] rounded-xl p-2.5 flex items-center justify-between gap-3 text-[#261b35] shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="w-4 h-4 text-[#7544ae] flex-shrink-0 animate-pulse" />
            <div className="text-xs truncate">
              <span className="text-[#766c83]">Previewing: </span>
              <span className="font-bold text-[#261b35]">{previewingOutfit.name}</span>
              <span className="text-[11px] text-[#766c83] ml-1.5">({previewingOutfit.price})</span>
            </div>
          </div>
          {isPreviewingUnlocked ? (
            <button
              onClick={() => equipOutfit(previewingOutfit)}
              className="flex-shrink-0 bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-105 text-white text-[11px] font-bold px-3 py-1 rounded-lg shadow-sm transition-all flex items-center gap-1 border border-emerald-400/30"
            >
              <Check className="w-3 h-3" />
              <span>Equip Now</span>
            </button>
          ) : (
            <button
              onClick={() => unlockOutfit(previewingOutfit.id)}
              className="flex-shrink-0 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:brightness-105 text-white text-[11px] font-black px-3 py-1 rounded-lg shadow-sm transition-all flex items-center gap-1 border border-amber-400/40"
            >
              <Coins className="w-3 h-3" />
              <span>Unlock ({previewingOutfit.priceCoins} Coins)</span>
            </button>
          )}
        </div>
      )}

      {/* 3 Outfit Cards */}
      <div className="space-y-3">
        {outfits.map((outfit) => {
          const isEquipped = activeEquippedOutfitId === outfit.id;
          const isPreviewing = previewOutfitId === outfit.id;
          const isUnlocked = Boolean(outfit.isFree || ownedOutfitIds.includes(outfit.id));
          const isLocked = !isUnlocked;

          return (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              isEquipped={isEquipped}
              isUnlocked={isUnlocked}
              isLocked={isLocked}
              isPreviewing={isPreviewing}
              onPreview={() => previewOutfit(outfit)}
              onEquip={() => equipOutfit(outfit)}
              onUnlock={() => unlockOutfit(outfit.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
