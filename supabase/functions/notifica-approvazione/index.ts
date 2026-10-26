// supabase/functions/notifica-approvazione/index.ts
// Innescata dal database quando un profilo diventa attivo: avvisa il biologo.
// Supporta sia trigger SQL {email, nome} che webhook {record, old_record}.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { escHtml, inviaEmail, layoutEmail, notificaAutorizzata, SITE_URL } from "../_shared/utils.ts"

serve(async (req) => {
  if (!notificaAutorizzata(req)) return new Response("non autorizzato", { status: 401 })
  const body = await req.json().catch(() => ({}))
  const email = body.email ?? body.record?.email
  const nome  = body.nome  ?? body.record?.nome ?? email

  if (!email) {
    console.error("Missing email in body:", JSON.stringify(body))
    return new Response("missing email", { status: 400 })
  }

  const { ok, data } = await inviaEmail(email, "Il tuo account S.A.N.E. Italia è stato attivato!", layoutEmail("Portale Biologi Certificati", `
    <h2 style="color:#0A2647;font-size:18px;margin:0 0 12px;">🎉 Account attivato!</h2>
    <p style="color:#475569;font-size:14px;line-height:1.7;">Ciao ${escHtml(nome)},<br><br>
    Il tuo account S.A.N.E. Italia è stato <strong>approvato e attivato</strong>. Puoi ora accedere al portale e iniziare a lavorare.</p>
    <a href="${SITE_URL}/biologo.html"
       style="display:block;background:#00A896;color:white;text-decoration:none;text-align:center;padding:14px;border-radius:10px;font-weight:700;font-size:14px;margin:20px 0;">
      Accedi al Portale →
    </a>
    <p style="color:#94a3b8;font-size:11px;text-align:center;margin:0;">Usa la tua email e la password scelta in fase di registrazione.</p>`))

  return new Response(JSON.stringify(data), {
    status: ok ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  })
})
