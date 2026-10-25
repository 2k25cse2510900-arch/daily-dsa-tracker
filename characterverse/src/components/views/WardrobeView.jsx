import React, { useState } from 'react';
import {
  Crown, Eye, Shirt, Footprints, Zap, Shield, Sparkles,
  Search, Check, X, RotateCcw, Lock, Palette, AlertCircle, ArrowRight
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { WARDROBE_CATEGORIES, getCatalogItemById } from '../../data/wardrobe';
import { getRarityConfig } from '../../config/rarity';
import CharacterViewer from '../viewer/CharacterViewer';
import StudioControls from '../panels/StudioControls';
import ColorCustomizer from '../panels/ColorCustomizer';
import OutfitSelector from '../panels/OutfitSelector';

const CATEGORY_ICON_MAP = {
  outfits: Sparkles,
  head: Crown,
  face: Eye,
  upperBody: Shirt,
  lowerBody: Footprints,
  footwear: Zap,
  backAccessory: Shield,
  effect: Sparkles,
  color: Palette,
};

function CosmeticCard({ item, isEquipped, isPreviewing, onClick }) {
  const rarity = getRarityConfig(item.rarity);
  const Icon = CATEGORY_ICON_MAP[item.category] || Shield;

  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left rounded-2xl p-3 border transition-all duration-200 relative overflow-hidden group select-none',
        isPreviewing
          ? 'bg-gradient-to-b from-[#fbf8fe] to-[#f4edf8] border-[#7544ae] ring-2 ring-[#7544ae]/40 shadow-sm'
          : isEquipped
          ? 'bg-emerald-50/90 border-emerald-300 shadow-xs'
          : 'bg-white border-[#dbcee2] hover:bg-[#f8f4fb] hover:border-[#ba9fcb]',
      ].join(' ')}
      style={isPreviewing ? { boxShadow: `0 0 16px -4px ${rarity.glowColor}` } : {}}
      aria-label={`Select ${item.name}`}
    >
      {/* Left Active/Equipped Bar */}
      {isPreviewing && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{ background: rarity.accentHex }}
        />
      )}

      {/* Top row: Rarity & Status Badges */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <span
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${rarity.badgeClass}`}
        >
          {rarity.label.toUpperCase()}
        </span>

        {isEquipped ? (
          <span className="flex items-center gap-1 text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded-full">
            <Check className="w-2.5 h-2.5" />
            EQUIPPED
          </span>
        ) : isPreviewing ? (
          <span className="text-[9px] font-bold bg-[#f4edf8] text-[#7544ae] border border-[#dbcee2] px-1.5 py-0.5 rounded-full">
            PREVIEWING
          </span>
        ) : null}
      </div>

      {/* Center item icon swatch */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${item.defaultColor || '#64748b'}, ${item.accentColor || '#94a3b8'})`,
          }}
        >
          <Icon className="w-5 h-5 text-white drop-shadow" />
          <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 rounded-t-xl" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-[#261b35] truncate group-hover:text-[#7544ae] transition-colors">
            {item.name}
          </p>
          <p className="text-[10px] text-[#766c83] line-clamp-1 mt-0.5">
            {item.description}
          </p>
        </div>
      </div>
    </button>
  );
}

