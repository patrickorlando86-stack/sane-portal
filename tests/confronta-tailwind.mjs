// Confronto una-tantum: Tailwind dal CDN (com'era) contro css/tailwind.css.
// Per ogni pagina apre le due varianti con gli stessi dati finti e confronta
// lo stile calcolato di OGNI elemento. Serve la rete (gira su GitHub).
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:8765";
const CDN = '<script src="https://cdn.tailwindcss.com"></script>';
const LINK_RE = /<link rel="stylesheet" href="css\/tailwind\.css[^"]*">\s*/;

const user = { id: "u1", email: "t@example.it", aud: "authenticated", role: "authenticated" };
const exp = Math.floor(Date.now() / 1000) + 3600;
const sess = { access_token: "h." + Buffer.from(JSON.stringify({ sub: "u1", exp })).toString("base64url") + ".s", token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: "r", user };
const fra10 = new Date(Date.now() + 10 * 864e5).toISOString().split("T")[0];
const profiloBio = { id: "u1", nome: "Test", role: "biologo", stato: "active", scadenza: fra10, regione: "Lazio" };
const profiloAdmin = { id: "u1", nome: "Admin", role: "admin", stato: "active" };
const biologi = [
  { id: "b1", nome: "Rossi", email: "r@x.it", role: "biologo", stato: "active", scadenza: "2027-03-01", regione: "Lazio", data_iscrizione: "2026-01-01" },
  { id: "b2", nome: "Bianchi", email: "b@x.it", role: "biologo", stato: "pending", regione: "Sicilia", data_iscrizione: "2026-02-01" },
];
const scuole = [{ id: "s1", biologo_id: "u1", nome: "IC Test", comune: "Roma", classi: 2, created_at: "2026-09-01" }];

async function apri(browser, pagina, variante, admin, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  await ctx.route(/googletagmanager|google-analytics/, (r) => r.abort());
  await ctx.route(new RegExp(`${BASE}/${pagina}$`), async (r) => {
    const resp = await r.fetch();
    let html = await resp.text();
    if (variante === "cdn" && !process.env.CONTROLLO) html = html.replace(LINK_RE, "").replace("<head>", "<head>\n" + CDN);
    await r.fulfill({ response: resp, body: html });
  });
  await ctx.route(/supabase\.co\//, (r) => {
    const u = r.request().url();
    const j = (o) => r.fulfill({ contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(o) });
    if (u.includes("/auth/v1/token")) return j(sess);
    if (u.includes("/auth/v1/user")) return j(user);
    if (u.includes("/rest/v1/profiles")) {
      const p = admin ? profiloAdmin : profiloBio;
      const singolo = (r.request().headers()["accept"] || "").includes("vnd.pgrst.object");
      if (singolo) return j(p);
      return j(admin && !u.includes("id=eq.u1") ? biologi : [p]);
    }
    if (u.includes("/rest/v1/scuole")) return j(scuole);
    if (u.includes("/rest/v1/")) return j([]);
    return r.abort();
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/${pagina}`, { waitUntil: "load" });
  await page.waitForTimeout(2000);
  return { ctx, page };
}

async function stili(page) {
  return await page.evaluate(() => {
    const out = [];
    const all = document.querySelectorAll("body *");
    all.forEach((el, i) => {
      const cs = getComputedStyle(el);
      const props = {};
      for (const p of cs) props[p] = cs.getPropertyValue(p);
      const id = el.id ? "#" + el.id : el.tagName.toLowerCase() + ":" + i;
      out.push([id, props]);
    });
    return out;
  });
}

async function confronta(browser, pagina, admin, passi) {
  let totale = 0;
  for (const width of [390, 1280]) {
    const A = await apri(browser, pagina, "cdn", admin, width);
    const B = await apri(browser, pagina, "compilato", admin, width);
    for (const [nome, azione] of passi) {
      if (azione) { await azione(A.page); await azione(B.page); await A.page.waitForTimeout(1500); await B.page.waitForTimeout(1500); }
      const sa = await stili(A.page), sb = await stili(B.page);
      const diff = [];
      if (sa.length !== sb.length) diff.push(`numero elementi diverso: ${sa.length} vs ${sb.length}`);
      for (let i = 0; i < Math.min(sa.length, sb.length); i++) {
        const [id, pa] = sa[i], pb = sb[i][1];
        // le variabili interne --tw-* cambiano solo nella forma (rgb() vs rgba());
        // il loro effetto è già nelle proprietà vere confrontate qui
        for (const k of Object.keys(pa)) if (!k.startsWith("--tw-") && pa[k] !== pb[k]) diff.push(`${id} ${k}: "${pa[k]}" → "${pb[k]}"`);
      }
      totale += diff.length;
      console.log(`${diff.length ? "✗" : "✓"} ${pagina} ${width}px ${nome}: ${sa.length} elementi, ${diff.length} differenze`);
      diff.slice(0, 15).forEach((d) => console.log("     " + d));
    }
    await A.ctx.close(); await B.ctx.close();
  }
  return totale;
}

const login = (pg) => pg.evaluate(() => {
  document.getElementById("loginEmail").value = "t@example.it";
  document.getElementById("loginPassword").value = "pw";
  doLogin();
});
const sezione = (s) => (pg) => pg.evaluate((s) => {
  document.getElementById("onboardingModal")?.classList.remove("open");
  const el = [...document.querySelectorAll(".nav-item")].find((n) => (n.getAttribute("onclick") || "").includes(`'${s}'`));
  el?.click();
}, s);

const browser = await chromium.launch();
let tot = 0;
tot += await confronta(browser, "biologo.html", false, [
  ["login", null], ["dashboard", login], ["scuole", sezione("scuole")], ["report", sezione("report")], ["autovalutazione", sezione("autovalutazione")],
]);
tot += await confronta(browser, "admin.html", true, [
  ["login", null], ["dashboard", login], ["biologi", sezione("biologi")], ["licenze", sezione("licenze")], ["codici", sezione("codici")], ["nazionale", sezione("nazionale")],
]);
await browser.close();
console.log(`\nDifferenze totali: ${tot}`);
process.exit(tot ? 1 : 0);
