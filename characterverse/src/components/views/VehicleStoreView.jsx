import React from 'react';
import {
  Coins, Sparkles, Check, Eye, Lock, RotateCcw,
  Gauge, Shield, PlayCircle, Zap, Flame, Wind,
  ChevronRight, ArrowRight
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { getRarityConfig } from '../../config/rarity';
import CharacterViewer from '../viewer/CharacterViewer';

const VEHICLE_ICON_MAP = {
  bike: Zap,
  car: Gauge,
  rocket: Flame,
};

function StatBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[#766c83] w-16 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-[#ebe3f0] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="text-[10px] font-bold text-[#261b35] w-6 text-right">{value}</span>
    </div>
  );
}

function VehicleCard({
  vehicle,
  isOwned,
  isEquipped,
  isPreviewing,
  activeUpgradeKey,
  previewUpgradeKey,
  isUpgradeOwned,
  userCoins,
  onPreview,
  onUnlock,
  onEquip,
  onUnlockUpgrade,
  onToggleUpgrade,
}) {
  const rarity = getRarityConfig(vehicle.rarity);
  const Icon = VEHICLE_ICON_MAP[vehicle.modelType] || Sparkles;

  const upgrade = vehicle.upgradeEffect;
  const isUpgradedActive = activeUpgradeKey === upgrade.id || previewUpgradeKey === upgrade.id;

  const canAffordVehicle = userCoins >= vehicle.price;
  const canAffordUpgrade = userCoins >= upgrade.price;

  return (
    <div
      onClick={onPreview}
      className={[
        'rounded-2xl border p-4 transition-all duration-200 relative overflow-hidden flex flex-col justify-between gap-3 cursor-pointer group select-none shadow-xs',
        isPreviewing
          ? 'bg-gradient-to-b from-[#fbf8fe] to-[#f4edf8] border-[#7544ae] ring-2 ring-[#7544ae]/40 shadow-sm'
          : isEquipped
          ? 'bg-emerald-50 border-emerald-300'
          : isOwned
          ? 'bg-white border-[#dbcee2] hover:bg-[#f8f4fb] hover:border-[#ba9fcb]'
          : 'bg-white/90 border-[#dbcee2] hover:bg-[#f8f4fb] hover:border-[#ba9fcb]',
      ].join(' ')}
      style={isPreviewing ? { boxShadow: `0 0 16px -4px ${rarity.glowColor}` } : {}}
    >
      {/* Top Header: Rarity & Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${rarity.badgeClass}`}>
            {rarity.label.toUpperCase()}
          </span>
          <span className="text-[9px] font-semibold text-[#766c83] bg-[#f4edf8] px-1.5 py-0.5 rounded border border-[#dbcee2]">
            {vehicle.tagline}
          </span>
        </div>

        {isEquipped ? (
          <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
            <Check className="w-2.5 h-2.5" />
            EQUIPPED
          </span>
        ) : isPreviewing ? (
          <span className="flex items-center gap-1 text-[10px] font-bold bg-[#f4edf8] text-[#7544ae] border border-[#dbcee2] px-2 py-0.5 rounded-full animate-pulse">
            <Eye className="w-2.5 h-2.5" />
            PREVIEWING
          </span>
        ) : isOwned ? (
          <span className="text-[10px] font-bold text-sky-800 bg-sky-50 border border-sky-300 px-2 py-0.5 rounded-md">
            OWNED
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-md">
            <Coins className="w-3 h-3 text-amber-600" />
            {vehicle.price.toLocaleString()} Coins
          </span>
        )}
      </div>

      {/* Vehicle Identity & Icon Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${vehicle.colors.primary}, ${vehicle.colors.secondary})`,
          }}
        >
          <Icon className="w-6 h-6 text-white drop-shadow" />
          <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 rounded-t-xl" />
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-black text-[#261b35] leading-tight flex items-center gap-1.5">
            <span>{vehicle.name}</span>
          </h4>
          <p className="text-[11px] text-[#766c83] line-clamp-2 mt-0.5 leading-snug">
            {vehicle.description}
          </p>
        </div>
      </div>

      {/* Vehicle Ratings */}
      <div className="bg-[#f8f4fb] p-2 rounded-xl border border-[#dbcee2] space-y-1.5">
        <StatBar label="Speed" value={vehicle.speedRating} color={rarity.accentHex} />
        <StatBar label="Handling" value={vehicle.handlingRating} color="#0ea5e9" />
      </div>

      {/* Custom Particle Trail & Boost Upgrade Section */}
      <div className="bg-[#fbf9fc] rounded-xl p-2.5 border border-[#dbcee2] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#766c83] uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-600" />
            Trail / Boost Effects
          </span>
          {isUpgradedActive ? (
            <span className="text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
              Upgraded
            </span>
          ) : (
            <span className="text-[9px] font-semibold text-[#766c83] bg-white border border-[#dbcee2] px-1.5 py-0.5 rounded">
              Default Effect
            </span>
          )}
        </div>

        {/* Default effect line */}
        <div className="flex items-center justify-between text-[11px] bg-white p-1.5 rounded-lg border border-[#dbcee2]">
          <div>
            <p className="font-semibold text-[#261b35]">{vehicle.defaultEffect.name}</p>
            <p className="text-[9.5px] text-[#766c83]">{vehicle.defaultEffect.description}</p>
          </div>
          <span className="text-[9px] text-[#766c83] font-semibold flex-shrink-0">Standard</span>
        </div>

        {/* Premium Upgrade Option */}
        <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-300 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-amber-900 flex items-center gap-1 truncate">
                <Sparkles className="w-3 h-3 text-amber-600 flex-shrink-0" />
                <span>{upgrade.name}</span>
              </p>
              <p className="text-[9.5px] text-[#766c83] line-clamp-1">{upgrade.description}</p>
            </div>

            {isUpgradeOwned ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleUpgrade();
                }}
                className={[
                  'text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1 flex-shrink-0 border shadow-xs',
                  isUpgradedActive
                    ? 'bg-amber-100 text-amber-900 border-amber-400'
                    : 'bg-white text-[#4c3c5b] border-[#dbcee2] hover:bg-[#f8f4fb]',
                ].join(' ')}
              >
                {isUpgradedActive ? <Check className="w-2.5 h-2.5" /> : null}
                <span>{isUpgradedActive ? 'Equipped' : 'Equip'}</span>
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUnlockUpgrade();
                }}
                disabled={!canAffordUpgrade}
                className={[
                  'text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 flex-shrink-0 shadow-xs',
                  canAffordUpgrade
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-105 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300',
                ].join(' ')}
                title={canAffordUpgrade ? 'Buy upgrade' : 'Insufficient coins'}
              >
                <Coins className="w-2.5 h-2.5" />
                <span>{upgrade.price} Coins</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Primary Card Action Bar */}
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
          title="Preview vehicle in real-time 3D"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{isPreviewing ? 'Previewing' : 'Preview 3D'}</span>
        </button>

        {isEquipped ? (
          <div className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>Equipped</span>
          </div>
        ) : isOwned ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEquip();
            }}
            className="flex-1 py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-105 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 border border-emerald-400/30"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Equip Ride</span>
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnlock();
            }}
            disabled={!canAffordVehicle}
            className={[
              'flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5',
              canAffordVehicle
                ? 'bg-gradient-to-r from-[#7544ae] to-[#542b82] hover:brightness-105 active:scale-95 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300',
            ].join(' ')}
            title={canAffordVehicle ? `Unlock for ${vehicle.price} Coins` : 'Insufficient coins'}
          >
            <Lock className="w-3 h-3" />
            <span>Unlock ({vehicle.price})</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function VehicleStoreView() {
  const {
    vehicles,
    coins,
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
    effectiveCharacter,
    isAutoRotating,
    cameraResetTrigger,
  } = useStudio();

  const previewingVehicle = vehicles.find((v) => v.id === previewVehicleId);

  return (
    <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden bg-[#ebe6f0]">
      {/* ── LEFT: Vehicle Store & Hangar Catalog ── */}
      <div className="w-full lg:w-96 xl:w-[28rem] flex-shrink-0 flex flex-col border-r border-[#dbcee2] bg-white/95 overflow-hidden">
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

        {/* Store Header & Stats */}
        <div className="p-4 border-b border-[#dbcee2] flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#7544ae] uppercase tracking-widest block flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Vehicle Hangar &amp; Store
              </span>
              <h2 className="text-base font-black text-[#261b35] leading-tight">
                3 Premium Custom Rides
              </h2>
            </div>

            {/* Virtual Coins Wallet Badge */}
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-xl px-3 py-1.5 shadow-xs">
              <Coins className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-black text-amber-900">
                {coins.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Quick Drive Animation Mode Toggle & Reset */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={toggleDrivingMode}
              className={[
                'flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border shadow-xs',
                isDrivingMode
                  ? 'bg-gradient-to-r from-[#7544ae] to-[#542b82] text-white border-transparent'
                  : 'bg-white hover:bg-[#f8f4fb] text-[#4c3c5b] border-[#dbcee2]',
              ].join(' ')}
              title="Toggle active character running and vehicle drive animations"
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>{isDrivingMode ? 'Running / Driving (Active)' : 'Test Drive Animation'}</span>
            </button>

            <button
              onClick={resetVehicleLoadout}
              className="py-1.5 px-2.5 rounded-xl bg-white hover:bg-[#f8f4fb] border border-[#dbcee2] text-[#766c83] hover:text-[#261b35] text-xs font-semibold transition-all flex items-center gap-1 shadow-xs"
              title="Unequip all vehicles"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Content Area: 3 Vehicle Cards */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
          {/* Active Preview Alert Banner */}
          {previewingVehicle && (
            <div className="bg-[#f8f4fb] border border-[#dbcee2] rounded-xl p-3 flex items-center justify-between gap-3 text-[#261b35] shadow-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Eye className="w-4 h-4 text-[#7544ae] flex-shrink-0 animate-pulse" />
                <div className="text-xs truncate">
                  <span className="text-[#766c83]">Previewing: </span>
                  <span className="font-bold text-[#261b35]">{previewingVehicle.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {ownedVehicles[previewingVehicle.id] ? (
                  <button
                    onClick={() => equipVehicle(previewingVehicle.id)}
                    className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm transition-all flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Equip</span>
                  </button>
                ) : (
                  <button
                    onClick={() => unlockVehicle(previewingVehicle.id)}
                    className="bg-gradient-to-r from-[#7544ae] to-[#542b82] text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm transition-all flex items-center gap-1"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Unlock</span>
                  </button>
                )}
                <button
                  onClick={clearVehiclePreview}
                  className="bg-white hover:bg-[#f8f4fb] text-[#766c83] hover:text-[#261b35] text-[11px] font-semibold px-2 py-1 rounded-lg border border-[#dbcee2] transition-all"
                >
                  Exit
                </button>
              </div>
            </div>
          )}

          {vehicles.map((v) => {
            const isOwned = !!ownedVehicles[v.id];
            const isEquipped = equippedVehicleId === v.id;
            const isPreviewing = previewVehicleId === v.id;
            const activeUpgradeKey = equippedVehicleUpgrades[v.id];
            const isUpgradeOwned = !!ownedVehicleUpgrades[v.upgradeEffect.id];

            return (
              <VehicleCard
                key={v.id}
                vehicle={v}
                isOwned={isOwned}
                isEquipped={isEquipped}
                isPreviewing={isPreviewing}
                activeUpgradeKey={activeUpgradeKey}
                previewUpgradeKey={previewVehicleUpgradeId}
                isUpgradeOwned={isUpgradeOwned}
                userCoins={coins}
                onPreview={() => previewVehicle(v.id, activeUpgradeKey)}
                onUnlock={() => unlockVehicle(v.id)}
                onEquip={() => equipVehicle(v.id)}
                onUnlockUpgrade={() => unlockVehicleUpgrade(v.id, v.upgradeEffect.id)}
                onToggleUpgrade={() => toggleVehicleUpgrade(v.id, v.upgradeEffect.id)}
              />
            );
          })}
        </div>

        {/* Footer Actions: Unequip Vehicle (Go on Foot) */}
        <div className="p-3 border-t border-[#dbcee2] bg-[#fbf9fc] flex-shrink-0 flex items-center justify-between gap-2">
          {equippedVehicleId ? (
            <button
              onClick={unequipVehicle}
              className="w-full py-2 px-3 rounded-xl bg-white hover:bg-[#f8f4fb] border border-[#dbcee2] text-[#4c3c5b] hover:text-[#261b35] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>Unequip Vehicle (Ride on Foot)</span>
            </button>
          ) : (
            <div className="text-center w-full text-xs text-[#766c83] py-1">
              Currently on foot. Select and equip any ride above!
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Real-time 3D Studio Showcase Canvas ── */}
      <div className="hidden lg:flex flex-1 min-w-0 min-h-0 relative bg-gradient-to-b from-[#f7f3fb] to-[#ede6f4] overflow-hidden">
        <CharacterViewer
          characterData={effectiveCharacter}
          autoRotate={isAutoRotating}
          resetTrigger={cameraResetTrigger}
        />

        {/* Floating Driving Mode Pill in top-right */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <button
            onClick={toggleDrivingMode}
            className={[
              'backdrop-blur-md px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-md flex items-center gap-1.5',
              isDrivingMode
                ? 'bg-[#7544ae] border-transparent text-white'
                : 'bg-white/90 border-[#dbcee2] text-[#4c3c5b] hover:text-[#261b35]',
            ].join(' ')}
          >
            <Gauge className="w-3.5 h-3.5 text-[#7544ae]" />
            <span>{isDrivingMode ? 'Running / Driving Animation: ON' : 'Turn On Drive Mode'}</span>
          </button>
        </div>

        {/* Vehicle Information Watermark in bottom-left */}
        {effectiveCharacter.vehicle && (
          <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
            <div className="bg-white/95 backdrop-blur-md border border-[#dbcee2] rounded-2xl p-3 shadow-lg shadow-purple-950/10">
              <span className="text-[10px] text-[#7544ae] font-bold uppercase tracking-widest block">
                Active Ride &amp; Custom Effects
              </span>
              <span className="text-base font-black text-[#261b35] block leading-tight">
                {effectiveCharacter.vehicle.name}
              </span>
              <span className="text-xs text-[#766c83] block mt-0.5">
                {effectiveCharacter.vehicleUpgrade
                  ? `Upgraded Trail: ${effectiveCharacter.vehicle.upgradeEffect.name}`
                  : `Default Trail: ${effectiveCharacter.vehicle.defaultEffect.name}`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
