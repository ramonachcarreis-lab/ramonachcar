/**
 * Prepara o arquivo .env: copia do exemplo, gera VAPID para push.
 * Google Maps e WhatsApp precisam de chaves que só você obtém nas contas oficiais.
 */
import fs from 'fs';
import path from 'path';
import webpush from 'web-push';

const root = process.cwd();
const envPath = path.join(root, '.env');
const examplePath = path.join(root, '.env.example');

function upsertEnvLine(content: string, key: string, value: string): string {
  const line = `${key}="${value}"`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) {
    return content.replace(re, line);
  }
  return content.trimEnd() + '\n' + line + '\n';
}

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    console.log('✓ Arquivo .env criado a partir de .env.example');
  } else {
    fs.writeFileSync(envPath, 'VITE_GOOGLE_MAPS_API_KEY=\n');
    console.log('✓ Arquivo .env vazio criado');
  }
}

let env = fs.readFileSync(envPath, 'utf8');

const needsVapid =
  !/VAPID_PUBLIC_KEY="[^"]+"/.test(env) || /VAPID_PUBLIC_KEY=""\s*/.test(env);
if (needsVapid) {
  const keys = webpush.generateVAPIDKeys();
  env = upsertEnvLine(env, 'VAPID_PUBLIC_KEY', keys.publicKey);
  env = upsertEnvLine(env, 'VAPID_PRIVATE_KEY', keys.privateKey);
  if (!/VAPID_SUBJECT=/.test(env)) {
    env = upsertEnvLine(env, 'VAPID_SUBJECT', 'mailto:admin@playlivery.com.br');
  }
  console.log('✓ Chaves VAPID (notificações push) geradas no .env');
}

const mapsEmpty =
  !env.includes('VITE_GOOGLE_MAPS_API_KEY=') ||
  /VITE_GOOGLE_MAPS_API_KEY=""\s*$/.test(env) ||
  /VITE_GOOGLE_MAPS_API_KEY=\s*$/m.test(env);
const waEmpty =
  !/WHATSAPP_ACCESS_TOKEN="[^"]+"/.test(env) || /WHATSAPP_ACCESS_TOKEN=""\s*/.test(env);

fs.writeFileSync(envPath, env);

console.log('\n--- Próximos passos (manual) ---\n');
if (mapsEmpty) {
  console.log('1) GOOGLE MAPS (localização / rotas / endereço)');
  console.log('   → https://console.cloud.google.com/');
  console.log('   → Ative: Maps JavaScript API, Places API, Directions API');
  console.log('   → Cole a chave em .env: VITE_GOOGLE_MAPS_API_KEY=AIzaSy...');
  console.log('   → Guia: GOOGLE_MAPS_SETUP.md\n');
} else {
  console.log('1) Google Maps: chave já presente no .env ✓\n');
}

if (waEmpty) {
  console.log('2) WHATSAPP (envio automático de alertas — opcional)');
  console.log('   → https://developers.facebook.com/ (WhatsApp Business Cloud API)');
  console.log('   → Cole no .env: WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID');
  console.log('   → Guia: CONFIGURAR-APIS.md\n');
} else {
  console.log('2) WhatsApp: tokens já presentes no .env ✓\n');
}

console.log('3) Reinicie o servidor: npm run dev\n');
