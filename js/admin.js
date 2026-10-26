/* Pannello admin (admin.html): tutta la logica della pagina.
   Era dentro l'HTML; sta qui per avere file più piccoli e la cache del browser.
   È uno script classico (non un modulo): funzioni e variabili restano globali,
   come prima, perché l'HTML le chiama dagli onclick. */
// ============================================================
// SUPABASE
// ============================================================
const SUPABASE_URL = 'https://hjfosliokfskftmoukxa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZm9zbGlva2Zza2Z0bW91a3hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDY3NTEsImV4cCI6MjA5MDYyMjc1MX0.eX9BL0tIy83zZ49hxzxFloH24hGIcbMRb2AsmCOiF9k';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { storageKey: 'sane-admin-session' } });
const FN_BASE = 'https://hjfosliokfskftmoukxa.supabase.co/functions/v1';
// Escape HTML: i dati inseriti dai biologi (nome, ordine, nomi scuole/classi…)
// finiscono in innerHTML nel pannello admin. Senza escape un biologo potrebbe
// iniettare <script>/<img onerror> ed eseguirlo nella sessione dell'admin (XSS).
function esc(v){ return String(v==null?'':v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
// Cella CSV sicura: neutralizza la formula-injection (prefissi = + - @ tab CR)
// anteponendo un apice, e applica il quoting CSV (raddoppia le virgolette).
function csvCell(v){ let s=String(v==null?'':v); if(/^[=+\-@\t\r]/.test(s)) s="'"+s; return '"'+s.replace(/"/g,'""')+'"'; }

// ============================================================
// STATO
// ============================================================
let adminState = { biologi: [], role: 'admin', regioneAdmin: null, nomeAdmin: '' };
let filtroAttivo = 'tutti';

// ============================================================
// AUTH
// ============================================================
function mostraResetPasswordAdmin(e){
    e.preventDefault();
    document.getElementById('loginFormAdmin').style.display='none';
    document.getElementById('resetPasswordScreenAdmin').style.display='block';
    const em = document.getElementById('loginEmail').value;
    if(em) document.getElementById('resetEmailAdmin').value = em;
}
function chiudiResetPasswordAdmin(e){
    e.preventDefault();
    document.getElementById('resetPasswordScreenAdmin').style.display='none';
    document.getElementById('loginFormAdmin').style.display='block';
}
async function inviaResetPasswordAdmin(){
    const email = document.getElementById('resetEmailAdmin').value.trim();
    if(!email){ document.getElementById('loginMsg').textContent='Inserisci la tua email'; return; }
    const btn = document.querySelector('#resetPasswordScreenAdmin button');
    btn.disabled = true; btn.textContent = 'Invio in corso...';
    const { error } = await db.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://sane-italia.it/reset-password.html'
    });
    if(error){
        btn.disabled = false; btn.textContent = 'Invia Link Reset';
        document.getElementById('resetPasswordScreenAdmin').innerHTML += `<p style="color:#ef4444;font-size:11px;text-align:center;margin-top:8px;">Errore: ${error.message}</p>`;
    } else {
        document.getElementById('resetPasswordScreenAdmin').innerHTML = `
            <div style="text-align:center;padding:10px 0;">
                <i class="fas fa-envelope-open-text" style="color:var(--accent);font-size:36px;margin-bottom:14px;display:block;"></i>
                <h3 style="color:white;font-family:'Syne',sans-serif;font-size:18px;font-weight:700;margin-bottom:8px;">Email inviata!</h3>
                <p style="color:rgba(255,255,255,0.5);font-size:12px;line-height:1.6;">Controlla la tua casella di posta e clicca il link per reimpostare la password.</p>
                <p style="margin-top:16px;"><a href="#" onclick="chiudiResetPasswordAdmin(event)" style="color:var(--accent);font-size:12px;font-weight:700;text-decoration:none;">← Torna al login</a></p>
            </div>`;
    }
}

async function doLogin(){
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPassword').value;
    const msg   = document.getElementById('loginMsg');
    if(!email){ msg.textContent='Inserisci la tua email'; return; }
    if(!pass){  msg.textContent='Inserisci la password';  return; }
    msg.textContent = 'Accesso in corso...';
    const { data, error } = await db.auth.signInWithPassword({ email, password: pass });
    if(error){ msg.textContent = 'Credenziali non valide'; return; }
    // onAuthStateChange gestirà il resto
}

function doLogout(){
    adminState = { biologi:[], role:'admin', regioneAdmin:null, nomeAdmin:'' };
    db.auth.signOut().then(()=>{ window.location.href='portale.html'; });
}

async function caricaDati(){
    const isRegionale = adminState.role === 'regional_admin';
    const regioneFiltro = isRegionale ? adminState.regioneAdmin : null;

    // Prova query con role2 (richiede ALTER TABLE), fallback a solo role=biologo/regional_admin
    let q1 = db.from('profiles').select('*')
        .or('role.eq.biologo,role.eq.regional_admin,role2.eq.biologo')
        .neq('stato','eliminato')
        .order('data_iscrizione',{ascending:false});
    if(regioneFiltro) q1 = q1.eq('regione', regioneFiltro);
    let profilesRes = await q1;
    if(profilesRes.error){
        // role2 non esiste ancora nel DB — usa query semplice
        let q2 = db.from('profiles').select('*')
            .in('role',['biologo','regional_admin'])
            .neq('stato','eliminato')
            .order('data_iscrizione',{ascending:false});
        if(regioneFiltro) q2 = q2.eq('regione', regioneFiltro);
        profilesRes = await q2;
    }
    const [scuoleRes, classiRes, pacchettiRes] = await Promise.all([
        db.from('scuole').select('biologo_id'),
        db.from('classi').select('biologo_id, score_pre, score_post, num_studenti'),
        db.from('pacchetti').select('biologo_id, ore_totali, prezzo')
    ]);
    const scuoleRaw    = scuoleRes.data;
    const classiRaw    = classiRes.data;
    const pacchettiRaw = pacchettiRes.data;
    // Diagnosi RLS: log se admin non riesce a leggere tutti i pacchetti
    if(pacchettiRes.error){
        console.warn('⚠️ RLS pacchetti:', pacchettiRes.error.message,
            '\n→ Supabase Dashboard → Table Editor → pacchetti → RLS Policies',
            '\n→ Aggiungi policy SELECT per ruolo admin: (auth.uid()=biologo_id) OR EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role=\'admin\')');
        showToast('⚠️ Dati pacchetti limitati — configura RLS su Supabase (vedi console)','error');
    }
    const profiles = profilesRes.data;
    adminState.biologi = (profiles||[]).map(p => {
        const sc  = (scuoleRaw||[]).filter(s=>s.biologo_id===p.id);
        const pk  = (pacchettiRaw||[]).filter(x=>x.biologo_id===p.id);
        const cl  = (classiRaw||[]).filter(c=>c.biologo_id===p.id);
        const clS = cl.filter(c=>c.score_pre&&c.score_post);
        const mig = clS.length>0
            ? Math.round((clS.reduce((a,c)=>a+(parseFloat(c.score_post)-parseFloat(c.score_pre)),0)/clS.length)*10)/10
            : null;
        const studenti = cl.reduce((a,c)=>a+(c.num_studenti||0),0);
        const oreContratte = pk.reduce((a,x)=>a+(x.ore_totali||0),0);
        const valoreContratto = pk.reduce((a,x)=>a+(x.prezzo||0),0);
        return { id:p.id, nome:p.nome||p.email, email:p.email, regione:p.regione||'—',
                 ordine:p.ordine||'—', stato:p.stato, scadenza:p.scadenza,
                 dataIscrizione:p.data_iscrizione,
                 scuole:sc.length, pacchetti:pk.length, classi:cl.length,
                 studenti, miglioramento:mig,
                 oreContratte, valoreContratto,
                 ruolo: p.role || 'biologo',
                 isAdmin: p.role==='admin' };
    });
}

async function inizializzaApp(){
    await caricaDati();
    await verificaScadenzeAuto();
    document.getElementById('dashDate').textContent = new Date().toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    adattaInterfaccia();
    aggiornaDashboard();
    popolaFiltroRegioni();
}

function adattaInterfaccia(){
    const isRegionale = adminState.role === 'regional_admin';

    // Aggiorna sidebar nome e ruolo
    const nomeEl = document.getElementById('sidebarAdminNome');
    const ruoloEl = document.getElementById('sidebarAdminRuolo');
    if(nomeEl) nomeEl.textContent = adminState.nomeAdmin || 'Admin';
    if(ruoloEl) ruoloEl.textContent = isRegionale
        ? 'Admin ' + (adminState.regioneAdmin || 'Regionale')
        : 'Amministratore';

    if(!isRegionale) return; // Super admin: nessuna restrizione

    // Nascondi sezioni riservate al super admin
    const navNaz = document.getElementById('navNazionale');
    const navLog = document.getElementById('navLog');
    const navCod = document.getElementById('navCodici');
    if(navNaz) navNaz.style.display = 'none';
    if(navLog) navLog.style.display = 'none';
    if(navCod) navCod.style.display = 'none';

    // Nascondi pulsante aggiungi biologo
    const btnAdd = document.getElementById('btnAggiungiBiologo');
    if(btnAdd) btnAdd.style.display = 'none';

    // Titolo dashboard
    const titolo = document.getElementById('dashTitolo');
    if(titolo) titolo.textContent = 'Panoramica — ' + (adminState.regioneAdmin || 'Regione');

    // Banner regione in dashboard
    const dashDate = document.getElementById('dashDate');
    if(dashDate) dashDate.insertAdjacentHTML('afterend',
        `<span style="display:inline-flex;align-items:center;gap:5px;background:#d1fae5;color:#065f46;font-size:10px;font-weight:700;padding:3px 10px;border-radius:99px;text-transform:uppercase;letter-spacing:0.08em;margin-top:6px;">
            <i class="fas fa-map-marker-alt"></i> ${esc(adminState.regioneAdmin)}
        </span>`);

    // Lock filtro regione nella sezione licenze
    const sel = document.getElementById('filtroRegione');
    if(sel){
        sel.value = adminState.regioneAdmin || '';
        sel.disabled = true;
        sel.style.opacity = '0.6';
        sel.style.cursor = 'not-allowed';
    }
    _mappaRegioneSelezionata = adminState.regioneAdmin;
}

// ============================================================
// NAVIGAZIONE
// ============================================================
function showSection(id, el){
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    document.getElementById('sec-'+id).classList.add('active');
    if(el) el.classList.add('active');
    if(id==='dashboard') aggiornaDashboard();
    if(id==='licenze'){ aggiornaLicenze(); renderMappa(); }
    if(id==='nazionale') aggiornaNazionale();
    if(id==='autovalutazioni') aggiornaAdminAutovalutazioni();
    if(id==='codici') caricaCodici();
}

// ============================================================
// CODICI DI ACCESSO (sblocco manuale)
// ============================================================
let _codiciCache = [];

function _generaStringaCodice(){
    const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 simboli, niente 0/O/1/I ambigui
    // crypto invece di Math.random: codici imprevedibili (256 % 32 == 0 → nessun bias)
    const blk=()=>{ const a=new Uint8Array(4); crypto.getRandomValues(a); return Array.from(a,b=>chars[b%chars.length]).join(''); };
    return 'SANE-'+blk()+'-'+blk();
}

async function generaCodice(){
    const scadenza = document.getElementById('codiceScadenza').value;
    const etichetta = document.getElementById('codiceEtichetta').value.trim();
    if(!scadenza){ showToast('Imposta una data di scadenza','error'); return; }
    if(scadenza < new Date().toISOString().split('T')[0]){ showToast('La scadenza è nel passato','error'); return; }
    const codice = _generaStringaCodice();
    const { error } = await db.from('codici_accesso').insert({ codice, scadenza, etichetta: etichetta||null });
    if(error){ showToast('Errore: '+error.message,'error'); return; }
    document.getElementById('codiceEtichetta').value='';
    showToast('Codice generato ✓');
    await caricaCodici();
    // Copia automatica negli appunti + evidenzia
    try{ await navigator.clipboard.writeText(codice); showToast('Codice '+codice+' copiato negli appunti ✓'); }catch(e){}
}

async function caricaCodici(){
    const { data, error } = await db.from('codici_accesso').select('*').order('created_at',{ascending:false});
    if(error){ document.getElementById('codiciTabella').innerHTML='<p style="text-align:center;color:#dc2626;padding:40px;font-size:13px;">Errore: '+error.message+'</p>'; return; }
    _codiciCache = data||[];
    renderCodici();
}

async function copiaCodice(codice){
    try{ await navigator.clipboard.writeText(codice); showToast('Copiato: '+codice); }
    catch(e){ showToast('Copia non riuscita','error'); }
}

async function toggleCodice(id, attivo){
    const { error } = await db.from('codici_accesso').update({ attivo:!attivo }).eq('id',id);
    if(error){ showToast('Errore: '+error.message,'error'); return; }
    const c=_codiciCache.find(x=>x.id===id); if(c) c.attivo=!attivo;
    renderCodici();
    showToast(!attivo?'Codice riattivato':'Codice disattivato');
}

function _nomeDaId(uid){
    const b=(adminState.biologi||[]).find(x=>x.id===uid);
    return b ? (b.nome||b.email||uid.slice(0,8)) : uid.slice(0,8)+'…';
}

function renderCodici(){
    const el=document.getElementById('codiciTabella');
    if(!_codiciCache.length){ el.innerHTML='<p style="text-align:center;color:#94a3b8;padding:40px;font-size:13px;">Nessun codice generato. Creane uno qui sopra.</p>'; return; }
    const oggi=new Date().toISOString().split('T')[0];
    const righe=_codiciCache.map(c=>{
        const scaduto = c.scadenza < oggi;
        let stato, col, bg;
        if(c.usato_da){ stato='Usato'; col='#6b7280'; bg='#f1f5f9'; }
        else if(!c.attivo){ stato='Disattivato'; col='#6b7280'; bg='#f1f5f9'; }
        else if(scaduto){ stato='Scaduto'; col='#dc2626'; bg='#fee2e2'; }
        else { stato='Disponibile'; col='#16a34a'; bg='#dcfce7'; }
        const scadFmt=c.scadenza?new Date(c.scadenza).toLocaleDateString('it-IT'):'—';
        const usato = c.usato_da
            ? _nomeDaId(c.usato_da)+(c.usato_il?' · '+new Date(c.usato_il).toLocaleDateString('it-IT'):'')
            : '—';
        return `<tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:12px 16px;"><span style="font-family:monospace;font-weight:700;color:var(--dark);font-size:13px;">${c.codice}</span>
                <button onclick="copiaCodice('${c.codice}')" title="Copia" style="background:none;border:none;cursor:pointer;color:#94a3b8;margin-left:6px;"><i class="fas fa-copy"></i></button></td>
            <td style="padding:12px 16px;font-size:12px;color:#475569;">${esc(c.etichetta||'—')}</td>
            <td style="padding:12px 16px;font-size:12px;color:${scaduto?'#dc2626':'#475569'};">${scadFmt}</td>
            <td style="padding:12px 16px;"><span style="background:${bg};color:${col};border-radius:7px;padding:2px 10px;font-size:11px;font-weight:700;">${stato}</span></td>
            <td style="padding:12px 16px;font-size:12px;color:#475569;">${usato}</td>
            <td style="padding:12px 16px;text-align:right;">${c.usato_da?'':`<button onclick="toggleCodice('${c.id}',${c.attivo})" style="background:#f1f5f9;border:none;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:600;color:#64748b;cursor:pointer;">${c.attivo?'Disattiva':'Riattiva'}</button>`}</td>
        </tr>`;
    }).join('');
    el.innerHTML=`<table style="width:100%;border-collapse:collapse;min-width:640px;">
        <thead><tr style="background:#f8fafc;text-align:left;">
            <th style="padding:12px 16px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Codice</th>
            <th style="padding:12px 16px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Etichetta</th>
            <th style="padding:12px 16px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Scadenza</th>
            <th style="padding:12px 16px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Stato</th>
            <th style="padding:12px 16px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Usato da</th>
            <th style="padding:12px 16px;"></th>
        </tr></thead><tbody>${righe}</tbody></table>`;
}

// ============================================================
// DASHBOARD
// ============================================================
function aggiornaDashboard(){
    const b = adminState.biologi;
    const attive    = b.filter(x=>x.stato==='active').length;
    const pending   = b.filter(x=>x.stato==='pending').length;
    const scadute   = b.filter(x=>x.stato==='expired').length;
    const sospese   = b.filter(x=>x.stato==='suspended').length;

    document.getElementById('kpiAttive').textContent    = attive;
    document.getElementById('kpiPending').textContent   = pending;
    document.getElementById('kpiScadute').textContent   = scadute;
    document.getElementById('kpiTotali').textContent    = b.length;

    // KPI nazionali (solo biologi attivi)
    const bAttivi = b.filter(x=>x.stato==='active');
    const totScuole   = bAttivi.reduce((a,x)=>a+(x.scuole||0),0);
    const totClassi   = bAttivi.reduce((a,x)=>a+(x.classi||0),0);
    const conMig = bAttivi.filter(x=>x.miglioramento);
    const mediaMig = conMig.length>0 ? (conMig.reduce((a,x)=>a+x.miglioramento,0)/conMig.length).toFixed(1) : '—';

    document.getElementById('kpiScuoleNaz').textContent    = totScuole;
    document.getElementById('kpiSessioniNaz').textContent  = totClassi;
    document.getElementById('kpiMiglioramentoNaz').textContent = conMig.length>0 ? '+'+mediaMig : '—';

    // Licenze in scadenza (30 giorni)
    const oggi = new Date();
    const tra30 = new Date(); tra30.setDate(oggi.getDate()+30);
    const inScadenza = b.filter(x=>x.stato==='active'&&x.scadenza&&new Date(x.scadenza)<=tra30&&new Date(x.scadenza)>=oggi);
    const elSc = document.getElementById('licenzeScadenza');
    if(inScadenza.length===0){
        elSc.innerHTML='<p style="color:#94a3b8;font-size:13px;text-align:center;padding:16px;">Nessuna licenza in scadenza nei prossimi 30 giorni 👍</p>';
    } else {
        elSc.innerHTML = inScadenza.map(x=>{
            const giorni = Math.ceil((new Date(x.scadenza)-oggi)/(1000*60*60*24));
            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9;gap:8px;">
                <div style="min-width:0;">
                    <div style="font-weight:700;font-size:13px;color:var(--dark);">${esc(x.nome)}</div>
                    <div style="font-size:11px;color:#94a3b8;">${esc(x.regione)}</div>
                </div>
                <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                    <span style="background:#fef3c7;color:#92400e;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;">tra ${giorni}gg</span>
                    <a href="${esc(buildMailtoPromemoria(x.email,x.nome,x.scadenza))}" class="btn-warn" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px;padding:5px 10px;font-size:11px;"><i class="fas fa-envelope"></i> Promemoria</a>
                </div>
            </div>`;
        }).join('');
    }

    // In attesa
    const elP = document.getElementById('biologiPending');
    const pendingList = b.filter(x=>x.stato==='pending');
    if(pendingList.length===0){
        elP.innerHTML='<p style="color:#94a3b8;font-size:13px;text-align:center;padding:16px;">Nessuna richiesta in attesa ✓</p>';
    } else {
        elP.innerHTML = pendingList.map(x=>`
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9;">
                <div>
                    <div style="font-weight:700;font-size:13px;color:var(--dark);">${esc(x.nome)}</div>
                    <div style="font-size:11px;color:#94a3b8;">${esc(x.regione)} · ${x.dataIscrizione}</div>
                </div>
                <div style="display:flex;gap:6px;">
                    <button class="btn-success" data-id="${x.id}" data-action="active" onclick="handleStatoBtn(this)"><i class="fas fa-check"></i></button>
                    <button class="btn-danger" data-id="${x.id}" data-action="suspended" onclick="handleStatoBtn(this)"><i class="fas fa-times"></i></button>
                </div>
            </div>`).join('');
    }

    // Pronti per attestato
    aggiornaProntiAttestatoDashboard();

    renderMappa();
}


// ============================================================
// MAPPA GEOGRAFICA
// ============================================================
const SVG_ID_TO_REGIONE = {
    'IT-21':'Piemonte','IT-23':"Valle d'Aosta",'IT-25':'Lombardia',
    'IT-32':'Trentino-Alto Adige','IT-34':'Veneto','IT-36':'Friuli-Venezia Giulia',
    'IT-42':'Liguria','IT-45':'Emilia-Romagna','IT-52':'Toscana',
    'IT-55':'Umbria','IT-57':'Marche','IT-62':'Lazio','IT_65':'Abruzzo',
    'IT-67':'Molise','IT-72':'Campania','IT-75':'Puglia','IT-77':'Basilicata',
    'IT-78':'Calabria','IT-82':'Sicilia','IT-88':'Sardegna'
};

let _mappaRegioneSelezionata = null;

function renderMappa(){
    const tooltip = document.getElementById('mappaTooltip');
    const regionList = document.getElementById('mappaRegionList');
    if(!tooltip || !regionList) return;

    const counts = {};
    const names = {};
    (adminState.biologi||[]).filter(b=>b.stato==='active').forEach(b=>{
        const r = b.regione||'\u2014';
        if(r==='\u2014') return;
        counts[r] = (counts[r]||0) + 1;
        if(!names[r]) names[r] = [];
        names[r].push(b.nome);
    });

    const paths = document.querySelectorAll('#mappaContainer svg path');
    paths.forEach(path=>{
        const svgId = path.getAttribute('id');
        const regione = SVG_ID_TO_REGIONE[svgId];
        const count = regione ? (counts[regione]||0) : 0;
        let fill = '#e2e8f0';
        if(count===1) fill='#b2dfdb';
        else if(count===2) fill='#4db6ac';
        else if(count>=3) fill='#00A896';
        path.style.fill = fill;

        const isSelected = regione && regione === _mappaRegioneSelezionata;
        path.style.stroke = isSelected ? '#0A2647' : 'white';
        path.style.strokeWidth = isSelected ? '2.5' : '1';

        path.onmouseenter = function(e){
            if(!regione) return;
            const c = counts[regione]||0;
            tooltip.innerHTML = '<b>'+regione+'</b>'+(c>0?'<br>'+c+' biologo'+(c!==1?'gi':'')+' attivo'+(c!==1?'i':''):'<br><span style="opacity:0.6;">Nessun biologo</span>');
            tooltip.style.display='block';
        };
        path.onmousemove = function(e){
            tooltip.style.left=(e.clientX+14)+'px';
            tooltip.style.top=(e.clientY-10)+'px';
        };
        path.onmouseleave = function(){
            tooltip.style.display='none';
        };
        path.onclick = function(){
            if(!regione) return;
            if(_mappaRegioneSelezionata===regione){
                resetMappaFiltro();
            } else {
                _mappaRegioneSelezionata = regione;
                const sel = document.getElementById('filtroRegione');
                if(sel){ sel.value = regione; }
                const resetBtn = document.getElementById('mappaResetBtn');
                if(resetBtn) resetBtn.style.display='inline-block';
                renderMappa();
                aggiornaLicenze();
            }
        };
    });

    // Region list
    const all = Object.values(SVG_ID_TO_REGIONE);
    const withBio = all.filter(r=>(counts[r]||0)>0).sort((a,b)=>(counts[b]||0)-(counts[a]||0));
    if(withBio.length===0){
        regionList.innerHTML='<p style="color:#94a3b8;font-size:11px;">Nessun biologo attivo con regione.</p>';
        return;
    }
    const maxCount = Math.max(...withBio.map(r=>counts[r]||0));
    regionList.innerHTML = withBio.map(r=>{
        const c = counts[r]||0;
        const pct = Math.max(8, Math.round(c/maxCount*100));
        const col = c>=3?'#00A896':c===2?'#4db6ac':'#b2dfdb';
        const isSel = r===_mappaRegioneSelezionata;
        return `<div onclick="(function(){var sel=document.getElementById('filtroRegione');if(sel)sel.value='`+r+`';_mappaRegioneSelezionata='`+r+`';document.getElementById('mappaResetBtn').style.display='inline-block';renderMappa();aggiornaLicenze();})()" style="margin-bottom:7px;cursor:pointer;padding:3px 6px;border-radius:5px;background:${isSel?'#f0fdf9':'transparent'};">
            <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
                <span style="font-weight:${isSel?'700':'600'};color:${isSel?'var(--teal)':'#334155'};">${r}</span>
                <span style="font-weight:700;color:${col};">${c}</span>
            </div>
            <div style="background:#f1f5f9;border-radius:99px;height:4px;">
                <div style="width:${pct}%;height:100%;background:${col};border-radius:99px;"></div>
            </div>
        </div>`;
    }).join('');
}

function resetMappaFiltro(){
    // Admin regionale non può deselezionare la sua regione
    if(adminState.role === 'regional_admin') return;
    _mappaRegioneSelezionata = null;
    const sel = document.getElementById('filtroRegione');
    if(sel) sel.value = '';
    const resetBtn = document.getElementById('mappaResetBtn');
    if(resetBtn) resetBtn.style.display='none';
    renderMappa();
    aggiornaLicenze();
}

// ============================================================
// LICENZE
// ============================================================
let filtroCorrente = 'tutti';

function filtraLicenze(filtro){
    filtroCorrente = filtro;
    document.querySelectorAll('[id^=filtro-]').forEach(b=>{
        b.style.background='#f1f5f9'; b.style.color='#64748b';
    });
    const btn = document.getElementById('filtro-'+filtro);
    if(btn){ btn.style.background='var(--dark)'; btn.style.color='white'; }
    aggiornaLicenze();
}

function buildMailtoPromemoria(email, nome, scadenza){
    const dataFmt = new Date(scadenza).toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'});
    const oggetto = encodeURIComponent(`Rinnovo licenza S.A.N.E. Italia — scadenza ${dataFmt}`);
    const corpo = encodeURIComponent(
        `Gentile ${nome},\n\nla tua licenza per il Portale Biologi S.A.N.E. Italia scadrà il ${dataFmt}.\n\nPer rinnovare la tua licenza e continuare ad accedere al portale, ti invitiamo a contattarci rispondendo a questa email.\n\nGrazie per il tuo impegno nel programma S.A.N.E. Italia.\n\nIl team S.A.N.E. Italia\ninfo@sane-italia.it`
    );
    return `mailto:${email}?subject=${oggetto}&body=${corpo}`;
}

function popolaFiltroRegioni(){
    const sel = document.getElementById('filtroRegione');
    if(!sel) return;
    const regioni = [...new Set(adminState.biologi.map(b=>b.regione).filter(r=>r&&r!=='—'))].sort();
    const current = sel.value;
    sel.innerHTML = '<option value="">Tutte le regioni</option>' + regioni.map(r=>`<option value="${r}"${r===current?' selected':''}>${r}</option>`).join('');
}

async function aggiornaProntiAttestatoDashboard(){
    const wrap = document.getElementById('cardProntiAttestatoWrap');
    const list = document.getElementById('prontiAttestatoList');
    if(!wrap || !list) return;

    const biologiIds = adminState.biologi.filter(b=>b.stato==='active'&&b.classi>0).map(b=>b.id);

    const [{ data: classiAll }, { data: pacchettiAll }] = await Promise.all([
        db.from('classi').select('biologo_id,pacchetto_id,score_pre,score_post,m1_ore,m2_ore,m3_ore,m4_ore,m5_ore,m6_ore,m1_data,m2_data,m3_data,m4_data,m5_data,m6_data').in('biologo_id', biologiIds),
        db.from('pacchetti').select('id,biologo_id,ore_totali').in('biologo_id', biologiIds)
    ]);

    if(!classiAll) return;

    const pronti = adminState.biologi.filter(b => {
        if(b.stato !== 'active' || b.classi === 0) return false;
        const cl = classiAll.filter(c => c.biologo_id === b.id);
        if(cl.length === 0) return false;
        return cl.every(c => c.score_pre && c.score_post);
    });

    if(pronti.length === 0){ wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';

    list.innerHTML = pronti.map(b => {
        const cl = classiAll.filter(c => c.biologo_id === b.id);
        const pk = (pacchettiAll||[]).filter(p => p.biologo_id === b.id);
        const oreWarning = cl.some(c => {
            const modDone = ['m1','m2','m3','m4','m5','m6'].every(m=>c[m+'_data']);
            if(!modDone) return false;
            const oreClasse = ['m1','m2','m3','m4','m5','m6'].reduce((a,m)=>a+(parseFloat(c[m+'_ore'])||0),0);
            const pacchetto = pk.find(p=>p.id===c.pacchetto_id);
            const oreTot = pacchetto?(pacchetto.ore_totali||0):0;
            return oreTot>0 && oreClasse<oreTot;
        });
        return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9;gap:8px;">
            <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:36px;height:36px;border-radius:10px;background:#d1fae5;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:700;color:#065f46;font-size:14px;">${b.nome.charAt(0)}</div>
                <div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="font-weight:700;font-size:13px;color:var(--dark);">${esc(b.nome)}</span>
                        ${oreWarning?'<span title="Alcune classi hanno ore rendicontate inferiori al pacchetto" style="background:#fef3c7;color:#92400e;font-size:9px;font-weight:700;padding:2px 7px;border-radius:99px;cursor:default;">⚠️ Ore incomplete</span>':''}
                    </div>
                    <div style="font-size:11px;color:#94a3b8;">${esc(b.regione)} · ${b.classi} class${b.classi===1?'e':'i'} · ${b.studenti} studenti</div>
                </div>
            </div>
            <button onclick="mostraDettaglioBiologo('${b.id}')" style="background:#d1fae5;border:none;border-radius:8px;padding:6px 14px;font-size:11px;font-weight:700;color:#065f46;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:5px;">
                <i class="fas fa-certificate"></i> Genera Attestati
            </button>
        </div>`;
    }).join('');
}

function aggiornaLicenze(){
    const list = document.getElementById('biologiList');
    let biologi = adminState.biologi;

    // Admin regionale: forza sempre la sua regione
    if(adminState.role === 'regional_admin' && adminState.regioneAdmin){
        biologi = biologi.filter(b=>b.regione===adminState.regioneAdmin);
        // Re-lock il select nel caso fosse stato resettato
        const sel = document.getElementById('filtroRegione');
        if(sel && sel.value !== adminState.regioneAdmin){ sel.value = adminState.regioneAdmin; }
    }

    // Filtro stato
    if(filtroCorrente !== 'tutti') biologi = biologi.filter(b=>b.stato===filtroCorrente);

    // Filtro ricerca testo
    const query = (document.getElementById('searchBiologi')?.value||'').toLowerCase().trim();
    if(query) biologi = biologi.filter(b=>(b.nome||'').toLowerCase().includes(query)||(b.email||'').toLowerCase().includes(query));

    // Filtro regione (solo super admin — l'admin regionale è già filtrato sopra)
    if(adminState.role === 'admin'){
        const regione = document.getElementById('filtroRegione')?.value||'';
        if(regione){
            biologi = biologi.filter(b=>b.regione===regione);
            if(_mappaRegioneSelezionata !== regione){ _mappaRegioneSelezionata = regione; renderMappa(); }
        } else {
            if(_mappaRegioneSelezionata){ _mappaRegioneSelezionata = null; renderMappa(); }
        }
    }

    // Contatore
    const counter = document.getElementById('biologiCounter');
    if(counter){
        const tot = adminState.biologi.length;
        const vis = biologi.length;
        counter.textContent = vis === tot ? `${tot} biolog${tot===1?'o':'i'}` : `${vis} di ${tot} biolog${tot===1?'o':'i'}`;
    }

    if(biologi.length===0){
        list.innerHTML='<p style="color:#94a3b8;font-size:13px;text-align:center;padding:40px;">Nessun biologo trovato.</p>';
        return;
    }

    const colors = ['#00A896','#0A2647','#F4A261','#8b5cf6','#3b82f6','#ec4899'];
    list.innerHTML = biologi.map((b,i)=>{
        const color = colors[i % colors.length];
        const badge = badgeHtml(b.stato);
        const scad = b.scadenza ? new Date(b.scadenza).toLocaleDateString('it-IT') : '—';
        const iscr = b.dataIscrizione ? new Date(b.dataIscrizione).toLocaleDateString('it-IT') : '—';
        const scadColor = b.scadenza && new Date(b.scadenza) < new Date() ? '#dc2626' : 'var(--dark)';
        const valFmt = b.valoreContratto>0 ? '€'+b.valoreContratto.toLocaleString('it-IT') : '—';
        return `<div class="bio-row">
            <div class="bio-avatar" style="background:${color};">${b.nome.charAt(0)}</div>
            <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:7px;">
                    <span style="font-weight:700;font-size:14px;color:var(--dark);">${esc(b.nome)}</span>
                    ${b.isAdmin?'<span style="font-size:9px;font-weight:700;background:#0A2647;color:white;padding:2px 7px;border-radius:5px;letter-spacing:0.06em;">ADMIN</span>':''}
                    ${b.ruolo==='regional_admin'?'<span style="font-size:9px;font-weight:700;background:#7c3aed;color:white;padding:2px 7px;border-radius:5px;letter-spacing:0.06em;"><i class="fas fa-star" style="font-size:8px;margin-right:3px;"></i>RESP. REG.</span>':''}
                </div>
                <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${esc(b.email)} · ${esc(b.regione)}</div>
                <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
                    ${badge}
                    <span style="font-size:10px;color:#94a3b8;background:#f8fafc;padding:2px 8px;border-radius:6px;">${b.scuole} scuol${b.scuole===1?'a':'e'}</span>
                    <span style="font-size:10px;color:#94a3b8;background:#f8fafc;padding:2px 8px;border-radius:6px;">${b.pacchetti} pacchet${b.pacchetti===1?'to':'ti'}</span>
                    <span style="font-size:10px;color:#94a3b8;background:#f8fafc;padding:2px 8px;border-radius:6px;">${b.classi} class${b.classi===1?'e':'i'}</span>
                    ${b.studenti>0 ? `<span style="font-size:10px;color:#64748b;background:#f8fafc;padding:2px 8px;border-radius:6px;">${b.studenti} studenti</span>` : ''}
                    ${b.miglioramento ? `<span style="font-size:10px;color:#065f46;background:#d1fae5;padding:2px 8px;border-radius:6px;">+${b.miglioramento} mig.</span>` : ''}
                </div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
                <div style="font-size:10px;color:#94a3b8;margin-bottom:2px;">Iscrizione</div>
                <div style="font-size:12px;color:var(--dark);margin-bottom:8px;">${iscr}</div>
                <div style="font-size:10px;color:#94a3b8;margin-bottom:2px;">Scadenza</div>
                <div style="font-weight:700;font-size:13px;color:${scadColor};margin-bottom:10px;">${scad}</div>
                <div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap;">
                    <button onclick="mostraDettaglioBiologo('${b.id}')" style="background:#f0fdf9;border:1.5px solid var(--teal);color:var(--teal);border-radius:8px;font-size:11px;font-weight:700;padding:6px 12px;cursor:pointer;display:flex;align-items:center;gap:5px;"><i class="fas fa-eye"></i> Dettaglio</button>
                    ${b.stato==='pending' ? `<button class="btn-success" data-id="${b.id}" data-action="active" onclick="handleStatoBtn(this)"><i class="fas fa-check" style="margin-right:4px;"></i>Approva</button>` : ''}
                    ${adminState.role!=='regional_admin' && b.stato==='active' ? `<button class="btn-warn" data-id="${b.id}" data-action="rinnova" onclick="handleStatoBtn(this)"><i class="fas fa-redo" style="margin-right:4px;"></i>Rinnova</button>` : ''}
                    ${(b.stato==='active'&&b.scadenza&&new Date(b.scadenza)<=new Date(Date.now()+30*864e5)&&new Date(b.scadenza)>=new Date()) ? '<a href="'+esc(buildMailtoPromemoria(b.email,b.nome,b.scadenza))+'" class="btn-warn" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px;"><i class="fas fa-envelope"></i> Promemoria</a>' : ''}
                    ${(b.stato==='active'||b.stato==='pending') ? `<button class="btn-danger" data-id="${b.id}" data-action="suspended" onclick="handleStatoBtn(this)"><i class="fas fa-ban" style="margin-right:4px;"></i>Sospendi</button>` : ''}
                    ${(b.stato==='suspended'||b.stato==='expired') ? `<button class="btn-success" data-id="${b.id}" data-action="active" onclick="handleStatoBtn(this)"><i class="fas fa-check" style="margin-right:4px;"></i>Riattiva</button>` : ''}
                    ${adminState.role!=='regional_admin' ? `<button class="btn-ghost" data-id="${b.id}" data-action="elimina" onclick="handleStatoBtn(this)" style="font-size:10px;padding:7px 10px;" title="Elimina"><i class="fas fa-trash"></i></button>` : ''}
                    ${adminState.role==='admin' && b.ruolo==='biologo' ? `<button onclick="nominaResponsabile('${b.id}')" style="background:#f5f3ff;border:none;border-radius:8px;font-size:11px;font-weight:700;color:#7c3aed;padding:6px 12px;cursor:pointer;display:flex;align-items:center;gap:4px;" title="Nomina Responsabile Regionale"><i class="fas fa-star"></i> Nomina Resp.</button>` : ''}
                    ${adminState.role==='admin' && b.ruolo==='regional_admin' ? `<button onclick="rimuoviResponsabile('${b.id}')" style="background:#fdf4ff;border:1.5px solid #d8b4fe;border-radius:8px;font-size:11px;font-weight:700;color:#7c3aed;padding:6px 12px;cursor:pointer;display:flex;align-items:center;gap:4px;" title="Rimuovi ruolo Responsabile Regionale"><i class="fas fa-star-half-alt"></i> Rimuovi Ruolo</button>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
}

async function mostraDettaglioBiologo(id){
    const b = adminState.biologi.find(x=>x.id===id);
    if(!b) return;
    const box = document.getElementById('dettaglioBiologoContent');
    box.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8;"><i class="fas fa-spinner fa-spin" style="font-size:24px;"></i><p style="margin-top:12px;font-size:13px;">Caricamento dati...</p></div>`;
    document.getElementById('dettaglioBiologoModal').classList.add('open');

    const [scuoleRes, classiRes, pacchettiRes] = await Promise.all([
        db.from('scuole').select('*').eq('biologo_id', id),
        db.from('classi').select('*').eq('biologo_id', id),
        db.from('pacchetti').select('id,scuola_id,tipo,prezzo,ore_totali,anno_scolastico,created_at').eq('biologo_id', id)
    ]);

    const scuole = scuoleRes.data || [];
    const classi = classiRes.data || [];
    const pacchetti = pacchettiRes.data || [];

    // Cache per generaAttestato
    adminState._dettaglioCache = { biologo: b, scuole, classi, pacchetti };

    // Log accesso admin
    if(adminState.currentUserId){
        db.from('admin_access_log').insert({
            admin_id: adminState.currentUserId,
            biologo_id: id,
            biologo_nome: b.nome,
            azione: 'visualizza_dettaglio'
        }).then(({error})=>{ if(error) console.warn('Log accesso non registrato:', error.message); });
    }

    // KPI
    const totStudenti = classi.reduce((a,c)=>a+(c.num_studenti||0),0);
    const classiConMig = classi.filter(c=>c.score_pre!=null&&c.score_post!=null);
    const migMedia = classiConMig.length>0
        ? (classiConMig.reduce((a,c)=>a+(parseFloat(c.score_post)-parseFloat(c.score_pre)),0)/classiConMig.length).toFixed(1)
        : null;

    const scad = b.scadenza ? new Date(b.scadenza).toLocaleDateString('it-IT') : '—';
    const iscr = b.dataIscrizione ? new Date(b.dataIscrizione).toLocaleDateString('it-IT') : '—';
    const statoCol = {active:'#16a34a',pending:'#d97706',expired:'#dc2626',suspended:'#6b7280'}[b.stato]||'#6b7280';
    const statoLabel = {active:'Attiva',pending:'In Attesa',expired:'Scaduta',suspended:'Sospesa'}[b.stato]||b.stato;

    // Calcola codice pacchetto identico a biologo.html
    function annoIniziale(anno){
        if(!anno) return null;
        return String(anno).replace('/','-').split('-')[0];
    }
    function codicePacket(p, s, allPacchetti){
        const skip=new Set(['IC','ISTITUTO','COMPRENSIVO','STATALE','SCUOLA','PRIMARIA','MEDIA','SECONDARIA','DI','DEL','DELLA','PRIMO','SECONDO','GRADO','E','CON','SMS','ICS','IPSSAR','ITCG','ITIS','IPSIA']);
        const parole=(s?.nome||'???').toUpperCase().split(/\s+/).filter(w=>!skip.has(w));
        const scuolaCode=esc((parole[0]||'???').substring(0,8));
        const anno=String(p.anno_scolastico||'').replace('/','-');
        const annoEnd=(anno.split('-')[1]||'').slice(-2)||'??';
        const stessi=(allPacchetti||[])
            .filter(x=>x.scuola_id===p.scuola_id && annoIniziale(x.anno_scolastico)===annoIniziale(p.anno_scolastico))
            .sort((a,b)=>new Date(a.created_at||0)-new Date(b.created_at||0));
        const seq=String(stessi.findIndex(x=>x.id===p.id)+1).padStart(2,'0');
        return `${scuolaCode}-${annoEnd}-${seq}`;
    }

    // Badge pacchetti individuali per scuola
    function pkBadgeScuola(scuolaId, s){
        const pk = pacchetti.filter(p=>p.scuola_id===scuolaId);
        if(pk.length===0) return '';
        return pk.map(p=>{
            const isGratuito = p.prezzo===0||p.prezzo==null;
            const tipoColor = isGratuito ? 'background:#dcfce7;color:#16a34a;' : 'background:#dbeafe;color:#1e40af;';
            const codice = codicePacket(p, s, pacchetti);
            return `<span style="${tipoColor}border-radius:8px;padding:3px 10px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:5px;">
                ${isGratuito?'Gratuito':'A Pagamento'}
                <span style="font-family:monospace;font-size:9px;opacity:0.7;">${codice}</span>
            </span>`;
        }).join('');
    }

    // Pacchetti Attivi — una card per scuola
    const pacchettiHtml = scuole.length===0
        ? '<p style="color:#94a3b8;font-size:13px;text-align:center;padding:20px;">Nessuna scuola registrata</p>'
        : scuole.map(s=>{
            const cl = classi.filter(c=>c.scuola_id===s.id);
            const clComplete = cl.filter(c=>c.post_data!=null);
            const oreUsate = cl.reduce((a,c)=>a+(
                (c.m1_ore||0)+(c.m2_ore||0)+(c.m3_ore||0)+
                (c.m4_ore||0)+(c.m5_ore||0)+(c.m6_ore||0)
            ),0);
            const oreTot = s.ore_totali||0;
            const pct = oreTot>0 ? Math.min(100,Math.round(oreUsate/oreTot*100)) : 0;
            const barCol = pct>=100?'#dc2626':pct>=70?'#d97706':'var(--teal)';
            return `<div style="border:1.5px solid #e2e8f0;border-radius:16px;padding:16px 18px;margin-bottom:12px;">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
                    <div>
                        <div style="font-weight:700;font-size:14px;color:var(--dark);">${esc(s.nome||'—')}</div>
                        <div style="font-size:11px;color:#64748b;margin-top:3px;"><i class="fas fa-map-marker-alt" style="margin-right:4px;color:var(--teal);"></i>${esc(s.comune||'—')}</div>
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                        ${pkBadgeScuola(s.id, s)}
                        ${s.anno_scolastico?`<span style="background:#f1f5f9;color:#475569;border-radius:8px;padding:3px 9px;font-size:11px;">A.S. ${s.anno_scolastico}</span>`:''}
                    </div>
                </div>
                ${oreTot>0?`
                <div style="margin-bottom:12px;">
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:5px;">
                        <span>Ore utilizzate</span>
                        <span style="font-weight:700;color:var(--dark);">${oreUsate} / ${oreTot}h (${pct}%)</span>
                    </div>
                    <div style="background:#e2e8f0;border-radius:99px;height:7px;overflow:hidden;">
                        <div style="width:${pct}%;height:100%;background:${barCol};border-radius:99px;transition:width 0.4s;"></div>
                    </div>
                </div>`:''}
                ${(()=>{
                    const clsOreWarning=cl.filter(c=>{
                        const modDone=['m1','m2','m3','m4','m5','m6'].every(m=>c[m+'_data']);
                        if(!modDone) return false;
                        const oreC=['m1','m2','m3','m4','m5','m6'].reduce((a,m)=>a+(parseFloat(c[m+'_ore'])||0),0);
                        const pk=pacchetti.find(p=>p.id===c.pacchetto_id);
                        const oT=pk?(pk.ore_totali||0):0;
                        return oT>0&&oreC<oT;
                    });
                    if(clsOreWarning.length===0) return '';
                    const oreReg=clsOreWarning.reduce((a,c)=>a+['m1','m2','m3','m4','m5','m6'].reduce((b,m)=>b+(parseFloat(c[m+'_ore'])||0),0),0);
                    const pk=pacchetti.find(p=>p.id===clsOreWarning[0].pacchetto_id);
                    const oT=pk?(pk.ore_totali||0):0;
                    return `<div style="margin-bottom:12px;padding:10px 14px;background:#fffbeb;border:1.5px solid #fcd34d;border-radius:10px;display:flex;align-items:flex-start;gap:8px;">
                        <span style="font-size:14px;flex-shrink:0;">⚠️</span>
                        <div>
                            <div style="font-size:11px;font-weight:700;color:#92400e;margin-bottom:2px;">Ore inferiori al pacchetto</div>
                            <div style="font-size:11px;color:#78350f;line-height:1.4;">${clsOreWarning.length} class${clsOreWarning.length===1?'e':'i'} con moduli completati ma ore rendicontate inferiori a ${oT}h previste. Verifica con il biologo.</div>
                        </div>
                    </div>`;
                })()}
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:${cl.length>0?'10px':'0'};">
                    <span style="font-size:11px;color:#64748b;">Classi completate:</span>
                    <span style="font-size:12px;font-weight:700;color:${clComplete.length===cl.length&&cl.length>0?'#16a34a':'var(--dark)'};">${clComplete.length} / ${cl.length}</span>
                </div>
                ${cl.length>0?`<div style="display:flex;flex-wrap:wrap;gap:6px;">${cl.map(c=>`
                    <span style="background:${c.post_data?'#f0fdf9':'#f8fafc'};border:1px solid ${c.post_data?'#bbf7d0':'#e2e8f0'};color:#475569;border-radius:8px;padding:4px 10px;font-size:11px;display:flex;align-items:center;gap:5px;">
                        <i class="fas fa-${c.post_data?'check-circle':'circle'}" style="font-size:9px;color:${c.post_data?'#16a34a':'#cbd5e1'};"></i>
                        ${esc(c.nome_classe||'—')} <span style="color:#94a3b8;margin-left:2px;">${c.num_studenti||0} stud.</span>
                    </span>`).join('')}</div>`:''}
                <div style="margin-top:12px;padding-top:10px;border-top:1px solid #f1f5f9;display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;">
                    ${cl.length>0 && clComplete.length===cl.length
                        ? `<button onclick="generaAttestato('${s.id}')" style="display:inline-flex;align-items:center;gap:6px;background:#f0fdf9;border:1.5px solid var(--teal);color:var(--teal);border-radius:8px;padding:6px 13px;font-size:11px;font-weight:700;cursor:pointer;"><i class="fas fa-file-alt"></i> Genera Attestato</button>`
                        : `<span style="font-size:11px;color:#94a3b8;display:inline-flex;align-items:center;gap:5px;"><i class="fas fa-lock"></i> Attestato disponibile al completamento</span>`
                    }
                    <button onclick="avviaReportDocxAdmin('${s.id}')" style="display:inline-flex;align-items:center;gap:6px;background:#eff6ff;border:1.5px solid #1e40af;color:#1e40af;border-radius:8px;padding:6px 13px;font-size:11px;font-weight:700;cursor:pointer;" title="Report professionale Word (.docx)">
                        <i class="fas fa-file-word"></i> Report .docx
                    </button>
                    <button onclick="avviaRelazioneHtmlAdmin('${s.id}')" style="display:inline-flex;align-items:center;gap:6px;background:#ecfdf5;border:1.5px solid #065f46;color:#065f46;border-radius:8px;padding:6px 13px;font-size:11px;font-weight:700;cursor:pointer;" title="Relazione scientifica HTML (apre in nuova finestra, stampabile PDF)">
                        <i class="fas fa-chart-bar"></i> Relazione
                    </button>
                </div>
            </div>`;
        }).join('');

    // Salva dati biologo in localStorage per viewAs (evita conflitti auth cross-tab)
    localStorage.setItem('sane_viewas_data', JSON.stringify({
        id: b.id, profilo: b, scuole: scuole||[], pacchetti: pacchetti||[], classi: classi||[], ts: Date.now()
    }));

    box.innerHTML = `
        <!-- HEADER -->
        <div class="dett-header" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;gap:12px;">
            <div style="display:flex;align-items:center;gap:14px;">
                <div style="width:52px;height:52px;background:var(--teal);border-radius:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <span style="color:white;font-family:'Syne',sans-serif;font-weight:800;font-size:22px;">${b.nome.charAt(0)}</span>
                </div>
                <div>
                    <h3 style="font-size:20px;font-weight:800;color:var(--dark);margin:0;">${esc(b.nome)}</h3>
                    <div style="font-size:12px;color:#64748b;margin-top:3px;">${esc(b.email)}</div>
                    <div style="display:flex;align-items:center;gap:8px;margin-top:5px;flex-wrap:wrap;">
                        <span style="background:${statoCol};color:white;border-radius:7px;padding:2px 10px;font-size:11px;font-weight:700;">${statoLabel}</span>
                        <span style="font-size:11px;color:#64748b;">Regione: <b>${esc(b.regione)}</b></span>
                        <span style="font-size:11px;color:#64748b;">Ordine: <b>${esc(b.ordine)}</b></span>
                        ${adminState.role!=='regional_admin' ? `<button onclick="modificaProfiloBiologo('${b.id}')" style="display:inline-flex;align-items:center;gap:4px;background:#f1f5f9;border:none;border-radius:7px;padding:3px 9px;font-size:10px;font-weight:700;color:#475569;cursor:pointer;" title="Modifica regione/ordine"><i class="fas fa-pen" style="font-size:9px;"></i> Modifica</button>` : ''}
                    </div>
                </div>
            </div>
            <div class="dett-actions" style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                <button class="dett-viewbtn" onclick="window.open('biologo.html?viewAs=${b.id}','_blank')" style="display:inline-flex;align-items:center;gap:6px;background:var(--teal);color:white;border:none;border-radius:10px;padding:7px 13px;font-size:11px;font-weight:700;cursor:pointer;" title="Visualizza Portale"><i class="fas fa-eye"></i><span> Visualizza Portale</span></button>
                <button onclick="closeModal('dettaglioBiologoModal')" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:20px;"><i class="fas fa-times"></i></button>
            </div>
        </div>

        <!-- KPI strip -->
        <div class="kpi-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px;">
            <div style="background:#f0fdf9;border-radius:14px;padding:12px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:var(--teal);font-family:'Syne',sans-serif;">${scuole.length}</div>
                <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-top:2px;">Scuole</div>
            </div>
            <div style="background:#f8fafc;border-radius:14px;padding:12px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:var(--dark);font-family:'Syne',sans-serif;">${classi.length}</div>
                <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-top:2px;">Classi</div>
            </div>
            <div style="background:#f8fafc;border-radius:14px;padding:12px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:var(--dark);font-family:'Syne',sans-serif;">${totStudenti}</div>
                <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-top:2px;">Studenti</div>
            </div>
            <div style="background:${migMedia?'#f0fdf9':'#f8fafc'};border-radius:14px;padding:12px;text-align:center;">
                <div style="font-size:22px;font-weight:800;color:${migMedia?'var(--teal)':'#cbd5e1'};font-family:'Syne',sans-serif;">${migMedia?'+'+migMedia:'—'}</div>
                <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-top:2px;">Miglioramento</div>
            </div>
        </div>

        <!-- Info licenza -->
        <div style="background:#f8fafc;border-radius:14px;padding:14px 16px;margin-bottom:24px;display:flex;gap:20px;flex-wrap:wrap;font-size:12px;color:#64748b;">
            <span><i class="fas fa-calendar-alt" style="color:var(--teal);margin-right:5px;"></i>Iscritto: <b style="color:var(--dark);">${iscr}</b></span>
            <span><i class="fas fa-hourglass-end" style="color:var(--teal);margin-right:5px;"></i>Scadenza: <b style="color:var(--dark);">${scad}</b></span>
        </div>

        <!-- PACCHETTI ATTIVI -->
        <div>
            <h4 style="font-size:13px;font-weight:700;color:var(--dark);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
                <i class="fas fa-box-open" style="color:var(--teal);"></i> Pacchetti Attivi (${scuole.length})
            </h4>
            ${pacchettiHtml}
        </div>
    `;
}

function generaPTOF(scuolaId){
    const cache = adminState._dettaglioCache;
    if(!cache) return;
    const s = cache.scuole.find(x=>x.id===scuolaId);
    if(!s) return;
    const cl = cache.classi.filter(c=>c.scuola_id===scuolaId);
    const b = cache.biologo;

    const totStudenti = cl.reduce((a,c)=>a+(c.num_studenti||0),0);
    const totOre = cl.reduce((a,c)=>a+(
        (c.m1_ore||0)+(c.m2_ore||0)+(c.m3_ore||0)+
        (c.m4_ore||0)+(c.m5_ore||0)+(c.m6_ore||0)
    ),0);
    const anno = s.anno_scolastico || cache.pacchetti.find(p=>p.scuola_id===scuolaId)?.anno_scolastico || '—';
    const classiConMig = cl.filter(c=>c.score_pre!=null&&c.score_post!=null);
    const mig = classiConMig.length>0
        ? (classiConMig.reduce((a,c)=>a+(parseFloat(c.score_post)-parseFloat(c.score_pre)),0)/classiConMig.length).toFixed(1)
        : null;

    const testo = `Nell'anno scolastico ${anno}, l'Istituto "${s.nome}" di ${s.comune||'—'} ha aderito al progetto "Mangiare bene, crescere meglio" — Progetto di Educazione Alimentare promosso da S.A.N.E. Italia (Sicurezza · Alimentazione · Nutrizione · Educazione).

Il progetto, condotto dal Biologo Nutrizionista ${b.nome}, ha coinvolto ${cl.length} class${cl.length===1?'e':'i'} per un totale di ${totStudenti} student${totStudenti===1?'e':'i'}${totOre>0?', con '+totOre+' ore di attività educativa strutturata':''}.

Le attività hanno previsto interventi di educazione alimentare volti a promuovere corrette abitudini nutrizionali e uno stile di vita sano, in coerenza con le finalità del Piano Triennale dell'Offerta Formativa.${mig ? ' La valutazione delle conoscenze alimentari degli studenti attraverso questionari pre e post intervento ha registrato un miglioramento medio di +'+mig+' punti.' : ''}

Il progetto si inserisce nel quadro delle iniziative di educazione alla salute e al benessere promosse dall'istituzione scolastica, in collaborazione con professionisti certificati iscritti alla Federazione Nazionale degli Ordini dei Biologi (FNOB).`;

    // Modal
    let modal = document.getElementById('ptofModal');
    if(!modal){
        modal = document.createElement('div');
        modal.id = 'ptofModal';
        modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.5);align-items:center;justify-content:center;padding:20px;';
        modal.innerHTML = `<div style="background:white;border-radius:20px;padding:28px;max-width:600px;width:100%;max-height:80vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h3 style="font-size:16px;font-weight:800;color:var(--dark);display:flex;align-items:center;gap:8px;"><i class="fas fa-file-word" style="color:var(--teal);"></i> Testo per il PTOF</h3>
                <button onclick="document.getElementById('ptofModal').style.display='none'" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:20px;"><i class="fas fa-times"></i></button>
            </div>
            <p style="font-size:11px;color:#94a3b8;margin-bottom:12px;">Copia il testo e incollalo nella sezione dedicata del PTOF scolastico.</p>
            <textarea id="ptofTesto" readonly style="width:100%;height:220px;border:1.5px solid #e2e8f0;border-radius:12px;padding:14px;font-size:12px;line-height:1.7;color:#334155;resize:vertical;font-family:'Inter',sans-serif;"></textarea>
            <div style="display:flex;gap:10px;margin-top:14px;">
                <button onclick="navigator.clipboard.writeText(document.getElementById('ptofTesto').value).then(()=>{this.innerHTML='<i class=\'fas fa-check\'></i> Copiato!';this.style.background='#16a34a';setTimeout(()=>{this.innerHTML='<i class=\'fas fa-copy\'></i> Copia testo';this.style.background='var(--teal)';},2000)})" style="flex:1;background:var(--teal);color:white;border:none;border-radius:10px;padding:11px;font-weight:700;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;"><i class="fas fa-copy"></i> Copia testo</button>
                <button onclick="document.getElementById('ptofModal').style.display='none'" style="background:#f1f5f9;color:#64748b;border:none;border-radius:10px;padding:11px 18px;font-weight:600;font-size:12px;cursor:pointer;">Chiudi</button>
            </div>
        </div>`;
        document.body.appendChild(modal);
    }

    document.getElementById('ptofTesto').value = testo;
    modal.style.display = 'flex';
}

function avviaReportDocxAdmin(scuolaId){
    const cache = adminState._dettaglioCache;
    if(!cache) return;
    const s = cache.scuole.find(x=>x.id===scuolaId);
    if(!s) return;
    const b = cache.biologo;
    // Prendi il primo pacchetto attivo della scuola (o l'ultimo)
    const pk = cache.pacchetti.filter(p=>p.scuola_id===scuolaId).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))[0];
    if(!pk){alert('Nessun pacchetto trovato per questa scuola.');return;}
    const classi = cache.classi.filter(c=>c.pacchetto_id===pk.id);
    const data={
        biologo:{nome:b.nome,titolo:'Biologo Nutrizionista',ordine:b.ordine||''},
        scuola:{nome:s.nome||'—',comune:s.comune||''},
        pacchetto:{tipo:pk.tipo,ore_totali:pk.ore_totali,anno_scolastico:pk.anno_scolastico,prezzo:pk.prezzo},
        classi,
    };
    const nomeScuola=(s.nome||'scuola').replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'');
    const anno=(pk.anno_scolastico||new Date().getFullYear()).toString().replace('/','-');
    scaricaReportDocx(data,`Report_SANE_${esc(nomeScuola)}_${anno}.docx`);
}

async function avviaRelazioneHtmlAdmin(scuolaId){
    if(typeof generaRelazioneFull!=='function'){
        alert('Modulo relazione non caricato.');return;
    }
    const cache = adminState._dettaglioCache;
    if(!cache) return;
    const s = cache.scuole.find(x=>x.id===scuolaId);
    if(!s) return;
    const b = cache.biologo;
    const pk = cache.pacchetti.filter(p=>p.scuola_id===scuolaId).sort((a,b2)=>new Date(b2.created_at||0)-new Date(a.created_at||0))[0];
    if(!pk){alert('Nessun pacchetto trovato per questa scuola.');return;}
    const classi = cache.classi.filter(c=>c.pacchetto_id===pk.id);
    try{
        await generaRelazioneFull({
            biologo:{nome:b.nome,titolo:'Biologo Nutrizionista',ordine:b.ordine||''},
            scuola:{nome:s.nome||'—',comune:s.comune||''},
            pacchetto:{tipo:pk.tipo,ore_totali:pk.ore_totali,anno_scolastico:pk.anno_scolastico},
            classi,
            supabaseClient: db,
        });
    }catch(e){
        console.error(e);
        alert('Errore generazione relazione: '+e.message);
    }
}

function generaAttestato(scuolaId){
    const cache = adminState._dettaglioCache;
    if(!cache) return;
    const s = cache.scuole.find(x=>x.id===scuolaId);
    if(!s) return;
    const cl = cache.classi.filter(c=>c.scuola_id===scuolaId);
    const pk = cache.pacchetti.filter(p=>p.scuola_id===scuolaId);
    const b = cache.biologo;

    const oggi = new Date().toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'});
    const totStudenti = cl.reduce((a,c)=>a+(c.num_studenti||0),0);
    const totOre = cl.reduce((a,c)=>a+(
        (c.m1_ore||0)+(c.m2_ore||0)+(c.m3_ore||0)+
        (c.m4_ore||0)+(c.m5_ore||0)+(c.m6_ore||0)
    ),0);
    const annoScolastico = s.anno_scolastico || pk[0]?.anno_scolastico || '—';
    const pkHtml = pk.length>0 ? pk.map(p=>{
        return `${p.ore_totali?p.ore_totali+'h contrattate':''}${p.anno_scolastico?' · A.S. '+p.anno_scolastico:''}`.replace(/^· /,'');
    }).filter(t=>t).map(t=>`<li>${t}</li>`).join('') : '';

    // Modalità compatta se ci sono tante classi (≥5)
    const isCompact = cl.length >= 5;
    const padBody   = isCompact ? '8mm'  : '14mm';
    const padInner  = isCompact ? '8mm 10mm 8mm' : '14mm 14mm 10mm';
    const logoH     = isCompact ? '72px' : '100px';
    const dividerMb = isCompact ? '4mm'  : '7mm';
    const titleFs   = isCompact ? '22px' : '28px';
    const bodyFs    = isCompact ? '11px' : '13px';
    const bodyLh    = isCompact ? '1.6'  : '1.9';
    const bodyMb    = isCompact ? '3mm'  : '6mm';
    const schoolFs  = isCompact ? '17px' : '20px';
    const tdPad     = isCompact ? '5px 10px' : '9px 14px';
    const thPad     = isCompact ? '6px 10px' : '9px 14px';
    const tableMb   = isCompact ? '3mm 0 4mm' : '4mm 0 6mm';
    const totalsMb  = isCompact ? '4mm'  : '8mm';
    const sigPt     = isCompact ? '5mm'  : '8mm';
    const headerGap = isCompact ? '20px' : '32px';
    const headerMb  = isCompact ? '4mm'  : '7mm';

    const righe = cl.map(c=>{
        const ore=(c.m1_ore||0)+(c.m2_ore||0)+(c.m3_ore||0)+(c.m4_ore||0)+(c.m5_ore||0)+(c.m6_ore||0);
        return `<tr>
            <td>${esc(c.nome_classe||'—')}</td>
            <td style="text-align:center;">${c.num_studenti||0}</td>
            <td style="text-align:center;">${ore>0?ore+'h':'—'}</td>
        </tr>`;
    }).join('');

    const html=`<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>Attestato — ${esc(s.nome||'Scuola')}</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
@page{size:A4 portrait;margin:0;}
body{font-family:'Inter',sans-serif;background:white;width:210mm;min-height:297mm;padding:${padBody};display:flex;flex-direction:column;}
.border-outer{border:3px solid #0A2647;border-radius:4px;padding:2px;flex:1;display:flex;flex-direction:column;}
.border-inner{border:1px solid #00A896;border-radius:2px;padding:${padInner};flex:1;display:flex;flex-direction:column;}
.divider-top{border:none;border-top:2.5px solid #0A2647;margin-bottom:2mm;}
.divider-teal{border:none;border-top:1.5px solid #00A896;margin-bottom:${dividerMb};}
.title-section{text-align:center;margin-bottom:${dividerMb};}
.title-section h1{font-family:'Syne',sans-serif;font-size:${titleFs};font-weight:800;color:#0A2647;letter-spacing:0.15em;text-transform:uppercase;}
.body-text{font-size:${bodyFs};color:#334155;line-height:${bodyLh};margin-bottom:${bodyMb};text-align:center;}
.school-name{font-family:'Syne',sans-serif;font-weight:800;font-size:${schoolFs};color:#0A2647;display:block;margin:2px 0;}
.program-name{font-weight:700;color:#00A896;}
table{width:100%;border-collapse:collapse;margin:${tableMb};font-size:${isCompact?'11px':'12px'};}
thead tr{background:#0A2647;color:white;}
thead th{padding:${thPad};text-align:left;font-size:${isCompact?'9px':'10px'};font-weight:700;letter-spacing:0.1em;text-transform:uppercase;}
thead th:not(:first-child){text-align:center;}
tbody tr:nth-child(even){background:#f8fafc;}
tbody td{padding:${tdPad};color:#334155;border-bottom:1px solid #e2e8f0;}
.totals{background:#f0fdf9;border:1.5px solid #bbf7d0;border-radius:8px;padding:${isCompact?'7px 14px':'10px 16px'};margin-bottom:${totalsMb};display:flex;gap:${isCompact?'16px':'28px'};justify-content:center;flex-wrap:wrap;font-size:${isCompact?'11px':'12px'};color:#475569;}
.totals strong{color:#0A2647;font-family:'Syne',sans-serif;font-size:${isCompact?'12px':'13px'};}
.sig-section{page-break-inside:avoid;margin-top:auto;padding-top:${sigPt};border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-end;gap:16px;}
.sig-block{text-align:center;flex:1;}
.sig-line{border-bottom:1.5px dashed #0A2647;width:130px;margin:0 auto 5px;}
.sig-label{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;}
.sig-name{font-size:11px;font-weight:700;color:#0A2647;margin-top:3px;}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.toolbar{display:none !important;}}
</style>
</head>
<body>
<div class="toolbar" style="position:fixed;top:0;left:0;right:0;z-index:999;background:#0A2647;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 2px 12px rgba(0,0,0,0.3);">
    <span style="color:white;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;">Attestato di Partecipazione</span>
    <div style="display:flex;gap:8px;">
        <button onclick="window.print()" style="background:#00A896;color:white;border:none;border-radius:8px;padding:8px 18px;font-weight:700;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px;">🖨️ Stampa / Salva PDF</button>
        <button onclick="window.close()" style="background:rgba(255,255,255,0.15);color:white;border:none;border-radius:8px;padding:8px 14px;font-weight:600;font-size:12px;cursor:pointer;">✕ Chiudi</button>
    </div>
</div>
<div style="height:52px;"></div>
<div class="border-outer"><div class="border-inner">

    <div style="display:flex;justify-content:center;align-items:center;gap:${headerGap};margin-bottom:${headerMb};">
        <img src="/immagini/logo/logo3.webp" alt="Mangiare bene, crescere meglio" style="height:${logoH};">
        <div style="width:1px;height:${isCompact?'52px':'70px'};background:#e2e8f0;"></div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:5px;">
            <img src="/immagini/logo/logo2.webp" alt="S.A.N.E. Italia" style="height:${isCompact?'38px':'52px'};">
            <span style="font-family:'Syne',sans-serif;font-size:${isCompact?'11px':'12px'};font-weight:800;color:#0A2647;letter-spacing:0.05em;">S.A.N.E. Italia</span>
        </div>
    </div>
    <hr class="divider-top"><hr class="divider-teal">

    <div class="title-section">
        <h1>Attestato di Partecipazione</h1>
    </div>

    <div class="body-text">
        Si attesta che l'Istituto<br>
        <span class="school-name">${esc(s.nome||'—')}</span>
        <span style="font-size:${isCompact?'10px':'12px'};color:#64748b;">${esc(s.comune||'')}</span><br><br>
        ha partecipato al progetto <span class="program-name">Mangiare bene, crescere meglio</span><br>
        <em style="color:#64748b;font-size:${isCompact?'10px':'12px'};">Progetto di Educazione Alimentare — un'iniziativa S.A.N.E. Italia</em><br>
        con le seguenti classi:
    </div>

    ${pkHtml?`<div style="margin-bottom:${isCompact?'3mm':'5mm'};font-size:11px;color:#475569;text-align:center;">
        <span style="font-weight:700;color:#0A2647;text-transform:uppercase;letter-spacing:0.08em;font-size:10px;">Pacchetti erogati</span>
        <ul style="list-style:none;margin-top:4px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">${pkHtml}</ul>
    </div>`:''}
    <table>
        <thead><tr><th>Classe</th><th>N° Studenti</th><th>Ore Erogate</th></tr></thead>
        <tbody>${righe}</tbody>
    </table>

    <div class="totals">
        <span>Totale studenti coinvolti: <strong>${totStudenti}</strong></span>
        ${totOre>0?`<span>Ore totali erogate: <strong>${totOre}h</strong></span>`:''}
        <span>Biologo responsabile: <strong>${esc(b.nome)}</strong></span>
    </div>

    <div class="sig-section">
        <div class="sig-block">
            <div class="sig-label">Luogo e Data</div>
            <div class="sig-name" style="margin-top:6px;">${esc(s.comune||'—')}, ${oggi}</div>
        </div>
        <div class="sig-block">
            <div style="height:32px;"></div>
            <div class="sig-line"></div>
            <div class="sig-label">Biologo S.A.N.E. Italia</div>
            <div class="sig-name">${esc(b.nome)}</div>
        </div>
        <div class="sig-block">
            <img src="/immagini/logo/firma-serafina.png" alt="Firma" style="height:48px;object-fit:contain;display:block;margin:0 auto;" onerror="this.style.display='none';this.nextElementSibling.style.height='32px'">
            <div style="height:0;"></div>
            <div class="sig-line"></div>
            <div class="sig-label">Responsabile S.A.N.E. Italia</div>
            <div class="sig-name">Serafina Cardaci</div>
        </div>
    </div>


</div></div>
</body></html>`;

    const win = window.open('','_blank','width=900,height=1150');
    if(win){ win.document.write(html); win.document.close(); }
}

function modificaProfiloBiologo(id){
    const b = adminState.biologi.find(x=>x.id===id);
    if(!b) return;
    const regioniOpts = ['Piemonte','Liguria','Lombardia','Trentino-Alto Adige','Veneto','Friuli-Venezia Giulia',
        'Emilia-Romagna','Toscana','Umbria','Marche','Lazio','Abruzzo','Molise','Campania',
        'Puglia','Basilicata','Calabria','Sicilia','Sardegna','Valle d\'Aosta']
        .map(r=>`<option value="${r}"${b.regione===r?' selected':''}>${r}</option>`).join('');
    const html = `
    <div id="editProfiloBox" style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;padding:18px;margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:var(--dark);margin-bottom:12px;display:flex;align-items:center;gap:6px;">
            <i class="fas fa-pen" style="color:var(--teal);font-size:11px;"></i> Modifica Profilo
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
            <div>
                <label style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:5px;">Regione</label>
                <select id="editRegione" style="width:100%;padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:12px;color:var(--dark);background:white;">
                    <option value="">— nessuna —</option>${regioniOpts}
                </select>
            </div>
            <div>
                <label style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:5px;">Numero Ordine</label>
                <input id="editOrdine" type="text" value="${b.ordine==='—'?'':esc(b.ordine)}" placeholder="es. AL-2847" style="width:100%;padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:12px;color:var(--dark);background:white;box-sizing:border-box;">
            </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button onclick="document.getElementById('editProfiloBox').remove()" style="background:none;border:1.5px solid #e2e8f0;border-radius:8px;padding:6px 14px;font-size:11px;font-weight:700;color:#64748b;cursor:pointer;">Annulla</button>
            <button onclick="salvaProfiloBiologo('${id}')" style="background:var(--teal);border:none;border-radius:8px;padding:6px 14px;font-size:11px;font-weight:700;color:white;cursor:pointer;display:flex;align-items:center;gap:5px;"><i class="fas fa-save"></i> Salva</button>
        </div>
    </div>`;
    const box = document.getElementById('dettaglioBiologoContent');
    const existing = document.getElementById('editProfiloBox');
    if(existing){ existing.remove(); return; }
    box.insertAdjacentHTML('afterbegin', html);
}

async function salvaProfiloBiologo(id){
    const regione = document.getElementById('editRegione').value || null;
    const ordine  = document.getElementById('editOrdine').value.trim() || null;
    const {error} = await db.from('profiles').update({regione, ordine}).eq('id', id);
    if(error){ showToast('Errore: '+error.message,'error'); return; }
    const b = adminState.biologi.find(x=>x.id===id);
    if(b){ b.regione = regione||'—'; b.ordine = ordine||'—'; }
    document.getElementById('editProfiloBox')?.remove();
    showToast('Profilo aggiornato ✓');
    aggiornaLicenze();
    mostraDettaglioBiologo(id);
}

async function nominaResponsabile(id){
    const b = adminState.biologi.find(x=>x.id===id);
    if(!b) return;
    if(!confirm(`Nominare "${esc(b.nome)}" come Responsabile Regionale per ${b.regione==='—'?'la sua regione':esc(b.regione)}?\n\nPotrà accedere al pannello admin e gestire i biologi della sua regione.`)) return;
    const { error } = await db.from('profiles').update({ role: 'regional_admin' }).eq('id', id);
    if(error){ showToast('Errore: '+error.message,'error'); return; }
    b.ruolo = 'regional_admin';
    showToast(`${esc(b.nome)} nominato/a Responsabile Regionale ✓`);
    aggiornaLicenze();

    // Chiedi se inviare email di notifica
    const regione = b.regione==='—' ? 'la tua regione' : b.regione;
    setTimeout(()=>{
        apriPopupEmailNomina(b, regione);
    }, 400);
}

function apriPopupEmailNomina(b, regione){
    const oggetto = encodeURIComponent(`Accesso Pannello Admin S.A.N.E. — Responsabile ${regione}`);
    const corpo = encodeURIComponent(
`Cara/o ${esc(b.nome)},

ti comunichiamo che sei stata/o nominata/o Responsabile Regionale per ${regione} nel programma S.A.N.E. Italia.

Puoi accedere al pannello admin al seguente link:
https://sane-italia.it/admin.html

Usa le tue credenziali abituali (la stessa email e password con cui accedi al portale biologi).

Dal pannello potrai visualizzare i biologi della tua regione, approvare nuove iscrizioni e monitorare l'attività.

Buon lavoro,
Patrick Orlando
S.A.N.E. Italia`);

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(10,38,71,0.7);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
        <div style="background:white;border-radius:24px;padding:32px;max-width:400px;width:100%;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,0.25);">
            <div style="width:56px;height:56px;background:#f5f3ff;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
                <i class="fas fa-envelope" style="color:#7c3aed;font-size:22px;"></i>
            </div>
            <h3 style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:var(--dark);margin-bottom:10px;">Invia notifica a ${esc(b.nome)}?</h3>
            <p style="color:#64748b;font-size:13px;line-height:1.6;margin-bottom:24px;">Si aprirà il tuo client email con un messaggio pre-compilato che spiega come accedere al pannello admin.</p>
            <p style="background:#f8fafc;border-radius:10px;padding:10px 14px;font-size:12px;color:#64748b;margin-bottom:24px;">
                <i class="fas fa-at" style="color:#7c3aed;margin-right:6px;"></i>${esc(b.email)}
            </p>
            <div style="display:flex;gap:10px;">
                <button onclick="this.closest('div[style*=fixed]').remove()" style="flex:1;background:#f1f5f9;border:none;border-radius:12px;padding:13px;font-family:'Syne',sans-serif;font-weight:700;font-size:12px;color:#64748b;cursor:pointer;letter-spacing:0.06em;text-transform:uppercase;">Non ora</button>
                <a href="mailto:${esc(b.email)}?subject=${oggetto}&body=${corpo}" onclick="this.closest('div[style*=fixed]').remove()" style="flex:1;background:#7c3aed;border:none;border-radius:12px;padding:13px;font-family:'Syne',sans-serif;font-weight:700;font-size:12px;color:white;cursor:pointer;letter-spacing:0.06em;text-transform:uppercase;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px;"><i class="fas fa-paper-plane"></i> Invia Email</a>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
}

async function rimuoviResponsabile(id){
    const b = adminState.biologi.find(x=>x.id===id);
    if(!b) return;
    if(!confirm(`Rimuovere il ruolo di Responsabile Regionale a "${esc(b.nome)}"?\n\nTornerà ad essere un biologo normale.`)) return;
    const { error } = await db.from('profiles').update({ role: 'biologo' }).eq('id', id);
    if(error){ showToast('Errore: '+error.message,'error'); return; }
    b.ruolo = 'biologo';
    showToast(`Ruolo rimosso — ${esc(b.nome)} è ora un biologo normale ✓`);
    aggiornaLicenze();
}

function esportaCSV(){
    const biologi = adminState.biologi;
    if(!biologi.length){ showToast('Nessun dato da esportare','error'); return; }

    const intestazione = ['Nome','Email','Regione','N. Ordine','Stato','Iscrizione','Scadenza','Scuole','Pacchetti','Classi','Studenti','Ore Contratte','Valore Contratto (€)','Miglioramento Medio'];
    const righe = biologi.map(b => [
        b.nome,
        b.email,
        b.regione,
        b.ordine,
        {active:'Attiva',pending:'In Attesa',expired:'Scaduta',suspended:'Sospesa'}[b.stato]||b.stato,
        b.dataIscrizione ? new Date(b.dataIscrizione).toLocaleDateString('it-IT') : '—',
        b.scadenza      ? new Date(b.scadenza).toLocaleDateString('it-IT')       : '—',
        b.scuole,
        b.pacchetti,
        b.classi,
        b.studenti,
        b.oreContratte||0,
        b.valoreContratto||0,
        b.miglioramento ? '+'+b.miglioramento : '—'
    ]);

    const csv = [intestazione, ...righe]
        .map(r => r.map(csvCell).join(';'))
        .join('\n');

    const bom = '\uFEFF'; // BOM per Excel italiano
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const oggi = new Date().toISOString().split('T')[0];
    a.href     = url;
    a.download = `sane-licenze-${oggi}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Esportati ${biologi.length} biologi ✓`);
}

