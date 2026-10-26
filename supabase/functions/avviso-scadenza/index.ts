// supabase/functions/avviso-scadenza/index.ts
// Lanciata ogni giorno (cron): avvisa i biologi la cui licenza scade tra 30 o
// 7 giorni. Chi ha già un abbonamento Stripe si rinnova da solo e non riceve
// nulla. Il pulsante porta al portale con ?rinnova=1, che apre subito il
// pagamento (con prova fino alla scadenza attuale: nessun giorno perso).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { avvisaAdmin, escHtml, inviaEmail, layoutEmail, notificaAutorizzata, SITE_URL } from "../_shared/utils.ts"

type Biologo = { id: string; nome: string | null; email: string; scadenza: string }

serve(async (req) => {
  if (!notificaAutorizzata(req)) return new Response("non autorizzato", { status: 401 })
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

  const oggi   = new Date()
  const date30 = new Date(oggi); date30.setDate(oggi.getDate() + 30)
  const date7  = new Date(oggi); date7.setDate(oggi.getDate() + 7)
  const target30 = date30.toISOString().split("T")[0]
  const target7  = date7.toISOString().split("T")[0]

  // Biologi che scadono tra 30 o 7 giorni
  const { data, error } = await db
    .from("profiles")
    .select("id, nome, email, scadenza")
    .eq("stato", "active")
    .in("scadenza", [target30, target7])
    .is("stripe_subscription_id", null)

  if (error) {
    await avvisaAdmin("avviso-scadenza", "Lettura dei profili in scadenza fallita", error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
  const biologi = (data ?? []) as Biologo[]
  if (biologi.length === 0) {
    console.log("Nessun biologo in scadenza oggi")
    return new Response("nessuno", { status: 200 })
  }

  console.log(`Invio avvisi a ${biologi.length} biolog${biologi.length === 1 ? "o" : "i"}`)

  const risultati = await Promise.all(biologi.map(async (b) => {
    const giorni = b.scadenza === target7 ? 7 : 30
    const urgente = giorni === 7
    const colore = urgente ? "#ef4444" : "#F4A261"
    const dataFormattata = new Date(b.scadenza).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })

    const { ok } = await inviaEmail(
      b.email,
      urgente ? "⚠️ La tua licenza S.A.N.E. scade tra 7 giorni" : "La tua licenza S.A.N.E. scade tra 30 giorni",
      layoutEmail("Portale Biologi Certificati", `
        <h2 style="color:${colore};font-size:18px;margin:0 0 12px;">
          ${urgente ? "⚠️ Licenza in scadenza urgente" : "⏳ Licenza in scadenza"}
        </h2>
        <p style="color:#475569;font-size:14px;line-height:1.7;">
          Ciao ${escHtml(b.nome || b.email)},<br><br>
          La tua licenza S.A.N.E. Italia scadrà il <strong>${dataFormattata}</strong>
          (tra <strong style="color:${colore}">${giorni} giorni</strong>).<br><br>
          Puoi rinnovarla subito con l'abbonamento annuale: il primo addebito arriva
          solo il giorno della scadenza, quindi non perdi nessun giorno.
          ${urgente ? "<br><br>Questo è un <strong>ultimo promemoria</strong>. Dopo la scadenza non potrai più accedere al portale." : ""}
        </p>
        <a href="${SITE_URL}/biologo.html?rinnova=1"
           style="display:block;background:${colore};color:white;text-decoration:none;text-align:center;padding:14px;border-radius:10px;font-weight:700;font-size:14px;margin:20px 0;">
          Rinnova ora →
        </a>
        <p style="color:#94a3b8;font-size:11px;text-align:center;margin:0;">Hai un codice di sblocco o domande? Scrivi a <a href="mailto:info@sane-italia.it?subject=Rinnovo licenza SANE Italia" style="color:#00A896;">info@sane-italia.it</a>.<br>Se hai già rinnovato, ignora questa email.</p>`),
    )
    console.log(`[${giorni}gg] Email a ${b.email}: ${ok ? "ok" : "ERRORE"}`)
    return { email: b.email, giorni, ok }
  }))

  return new Response(JSON.stringify({ inviati: risultati.length, risultati }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
})
