const { getDataset } = require("./lib/scraper");

module.exports = async function handler(req, res) {
  try {
    const { searchParams } = new URL(req.url, "http://localhost");
    const slug = searchParams.get("slug");
    const dataset = await getDataset();
    const items = slug ? dataset.posts.filter((post) => post.slug === slug) : dataset.posts;

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).json({
      total: items.length,
      items,
    });
  } catch (error) {
    res.status(500).json({
      error: "Falha ao carregar os posts",
      detail: error.message,
    });
  }
};
