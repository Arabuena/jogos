# Radar Copa 2026

Blog esportivo com páginas estáticas e funções em `api/`, pronto para deploy na Vercel via GitHub.

## Estrutura

- `index.html`, `jogos.html`, `jogo.html`, `post.html`, `admin.html`: páginas públicas
- `app.js` e `styles.css`: interface e comportamento do frontend
- `api/`: funções serverless consumidas pelo site
- `assets/anuncios/`: banners laterais
- `vercel.json`: limpeza de URLs e cron da Vercel

## Deploy na Vercel

1. Acesse a Vercel e clique em `Add New Project`
2. Importe o repositório `Arabuena/jogos`
3. Confirme a `Root Directory` como `/`
4. Em `Framework Preset`, pode deixar `Other`
5. Deixe `Build Command` vazio
6. Deixe `Output Directory` vazio
7. Clique em `Deploy`

## Variáveis de ambiente

Nenhuma variável é obrigatória para o primeiro deploy.

Opcional:

- `CRON_SECRET`: protege a rota `/api/cron/sync-results`
- `SOCCERWAY_RESULTS_URL`: sobrescreve a URL padrão de resultados
- `SOCCERWAY_STANDINGS_URL`: sobrescreve a URL padrão de classificação

## Observações

- O arquivo `preview-server.js` é só para preview local e não entra no deploy da Vercel
- As URLs amigáveis já estão configuradas em `vercel.json`
- As funções dentro de `api/` são publicadas automaticamente pela Vercel
