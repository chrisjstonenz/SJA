import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

// Keep the CLI's local state inside the checkout when a cloud home is read-only.
const config = process.env.XDG_CONFIG_HOME || resolve('.wrangler/config');
const cache = process.env.XDG_CACHE_HOME || resolve('.wrangler/cache');
mkdirSync(config, { recursive: true });
mkdirSync(cache, { recursive: true });
const cli = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));
const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, XDG_CONFIG_HOME: config, XDG_CACHE_HOME: cache, WRANGLER_SEND_METRICS: process.env.WRANGLER_SEND_METRICS || 'false' }
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal === 'SIGINT' ? 130 : 1); });
