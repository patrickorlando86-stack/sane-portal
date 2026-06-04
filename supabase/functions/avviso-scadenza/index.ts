import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (_req) => {
  const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
  const supabaseKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const resendApiKey = Deno.env.get('RESEND_API_KEY')!

  const db = createClient(supabaseUrl, supabaseKey)

  const oggi  = new Date()
  const date30 = new Date(oggi); date30.setDate(oggi.getDate() + 30)
  const date7  = new Date(oggi); date7.setDate(oggi.getDate() + 7)
  const target30 = date30.toISOString().split('T')[0]
  const target7  = date7.toISOString().split('T')[0]

  // Prendi biologi che scadono tra 30 o 7 giorni
  const { data: biologi, error } = await db
    .from('profiles')
    .select('id, nome, email, scadenza')
    .eq('stato', 'active')
    .in('scadenza', [target30, target7])

  if (error) {
    console.error('DB error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!biologi || biologi.length === 0) {
    console.log('Nessun biologo in scadenza oggi')
    return new Response('nessuno', { status: 200 })
  }

  console.log(`Invio avvisi a ${biologi.length} biolog${biologi.length === 1 ? 'o' : 'i'}`)

  const risultati = await Promise.all(biologi.map(async (b) => {
    const giorni = b.scadenza === target7 ? 7 : 30
    const urgente = giorni === 7
    const dataFormattata = new Date(b.scadenza).toLocaleDateString('it-IT', { day:'2-digit', month:'long', year:'numeric' })

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "S.A.N.E. Italia <onboarding@resend.dev>",
        to: [b.email],
        subject: urgente
          ? `⚠️ La tua licenza S.A.N.E. scade tra 7 giorni`
          : `La tua licenza S.A.N.E. scade tra 30 giorni`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f0f4f8;padding:32px 20px;">
            <div style="background:#0A2647;border-radius:16px;padding:28px;text-align:center;margin-bottom:20px;">
              <h1 style="color:white;font-size:22px;margin:0;">S.A.N.E. Italia</h1>
              <p style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:6px 0 0;">Portale Biologi Certificati</p>
            </div>
            <div style="background:white;border-radius:16px;padding:28px;">
              <h2 style="color:${urgente ? '#ef4444' : '#F4A261'};font-size:18px;margin:0 0 12px;">
                ${urgente ? '⚠️ Licenza in scadenza urgente' : '⏳ Licenza in scadenza'}
              </h2>
              <p style="color:#475569;font-size:14px;line-height:1.7;">
                Ciao ${b.nome || b.email},<br><br>
                La tua licenza S.A.N.E. Italia scadrà il <strong>${dataFormattata}</strong>
                (tra <strong style="color:${urgente ? '#ef4444' : '#F4A261'}">${giorni} giorni</strong>).<br><br>
                ${urgente
                  ? 'Questo è un <strong>ultimo promemoria</strong>. Dopo la scadenza non potrai più accedere al portale.'
                  : 'Per continuare ad accedere al portale è necessario rinnovare la licenza.'}
              </p>
              <a href="mailto:patrick.orlando@libero.it?subject=Rinnovo licenza SANE Italia"
                 style="display:block;background:${urgente ? '#ef4444' : '#F4A261'};color:white;text-decoration:none;text-align:center;padding:14px;border-radius:10px;font-weight:700;font-size:14px;margin:20px 0;">
                Contatta l'amministratore →
              </a>
              <p style="color:#94a3b8;font-size:11px;text-align:center;margin:0;">Se hai già rinnovato, ignora questa email.</p>
            </div>
            <p style="color:#94a3b8;font-size:10px;text-align:center;margin-top:16px;">S.A.N.E. Italia · patrick.orlando@libero.it</p>
          </div>
        `
      })
    })
    const data = await res.json()
    console.log(`[${giorni}gg] Email a ${b.email}:`, JSON.stringify(data))
    return { email: b.email, giorni, ok: res.ok }
  }))

  return new Response(JSON.stringify({ inviati: risultati.length, risultati }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
})
