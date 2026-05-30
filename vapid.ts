import webpush from 'web-push';

let configured = false;

function stripEnvQuotes(v: string): string {
  const t = v.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1);
  }
  return t;
}

export function initVapid(): { publicKey: string; configured: boolean } {
  const publicKey = stripEnvQuotes(process.env.VAPID_PUBLIC_KEY || '');
  const privateKey = stripEnvQuotes(process.env.VAPID_PRIVATE_KEY || '');
  const subject = stripEnvQuotes(process.env.VAPID_SUBJECT || 'mailto:admin@playlivery.com.br');

  if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
    return { publicKey, configured: true };
  }

  return { publicKey: '', configured: false };
}

export function isVapidConfigured(): boolean {
  return configured;
}

export { webpush };
