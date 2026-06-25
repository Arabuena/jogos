function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

const adImages = [
  "/assets/anuncios/1a318c95-229e-4e51-bc8f-66eb5c6b7efd.jpg",
  "/assets/anuncios/2512b721-27d7-4a2c-b2f4-8c05e6252722.jpg",
  "/assets/anuncios/601aa12c-f3d4-4b1d-a8f1-359b6d99a398.jpg",
  "/assets/anuncios/a118796c-d858-4768-8f33-a0779c9b708b.jpg",
  "/assets/anuncios/ddeaa65f-a149-4cd6-a003-e2baae048e5c.jpg",
];
const whatsappUrl = "https://wa.me/556293287625?text=Olá%2C%20vim%20pelo%20blog%20Radar%20Copa.";

const adMap = {
  home: { left: [0, 1], right: [2, 3] },
  jogos: { left: [2, 4], right: [0, 1] },
  jogo: { left: [4, 0], right: [1, 2] },
  post: { left: [1, 3], right: [2, 4] },
  admin: { left: [3, 4], right: [0, 2] },
};

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

function resolveAdImages(indices = []) {
  if (!indices.length) {
    return adImages.slice(0, 2);
  }

  return indices.map((index) => adImages[index] || adImages[0]);
}

function getPageAdImages(page) {
  const selectedBySide = adMap[page] || adMap.home;

  return [...resolveAdImages(selectedBySide.left), ...resolveAdImages(selectedBySide.right)];
}

function teamMarkup(teamName, teamFlag, alignRight = false) {
  return `
    <div class="team ${alignRight ? "align-right" : ""}">
      <div class="team-wrap">
        <span class="team-flag" aria-hidden="true">${teamFlag || "🏳️"}</span>
        <span class="team-name">${teamName}</span>
      </div>
    </div>
  `;
}

function mobileAdSlot(index) {
  return `<div class="mobile-ad-slot" data-mobile-ad-slot="${index}"></div>`;
}

function renderSideAds() {
  const page = document.body.dataset.page || "home";
  const selectedBySide = adMap[page] || adMap.home;
  const slots = document.querySelectorAll("[data-ad-slot]");

  slots.forEach((slot) => {
    const side = slot.dataset.adSlot;
    const images = resolveAdImages(selectedBySide[side]);

    slot.innerHTML = images
      .map(
        (image) => `
          <div class="ad-card">
            <span class="ad-label">Publicidade</span>
            <a
              class="ad-link"
              href="${whatsappUrl}"
              target="_blank"
              rel="noreferrer"
              aria-label="Falar no WhatsApp da Associação Amigo do Povo"
            >
              <img class="ad-media" src="${image}" alt="Anúncio lateral da Associação Amigo do Povo" loading="lazy" />
            </a>
          </div>
        `
      )
      .join("");
  });
}

function renderInlineAds() {
  const page = document.body.dataset.page || "home";
  const mobileSlots = document.querySelectorAll("[data-mobile-ad-slot]");

  if (!mobileSlots.length) {
    return;
  }

  const images = getPageAdImages(page);

  mobileSlots.forEach((slot) => {
    const slotIndex = Number.parseInt(slot.dataset.mobileAdSlot || "0", 10);
    const image = images[slotIndex % images.length] || adImages[0];

    slot.innerHTML = `
      <div class="ad-card mobile-ad-card">
        <span class="ad-label">Publicidade</span>
        <a
          class="ad-link"
          href="${whatsappUrl}"
          target="_blank"
          rel="noreferrer"
          aria-label="Falar no WhatsApp da Associação Amigo do Povo"
        >
          <img class="ad-media" src="${image}" alt="Anúncio da Associação Amigo do Povo" loading="lazy" />
        </a>
      </div>
    `;
  });
}

function matchCard(match) {
  return `
    <a class="card match-card" href="/jogo?slug=${match.slug}">
      <div class="card-head">
        <span>${match.group}</span>
        <span class="${match.status === "finished" ? "status-finished" : "status-scheduled"}">
          ${match.status === "finished" ? "Encerrado" : "Agendado"}
        </span>
      </div>
      <div class="match-body">
        ${teamMarkup(match.homeTeam, match.homeFlag)}
        <div class="score-pill">${match.scoreLabel}</div>
        ${teamMarkup(match.awayTeam, match.awayFlag, true)}
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
        <span>Ler matéria</span>
      </div>
    </a>
  `;
}

