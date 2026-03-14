const BACKEND = "https://accounting-backend-gwqj.onrender.com";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  const segments = req.query.path || [];
  const search = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  const target = `${BACKEND}/api/${segments.join("/")}${search}`;

  const headers = {};
  for (const [key, val] of Object.entries(req.headers)) {
    if (key.toLowerCase() !== "host") headers[key] = val;
  }

  const init = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    init.body = Buffer.concat(chunks);
  }

  const upstream = await fetch(target, init);

  // Forward all response headers, preserving multiple Set-Cookie entries
  const setCookies = upstream.headers.getSetCookie
    ? upstream.headers.getSetCookie()
    : [upstream.headers.get("set-cookie")].filter(Boolean);

  for (const [key, val] of upstream.headers.entries()) {
    if (["transfer-encoding", "connection", "keep-alive"].includes(key.toLowerCase())) continue;
    if (key.toLowerCase() === "set-cookie") continue; // handled separately below
    res.setHeader(key, val);
  }
  if (setCookies.length) res.setHeader("Set-Cookie", setCookies);

  res.status(upstream.status);
  res.end(Buffer.from(await upstream.arrayBuffer()));
}
