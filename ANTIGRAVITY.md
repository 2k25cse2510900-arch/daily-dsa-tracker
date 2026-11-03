# Antigravity Project Memory — CharacterVerse Race Arena

## 1. Project Identity & Vision
- **Project:** CharacterVerse 3D Race Arena within Daily DSA Tracker.
- **Vision:** Transform the legacy Race Arena into an expansive, procedural endless-world racing journey. Racers physically travel forward continuously through a scenic mountain-and-nature world with flowing rivers, waterfalls, bridges, dense pine forests, and distant alpine peaks—without artificial circular loops, lap counters, or start/finish barriers. Equipped Store vehicles (Bikes, Cars, Rockets) genuinely transform character travel mechanics with authentic 3D meshes, custom seating postures, wheel roll/bank kinematics, and live telemetry HUDs, all while strictly preserving authoritative LeetCode progress and academic rankings.

## 2. Core Architecture
- **World System (`characterverse/src/components/arena/world/`):**
  - `WorldConfig.js`: Analytical procedural road spine with continuous $C^1$ derivatives ($X(s)$, $Y(s)$, $T(s)$, $N(s)$), lane offsets (8 lanes, 2m width, 20m total roadbed), and procedural terrain height function with elevated roadbed clearing.
  - `RoadChunk.jsx`: 3D procedural road ribbon with 8 parallel lanes, 9 white dashed lane divider strips, alternating red-and-white roadside kerbs, and stone bridge integration.
  - `TerrainChunk.jsx`: Sculpted mountain-valley terrain with biome-altitude shading (valley greens, foothill meadows, granite rock crags, snowcapped peaks).
  - `NatureProps.jsx`: Deterministic alpine evergreen pines, birch trees, natural granite boulders, roadside timber posts, flowing alpine rivers, and distant mountain massifs.
  - `ProceduralWorld.jsx`: Chunk Streaming Manager that streams chunks ahead of the pack while recycling chunks left behind, maintaining seamless $C^1$ continuity across boundaries.
- **Vehicle System (`characterverse/src/components/arena/` & `characterverse/src/components/viewer/`):**
  - `VehicleConfig.js`: Unified vehicle archetype configuration (`none`, `vehicle-bike`, `vehicle-car`, `vehicle-rocket`) specifying cruise speeds, acceleration, handling, road suspension, flight elevation, banking multipliers, and `calculateVehicleTelemetry()`.
  - `VehicleMesh.jsx`: Production 3D vehicle geometries matching the Store catalog:
    - **Common Ninja Superbike (`vehicle-bike`):** High-tensile trellis frame, aerodynamic front fairing, functional front & rear wheel assemblies with forward rolling animation, disc calipers, and spark/dust trails.
    - **Rare Apex Supercar (`vehicle-car`):** Low-profile aerodynamic chassis, driver cockpit, rear GT swan-neck spoiler, quad exhaust, 4 rotating mag wheels, and tire friction smoke trails.
    - **Legendary Cosmic Titan Rocket (`vehicle-rocket`):** Sleek aerospace fuselage, dual stabilizer wings, ion thruster bell nozzle, plasma thrust vectoring petals, and controlled flight levitation (~1.35m clearance).
  - **Mounting & Character Posture:**
    - Seamless mounting via `Sit_Chair_Idle` clip in `CharacterViewer.jsx` / `ArenaRacer`.
    - Handheld weapons and shields are automatically stowed (`child.visible = false`) when mounted.
- **Movement Simulation (`characterverse/src/components/arena/simulation/`):**
  - `RaceMovementController.js`: Continuous physical forward travel along the procedural road path decoupled from LeetCode polling. Translates characters/vehicles forward continuously with vehicle-specific kinematics:
    - Motorcycles lean into road curves using procedural road curvature $\kappa(s)$.
    - Supercars apply subtle chassis roll and road suspension bob.
    - Rockets hover at elevated flight clearance with aerodynamic pitch.
    - Non-vehicle characters run athletically; Superman flies at elevated clearance ($Y = 1.25$).
  - **Academic Independence:** Authoritative LeetCode solved counts, rankings, and relative gaps dictate pack order without fabricating academic data.