function badgeHtml(stato){
    const map = {
        active:   ['badge-active','check-circle','Attiva'],
        pending:  ['badge-pending','clock','In Attesa'],
        expired:  ['badge-expired','times-circle','Scaduta'],
        suspended:['badge-suspended','ban','Sospesa']
    };
    const [cls,icon,label] = map[stato]||['badge-suspended','question','Sconosciuto'];
    return `<span class="badge ${cls}"><i class="fas fa-${icon}"></i>${label}</span>`;
}

function handleStatoBtn(btn){
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    if(action === 'elimina') eliminaBiologo(id);
    else if(action === 'rinnova') rinnovaLicenza(id);
    else cambiaStato(id, action);
}

async function cambiaStato(id, nuovoStato){
    const b = adminState.biologi.find(x=>x.id===id);
    if(!b){ showToast('Biologo non trovato in memoria (id: '+id+')','error'); return; }
    const update = { stato: nuovoStato };
    if(nuovoStato==='active' && !b.scadenza){
        const sc = new Date(); sc.setFullYear(sc.getFullYear()+1);
        update.scadenza = sc.toISOString().split('T')[0];
    }
    const { data: updated, error } = await db.from('profiles').update(update).eq('id', id).select();
    if(error){ showToast('Errore DB: '+error.message,'error'); return; }
    if(!updated || updated.length === 0){
        showToast('Aggiornamento bloccato — aggiungi policy RLS su Supabase (vedi console)','error');
        console.warn('RLS block: nessuna riga aggiornata per id='+id+', stato='+nuovoStato);
        return;
    }
    Object.assign(b, update);
    aggiornaLicenze(); aggiornaDashboard();
    const labels = {active:'Licenza attivata ✓', suspended:'Biologo sospeso', expired:'Licenza scaduta'};
    showToast(labels[nuovoStato]||'Stato aggiornato');
}

