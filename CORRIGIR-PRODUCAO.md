# Corrigir estofadospro.netlify.app (urgente)

## Diagnóstico (testado em 28/05/2026)

| Teste | Resultado |
|--------|-----------|
| `https://estofadospro.netlify.app/api/health` | **404** — API não ligada ao Netlify |
| `https://estofado-pro-api.onrender.com/api/health` | **404** — Render não está no ar ou URL errada |

Por isso:

- Cadastro “some” entre aparelhos (fica só no celular)
- Fotos e assinaturas não persistem no servidor
- Link do cliente (`/assinatura/`, `/servico/`, `/cliente/`) fica offline
- APK/PWA abre o site, mas **sem motor** atrás

## O que fazer (ordem)

### 1) Render — criar/reativar API

1. https://dashboard.render.com → Web Service no repo `ramonachcar`
2. Build: `npm install && npm run build:web`
3. Start: `npm run start:prod`
4. Variáveis:
   - `APP_URL` = `https://estofadospro.netlify.app`
   - `ALLOW_NETLIFY_CORS` = `true`
   - Copiar do `.env`: `VAPID_*`, `WHATSAPP_*`, etc.
5. Deploy → copiar URL real (ex.: `https://estofado-pro-api.onrender.com`)
6. Abrir `SUA-URL/api/health` → deve mostrar `{"status":"ok"}`

### 2) Netlify — republicar com proxy

No PC:

```powershell
cd "C:\Users\USER\Downloads\MEU NOVO PROJETO 02\03"
$env:NETLIFY_API_URL="https://SUA-URL-REAL-DO-RENDER.onrender.com"
npm run build:netlify
```

Arrastar a pasta **`dist`** em https://app.netlify.com/drop  
(ou redeploy no painel Netlify se usa Git)

Teste: `https://estofadospro.netlify.app/api/health` → **ok**

### 3) APK

Só depois do passo 2:

- https://estofadospro.netlify.app/instalar
- ou PWABuilder com a URL do Netlify

---

O código já traz aviso laranja “Servidor offline” no login e no app quando a API cai.
