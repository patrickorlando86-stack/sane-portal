# Template email — Supabase Auth

Copie versionate dei template email di **Authentication → Email Templates** su Supabase.
Supabase **non tiene storico** di questi template: se ne modifichi uno per sbaglio non c'è undo.
Questa cartella è il backup. **Se modifichi un template su Supabase, aggiorna anche il file qui.**

## Mappa file → slot Supabase

| File | Slot Supabase | Usato dal portale? |
|------|---------------|--------------------|
| [confirm-signup.html](confirm-signup.html) | **Confirm signup** | ✅ Sì — inviata al `signUp` (registrazione biologo) |
| [reset-password.html](reset-password.html) | **Reset Password** | ✅ Sì — inviata al `resetPasswordForEmail` |
| [magic-link.html](magic-link.html) | **Magic Link** | ❌ No — il login usa email+password (`signInWithPassword`), il magic link non è mai innescato. Tenuto come rete di sicurezza brandizzata. |

## Come ripristinare un template
1. Supabase → Authentication → Email Templates → scegli lo slot
2. Incolla il contenuto del file corrispondente nel **Message body**
3. Salva

Variabili Supabase usate: `{{ .ConfirmationURL }}` (link di azione).