async function rinnovaLicenza(id){
    const sc = new Date(); sc.setFullYear(sc.getFullYear()+1);
    const scadenza = sc.toISOString().split('T')[0];
    const { error } = await db.from('profiles').update({ stato:'active', scadenza }).eq('id', id);
    if(error){ showToast('Errore: '+error.message,'error'); return; }
    const b = adminState.biologi.find(x=>x.id===id);
    if(b){ b.stato='active'; b.scadenza=scadenza; }
    aggiornaLicenze(); aggiornaDashboard();
    showToast('Licenza rinnovata per 12 mesi ✓');
}

async function eliminaBiologo(id){
    const b = adminState.biologi.find(x=>x.id===id);
    if(!b) return;
    // Doppia conferma. L'account di accesso viene rimosso (email liberata), ma
    // scuole, classi e statistiche del biologo restano nel database.
    if(!confirm('Eliminare '+b.nome+'?\n\nL\'account di accesso viene rimosso e l\'email tornerà libera.\nI dati personali vengono anonimizzati; scuole, classi e statistiche RESTANO nel database.')) return;
    if(!confirm('Confermi l\'eliminazione di '+b.nome+'?')) return;
    const token = (await db.auth.getSession()).data?.session?.access_token;
    if(!token){ showToast('Sessione scaduta, rientra','error'); return; }
    let r;
    try{
        r = await fetch(FN_BASE+'/elimina-utente',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({access_token:token,user_id:id})});
    }catch(e){ showToast('Errore di rete, riprova','error'); return; }
    const j = await r.json().catch(()=>({}));
    if(!r.ok || !j.ok){ showToast(j.error||'Eliminazione non riuscita','error'); return; }
    adminState.biologi = adminState.biologi.filter(x=>x.id!==id);
    aggiornaLicenze(); aggiornaDashboard();
    showToast(b.nome+' eliminato definitivamente ✓');
}

