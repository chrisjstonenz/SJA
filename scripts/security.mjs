import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
const mimeTypes = { '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

export function inlineJSON(value) {
  const escapes = { '<': '\\u003c', '>': '\\u003e', '&': '\\u0026', '\u2028': '\\u2028', '\u2029': '\\u2029' };
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => escapes[character]);
}

export function assetDataURL(path, root = publicRoot) {
  const decoded = decodeURIComponent(path);
  if (!decoded.startsWith('/assets/') || /[\\\u0000?#]/.test(decoded)) throw new Error('Invalid asset path');
  const realRoot = realpathSync(root);
  const file = realpathSync(resolve(realRoot, `.${decoded}`));
  const inside = relative(realRoot, file);
  if (isAbsolute(inside) || !inside.startsWith(`assets${sep}`)) {
    throw new Error('Asset must remain inside public/assets');
  }
  const mime = mimeTypes[extname(file).toLowerCase()];
  if (!mime) throw new Error('Unsupported asset type');
  return `data:${mime};base64,${readFileSync(file).toString('base64')}`;
}

const digest = (value) => `'sha256-${createHash('sha256').update(value).digest('base64')}'`;

export function secureStaticHTML(html) {
  if (/http-equiv\s*=\s*["']Content-Security-Policy/i.test(html)) throw new Error('Duplicate static CSP');
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map((match) => digest(match[1]));
  const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map((match) => digest(match[1]));
  const policy = [
    "default-src 'none'",
    `script-src ${[...new Set(scripts)].join(' ') || "'none'"}`,
    "script-src-attr 'none'",
    `style-src ${[...new Set(styles)].join(' ') || "'none'"}`,
    "style-src-attr 'none'",
    'img-src data:',
    "connect-src 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "worker-src 'none'",
    "base-uri 'none'",
    "form-action 'none'"
  ].join('; ');
  // frame-ancestors, X-Frame-Options and nosniff require real HTTP headers.
  // GitHub Pages cannot configure those; do not pretend a meta tag enforces them.
  const charset = /<meta\s+charset=["']utf-8["']\s*\/?\s*>/i;
  if (!charset.test(html)) throw new Error('Static export needs an early UTF-8 charset declaration');
  return html.replace(charset, (tag) => `${tag}\n<meta http-equiv="Content-Security-Policy" content="${policy}">\n<meta name="referrer" content="no-referrer">`);
}
