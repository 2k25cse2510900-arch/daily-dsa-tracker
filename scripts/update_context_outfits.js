const fs = require('fs');
const path = require('path');

// 1. Update StudioContext.jsx
const contextPath = path.join(__dirname, '..', 'characterverse', 'src', 'context', 'StudioContext.jsx');
let contextContent = fs.readFileSync(contextPath, 'utf8');

const crlf = contextContent.includes('\r\n');
const newline = crlf ? '\r\n' : '\n';

// Add availableOutfits useMemo
const targetContext1 = `  const selectCharacter = (id) => {`;
const replContext1 = `  const availableOutfits = useMemo(() => {
    if (selectedCharacter?.supportedOutfits) {
      return OUTFITS.filter((o) => selectedCharacter.supportedOutfits.includes(o.id));
    }
    return OUTFITS;
  }, [selectedCharacter]);

  const selectCharacter = (id) => {`;

// Add guard to previewOutfit
const targetContext2 = `  const previewOutfit = (outfit) => {
    if (!outfit) return;`;
const replContext2 = `  const previewOutfit = (outfit) => {
    if (!outfit) return;
    if (selectedCharacter?.supportedOutfits && !selectedCharacter.supportedOutfits.includes(outfit.id)) {
      showToast(\`\${selectedCharacter.name} does not support this outfit.\`, 'error');
      return;
    }`;

// Add guard to equipOutfit
const targetContext3 = `  const equipOutfit = (outfit) => {
    if (!outfit) return;`;
const replContext3 = `  const equipOutfit = (outfit) => {
    if (!outfit) return;
    if (selectedCharacter?.supportedOutfits && !selectedCharacter.supportedOutfits.includes(outfit.id)) {
      showToast(\`\${selectedCharacter.name} does not support this outfit.\`, 'error');
      return;
    }`;

// Add guard to unlockOutfit
const targetContext4 = `    const outfit = OUTFITS.find((o) => o.id === outfitId);
    if (!outfit) {`;
const replContext4 = `    const outfit = OUTFITS.find((o) => o.id === outfitId);
    if (!outfit) {
      showToast('Unknown outfit.', 'error');
      return;
    }
    if (selectedCharacter?.supportedOutfits && !selectedCharacter.supportedOutfits.includes(outfitId)) {
      showToast(\`\${selectedCharacter.name} does not support this outfit.\`, 'error');
      return;
    }`;

// Replace outfits: OUTFITS with outfits: availableOutfits
const targetContext5 = `        // Outfits
        outfits: OUTFITS,`;
const replContext5 = `        // Outfits
        outfits: availableOutfits,`;

contextContent = contextContent
  .replace(targetContext1.replace(/\n/g, newline), replContext1.replace(/\n/g, newline))
  .replace(targetContext2.replace(/\n/g, newline), replContext2.replace(/\n/g, newline))
  .replace(targetContext3.replace(/\n/g, newline), replContext3.replace(/\n/g, newline))
  .replace(targetContext4.replace(/\n/g, newline), replContext4.replace(/\n/g, newline))
  .replace(targetContext5.replace(/\n/g, newline), replContext5.replace(/\n/g, newline));

fs.writeFileSync(contextPath, contextContent, 'utf8');
console.log('Updated StudioContext.jsx successfully!');

// 2. Update CharacterDetails.jsx
const detailsPath = path.join(__dirname, '..', 'characterverse', 'src', 'components', 'panels', 'CharacterDetails.jsx');
let detailsContent = fs.readFileSync(detailsPath, 'utf8');

const targetDetails1 = `              <h3 className="text-[11px] font-bold text-[#261b35] uppercase tracking-wider">
                Hero Outfit (3 Options)
              </h3>`;
const replDetails1 = `              <h3 className="text-[11px] font-bold text-[#261b35] uppercase tracking-wider">
                Hero Outfit ({outfits?.length || 1} Option{outfits?.length === 1 ? '' : 's'})
              </h3>`;

const targetDetails2 = `          {/* 3 Outfit Cards */}
          <div className="grid grid-cols-3 gap-2">`;
const replDetails2 = `          {/* Outfit Cards */}
          <div className={\`grid \${outfits?.length === 1 ? 'grid-cols-1 max-w-[150px] mx-auto' : 'grid-cols-3'} gap-2\`}>`;

detailsContent = detailsContent
  .replace(targetDetails1.replace(/\n/g, newline), replDetails1.replace(/\n/g, newline))
  .replace(targetDetails2.replace(/\n/g, newline), replDetails2.replace(/\n/g, newline));

fs.writeFileSync(detailsPath, detailsContent, 'utf8');
console.log('Updated CharacterDetails.jsx successfully!');