async function aggiungiBiologo(){
    const nome     = document.getElementById('bioNome').value.trim();
    const email    = document.getElementById('bioEmail').value.trim();
    const regione  = document.getElementById('bioRegione').value;
    const ordine   = document.getElementById('bioOrdine').value.trim();
    const stato    = document.getElementById('bioStato').value;
    const scadenza = document.getElementById('bioScadenza').value;
    if(!nome||!email||!regione){ showToast('Compila nome, email e regione','error'); return; }

    // Aggiorna profilo esistente se già registrato, altrimenti mostra istruzione
    const { data: existing } = await db.from('profiles').select('id').eq('email', email).maybeSingle();
    if(existing){
        const update = { nome, regione, ordine:ordine||'—', stato, scadenza:scadenza||null };
        const { error } = await db.from('profiles').update(update).eq('id', existing.id);
        if(error){ showToast('Errore: '+error.message,'error'); return; }
        closeModal('nuovoBiologoModal');
        await caricaDati(); aggiornaDashboard(); aggiornaLicenze();
        showToast('Profilo aggiornato: '+nome);
    } else {
        showToast('Biologo non ancora registrato. Condividi il link del portale con '+email,'error');
    }
}

// ============================================================
// DATI NAZIONALI
// ============================================================
function aggiornaNazionale(){
    const b = adminState.biologi.filter(x=>x.stato==='active');
    const totScuole    = b.reduce((a,x)=>a+(x.scuole||0),0);
    const totClassi    = b.reduce((a,x)=>a+(x.classi||0),0);
    const totStudenti  = b.reduce((a,x)=>a+(x.studenti||0),0);
    const totPacchetti = b.reduce((a,x)=>a+(x.pacchetti||0),0);
    const conMig = b.filter(x=>x.miglioramento);
    const mediaMig = conMig.length>0 ? '+' + (conMig.reduce((a,x)=>a+x.miglioramento,0)/conMig.length).toFixed(1) : '—';

    document.getElementById('nazStudenti').textContent     = totStudenti;
    document.getElementById('nazBiologiAttivi').textContent = b.filter(x=>x.stato==='active').length;
    document.getElementById('nazScuole').textContent       = totScuole;
    document.getElementById('nazSessioni').textContent     = totClassi;
    document.getElementById('nazPacchetti').textContent    = totPacchetti;
    document.getElementById('nazMiglioramento').textContent = mediaMig;

    // Top biologi
    const top = [...adminState.biologi].sort((a,b)=>(b.classi||0)-(a.classi||0)).slice(0,5);
    document.getElementById('topBiologi').innerHTML = top.map((b,i)=>`
        <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid #f1f5f9;">
            <div style="width:28px;height:28px;background:${i===0?'#F4A261':i===1?'#94a3b8':i===2?'#d97706':'#e2e8f0'};border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:700;font-size:12px;color:white;flex-shrink:0;">#${i+1}</div>
            <div style="flex:1;">
                <div style="font-weight:700;font-size:13px;color:var(--dark);">${esc(b.nome)}</div>
                <div style="font-size:11px;color:#94a3b8;">${esc(b.regione)}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:16px;color:var(--teal);">${b.classi||0}</div>
                <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;">Classi</div>
            </div>
        </div>`).join('');
}

