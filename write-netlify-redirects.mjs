import fs from 'fs';
import path from 'path';

/** URL padrão do backend — usada se NETLIFY_API_URL não estiver definida no build */
const DEFAULT_RENDER_API = 'https://estofado-pro-api.onrender.com';

const apiBase = (
  process.env.NETLIFY_API_URL ||
  process.env.VITE_API_BASE_URL ||
  DEFAULT_RENDER_API
)
  .trim()
  .replace(/\/$/, '');

let lines = [];
if (apiBase) {
  lines.push(`# API → backend Node (${apiBase})`);
  lines.push(`/api/*  ${apiBase}/api/:splat  200`);
  lines.push('');
}
lines.push('# SPA');
lines.push('/*    /index.html   200');

const publicDir = path.join(process.cwd(), 'public');
fs.mkdirSync(publicDir, { recursive: true });
const redirectsBody = lines.join('\n') + '\n';
fs.writeFileSync(path.join(publicDir, '_redirects'), redirectsBody, 'utf-8');

const distDir = path.join(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  fs.writeFileSync(path.join(distDir, '_redirects'), redirectsBody, 'utf-8');
  console.log('[netlify] _redirects copiado para dist/');
}

const headers = [
  '/*',
  '  X-Frame-Options: DENY',
  '  X-Content-Type-Options: nosniff',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  '',
  '/assets/*',
  '  Cache-Control: public, max-age=31536000, immutable',
  '',
].join('\n');
fs.writeFileSync(path.join(publicDir, '_headers'), headers, 'utf-8');

console.log('[netlify] _redirects gerado' + (apiBase ? ` (API → ${apiBase})` : ' (sem proxy API — só SPA)'));
