const fs = require("node:fs/promises");
const path = require("node:path");

const { posts } = require("./content");

const LOCAL_FALLBACK_PATH = path.join(__dirname, "source.html");
const SOCCERWAY_RESULTS_URL =
  process.env.SOCCERWAY_RESULTS_URL ||
  "https://br.soccerway.com/mundo/campeonato-do-mundo/resultados/";
const SOCCERWAY_STANDINGS_URL =
  process.env.SOCCERWAY_STANDINGS_URL ||
  "https://br.soccerway.com/mundo/campeonato-do-mundo/classificacao/";
const TOKEN_SEPARATOR = String.fromCharCode(172);
const VALUE_SEPARATOR = String.fromCharCode(247);

function stripTags(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDateLabel(timestampSeconds) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(timestampSeconds * 1000));
}

function parseTitleFromHtml(html, fallbackValue) {
  const title = stripTags(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || fallbackValue);
  return title
    .replace(/&amp;/g, "&")
    .replace(/\s*\|\s*Soccerway.*$/i, "")
    .trim();
}

async function fetchSoccerwayPage(url) {
  const response = await fetch(url, {
    headers: {
      "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
      "user-agent": "Mozilla/5.0 (compatible; RadarCopaBot/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao buscar ${url}: ${response.status}`);
  }

  return response.text();
}

async function readSourceHtml() {
  try {
    const [resultsHtml, standingsHtml] = await Promise.all([
      fetchSoccerwayPage(SOCCERWAY_RESULTS_URL),
      fetchSoccerwayPage(SOCCERWAY_STANDINGS_URL),
    ]);

    return {
      mode: "soccerway",
      sourceName: "Soccerway",
      resultsHtml,
      standingsHtml,
    };
  } catch (error) {
    const fallbackError = error instanceof Error ? error.message : "erro desconhecido";

    return {
      mode: "local",
      sourceName: `fallback local (${fallbackError})`,
      html: await fs.readFile(LOCAL_FALLBACK_PATH, "utf8"),
    };
  }
}

function extractFeedData(html, feedName) {
  const marker = `cjs.initialFeeds["${feedName}"]`;
  const start = html.indexOf(marker);

  if (start === -1) {
    return "";
  }

  const dataStart = html.indexOf("`", start) + 1;
  const dataEnd = html.indexOf("`", dataStart);

  if (dataStart === 0 || dataEnd === -1) {
    return "";
  }

  return html.slice(dataStart, dataEnd);
}

function parseFeedEntries(feedData) {
  return feedData
    .split(`${TOKEN_SEPARATOR}~AA${VALUE_SEPARATOR}`)
    .slice(1)
    .map((chunk) => `~AA${VALUE_SEPARATOR}${chunk}`)
    .map((chunk) => {
      const entry = {};

      chunk
        .split(TOKEN_SEPARATOR)
        .filter(Boolean)
        .forEach((token) => {
          const separatorIndex = token.indexOf(VALUE_SEPARATOR);

          if (separatorIndex === -1) {
            return;
          }

          const key = token.slice(0, separatorIndex).replace(/^~/, "");
          const value = token.slice(separatorIndex + 1);
          entry[key] = value;
        });

      return entry;
    })
    .filter((entry) => entry.AE && entry.AF && entry.AD);
}

function buildSoccerwayMatch(entry, updatedAt, status) {
  const timestamp = Number.parseInt(entry.AD, 10);
  const homeTeam = entry.AE;
  const awayTeam = entry.AF;
  const homeScore = status === "finished" ? Number.parseInt(entry.AG || "0", 10) : null;
  const awayScore = status === "finished" ? Number.parseInt(entry.AH || "0", 10) : null;

  return {
    id: entry.AA || slugify(`${homeTeam}-${awayTeam}-${entry.AD}`),
    slug: slugify(`${entry.WU || homeTeam}-${entry.WV || awayTeam}-${entry.AD}`),
    group: entry.ER || "Campeonato do mundo",
    round: entry.ER || "Campeonato do mundo",
    homeTeam,
    homeFlag: entry.WM || "",
    awayTeam,
    awayFlag: entry.WN || "",
    scoreLabel: status === "finished" ? `${homeScore} x ${awayScore}` : "A confirmar",
    homeScore,
    awayScore,
    status,
    dateLabel: formatDateLabel(timestamp),
    updatedAt,
  };
}

function parseSoccerwayDataset(resultsHtml, _standingsHtml, sourceName) {
  const updatedAt = new Date().toISOString();
  const resultEntries = parseFeedEntries(extractFeedData(resultsHtml, "summary-results"));
  const fixtureEntries = parseFeedEntries(extractFeedData(resultsHtml, "summary-fixtures"));
  const matches = [
    ...resultEntries.map((entry) => buildSoccerwayMatch(entry, updatedAt, "finished")),
    ...fixtureEntries.map((entry) => buildSoccerwayMatch(entry, updatedAt, "scheduled")),
  ];
  const groups = [...new Set(matches.map((match) => match.group))].map((groupName) => ({
    id: slugify(groupName),
    name: groupName,
    standings: [],
    matches: matches.filter((match) => match.group === groupName),
  }));
  const title = parseTitleFromHtml(resultsHtml, "Campeonato do mundo 2026");
  const subtitle = "Resultados, calendario e classificacao puxados do Soccerway.";

  return {
    title,
    subtitle,
    groups,
    matches,
    posts,
    sync: {
      sourceName,
      sourceLabel: "Soccerway ativo",
      updatedAt,
      nextCron: "A cada 15 minutos",
      cachedUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      resultsUrl: SOCCERWAY_RESULTS_URL,
      standingsUrl: SOCCERWAY_STANDINGS_URL,
    },
  };
}

function parseHeader(html) {
  const title = stripTags(html.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] || "Radar Copa 2026");
  const subtitle = stripTags(html.match(/<div class="subtitle">([\s\S]*?)<\/div>/)?.[1] || "");
  const updateBadge = stripTags(html.match(/<div class="update-badge">([\s\S]*?)<\/div>/)?.[1] || "");

  return { title, subtitle, updateBadge };
}

function getGroupsSection(html) {
  const start = html.indexOf('<div class="groups-grid">');
  const end = html.indexOf('<div class="phase-title">🏅 CLASSIFICAÇÃO PARCIAL</div>');

  if (start === -1 || end === -1) {
    return "";
  }

  return html.slice(start, end);
}

function parseStandings(groupHtml) {
  const rows = [...groupHtml.matchAll(/<tr class="pos-\d">([\s\S]*?)<\/tr>/g)];

  return rows.map((row) => {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => stripTags(cell[1]));
    const teamRaw = cells[1] || "";
    const flag = teamRaw.match(/^[^\s]+/)?.[0] || "";
    const team = teamRaw.replace(flag, "").trim();

    return {
      positionLabel: cells[0],
      team,
      flag,
      points: Number.parseInt(cells[2], 10),
      played: Number.parseInt(cells[3], 10),
      won: Number.parseInt(cells[4], 10),
      drawn: Number.parseInt(cells[5], 10),
      lost: Number.parseInt(cells[6], 10),
      goalsFor: Number.parseInt(cells[7], 10),
      goalsAgainst: Number.parseInt(cells[8], 10),
      goalDifference: Number.parseInt(cells[9], 10),
    };
  });
}