- **Telemetry HUD & Camera System (`characterverse/src/components/arena/`):**
  - `<VehicleTelemetryHUD>`: Compact glassmorphic overlay in top-right corner displaying equipped vehicle name, rarity badge, live telemetry speed (km/h), handling rating, trail status, active lane, and verified LeetCode solved count clearly separated.
  - `JourneyCamera.jsx`: User-centric game camera supporting Journey Follow (`leader`), Scenic Vista (`broadcast`), and Free Orbit (`orbit`).
  - **Manual preservation guarantee:** Camera never snaps back on a timer or forces follow after user manual interaction; preserves user manual offsets relative to target. Smoothly focuses on any selected racer via `focus` parameter (`focus=bike`, `focus=car`, `focus=rocket`, or specific racer ID).
- **Store & Server Validation (`arena-race.js`):**
  - Authoritative entitlement validation in `buildRacerPayload()`: verifies equipped vehicles and upgrades against the student's persistent `cvDoc.inventory.vehicles` and `vehicleUpgrades`.
  - Unowned, invalid, or expired vehicle assignments fall back safely to unmounted foot running (`vehicle: null`), preventing client-side spoofing.
  - Vehicles are purchased exclusively using in-game coins earned through DSA problem solving.

## 3. Preservation Invariants (Strictly Maintained)
- **LeetCode & Academic Invariants:** Authoritative solved counts, weekly tracker, database models, session authentication, and student rankings must never be fabricated or overwritten.
- **Store & CharacterVerse Assets:** Coins, purchases, inventory outfits, cosmetics, and character models remain authentic and operational.
- **Test Invariants:**
  - `characterverse/src/components/arena/RaceArena.jsx` must include `const isSuperman = characterData?.id === 'superman'` and `1.25`.
  - Embed bundle must export `mountRaceArena` and include `DoubleSide`.
  - Camera modes `leader`, `broadcast`, and `orbit` must remain active and functional.
  - Synced assets in `public/characterverse/` and `public/characterverse-embed/` must match build output.

## 4. Current Implementation Phase
- **Phase 2: Vehicle System & Store Integration (Completed & Fully Verified Locally)**
  - Replaced abstract speed multipliers with genuine 3D vehicle geometries matching Store catalog.
  - Mounted characters into vehicles with seated riding poses and stowed weapons.
  - Implemented vehicle-specific travel physics: motorcycle curve banking, supercar chassis roll, and rocket flight elevation.
  - Integrated Store inventory entitlement validation on the backend.
  - Integrated live Telemetry HUD displaying speed, handling, trail status, and verified LeetCode counts.
  - Fully verified across standalone, embedded, and headless browser visual tests.

## 5. Files Created or Modified
- `ANTIGRAVITY.md` (Project memory source of truth updated for Phase 2)
- `characterverse/src/components/arena/simulation/VehicleConfig.js` (Created: vehicle archetypes, telemetry calculations)
- `characterverse/src/components/arena/simulation/RaceMovementController.js` (Updated: vehicle kinematics, banking, elevation)
- `characterverse/src/components/arena/RaceArena.jsx` (Updated: vehicle mesh integration, mounted poses, Telemetry HUD)
- `arena-race.js` (Updated: server-side vehicle entitlement and inventory verification)
- `characterverse/src/components/AppLayout.jsx` (Updated: focus resolution, fixed useMemo import; **Phase 2 sync fix**: replaced hardcoded `LIVE_ARENA_STATE` usage in arena mode with live `useArenaLiveState` hook that polls `/api/arena/live` every 20s and falls back to static demo data if API is unavailable)
- `characterverse/src/styles/index.css` & `style.css` & `public/style.css` (Updated: Telemetry HUD and minimap styling)
- `test/phase2-vehicles.test.js` (Created: unit tests for vehicle config, kinematics, server validation, HUD)
- `public/characterverse-embed/characterverse-embed.js` & `.css` (Rebuilt & synced)
- `public/characterverse/assets/index-5SECKGWP.js` & `index-CmwDE8Cp.css` (Rebuilt & synced)
- `public/characterverse/index.html` (Synced)