// ============================================================
// EXPORT CSV
// ============================================================
function exportCSV(){
    const headers = ['Nome','Email','Regione','Ordine','Stato','Scadenza','Scuole','Classi','Studenti','Miglioramento Medio'];
    const rows = adminState.biologi.map(b=>[
        b.nome, b.email, b.regione, b.ordine, b.stato,
        b.scadenza||'—', b.scuole, b.classi||0, b.studenti||0,
        b.miglioramento ? '+'+b.miglioramento : '—'
    ]);
    const csv = [headers, ...rows].map(r=>r.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'SANE_Biologi_' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
    showToast('Export CSV scaricato ✓');
}

// ============================================================
// SCADENZE AUTO
// ============================================================
async function verificaScadenzeAuto(){
    const oggi = new Date().toISOString().split('T')[0];
    const scaduti = adminState.biologi.filter(b=>
        b.stato==='active' && b.scadenza && b.scadenza < oggi
    );
    if(scaduti.length===0) return;
    // Aggiorna DB in batch
    const ids = scaduti.map(b=>b.id);
    const {error} = await db.from('profiles').update({stato:'expired'}).in('id',ids);
    if(error){ console.warn('Errore aggiornamento scadenze:', error.message); return; }
    // Aggiorna stato in memoria
    scaduti.forEach(b=>{ b.stato='expired'; });
    aggiornaDashboard(); aggiornaLicenze();
    // Banner notifica
    const banner = document.createElement('div');
    banner.style.cssText='position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:9999;background:#dc2626;color:white;padding:10px 20px;border-radius:12px;font-size:12px;font-weight:700;box-shadow:0 4px 20px rgba(0,0,0,0.2);display:flex;align-items:center;gap:8px;';
    banner.innerHTML=`<i class="fas fa-clock"></i> ${scaduti.length} licenz${scaduti.length===1?'a':'e'} scadut${scaduti.length===1?'a':'e'} aggiornata${scaduti.length===1?'':'e'} automaticamente: ${scaduti.map(b=>esc(b.nome)).join(', ')} <button onclick="this.parentElement.remove()" style="margin-left:8px;background:rgba(255,255,255,0.2);border:none;color:white;border-radius:6px;padding:2px 8px;cursor:pointer;">✕</button>`;
    document.body.appendChild(banner);
    setTimeout(()=>banner.remove(), 8000);
}

// ============================================================
// LOG ATTIVITÀ
// ============================================================
let _logData = []; // cache log caricati

const LOG_LABELS = {
    login:                    { icon:'fa-sign-in-alt',     color:'#6366f1', label:'Login' },
    registrazione:            { icon:'fa-user-plus',       color:'#16a34a', label:'Registrazione' },
    scuola_aggiunta:          { icon:'fa-school',          color:'#0891b2', label:'Scuola aggiunta' },
    scuola_eliminata:         { icon:'fa-school',          color:'#dc2626', label:'Scuola eliminata' },
    pacchetto_aggiunto:       { icon:'fa-box-open',        color:'#16a34a', label:'Pacchetto aggiunto' },
    pacchetto_modificato:     { icon:'fa-edit',            color:'#d97706', label:'Pacchetto modificato' },
    pacchetto_eliminato:      { icon:'fa-box-open',        color:'#dc2626', label:'Pacchetto eliminato' },
    classe_aggiunta:          { icon:'fa-users',           color:'#0891b2', label:'Classe aggiunta' },
    classe_modificata:        { icon:'fa-user-edit',       color:'#d97706', label:'Classe modificata' },
    classe_eliminata:         { icon:'fa-users',           color:'#dc2626', label:'Classe eliminata' },
    classi_orfane_eliminate:  { icon:'fa-trash-alt',       color:'#dc2626', label:'Classi orfane eliminate' },
    questionario_generato:    { icon:'fa-file-alt',        color:'#7c3aed', label:'Questionario generato' },
    report_generato:          { icon:'fa-file-pdf',        color:'#dc2626', label:'Report generato' },
    profilo_aggiornato:       { icon:'fa-user-check',      color:'#0891b2', label:'Profilo aggiornato' },
    export_gdpr:              { icon:'fa-download',        color:'#475569', label:'Export GDPR' },
    admin_accesso:            { icon:'fa-eye',             color:'#f59e0b', label:'Accesso admin' },
};

async function caricaLog(){
    document.getElementById('logTabella').innerHTML='<p style="text-align:center;color:#94a3b8;padding:40px;font-size:13px;"><i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>Caricamento...</p>';

    // Carica activity_log + admin_access_log in parallelo
    const [actRes, admRes] = await Promise.all([
        db.from('activity_log')
            .select('id,biologo_id,azione,dettaglio,created_at')
            .order('created_at',{ascending:false})
            .limit(500),
        db.from('admin_access_log')
            .select('id,admin_id,biologo_id,biologo_nome,azione,created_at')
            .order('created_at',{ascending:false})
            .limit(200)
    ]);

    const attivita = (actRes.data||[]).map(r=>({
        id: r.id,
        biologo_id: r.biologo_id,
        biologo_nome: adminState.biologi.find(b=>b.id===r.biologo_id)?.nome || r.biologo_id?.slice(0,8)+'…',
        azione: r.azione,
        dettaglio: r.dettaglio||{},
        created_at: r.created_at,
        fonte: 'biologo'
    }));

    const adminLog = (admRes.data||[]).map(r=>({
        id: r.id,
        biologo_id: r.biologo_id,
        biologo_nome: r.biologo_nome || adminState.biologi.find(b=>b.id===r.biologo_id)?.nome || '—',
        azione: 'admin_accesso',
        dettaglio: { admin_id: r.admin_id },
        created_at: r.created_at,
        fonte: 'admin'
    }));

    _logData = [...attivita, ...adminLog].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));

    // Popola select biologo
    const sel = document.getElementById('logFiltroBiologo');
    const nomi = [...new Map(_logData.map(r=>[r.biologo_id, r.biologo_nome])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
    sel.innerHTML = '<option value="">Tutti</option>' + nomi.map(([id,nome])=>`<option value="${id}">${esc(nome)}</option>`).join('');

    renderLog();
}

function renderLog(){
    const filtroBiologo = document.getElementById('logFiltroBiologo').value;
    const filtroTipo    = document.getElementById('logFiltroTipo').value;
    const filtroDal     = document.getElementById('logFiltroDal').value;
    const filtroAl      = document.getElementById('logFiltroAl').value;

    let righe = _logData;
    if(filtroBiologo) righe = righe.filter(r=>r.biologo_id===filtroBiologo);
    if(filtroTipo)    righe = righe.filter(r=>r.azione===filtroTipo);
    if(filtroDal)     righe = righe.filter(r=>r.created_at>=filtroDal);
    if(filtroAl)      righe = righe.filter(r=>r.created_at<=filtroAl+'T23:59:59');

    const tabella = document.getElementById('logTabella');
    if(righe.length===0){
        tabella.innerHTML='<p style="text-align:center;color:#94a3b8;padding:40px;font-size:13px;">Nessun evento trovato.</p>';
        return;
    }

    tabella.innerHTML = `
    <div style="padding:12px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:11px;color:#64748b;font-weight:700;">
        ${righe.length} eventi trovati
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
            <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
                <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;white-space:nowrap;">Data / Ora</th>
                <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Biologo</th>
                <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Evento</th>
                <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">Dettaglio</th>
            </tr>
        </thead>
        <tbody>
            ${righe.map((r,i)=>{
                const meta = LOG_LABELS[r.azione] || {icon:'fa-circle',color:'#94a3b8',label:r.azione};
                const dt   = new Date(r.created_at);
                const data = dt.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'});
                const ora  = dt.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
                const det  = Object.entries(r.dettaglio||{}).filter(([k])=>k!=='admin_id').map(([k,v])=>`<span style="background:#f1f5f9;padding:1px 6px;border-radius:5px;margin-right:3px;font-size:10px;">${v}</span>`).join('');
                return `<tr style="border-bottom:1px solid #f1f5f9;background:${i%2===0?'white':'#fafafa'};" onmouseover="this.style.background='#f0fdf9'" onmouseout="this.style.background='${i%2===0?'white':'#fafafa'}'">
                    <td style="padding:10px 16px;white-space:nowrap;color:#64748b;">${data}<span style="color:#94a3b8;margin-left:6px;">${ora}</span></td>
                    <td style="padding:10px 16px;font-weight:600;color:var(--dark);">${esc(r.biologo_nome)}</td>
                    <td style="padding:10px 16px;white-space:nowrap;">
                        <span style="display:inline-flex;align-items:center;gap:5px;background:${meta.color}18;color:${meta.color};padding:3px 9px;border-radius:7px;font-weight:700;font-size:11px;">
                            <i class="fas ${meta.icon}" style="font-size:9px;"></i>${meta.label}
                        </span>
                    </td>
                    <td style="padding:10px 16px;color:#64748b;">${det||'—'}</td>
                </tr>`;
            }).join('')}
        </tbody>
    </table>`;
}

function resetFiltriLog(){
    document.getElementById('logFiltroBiologo').value='';
    document.getElementById('logFiltroTipo').value='';
    document.getElementById('logFiltroDal').value='';
    document.getElementById('logFiltroAl').value='';
    renderLog();
}

function esportaLogCSV(){
    const filtroBiologo = document.getElementById('logFiltroBiologo').value;
    const filtroTipo    = document.getElementById('logFiltroTipo').value;
    let righe = _logData;
    if(filtroBiologo) righe = righe.filter(r=>r.biologo_id===filtroBiologo);
    if(filtroTipo)    righe = righe.filter(r=>r.azione===filtroTipo);
    const csv = ['Data,Ora,Biologo,Evento,Dettaglio', ...righe.map(r=>{
        const dt = new Date(r.created_at);
        const det = Object.entries(r.dettaglio||{}).filter(([k])=>k!=='admin_id').map(([k,v])=>`${k}:${v}`).join(' | ');
        return [dt.toLocaleDateString('it-IT'), dt.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}), r.biologo_nome, LOG_LABELS[r.azione]?.label||r.azione, det].map(csvCell).join(',');
    })].join('\n');
    const a=document.createElement('a');
    a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv);
    a.download='sane_log_'+new Date().toISOString().slice(0,10)+'.csv';
    a.click();
}

