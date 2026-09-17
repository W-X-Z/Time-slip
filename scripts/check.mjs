import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
async function walk(folder) { return (await Promise.all((await readdir(folder, { withFileTypes: true })).map(e => e.isDirectory() ? walk(`${folder}/${e.name}`) : `${folder}/${e.name}`))).flat(); }
const files = (await Promise.all(['src', 'scripts', 'tests'].map(walk))).flat().filter(f => /\.(m?js)$/.test(f));
for (const file of files) { const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' }); if (result.status !== 0) process.exit(1); }
console.log(`Syntax OK: ${files.length} modules.`);
