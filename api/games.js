const { getDataset } = require("./lib/scraper");

module.exports = async function handler(req, res) {
  try {
    const { searchParams } = new URL(req.url, "http://localhost");
    const slug = searchParams.get("slug");
    const status = searchParams.get("status");
    const group = searchParams.get("group");
    const dataset = await getDataset();
    let items = dataset.matches;

    if (slug) {
      items = items.filter((match) => match.slug === slug);
    }

    if (status) {
      items = items.filter((match) => match.status === status);
    }

    if (group) {
      items = items.filter((match) => match.group === group);
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).json({
      total: items.length,
      items,
      groups: dataset.groups.map((groupItem) => groupItem.name),
      sync: dataset.sync,
    });
  } catch (error) {
    res.status(500).json({
      error: "Falha ao carregar os jogos",
      detail: error.message,
    });
  }
};
