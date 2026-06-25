const { getDataset } = require("../lib/scraper");

module.exports = async function handler(req, res) {
  try {
    const secret = process.env.CRON_SECRET;
    const authorization = req.headers.authorization;

    if (secret && authorization !== `Bearer ${secret}`) {
      res.status(401).json({ error: "Nao autorizado" });
      return;
    }

    const dataset = await getDataset();

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).json({
      ok: true,
      refreshedAt: new Date().toISOString(),
      matches: dataset.matches.length,
      source: dataset.sync.sourceName,
      note: "No modo sem banco, a rota confirma leitura e deixa o cache da Vercel livre para revalidacao.",
    });
  } catch (error) {
    res.status(500).json({
      error: "Falha ao executar a sincronizacao",
      detail: error.message,
    });
  }
};
