const fs = require('fs');

// Simple regex extraction since ts-node is tricky with ESM config here
const fileContent = fs.readFileSync('src/data/militaryBases.ts', 'utf-8');
const regex = /id:\s*['"]([^'"]+)['"]/g;
const bases = [];
let match;
while ((match = regex.exec(fileContent)) !== null) {
  bases.push(match[1]);
}

fs.writeFileSync('backend/bases.json', JSON.stringify(bases, null, 2));
console.log(`Exported ${bases.length} bases to backend/bases.json`);