function overviewBlock(stats) {
  return `
    <section class="section">
      <div class="section-header">
        <div>
          <div class="eyebrow">Panorama</div>
          <h2>Visão geral</h2>
        </div>
        <span class="pill">Cobertura do torneio</span>
      </div>
      <div class="sync-grid">
        <div class="sync-item"><strong>Partidas</strong><span>${stats.matches}</span></div>
        <div class="sync-item"><strong>Rodadas</strong><span>${stats.groups}</span></div>
        <div class="sync-item"><strong>Matérias</strong><span>${stats.posts}</span></div>
        <div class="sync-item"><strong>Recorte</strong><span>Copa 2026</span></div>
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
  const stats = {
    matches: games.total,
    groups: games.groups.length,
    posts: posts.total,
  };

  document.querySelector("#app").innerHTML = `
    <section class="hero">
      <div class="eyebrow">Cobertura editorial</div>
      <h1>Radar Copa 2026</h1>
      <p>
        Um blog esportivo com destaque para resultados, agenda, análises e páginas de partida pensadas para leitura
        rápida no celular e navegação simples no desktop.
      </p>
      <div class="actions">
        <a class="button primary" href="/jogos">Ver todos os jogos</a>
        <a class="button" href="/admin">Ver cobertura</a>
      </div>
    </section>

    ${overviewBlock(stats)}

    ${mobileAdSlot(0)}

    <section class="section">
      <div class="section-header">
        <div>
          <div class="eyebrow">Destaque</div>
          <h2>Jogo em evidência</h2>
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
          <h2>Últimos resultados</h2>
        </div>
      </div>
      <div class="grid three">${recent.map(matchCard).join("")}</div>
    </section>

    ${mobileAdSlot(1)}

    <section class="section">
      <div class="section-header">
        <div>
          <div class="eyebrow">Agenda</div>
          <h2>Próximos jogos</h2>
        </div>
      </div>
      <div class="grid two">${upcoming.map(matchCard).join("")}</div>
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <div class="eyebrow">Editorial</div>
          <h2>Matérias do blog</h2>
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
      <p>Listagem completa dos placares e da agenda da competição, com navegação direta para cada partida.</p>
    </section>
    ${mobileAdSlot(0)}
    <section class="section">
      <div class="section-header"><div><div class="eyebrow">Agenda</div><h2>Agendados</h2></div></div>
      <div class="grid three">${scheduled.map(matchCard).join("")}</div>
    </section>
    ${mobileAdSlot(1)}
    <section class="section">
      <div class="section-header"><div><div class="eyebrow">Histórico</div><h2>Encerrados</h2></div></div>
      <div class="grid three">${finished.map(matchCard).join("")}</div>
    </section>
  `;
}

async function renderJogo() {
  const slug = getQuery("slug");
  const games = await fetchJson(`/api/games?slug=${encodeURIComponent(slug || "")}`);
  const match = games.items[0];

  if (!match) {
    document.querySelector("#app").innerHTML = '<div class="error">Jogo não encontrado.</div>';
    return;
  }

  document.querySelector("#app").innerHTML = `
    <section class="hero">
      <div class="eyebrow">${match.group}</div>
      <h1>${match.homeTeam} vs ${match.awayTeam}</h1>
      <p>Ficha da partida com placar, status e informações principais da rodada.</p>
    </section>
    ${mobileAdSlot(0)}
    <section class="section">
      <div class="match-body">
        ${teamMarkup(match.homeTeam, match.homeFlag)}
        <div class="detail-score">${match.scoreLabel}</div>
        ${teamMarkup(match.awayTeam, match.awayFlag, true)}
      </div>
    </section>
    <section class="section">
      <div class="section-header"><div><div class="eyebrow">Resumo</div><h2>Ficha da partida</h2></div></div>
      <div class="stats-list">
        <div class="stats-item"><span>Status</span><strong>${match.status === "finished" ? "Encerrado" : "Agendado"}</strong></div>
        <div class="stats-item"><span>Data</span><strong>${match.dateLabel}</strong></div>
        <div class="stats-item"><span>Atualizado em</span><strong>${formatDate(match.updatedAt)}</strong></div>
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
    document.querySelector("#app").innerHTML = '<div class="error">Post não encontrado.</div>';
    return;
  }

  document.querySelector("#app").innerHTML = `
    <section class="hero">
      <div class="eyebrow">${post.category}</div>
      <h1>${post.title}</h1>
      <p>${post.excerpt}</p>
    </section>
    ${mobileAdSlot(0)}
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
      <div class="eyebrow">Cobertura</div>
      <h1>Bastidores do blog</h1>
      <p>Uma visão rápida do recorte editorial, da quantidade de partidas e do material disponível no site.</p>
    </section>
    ${overviewBlock(sync.counts)}
    ${mobileAdSlot(0)}
    <section class="section">
      <div class="section-header"><div><div class="eyebrow">Contadores</div><h2>Inventário atual</h2></div></div>
      <div class="sync-grid">
        <div class="sync-item"><strong>Grupos</strong><span>${sync.counts.groups}</span></div>
        <div class="sync-item"><strong>Partidas</strong><span>${sync.counts.matches}</span></div>
        <div class="sync-item"><strong>Posts</strong><span>${sync.counts.posts}</span></div>
        <div class="sync-item"><strong>Categoria</strong><span>Cobertura esportiva</span></div>
      </div>
    </section>
    <section class="section">
      <div class="section-header"><div><div class="eyebrow">Navegação</div><h2>Como explorar o site</h2></div></div>
      <div class="timeline">
        <div class="timeline-item"><span>1. Home</span><strong>Abre destaques, agenda e matérias principais</strong></div>
        <div class="timeline-item"><span>2. Jogos</span><strong>Reúne partidas agendadas e encerradas em um só lugar</strong></div>
        <div class="timeline-item"><span>3. Partida</span><strong>Mostra placar, status e rodada de cada confronto</strong></div>
        <div class="timeline-item"><span>4. Editorial</span><strong>Conecta análise, contexto e navegação entre jogos</strong></div>
      </div>
    </section>
  `;
}

async function bootstrap() {
  const page = document.body.dataset.page;
  renderSideAds();

  try {
    if (page === "home") {
      await renderHome();
      renderInlineAds();
      return;
    }

    if (page === "jogos") {
      await renderJogos();
      renderInlineAds();
      return;
    }

    if (page === "jogo") {
      await renderJogo();
      renderInlineAds();
      return;
    }

    if (page === "post") {
      await renderPost();
      renderInlineAds();
      return;
    }

    if (page === "admin") {
      await renderAdmin();
      renderInlineAds();
    }
  } catch (error) {
    document.querySelector("#app").innerHTML = `<div class="error">${error.message}</div>`;
  }
}

bootstrap();
