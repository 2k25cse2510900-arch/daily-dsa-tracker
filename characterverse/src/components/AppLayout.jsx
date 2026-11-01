import React from 'react';
import { useStudio } from '../context/StudioContext';
import TopNav from './navigation/TopNav';
import CharacterCollection from './panels/CharacterCollection';
import CharacterDetails from './panels/CharacterDetails';
import CharacterViewer from './viewer/CharacterViewer';
import RaceArena from './arena/RaceArena';
import StudioControls from './panels/StudioControls';
import CharacterRosterView from './views/CharacterRosterView';
import WardrobeView from './views/WardrobeView';
import VehicleStoreView from './views/VehicleStoreView';
import InventoryView from './views/InventoryView';
import PlaceholderModal from './ui/PlaceholderModal';
import Toast from './ui/Toast';
import { getRarityConfig } from '../config/rarity';

const LIVE_ARENA_STATE = {
  targetMilestone: 700,
  baseline: 0,
  racers: [
    {
      id: "member_mvggb1nmx303va",
      memberId: "member_mvggb1nmx303va",
      name: "Krish (ADMIN)",
      username: "KrishChaddha106",
      laneIndex: 0,
      solved: 571,
      solvedCount: 571,
      solvedAvailable: true,
      stats: { total: 571, easy: 424, medium: 143, hard: 4 },
      character: { equippedCharacterId: "superman", selectedCharacterId: "superman", characterId: "superman", outfitId: "outfit-default" },
      progress: 0.8157,
      rank: 1,
    },
    {
      id: "member_mvggbpb5y8e3h9",
      memberId: "member_mvggbpb5y8e3h9",
      name: "Kartik Kumar",
      username: "Kartik_kumar_29",
      laneIndex: 1,
      solved: 462,
      solvedCount: 462,
      solvedAvailable: true,
      stats: { total: 462, easy: 398, medium: 62, hard: 2 },
      character: { equippedCharacterId: "kartik-kumar", selectedCharacterId: "kartik-kumar", characterId: "kartik-kumar", outfitId: "outfit-default" },
      progress: 0.66,
      rank: 2,
    },
    {
      id: "member_mvggcet3ogmjrn",
      memberId: "member_mvggcet3ogmjrn",
      name: "Tanmay Awasthi",
      username: "tanmayawasthi_code",
      laneIndex: 2,
      solved: 340,
      solvedCount: 340,
      solvedAvailable: true,
      stats: { total: 340, easy: 266, medium: 68, hard: 6 },
      character: { equippedCharacterId: "buster-blitz", selectedCharacterId: "buster-blitz", characterId: "buster-blitz", outfitId: "outfit-warrior" },
      progress: 0.4857,
      rank: 3,
    },
    {
      id: "member_mvggcs86gcby6t",
      memberId: "member_mvggcs86gcby6t",
      name: "Avantika Yadav",
      username: "avan_tika2776",
      laneIndex: 3,
      solved: 209,
      solvedCount: 209,
      solvedAvailable: true,
      stats: { total: 209, easy: 176, medium: 31, hard: 2 },
      character: { equippedCharacterId: "avantika-yadav", selectedCharacterId: "avantika-yadav", characterId: "avantika-yadav", outfitId: "outfit-default" },
      progress: 0.2986,
      rank: 4,
    },
    {
      id: "member_mvggeccjh94w6y",
      memberId: "member_mvggeccjh94w6y",
      name: "Deepanshu Sachan",
      username: "Deepanshu_Sachan",
      laneIndex: 7,
      solved: 92,
      solvedCount: 92,
      solvedAvailable: true,
      stats: { total: 92, easy: 66, medium: 25, hard: 1 },
      character: { equippedCharacterId: "buster-blitz", selectedCharacterId: "buster-blitz", characterId: "buster-blitz", outfitId: "outfit-default" },
      progress: 0.1314,
      rank: 5,
    },
    {
      id: "member_mvggd5du6db87b",
      memberId: "member_mvggd5du6db87b",
      name: "Kshitij Rajput",
      username: "1729kshitij",
      laneIndex: 4,
      solved: 84,
      solvedCount: 84,
      solvedAvailable: true,
      stats: { total: 84, easy: 60, medium: 24, hard: 0 },
      character: { equippedCharacterId: "buster-blitz", selectedCharacterId: "buster-blitz", characterId: "buster-blitz", outfitId: "outfit-default" },
      progress: 0.12,
      rank: 6,
    },
    {
      id: "member_mvggdgrdrgmkdf",
      memberId: "member_mvggdgrdrgmkdf",
      name: "Krishna Kumar Gaur",
      username: "KrishnaKumarGaur",
      laneIndex: 5,
      solved: 58,
      solvedCount: 58,
      solvedAvailable: true,
      stats: { total: 58, easy: 32, medium: 22, hard: 4 },
      character: { equippedCharacterId: "buster-blitz", selectedCharacterId: "buster-blitz", characterId: "buster-blitz", outfitId: "outfit-default" },
      progress: 0.0829,
      rank: 7,
    },
    {
      id: "member_mvggdw3xiz0d21",
      memberId: "member_mvggdw3xiz0d21",
      name: "Kanika Dwivedi",
      username: "Kanika_Dwii",
      laneIndex: 6,
      solved: 28,
      solvedCount: 28,
      solvedAvailable: true,
      stats: { total: 28, easy: 13, medium: 14, hard: 1 },
      character: { equippedCharacterId: "buster-blitz", selectedCharacterId: "buster-blitz", characterId: "buster-blitz", outfitId: "outfit-default" },
      progress: 0.04,
      rank: 8,
    },
  ]
};

