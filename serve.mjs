import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { createServer } from "node:http";

const root = resolve(".");
const port = Number(process.env.PORT || 8765);
const host = process.env.HOST || "127.0.0.1";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/plain; charset=utf-8"
};

function resolvePath(url) {
  const parsed = new URL(url, `http://${host}:${port}`);
  const pathname = decodeURIComponent(parsed.pathname);
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(join(root, safePath));
  if (!filePath.startsWith(root)) return null;
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    return join(filePath, "index.html");
  }
  return filePath;
}

createServer(async (request, response) => {
  if ((request.url || "").startsWith("/api/eu-search")) {
    const { default: handler } = await import("./api/eu-search.js");
    await handler(request, response);
    return;
  }

  if ((request.url || "").startsWith("/api/fr-search")) {
    const { default: handler } = await import("./api/fr-search.js");
    await handler(request, response);
    return;
  }

  if ((request.url || "").startsWith("/api/uk-search")) {
    const { default: handler } = await import("./api/uk-search.js");
    await handler(request, response);
    return;
  }

  if ((request.url || "").startsWith("/api/de-search")) {
    const { default: handler } = await import("./api/de-search.js");
    await handler(request, response);
    return;
  }

  if ((request.url || "").startsWith("/api/jp-search")) {
    const { default: handler } = await import("./api/jp-search.js");
    await handler(request, response);
    return;
  }

  const filePath = resolvePath(request.url || "/");
  if (!filePath || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": types[extname(filePath)] || "application/octet-stream"
  });
  createReadStream(filePath).pipe(response);
}).listen(port, host);
