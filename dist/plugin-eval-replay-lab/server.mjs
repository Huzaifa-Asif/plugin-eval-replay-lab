import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = new URL("./", import.meta.url).pathname;
const port = Number(process.env.PORT || 4173);
const allowed = new Set(["/", "/index.html", "/styles.css", "/src/app.mjs", "/src/core.mjs", "/examples/valid.json", "/examples/unsafe.json"]);
const types = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".mjs":"text/javascript; charset=utf-8", ".json":"application/json; charset=utf-8" };
const headers = {
  "Content-Security-Policy":"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  "X-Content-Type-Options":"nosniff",
  "Referrer-Policy":"no-referrer",
  "Permissions-Policy":"camera=(), microphone=(), geolocation=()",
  "Cache-Control":"no-store"
};

createServer(async (request, response) => {
  const host = request.headers.host || "";
  if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return send(response, 400, "Bad host");
  let path;
  try { path = new URL(request.url, `http://${host}`).pathname; } catch { return send(response, 400, "Bad request"); }
  if (path === "/") path = "/index.html";
  if (!allowed.has(path) || normalize(path) !== path) return send(response, 404, "Not found");
  try {
    const file = join(root, path.slice(1));
    if (!(await stat(file)).isFile()) return send(response, 404, "Not found");
    response.writeHead(200, { ...headers, "Content-Type": types[extname(file)] || "application/octet-stream" });
    response.end(await readFile(file));
  } catch { send(response, 404, "Not found"); }
}).listen(port, "127.0.0.1", () => console.log(`Plugin Eval Replay Lab: http://127.0.0.1:${port}`));

function send(response, status, body) { response.writeHead(status, { ...headers, "Content-Type":"text/plain; charset=utf-8" }); response.end(body); }
