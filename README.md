# Radar Copa 2026

Blog esportivo com páginas estáticas e funções em `api/`, pronto para deploy na Vercel via GitHub.

## Estrutura

- `index.html`, `jogos.html`, `jogo.html`, `post.html`, `admin.html`: páginas públicas
- `app.js` e `styles.css`: interface e comportamento do frontend
- `api/`: funções serverless consumidas pelo site
- `assets/anuncios/`: banners laterais
- `vercel.json`: limpeza de URLs para o deploy

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

## Agendador externo

Como o plano Hobby da Vercel limita cron jobs nativos, o projeto fica configurado para receber chamadas externas na rota:

- `https://seu-dominio.vercel.app/api/cron/sync-results`

Se definir `CRON_SECRET`, envie este cabeçalho na chamada:

- `Authorization: Bearer SEU_SEGREDO`

### Exemplo com cron-job.org

1. Crie uma conta em `cron-job.org`
2. Clique em `Create cronjob`
3. Em `URL`, informe `https://seu-dominio.vercel.app/api/cron/sync-results`
4. Em `Schedule`, escolha a frequência desejada
5. Em `Request method`, pode deixar `GET`
6. Em `Advanced`, adicione o header `Authorization` com o valor `Bearer SEU_SEGREDO`, se estiver usando `CRON_SECRET`
7. Salve e faça um teste manual para confirmar resposta `200 OK`

## Observações

- O arquivo `preview-server.js` é só para preview local e não entra no deploy da Vercel
- As URLs amigáveis já estão configuradas em `vercel.json`
- As funções dentro de `api/` são publicadas automaticamente pela Vercel
- A rota `/api/cron/sync-results` continua disponível mesmo sem cron nativo da Vercel
