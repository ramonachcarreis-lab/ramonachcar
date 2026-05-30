# Configurar APIs — PlayLivery Pro

O app usa **duas integrações externas** (opcionais em partes). Não é um “programa para instalar”: são **chaves** que você cria nas contas do Google e da Meta e cola no arquivo `.env` na pasta `03`.

## Comando rápido (prepara o `.env`)

Na pasta `03`:

```powershell
npm run setup:apis
npm run dev
```

Isso cria o `.env` (se faltar) e gera chaves de **notificação push**. Maps e WhatsApp você configura manualmente abaixo.

---

## 1. API de localização — Google Maps

**Para quê serve no PlayLivery:**

- Autocomplete de endereço no cadastro (CRM, contratos)
- Calcular **km da rota** e **custo de combustível** (Logística Diária, Gerar Rota)
- Mapa da rota no dia

**O que é:** API oficial do Google (Maps JavaScript + Places + Directions). Há **cota gratuita** mensal; depois o Google cobra conforme uso.

**Como obter (15–20 min):**

1. Entre em [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto (ex.: `PlayLivery`)
3. **APIs e serviços → Biblioteca** — ative:
   - Maps JavaScript API
   - Places API
   - Directions API
4. **Credenciais → Criar credencial → Chave de API**
5. Abra `03\.env` e coloque:

```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSySUA_CHAVE_AQUI
```

6. **Pare e rode de novo** `npm run dev` (o Vite só lê o `.env ao iniciar).

Detalhes: [GOOGLE_MAPS_SETUP.md](./GOOGLE_MAPS_SETUP.md)

---

## Notificações: gastar R$ 0 (recomendado)

| Canal | Custo | Como ativar |
|-------|-------|-------------|
| **Push no celular (VAPID)** | **Grátis** | `npm run setup:apis` + `localhost:3000` + Ativar push |
| Sininho no navegador | **Grátis** | Automático com o app aberto |
| **WhatsApp automático** | Pode cobrar | Só se você abrir janela de 24h (veja abaixo) |

O sistema **não envia modelos pagos** (marketing/utilidade fora da janela). Alertas WhatsApp são texto simples para **seu** número, não para clientes.

**Para WhatsApp sem cobrança:** no celular, envie qualquer mensagem para o **número comercial** cadastrado na Meta (o mesmo do Phone Number ID). Nas 24h seguintes os alertas automáticos podem sair como mensagem de serviço (grátis). Fora disso a Meta pode exigir modelo pago ou recusar.

**Produção:** priorize Push + HTTPS. Deixe WhatsApp automático desligado até validar custos no Gerenciador do WhatsApp → Insights.

---

## 2. API do WhatsApp — Meta (WhatsApp Business Cloud)

**Para quê serve no PlayLivery:**

- Enviar **alertas automáticos** para o seu número (cliente sem resposta, pagamento pendente, etc.)
- Botão “Enviar mensagem de teste” em **Configurações → Notificações**

**O que NÃO é:** não substitui o botão verde “Falar com cliente” do app (esse abre o WhatsApp normal no celular com link `wa.me`).

**O que é:** API oficial da Meta (Facebook) para empresas — **WhatsApp Business Cloud API**. Exige conta Meta Business e app no [Meta for Developers](https://developers.facebook.com/).

**Como obter (resumo):**

1. [Meta for Developers](https://developers.facebook.com/) → criar app → adicionar produto **WhatsApp**
2. No painel WhatsApp: pegar **Phone number ID** e gerar **Access token** (permanente, com permissões de mensagens)
3. No `03\.env`:

```env
WHATSAPP_ACCESS_TOKEN=EAAxxxx...
WHATSAPP_PHONE_NUMBER_ID=1100295076506042
```

O **Phone number ID** é numérico (painel Meta → WhatsApp → API Setup). Não confunda com o token nem com o número de telefone exibido ao cliente.

4. Reinicie `npm run dev`
5. Em **Minha Empresa → Notificações**, informe seu número e use “Enviar mensagem de teste”

**Custo:** Meta oferece tier de teste; produção pode ter cobrança por conversa — veja a política atual da Meta.

---

## Resumo

| API | Obrigatória? | Arquivo `.env` | Uso principal |
|-----|--------------|----------------|---------------|
| Google Maps | **Sim** para rotas/endereço | `VITE_GOOGLE_MAPS_API_KEY` | Logística, CRM, endereços |
| WhatsApp Meta | Opcional | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Alertas automáticos no seu número |
| Web Push (VAPID) | Opcional | gerado por `npm run setup:apis` | Aviso no celular com app fechado |

**Importante:** Ninguém pode “instalar” a chave do Google ou do WhatsApp por você — são contas **suas** (Google Cloud e Meta). O suporte PlayLivery só configura o arquivo `.env` depois que você cola as chaves.
