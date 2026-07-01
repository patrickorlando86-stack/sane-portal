import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ADMIN_EMAIL = "patrick.orlando86@gmail.com"

serve(async (req) => {
  const body = await req.json()
  const email = body.email ?? body.record?.email
  const nome  = body.nome  ?? body.record?.nome ?? "Nuovo biologo"

  if (!email) {
    console.error('Missing email:', JSON.stringify(body))
    return new Response('missing email', { status: 400 })
  }

  const apiKey = Deno.env.get('RESEND_API_KEY')!

  // Invia entrambe le email in parallelo
  const [emailBiologo, emailAdmin] = await Promise.all([

    // 1. Email di benvenuto al biologo
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "S.A.N.E. Italia <onboarding@resend.dev>",
        to: [email],
        subject: "Registrazione S.A.N.E. Italia ricevuta",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f0f4f8;padding:32px 20px;">
            <div style="background:#0A2647;border-radius:16px;padding:28px;text-align:center;margin-bottom:20px;">
              <h1 style="color:white;font-size:22px;margin:0;">S.A.N.E. Italia</h1>
              <p style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:6px 0 0;">Portale Biologi Certificati</p>
            </div>
            <div style="background:white;border-radius:16px;padding:28px;">
              <h2 style="color:#0A2647;font-size:18px;margin:0 0 12px;">📋 Registrazione ricevuta</h2>
              <p style="color:#475569;font-size:14px;line-height:1.7;">
                Ciao ${nome},<br><br>
                Abbiamo ricevuto la tua richiesta di accesso al portale S.A.N.E. Italia.<br><br>
                Il tuo account è attualmente in <strong>fase di verifica</strong>. Riceverai una email di conferma non appena il tuo profilo sarà approvato dall'amministratore.
              </p>
              <div style="background:#f8fafc;border-radius:10px;padding:16px;margin:20px 0;border-left:4px solid #00A896;">
                <p style="color:#475569;font-size:13px;margin:0;line-height:1.6;">
                  ⏱ I tempi di approvazione sono solitamente di <strong>24-48 ore</strong> lavorative.
                </p>
              </div>
              <p style="color:#94a3b8;font-size:11px;text-align:center;margin:0;">Per informazioni: <a href="mailto:patrick.orlando@libero.it" style="color:#00A896;">patrick.orlando@libero.it</a></p>
            </div>
            <p style="color:#94a3b8;font-size:10px;text-align:center;margin-top:16px;">S.A.N.E. Italia · patrick.orlando@libero.it</p>
          </div>
        `
      })
    }),

    // 2. Notifica admin
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "S.A.N.E. Italia <onboarding@resend.dev>",
        to: [ADMIN_EMAIL],
        subject: `🆕 Nuova registrazione: ${nome}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f0f4f8;padding:32px 20px;">
            <div style="background:#0A2647;border-radius:16px;padding:28px;text-align:center;margin-bottom:20px;">
              <h1 style="color:white;font-size:22px;margin:0;">S.A.N.E. Admin</h1>
              <p style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:6px 0 0;">Notifica sistema</p>
            </div>
            <div style="background:white;border-radius:16px;padding:28px;">
              <h2 style="color:#0A2647;font-size:18px;margin:0 0 12px;">🆕 Nuovo biologo registrato</h2>
              <p style="color:#475569;font-size:14px;line-height:1.7;">
                Un nuovo biologo ha completato la registrazione al portale S.A.N.E. Italia e attende approvazione.
              </p>
              <div style="background:#f8fafc;border-radius:10px;padding:16px;margin:20px 0;">
                <p style="color:#475569;font-size:13px;margin:0 0 6px;"><strong>Nome:</strong> ${nome}</p>
                <p style="color:#475569;font-size:13px;margin:0;"><strong>Email:</strong> ${email}</p>
              </div>
              <a href="https://sane-italia.it/admin.html"
                 style="display:block;background:#00A896;color:white;text-decoration:none;text-align:center;padding:14px;border-radius:10px;font-weight:700;font-size:14px;margin:20px 0;">
                Vai al pannello Admin →
              </a>
            </div>
            <p style="color:#94a3b8;font-size:10px;text-align:center;margin-top:16px;">S.A.N.E. Italia · Sistema automatico</p>
          </div>
        `
      })
    })
  ])

  const [d1, d2] = await Promise.all([emailBiologo.json(), emailAdmin.json()])
  console.log('Email biologo:', JSON.stringify(d1))
  console.log('Email admin:', JSON.stringify(d2))

  return new Response(JSON.stringify({ biologo: d1, admin: d2 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
})
