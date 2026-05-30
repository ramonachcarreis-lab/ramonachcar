# Mapas e localização — PlayLivery

## Funciona sem pagar Google

O servidor calcula rotas assim:

1. **Google Maps** (se houver chave no `.env` e cota OK)
2. **OpenStreetMap + OSRM** (grátis, automático)
3. **Estimativa** por distância urbana (nunca trava a operação)

Licenciado e comercial **sempre** recebem km e custo de combustível, mesmo sem saldo na API Google.

---

## Google Maps (opcional, mais preciso)

A chave melhora **busca de endereço** e **rota exata** quando a cota está ativa.

## Passo 1 — Criar a chave no Google Cloud

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto (ou use um existente)
3. Menu **APIs e serviços** → **Biblioteca**
4. Ative estas APIs:
   - **Maps JavaScript API**
   - **Places API**
   - **Directions API**
5. Menu **APIs e serviços** → **Credenciais** → **Criar credenciais** → **Chave de API**
6. Copie a chave gerada (algo como `AIzaSy...`)

## Passo 2 — Colar no projeto

1. Abra a pasta do app: `playlivery atualizado 22/03`
2. Abra o arquivo **`.env`** (se não existir, copie de `.env.example`)
3. Cole assim (sem aspas extras, sem espaços):

```
VITE_GOOGLE_MAPS_API_KEY=AIzaSyCole_Sua_Chave_Aqui
```

4. Salve o arquivo

## Passo 3 — Reiniciar o servidor

No terminal, na pasta `03`:

```powershell
# Pare o servidor (Ctrl+C) e rode de novo:
npm run dev
```

O Vite **só lê o `.env` ao iniciar**. Mudanças no `.env` exigem reinício.

## Passo 4 — Testar

1. **CRM** → Cadastrar cliente → campo endereço deve mostrar sugestões do Google
2. **Agenda** → Gerar rota automática / **Tempo** → encerrar dia com despesa de combustível

## Segurança (recomendado)

Na chave de API, em **Restrições de aplicativo**:
- Tipo: **Referenciadores HTTP**
- Adicione: `http://localhost:3000/*` e o domínio de produção quando publicar

Em **Restrições de API**, marque **Restringir chave** e selecione **somente**:
- Maps JavaScript API
- Places API
- Directions API

Assim, se a chave vazar, ninguém usa outras APIs caras no seu nome.

---

## Limitar e bloquear se passar do uso (3 camadas)

O Google **não tem um botão único** “nunca cobrar”. O que funciona na prática é combinar **cota diária** (bloqueio real) + **alertas de orçamento** (aviso) + **chave restrita**.

### 1) Bloqueio de verdade — cotas diárias por API

Isso **para** as chamadas quando o limite do dia acaba (o app deixa de buscar endereço/calcular rota até o dia seguinte).

Para cada API usada no PlayLivery:

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs e serviços** → **APIs ativadas**
2. Abra uma por vez: **Places API**, **Directions API**, **Maps JavaScript API**
3. Aba **Cotas** (ou **Quotas**)
4. Procure limites como *Requests per day* / *Requisições por dia*
5. Clique no lápis / **Editar cotas** e defina um teto baixo para o seu uso

Sugestão para operação pequena (ajuste conforme sua equipe):

| API | Cota diária sugerida | O que protege |
|-----|----------------------|---------------|
| Places API | 300–500 / dia | Autocomplete de endereço no CRM |
| Directions API | 50–150 / dia | Km e rota na logística |
| Maps JavaScript API | 500–1000 / dia | Mapa na tela |

Se alguém abusar ou houver bug em loop, o Google **recusa** novas requisições — não segue cobrando sem parar.

> Cotas muito baixas podem fazer o app “parar de funcionar” no fim do dia. Comece generoso e reduza depois de ver o uso em **Relatórios** → **APIs**.

### 2) Aviso antes de gastar — orçamento (budget)

Isso **não bloqueia sozinho**, mas avisa por e-mail:

1. Menu **Faturamento** → **Orçamentos e alertas** → **Criar orçamento**
2. Escopo: seu projeto PlayLivery
3. Valor: ex. **R$ 1** ou **US$ 5** (só para ser avisado cedo)
4. Alertas: 50%, 90% e 100% → seu e-mail

Assim você vê se está saindo do “só gratuito” antes de virar surpresa.

Para **desligar automaticamente** ao atingir valor, o Google exige automação extra (Pub/Sub + função que desativa a chave). Para uso normal do PlayLivery, **cota diária (item 1)** costuma ser suficiente.

### 3) Chave restrita (já no passo Segurança)

- Só as 3 APIs acima
- Só seus domínios (`localhost` + site em produção)
- **Nunca** commite a chave no GitHub; use só o `.env`

### Conferir uso

**APIs e serviços** → **Painel** (ou **Métricas**) → veja requisições por API nos últimos 7 dias.

Se um dia estourar a cota, no app aparece busca/rota indisponível — é o bloqueio funcionando, não necessariamente cobrança.

---

## Problemas comuns

| Sintoma | Solução |
|--------|---------|
| Aviso “Busca Google indisponível” | `.env` vazio ou servidor não reiniciado |
| Autocomplete não aparece | Ativar **Places API** |
| Rota não calcula | Ativar **Directions API** |
| Erro de faturamento | Vincular cartão no Google Cloud (há cota gratuita) |
