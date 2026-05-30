# Publicar Estofado Pro e vender para licenciados

Roteiro objetivo para colocar o sistema no ar e começar a vender assinaturas.

---

## Fase 1 — Ambiente local estável (hoje)

1. Terminal na pasta `03`:
   ```powershell
   npm install
   npm run setup:apis
   npm run dev
   ```
2. Acesse sempre **http://localhost:3000** (deixe o terminal aberto).
3. Teste login, CRM, proposta, contrato e link de assinatura.
4. **Minha Empresa → Notificações:**
   - Push: ative em `localhost` (após Ctrl+F5).
   - WhatsApp automático: só depois da Fase 2.

---

## Fase 2 — APIs (sua conta Google + Meta)

| Prioridade | API | Para quê | Guia |
|------------|-----|----------|------|
| Alta | Google Maps | Endereço, rotas, combustível | `GOOGLE_MAPS_SETUP.md` |
| Média | WhatsApp Cloud (Meta) | Alertas automáticos no seu número | `CONFIGURAR-APIS.md` |
| Média | VAPID (push) | Aviso no celular com app fechado | `npm run setup:apis` |

Depois de colar chaves no `.env`, **sempre reinicie** `npm run dev`.

**APP_URL** no `.env` em produção deve ser o domínio real (ex.: `https://app.estofadopro.com.br`) — links de contrato e assinatura usam isso.

---

## Fase 3 — Hospedagem (produção)

Requisitos mínimos do servidor:

- Node.js 20+
- HTTPS obrigatório (push e PWA)
- Disco para pasta `data/` (eventos, links de assinatura, push)
- Variáveis do `.env` de produção (nunca commitar `.env`)

Fluxo sugerido:

```powershell
npm run build
set NODE_ENV=production
node --import tsx server.ts
```

(ou PM2 / Docker / Railway / VPS — o `server.ts` já serve o `dist` em produção.)

Checklist antes de abrir para licenciados:

- [ ] Domínio + HTTPS
- [ ] `APP_URL` correto
- [ ] VAPID gerado no servidor de produção
- [ ] Backup da pasta `data/`
- [ ] Teste: proposta → pagamento → contrato → assinatura remota → PIX no PDF
- [ ] Teste: licenciado no Tempo (evidências) e comercial acompanhando

---

## Fase 4 — Modelo comercial para licenciados

Sugestão de pacote (ajuste valores):

| Incluso | Detalhe |
|---------|---------|
| CRM + proposta + contrato digital | Fluxo já no sistema |
| Agenda + Tempo ao vivo | Comercial vê operação |
| Link público do cliente | Acompanhamento do serviço |
| Multi-unidade | Cada licenciado com `unitId` |
| Suporte | Onboarding: Maps + 1º contrato assinado |

**Opcional cobrar à parte:** WhatsApp API (custo Meta), SMS, domínio customizado.

---

## Fase 5 — Pontos finos já alinhados no produto

- Pagamento e sinal **antes** de enviar contrato no CRM
- Proposta/contrato em tema claro + PIX com QR e pedido de comprovante
- Comercial vê evidências/checklist **sem** câmera
- Servidor único na porta 3000 (app + API)

---

## Suporte rápido

| Problema | Ação |
|----------|------|
| `ERR_CONNECTION_REFUSED` | `npm run dev` na pasta `03` |
| Push não ativa | `localhost:3000`, permitir notificações, Ctrl+F5 |
| Push no celular via IP Wi‑Fi | Use HTTPS em produção ou WhatsApp automático |
| Link contrato falha | Servidor rodando + `npm run setup:apis` |
| WhatsApp teste falha | Tokens Meta no `.env` + número com DDD |

Documentação detalhada de APIs: **CONFIGURAR-APIS.md**
