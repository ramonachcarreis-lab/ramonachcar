# Estofado Pro — colocar no ar (guia para leigo)

Este guia é a versão **mais detalhada** de `DEPLOY-NETLIFY.md`. Siga na ordem **1 → 9**. Não pule o passo do GitHub: sem o código no GitHub, o Render mostra *“No repositories found”*.

---

## O que você vai ter no final

| Item | Onde fica | Para que serve |
|------|-----------|----------------|
| **Site** (telas, login, CRM) | Netlify | `https://alguma-coisa.netlify.app` |
| **Motor** (API, dados, WhatsApp, PDF) | Render | `https://alguma-coisa.onrender.com` |
| **APK Android** | Você baixa do PWABuilder | Instala no celular dos licenciados |

O site **sozinho** não guarda tudo no servidor. O **Render** é obrigatório para funções ligadas entre celular, comercial e cliente.

---

## Antes de começar (5 minutos)

1. Conta **GitHub**: https://github.com/signup  
2. Conta **Render**: https://dashboard.render.com/register  
3. Conta **Netlify**: https://app.netlify.com/signup  
4. No PC, confirme que existe a pasta:
   `C:\Users\USER\Downloads\MEU NOVO PROJETO 02\03`
5. Abra o arquivo **`.env`** dessa pasta no Bloco de Notas. Você vai **copiar** valores dele para o Render (não envie o `.env` para o GitHub — ele já está no `.gitignore`).

---

## PASSO 1 — Subir o código no GitHub (obrigatório)

### 1.1 Criar o repositório no site

1. Entre em https://github.com/new  
2. **Repository name:** `ramonachcar` (ou o nome que você já criou)  
3. Deixe **Public**  
4. **NÃO** marque “Add a README file” se você for enviar o projeto inteiro depois.  
5. Clique **Create repository**.

### 1.2 Enviar a pasta `03` pelo PowerShell

Abra **PowerShell** (Windows) e cole **um bloco por vez** (troque `SEU_USUARIO` se o GitHub for outro):

```powershell
cd "C:\Users\USER\Downloads\MEU NOVO PROJETO 02\03"
git init
git add .
git commit -m "Estofado Pro - versao para deploy"
git branch -M main
git remote add origin https://github.com/ramonachcarreis-lab/ramonachcar.git
git push -u origin main
```

**Se pedir login:** use seu usuário GitHub e um **Personal Access Token** (não é a senha normal).  
Criar token: GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Generate new token** → marque `repo` → copie o token e use como “senha” no `git push`.

**Se der erro “remote origin already exists”:**

```powershell
git remote set-url origin https://github.com/ramonachcarreis-lab/ramonachcar.git
git push -u origin main
```

**Se o repositório no GitHub tiver só um README** (você criou com README antes):

```powershell
git pull origin main --allow-unrelated-histories
git push -u origin main
```

### 1.3 Conferir

No navegador, abra `https://github.com/ramonachcarreis-lab/ramonachcar`  
Você deve ver pastas como `src`, `server`, `package.json`, `render.yaml` — **não** só um arquivo README.

---

## PASSO 2 — Conectar o GitHub no Render

1. Abra https://dashboard.render.com  
2. **Account Settings** (canto) → **Git Provider** → conecte **GitHub** e autorize o Render.  
3. Volte ao dashboard → **New +** → **Web Service**  
4. Escolha o repositório **ramonachcar**  
5. Configuração importante:

| Campo | Valor |
|--------|--------|
| **Name** | `estofado-pro-api` (ou outro; anote a URL depois) |
| **Region** | Oregon ou Frankfurt |
| **Branch** | `main` |
| **Root Directory** | *(vazio)* — use vazio **somente se** na raiz do repo já está o conteúdo da pasta `03`. Se no GitHub a pasta se chama `03`, coloque `03` aqui. |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build:web` |
| **Start Command** | `npm run start:prod` |
| **Instance type** | Free |

6. **Não** clique em Deploy ainda — primeiro as variáveis (passo 3).

**“No repositories found”** = GitHub não conectado (passo 2.2) ou repositório vazio (volte ao passo 1).

---

## PASSO 3 — Variáveis no Render (copiar do seu `.env`)

No Render, na tela do serviço → **Environment** → **Add Environment Variable**.

Cole **uma por uma** (valores do seu `.env` local):

| Nome no Render | O que colocar |
|----------------|---------------|
| `NODE_ENV` | `production` |
| `APP_URL` | Por enquanto: `https://placeholder.netlify.app` — você troca no passo 6 |
| `VAPID_PUBLIC_KEY` | Igual ao `.env` |
| `VAPID_PRIVATE_KEY` | Igual ao `.env` |
| `VAPID_SUBJECT` | Igual ao `.env` (ex.: `mailto:seu@email.com`) |
| `WHATSAPP_ACCESS_TOKEN` | Igual ao `.env` (se usar WhatsApp) |
| `WHATSAPP_PHONE_NUMBER_ID` | Igual ao `.env` |
| `GOOGLE_MAPS_API_KEY` | Igual ao `.env` (opcional) |

Clique **Create Web Service** / **Deploy**.

Aguarde 5–15 minutos (primeira vez demora). Quando ficar **Live**, copie a URL, exemplo:

`https://estofado-pro-api.onrender.com`

### Teste da API

No navegador abra:

`https://SUA-URL-DO-RENDER.onrender.com/api/health`

Deve aparecer algo como: `{"status":"ok"}`  

Se der erro 502, espere 1 minuto e atualize (plano grátis “acorda” devagar).

---

## PASSO 4 — Gerar o site (pasta `dist`) no seu PC

