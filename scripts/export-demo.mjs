import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { assetDataURL, inlineJSON, secureStaticHTML } from './security.mjs';
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const destination = new URL('../artifacts/', import.meta.url);
mkdirSync(destination, { recursive: true });
const embeddedAssets = new Map();
function inlineAssets(html) {
  return html.replace(/\b(src|href)="(\/assets\/[^"?#]+)"/g, (_, attribute, path) => {
    if (!embeddedAssets.has(path)) {
      embeddedAssets.set(path, assetDataURL(path));
    }
    return `${attribute}="${embeddedAssets.get(path)}"`;
  });
}
const contact = inlineJSON(JSON.parse(read('public/contact.json')));
let html = read('public/index.html')
  .replace('<link rel="stylesheet" href="/styles.css">', () => `<style>${read('public/styles.css')}</style>`)
  .replace('<script src="/app.js" defer></script>', '')
  .replaceAll('href="/review.html', 'href="SJA-review.html')
  .replace('</body>', () => `<script type="application/json" id="demo-contact-config">${contact}</script><script>${read('public/app.js')}</script></body>`);
html = inlineAssets(html);
writeFileSync(new URL('SJA-demo.html', destination), secureStaticHTML(html));
const review = inlineAssets(read('public/review.html')
  .replace('<link rel="stylesheet" href="/review.css">', () => `<style>${read('public/review.css')}</style>`)
  .replaceAll('href="/"', 'href="SJA-demo.html"'));
writeFileSync(new URL('SJA-review.html', destination), secureStaticHTML(review));
const pages = new URL('../.pages/', import.meta.url);
mkdirSync(pages, { recursive: true });
writeFileSync(new URL('index.html', pages), secureStaticHTML(html.replaceAll('SJA-review.html', 'review.html')));
writeFileSync(new URL('review.html', pages), secureStaticHTML(review.replaceAll('SJA-demo.html', './')));
writeFileSync(new URL('.nojekyll', pages), '');
console.log('Created artifacts/SJA-demo.html and artifacts/SJA-review.html. Both open directly in a browser.');