// ============================================================
// AUTOVALUTAZIONI (ADMIN)
// ============================================================
const AREE_AUTOV_ADMIN = ['Mensa e Refezione','Educazione Alimentare','Ambiente e Spazi','Sicurezza Alimentare','Attività Fisica e Benessere'];
const DOMANDE_AUTOV_ADMIN = [
    {area:1,testo:'La scuola ha una mensa scolastica attiva'},
    {area:1,testo:'Il menù è approvato da un nutrizionista o ASL'},
    {area:1,testo:'Sono previsti menù alternativi per allergie e intolleranze'},
    {area:1,testo:'Viene comunicato il menù alle famiglie e le eventuali variazioni (stagionali, assenza di un prodotto)'},
    {area:1,testo:'Esiste un protocollo scritto per la gestione delle allergie gravi'},
    {area:2,testo:'Vengono svolte attività di educazione alimentare durante l\'anno'},
    {area:2,testo:'Gli insegnanti hanno ricevuto formazione specifica sull\'alimentazione'},
    {area:2,testo:'La scuola utilizza strumenti digitali per l\'educazione alimentare'},
    {area:2,testo:'Sono coinvolte le famiglie nelle attività di educazione alimentare'},
    {area:2,testo:'Esiste un progetto strutturato pluriennale sull\'alimentazione'},
    {area:3,testo:'Sono disponibili distributori di acqua potabile'},
    {area:3,testo:'Gli spazi per la consumazione dei pasti sono adeguati'},
    {area:3,testo:'È garantito un tempo sufficiente per il pasto'},
    {area:3,testo:'L\'ambiente mensa è pulito e confortevole'},
    {area:3,testo:'Sono presenti aree verdi o orti scolastici'},
    {area:4,testo:'Il personale di cucina è formato sulla sicurezza alimentare'},
    {area:4,testo:'Il personale addetto alla mensa indossa i dispositivi previsti (guanti, cuffie, camice)'},
    {area:4,testo:'Vengono effettuati controlli periodici sulle forniture'},
    {area:4,testo:'Il personale conosce i 14 allergeni principali'},
    {area:4,testo:'Esiste un registro aggiornato degli alunni con allergie certificate'},
    {area:5,testo:'Sono previste almeno 2 ore di educazione fisica settimanale'},
    {area:5,testo:'Vengono promosse attività motorie durante le pause'},
    {area:5,testo:'Esiste una collaborazione con associazioni sportive del territorio'},
    {area:5,testo:'Viene monitorato il benessere psicofisico degli studenti'},
    {area:5,testo:'La scuola partecipa a progetti regionali o nazionali sulla salute'},
];

