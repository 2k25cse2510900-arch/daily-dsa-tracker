import React from 'react';
import { RefreshCw, Pause, Play, ZoomIn, ZoomOut, Check, Gauge, Sparkles } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { getRarityConfig } from '../../config/rarity';

function ControlButton({ icon: Icon, label, onClick, active, variant = 'default', title }) {
  const baseClass = 'flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-[#7544ae]/40 select-none shadow-xs';

  const variantClass = {
    default: active
      ? 'bg-gradient-to-r from-[#7544ae] to-[#542b82] border-transparent text-white shadow-sm'
      : 'bg-white border-[#dbcee2] text-[#4c3c5b] hover:bg-[#f5edf8] hover:text-[#261b35] active:scale-95',
  }[variant];

  return (
    <button
      onClick={onClick}
      className={`${baseClass} ${variantClass}`}
      title={title || label}
      aria-label={label}
      aria-pressed={active}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="hidden sm:inline whitespace-nowrap">{label}</span>
    </button>
  );
}

export default function StudioControls() {
  const {
    selectedCharacter,
    equippedCharacterId,
    triggerCameraReset,
    triggerZoomIn,
    triggerZoomOut,
    isAutoRotating,
    toggleAutoRotate,
    equipCurrentCharacter,
    isDrivingMode,
    toggleDrivingMode,
    setActiveTab,
  } = useStudio();

  if (!selectedCharacter) return null;

  const rarity = getRarityConfig(selectedCharacter.rarity);
  const isEquipped = equippedCharacterId === selectedCharacter.id;

  return (
    <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-t border-[#dbcee2] bg-white/95 backdrop-blur-md">

      {/* Left: Camera rotation and zoom controls */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <ControlButton
          icon={RefreshCw}
          label="Reset View"
          onClick={triggerCameraReset}
          title="Reset camera to default front framing"
        />
        <ControlButton
          icon={isAutoRotating ? Pause : Play}
          label={isAutoRotating ? 'Pause Spin' : 'Auto Rotate'}
          onClick={toggleAutoRotate}
          active={isAutoRotating}
          title={isAutoRotating ? 'Pause automatic 3D turntable spin' : 'Start 3D turntable spin'}
        />
        <div className="hidden md:flex items-center gap-1">
          <ControlButton
            icon={ZoomIn}
            label="Zoom In"
            onClick={triggerZoomIn}
            title="Zoom camera closer to character"
          />
          <ControlButton
            icon={ZoomOut}
            label="Zoom Out"
            onClick={triggerZoomOut}
            title="Pull camera back for wider view"
          />
        </div>
      </div>

      {/* Center: Mount / Ride Simulator Controls */}
      <div className="flex items-center gap-2">
        <ControlButton
          icon={Gauge}
          label={
            selectedCharacter.vehicle
              ? isDrivingMode
                ? `Ride: ${selectedCharacter.vehicle.name} (Active)`
                : `Ride: ${selectedCharacter.vehicle.name}`
              : isDrivingMode
              ? 'Run Mode (Active)'
              : 'Test Run'
          }
          onClick={toggleDrivingMode}
          active={isDrivingMode}
          title={
            selectedCharacter.vehicle
              ? `Toggle animated driving motion for ${selectedCharacter.vehicle.name}`
              : 'Toggle character running test animation'
          }
        />
      </div>

      {/* Right: Equip / Status Button */}
      <div className="flex items-center gap-2">
        {isEquipped ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-xs">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Active Hero</span>
          </div>
        ) : (
          <button
            onClick={equipCurrentCharacter}
            className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all duration-200 text-white shadow-md hover:brightness-105 active:scale-95 bg-gradient-to-r from-[#7544ae] to-[#542b82]"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Equip {selectedCharacter.name}</span>
          </button>
        )}
      </div>

    </div>
  );
}