export default function WardrobeView() {
  const {
    effectiveCharacter,
    selectedCharacter,
    activeCharEquipped,
    activeCharPreview,
    previewItem,
    equipItem,
    unequipSlot,
    resetCharacterAppearance,
    activeWardrobeCategory,
    setActiveWardrobeCategory,
    wardrobeSearchQuery,
    setWardrobeSearchQuery,
    wardrobeRarityFilter,
    setWardrobeRarityFilter,
    selectedWardrobeItemId,
    setSelectedWardrobeItemId,
    filteredWardrobeItems,
    isAutoRotating,
    cameraResetTrigger,
    checkCompatibility,
  } = useStudio();

  // The item currently highlighted in the detail card
  const selectedItem = getCatalogItemById(selectedWardrobeItemId) || filteredWardrobeItems[0];
  const compatibility = selectedItem ? checkCompatibility(selectedItem) : { compatible: true };

  const isSelectedEquipped = selectedItem && activeCharEquipped[selectedItem.category] === selectedItem.id;
  const isSelectedPreviewing = selectedItem && (
    activeCharPreview[selectedItem.category] === selectedItem.id ||
    (activeCharPreview[selectedItem.category] === undefined && isSelectedEquipped)
  );

  return (
    <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden bg-[#ebe6f0]">
      {/* ── LEFT: Wardrobe Catalog & Categories Panel ── */}
      <div className="w-full lg:w-96 xl:w-[26rem] flex-shrink-0 flex flex-col border-r border-[#dbcee2] bg-white/95 overflow-hidden">
        {/* Mobile 3D Preview (compact viewport for screens below lg) */}
        <div className="lg:hidden h-52 relative border-b border-[#dbcee2] bg-gradient-to-b from-[#f7f3fb] to-[#ede6f4] flex-shrink-0">
          <CharacterViewer
            characterData={effectiveCharacter}
            autoRotate={isAutoRotating}
            resetTrigger={cameraResetTrigger}
          />
          <div className="absolute top-2 right-2">
            <span className="text-[10px] font-semibold text-[#261b35] bg-white/80 px-2 py-0.5 rounded-lg backdrop-blur-sm border border-[#dbcee2]">
              Touch to rotate 3D preview
            </span>
          </div>
        </div>

        {/* Header & Tabs */}
        <div className="p-4 border-b border-[#dbcee2] flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#7544ae] uppercase tracking-widest block">
                Hero Wardrobe &amp; Studio
              </span>
              <h2 className="text-base font-black text-[#261b35] leading-tight">
                Customizing {selectedCharacter.name}
              </h2>
            </div>

            <button
              onClick={resetCharacterAppearance}
              className="flex items-center gap-1 text-[11px] font-bold text-[#766c83] hover:text-[#261b35] bg-white hover:bg-[#f5edf8] border border-[#dbcee2] px-2.5 py-1.5 rounded-lg transition-all shadow-xs"
              title="Reset appearance to character defaults"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All</span>
            </button>
          </div>

          {/* Category Tabs (Scrollable) */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar py-1">
            {WARDROBE_CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICON_MAP[cat.id] || Crown;
              const isActive = activeWardrobeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveWardrobeCategory(cat.id)}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex-shrink-0 shadow-xs',
                    isActive
                      ? 'bg-gradient-to-r from-[#7544ae] to-[#542b82] text-white border-transparent'
                      : 'bg-white text-[#62566b] border-[#dbcee2] hover:text-[#261b35] hover:bg-[#f5edf8]',
                  ].join(' ')}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}

            {/* Color Studio Tab */}
            <button
              onClick={() => setActiveWardrobeCategory('color')}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex-shrink-0 shadow-xs',
                activeWardrobeCategory === 'color'
                  ? 'bg-gradient-to-r from-[#7544ae] to-[#542b82] text-white border-transparent'
                  : 'bg-white text-[#62566b] border-[#dbcee2] hover:text-[#261b35] hover:bg-[#f5edf8]',
              ].join(' ')}
            >
              <Palette className="w-3.5 h-3.5 text-[#7544ae]" />
              <span>Color Paint</span>
            </button>
          </div>

          {/* Search & Rarity Filters (hidden if in Color Studio or Outfits) */}
          {activeWardrobeCategory !== 'color' && activeWardrobeCategory !== 'outfits' && (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search cosmetics…"
                  value={wardrobeSearchQuery}
                  onChange={(e) => setWardrobeSearchQuery(e.target.value)}
                  className="w-full bg-[#f8f4fb] border border-[#dbcee2] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#261b35] placeholder:text-slate-400 focus:outline-none focus:border-[#7544ae]"
                />
              </div>

              <div className="flex gap-1 flex-shrink-0">
                {['ALL', 'RARE', 'EPIC', 'LEGENDARY'].map((r) => {
                  const active = wardrobeRarityFilter === r;
                  return (
                    <button
                      key={r}
                      onClick={() => setWardrobeRarityFilter(r)}
                      className={[
                        'text-[10px] font-semibold px-2 py-1 rounded-md border transition-all',
                        active
                          ? 'bg-[#7544ae] text-white border-[#7544ae]'
                          : 'bg-white text-[#766c83] border-[#dbcee2] hover:text-[#261b35]',
                      ].join(' ')}
                    >
                      {r === 'ALL' ? 'All' : r.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Content area: Outfits, Item Grid, or Color Customizer */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
          {activeWardrobeCategory === 'color' ? (
            <div className="p-1">
              <ColorCustomizer />
            </div>
          ) : activeWardrobeCategory === 'outfits' ? (
            <div className="p-1">
              <OutfitSelector />
            </div>
          ) : filteredWardrobeItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Search className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs text-[#766c83]">No cosmetics found in this category.</p>
              <button
                onClick={() => { setWardrobeSearchQuery(''); setWardrobeRarityFilter('ALL'); }}
                className="text-xs text-[#7544ae] hover:underline font-bold"
              >
                Clear search filters
              </button>
            </div>
          ) : (
            filteredWardrobeItems.map((item) => {
              const isEquipped = activeCharEquipped[item.category] === item.id;
              const isPreviewing = (
                activeCharPreview[item.category] === item.id ||
                (activeCharPreview[item.category] === undefined && isEquipped)
              );

              return (
                <CosmeticCard
                  key={item.id}
                  item={item}
                  isEquipped={isEquipped}
                  isPreviewing={isPreviewing}
                  onClick={() => previewItem(item)}
                />
              );
            })
          )}
        </div>

        {/* Bottom Drawer: Selected Item Actions (when item is selected and not in color or outfits tab) */}
        {activeWardrobeCategory !== 'color' && activeWardrobeCategory !== 'outfits' && selectedItem && (
          <div className="p-3.5 border-t border-[#dbcee2] bg-[#fbf9fc] flex-shrink-0 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#261b35]">{selectedItem.name}</p>
                <p className="text-[10px] text-[#766c83] capitalize">{selectedItem.category} Slot</p>
              </div>

              {!compatibility.compatible && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-md">
                  <AlertCircle className="w-3 h-3" />
                  Incompatible
                </span>
              )}
            </div>

            {!compatibility.compatible ? (
              <p className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-300 leading-tight">
                {compatibility.reason}
              </p>
            ) : isSelectedEquipped ? (
              <button
                onClick={() => unequipSlot(selectedItem.category)}
                className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs font-bold transition-all shadow-xs"
              >
                Unequip From {selectedItem.category.toUpperCase()}
              </button>
            ) : (
              <button
                onClick={() => equipItem(selectedItem)}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#7544ae] to-[#542b82] hover:brightness-105 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Equip to {selectedItem.category.toUpperCase()} Slot</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT: Real-time 3D Studio Canvas ── */}
      <div className="hidden lg:flex flex-1 flex-col min-w-0 min-h-0 relative overflow-hidden">
        <div className="flex-1 relative overflow-hidden min-h-0">
          <div className="absolute inset-0">
            <CharacterViewer
              characterData={effectiveCharacter}
              autoRotate={isAutoRotating}
              resetTrigger={cameraResetTrigger}
            />
          </div>

          {/* Overlay Tag */}
          <div className="absolute bottom-4 left-4 pointer-events-none">
            <div className="bg-white/95 backdrop-blur-md border border-[#dbcee2] rounded-2xl p-3 shadow-lg shadow-purple-950/10">
              <span className="text-[10px] text-[#7544ae] font-bold uppercase tracking-widest block">
                Live Cosmetic Turntable
              </span>
              <span className="text-base font-black text-[#261b35] block leading-tight">
                {selectedCharacter.name}
              </span>
              <span className="text-xs text-[#766c83] block mt-0.5">
                {Object.values(activeCharEquipped).filter(Boolean).length} Cosmetics Equipped
              </span>
            </div>
          </div>
        </div>

        {/* Studio Controls */}
        <StudioControls />
      </div>
    </div>
  );
}