let _adminAutov = [];
let _adminAutovFiltro = 'tutte';

async function aggiornaAdminAutovalutazioni(){
    const list = document.getElementById('adminAutovList');
    list.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:40px;"><i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Caricamento...</p>';
    const { data, error } = await db.from('autovalutazioni')
        .select('*, scuole!scuola_id(nome,comune), profiles!biologo_id(nome)')
        .order('created_at',{ascending:false});
    if(error){
        list.innerHTML='<p style="text-align:center;color:#94a3b8;padding:40px;">Errore: '+error.message+'</p>';
        return;
    }
    _adminAutov = data||[];
    renderAdminAutovalutazioni();
}

function filtraAdminAutov(filtro){
    _adminAutovFiltro = filtro;
    document.querySelectorAll('[id^=autovFiltro-]').forEach(b=>{ b.style.background='#f1f5f9'; b.style.color='#64748b'; });
    const btn = document.getElementById('autovFiltro-'+filtro);
    if(btn){ btn.style.background='var(--dark)'; btn.style.color='white'; }
    renderAdminAutovalutazioni();
}

function renderAdminAutovalutazioni(){
    const list = document.getElementById('adminAutovList');
    let rows = _adminAutov;
    if(_adminAutovFiltro !== 'tutte') rows = rows.filter(a=>a.stato===_adminAutovFiltro);
    if(rows.length===0){
        list.innerHTML='<p style="text-align:center;color:#94a3b8;padding:40px;">Nessuna autovalutazione trovata.</p>';
        return;
    }
    const statiCfg={
        attesa:     {label:'In attesa',  bg:'#fef3c7',col:'#92400e',icon:'fa-clock'},
        completata: {label:'Completata', bg:'#dbeafe', col:'#1e40af',icon:'fa-check-circle'},
        certificata:{label:'Certificata',bg:'#d1fae5', col:'#065f46',icon:'fa-award'}
    };
    list.innerHTML = rows.map(a=>{
        const st = statiCfg[a.stato]||statiCfg.attesa;
        const nomeScuola  = a.scuole?.nome||'—';
        const comune      = a.scuole?.comune||'';
        const nomeBiologo = a.profiles?.nome||'—';
        const hasPts      = a.punteggio_totale!=null;
        const pts         = a.punteggio_totale;
        const maxPts      = a.punteggio_max||50;
        const pct         = hasPts ? Math.round((pts/maxPts)*100) : null;
        const sufficiente = hasPts && pct>=70;
        const dataComp    = a.compilata_il ? new Date(a.compilata_il).toLocaleDateString('it-IT',{day:'numeric',month:'short',year:'numeric'}) : '—';
        const puoRisposte = a.stato==='completata'||a.stato==='certificata';
        return `<div class="bio-row">
            <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
                    <span style="font-weight:700;font-size:14px;color:var(--dark);">${esc(nomeScuola)}</span>
                    ${comune?`<span style="font-size:11px;color:#94a3b8;">${esc(comune)}</span>`:''}
                </div>
                <div style="font-size:11px;color:#64748b;margin-bottom:6px;">
                    <i class="fas fa-user" style="color:var(--teal);margin-right:4px;"></i>${esc(nomeBiologo)}
                    &nbsp;·&nbsp; A.S. ${a.anno_scolastico||'—'}
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    <span style="padding:3px 10px;border-radius:99px;font-size:10px;font-weight:700;background:${st.bg};color:${st.col};display:inline-flex;align-items:center;gap:4px;">
                        <i class="fas ${st.icon}" style="font-size:9px;"></i>${st.label}
                    </span>
                    ${hasPts?`<span style="font-size:12px;font-weight:700;color:${sufficiente?'var(--teal)':'#f59e0b'};">${pts}/${maxPts}</span>`:''}
                    <span style="font-size:11px;color:#94a3b8;"><i class="fas fa-calendar-alt" style="margin-right:3px;"></i>${dataComp}</span>
                </div>
                ${hasPts?`<div style="margin-top:8px;max-width:300px;">
                    <div style="height:5px;background:#e2e8f0;border-radius:99px;overflow:hidden;">
                        <div style="height:100%;width:${pct}%;background:${sufficiente?'var(--teal)':'#f59e0b'};border-radius:99px;"></div>
                    </div>
                </div>`:''}
            </div>
            <div style="display:flex;flex-direction:column;gap:7px;flex-shrink:0;align-items:flex-end;">
                ${puoRisposte?`<button onclick="vediRisposteAdmin('${a.id}')" class="btn-ghost" style="font-size:11px;padding:7px 12px;white-space:nowrap;"><i class="fas fa-list-ul" style="margin-right:5px;"></i>Vedi Risposte</button>`:''}
                ${sufficiente?`<button onclick="generaCertificatoAdmin('${a.id}')" class="btn-primary" style="font-size:11px;padding:7px 12px;white-space:nowrap;"><i class="fas fa-award" style="margin-right:5px;"></i>Genera Certificato</button>`:''}
            </div>
        </div>`;
    }).join('');
}

