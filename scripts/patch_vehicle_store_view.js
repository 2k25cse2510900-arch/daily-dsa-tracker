const fs = require('fs');
let s = fs.readFileSync('characterverse/src/components/views/VehicleStoreView.jsx', 'utf8');
const eol = s.includes('\r\n') ? '\r\n' : '\n';

// 1. Destructure raceMode and selectRaceMode from useStudio
const targetHook = `    isDrivingMode,
    toggleDrivingMode,
    resetVehicleLoadout,
  } = useStudio();`;

const replacementHook = `    isDrivingMode,
    toggleDrivingMode,
    resetVehicleLoadout,
    raceMode,
    selectRaceMode,
  } = useStudio();`;

s = s.replace(targetHook, replacementHook);

// 2. Add Race Mode widget right before "Quick Drive Animation Mode Toggle & Reset"
const targetWidget = `          {/* Quick Drive Animation Mode Toggle & Reset */}`;
const widgetHtml = `          {/* Race Arena Mode Selector Widget */}${eol}          <div className="bg-[#fbf9fc] border border-[#dbcee2] rounded-xl p-2.5 space-y-1.5 shadow-xs">${eol}            <div className="flex items-center justify-between text-[11px]">${eol}              <span className="font-extrabold text-[#261b35] flex items-center gap-1.5">${eol}                <span>🏁</span> Active Race Arena Mode${eol}              </span>${eol}              <span className={\`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider \${${eol}                raceMode === 'vehicle' && equippedVehicleId${eol}                  ? 'bg-purple-100 text-[#7544ae] border border-purple-200'${eol}                  : 'bg-blue-50 text-blue-700 border border-blue-200'${eol}              }\`}>${eol}                {raceMode === 'vehicle' && equippedVehicleId ? '🚀 Vehicle Mode' : '🏃 Character Mode'}${eol}              </span>${eol}            </div>${eol}            <div className="grid grid-cols-2 gap-1.5 pt-0.5">${eol}              <button${eol}                type="button"${eol}                onClick={() => selectRaceMode('character')}${eol}                className={\`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1 \${${eol}                  raceMode === 'character' || !equippedVehicleId${eol}                    ? 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white border-transparent shadow-xs'${eol}                    : 'bg-white hover:bg-[#f3edf7] text-[#4c3c5b] border-[#dbcee2]'${eol}                }\`}${eol}              >${eol}                <span>🏃 Character Mode</span>${eol}              </button>${eol}              <button${eol}                type="button"${eol}                onClick={() => selectRaceMode('vehicle')}${eol}                disabled={!equippedVehicleId}${eol}                className={\`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1 \${${eol}                  !equippedVehicleId${eol}                    ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'${eol}                    : raceMode === 'vehicle'${eol}                    ? 'bg-gradient-to-r from-[#7544ae] to-[#542b82] text-white border-transparent shadow-xs'${eol}                    : 'bg-white hover:bg-[#f3edf7] text-[#4c3c5b] border-[#dbcee2]'${eol}                }\`}${eol}                title={equippedVehicleId ? 'Race mounted on your equipped vehicle' : 'Equip a vehicle below to enable Vehicle Mode'}${eol}              >${eol}                <span>🚀 Vehicle Mode</span>${eol}              </button>${eol}            </div>${eol}            <p className="text-[10px] text-[#766c83] leading-snug">${eol}              {equippedVehicleId${eol}                ? (raceMode === 'vehicle'${eol}                    ? 'Your equipped ride will be mounted on the track.'${eol}                    : 'You will sprint or fly with authentic character abilities even with a vehicle equipped.')${eol}                : 'Equip a ride from the hangar below to unlock Vehicle Mode for live racing.'}${eol}            </p>${eol}          </div>${eol}${eol}          {/* Quick Drive Animation Mode Toggle & Reset */}`;

s = s.replace(targetWidget, widgetHtml);

fs.writeFileSync('characterverse/src/components/views/VehicleStoreView.jsx', s, 'utf8');
console.log('Successfully patched VehicleStoreView.jsx with race mode widget');