Substitua pela URL **real** do Render do passo 3:

```powershell
cd "C:\Users\USER\Downloads\MEU NOVO PROJETO 02\03"
$env:NETLIFY_API_URL="https://SUA-URL-DO-RENDER.onrender.com"
npm install
npm run build:netlify
```

Se terminar sem erro, existe a pasta:

`C:\Users\USER\Downloads\MEU NOVO PROJETO 02\03\dist`

Essa pasta é o **site** que vai para o Netlify.

---

## PASSO 5 — Publicar no Netlify (jeito mais fácil: arrastar)

1. Abra https://app.netlify.com/drop  
2. Arraste **só** a pasta **`dist`** (não arraste a pasta `03` inteira).  
3. Netlify mostra uma URL, exemplo: `https://estofado-pro-abc123.netlify.app`  
4. **Copie e guarde** essa URL.

### Teste pelo site (API ligada ao Netlify)

Abra no navegador:

`https://SUA-URL-NETLIFY.netlify.app/api/health`

Deve dar `ok` igual ao Render.  
Se der erro, o passo 4 usou `NETLIFY_API_URL` errado — refaça o build e arraste de novo.

---

## PASSO 6 — Ligar site ↔ motor (importante)

### 6.1 No Render

1. Serviço **estofado-pro-api** → **Environment**  
2. Edite `APP_URL` para a URL **exata** do Netlify, exemplo:  
   `https://estofado-pro-abc123.netlify.app`  
   (sem barra no final)  
3. **Save** → **Manual Deploy** → **Deploy latest commit**

### 6.2 Se mudar a URL do Netlify depois

Refaça no PC o passo 4 com o mesmo `NETLIFY_API_URL` e arraste `dist` de novo no Drop (ou use Netlify conectado ao Git — ver `DEPLOY-NETLIFY.md` opção B).

---

## PASSO 7 — Gerar e distribuir o APK (Android)

Só funciona com o site em **HTTPS** (Netlify já é HTTPS).

### Opção A — Página do próprio app

No celular ou PC, abra:

`https://SUA-URL-NETLIFY.netlify.app/instalar`

Siga as instruções na tela (PWA ou link para PWABuilder).

### Opção B — APK para instalar manualmente (WhatsApp / Drive)

1. Abra no PC (troque pela sua URL Netlify):

   `https://www.pwabuilder.com/reportcard?url=https://SUA-URL-NETLIFY.netlify.app`

2. Espere analisar o site.  
3. Menu **Package for stores** → **Android** → baixar **APK**.  
4. Envie o arquivo `.apk` para os licenciados. No celular: permitir “instalar apps desconhecidos” para o arquivo baixado.

### Opção C — Sem APK (mais simples)

Chrome no Android → abrir o site → menu → **Instalar app** / **Adicionar à tela inicial**.

---

## PASSO 8 — WhatsApp e notificações (se ainda falhar)

| Sintoma | O que fazer |
|---------|-------------|
| **Authentication Error** no teste WhatsApp | Token Meta expirado. Gere novo em Meta for Developers e atualize `WHATSAPP_ACCESS_TOKEN` no **Render**, depois redeploy. |
| Push não chega | Confirme `VAPID_*` no Render e que o site é **https://** |
| Mapa estranho | Opcional: `GOOGLE_MAPS_API_KEY` no Render |

Token Meta: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started

---

## PASSO 9 — Checklist “tudo ligado” (marque um por um)

Abra o site Netlify **logado** como comercial ou licenciado:

- [ ] `https://SEU-SITE.netlify.app/api/health` → ok  
- [ ] Login comercial e licenciado  
- [ ] CRM → abrir negócio → gerar PDF proposta  
- [ ] Copiar link de **assinatura** do cliente e abrir em aba anônima  
- [ ] Marcar pagamento / baixa no contrato (se aplicável)  
- [ ] **Tempo** → serviço pago → **Estou a caminho** (só no dia certo)  
- [ ] Configurações → teste WhatsApp (se configurou Meta)  
- [ ] No celular: `/instalar` ou APK do PWABuilder abre o mesmo site  

**Dados novos no Render:** a pasta `data/` do seu PC **não** vai para o Git. Em produção o servidor começa com dados vazios até você usar o app. Se precisar dos dados antigos do PC, fale com suporte técnico para export/import (não está neste guia básico).

---

## Problemas comuns

| Problema | Causa | Solução |
|----------|--------|---------|
| `localhost:3000` não abre | Servidor local parado | Só para teste no PC: `npm run dev` na pasta `03` |
| Site abre mas CRM “não salva” entre aparelhos | Sem API | Passos 2–6; teste `/api/health` pelo Netlify |
| Render “No repositories” | Git vazio ou não conectado | Passo 1 + 2.2 |
| Netlify 404 em rotas | Publicou pasta errada | Só a pasta **`dist`** |
| API lenta no primeiro acesso | Plano free Render | Espere ~1 min e tente de novo |
| Baixa pagamento não aparece | Fluxo do negócio | Precisa proposta aprovada + assinatura conforme o CRM |

---

## Resumo em uma frase

**GitHub** (código) → **Render** (API + `.env`) → **build netlify** no PC → **Netlify Drop** (`dist`) → atualizar **`APP_URL`** no Render → **APK** via `/instalar` ou PWABuilder.

---

## Ajuda local (só no seu computador)

```powershell
cd "C:\Users\USER\Downloads\MEU NOVO PROJETO 02\03"
npm run dev
```

Abra http://localhost:3000 — isso **não** substitui o site na internet; é só para testar antes de publicar.
