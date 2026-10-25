import React, { useState, useEffect } from 'react';
import { Coins, Gem, User, ChevronDown, Zap, Sparkles, ArrowLeft } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { BRANDING } from '../../config/branding';

/**
 * Validates that a return-to path is a safe local relative path.
 * Accepts paths that start with "/" but not "//" (protocol-relative) and
 * do not contain a protocol like "http:". Rejects any external URLs.
 */
function validateReturnPath(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  // Must start with "/" but not "//" (which would be protocol-relative)
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  // Must not contain a colon in the first segment (no "http:", "https:", etc.)
  const firstSegment = trimmed.split('/')[1] || '';
  if (firstSegment.includes(':')) return null;
  // Limit length to prevent abuse
  if (trimmed.length > 512) return null;
  return trimmed;
}

export default function TopNav() {
  const { activeTab, setActiveTab, openPlaceholderModal, branding, coins } = useStudio();
  const { navigationTabs, currencies, playerProfile } = branding;

  const [returnUrl, setReturnUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const safe = validateReturnPath(params.get('returnTo'));
      if (safe) return safe;
    }
    return null;
  });

  const [ownerName, setOwnerName] = useState(null);

  useEffect(() => {
    let active = true;
    const targetMemberId = (() => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const ret = validateReturnPath(params.get('returnTo'));
        if (ret) {
          const match = ret.match(/^\/profile\/([\w-]{1,100})/);
          if (match) return match[1];
        }
      }
      return null;
    })();

    if (targetMemberId) {
      fetch(`/api/profile/${encodeURIComponent(targetMemberId)}`, { credentials: 'same-origin' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (active && data?.name) {
            setOwnerName(data.name.replace(/\s*\(ADMIN\)\s*$/i, '').trim());
          }
        })
        .catch(() => {});
    } else {
      fetch('/api/session', { credentials: 'same-origin' })
        .then((res) => (res.ok ? res.json() : null))
        .then((session) => {
          if (active && session?.member?.name) {
            setOwnerName(session.member.name.replace(/\s*\(ADMIN\)\s*$/i, '').trim());
          }
        })
        .catch(() => {});
    }

    return () => { active = false; };
  }, [returnUrl]);

  const ownerInitials = (() => {
    if (!ownerName) return playerProfile.avatarBadge;
    const parts = ownerName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  useEffect(() => {
    if (returnUrl) return; // Already resolved from query param — don't overwrite
    fetch('/api/session', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((session) => {
        if (session?.member?.id) {
          setReturnUrl(`/profile/${encodeURIComponent(session.member.id)}`);
        } else {
          setReturnUrl('/');
        }
      })
      .catch(() => { setReturnUrl('/'); });
  }, [returnUrl]);

  const safeReturnUrl = returnUrl || '/';

  const handleBackToProfile = (e) => {
    e.preventDefault();
    if (window.top && window.top !== window) {
      window.top.location.href = safeReturnUrl;
    } else {
      window.location.href = safeReturnUrl;
    }
  };

  return (
    <header className="flex-shrink-0 h-16 bg-white/95 backdrop-blur-xl border-b border-[#dbcee2] flex items-center px-4 sm:px-6 gap-3 z-30 relative shadow-sm">

      {/* ── Brand Logo ── */}
      <div className="flex items-center gap-2.5 mr-3 sm:mr-5 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7544ae] via-[#9c4ea3] to-[#3b82f6] p-[1.5px] shadow-md shadow-purple-900/15">
          <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
            <Zap className="w-4 h-4 text-[#7544ae]" />
          </div>
        </div>
        <div className="hidden sm:block">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black tracking-wider bg-gradient-to-r from-[#7544ae] via-[#9c4ea3] to-[#2563eb] bg-clip-text text-transparent uppercase">
              {BRANDING.appName}
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#f4edf8] text-[#7544ae] border border-[#dbcee2] tracking-wider">
              STUDIO
            </span>
          </div>
          <span className="block text-[10px] font-semibold text-[#766c83] leading-none mt-0.5 tracking-wide">
            3D Customizer &amp; Digital Store
          </span>
        </div>
      </div>

      {/* ── Character Owner Badge ── */}
      {ownerName && (
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#fbf4fd] to-[#f4edf8] text-[#542b82] border border-[#dbcee2] shadow-xs select-none flex-shrink-0"
          title={`Character Owner: ${ownerName}`}
        >
          <User className="w-3.5 h-3.5 text-[#7544ae] flex-shrink-0" />
          <span className="text-xs font-black tracking-wide truncate max-w-[120px] sm:max-w-[180px]">
            {ownerName}
          </span>
        </div>
      )}

      {/* ── Navigation Tabs (scrollable, min-width 0 to avoid pushing the Back button off screen) ── */}
      <nav className="flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar py-1 flex-1" aria-label="Main navigation">
        {navigationTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isComingSoon = !tab.isInteractive;

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.isInteractive) {
                  setActiveTab(tab.id);
                } else {
                  openPlaceholderModal(tab);
                }
              }}
              className={[
                'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap flex-shrink-0 relative select-none',
                isActive && !isComingSoon
                  ? 'bg-gradient-to-r from-[#7544ae] to-[#542b82] text-white shadow-md shadow-purple-900/20 border border-transparent'
                  : isComingSoon
                  ? 'text-slate-400 hover:text-slate-600 hover:bg-[#f3edf7] border border-transparent'
                  : 'text-[#62566b] hover:text-[#261b35] hover:bg-[#f3edf7] border border-transparent',
              ].join(' ')}
              aria-current={isActive ? 'page' : undefined}
              title={isComingSoon ? `${tab.label} — Coming Soon (${tab.badge})` : tab.label}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border tracking-wider ${
                    isActive
                      ? 'bg-white/20 text-white border-white/30'
                      : tab.isInteractive
                      ? 'bg-[#f4edf8] text-[#7544ae] border-[#dbcee2]'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
              {isComingSoon && (
                <span className="text-[9px] text-slate-400 opacity-80">🔒</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Right-side controls: Back to Profile (always visible) + Currencies + Profile ── */}
      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
        {/* Back to Profile Button — always visible, flex-shrink-0 so it never collapses */}
        <a
          href={safeReturnUrl}
          onClick={handleBackToProfile}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#7544ae] bg-[#f4edf8] hover:bg-[#eae0f2] border border-[#dbcee2] hover:border-[#ba9fcb] transition-all shadow-xs select-none whitespace-nowrap flex-shrink-0"
          title="Return to DSA Member Profile"
        >
          <ArrowLeft className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="hidden xs:inline sm:inline">Back to Profile</span>
          <span className="xs:hidden sm:hidden">←</span>
        </a>

        {/* Coins Wallet */}
        <div
          className="flex items-center gap-1.5 bg-amber-50/90 border border-amber-300 rounded-xl px-3 py-1.5 shadow-xs"
          title="Virtual Coins Balance"
        >
          <Coins className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-black text-amber-900 tracking-wide">
            {(coins !== undefined ? coins : currencies.coins.amount).toLocaleString()}
          </span>
          <span className="hidden xl:inline text-[10px] font-bold text-amber-700/80 uppercase">Coins</span>
        </div>

        {/* Gems */}
        <div
          className="hidden md:flex items-center gap-1.5 bg-cyan-50/90 border border-cyan-300 rounded-xl px-3 py-1.5 shadow-xs"
          title="Astral Gems"
        >
          <Gem className="w-4 h-4 text-cyan-600" />
          <span className="text-xs font-black text-cyan-900 tracking-wide">
            {currencies.gems.amount}
          </span>
          <span className="hidden xl:inline text-[10px] font-bold text-cyan-700/80 uppercase">Gems</span>
        </div>

        {/* Player Profile Badge */}
        <button
          onClick={() => openPlaceholderModal({ label: 'Player Profile', description: 'View full player statistics, achievements, and account settings.' })}
          className="flex items-center gap-2 bg-[#f8f4fb] hover:bg-[#f0e8f7] border border-[#dbcee2] rounded-xl px-2.5 py-1.5 transition-all text-left shadow-xs"
          title="Player Profile"
        >
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#7544ae] to-[#542b82] flex items-center justify-center text-[10px] font-black text-white shadow-xs">
            {ownerInitials}
          </div>
          <div className="hidden lg:block leading-none">
            <span className="text-xs font-bold text-[#261b35] block truncate max-w-[90px]">
              {ownerName || playerProfile.username}
            </span>
            <span className="text-[9px] font-semibold text-[#7544ae] block mt-0.5">
              LVL {playerProfile.level}
            </span>
          </div>
          <ChevronDown className="w-3 h-3 text-[#766c83] hidden sm:block" />
        </button>
      </div>

    </header>
  );
}
