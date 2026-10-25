import React, { useState } from 'react';
import { Search, Sparkles, Zap, ArrowRight, Check, Eye, Lock } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { getRarityConfig } from '../../config/rarity';

export default function CharacterRosterView() {
  const {
    characters,
    selectedCharacterId,
    selectCharacter,
    equippedCharacterId,
    equipCurrentCharacter,
    ownedCharacterIds = ['buster-blitz'],
    unlockCharacter,
    setActiveTab,
    showToast,
  } = useStudio();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');

  const filtered = characters.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(query.toLowerCase()) ||
                          c.role.toLowerCase().includes(query.toLowerCase());
    const matchesRarity = filter === 'ALL' || c.rarity.toUpperCase() === filter.toUpperCase();
    return matchesSearch && matchesRarity;
  });

  const handleCustomize = (charId) => {
    selectCharacter(charId);
    setActiveTab('studio');
    showToast(`Loaded ${characters.find((c) => c.id === charId)?.name} in 3D Studio`, 'info');
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#dbcee2] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#7544ae] uppercase tracking-widest">Character Archive</span>
            <span className="text-xs bg-[#f4edf8] text-[#7544ae] border border-[#dbcee2] px-2 py-0.5 rounded-full font-bold">
              {characters.length} Heroes Available
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#261b35] tracking-tight">
            Select Your Champion
          </h1>
          <p className="text-sm text-[#766c83] mt-1 max-w-2xl">
            Choose any character to inspect, rotate, and customize in real-time inside the 3D Studio.
          </p>
        </div>

        {/* Search & filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search hero or role…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-white border border-[#dbcee2] rounded-xl pl-9 pr-4 py-2 text-xs text-[#261b35] placeholder:text-slate-400 focus:outline-none focus:border-[#7544ae] focus:ring-1 focus:ring-[#7544ae]/30 w-full sm:w-56 shadow-xs"
            />
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#dbcee2] shadow-xs">
            {['ALL', 'RARE', 'EPIC', 'LEGENDARY'].map((r) => {
              const active = filter === r;
              const cfg = r !== 'ALL' ? getRarityConfig(r) : null;
              return (
                <button
                  key={r}
                  onClick={() => setFilter(r)}
                  className={[
                    'text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all',
                    active
                      ? 'bg-[#7544ae] text-white shadow-xs'
                      : 'text-[#766c83] hover:text-[#261b35] hover:bg-[#f5edf8]',
                  ].join(' ')}
                >
                  {r === 'ALL' ? 'All' : cfg?.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((char) => {
          const rarity = getRarityConfig(char.rarity);
          const isSelected = selectedCharacterId === char.id;
          const isEquipped = equippedCharacterId === char.id;
          const isOwned = ownedCharacterIds.includes(char.id);

          return (
            <div
              key={char.id}
              className={[
                'rounded-2xl border p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group shadow-xs',
                isSelected
                  ? 'bg-gradient-to-b from-white to-[#fbf8fe] border-[#7544ae] ring-2 ring-[#7544ae]/40 shadow-sm'
                  : 'bg-white border-[#dbcee2] hover:border-[#ba9fcb] hover:shadow-md',
              ].join(' ')}
              style={isSelected ? { boxShadow: `0 0 20px -4px ${rarity.glowColor}` } : {}}
            >
              {/* Card top banner: badge & hero title */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${rarity.badgeClass}`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: rarity.accentHex }} />
                      {rarity.label.toUpperCase()}
                    </span>
                    {!isOwned && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-lg">
                        <Lock className="w-3 h-3 text-amber-600" />
                        2,000 Coins
                      </span>
                    )}
                  </div>

                  {isEquipped && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 px-2.5 py-1 rounded-lg">
                      <Check className="w-3 h-3" />
                      Active Match Hero
                    </span>
                  )}
                </div>

                {/* Hero Avatar and Main Info */}
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-2xl text-white shadow-xs relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${char.colors.themeColor || char.colors.accentColor}, ${char.colors.accentColor})`,
                    }}
                  >
                    <span className="drop-shadow">{char.name.charAt(0)}</span>
                    <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 rounded-t-2xl" />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-[#261b35] group-hover:text-[#7544ae] transition-colors">
                      {char.name}
                    </h3>
                    <p className="text-xs font-semibold text-[#766c83] mt-0.5">{char.role}</p>
                    <p className="text-[11px] text-[#766c83] italic mt-1 leading-tight">
                      {char.quote}
                    </p>
                  </div>
                </div>

                {/* Lore description */}
                <p className="text-xs text-[#261b35] leading-relaxed bg-[#f8f4fb] p-3 rounded-xl border border-[#dbcee2] mb-4">
                  {char.description}
                </p>

                {/* Visual stats comparison preview */}
                <div className="space-y-1.5 bg-[#fbf9fc] p-3 rounded-xl border border-[#dbcee2] mb-4">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#766c83]">Agility</span>
                    <span className="font-bold text-[#261b35]">{char.attributes.agility}</span>
                  </div>
                  <div className="h-1 bg-[#ebe3f0] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${char.attributes.agility}%`, background: char.colors.accentColor }} />
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-[#766c83]">Dash Speed</span>
                    <span className="font-bold text-[#261b35]">{char.attributes.dashSpeed}</span>
                  </div>
                  <div className="h-1 bg-[#ebe3f0] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${char.attributes.dashSpeed}%`, background: char.colors.accentColor }} />
                  </div>
                </div>
              </div>

              {/* Card Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {!isOwned && (
                  <button
                    onClick={() => unlockCharacter(char.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-white transition-all shadow-md hover:brightness-105 active:scale-95 bg-gradient-to-r from-amber-600 via-[#7544ae] to-[#542b82]"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-300" />
                    <span>Unlock (2,000 Coins)</span>
                  </button>
                )}
                <button
                  onClick={() => handleCustomize(char.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold text-white transition-all shadow-md hover:brightness-105 active:scale-95 bg-gradient-to-r from-[#7544ae] to-[#542b82]"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isOwned ? "Customize in 3D" : "Inspect in 3D"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