## 6. Build & Test Verification Results
- **Standalone Build:** `npm.cmd --prefix characterverse run build` (Completed with code 0).
  - Bundle: `dist/assets/index-BiNLp8p5.js` (1,305 kB) + `index-CmwDE8Cp.css` (48 kB).
- **Embed Bundle Build:** `npm.cmd --prefix characterverse run build:embed` (Completed with code 0).
  - Bundle: `dist-embed/characterverse-embed.js` (1,320 kB) + `characterverse-embed.css` (48 kB).
- **Public Asset Sync:** `node scripts/prepare-vercel-assets.js` (Completed with code 0).
- **Automated Test Suite:** `node --test test/*.test.js` (187 tests total: 184 passed, 3 skipped, **0 failed**).
- **Browser Visual Verification (Phase 2):** Captured in headless Edge:
  - `vehicle_journey_bike.png`: Kartik Kumar mounted on the Common Ninja Superbike in Lane 2 with rolling wheels, leaning posture, and live telemetry HUD (54 km/h, ✨ Upgraded Trail, 462 Solved).
  - `vehicle_journey_car.png`: Tanmay Awasthi seated in the cockpit of the Rare Apex Supercar in Lane 3 with 4 mag wheels, rear GT wing, and live telemetry HUD (64 km/h, 340 Solved).
  - `vehicle_journey_rocket.png`: Avantika Yadav flying elevated in the Legendary Cosmic Titan Rocket in Lane 4 with plasma thrusters, stabilizer fins, and live telemetry HUD (73 km/h, 209 Solved).
  - `vehicle_arena_pack_overview.png`: Scenic pack overview showing Superman flying ahead in Lane 1, followed by the pack of racers and vehicles traveling along the 8-lane procedural highway.

## 6b. Phase 2 Sync Fix (Store → Arena Equipment Synchronization)
- **Root Cause:** `AppLayout.jsx` rendered `RaceArena` in arena mode (`?arena=true`) with the hardcoded `LIVE_ARENA_STATE` constant, so the standalone CharacterVerse app never reflected server-persisted equipment changes regardless of what players equipped in the Store.
- **Fix:** Added `useArenaLiveState(isEnabled)` hook in `AppLayout.jsx` that:
  1. Calls `fetch('/api/arena/live')` on mount.
  2. Polls every 20 s via `setInterval`.
  3. Falls back to `LIVE_ARENA_STATE` demo data if API is unavailable (graceful degradation).
  - Applied the hook in **both** `StudioView` (for `?arena=true` within studio layout) and `AppLayout` root (for full-screen arena mode).
- **File Modified:** `characterverse/src/components/AppLayout.jsx` only.
- **Source of Truth Field:** `characterVerseProfiles[memberId].appearance.equippedVehicleId` (MongoDB).
- **Per-player resolution:** `buildRacerPayload()` in `arena-race.js` independently reads each member's `cvDoc.appearance.equippedVehicleId` and validates against `cvDoc.inventory.vehicles`.
- **Effective latency:** ~350ms debounce (client→server save) + up to 20s polling = ~21s max before arena reflects equipment change.
- **Tests:** 187 total, 184 pass, 3 skip, 0 fail (no regressions).
- **Builds:** Both standalone (`index-BiNLp8p5.js`) and embed (`characterverse-embed.js`) rebuilt cleanly post-fix.

