// Controllo automatico delle pagine (lo lancia .github/workflows/controlli.yml).
// Apre ogni pagina in Chromium, a larghezza telefono e desktop, e fallisce se:
//   - c'è un errore JavaScript
//   - la pagina scorre in orizzontale (layout rotto su mobile)
// Poi fa un login finto nel portale biologo (Supabase simulato) e controlla
// che la dashboard si apra e che la licenza in scadenza mostri il rinnovo.
//
// Uso locale:  python3 -m http.server 8765  e poi  node tests/smoke.mjs
// Variabile BASE per un altro indirizzo (default http://localhost:8765).

import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:8765";
const PAGINE = [
  "index.html", "en/index.html", "es/index.html", "scuole.html", "biologi.html",
  "privacy.html", "questionario.html", "demo.html", "portale.html",
  "biologo.html", "admin.html", "valutazione.html", "reset-password.html",
];
const LARGHEZZE = [390, 1280];

// Richieste da non far partire davvero durante il test
const BLOCCA = /googletagmanager|google-analytics|supabase\.co/;

const errori = [];
const browser = await chromium.launch();

for (const width of LARGHEZZE) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 } });
  await ctx.route(BLOCCA, (r) => r.abort());
  for (const p of PAGINE) {
    const page = await ctx.newPage();
    const js = [];
    page.on("pageerror", (e) => js.push(e.message));
    await page.goto(`${BASE}/${p}`, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(1500);
    const hscroll = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const esito = [];
    if (js.length) esito.push("errori JS: " + js.join(" | "));
    if (hscroll > 1) esito.push(`scorre in orizzontale di ${hscroll}px`);
    console.log(`${esito.length ? "✗" : "✓"} ${width}px ${p}${esito.length ? " — " + esito.join("; ") : ""}`);
    if (esito.length) errori.push(`${width}px ${p}: ${esito.join("; ")}`);
    await page.close();
  }
  await ctx.close();
}

// ── Login finto nel portale biologo ────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const js = [];
  page.on("pageerror", (e) => js.push(e.message));
  page.on("dialog", (d) => d.dismiss());

  const fra10gg = new Date(Date.now() + 10 * 864e5).toISOString().split("T")[0];
  const user = { id: "u1", email: "test@example.it", aud: "authenticated", role: "authenticated" };
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = "h." + Buffer.from(JSON.stringify({ sub: "u1", role: "authenticated", exp })).toString("base64url") + ".s";
  const sessione = { access_token: token, token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: "r", user };
  const profilo = { id: "u1", nome: "Test", role: "biologo", stato: "active", scadenza: fra10gg, regione: "Lazio" };

  await ctx.route(/googletagmanager|google-analytics/, (r) => r.abort());
  await ctx.route(/supabase\.co\//, (r) => {
    const u = r.request().url();
    const json = (body) => r.fulfill({ contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
    if (u.includes("/auth/v1/token")) return json(sessione);
    if (u.includes("/auth/v1/user")) return json(user);
    if (u.includes("/rest/v1/profiles")) {
      const singolo = (r.request().headers()["accept"] || "").includes("vnd.pgrst.object");
      return json(singolo ? profilo : [profilo]);
    }
    if (u.includes("/rest/v1/")) return json([]);
    return r.abort();
  });

  await page.goto(`${BASE}/biologo.html`, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  await page.fill("#loginEmail", "test@example.it");
  await page.fill("#loginPassword", "password");
  await page.click("#loginBtn");
  await page.waitForTimeout(3000);

  const chips = await page.locator("#dashProfiloInfo").innerText().catch(() => "");
  const esito = [];
  if (js.length) esito.push("errori JS: " + js.join(" | "));
  if (!/Rinnova/.test(chips)) esito.push(`la dashboard non mostra il rinnovo (chip: "${chips}")`);
  console.log(`${esito.length ? "✗" : "✓"} login portale biologo${esito.length ? " — " + esito.join("; ") : ""}`);
  if (esito.length) errori.push("login portale biologo: " + esito.join("; "));
  await ctx.close();
}

await browser.close();

if (errori.length) {
  console.error(`\n${errori.length} problemi:\n- ` + errori.join("\n- "));
  process.exit(1);
}
console.log("\nTutto a posto.");
