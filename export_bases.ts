import { GLOBAL_MILITARY_BASES } from './src/data/militaryBases';
import * as fs from 'fs';

const baseIds = GLOBAL_MILITARY_BASES.map(b => b.id);
fs.writeFileSync('backend/bases.json', JSON.stringify(baseIds, null, 2));
console.log(`Exported ${baseIds.length} bases to backend/bases.json`);
