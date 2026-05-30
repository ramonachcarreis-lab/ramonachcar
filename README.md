# Estofado Pro

## Colocar no ar (site + API + APK)

Guia passo a passo para leigos: **[DEPLOY-LEIGO.md](./DEPLOY-LEIGO.md)**  
Resumo técnico: **[DEPLOY-NETLIFY.md](./DEPLOY-NETLIFY.md)**

Sistema de gestão para rede de profissionais de **limpeza e impermeabilização de estofados** (baseado na arquitetura PlayLivery).

## Papéis

| Papel | Código | Uso |
|-------|--------|-----|
| Admin | `admin` | Rede, metas comerciais, cadastro |
| Comercial | `commercial` | CRM, propostas, contratos, agenda |
| Operador / Unidade | `licensee` | Agenda, execução (Tempo), finanças, CRM local |

## Login demo

- `admin` / `admin123`
- `joao.comercial` / `comercial123`
- `sp.centro` / `licenciado123`

## Executar

```bash
cd 03
npm install
npm run dev
```

Abra `http://localhost:3000`

## Marca

- Cores: preto, amarelo (#FFC107), branco
- Fidelidade: **Clube Panda** · moeda **Panda Coin**

## Funcionalidades mantidas

- CRM e funil (negociando → aguardando → em execução → fechados)
- Proposta e **contrato com assinatura digital**
- PIX sede / unidade
- Rotas e despesas de logística
- Faturamento por período (diário/mensal via filtro de datas)
- Clube Panda (tokens + Panda Coins)

## Catálogo padrão

Sofá 3/4 lugares, poltrona, colchão casal/queen, king, tapete (m²) — configurável em **Configurações** por unidade.

## Estoque

Produtos de estoque com abatimento interno ao concluir serviço (`utils/stockInventory.ts`).
