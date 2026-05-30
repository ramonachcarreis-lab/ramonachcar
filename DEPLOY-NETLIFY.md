# Deploy Estofado Pro — Netlify + API (100% funcional)

O app tem **duas partes**:

| Parte | Onde hospedar | Por quê |
|--------|----------------|---------|
| **Interface (React)** | **Netlify** | Arquivos estáticos em `dist/` |
| **API (Node + dados)** | **Render** (grátis) | CRM, assinatura, eventos, WhatsApp, push — grava em `data/` |

Só o Netlify **não** roda a API. Sem backend, login e CRM ficam só no navegador (localStorage).

---

## Passo 1 — Backend na Render (obrigatório)

1. Crie conta em [render.com](https://render.com).
2. **New → Blueprint** ou Web Service, conecte o repositório da pasta `03`.
3. Use o arquivo `render.yaml` (já incluso) ou configure:
   - **Build:** `npm install && npm run build:web`
   - **Start:** `npm run start:prod`
   - **Environment:** `NODE_ENV=production`
4. Em **Environment**, cole variáveis do `.env`:
   - `APP_URL` = URL do Netlify (ex.: `https://seu-app.netlify.app`)
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
   - `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` (opcional)
   - `VITE_GOOGLE_MAPS_API_KEY` ou `GOOGLE_MAPS_API_KEY` (opcional)
5. Anote a URL da API, ex.: `https://estofado-pro-api.onrender.com`
6. Teste: `https://SUA-API.onrender.com/api/health` → `{"status":"ok"}`

---

## Passo 2 — Build para Netlify

No PC, na pasta `03`:

```powershell
cd "C:\Users\USER\Downloads\MEU NOVO PROJETO 02\03"
$env:NETLIFY_API_URL="https://SUA-API.onrender.com"
npm run build:netlify
```

Isso gera `dist/` com `_redirects` apontando `/api/*` para o Render.

---

## Passo 3 — Publicar no Netlify

### Opção A — Netlify Drop (arrastar pasta)

1. Abra [app.netlify.com/drop](https://app.netlify.com/drop)
2. Arraste a pasta **`03/dist`** (não a raiz do projeto).
3. Anote a URL, ex.: `https://random-name.netlify.app`

### Opção B — Git + Netlify (recomendado)

1. Conecte o repositório no Netlify.
2. **Base directory:** `03`
3. **Build command:** `npm run build:netlify`
4. **Publish directory:** `dist`
5. **Environment variables:**
   - `NETLIFY_API_URL` = `https://SUA-API.onrender.com`
   - `NODE_VERSION` = `22`

---

## Passo 4 — Ajustar URLs

1. No **Render**, atualize `APP_URL` para a URL final do Netlify.
2. No Netlify, confirme `NETLIFY_API_URL` com a URL do Render.
3. **Redeploy** nos dois se mudar URL.

---

## Link do APK (Android)

1. Com o site no ar em **HTTPS**, abra no celular ou use:
   - **`https://SEU-SITE.netlify.app/instalar`**
2. Ou gere APK em um clique:
   - **`https://www.pwabuilder.com/reportcard?url=https://SEU-SITE.netlify.app`**
   - Menu **Package for stores** → **Android** → baixar APK
3. Distribua o APK por WhatsApp/Drive (instalação manual, sem Play Store).

Alternativa: no celular, Chrome → **Instalar app** (PWA, sem arquivo APK).

---

## Checklist — tudo funcionando

| Função | Requer |
|--------|--------|
| Login / CRM / Agenda | API Render + proxy Netlify |
| Assinatura remota `/assinatura/:token` | API + `APP_URL` correto |
| PDF proposta/contrato | API (PIX dinâmico) |
| Sync eventos entre dispositivos | API `/api/field/events` |
| WhatsApp automático | Token Meta no `.env` do Render |
| Push celular | VAPID no Render + HTTPS no Netlify |
| Mapas / rotas | `GOOGLE_MAPS_API_KEY` ou OSM no servidor |
| PWA / instalar app | Netlify HTTPS |
| APK | PWABuilder ou `/instalar` |

Teste rápido após deploy:

1. `https://SEU-SITE.netlify.app/api/health` → ok  
2. Login licenciado + comercial  
3. CRM → proposta → PDF  
4. Link assinatura cliente  
5. Tempo → estou a caminho (serviço pago)  

---

## Variáveis de ambiente (resumo)

**Render (.env):** `APP_URL`, `VAPID_*`, `WHATSAPP_*`, `GOOGLE_MAPS_API_KEY`, `CORS_ORIGINS` (opcional, se não usar proxy)

**Netlify (build):** `NETLIFY_API_URL` = URL do Render

**Vite (opcional):** `VITE_APP_URL`, `VITE_GOOGLE_MAPS_API_KEY`

---

## Suporte

- Local: `npm run dev` → http://localhost:3000  
- API offline na produção: quase sempre `NETLIFY_API_URL` ausente ou Render dormindo (plano free acorda em ~1 min).
