const { getDataset } = require("./lib/scraper");

module.exports = async function handler(_req, res) {
  try {
    const dataset = await getDataset();

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).json({
      status: "ok",
      counts: {
        groups: dataset.groups.length,
        matches: dataset.matches.length,
        posts: dataset.posts.length,
      },
      sync: dataset.sync,
    });
  } catch (error) {
    res.status(500).json({
      error: "Falha ao montar o painel tecnico",
      detail: error.message,
    });
  }
};
