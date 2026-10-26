// supabase/functions/nuova-registrazione/index.ts
// Innescata dal database a ogni nuovo profilo: email di benvenuto al biologo
// e avviso all'admin. Accetta sia il body di un trigger SQL {email, nome} sia
// quello di un Database Webhook {record: {...}}.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { ADMIN_EMAIL, escHtml, inviaEmail, layoutEmail, notificaAutorizzata, SITE_URL } from "../_shared/utils.ts"

serve(async (req) => {
  if (!notificaAutorizzata(req)) return new Response("non autorizzato", { status: 401 })
  const body = await req.json().catch(() => ({}))
  const email = body.email ?? body.record?.email
  const nome  = body.nome  ?? body.record?.nome ?? "Nuovo biologo"

  if (!email) {
    console.error("Missing email:", JSON.stringify(body))
    return new Response("missing email", { status: 400 })
  }

  const [biologo, admin] = await Promise.all([
    // 1. Benvenuto al biologo: dopo la registrazione il portale chiede
    //    abbonamento o codice di sblocco, quindi glielo diciamo subito
    inviaEmail(email, "Benvenuto nel Portale Biologi S.A.N.E. Italia", layoutEmail("Portale Biologi Certificati", `
      <h2 style="color:#0A2647;font-size:18px;margin:0 0 12px;">📋 Registrazione completata</h2>
      <p style="color:#475569;font-size:14px;line-height:1.7;">
        Ciao ${escHtml(nome)},<br><br>
        il tuo account sul portale S.A.N.E. Italia è stato creato.<br><br>
        Per iniziare a lavorare accedi al portale e attiva l'<strong>abbonamento annuale</strong>
        oppure inserisci il <strong>codice di sblocco</strong> che ti abbiamo fornito.
      </p>
      <a href="${SITE_URL}/biologo.html"
         style="display:block;background:#00A896;color:white;text-decoration:none;text-align:center;padding:14px;border-radius:10px;font-weight:700;font-size:14px;margin:20px 0;">
        Accedi al Portale →
      </a>
      <p style="color:#94a3b8;font-size:11px;text-align:center;margin:0;">Per informazioni: <a href="mailto:info@sane-italia.it" style="color:#00A896;">info@sane-italia.it</a></p>`)),

    // 2. Notifica admin
    inviaEmail(ADMIN_EMAIL, `🆕 Nuova registrazione: ${nome}`, layoutEmail("Notifica sistema", `
      <h2 style="color:#0A2647;font-size:18px;margin:0 0 12px;">🆕 Nuovo biologo registrato</h2>
      <p style="color:#475569;font-size:14px;line-height:1.7;">
        Un nuovo biologo si è registrato al portale S.A.N.E. Italia.
      </p>
      <div style="background:#f8fafc;border-radius:10px;padding:16px;margin:20px 0;">
        <p style="color:#475569;font-size:13px;margin:0 0 6px;"><strong>Nome:</strong> ${escHtml(nome)}</p>
        <p style="color:#475569;font-size:13px;margin:0;"><strong>Email:</strong> ${escHtml(email)}</p>
      </div>
      <a href="${SITE_URL}/admin.html"
         style="display:block;background:#00A896;color:white;text-decoration:none;text-align:center;padding:14px;border-radius:10px;font-weight:700;font-size:14px;margin:20px 0;">
        Vai al pannello Admin →
      </a>`, "S.A.N.E. Italia · Sistema automatico")),
  ])

  return new Response(JSON.stringify({ biologo: biologo.data, admin: admin.data }), {
    status: biologo.ok && admin.ok ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  })
})