/* ─── Coming Soon screen (for Shop / Inventory tabs) ─── */
function ComingSoonScreen({ tab }) {
  const { setActiveTab, branding } = useStudio();
  const navTab = branding.navigationTabs.find((t) => t.id === tab);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 text-center bg-gradient-to-b from-[#f7f3f9] via-[#ebe6f0] to-[#e4dde9]">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/15 via-indigo-500/15 to-cyan-500/15 border border-[#dbcee2] flex items-center justify-center text-4xl shadow-md">
        🔒
      </div>
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#261b35] mb-2 tracking-tight">
          {navTab?.label || 'Coming Soon'}
        </h2>
        <p className="text-sm text-[#766c83] max-w-sm leading-relaxed">
          {navTab?.description || 'This feature is planned for a future phase.'}
        </p>
        {navTab?.badge && (
          <span className="inline-block text-xs font-bold bg-[#f4edf8] text-[#7544ae] border border-[#dbcee2] px-3 py-1 rounded-full mt-3 uppercase tracking-wider">
            {navTab.badge}
          </span>
        )}
      </div>
      <button
        onClick={() => setActiveTab('studio')}
        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#7544ae] to-[#542b82] text-white text-sm font-bold hover:brightness-105 active:scale-95 transition-all shadow-md shadow-purple-900/20"
      >
        ← Return to 3D Studio
      </button>
    </div>
  );
}

/* ─── 3D Viewer Background ─── */
function ViewerBackground({ character }) {
  const rarity = getRarityConfig(character?.rarity);
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `
          radial-gradient(ellipse 65% 55% at 50% 80%, ${rarity.accentHex}15 0%, transparent 65%),
          radial-gradient(ellipse 80% 60% at 50% 15%, rgba(117, 68, 174, 0.08) 0%, transparent 70%),
          radial-gradient(ellipse 90% 70% at 50% 95%, rgba(14, 165, 233, 0.10) 0%, transparent 75%),
          linear-gradient(180deg, #f7f3fb 0%, #ede6f4 55%, #e3dbed 100%)
        `,
      }}
    />
  );
}

