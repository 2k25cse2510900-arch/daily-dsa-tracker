import React from 'react';
import { Search, X, Lock } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { getRarityConfig } from '../../config/rarity';

const RARITY_FILTERS = ['ALL', 'COMMON', 'RARE', 'EPIC', 'LEGENDARY'];

function CharacterCard({ character, isSelected, isEquipped, isOwned = true, onClick }) {
  const rarity = getRarityConfig(character.rarity);

  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left rounded-xl p-3 border transition-all duration-200 relative overflow-hidden group',
        isSelected
          ? 'bg-gradient-to-r from-[#f7eefb] to-[#f2e5f6] border-[#7544ae] ring-1 ring-[#7544ae]/40 shadow-sm'
          : 'bg-white border-[#e5dcee] hover:bg-[#f8f3fa] hover:border-[#ba9fcb]',
      ].join(' ')}
      style={isSelected ? { boxShadow: `0 0 16px -4px ${rarity.glowColor}` } : {}}
      aria-pressed={isSelected}
      aria-label={`Select ${character.name}`}
    >
      {/* Selected indicator bar */}
      {isSelected && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
          style={{ background: rarity.accentHex }}
        />
      )}

      {/* Character color swatch + info */}
      <div className="flex items-center gap-3 pl-1">
        {/* Avatar circle with character theme gradient */}
        <div
          className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-base font-black uppercase shadow-xs relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${character.colors.themeColor || character.colors.accentColor}, ${character.colors.accentColor})` }}
        >
          <span className="text-white text-lg drop-shadow">{character.name.charAt(0)}</span>
          <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 rounded-t-xl" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-[#261b35] truncate">{character.name}</span>
            {isEquipped ? (
              <span className="flex-shrink-0 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 px-1.5 py-0.5 rounded-full">
                ACTIVE
              </span>
            ) : !isOwned ? (
              <span className="flex-shrink-0 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5 text-amber-600" />
                2,000
              </span>
            ) : null}
          </div>
          <p className="text-[11px] text-[#766c83] truncate mt-0.5">{character.role}</p>
          {/* Rarity badge */}
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md mt-1 border ${rarity.badgeClass}`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: rarity.accentHex }}
            />
            {rarity.label}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function CharacterCollection() {
  const {
    filteredCharacters,
    selectedCharacterId,
    equippedCharacterId,
    ownedCharacterIds = ['buster-blitz'],
    selectCharacter,
    searchQuery,
    setSearchQuery,
    rarityFilter,
    setRarityFilter,
    characters,
  } = useStudio();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Panel header */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0">
        <h2 className="text-xs font-semibold text-[#766c83] uppercase tracking-widest mb-3">
          Character Roster
          <span className="ml-2 bg-[#f4edf8] text-[#7544ae] border border-[#dbcee2] text-[10px] px-1.5 py-0.5 rounded-full font-bold">
            {characters.length}
          </span>
        </h2>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search characters…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#f8f4fb] border border-[#dbcee2] rounded-lg pl-8 pr-8 py-2 text-xs text-[#261b35] placeholder:text-slate-400 focus:outline-none focus:border-[#7544ae] focus:ring-1 focus:ring-[#7544ae]/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Rarity filter pills */}
        <div className="flex gap-1 flex-wrap">
          {RARITY_FILTERS.map((r) => {
            const isActive = rarityFilter === r;
            const config = r !== 'ALL' ? getRarityConfig(r) : null;
            return (
              <button
                key={r}
                onClick={() => setRarityFilter(r)}
                className={[
                  'text-[10px] font-semibold px-2 py-1 rounded-md border transition-all',
                  isActive
                    ? r === 'ALL'
                      ? 'bg-[#7544ae] text-white border-[#7544ae]'
                      : 'border-current'
                    : 'bg-white text-[#766c83] border-[#dbcee2] hover:text-[#261b35] hover:bg-[#f3edf7]',
                ].join(' ')}
                style={isActive && config ? { color: config.accentHex, borderColor: config.accentHex, background: config.accentHex + '18' } : {}}
              >
                {r === 'ALL' ? 'All' : r.charAt(0) + r.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Character list */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2 min-h-0">
        {filteredCharacters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            <Search className="w-8 h-8 text-slate-400" />
            <p className="text-[#766c83] text-xs">No characters match your search.</p>
            <button
              onClick={() => { setSearchQuery(''); setRarityFilter('ALL'); }}
              className="text-[#7544ae] text-xs hover:underline font-bold"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredCharacters.map((char) => (
            <CharacterCard
              key={char.id}
              character={char}
              isSelected={selectedCharacterId === char.id}
              isEquipped={equippedCharacterId === char.id}
              isOwned={ownedCharacterIds.includes(char.id)}
              onClick={() => selectCharacter(char.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
