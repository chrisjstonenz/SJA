import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const destination = new URL('../artifacts/', import.meta.url);
mkdirSync(destination, { recursive: true });
const svgData = `data:image/svg+xml;base64,${Buffer.from(read('public/assets/coastal-home.svg')).toString('base64')}`;
const favicon = `data:image/svg+xml;base64,${Buffer.from(read('public/favicon.svg')).toString('base64')}`;
const contact = JSON.stringify(JSON.parse(read('public/contact.json'))).replaceAll('<', '\\u003c');
let html = read('public/index.html')
  .replace('<link rel="stylesheet" href="/styles.css">', `<style>${read('public/styles.css')}</style>`)
  .replace('<script src="/app.js" defer></script>', '')
  .replace('src="/assets/coastal-home.svg"', `src="${svgData}"`)
  .replace('href="/favicon.svg"', `href="${favicon}"`)
  .replaceAll('href="/review.html', 'href="SJA-review.html')
  .replace('</body>', `<script type="application/json" id="demo-contact-config">${contact}</script><script>${read('public/app.js')}</script></body>`);
writeFileSync(new URL('SJA-demo.html', destination), html);
const review = read('public/review.html')
  .replace('<link rel="stylesheet" href="/review.css">', `<style>${read('public/review.css')}</style>`)
  .replaceAll('href="/"', 'href="SJA-demo.html"');
writeFileSync(new URL('SJA-review.html', destination), review);
const pages = new URL('../.pages/', import.meta.url);
mkdirSync(pages, { recursive: true });
writeFileSync(new URL('index.html', pages), html.replaceAll('SJA-review.html', 'review.html'));
writeFileSync(new URL('review.html', pages), review.replaceAll('SJA-demo.html', './'));
writeFileSync(new URL('.nojekyll', pages), '');
console.log('Created artifacts/SJA-demo.html and artifacts/SJA-review.html. Both open directly in a browser.');
