// SERVEUR MULTIJOUEUR de "La vie de Kinshasa" (chat + joueurs en ligne).
// Lancer : npm install  puis  npm start
const http = require("http");
const { WebSocketServer } = require("ws");
const clients = new Map();
let nextId = 1;
const server = http.createServer((req, res) => { res.writeHead(200, { "content-type": "text/plain; charset=utf-8" }); res.end("La vie de Kinshasa : serveur en ligne. Joueurs connectés : " + clients.size); });
const wss = new WebSocketServer({ server });
const clean = (s, n) => String(s || "").replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
const num = (v, a, b, d) => { v = Number(v); return Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : d; };
const color = (c, d) => (/^#[0-9a-fA-F]{6}$/.test(c) ? c : d);
const send = (ws, o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
const all = (o) => clients.forEach((c) => send(c.ws, o));

wss.on("connection", (ws) => {
  const id = String(nextId++), p = { id, name: "Joueur" + id, x: 165, y: 925, hd: 0, sc: null, mv: false, shirt: "#1e88e5", skin: "#a0673a" };
  const c = { ws, p, last: 0, alive: true }; clients.set(id, c);
  send(ws, { t: "welcome", id }); all({ t: "count", n: clients.size });
  ws.on("pong", () => { c.alive = true; });
  ws.on("message", (raw) => {
    if (raw.length > 700) return;
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.t === "hello") { p.name = clean(m.name, 16) || p.name; p.shirt = color(m.shirt, p.shirt); p.skin = color(m.skin, p.skin); }
    else if (m.t === "pos") { p.x = num(m.x, 0, 2400, p.x); p.y = num(m.y, 0, 2300, p.y); p.hd = num(m.hd, -7, 7, 0); p.sc = m.sc ? clean(m.sc, 20) : null; p.mv = !!m.mv; }
    else if (m.t === "chat" || m.t === "dm") {
      const now = Date.now(); if (now - c.last < 700) return; c.last = now;
      const text = clean(m.text, 140); if (!text) return;
      if (m.t === "chat") all({ t: "chat", id, name: p.name, text, ts: now });
      else { const to = clients.get(String(m.to)); if (to) send(to.ws, { t: "dm", from: id, name: p.name, text, ts: now }); }
    }
  });
  ws.on("close", () => { clients.delete(id); all({ t: "count", n: clients.size }); });
});
setInterval(() => { const list = [...clients.values()].map((c) => c.p); clients.forEach((c) => send(c.ws, { t: "players", list })); }, 250);
setInterval(() => { clients.forEach((c) => { if (!c.alive) return c.ws.terminate(); c.alive = false; try { c.ws.ping(); } catch (e) {} }); }, 30000);
server.listen(process.env.PORT || 8080, () => console.log("Serveur prêt sur le port " + (process.env.PORT || 8080)));
