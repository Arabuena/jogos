const fs = require("node:fs/promises");
const path = require("node:path");

const { posts } = require("./content");

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

async function readSourceHtml() {
  const sourceUrl = process.env.SCRAPER_SOURCE_URL;

  if (sourceUrl) {
    const response = await fetch(sourceUrl);

    if (!response.ok) {
      throw new Error(`Falha ao buscar fonte remota: ${response.status}`);
    }

    return {
      sourceName: sourceUrl,
      html: await response.text(),
    };
  }

  const fallbackPath = path.join(__dirname, "source.html");
  return {
    sourceName: "arquivo local",
    html: await fs.readFile(fallbackPath, "utf8"),
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
    },
  };
}

module.exports = {
  getDataset,
};