## 6c. Critical Fix — Permanent CharacterVerse Vehicle Equipment Persistence
- **Root Causes Identified:**
  1. `validateAppearance` in `characterverse-profiles.js` strictly required all character IDs in appearance maps (`customColors`, `equippedOutfits`, `equippedCosmetics`) to be in the static `CHARACTER_IDS` set (`buster-blitz`, `nebula-nova`, `superman`). Any member with an extra character in `inventory.characters` (such as Admin Krish's `krish-admin` or member avatars) failed server validation with a 400 Bad Request (`INVALID_APPEARANCE`). Consequently, when Admin Krish equipped the Rocket, the server silently rejected the update and the database retained `equippedVehicleId: null`.
  2. `StudioContext.jsx` equipment actions (`equipVehicle`, `unequipVehicle`, `selectRaceMode`, `equipCurrentCharacter`, `equipOutfit`) previously only modified local component state and deferred server synchronization to a 350 ms debounced `useEffect`. If the user clicked "Back to Profile" or navigated away within that window, the unmount cleanup (`clearTimeout`) cancelled the timer, permanently dropping the update.
  3. Lack of a `keepalive: true` flush mechanism on unmount meant in-flight or pending background state transitions were lost during full browser navigations.
  4. Client `applyServerProfile` previously replaced missing appearance attributes with `null`, allowing partial or incomplete API responses to inadvertently unequip valid equipment.
- **Implemented Fixes:**
  1. **Backend Validation (`characterverse-profiles.js`):**
     - Dynamic allowed character check: `const isAllowedChar = (id) => CHARACTER_IDS.has(id) || ownedCharacters.has(id);`.
     - Appearance maps safely iterate and skip non-owned or non-catalog characters instead of aborting the entire request.
     - `raceMode === 'vehicle'` dynamically validates the incoming `equippedVehicleId` (or the existing one) against `ownedVehicles`.
  2. **Immediate Server Synchronization (`StudioContext.jsx`):**
     - Implemented `saveAppearanceImmediately(partialPayload)` that persists directly to `PUT /api/characterverse/me/appearance` and awaits server confirmation.
     - `equipVehicle(vehicleId)`, `unequipVehicle()`, `selectRaceMode(mode)`, `equipCurrentCharacter()`, and `equipOutfit(outfit)` now invoke `saveAppearanceImmediately` on trigger.
     - Added `pendingPayloadRef` and `keepalive: true` unload flush in `useEffect` cleanup to guarantee delivery even if the tab or page navigates during transition.
     - Guarded `applyServerProfile` against partial/empty payload overwrites by checking for explicit `!== undefined` on incoming properties.
  3. **Arena Integration (`RaceArena.jsx` & `AppLayout.jsx`):**
     - `RaceArena` accepts authenticated player inventory and equipped state (`myEquippedVehicleId`, `myOwnedVehicles`) as fallback for local demo data.
     - `RaceModeSelectionModal` correctly evaluates vehicle mode availability for the authenticated player and allows mode selection without requiring a repurchase.
- **Verification Results:**
  - **Automated Test Suite:** 204 tests total across all files: **201 passed**, 3 skipped (pre-existing), **0 failed**.
  - **Dedicated Persistence Tests (`test/permanent-equipment-persistence.test.js`):** 12/12 passing tests covering equip, navigation, refresh, session re-auth, race arena rendering, unequip, re-equip, vehicle switching, multi-player independence, partial responses, ownership boundaries, and expiry rules.
  - **Production Builds:**
    - Standalone Vite build (`index-njjXezeK.js`): Clean (code 0).
    - Embed bundle build (`characterverse-embed.js`): Clean (code 0).
    - Vercel public asset sync (`prepare-vercel-assets.js`): Clean (code 0).
  - **Real Browser Navigation Verification (Headless Edge with Admin Krish Session):**
    - `browser_1_characterverse_rocket_equipped.png`: CharacterVerse Store showing Rocket as EQUIPPED and Vehicle Mode active.
    - `browser_2_member_profile_with_vehicle.png`: Member Profile (`/profile/member_mvggb1nmx303va`) displaying member CharacterVerse summary with Rocket equipped.
    - `browser_3_dashboard_navigation.png`: Main Dashboard navigation preserving Rocket.
    - `browser_4_characterverse_return_refresh.png`: Returning to CharacterVerse and refreshing confirms Rocket remains equipped.
    - `browser_5_race_arena_vehicle_mode.png`: Live Race Arena showing Admin Krish riding the Cosmic Titan Rocket with live telemetry HUD.
    - `browser_6_race_mode_modal_selectable.png`: Race Mode Modal displaying Option B (Vehicle Mode) as active and selectable.

## 7. Next Steps (Phase 3 & Beyond)
- **Phase 3: Interactive Racing & Audio/Particle Dynamics:**
  - Dynamic particle emitter tuning for tire skid marks, exhaust smoke clouds, and rocket plasma trails.
  - Spatial 3D sound effects (engine roars, superbike revs, rocket thrust whines, wind rushing).
  - Slipstream / drafting visual effects when trailing behind another racer.
