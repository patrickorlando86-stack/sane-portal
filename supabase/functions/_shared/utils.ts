// supabase/functions/_shared/utils.ts
// Pezzi comuni a tutte le Edge Functions. La cartella _shared non è una
// funzione: la CLI la include nel pacchetto di ogni funzione che la importa.
// Una correzione fatta qui vale per tutte (prima lo stesso codice era copiato
// in 5 file).

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
export const SITE_URL = Deno.env.get("SITE_URL") || "https://sane-italia.it";
export const ADMIN_EMAIL = "info@sane-italia.it";

// ── CORS (funzioni chiamate dal browser) ───────────────────────────────
const ALLOWED_ORIGINS = [
  "https://sane-italia.it",
  "https://www.sane-italia.it",
  "https://saneportal.netlify.app",
];
export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
    "Vary": "Origin",
  };
}

// Risposta JSON con gli header CORS della richiesta
export function jsonFor(req: Request) {
  const headers = { ...cors(req), "Content-Type": "application/json" };
  return (status: number, obj: unknown, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(obj), { status, headers: { ...headers, ...extra } });
}

// ── Supabase ───────────────────────────────────────────────────────────
// Utente a cui appartiene l'access_token mandato dal portale (null se non valido)
export async function getUser(token: string) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  return await r.json(); // { id, email, ... }
}

// REST di Supabase con la SERVICE ROLE KEY (bypassa la RLS)
export function svc(path: string, opts: RequestInit = {}) {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
}

// Una riga di profiles letta con la service role (null se non c'è)
export async function getProfilo(userId: string, colonne = "*") {
  const r = await svc(`profiles?id=eq.${encodeURIComponent(userId)}&select=${colonne}`);
  if (!r.ok) return null;
  const rows = await r.json();
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

// ── Stripe ─────────────────────────────────────────────────────────────
export function stripe(path: string, body?: URLSearchParams, method?: string) {
  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  return fetch(`https://api.stripe.com/v1/${path}`, {
    method: method ?? (body ? "POST" : "GET"),
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
  });
}

export function unixToDate(sec: number | null | undefined) {
  if (!sec) return null;
  return new Date(sec * 1000).toISOString().split("T")[0];
}

// Dalla versione API Stripe 2025-03-31 (basil) alcuni campi sono stati spostati:
//   subscription.current_period_end -> subscription.items.data[].current_period_end
//   invoice.subscription            -> invoice.parent.subscription_details.subscription
// Leggiamo entrambe le forme, così funziona con qualunque versione dell'account.
// deno-lint-ignore no-explicit-any
export function periodEnd(sub: any): number | null {
  return sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end ?? null;
}
// deno-lint-ignore no-explicit-any
export function invoiceSubscriptionId(inv: any): string | null {
  return inv?.subscription ?? inv?.parent?.subscription_details?.subscription ?? null;
}

// ── Email (Resend) ─────────────────────────────────────────────────────
// Testo libero degli utenti (nomi, email) va escapato prima di finire nell'HTML
export function escHtml(v: unknown) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// Mittente: senza EMAIL_FROM si usa l'indirizzo di prova di Resend, che
// consegna solo al proprietario dell'account (vedi CONFIGURAZIONE.md)
export function emailFrom() {
  return Deno.env.get("EMAIL_FROM") || "S.A.N.E. Italia <onboarding@resend.dev>";
}

export async function inviaEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.error("⚠️ RESEND_API_KEY non impostata: email non inviata:", subject);
    return { ok: false, data: null };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: emailFrom(), to: [to], subject, html }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) console.error("⚠️ Resend non OK:", res.status, JSON.stringify(data));
  return { ok: res.ok, data };
}

// Cornice comune delle email (intestazione blu + riquadro bianco)
export function layoutEmail(sottotitolo: string, corpo: string, piede = "S.A.N.E. Italia · info@sane-italia.it") {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f0f4f8;padding:32px 20px;">
      <div style="background:#0A2647;border-radius:16px;padding:28px;text-align:center;margin-bottom:20px;">
        <h1 style="color:white;font-size:22px;margin:0;">S.A.N.E. Italia</h1>
        <p style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:6px 0 0;">${sottotitolo}</p>
      </div>
      <div style="background:white;border-radius:16px;padding:28px;">${corpo}</div>
      <p style="color:#94a3b8;font-size:10px;text-align:center;margin-top:16px;">${piede}</p>
    </div>`;
}

// ── Avvisi di guasto ───────────────────────────────────────────────────
// Email all'admin quando qualcosa che riguarda pagamenti o accessi va storto
// (prima gli errori finivano solo nei log, che nessuno guarda). Non lancia
// mai: chi la chiama deve poter rispondere normalmente.
export async function avvisaAdmin(funzione: string, problema: string, dettagli: unknown = null) {
  console.error(`🚨 [${funzione}] ${problema}`, dettagli ?? "");
  try {
    const det = dettagli == null ? "" : typeof dettagli === "string" ? dettagli : JSON.stringify(dettagli, null, 2);
    await inviaEmail(
      ADMIN_EMAIL,
      `🚨 Portale: problema in ${funzione}`,
      layoutEmail("Avviso automatico", `
        <h2 style="color:#b91c1c;font-size:17px;margin:0 0 12px;">Qualcosa non ha funzionato</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 12px;"><strong>Funzione:</strong> ${escHtml(funzione)}<br><strong>Problema:</strong> ${escHtml(problema)}</p>
        ${det ? `<pre style="background:#f8fafc;border-radius:8px;padding:12px;font-size:11px;white-space:pre-wrap;word-break:break-all;color:#334155;">${escHtml(det.slice(0, 3000))}</pre>` : ""}
        <p style="color:#94a3b8;font-size:11px;margin:12px 0 0;">Dettagli completi: Supabase → Edge Functions → ${escHtml(funzione)} → Logs</p>`),
    );
  } catch (e) {
    console.error("avvisaAdmin fallito:", e);
  }
}

// ── Funzioni di notifica (chiamate da trigger/cron del database) ───────
// "Verify JWT" acceso fa passare qualunque JWT valido, compresa la chiave anon
// che è pubblica nel sito: senza questo controllo chiunque potrebbe far partire
// email a nome S.A.N.E. Ammessi: la service role key, oppure l'header
// x-notify-secret uguale al secret NOTIFY_SECRET. Finché NOTIFY_SECRET non è
// impostato si accetta tutto (come prima) ma si scrive nei log il ruolo del
// chiamante, per capire cosa usano trigger e cron.
function ruoloJwt(req: Request): string | null {
  const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  try {
    const payload = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).role ?? null;
  } catch {
    return null;
  }
}
export function notificaAutorizzata(req: Request): boolean {
  const ruolo = ruoloJwt(req);
  if (ruolo === "service_role") return true;
  const secret = Deno.env.get("NOTIFY_SECRET");
  if (secret) return req.headers.get("x-notify-secret") === secret;
  console.warn(`⚠️ NOTIFY_SECRET non impostato: accetto una chiamata con ruolo "${ruolo}"`);
  return true;
}
