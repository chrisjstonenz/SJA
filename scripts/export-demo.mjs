import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname } from 'node:path';
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const destination = new URL('../artifacts/', import.meta.url);
mkdirSync(destination, { recursive: true });
const mimeTypes = { '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
const embeddedAssets = new Map();
function inlineAssets(html) {
  return html.replace(/\b(src|href)="(\/assets\/[^"?#]+)"/g, (_, attribute, path) => {
    if (!embeddedAssets.has(path)) {
      const mime = mimeTypes[extname(path).toLowerCase()];
      if (!mime) throw new Error(`Unsupported review asset: ${path}`);
      const bytes = readFileSync(new URL(`../public${path}`, import.meta.url));
      embeddedAssets.set(path, `data:${mime};base64,${bytes.toString('base64')}`);
    }
    return `${attribute}="${embeddedAssets.get(path)}"`;
  });
}
const contact = JSON.stringify(JSON.parse(read('public/contact.json'))).replaceAll('<', '\\u003c');
let html = read('public/index.html')
  .replace('<link rel="stylesheet" href="/styles.css">', `<style>${read('public/styles.css')}</style>`)
  .replace('<script src="/app.js" defer></script>', '')
  .replaceAll('href="/review.html', 'href="SJA-review.html')
  .replace('</body>', `<script type="application/json" id="demo-contact-config">${contact}</script><script>${read('public/app.js')}</script></body>`);
html = inlineAssets(html);
writeFileSync(new URL('SJA-demo.html', destination), html);
const review = inlineAssets(read('public/review.html')
  .replace('<link rel="stylesheet" href="/review.css">', `<style>${read('public/review.css')}</style>`)
  .replaceAll('href="/"', 'href="SJA-demo.html"'));
writeFileSync(new URL('SJA-review.html', destination), review);
const pages = new URL('../.pages/', import.meta.url);
mkdirSync(pages, { recursive: true });
writeFileSync(new URL('index.html', pages), html.replaceAll('SJA-review.html', 'review.html'));
writeFileSync(new URL('review.html', pages), review.replaceAll('SJA-demo.html', './'));
writeFileSync(new URL('.nojekyll', pages), '');
console.log('Created artifacts/SJA-demo.html and artifacts/SJA-review.html. Both open directly in a browser.');
