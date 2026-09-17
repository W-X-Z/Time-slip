import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
/** Native import-map packaging. Sources stay independent ESM; the playable build is one offline HTML file. */
async function walk(folder) { return (await Promise.all((await readdir(folder, { withFileTypes: true })).map(entry => entry.isDirectory() ? walk(`${folder}/${entry.name}`) : `${folder}/${entry.name}`))).flat(); }
const modules = (await walk('src')).filter(file => file.endsWith('.js')).sort(), imports = {};
for (const file of modules) {
  const source = (await readFile(file, 'utf8')).replace(/(\bfrom\s*|\bimport\s*)(['"])(\.[^'"\n]+)\2/g, (_, prefix, quote, specifier) => {
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
    if (!modules.includes(target)) throw new Error(`Missing module ${specifier} in ${file}`);
    return `${prefix}${quote}@time-slip/${target}${quote}`;
  });
  imports[`@time-slip/${file}`] = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
}
let html = await readFile('index.html', 'utf8');
const css = await readFile('src/style.css', 'utf8');
html = html.replace('<link rel="stylesheet" href="./src/style.css" />', () => `<style>${css}</style>`);
html = html.replace('<script type="module" src="./src/main.js"></script>', () => `<script type="importmap">${JSON.stringify({ imports })}</script>\n<script type="module">import '@time-slip/src/main.js';</script>`);
for (const folder of ['dist', 'prototype']) { await mkdir(folder, { recursive: true }); await writeFile(`${folder}/index.html`, html); }
console.log(`Built ${modules.length} independent modules → dist/index.html + prototype/index.html (${Buffer.byteLength(html).toLocaleString()} bytes). No runtime dependencies or external assets.`);
