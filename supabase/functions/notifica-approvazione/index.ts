import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const body = await req.json()

  // Supporta sia trigger SQL {email, nome} che webhook {record, old_record}
  const email = body.email ?? body.record?.email
  const nome  = body.nome  ?? body.record?.nome ?? email

  if (!email) {
    console.error('Missing email in body:', JSON.stringify(body))
    return new Response('missing email', { status: 400 })
  }

  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    console.error('RESEND_API_KEY not set')
    return new Response('missing api key', { status: 500 })
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "S.A.N.E. Italia <onboarding@resend.dev>",
      to: [email],
      subject: "Il tuo account S.A.N.E. Italia è stato attivato!",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f0f4f8;padding:32px 20px;">
          <div style="background:#0A2647;border-radius:16px;padding:28px;text-align:center;margin-bottom:20px;">
            <h1 style="color:white;font-size:22px;margin:0;">S.A.N.E. Italia</h1>
            <p style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:6px 0 0;">Portale Biologi Certificati</p>
          </div>
          <div style="background:white;border-radius:16px;padding:28px;">
            <h2 style="color:#0A2647;font-size:18px;margin:0 0 12px;">🎉 Account attivato!</h2>
            <p style="color:#475569;font-size:14px;line-height:1.7;">Ciao ${nome},<br><br>
            Il tuo account S.A.N.E. Italia è stato <strong>approvato e attivato</strong>. Puoi ora accedere al portale e iniziare a lavorare.</p>
            <a href="https://www.sane-italia.it/biologo.html"
               style="display:block;background:#00A896;color:white;text-decoration:none;text-align:center;padding:14px;border-radius:10px;font-weight:700;font-size:14px;margin:20px 0;">
              Accedi al Portale →
            </a>
            <p style="color:#94a3b8;font-size:11px;text-align:center;margin:0;">Usa la tua email e la password scelta in fase di registrazione.</p>
          </div>
          <p style="color:#94a3b8;font-size:10px;text-align:center;margin-top:16px;">S.A.N.E. Italia · patrick.orlando@libero.it</p>
        </div>
      `
    })
  })

  const data = await res.json()
  console.log('Resend response:', JSON.stringify(data))

  return new Response(JSON.stringify(data), {
    status: res.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' }
  })
})
