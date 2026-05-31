export type WhatsAppStatus = {
  configured: boolean;
  /** Token validado na Meta (só após checagem no servidor) */
  authenticated?: boolean;
  phoneNumberId?: string;
  hint: string;
  authError?: string;
};

function formatWhatsAppApiError(metaMsg: string): string {
  const lower = metaMsg.toLowerCase();
  if (
    lower.includes('authentication') ||
    lower.includes('invalid oauth') ||
    lower.includes('session has expired') ||
    lower.includes('error validating access token')
  ) {
    return 'WhatsApp da empresa temporariamente indisponível. Fale com o suporte Estofado Pro.';
  }
  if (metaMsg.includes('131030') || lower.includes('not in allowed list')) {
    return 'Seu número ainda não está autorizado para receber mensagens automáticas. Fale com o suporte.';
  }
  if (metaMsg.includes('131047') || lower.includes('re-engagement')) {
    return (
      `${metaMsg} — Envie uma mensagem do seu celular para o número comercial da Meta (abre janela 24h) ` +
      'ou use Push no app.'
    );
  }
  return metaMsg;
}

export function getWhatsAppStatus(): WhatsAppStatus {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (token && phoneId) {
    return {
      configured: true,
      phoneNumberId: phoneId,
      hint: 'WhatsApp da empresa em configuração.',
    };
  }
  return {
    configured: false,
    hint: 'WhatsApp automático em configuração.',
  };
}

/** Valida token + Phone Number ID na Graph API. */
export async function verifyWhatsAppCredentials(): Promise<{
  ok: boolean;
  error?: string;
  displayPhone?: string;
}> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneId) {
    return { ok: false, error: 'WhatsApp automático indisponível no momento.' };
  }

  const url = `https://graph.facebook.com/v21.0/${phoneId}?fields=display_phone_number,verified_name`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = (await res.json()) as {
      display_phone_number?: string;
      error?: { message?: string };
    };
    if (!res.ok) {
      const metaMsg = json.error?.message || `HTTP ${res.status}`;
      return { ok: false, error: formatWhatsAppApiError(metaMsg) };
    }
    return { ok: true, displayPhone: json.display_phone_number };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro de rede ao validar WhatsApp' };
  }
}

export async function getWhatsAppStatusVerified(): Promise<WhatsAppStatus> {
  const base = getWhatsAppStatus();
  if (!base.configured) return base;

  const verify = await verifyWhatsAppCredentials();
  if (verify.ok) {
    return {
      ...base,
      authenticated: true,
      hint: verify.displayPhone
        ? `API conectada (${verify.displayPhone}). Mensagens automáticas podem ser enviadas.`
        : 'API WhatsApp conectada. Mensagens automáticas podem ser enviadas.',
    };
  }

  return {
    ...base,
    authenticated: false,
    authError: verify.error,
    hint: verify.error || 'WhatsApp da empresa temporariamente indisponível.',
  };
}

export async function sendWhatsAppText(
  toPhoneE164: string,
  body: string
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneId) {
    return { ok: false, error: 'WhatsApp API não configurada no servidor.' };
  }

  let to = toPhoneE164.replace(/\D/g, '');
  if (to.length === 10 || to.length === 11) to = `55${to}`;

  const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: body.slice(0, 4096) },
      }),
    });
    const json = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) {
      const metaMsg = json.error?.message || `HTTP ${res.status}`;
      return { ok: false, error: formatWhatsAppApiError(metaMsg) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro de rede' };
  }
}
