import React from 'react';
import { Backpack, Check, Coins, Shirt, Sparkles, Car } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { WARDROBE_CATALOG } from '../../data/wardrobe';

function InventoryGroup({ icon: Icon, title, detail, children }) {
  return (
    <section className="rounded-2xl border border-[#dbcee2] bg-white p-4 shadow-xs">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-9 h-9 rounded-xl grid place-items-center bg-[#f4edf8] text-[#7544ae]"><Icon className="w-4 h-4" /></span>
        <div><h2 className="m-0 text-sm font-black text-[#261b35]">{title}</h2><p className="m-0 text-[11px] text-[#766c83]">{detail}</p></div>
      </div>
      {children}
    </section>
  );
}

export default function InventoryView() {
  const { coins, ownedCosmeticIds, ownedOutfitIds, ownedVehicles, ownedVehicleUpgrades, vehicles, setActiveTab } = useStudio();
  const cosmetics = WARDROBE_CATALOG.filter((item) => ownedCosmeticIds.includes(item.id));
  const rides = vehicles.filter((vehicle) => ownedVehicles[vehicle.id]);
  const upgrades = vehicles.filter((vehicle) => ownedVehicleUpgrades[vehicle.upgradeEffect.id]);
  return (
    <main className="flex-1 overflow-y-auto bg-[#ebe6f0] p-4 sm:p-7">
      <div className="max-w-5xl mx-auto space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dbcee2] bg-gradient-to-r from-white via-[#faf6fc] to-[#f4eef8] p-5 shadow-xs">
          <div><span className="text-[10px] font-bold uppercase tracking-[.18em] text-[#7544ae]">Secure server inventory</span><h1 className="m-0 mt-1 text-2xl font-black text-[#261b35]">My Inventory</h1></div>
          <span className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-black text-amber-900 shadow-xs"><Coins className="w-4 h-4 text-amber-600" />{coins.toLocaleString()} coins</span>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          <InventoryGroup icon={Shirt} title="Wardrobe" detail={`${cosmetics.length} starter cosmetic items owned`}>
            <div className="flex flex-wrap gap-2">{cosmetics.slice(0, 12).map((item) => <span key={item.id} className="rounded-lg border border-[#dbcee2] bg-[#f8f4fb] px-2 py-1 text-[11px] text-[#261b35] font-medium">{item.name}</span>)}</div>
            <button onClick={() => setActiveTab('wardrobe')} className="mt-4 text-xs font-bold text-[#7544ae] hover:underline">Open Wardrobe →</button>
          </InventoryGroup>
          <InventoryGroup icon={Sparkles} title="Outfits" detail={`${ownedOutfitIds.length} equipped or ready-to-equip sets`}>
            <div className="flex flex-wrap gap-2">{ownedOutfitIds.map((id) => <span key={id} className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800 font-bold"><Check className="w-3 h-3" />{id.replace('outfit-', '')}</span>)}</div>
            <button onClick={() => setActiveTab('wardrobe')} className="mt-4 text-xs font-bold text-[#7544ae] hover:underline">Edit Outfit →</button>
          </InventoryGroup>
          <InventoryGroup icon={Car} title="Garage" detail={`${rides.length} vehicles and ${upgrades.length} trail upgrades owned`}>
            <div className="flex flex-wrap gap-2">{rides.length ? rides.map((vehicle) => <span key={vehicle.id} className="rounded-lg border border-sky-300 bg-sky-50 px-2 py-1 text-[11px] text-sky-800 font-bold">{vehicle.name}</span>) : <span className="text-xs text-[#766c83]">No vehicles yet — visit the store.</span>}</div>
            <button onClick={() => setActiveTab('vehicles')} className="mt-4 text-xs font-bold text-[#7544ae] hover:underline">Open Garage / Store →</button>
          </InventoryGroup>
          <InventoryGroup icon={Backpack} title="Ownership policy" detail="Cosmetics and outfits shown here are starter content; vehicle purchases are validated on the server.">
            <p className="m-0 text-xs leading-relaxed text-[#766c83]">Coins, vehicle ownership, upgrades, and equipped loadouts come from your authenticated CharacterVerse profile. Browser storage is not used as authority.</p>
          </InventoryGroup>
        </div>
      </div>
    </main>
  );
}