async function vediRisposteAdmin(autovId){
    const a = _adminAutov.find(x=>x.id===autovId);
    if(!a) return;
    document.getElementById('adminRisposteTitolo').textContent  = a.scuole?.nome||'—';
    document.getElementById('adminRisposteAnno').textContent    = 'A.S. '+(a.anno_scolastico||'—');
    document.getElementById('adminRispostePunteggio').textContent = (a.punteggio_totale!=null?a.punteggio_totale:'—')+'/'+(a.punteggio_max||50);
    document.getElementById('adminRisposteDettaglio').innerHTML = '<p style="text-align:center;color:#94a3b8;padding:20px;"><i class="fas fa-spinner fa-spin"></i></p>';
    document.getElementById('adminRisposteModal').classList.add('open');
    const {data:risposte} = await db.from('risposte_autovalutazione').select('*').eq('autovalutazione_id',autovId).order('area').order('domanda_id');
    renderRisposteAdmin(risposte||[]);
}

function renderRisposteAdmin(risposte){
    let html='';
    for(let a=1;a<=5;a++){
        const rArea   = risposte.filter(r=>String(r.area)===String(a));
        const pts     = rArea.reduce((s,r)=>s+(r.non_applicabile?0:(r.valore||0)),0);
        const applicabiliArea = rArea.filter(r=>!r.non_applicabile).length;
        const maxArea = applicabiliArea*2;
        const pct     = maxArea>0?Math.round((pts/maxArea)*100):0;
        const domArea = DOMANDE_AUTOV_ADMIN.filter(d=>d.area===a);
        html+=`<div style="margin-bottom:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-weight:700;font-size:13px;color:var(--dark);">${a}. ${AREE_AUTOV_ADMIN[a-1]}</span>
                <span style="font-size:12px;font-weight:700;color:var(--teal);">${pts}/${maxArea}</span>
            </div>
            <div style="height:7px;background:#e2e8f0;border-radius:99px;overflow:hidden;margin-bottom:10px;">
                <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--teal),var(--teal-light));border-radius:99px;"></div>
            </div>
            <div style="display:flex;flex-direction:column;gap:5px;">`;
        domArea.forEach((dom,idx)=>{
            const r   = rArea.find(x=>x.domanda_id===idx);
            const p   = r?(r.non_applicabile?null:r.valore):null;
            const lbl = p===null?'N/A':p===0?'Mai':p===1?'A volte':'Sempre';
            const col = p===2?'#065f46':p===1?'#92400e':p===0?'#b91c1c':'#94a3b8';
            const bg  = p===2?'#d1fae5':p===1?'#fef3c7':p===0?'#fee2e2':'#f1f5f9';
            html+=`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:#f8fafc;border-radius:8px;gap:10px;">
                <span style="font-size:11px;color:#64748b;flex:1;">${dom.testo}</span>
                <span style="padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;background:${bg};color:${col};white-space:nowrap;">${lbl}</span>
            </div>`;
        });
        html+=`</div></div>`;
    }
    document.getElementById('adminRisposteDettaglio').innerHTML=html;
}

async function generaCertificatoAdmin(autovId){
    const a = _adminAutov.find(x=>x.id===autovId);
    if(!a) return;
    const nomeScuola  = a.scuole?.nome||'—';
    const comune      = a.scuole?.comune||'';
    const nomeBiologo = a.profiles?.nome||'—';
    const pts         = a.punteggio_totale;
    const maxPts      = a.punteggio_max||50;
    const pct         = Math.round((pts/maxPts)*100);
    const livello     = pct>=80?'Avanzato':pct>=60?'Intermedio':'Base';
    const dataStr     = a.compilata_il
        ? new Date(a.compilata_il).toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'})
        : new Date().toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'});

    const cert = window.open('','_blank');
    cert.document.write('<!DOCTYPE html><html><head><title>Certificato SANE</title></head><body style="font-family:sans-serif;padding:40px;color:#94a3b8;">Caricamento certificato…</body></html>');

    const {data:risposte} = await db.from('risposte_autovalutazione').select('area,valore,non_applicabile').eq('autovalutazione_id',autovId);
    const areeHtml = [1,2,3,4,5].map(n=>{
        const rArea = (risposte||[]).filter(r=>String(r.area)===String(n));
        const ptsA  = rArea.reduce((s,r)=>s+(r.non_applicabile?0:(r.valore||0)),0);
        const appA  = rArea.filter(r=>!r.non_applicabile).length;
        const maxA  = appA*2;
        const pctA  = maxA>0?Math.round((ptsA/maxA)*100):0;
        const colore = maxA===0?'#94a3b8':pctA>=70?'#00A896':pctA>=40?'#f59e0b':'#ef4444';
        const valLabel = maxA===0?'N/A':`${ptsA}/${maxA}`;
        return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;text-align:left;">
            <div style="flex:0 0 38%;font-size:11px;font-weight:600;color:#0A2647;">${n}. ${AREE_AUTOV_ADMIN[n-1]}</div>
            <div style="flex:1;height:7px;background:#e2e8f0;border-radius:99px;overflow:hidden;"><div style="height:100%;width:${pctA}%;background:${colore};border-radius:99px;"></div></div>
            <div style="flex:0 0 52px;text-align:right;font-size:11px;font-weight:700;color:${colore};">${valLabel}</div>
        </div>`;
    }).join('');

    cert.document.open();
    cert.document.write(`<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Certificato SANE — ${esc(nomeScuola)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <style>
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Inter',sans-serif;background:#f0f4f8;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:30px;}
        .cert{background:white;max-width:700px;width:100%;border:3px solid #00A896;border-radius:20px;padding:48px;text-align:center;box-shadow:0 8px 40px rgba(10,38,71,0.12);}
        h1,h2,h3{font-family:'Syne',sans-serif;}
        .header-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;text-align:left;}
        .score-big{font-family:'Syne',sans-serif;font-size:64px;font-weight:700;color:#00A896;line-height:1;}
        .divider{border:none;border-top:1px solid #e2e8f0;margin:28px 0;}
        .firma-row{display:flex;justify-content:space-between;text-align:left;}
        .aree-title{font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:14px;text-align:left;}
        @media print{body{background:white;padding:0;}.cert{box-shadow:none;border-radius:0;border-width:2px;}}
    </style></head><body>
    <div class="cert">
        <div class="header-row">
            <div>
                <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:#0A2647;">S.A.N.E. Italia</div>
                <div style="font-size:11px;color:#94a3b8;margin-top:3px;">Sistema di Alimentazione Naturale ed Educativa</div>
            </div>
        </div>
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.18em;margin-bottom:12px;">Certificato di Qualità Alimentare Scolastica</div>
        <h2 style="font-size:28px;color:#0A2647;margin-bottom:4px;">${esc(nomeScuola)}</h2>
        <p style="color:#64748b;font-size:13px;margin-bottom:28px;">Anno Scolastico ${a.anno_scolastico||'—'}${comune?' &middot; '+esc(comune):''}</p>
        <div class="score-big">${pts}/${maxPts}</div>
        <div style="font-size:20px;font-weight:700;color:#0A2647;margin:10px 0 18px;">Livello <span style="color:#00A896;">${livello}</span></div>
        <div style="display:inline-block;background:#00A896;color:white;padding:7px 24px;border-radius:99px;font-weight:700;font-size:13px;letter-spacing:0.05em;">★ Scuola Certificata SANE Italia</div>
        <hr class="divider">
        <div class="aree-title">Dettaglio per area</div>
        ${areeHtml}
        <hr class="divider">
        <div class="firma-row">
            <div>
                <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Biologo Responsabile</div>
                <div style="font-size:15px;font-weight:700;color:#0A2647;">${esc(nomeBiologo)}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Data Certificazione</div>
                <div style="font-size:15px;font-weight:700;color:#0A2647;">${dataStr}</div>
            </div>
        </div>
    </div>
    <script>window.onload=function(){setTimeout(()=>window.print(),300);}<\/script>
    </body></html>`);
    cert.document.close();
}

// ============================================================
// MODAL
// ============================================================
function openModal(id){
    if(id==='nuovoBiologoModal'){
        const sc = new Date(); sc.setFullYear(sc.getFullYear()+1);
        document.getElementById('bioScadenza').value = sc.toISOString().split('T')[0];
    }
    document.getElementById(id).classList.add('open');
}
function closeModal(id){ document.getElementById(id).classList.remove('open'); }

// ============================================================
// TOAST
// ============================================================
function showToast(msg, tipo){
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.borderLeftColor = tipo==='error' ? '#ef4444' : 'var(--teal)';
    t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'), 3200);
}

// ============================================================
// AVVIO — getSession immediato (affidabile su F5 e file locali)
// ============================================================
function hideInitLoader(){
    const el=document.getElementById('initLoader');
    if(!el) return;
    el.style.opacity='0';
    setTimeout(()=>{ el.style.display='none'; },400);
}

function showLoginScreen(){
    hideInitLoader();
    document.getElementById('loginScreen').classList.remove('hidden');
}

async function avviaAdmin(user){
    adminState.currentUserId = user.id;
    const { data: profilo } = await db.from('profiles').select('role,stato,nome,regione').eq('id', user.id).single();
    if(!profilo || (profilo.role !== 'admin' && profilo.role !== 'regional_admin')){
        document.getElementById('loginMsg').textContent = 'Accesso non autorizzato.';
        await db.auth.signOut();
        hideInitLoader();
        document.getElementById('loginScreen').classList.remove('hidden');
        return;
    }
    adminState.role = profilo.role || 'admin';
    adminState.regioneAdmin = profilo.regione || null;
    adminState.nomeAdmin = profilo.nome || user.email;
    hideInitLoader();
    document.getElementById('loginScreen').classList.add('hidden');
    setTimeout(async ()=>{
        document.getElementById('appShell').style.opacity='1';
        await inizializzaApp();
    }, 400);
}

db.auth.onAuthStateChange(async (event, session) => {
    if(event === 'SIGNED_IN' && session && !adminState.currentUserId){
        document.getElementById('loginScreen').classList.add('hidden');
        const el = document.getElementById('initLoader');
        if(el){ el.style.display='flex'; el.style.opacity='1'; }
        const msgEl = document.getElementById('initLoaderMsg');
        if(msgEl) msgEl.textContent = 'Server in avvio — attendere...';
        const _t = setTimeout(()=>{ hideInitLoader(); document.getElementById('loginScreen').classList.remove('hidden'); }, 12000);
        try { await avviaAdmin(session.user); clearTimeout(_t); }
        catch(err){ clearTimeout(_t); hideInitLoader(); document.getElementById('loginScreen').classList.remove('hidden'); }
    } else if(event === 'SIGNED_OUT'){
        window.location.href='portale.html';
    }
});

(async () => {
    try {
        const { data: { session } } = await db.auth.getSession();
        if(session){
            const el = document.getElementById('initLoader');
            if(el){ el.style.display='flex'; el.style.opacity='1'; }
            const msgEl = document.getElementById('initLoaderMsg');
            if(msgEl) msgEl.textContent = 'Server in avvio — attendere...';
            const _t = setTimeout(()=>{ hideInitLoader(); document.getElementById('loginScreen').classList.remove('hidden'); }, 12000);
            try { await avviaAdmin(session.user); clearTimeout(_t); }
            catch(err){ clearTimeout(_t); hideInitLoader(); document.getElementById('loginScreen').classList.remove('hidden'); }
        } else {
            hideInitLoader();
            document.getElementById('loginScreen').classList.remove('hidden');
        }
    } catch(e) {
        hideInitLoader();
        document.getElementById('loginScreen').classList.remove('hidden');
    }
})();