/* ─── Studio View (center 3D panel) ─── */
function StudioView({ onPreviewReady, embedded = false }) {
  const { effectiveCharacter, isAutoRotating, cameraResetTrigger } = useStudio();

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isArenaMode = searchParams?.get('arena') === 'true';
  const arenaCamera = searchParams?.get('cam') || 'leader';

  if (isArenaMode) {
    return (
      <div className="flex flex-col flex-1 min-h-0 min-w-0 relative overflow-hidden bg-[#090d16]">
        <RaceArena
          arenaState={LIVE_ARENA_STATE}
          cameraMode={arenaCamera}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 relative overflow-hidden">
      {/* Viewer Area */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        {effectiveCharacter && <ViewerBackground character={effectiveCharacter} embedded={embedded} />}
        <div className="absolute inset-0">
          <CharacterViewer
            characterData={effectiveCharacter}
            autoRotate={isAutoRotating}
            resetTrigger={cameraResetTrigger}
            onReady={onPreviewReady}
          />
        </div>

        {/* Character name badge (bottom-left of viewer) */}
        {effectiveCharacter && (
          <div className="absolute bottom-4 left-4 pointer-events-none z-10">
            <div className="bg-white/95 backdrop-blur-xl border border-[#dbcee2] rounded-2xl p-3.5 shadow-lg shadow-purple-950/10">
              <span className="text-[10px] text-[#7544ae] font-extrabold uppercase tracking-widest block flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7544ae] animate-ping inline-block" />
                Active 3D Customizer
              </span>
              <span className="text-base font-black text-[#261b35] block leading-tight mt-0.5">
                {effectiveCharacter.name}
              </span>
              <span className="text-xs font-semibold text-[#766c83] block mt-0.5">
                {effectiveCharacter.role}
              </span>
            </div>
          </div>
        )}

        {/* Framing & Controls Tip */}
        <div className="absolute top-4 right-4 pointer-events-none hidden sm:block z-10">
          <div className="bg-white/90 backdrop-blur-xl border border-[#dbcee2] rounded-xl px-3 py-1.5 text-right shadow-md">
            <p className="text-[10px] text-[#7544ae] font-bold">🖱 Left Click + Drag to Orbit</p>
            <p className="text-[10px] text-[#766c83]">Scroll Wheel or Pinch to Zoom</p>
          </div>
        </div>
      </div>

      {/* Controls bar */}
      <StudioControls />
    </div>
  );
}

/* ─── Root Layout ─── */
export default function AppLayout({ embedded = false, onPreviewReady = null }) {
  const { activeTab } = useStudio();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isArenaMode = searchParams?.get('arena') === 'true';
  const arenaCamera = searchParams?.get('cam') || 'leader';

  if (isArenaMode) {
    return (
      <div className="w-screen h-screen overflow-hidden bg-[#090d16] relative">
        <RaceArena
          arenaState={LIVE_ARENA_STATE}
          cameraMode={arenaCamera}
        />
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${embedded ? 'min-h-[640px]' : 'h-screen'} bg-[#ebe6f0] text-[#261b35] overflow-hidden`}>
      {/* Top Nav */}
      <TopNav />

      {/* Main workspace */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {activeTab === 'studio' ? (
          <>
            {/* ── LEFT: Character Collection ── */}
            <aside className="hidden lg:flex flex-col w-64 xl:w-72 flex-shrink-0 border-r border-[#dbcee2] bg-white/95 backdrop-blur-xl overflow-hidden shadow-sm z-10">
              <CharacterCollection />
            </aside>

            {/* ── CENTER: Studio 3D Canvas ── */}
            <main className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden relative">
              <StudioView onPreviewReady={onPreviewReady} embedded={embedded} />
            </main>

            {/* ── RIGHT: Character Details ── */}
            <aside className="hidden lg:flex flex-col w-72 xl:w-80 flex-shrink-0 border-l border-[#dbcee2] bg-white/95 backdrop-blur-xl overflow-hidden shadow-sm z-10">
              <CharacterDetails />
            </aside>
          </>
        ) : activeTab === 'wardrobe' ? (
          /* ── INTERACTIVE WARDROBE & 3D STUDIO ── */
          <main className="flex flex-1 min-w-0 min-h-0 overflow-hidden bg-[#ebe6f0]">
            <WardrobeView />
          </main>
        ) : activeTab === 'vehicles' || activeTab === 'shop' ? (
          /* ── PREMIUM VEHICLE HANGAR & STORE ── */
          <main className="flex flex-1 min-w-0 min-h-0 overflow-hidden bg-[#ebe6f0]">
            <VehicleStoreView />
          </main>
        ) : activeTab === 'characters' ? (
          /* ── CHARACTERS ROSTER VIEW ── */
          <main className="flex flex-1 min-w-0 min-h-0 overflow-hidden bg-[#ebe6f0]">
            <CharacterRosterView />
          </main>
        ) : activeTab === 'inventory' ? (
          <InventoryView />
        ) : (
          /* ── COMING SOON VIEW ── */
          <main className="flex flex-1 min-w-0 min-h-0 overflow-hidden">
            <ComingSoonScreen tab={activeTab} />
          </main>
        )}
      </div>

      {/* Mobile: Bottom Character Switcher for quick selection in Studio */}
      {activeTab === 'studio' && (
        <div className="lg:hidden border-t border-[#dbcee2] bg-white/95 backdrop-blur-xl px-3 py-2 flex-shrink-0">
          <MobileCharacterRow />
        </div>
      )}

      {/* Overlays */}
      <PlaceholderModal />
      <Toast />
    </div>
  );
}

/* ─── Mobile row: compact character picker ─── */
function MobileCharacterRow() {
  const { characters, selectedCharacterId, selectCharacter } = useStudio();

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
      {characters.map((char) => {
        const isSelected = selectedCharacterId === char.id;
        const rarity = getRarityConfig(char.rarity);
        return (
          <button
            key={char.id}
            onClick={() => selectCharacter(char.id)}
            className={[
              'flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all select-none',
              isSelected
                ? 'border-[#7544ae] bg-[#f4edf8] ring-1 ring-[#7544ae]/40 shadow-sm'
                : 'border-[#dbcee2] bg-white hover:bg-[#f8f4fb]',
            ].join(' ')}
            style={isSelected ? { boxShadow: `0 0 14px -3px ${rarity.glowColor}` } : {}}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white shadow-xs flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${char.colors.baseColor}, ${char.colors.accentColor})` }}
            >
              {char.name.charAt(0)}
            </div>
            <div className="text-left leading-none">
              <span className="text-xs font-bold text-[#261b35] block">{char.name}</span>
              <span className="text-[9px] font-extrabold block mt-0.5" style={{ color: rarity.accentHex }}>
                {rarity.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