function parseMatchRow(groupName, rowHtml, updatedAt) {
  const teams = [...rowHtml.matchAll(/<div class="teams"[^>]*>([\s\S]*?)<\/div>/g)].map((item) => stripTags(item[1]));
  const scoreLabel = stripTags(rowHtml.match(/<div class="score">([\s\S]*?)<\/div>/)?.[1] || "");
  const dateLabel = stripTags(rowHtml.match(/<div class="date">([\s\S]*?)<\/div>/)?.[1] || "");
  const homeRaw = teams[0] || "";
  const awayRaw = teams[1] || "";
  const homeFlag = homeRaw.match(/^[^\s]+/)?.[0] || "";
  const awayFlag = awayRaw.match(/[^\s]+$/)?.[0] || "";
  const homeTeam = homeRaw.replace(homeFlag, "").trim();
  const awayTeam = awayRaw.replace(awayFlag, "").trim();
  const scoreParts = scoreLabel.includes("x") ? scoreLabel.split("x").map((item) => item.trim()) : [];
  const scheduled = scoreLabel.includes("—");

  return {
    id: slugify(`${groupName}-${homeTeam}-${awayTeam}-${dateLabel}`),
    slug: slugify(`${groupName}-${homeTeam}-${awayTeam}-${dateLabel}`),
    group: groupName,
    round: "Fase de grupos",
    homeTeam,
    homeFlag,
    awayTeam,
    awayFlag,
    scoreLabel,
    homeScore: scheduled ? null : Number.parseInt(scoreParts[0], 10),
    awayScore: scheduled ? null : Number.parseInt(scoreParts[1], 10),
    status: scheduled ? "scheduled" : "finished",
    dateLabel,
    updatedAt,
  };
}

function parseGroups(html, updatedAt) {
  const groupsSection = getGroupsSection(html);
  const chunks = groupsSection.split('<div class="group-card">').slice(1);

  return chunks.map((chunk) => {
    const groupName = stripTags(chunk.match(/<div class="group-title">([\s\S]*?)<\/div>/)?.[1] || "");
    const matchRows = [
      ...chunk.matchAll(
        /<div class="match-row">([\s\S]*?<div class="date">[\s\S]*?<\/div>\s*)<\/div>/g,
      ),
    ];
    const matches = matchRows.map((row) => parseMatchRow(groupName, row[1], updatedAt));

    return {
      id: slugify(groupName),
      name: groupName,
      standings: parseStandings(chunk),
      matches,
    };
  });
}

async function getDataset() {
  const source = await readSourceHtml();

  if (source.mode === "soccerway") {
    return parseSoccerwayDataset(source.resultsHtml, source.standingsHtml, source.sourceName);
  }

  const updatedAt = new Date().toISOString();
  const header = parseHeader(source.html);
  const groups = parseGroups(source.html, updatedAt);
  const matches = groups.flatMap((group) => group.matches);

  return {
    title: header.title,
    subtitle: header.subtitle,
    groups,
    matches,
    posts,
    sync: {
      sourceName: source.sourceName,
      sourceLabel: header.updateBadge || "Atualizacao automatica ativa",
      updatedAt,
      nextCron: "A cada 15 minutos",
      cachedUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      resultsUrl: SOCCERWAY_RESULTS_URL,
      standingsUrl: SOCCERWAY_STANDINGS_URL,
    },
  };
}

module.exports = {
  getDataset,
};
