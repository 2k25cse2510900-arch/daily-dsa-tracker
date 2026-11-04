const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'characterverse', 'src', 'data', 'characters.js');
let content = fs.readFileSync(filePath, 'utf8');

const crlf = content.includes('\r\n');
const newline = crlf ? '\r\n' : '\n';

const oldEntry = `    // Prepared Phase 3 Shop metadata
    shopData: {
      owned: true,
      price: 0,
      currency: "coins",
      featured: true,
    },
  },
];`;

const newEntry = `    // Superman exclusively supports his iconic default tournament suit (no Warrior or Royal modes)
    supportedOutfits: ['outfit-default'],

    // Prepared Phase 3 Shop metadata: Legendary price of 2000 coins
    shopData: {
      owned: false,
      price: 2000,
      currency: "coins",
      featured: true,
    },
  },
];`;

const normOld = oldEntry.replace(/\n/g, newline);
const normNew = newEntry.replace(/\n/g, newline);

if (content.includes(normOld)) {
  content = content.replace(normOld, normNew);
  // Also adjust accentColor in Superman entry to #f59e0b (hero gold) so attribute bars in roster view don't look like red error lines
  content = content.replace('accentColor: "#dc2626",     // Superman Red for accents & decals', 'accentColor: "#f59e0b",     // Radiant Hero Gold (harmonious UI attribute bars)');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated characters.js for Superman!');
} else {
  console.error('Target not found in characters.js');
  process.exit(1);
}
