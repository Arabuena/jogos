const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const rootDir = __dirname;
const port = Number.parseInt(process.env.PORT || "3000", 10);

const apiRoutes = {
  "/api/games": require("./api/games"),
  "/api/posts": require("./api/posts"),
  "/api/admin-syncs": require("./api/admin-syncs"),
  "/api/cron/sync-results": require("./api/cron/sync-results"),
};

const cleanRoutes = {
  "/": "index.html",
  "/jogos": "jogos.html",
  "/jogo": "jogo.html",
  "/post": "post.html",
  "/admin": "admin.html",
};

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
};

function createResponse(res) {
  let statusCode = 200;
  const headers = {};

  return {
    setHeader(name, value) {
      headers[name] = value;
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      const body = JSON.stringify(payload);
      res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        ...headers,
      });
      res.end(body);
    },
    send(body, type = "text/plain; charset=utf-8") {
      res.writeHead(statusCode, {
        "Content-Type": type,
        ...headers,
      });
      res.end(body);
    },
  };
}

async function serveStatic(reqPath, res) {
  const cleanPath = cleanRoutes[reqPath] || reqPath.slice(1);
  const filePath = path.join(rootDir, cleanPath);

  try {
    const content = await fs.readFile(filePath);
    const type = contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Nao encontrado");
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (apiRoutes[pathname]) {
    try {
      await apiRoutes[pathname](req, createResponse(res));
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          error: "Falha no preview local",
          detail: error instanceof Error ? error.message : "erro desconhecido",
        }),
      );
    }
    return;
  }

  await serveStatic(pathname, res);
});

server.listen(port, () => {
  console.log(`Preview local ativo em http://127.0.0.1:${port}`);
});
