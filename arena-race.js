"use strict";

/**
 * Deterministically calculates 3D Live Race Arena progress and standings from
 * authoritative backend LeetCode stats and CharacterVerse appearance data.
 *
 * Rules:
 * 1. More verified solved questions produce strictly greater progress.
 * 2. Equal solved counts produce strictly equal progress and rank.
 * 3. Coins, vehicles, outfits, and cosmetic accessories have ZERO influence on progress.
 * 4. Progress is normalized in [0, 1] relative to a shared target milestone.
 */

const { publicSolvedStats } = require("./member-dashboard");

const MIN_TARGET_SOLVED = 100;

function calculateTargetMilestone(solvedCounts) {
  const validCounts = (Array.isArray(solvedCounts) ? solvedCounts : []).filter(c => Number.isFinite(c) && c >= 0);
  const max = validCounts.length ? Math.max(0, ...validCounts) : 0;
  if (max === 0) return MIN_TARGET_SOLVED;
  // Give comfortable track headroom beyond the current leader so racers are moving
  // along the track and approaching the finish line, rounded up to the nearest 50.
  const padded = Math.ceil(max * 1.15);
  return Math.max(MIN_TARGET_SOLVED, Math.ceil(padded / 50) * 50);
}

function calculateProgress(solvedCount, targetMilestone) {
  if (!Number.isFinite(solvedCount) || solvedCount <= 0 || !Number.isFinite(targetMilestone) || targetMilestone <= 0) {
    return 0;
  }
  const ratio = solvedCount / targetMilestone;
  return Math.max(0, Math.min(1, Math.round(ratio * 10000) / 10000));
}

function buildRacerPayload(member, leetCodeDoc, cvDoc, laneIndex) {
  const rawStats = leetCodeDoc?.status === "Success" ? leetCodeDoc.stats : null;
  const verifiedStats = publicSolvedStats(rawStats);
  const hasVerifiedStats = Boolean(verifiedStats && Number.isSafeInteger(verifiedStats.total) && verifiedStats.total >= 0);
  const fallbackTotal = Number.isSafeInteger(rawStats?.total) && rawStats.total >= 0 ? rawStats.total : null;
  const hasSolvedCount = hasVerifiedStats || fallbackTotal !== null;
  const safeSolved = hasVerifiedStats ? verifiedStats.total : (fallbackTotal !== null ? fallbackTotal : 0);
  const username = leetCodeDoc?.username || member.leetCodeUsername || null;

  const appearance = cvDoc?.appearance || {};
  const characterId = appearance.equippedCharacterId || appearance.selectedCharacterId || "buster-blitz";
  const outfitId = appearance.equippedOutfits?.[characterId] || "outfit-default";
  const customColors = appearance.customColors?.[characterId] || {};
  const equippedCosmetics = appearance.equippedCosmetics?.[characterId] || {};
  const equippedVehicleId = appearance.equippedVehicleId || null;
  const vehicleUpgradeId = appearance.vehicleUpgradeId || null;
  const equippedVehicleUpgrades = appearance.equippedVehicleUpgrades || {};

  return {
    id: member.id,
    memberId: member.id,
    name: member.name,
    username,
    laneIndex,
    solved: safeSolved,
    solvedCount: safeSolved,
    solvedAvailable: hasSolvedCount,
    stats: verifiedStats || (rawStats ? {
      total: safeSolved,
      easy: Number(rawStats.easy) || 0,
      medium: Number(rawStats.medium) || 0,
      hard: Number(rawStats.hard) || 0
    } : null),
    character: {
      equippedCharacterId: characterId,
      selectedCharacterId: characterId,
      characterId,
      outfitId,
      customColors,
      equippedCosmetics,
      equippedOutfits: appearance.equippedOutfits || {},
      equippedVehicleId,
      vehicleUpgradeId,
      equippedVehicleUpgrades
    }
  };
}

function buildRaceArenaState(members = [], leetCodeMap = new Map(), cvMap = new Map(), now = new Date()) {
  const safeMembers = Array.isArray(members) ? members : [];
  // 1. Build initial racer records with mapped characterverse appearances
  const racers = safeMembers.map((member, index) => {
    const leetCodeDoc = leetCodeMap.get(member.id) || null;
    const cvDoc = cvMap.get(member.id) || null;
    return buildRacerPayload(member, leetCodeDoc, cvDoc, index);
  });

  // 2. Compute authoritative race progress
  const targetMilestone = calculateTargetMilestone(racers.map(r => r.solvedCount));
  racers.forEach(racer => {
    racer.progress = calculateProgress(racer.solvedCount, targetMilestone);
  });

  // 3. Dense ranking: racers with equal solved counts receive the same rank.
  // Sort descending by solvedCount, with stable secondary sort on name.
  racers.sort((a, b) => b.solvedCount - a.solvedCount || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  let currentRank = 1;
  racers.forEach((racer, index) => {
    if (index > 0 && racer.solvedCount < racers[index - 1].solvedCount) {
      currentRank = index + 1;
    }
    racer.rank = currentRank;
  });

  return {
    targetMilestone,
    baseline: 0,
    timestamp: now.toISOString(),
    racers
  };
}

module.exports = {
  MIN_TARGET_SOLVED,
  calculateTargetMilestone,
  calculateProgress,
  buildRacerPayload,
  buildRaceArenaState
};
