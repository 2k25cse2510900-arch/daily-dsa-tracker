import React from 'react';
import { RotateCcw, Palette, Sparkles, Check, ShieldCheck, Sun } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { COLOR_PALETTES } from '../../data/wardrobe';

function ColorField({ label, colorKey, value, onChange, description }) {
  const isDefaultWhite = value?.toLowerCase() === '#ffffff';

  return (
    <div className="bg-white border border-[#dbcee2] rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs">
      <div>
        <div className="flex items-center gap-2">
          <label htmlFor={`color-${colorKey}`} className="text-xs font-bold text-[#261b35] block">
            {label}
          </label>
          {isDefaultWhite && (
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-300">
              ORIGINAL
            </span>
          )}
        </div>
        <span className="text-[10px] text-[#766c83] block">{description}</span>
        <span className="text-[11px] font-mono text-[#7544ae] font-semibold block mt-0.5">
          {value}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Color preview circle with hidden native picker overlay */}
        <div className="relative w-9 h-9 rounded-xl border border-[#dbcee2] shadow-xs cursor-pointer overflow-hidden group">
          <div
            className="w-full h-full"
            style={{ background: value }}
          />
          <input
            id={`color-${colorKey}`}
            type="color"
            value={value}
            onChange={(e) => onChange(colorKey, e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            title={`Pick ${label}`}
          />
        </div>
      </div>
    </div>
  );
}

export default function ColorCustomizer() {
  const {
    activeCharColors,
    setCustomColor,
    applyColorPalette,
    resetCustomColors,
    selectedCharacter,
  } = useStudio();

  const isAllOriginal =
    activeCharColors.baseColor?.toLowerCase() === '#ffffff' &&
    activeCharColors.secondaryColor?.toLowerCase() === '#ffffff';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-[#7544ae] uppercase tracking-widest flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" />
            Character Color Studio
          </h3>
          <p className="text-xs text-[#766c83] mt-0.5">
            Customize clothing, cape accents, and podium glow in real time.
          </p>
        </div>

        <button
          onClick={resetCustomColors}
          className="flex items-center gap-1 text-[11px] font-bold text-[#766c83] hover:text-[#261b35] bg-white hover:bg-[#f5edf8] border border-[#dbcee2] px-2.5 py-1.5 rounded-lg transition-all shadow-xs"
          title="Reset to original character textures"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Material Protection Notice */}
      <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 flex items-start gap-2.5 text-emerald-900 shadow-xs">
        <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
        <div className="text-[11px] leading-tight">
          <span className="font-bold text-emerald-800">Protected Materials: </span>
          <span>Face features, skin tone, and sword steel retain 100% original texture clarity and are never distorted by clothing tints.</span>
        </div>
      </div>

      {/* Quick Original Texture Button */}
      {!isAllOriginal && (
        <button
          onClick={resetCustomColors}
          className="w-full py-2 px-3 rounded-xl bg-white hover:bg-[#f8f4fb] border border-[#dbcee2] text-[#261b35] text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2"
        >
          <Sun className="w-3.5 h-3.5 text-amber-600" />
          <span>Restore Pristine Original Model Textures</span>
        </button>
      )}

      {/* Coordinated Color Presets */}
      <div>
        <h4 className="text-[11px] font-bold text-[#766c83] uppercase tracking-wider mb-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          Coordinated Color Presets
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {COLOR_PALETTES.map((palette) => {
            const isSelected =
              activeCharColors.baseColor?.toLowerCase() === palette.base.toLowerCase() &&
              activeCharColors.secondaryColor?.toLowerCase() === palette.secondary.toLowerCase();

            return (
              <button
                key={palette.name}
                onClick={() => applyColorPalette(palette)}
                className={[
                  'border rounded-xl p-2.5 text-left transition-all duration-200 group active:scale-95 relative overflow-hidden select-none shadow-xs',
                  isSelected
                    ? 'bg-gradient-to-r from-[#fbf8fe] to-[#f4edf8] border-[#7544ae] ring-1 ring-[#7544ae]/40'
                    : 'bg-white hover:bg-[#f8f4fb] border-[#dbcee2] hover:border-[#ba9fcb]',
                ].join(' ')}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1">
                    {[palette.base, palette.accent, palette.secondary, palette.glow].map((c, i) => (
                      <span
                        key={i}
                        className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-xs"
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  {isSelected && <Check className="w-3 h-3 text-[#7544ae]" />}
                </div>
                <span className="text-[11px] font-bold text-[#261b35] group-hover:text-[#7544ae] block truncate">
                  {palette.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Individual Color Fields */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-bold text-[#766c83] uppercase tracking-wider">
          Fine-Tune Color Slots
        </h4>

        <ColorField
          label="Clothing & Armor"
          colorKey="baseColor"
          value={activeCharColors.baseColor}
          onChange={setCustomColor}
          description="Main armor plating, tunic, and garment tone"
        />

        <ColorField
          label="Cape & Cloak Fabric"
          colorKey="secondaryColor"
          value={activeCharColors.secondaryColor}
          onChange={setCustomColor}
          description="Shoulder cape and fabric trims"
        />

        <ColorField
          label="Accessory Accents"
          colorKey="accentColor"
          value={activeCharColors.accentColor}
          onChange={setCustomColor}
          description="Headwear, horns, crown, and decorative badges"
        />

        <ColorField
          label="Stage Glow & Aura"
          colorKey="glowColor"
          value={activeCharColors.glowColor}
          onChange={setCustomColor}
          description="Podium neon inlay ring and particle aura light"
        />
      </div>
    </div>
  );
}
