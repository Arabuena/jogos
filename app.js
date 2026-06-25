function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function getQuery(name) {
  return new URLSearchParams(window.location.search).get(name);
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Falha ao carregar ${url}`);
  }

  return response.json();
}

function matchCard(match) {
  return `
    <a class="card" href="/jogo?slug=${match.slug}">
      <div class="card-head">
        <span>${match.group}</span>
        <span class="${match.status === "finished" ? "status-finished" : "status-scheduled"}">
          ${match.status === "finished" ? "Encerrado" : "Agendado"}
        </span>
      </div>
      <div class="match-body">
        <div class="team">
          <small>${match.homeFlag}</small>
          ${match.homeTeam}
        </div>
        <div class="score-pill">${match.scoreLabel}</div>
        <div class="team align-right">
          <small>${match.awayFlag}</small>
          ${match.awayTeam}
        </div>
      </div>
      <div class="card-head">
        <span>${match.dateLabel}</span>
        <span>Abrir partida</span>
      </div>
    </a>
  `;
}

function postCard(post) {
  return `
    <a class="card" href="/post?slug=${post.slug}">
      <div>
        <div class="eyebrow">${post.category}</div>
        <h3 class="post-title">${post.title}</h3>
      </div>
      <p class="meta-text">${post.excerpt}</p>
      <div class="card-head">
        <span>${formatDate(post.publishedAt)}</span>
        <span>Ler materia</span>
      </div>
    </a>
  `;
}

function syncBlock(sync) {
  return `
    <section class="section">
      <div class="section-header">
        <div>
          <div class="eyebrow">Automacao</div>
          <h2>Status do scraping</h2>
        </div>
        <span class="pill">${sync.sourceLabel}</span>
      </div>
      <div class="sync-grid">
        <div class="sync-item"><strong>Fonte ativa</strong><span>${sync.sourceName}</span></div>
        <div class="sync-item"><strong>Ultima leitura</strong><span>${formatDate(sync.updatedAt)}</span></div>
        <div class="sync-item"><strong>Cache estimado</strong><span>${formatDate(sync.cachedUntil)}</span></div>
        <div class="sync-item"><strong>Agendamento</strong><span>${sync.nextCron}</span></div>
        <div class="sync-item"><strong>Resultados</strong><span>${sync.resultsUrl || "Fonte local"}</span></div>
        <div class="sync-item"><strong>Classificacao</strong><span>${sync.standingsUrl || "Fonte local"}</span></div>
      </div>
    </section>
  `;
}

async function renderHome() {
  const games = await fetchJson("/api/games");
  const posts = await fetchJson("/api/posts");
  const recent = games.items.filter((item) => item.status === "finished").slice(0, 6);
  const upcoming = games.items.filter((item) => item.status === "scheduled").slice(0, 4);
  const featured = recent[0];

  document.querySelector("#app").innerHTML = `
    <section class="hero">
      <div class="eyebrow">Blog esportivo automatizado</div>
      <h1>Radar Copa 2026</h1>
      <p>
        Projeto pronto para Vercel com scraping de resultados, cards editoriais e paginas de jogo atualizadas a partir
        da fonte configurada.
      </p>
      <div class="actions">
        <a class="button primary" href="/jogos">Ver todos os jogos</a>
        <a class="button" href="/admin">Painel tecnico</a>
      </div>
    </section>

    ${syncBlock(games.sync)}

    <section class="section">
      <div class="section-header">
        <div>
          <div class="eyebrow">Destaque</div>
          <h2>Resultado puxado da fonte</h2>
        </div>
        <span class="pill">${featured ? featured.group : "Sem jogo"}</span>
      </div>
      ${
        featured
          ? matchCard(featured)
          : '<p class="empty">Nenhuma partida encontrada para exibir neste momento.</p>'
      }
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <div class="eyebrow">Placar</div>
          <h2>Ultimos resultados</h2>
        </div>
      </div>
      <div class="grid three">${recent.map(matchCard).join("")}</div>
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <div class="eyebrow">Agenda</div>
          <h2>Proximos jogos</h2>
        </div>
      </div>
      <div class="grid two">${upcoming.map(matchCard).join("")}</div>
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <div class="eyebrow">Editorial</div>
          <h2>Materias do blog</h2>
        </div>
      </div>
      <div class="posts-grid">${posts.items.map(postCard).join("")}</div>
    </section>
  `;
}

async function renderJogos() {
  const games = await fetchJson("/api/games");
  const scheduled = games.items.filter((item) => item.status === "scheduled");
  const finished = games.items.filter((item) => item.status === "finished");

  document.querySelector("#app").innerHTML = `
    <section class="hero">
      <div class="eyebrow">Central de partidas</div>
      <h1>Todos os jogos</h1>
      <p>Listagem completa dos placares raspados e das partidas agendadas para alimentar o blog em producao.</p>
    </section>
    <section class="section">
      <div class="section-header"><div><div class="eyebrow">Ao vivo por cache</div><h2>Agendados</h2></div></div>
      <div class="grid three">${scheduled.map(matchCard).join("")}</div>
    </section>
    <section class="section">
      <div class="section-header"><div><div class="eyebrow">Historico</div><h2>Encerrados</h2></div></div>
      <div class="grid three">${finished.map(matchCard).join("")}</div>
    </section>
  `;
}

async function renderJogo() {
  const slug = getQuery("slug");
  const games = await fetchJson(`/api/games?slug=${encodeURIComponent(slug || "")}`);
  const match = games.items[0];

  if (!match) {
    document.querySelector("#app").innerHTML = '<div class="error">Jogo nao encontrado.</div>';
    return;
  }

  document.querySelector("#app").innerHTML = `
    <section class="hero">
      <div class="eyebrow">${match.group}</div>
      <h1>${match.homeTeam} vs ${match.awayTeam}</h1>
      <p>Pagina de detalhe gerada a partir da API de scraping do proprio projeto.</p>
    </section>
    <section class="section">
      <div class="match-body">
        <div class="team"><small>${match.homeFlag}</small>${match.homeTeam}</div>
        <div class="detail-score">${match.scoreLabel}</div>
        <div class="team align-right"><small>${match.awayFlag}</small>${match.awayTeam}</div>
      </div>
    </section>
    <section class="section">
      <div class="section-header"><div><div class="eyebrow">Metadados</div><h2>Leitura tecnica</h2></div></div>
      <div class="stats-list">
        <div class="stats-item"><span>Status</span><strong>${match.status === "finished" ? "Encerrado" : "Agendado"}</strong></div>
        <div class="stats-item"><span>Data na fonte</span><strong>${match.dateLabel}</strong></div>
        <div class="stats-item"><span>Ultima leitura</span><strong>${formatDate(match.updatedAt)}</strong></div>
        <div class="stats-item"><span>Rodada</span><strong>${match.round}</strong></div>
      </div>
    </section>
  `;
}

async function renderPost() {
  const slug = getQuery("slug");
  const posts = await fetchJson(`/api/posts?slug=${encodeURIComponent(slug || "")}`);
  const post = posts.items[0];

  if (!post) {
    document.querySelector("#app").innerHTML = '<div class="error">Post nao encontrado.</div>';
    return;
  }

  document.querySelector("#app").innerHTML = `
    <section class="hero">
      <div class="eyebrow">${post.category}</div>
      <h1>${post.title}</h1>
      <p>${post.excerpt}</p>
    </section>
    <section class="section">
      <div class="rich-text">${post.body.map((paragraph) => `<p>${paragraph}</p>`).join("")}</div>
      <div class="actions">
        ${post.relatedTeams.map((team) => `<span class="pill">${team}</span>`).join("")}
      </div>
    </section>
  `;
}

async function renderAdmin() {
  const sync = await fetchJson("/api/admin-syncs");

  document.querySelector("#app").innerHTML = `
    <section class="hero">
      <div class="eyebrow">Painel tecnico</div>
      <h1>Operacao do scraping</h1>
      <p>Visao enxuta do que a Vercel vai executar para atualizar o blog sem precisar de novo deploy.</p>
    </section>
    ${syncBlock(sync.sync)}
    <section class="section">
      <div class="section-header"><div><div class="eyebrow">Contadores</div><h2>Inventario atual</h2></div></div>
      <div class="sync-grid">
        <div class="sync-item"><strong>Grupos</strong><span>${sync.counts.groups}</span></div>
        <div class="sync-item"><strong>Partidas</strong><span>${sync.counts.matches}</span></div>
        <div class="sync-item"><strong>Posts</strong><span>${sync.counts.posts}</span></div>
        <div class="sync-item"><strong>Rota de cron</strong><span>/api/cron/sync-results</span></div>
      </div>
    </section>
    <section class="section">
      <div class="section-header"><div><div class="eyebrow">Fluxo</div><h2>Como publicar na Vercel</h2></div></div>
      <div class="timeline">
        <div class="timeline-item"><span>1. Configurar</span><strong>CRON_SECRET e, se quiser, overrides do Soccerway</strong></div>
        <div class="timeline-item"><span>2. Variaveis</span><strong>SOCCERWAY_RESULTS_URL e SOCCERWAY_STANDINGS_URL sao opcionais</strong></div>
        <div class="timeline-item"><span>3. Cron</span><strong>Vercel chama a rota a cada 15 minutos</strong></div>
        <div class="timeline-item"><span>4. Resultado</span><strong>Home e detalhes mostram a nova leitura do Soccerway</strong></div>
      </div>
    </section>
  `;
}

async function bootstrap() {
  const page = document.body.dataset.page;

  try {
    if (page === "home") {
      await renderHome();
      return;
    }

    if (page === "jogos") {
      await renderJogos();
      return;
    }

    if (page === "jogo") {
      await renderJogo();
      return;
    }

    if (page === "post") {
      await renderPost();
      return;
    }

    if (page === "admin") {
      await renderAdmin();
    }
  } catch (error) {
    document.querySelector("#app").innerHTML = `<div class="error">${error.message}</div>`;
  }
}

bootstrap();
