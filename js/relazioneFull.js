// ============================================================
// relazioneFull.js — S.A.N.E. Italia
// Genera articolo scientifico HTML dal portale (dati reali Supabase)
// Struttura: Abstract · Introduzione · Metodi · Risultati · Discussione · Conclusioni · Bibliografia
// ============================================================

(function (global) {

    // ---- Mappa domande ----
    const DOMANDE_INFO = {
        d1:  { testo: 'Il Piatto Sano è composto da',                area: 'Conoscenze Nutrizionali', corretta: 'A' },
        d2:  { testo: 'Scelta più bilanciata al mattino',             area: 'Conoscenze Nutrizionali', corretta: 'A' },
        d3:  { testo: "L'acqua è importante perché",                  area: 'Conoscenze Nutrizionali', corretta: 'A' },
        d4:  { testo: 'Frequenza della colazione',                    area: 'Abitudini Alimentari',    corretta: 'A' },
        d5:  { testo: 'Consumo di frutta e verdura',                  area: 'Abitudini Alimentari',    corretta: 'A' },
        d6:  { testo: 'Consumo di bevande zuccherate',                area: 'Abitudini Alimentari',    corretta: 'A' },
        d7:  { testo: 'Definizione di allergia alimentare',           area: 'Allergie e Sicurezza',    corretta: 'A' },
        d8:  { testo: 'Comportamento con un compagno allergico',      area: 'Allergie e Sicurezza',    corretta: 'A' },
        d9:  { testo: 'Giorni di attività fisica settimanale',        area: 'Attività Fisica',         corretta: 'A' },
        d10: { testo: 'Lettura delle etichette alimentari',           area: 'Approfondimenti',         corretta: 'A' },
        d11: { testo: 'Conoscenza pregressa degli argomenti',         area: 'Approfondimenti',         corretta: 'A' },
        d12: { testo: 'Modifica della dieta per salute/scelta',       area: 'Approfondimenti',         corretta: 'A' },
        d13: { testo: "Opinione sull'educazione alimentare",          area: 'Approfondimenti',         corretta: 'A' },
        d_post: { testo: 'Cambiamento abitudini dopo il programma',   area: 'POST',                    corretta: 'A' },
    };

    const AREE_ORDINE = ['Conoscenze Nutrizionali','Abitudini Alimentari','Allergie e Sicurezza','Attività Fisica','Approfondimenti'];

    // ---- Statistiche ----
    function pctCorretta(arr, campo) {
        const rilevanti = arr.filter(r => r[campo] != null);
        if (!rilevanti.length) return null;
        return Math.round(rilevanti.filter(r => r[campo] === (DOMANDE_INFO[campo]?.corretta || 'A')).length / rilevanti.length * 100);
    }

    function distribuzione(arr, campo) {
        const rilevanti = arr.filter(r => r[campo] != null);
        const tot = rilevanti.length;
        if (!tot) return null;
        const res = { tot };
        ['A','B','C','D'].forEach(op => { res[op] = Math.round(rilevanti.filter(r => r[campo] === op).length / tot * 100); });
        return res;
    }

    function mediaScore(arr) {
        if (!arr.length) return null;
        return arr.reduce((a, r) => a + (parseFloat(r.punteggio) || 0), 0) / arr.length;
    }

    function dsScore(arr) {
        if (arr.length < 2) return null;
        const m = mediaScore(arr);
        const varianza = arr.reduce((a, r) => a + Math.pow((parseFloat(r.punteggio)||0) - m, 2), 0) / (arr.length - 1);
        return Math.sqrt(varianza);
    }

    function delta(post, pre) { return (post == null || pre == null) ? null : post - pre; }
    function deltaStr(d) { return d == null ? '—' : (d >= 0 ? '+' : '') + d.toFixed(1) + 'pp'; }
    function deltaColor(d) { return d == null ? '#888' : d > 2 ? '#155724' : d < -2 ? '#721c24' : '#856404'; }
    function deltaArrow(d) { return d == null ? '→' : d > 2 ? '▲' : d < -2 ? '▼' : '→'; }
    function fmtPct(n) { return n != null ? n.toFixed(0) + '%' : '—'; }
    function fmtNum(n, dec=2) { return n != null ? n.toFixed(dec) : '—'; }

    function mediaAreaCorrette(campiArea, arr) {
        const vals = campiArea.map(c => pctCorretta(arr, c)).filter(v => v != null);
        return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
    }

    // ---- Sezione Risultati per area ----
    function buildAreaResults(area, campiArea, pre, post) {
        const rows = campiArea.map(c => {
            const vPre  = pctCorretta(pre, c);
            const vPost = pctCorretta(post, c);
            const d     = delta(vPost, vPre);
            const nPre  = pre.filter(r => r[c] != null).length;
            const nPost = post.filter(r => r[c] != null).length;
            return `
            <tr>
                <td><strong>${c.toUpperCase()}</strong></td>
                <td>${DOMANDE_INFO[c]?.testo || c}</td>
                <td class="num">${nPre}</td>
                <td class="num">${fmtPct(vPre)}</td>
                <td class="num">${nPost}</td>
                <td class="num">${fmtPct(vPost)}</td>
                <td class="num" style="color:${deltaColor(d)};font-weight:700;">${deltaArrow(d)} ${deltaStr(d)}</td>
            </tr>`;
        }).join('');

        const chartId = 'chartArea_' + area.replace(/\W/g,'_');
        return { rows, chartId };
    }

    // ---- Raccomandazioni ----
    function raccomandazioni(campi, pre, post) {
        const recs = [];
        const check = (campo, soglia, rec) => {
            const v = pctCorretta(post.length ? post : pre, campo);
            if (v != null && v < soglia) recs.push(rec);
        };
        check('d1',70,{titolo:'Consolidare il modello del Piatto Sano',testo:'La comprensione del modello Harvard Healthy Eating Plate non ha ancora raggiunto la soglia di padronanza (≥70%). Si raccomanda di riproporre il modello attraverso supporti visivi interattivi e attività laboratoriali pratiche nei moduli successivi.'});
        check('d4',60,{titolo:'Promuovere l\'abitudine alla colazione quotidiana',testo:'La frequenza della colazione risulta inferiore alle raccomandazioni LARN (2014). È opportuno integrare nel programma materiali informativi destinati alle famiglie e alle scuole, con particolare attenzione all\'aspetto pratico della preparazione di una colazione bilanciata.'});
        check('d5',60,{titolo:'Incrementare il consumo di frutta e verdura',testo:'Il consumo di frutta e verdura risulta inferiore alle 5 porzioni giornaliere raccomandate dall\'OMS. Si suggerisce l\'implementazione di attività pratiche (ad es. percorsi "5 al giorno") e la collaborazione con la mensa scolastica.'});
        check('d6',65,{titolo:'Ridurre il consumo di bevande zuccherate',testo:'Un\'quota rilevante del campione non ha ancora interiorizzato la preferenza per l\'acqua rispetto alle bevande zuccherate. Si raccomanda l\'utilizzo di campagne visive in classe e l\'istituzione di "contratti comportamentali" di gruppo.'});
        check('d7',80,{titolo:'Approfondire la gestione delle allergie alimentari',testo:'La distinzione tra allergia e intolleranza alimentare presenta ancora margini di miglioramento. Una sessione dedicata con esempi clinici concreti e simulazioni pratiche è fortemente raccomandata.'});
        check('d9',70,{titolo:'Incentivare la pratica regolare di attività fisica',testo:'I livelli di attività fisica settimanale risultano inferiori alle raccomandazioni OMS (≥60 min/die). Si suggerisce una sinergia con i docenti di educazione fisica e l\'adozione di iniziative di "active school".'});
        if (!recs.length) {
            recs.push({titolo:'Mantenimento e rinforzo periodico',testo:'I risultati complessivi sono soddisfacenti. Si raccomanda di prevedere sessioni di rinforzo periodiche (ogni 3-4 mesi) per consolidare le conoscenze acquisite e prevenire il decadimento delle competenze nel tempo.'});
            recs.push({titolo:'Estensione del programma e follow-up longitudinale',testo:'Alla luce dei risultati positivi, si raccomanda di valutare l\'estensione del programma ad altre classi/istituti e la progettazione di uno studio di follow-up a 6-12 mesi per misurare la persistenza dei cambiamenti comportamentali.'});
        }
        recs.push({titolo:'Coinvolgimento delle famiglie',testo:'Le abitudini alimentari si consolidano principalmente nel contesto familiare. Si raccomanda l\'organizzazione di almeno un incontro informativo per i genitori e la distribuzione di materiali pratici (ricettari bilanciati, guide alla lettura delle etichette) da utilizzare a casa.'});
        recs.push({titolo:'Integrazione curricolare',testo:'[DA COMPLETARE — Indicare eventuali proposte di integrazione con il curricolo scolastico specifico dell\'istituto visitato, es. scienze, geografia alimentare, ecc.]'});
        return recs;
    }

    // ============================================================
    // GENERATORE PRINCIPALE
    // ============================================================
    async function generaRelazioneFull(argA, argB) {
        let pk, scuola, classi, biologo, sbClient;

        if (argB && typeof argB === 'object' && argB.pacchetti) {
            const pacchettoId = argA;
            const state = argB;
            pk       = state.pacchetti.find(p => p.id === pacchettoId);
            if (!pk) { alert('Pacchetto non trovato'); return; }
            scuola   = state.scuole.find(s => s.id === pk.scuola_id);
            classi   = state.classi.filter(c => c.pacchetto_id === pacchettoId);
            biologo  = state.utente || {};
            sbClient = global.supabase;
        } else {
            const data = argA;
            pk       = data.pacchetto  || {};
            scuola   = data.scuola     || {};
            classi   = data.classi     || [];
            biologo  = data.biologo    || {};
            sbClient = data.supabaseClient || global.supabase;
        }

        // Loading window
        const loadWin = window.open('', '_blank');
        if (!loadWin) { alert('Abilita i popup per aprire la relazione.'); return; }
        loadWin.document.write(`<!DOCTYPE html><html><body style="font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8f8f8;flex-direction:column;gap:16px;">
            <div style="font-size:2rem;">⏳</div>
            <p style="font-size:1rem;color:#333;">Caricamento dati in corso…</p>
        </body></html>`);

        // Fetch risposte
        const { data: risposte, error } = await sbClient
            .from('risposte').select('*').in('classe_id', classi.map(c => c.id));

        if (error) {
            loadWin.document.body.innerHTML = `<p style="color:red;padding:40px;font-family:Georgia;">Errore: ${error.message}</p>`;
            return;
        }

        const rows  = risposte || [];
        const pre   = rows.filter(r => r.tipo === 'PRE');
        const post  = rows.filter(r => r.tipo === 'POST');
        const oggi  = new Date().toLocaleDateString('it-IT', { day:'numeric', month:'long', year:'numeric' });
        const anno  = pk.anno_scolastico || new Date().getFullYear();

        const haD10 = rows.some(r => r.d10 != null);
        const haD12 = rows.some(r => r.d12 != null);
        const campiBase = ['d1','d2','d3','d4','d5','d6','d7','d8','d9'];
        const campiB    = haD10 ? ['d10','d11'] : [];
        const campiC    = haD12 ? ['d12','d13'] : [];
        const tuttiCampi = [...campiBase, ...campiB, ...campiC];
        const versione  = haD12 ? 'C' : haD10 ? 'B' : 'A';
        const nDomande  = tuttiCampi.length;

        const nPre  = pre.length;
        const nPost = post.length;
        const nTot  = Math.max(nPre, nPost);

        const avgPre  = mediaScore(pre);
        const avgPost = mediaScore(post);
        const dsPre   = dsScore(pre);
        const dsPost  = dsScore(post);
        const deltaMedia = delta(avgPost, avgPre);

        // Score su scala 0-100
        const scorePre100  = avgPre  != null ? (avgPre  / nDomande * 100) : null;
        const scorePost100 = avgPost != null ? (avgPost / nDomande * 100) : null;

        // Totale ore erogate
        const oreErogate = classi.reduce((a,c) =>
            a + ['m1','m2','m3','m4','m5','m6'].reduce((s,m) => s+(parseFloat(c[m+'_ore'])||0), 0), 0);
        const totStudenti = classi.reduce((a,c) => a+(c.num_studenti||0), 0);

        // ---- Tabella classi ----
        const classiRows = classi.map(c => {
            const oreC = ['m1','m2','m3','m4','m5','m6'].reduce((a,m)=>a+(parseFloat(c[m+'_ore'])||0),0);
            const modC = ['m1','m2','m3','m4','m5','m6'].filter(m=>c[m+'_data']).length;
            const nPreC  = pre.filter(r=>r.classe_id===c.id).length;
            const nPostC = post.filter(r=>r.classe_id===c.id).length;
            return `<tr>
                <td><strong>${c.nome_classe||'—'}</strong></td>
                <td class="num">${c.tipo_scuola||'—'}</td>
                <td class="num">${c.num_studenti||'—'}</td>
                <td class="num">${oreC.toFixed(1)}</td>
                <td class="num">${modC}/6</td>
                <td class="num">${nPreC}</td>
                <td class="num">${nPostC}</td>
                <td class="num">${c.score_pre!=null?c.score_pre:'—'} → ${c.score_post!=null?c.score_post:'—'}</td>
            </tr>`;
        }).join('');

        // ---- Risultati per area ----
        const areeDisponibili = AREE_ORDINE.filter(a => tuttiCampi.some(c => DOMANDE_INFO[c]?.area === a));
        const areeMap = {};
        areeDisponibili.forEach(a => { areeMap[a] = tuttiCampi.filter(c => DOMANDE_INFO[c]?.area === a); });

        let sezioniHTML = '';
        let sezioniNum  = 1;
        let graficiScript = '';

        areeDisponibili.forEach(area => {
            const campiArea = areeMap[area];
            const { rows: areaRows, chartId } = buildAreaResults(area, campiArea, pre, post);

            const mPre  = mediaAreaCorrette(campiArea, pre);
            const mPost = mediaAreaCorrette(campiArea, post);
            const dArea = delta(mPost, mPre);
            const badgeColor = mPost != null ? (mPost>=80?'badge-green':mPost>=60?'badge-yellow':'badge-red') : 'badge-gray';
            const badgeLabel = mPost != null ? (mPost>=80?'Ottimo':mPost>=60?'Sufficiente':'Da rafforzare') : 'N/D';

            const hasPre  = campiArea.some(c => pctCorretta(pre, c) != null);
            const hasPost = campiArea.some(c => pctCorretta(post, c) != null);

            // Grafici per quest'area
            if (hasPre || hasPost) {
                const labels   = JSON.stringify(campiArea.map(c => c.toUpperCase()));
                const dataPre  = JSON.stringify(campiArea.map(c => pctCorretta(pre, c)));
                const dataPost = JSON.stringify(campiArea.map(c => pctCorretta(post, c)));
                graficiScript += `
if(document.getElementById('${chartId}')){
  new Chart(document.getElementById('${chartId}'),{
    type:'bar',
    data:{
      labels:${labels},
      datasets:[
        ${hasPre  ? `{label:'PRE (n=${nPre})',data:${dataPre},backgroundColor:'rgba(52,78,118,0.75)',borderRadius:4},`:''}
        ${hasPost ? `{label:'POST (n=${nPost})',data:${dataPost},backgroundColor:'rgba(200,50,50,0.75)',borderRadius:4},`:''}
      ]
    },
    options:{responsive:true,maintainAspectRatio:false,
      scales:{
        y:{min:0,max:100,ticks:{callback:v=>v+'%'},title:{display:true,text:'% risposte corrette'},grid:{color:'#eee'}},
        x:{grid:{display:false}}
      },
      plugins:{legend:{position:'top'},tooltip:{callbacks:{label:ctx=>ctx.dataset.label+': '+ctx.parsed.y+'%'}}}
    }
  });
}`;
            }

            // Grafico distribuzione per ogni domanda
            campiArea.forEach(c => {
                const dId   = 'dist_'+c;
                const dPre  = distribuzione(pre, c);
                const dPost = distribuzione(post, c);
                if (!dPre && !dPost) return;
                const ds = [];
                if (dPre)  ds.push(`{label:'PRE',data:[${['A','B','C','D'].map(o=>dPre[o]||0).join(',')}],backgroundColor:'rgba(52,78,118,0.75)',borderRadius:3}`);
                if (dPost) ds.push(`{label:'POST',data:[${['A','B','C','D'].map(o=>dPost[o]||0).join(',')}],backgroundColor:'rgba(200,50,50,0.75)',borderRadius:3}`);
                graficiScript += `
if(document.getElementById('${dId}')){
  new Chart(document.getElementById('${dId}'),{
    type:'bar',
    data:{labels:['A (corretta)','B','C','D'],datasets:[${ds.join(',')}]},
    options:{responsive:true,maintainAspectRatio:false,
      scales:{y:{min:0,max:100,ticks:{callback:v=>v+'%'},grid:{color:'#eee'}},x:{grid:{display:false}}},
      plugins:{legend:{position:'top'}}
    }
  });
}`;
            });

            // HTML sezione
            const distCardsHTML = campiArea.map(c => {
                const dPre  = distribuzione(pre, c);
                const dPost = distribuzione(post, c);
                if (!dPre && !dPost) return '';
                return `
                <div class="dist-card">
                    <div class="dist-title">${c.toUpperCase()} — ${DOMANDE_INFO[c]?.testo||c}</div>
                    <div class="chart-wrap-sm"><canvas id="dist_${c}"></canvas></div>
                </div>`;
            }).join('');

            sezioniHTML += `
            <div class="art-section">
                <h3>3.${sezioniNum} ${area}</h3>
                <div class="area-header">
                    <span class="badge ${badgeColor}">${badgeLabel}</span>
                    ${mPre!=null?`<span class="area-stat">Media PRE: <strong>${fmtPct(mPre)}</strong></span>`:''}
                    ${mPost!=null?`<span class="area-stat">Media POST: <strong>${fmtPct(mPost)}</strong></span>`:''}
                    ${dArea!=null?`<span class="area-stat" style="color:${deltaColor(dArea)};font-weight:700;">${deltaArrow(dArea)} Δ ${deltaStr(dArea)}</span>`:''}
                </div>

                ${(hasPre||hasPost)?`
                <figure class="fig">
                    <div style="height:240px;"><canvas id="${chartId}"></canvas></div>
                    <figcaption>Figura ${sezioniNum}. Percentuale di risposte corrette PRE e POST per le domande dell'area "${area}".</figcaption>
                </figure>`:''}

                <div class="overflow-x">
                <table class="sci-table">
                    <thead><tr>
                        <th>Item</th><th>Domanda</th>
                        <th class="num">n PRE</th><th class="num">% PRE</th>
                        <th class="num">n POST</th><th class="num">% POST</th>
                        <th class="num">Δ</th>
                    </tr></thead>
                    <tbody>${areaRows}</tbody>
                </table>
                </div>
                <p class="table-note">Nota: % = percentuale di risposte corrette; Δ = differenza in punti percentuali (POST – PRE). A = risposta corretta per tutti gli item.</p>

                ${distCardsHTML ? `
                <h4>Distribuzione delle risposte per item</h4>
                <div class="dist-grid">${distCardsHTML}</div>` : ''}

                <div class="callout callout-blue">
                    <strong>Interpretazione:</strong> [DA COMPLETARE — Descrivere qui le osservazioni specifiche sull'area "${area}" nel contesto dell'istituto ${scuola?.nome||''}. Commentare eventuali differenze tra classi, età, genere o altri fattori contestuali osservati durante la somministrazione.]
                </div>
            </div>`;

            sezioniNum++;
        });

        // ---- Tabella confronto globale ----
        const confrontoRows = tuttiCampi.map(c => {
            const vPre  = pctCorretta(pre, c);
            const vPost = pctCorretta(post, c);
            const d     = delta(vPost, vPre);
            return `<tr>
                <td><strong>${c.toUpperCase()}</strong></td>
                <td>${DOMANDE_INFO[c]?.testo||c}</td>
                <td>${DOMANDE_INFO[c]?.area||'—'}</td>
                <td class="num">${fmtPct(vPre)}</td>
                <td class="num">${fmtPct(vPost)}</td>
                <td class="num" style="color:${deltaColor(d)};font-weight:700;">${deltaArrow(d)} ${deltaStr(d)}</td>
            </tr>`;
        }).join('');

        // Grafico globale orizzontale
        graficiScript += `
if(document.getElementById('chartGlobale')){
  new Chart(document.getElementById('chartGlobale'),{
    type:'bar',
    data:{
      labels:${JSON.stringify(tuttiCampi.map(c=>c.toUpperCase()+' — '+DOMANDE_INFO[c]?.testo))},
      datasets:[
        {label:'PRE',data:${JSON.stringify(tuttiCampi.map(c=>pctCorretta(pre,c)))},backgroundColor:'rgba(52,78,118,0.75)',borderRadius:3},
        {label:'POST',data:${JSON.stringify(tuttiCampi.map(c=>pctCorretta(post,c)))},backgroundColor:'rgba(200,50,50,0.75)',borderRadius:3}
      ]
    },
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
      scales:{
        x:{min:0,max:100,ticks:{callback:v=>v+'%'},grid:{color:'#eee'},title:{display:true,text:'% risposte corrette'}},
        y:{grid:{display:false},ticks:{font:{size:11}}}
      },
      plugins:{legend:{position:'top'},tooltip:{callbacks:{label:ctx=>ctx.dataset.label+': '+ctx.parsed.x+'%'}}}
    }
  });
}`;

        const recos = raccomandazioni(tuttiCampi, pre, post);
        const recosHTML = recos.map((r,i) => `
        <div class="reco-item">
            <div class="reco-num">${i+1}</div>
            <div>
                <div class="reco-title">${r.titolo}</div>
                <div class="reco-body">${r.testo}</div>
            </div>
        </div>`).join('');

        // Abstract automatico
        const abstractRisultati = avgPre!=null && avgPost!=null
            ? `Il punteggio medio è passato da ${fmtNum(avgPre)} ± ${fmtNum(dsPre)} (PRE) a ${fmtNum(avgPost)} ± ${fmtNum(dsPost)} (POST) su una scala di ${nDomande} punti (pari al ${fmtPct(scorePre100)} e al ${fmtPct(scorePost100)} su scala percentuale), con un incremento di ${deltaStr(deltaMedia)} punti.`
            : `Sono stati raccolti ${nPre} questionari PRE e ${nPost} questionari POST.`;

        // ============================================================
        // HTML ARTICOLO SCIENTIFICO
        // ============================================================
        const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Articolo Scientifico — ${scuola?.nome||'S.A.N.E.'} · ${anno}</title>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Source+Sans+3:wght@300;400;600;700&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"><\/script>
<style>
:root{
  --blue-dark:#1e3a5f;--blue-mid:#344e76;--blue-light:#6b8cba;
  --red:#c83232;--gold:#c8860a;
  --ink:#1a1a1a;--muted:#555;--border:#d0d0d0;--bg:#fafafa;--white:#fff;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'EB Garamond',Georgia,serif;background:var(--bg);color:var(--ink);font-size:17px;line-height:1.75;}
.sans{font-family:'Source Sans 3',Arial,sans-serif;}

/* ---- LAYOUT ---- */
.journal-wrap{max-width:860px;margin:0 auto;padding:60px 40px 100px;}
@media(max-width:640px){.journal-wrap{padding:30px 18px 80px;}}

/* ---- HEADER ---- */
.journal-header{border-top:4px solid var(--blue-dark);border-bottom:1px solid var(--border);padding:28px 0 22px;margin-bottom:36px;}
.journal-tag{font-family:'Source Sans 3',sans-serif;font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;color:var(--blue-mid);font-weight:700;margin-bottom:12px;}
.art-title{font-size:2rem;font-weight:700;line-height:1.25;color:var(--blue-dark);margin-bottom:14px;}
.art-subtitle{font-size:1.05rem;font-weight:400;font-style:italic;color:var(--muted);margin-bottom:20px;}
.art-meta{font-family:'Source Sans 3',sans-serif;font-size:.82rem;color:var(--muted);display:flex;flex-wrap:wrap;gap:18px;}
.art-meta span{display:flex;align-items:center;gap:5px;}

/* ---- ABSTRACT ---- */
.abstract-box{background:#f0f4f9;border-left:4px solid var(--blue-dark);border-radius:0 8px 8px 0;padding:24px 28px;margin-bottom:36px;}
.abstract-box h2{font-family:'Source Sans 3',sans-serif;font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:var(--blue-mid);font-weight:700;margin-bottom:14px;}
.abstract-row{margin-bottom:10px;font-size:.95rem;line-height:1.65;}
.abstract-row strong{color:var(--blue-dark);}
.keywords{margin-top:16px;padding-top:14px;border-top:1px solid #c5d3e2;font-size:.85rem;color:var(--muted);}
.keywords strong{color:var(--ink);}

/* ---- SEZIONI ---- */
.art-section{margin-bottom:52px;}
h2.sec-h{font-size:1.15rem;font-family:'Source Sans 3',sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--blue-dark);border-bottom:2px solid var(--blue-dark);padding-bottom:6px;margin-bottom:22px;}
h3{font-size:1.15rem;font-weight:600;color:var(--blue-dark);margin-bottom:14px;margin-top:28px;}
h4{font-size:1rem;font-family:'Source Sans 3',sans-serif;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin:22px 0 10px;}
p{margin-bottom:14px;color:#222;}
p.da-completare{background:#fffbeb;border:1.5px dashed #f0b429;border-radius:6px;padding:12px 16px;color:#7a4f00;font-style:italic;font-size:.93rem;}
p.da-completare::before{content:'✏️ DA COMPLETARE — ';font-style:normal;font-weight:700;}

/* ---- TABELLE ---- */
.overflow-x{overflow-x:auto;margin-bottom:8px;}
.sci-table{width:100%;border-collapse:collapse;font-size:.85rem;font-family:'Source Sans 3',sans-serif;}
.sci-table thead th{background:var(--blue-dark);color:#fff;padding:9px 12px;text-align:left;font-weight:600;font-size:.78rem;letter-spacing:.04em;}
.sci-table thead th.num{text-align:center;}
.sci-table tbody tr:nth-child(even){background:#f2f6fb;}
.sci-table tbody td{padding:8px 12px;border-bottom:1px solid #dde4ee;font-size:.85rem;vertical-align:middle;}
.sci-table tbody td.num{text-align:center;}
.sci-table tbody tr:last-child td{border-bottom:none;}
.table-note{font-size:.78rem;color:var(--muted);margin-top:6px;margin-bottom:20px;font-family:'Source Sans 3',sans-serif;}
.table-caption{font-size:.82rem;font-style:italic;color:var(--muted);text-align:center;margin-bottom:20px;font-family:'Source Sans 3',sans-serif;}

/* ---- FIGURE ---- */
figure.fig{margin:24px 0;}
figure.fig figcaption{font-size:.82rem;font-style:italic;color:var(--muted);text-align:center;margin-top:10px;font-family:'Source Sans 3',sans-serif;}
.chart-wrap-full{height:280px;position:relative;}
.chart-wrap-sm{height:200px;position:relative;}

/* ---- AREA HEADER ---- */
.area-header{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px;font-family:'Source Sans 3',sans-serif;}
.area-stat{font-size:.88rem;color:var(--muted);}
.badge{display:inline-block;padding:3px 10px;border-radius:4px;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;font-family:'Source Sans 3',sans-serif;}
.badge-green{background:#d4edda;color:#155724;}
.badge-yellow{background:#fff3cd;color:#856404;}
.badge-red{background:#f8d7da;color:#721c24;}
.badge-gray{background:#e2e3e5;color:#383d41;}

/* ---- DISTRIBUZIONE ---- */
.dist-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:20px;margin:16px 0 24px;}
.dist-card{background:var(--white);border:1px solid var(--border);border-radius:8px;padding:18px 16px;}
.dist-title{font-family:'Source Sans 3',sans-serif;font-size:.82rem;font-weight:700;color:var(--blue-dark);margin-bottom:12px;}

/* ---- CALLOUT ---- */
.callout{border-radius:6px;padding:16px 20px;margin:20px 0;font-size:.93rem;font-family:'Source Sans 3',sans-serif;line-height:1.6;}
.callout-blue{background:#ebf2fb;border-left:4px solid var(--blue-mid);color:#1a2d4a;}
.callout-yellow{background:#fffbeb;border-left:4px solid #f0b429;color:#7a4f00;}
.callout-green{background:#edfaf1;border-left:4px solid #28a745;color:#155724;}

/* ---- KPI ---- */
.kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px;margin:20px 0 32px;}
.kpi-box{background:var(--white);border:1px solid var(--border);border-radius:8px;padding:18px 16px;text-align:center;}
.kpi-box .kpi-lbl{font-family:'Source Sans 3',sans-serif;font-size:.7rem;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:8px;font-weight:700;}
.kpi-box .kpi-val{font-size:1.8rem;font-weight:700;color:var(--blue-dark);line-height:1;margin-bottom:4px;}
.kpi-box .kpi-sub{font-family:'Source Sans 3',sans-serif;font-size:.75rem;color:var(--muted);}
.kpi-box.accent{border-top:3px solid var(--blue-dark);}
.kpi-box.accent-red{border-top:3px solid var(--red);}

/* ---- RACCOMANDAZIONI ---- */
.reco-item{display:flex;gap:16px;margin-bottom:20px;align-items:flex-start;}
.reco-num{flex-shrink:0;width:28px;height:28px;background:var(--blue-dark);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Source Sans 3',sans-serif;font-weight:700;font-size:.85rem;margin-top:2px;}
.reco-title{font-weight:700;color:var(--blue-dark);margin-bottom:4px;font-family:'Source Sans 3',sans-serif;font-size:.95rem;}
.reco-body{font-size:.9rem;color:#333;line-height:1.65;}

/* ---- BIBLIOGRAFIA ---- */
.ref-list{list-style:none;counter-reset:refs;}
.ref-list li{counter-increment:refs;display:flex;gap:10px;margin-bottom:10px;font-size:.88rem;line-height:1.6;}
.ref-list li::before{content:counter(refs)'.';font-weight:700;color:var(--blue-mid);min-width:22px;flex-shrink:0;font-family:'Source Sans 3',sans-serif;}

/* ---- FIRMA ---- */
.firma-section{border:1px solid var(--border);border-radius:8px;padding:32px 36px;margin-top:40px;}
.firma-line{border-bottom:1.5px solid var(--blue-dark);width:260px;margin:48px 0 6px;}
.firma-label{font-family:'Source Sans 3',sans-serif;font-size:.82rem;color:var(--muted);}

/* ---- FOOTER ---- */
.art-footer{background:var(--blue-dark);color:rgba(255,255,255,.55);text-align:center;padding:28px 20px;font-family:'Source Sans 3',sans-serif;font-size:.78rem;margin-top:60px;}
.art-footer strong{color:rgba(255,255,255,.85);}

/* ---- PRINT ---- */
@media print{
  body{font-size:11pt;background:white;}
  .journal-wrap{max-width:100%;padding:0 20pt;}
  .chart-wrap-full{height:200px!important;}
  .chart-wrap-sm{height:150px!important;}
  .dist-grid{grid-template-columns:1fr 1fr!important;}
  .no-print{display:none!important;}
  h2.sec-h,h3{page-break-after:avoid;}
  .art-section{page-break-inside:avoid;}
  figure.fig{page-break-inside:avoid;}
}
</style>
</head>
<body>

<div class="journal-wrap">

<!-- ===== TESTATA ===== -->
<div class="journal-header">
  <div class="journal-tag">S.A.N.E. Italia · Progetto Mangiare Bene · Anno Scolastico ${anno}</div>
  <h1 class="art-title">Valutazione dell'Efficacia di un Intervento di Educazione Alimentare nelle Scuole:<br>Studio Pre-Post su Conoscenze, Abitudini e Stili di Vita</h1>
  <p class="art-subtitle">An evaluation of a school-based nutritional education program using pre-post questionnaire design</p>
  <div class="art-meta sans">
    <span>✍️ <strong>${biologo.nome||'[Autore]'}</strong>, Biologo Nutrizionista${biologo.ordine?' · N° Ordine: '+biologo.ordine:''}</span>
    <span>🏫 ${scuola?.nome||'[Istituto]'}${scuola?.comune?', '+scuola.comune:''}</span>
    <span>📅 ${oggi}</span>
    <span>📋 Versione questionario: ${versione}</span>
  </div>
</div>

<!-- ===== ABSTRACT ===== -->
<div class="abstract-box">
  <h2>Abstract</h2>
  <div class="abstract-row"><strong>Background.</strong> L'obesità infantile e le scorrette abitudini alimentari rappresentano una delle principali sfide di salute pubblica in Italia e in Europa. I programmi di educazione alimentare nelle scuole costituiscono uno strumento di prevenzione primaria raccomandato dall'Organizzazione Mondiale della Sanità (OMS) e dalle Linee Guida per la Sana Alimentazione Italiana (CREA, 2018).</div>
  <div class="abstract-row"><strong>Obiettivi.</strong> Valutare l'efficacia del Progetto S.A.N.E. "Mangiare Bene" nel migliorare le conoscenze nutrizionali, le abitudini alimentari e la consapevolezza sull'attività fisica di studenti in età scolare, attraverso un disegno pre-sperimentale a misure ripetute (PRE-POST).</div>
  <div class="abstract-row"><strong>Metodi.</strong> Sono stati coinvolti ${nTot} studenti di ${classi.length} class${classi.length===1?'e':'i'} dell'Istituto ${scuola?.nome||'[Istituto]'}, ${scuola?.comune||''}. Il programma ha previsto ${classi[0]?.tipo_pacchetto||6} moduli didattici per un totale di ${oreErogate.toFixed(0)} ore erogate. La valutazione è stata condotta tramite questionario a risposta multipla (versione ${versione}, ${nDomande} item) somministrato prima (PRE, n=${nPre}) e dopo (POST, n=${nPost}) l'intervento.</div>
  <div class="abstract-row"><strong>Risultati.</strong> ${abstractRisultati} ${deltaMedia!=null&&deltaMedia>0?`Il miglioramento osservato (Δ = ${deltaStr(deltaMedia)}) indica un effetto positivo dell'intervento sulle conoscenze nutrizionali del campione.`:deltaMedia!=null&&deltaMedia<0?`Si osserva una variazione negativa (Δ = ${deltaStr(deltaMedia)}) che richiede un'analisi approfondita delle cause (si veda la Discussione).`:'I dati disponibili sono parziali (solo fase PRE o POST).'}</div>
  <div class="abstract-row"><strong>Conclusioni.</strong> [DA COMPLETARE — Sintesi delle conclusioni principali e delle implicazioni per la pratica professionale e la salute pubblica.]</div>
  <div class="keywords"><strong>Parole chiave:</strong> educazione alimentare, scuola, studio pre-post, nutrizione pediatrica, promozione della salute, prevenzione obesità infantile</div>
</div>

<!-- ===== 1. INTRODUZIONE ===== -->
<div class="art-section">
  <h2 class="sec-h">1. Introduzione</h2>
  <p>L'obesità infantile è un problema di salute pubblica di rilevanza globale. Secondo i dati OMS (2023), il 39% dei bambini in età scolare nei Paesi europei presenta sovrappeso o obesità, con trend in costante aumento negli ultimi tre decenni [1]. In Italia, il programma di sorveglianza OKkio alla SALUTE (ISS, 2023) stima che il 20,4% dei bambini tra 8 e 9 anni sia in sovrappeso e l'8,9% sia obeso [2].</p>
  <p>L'adozione precoce di corrette abitudini alimentari e di uno stile di vita attivo rappresenta un fattore protettivo fondamentale. La scuola costituisce il contesto privilegiato per l'implementazione di interventi preventivi, in quanto raggiunge in modo sistematico tutta la popolazione in età evolutiva, indipendentemente dal background socioeconomico familiare [3].</p>
  <p>Le evidenze scientifiche disponibili indicano che i programmi strutturati di educazione alimentare scolastica, quando fondati su approcci basati sulle competenze (<em>life skills</em>) e integrati nel curricolo, producono miglioramenti significativi nelle conoscenze nutrizionali e nelle abitudini alimentari [4,5]. Il Modello del Piatto Sano (Harvard T.H. Chan School of Public Health, 2011), adottato dal Progetto S.A.N.E. come framework educativo, offre una rappresentazione visiva accessibile e scientificamente validata dei principi di una dieta equilibrata [6].</p>

  <div class="callout callout-yellow">
    [DA COMPLETARE — Descrivere qui le motivazioni specifiche che hanno portato all'implementazione del progetto in questo istituto: es. richiesta della dirigenza scolastica, segnalazioni dei docenti, risultati di indagini preliminari sul territorio, ecc.]
  </div>

  <p>Il presente studio si propone di valutare l'efficacia del Progetto Mangiare Bene dell'associazione S.A.N.E. Italia nell'istituto ${scuola?.nome||'[Istituto]'} durante l'anno scolastico ${anno}, mediante un disegno di ricerca pre-sperimentale a misure ripetute (pre-post test).</p>
</div>

<!-- ===== 2. MATERIALI E METODI ===== -->
<div class="art-section">
  <h2 class="sec-h">2. Materiali e Metodi</h2>

  <h3>2.1 Disegno dello studio</h3>
  <p>È stato adottato un disegno pre-sperimentale a misure ripetute (one-group pretest-posttest design) [7]. La valutazione è stata condotta in due fasi: una rilevazione iniziale (PRE) effettuata prima dell'avvio del programma educativo e una rilevazione finale (POST) al termine dell'ultimo modulo didattico.</p>

  <h3>2.2 Popolazione e campione</h3>
  <p>Il programma ha coinvolto ${classi.length} class${classi.length===1?'e':'i'} dell'Istituto ${scuola?.nome||'[Istituto]'}${scuola?.comune?', '+scuola.comune:''}, per un totale di ${totStudenti} studenti iscritti. La partecipazione al questionario è avvenuta su base volontaria e con il consenso della dirigenza scolastica.</p>

  <div class="overflow-x">
  <table class="sci-table">
    <caption class="table-caption" style="text-align:left;margin-bottom:8px;"><strong>Tabella 1.</strong> Caratteristiche del campione per classe.</caption>
    <thead><tr>
      <th>Classe</th><th>Tipo scuola</th><th class="num">N iscritti</th>
      <th class="num">Ore erogate</th><th class="num">Moduli</th>
      <th class="num">n PRE</th><th class="num">n POST</th>
      <th class="num">Score PRE→POST</th>
    </tr></thead>
    <tbody>${classiRows}</tbody>
  </table>
  </div>
  <p class="table-note">Score = punteggio grezzo (n. risposte corrette su ${nDomande} item). Ore erogate = somma delle ore per tutti i moduli completati.</p>

  <h3>2.3 Il programma educativo</h3>
  <p>Il Progetto Mangiare Bene è strutturato in 6 moduli tematici progressivi, ciascuno della durata di ${oreErogate>0&&classi.length>0?(oreErogate/classi.length/6).toFixed(1):'[n]'} ore, per un totale di ${oreErogate.toFixed(0)} ore erogate nel complesso. I moduli affrontano le seguenti aree tematiche: ${AREE_ORDINE.filter(a=>areeDisponibili.includes(a)).join(', ')}. Il programma è erogato da un Biologo Nutrizionista abilitato, con utilizzo di supporti visivi, attività interattive e materiali didattici dedicati.</p>

  <h3>2.4 Strumento di valutazione</h3>
  <p>La valutazione è stata condotta mediante un questionario a scelta multipla (4 alternative di risposta, una sola corretta) composto da ${nDomande} item (versione ${versione}). Il questionario indaga le seguenti dimensioni: ${AREE_ORDINE.filter(a=>areeDisponibili.includes(a)).map(a=>`<em>${a}</em> (${(areeMap[a]||[]).length} item)`).join(', ')}. Per ogni item, la risposta "A" corrisponde sempre alla risposta scientificamente corretta. Il punteggio totale grezzo varia da 0 a ${nDomande}; ai fini dell'analisi è stato convertito in percentuale su scala 0-100.</p>

  <h3>2.5 Analisi statistica</h3>
  <p>I dati sono stati analizzati in modo descrittivo. Sono state calcolate: frequenza assoluta e relativa (%) delle risposte corrette per ogni item; punteggio medio ± deviazione standard (DS) per fase (PRE e POST); differenza in punti percentuali (Δ = POST – PRE) per ogni item e per ogni area tematica. L'analisi è stata condotta con strumenti di calcolo automatizzato integrati nel portale S.A.N.E. Italia.</p>
  <div class="callout callout-yellow">
    [DA COMPLETARE — Se sono stati utilizzati test statistici inferenziali (es. t di Student per campioni appaiati, test di Wilcoxon) inserire qui i dettagli. Indicare il livello di significatività adottato (es. α = 0.05) e il software utilizzato per l'analisi.]
  </div>
</div>

<!-- ===== 3. RISULTATI ===== -->
<div class="art-section">
  <h2 class="sec-h">3. Risultati</h2>

  <h3>3.0 Panoramica generale</h3>
  <div class="kpi-row">
    <div class="kpi-box accent">
      <div class="kpi-lbl">Studenti coinvolti</div>
      <div class="kpi-val">${nTot}</div>
      <div class="kpi-sub">PRE: ${nPre} · POST: ${nPost}</div>
    </div>
    ${avgPre!=null?`
    <div class="kpi-box accent">
      <div class="kpi-lbl">Score medio PRE</div>
      <div class="kpi-val">${fmtPct(scorePre100)}</div>
      <div class="kpi-sub">${fmtNum(avgPre)}/${nDomande} (DS: ${fmtNum(dsPre)})</div>
    </div>`:''}
    ${avgPost!=null?`
    <div class="kpi-box accent-red">
      <div class="kpi-lbl">Score medio POST</div>
      <div class="kpi-val">${fmtPct(scorePost100)}</div>
      <div class="kpi-sub">${fmtNum(avgPost)}/${nDomande} (DS: ${fmtNum(dsPost)})</div>
    </div>`:''}
    ${deltaMedia!=null?`
    <div class="kpi-box">
      <div class="kpi-lbl">Variazione PRE→POST</div>
      <div class="kpi-val" style="color:${deltaColor(deltaMedia)};">${deltaStr(deltaMedia)}</div>
      <div class="kpi-sub">in punti percentuali</div>
    </div>`:''}
    <div class="kpi-box">
      <div class="kpi-lbl">Ore erogate totali</div>
      <div class="kpi-val">${oreErogate.toFixed(0)}</div>
      <div class="kpi-sub">su ${classi.length} class${classi.length===1?'e':'i'}</div>
    </div>
  </div>

  ${nPre&&nPost?`
  <figure class="fig">
    <div class="chart-wrap-full"><canvas id="chartGlobale"></canvas></div>
    <figcaption>Figura 1. Percentuale di risposte corrette per item — confronto PRE (blu) vs POST (rosso). L'asse orizzontale rappresenta la percentuale di risposte corrette (0-100%).</figcaption>
  </figure>`:''}

  <!-- Tabella confronto globale -->
  <h4>Tabella 2. Confronto PRE-POST per tutti gli item</h4>
  <div class="overflow-x">
  <table class="sci-table">
    <thead><tr>
      <th>Item</th><th>Contenuto</th><th>Area</th>
      <th class="num">% PRE</th><th class="num">% POST</th><th class="num">Δ</th>
    </tr></thead>
    <tbody>${confrontoRows}</tbody>
  </table>
  </div>
  <p class="table-note">% = percentuale di risposte corrette; Δ = differenza in punti percentuali (POST – PRE); pp = punti percentuali. ▲ = miglioramento; ▼ = peggioramento; → = variazione < 2pp.</p>

  <!-- Sezioni per area -->
  ${sezioniHTML}
</div>

<!-- ===== 4. DISCUSSIONE ===== -->
<div class="art-section">
  <h2 class="sec-h">4. Discussione</h2>
  <p>I risultati dello studio mostrano ${deltaMedia!=null?deltaMedia>5?'un miglioramento complessivo delle conoscenze nutrizionali degli studenti al termine del programma':deltaMedia>0?'una variazione positiva, seppur moderata, nelle conoscenze nutrizionali degli studenti':'una variazione da approfondire nelle conoscenze nutrizionali degli studenti':'dati parziali che richiedono un completamento della raccolta'}. ${avgPre!=null&&avgPost!=null?`Il punteggio medio è passato da ${fmtNum(avgPre)} ± ${fmtNum(dsPre)} (PRE) a ${fmtNum(avgPost)} ± ${fmtNum(dsPost)} (POST) su ${nDomande} item totali.`:''}</p>

  <div class="callout callout-yellow">
    [DA COMPLETARE — Interpretare i risultati confrontandoli con la letteratura esistente. Ad esempio: "I risultati ottenuti sono in linea con quelli riportati da Rossi et al. (2022) [ref] in un campione di studenti di scuola primaria, che hanno osservato un incremento medio del X% nelle conoscenze nutrizionali a seguito di un programma strutturato di 6 moduli." Commentare le aree con maggiore e minore miglioramento e proporre possibili spiegazioni.]
  </div>

  <h3>4.1 Punti di forza</h3>
  <div class="callout callout-green">
    [DA COMPLETARE — Descrivere i principali punti di forza osservati: es. aree con il maggiore miglioramento, classi con performance eccellenti, argomenti particolarmente apprezzati dagli studenti, metodologie didattiche che hanno funzionato meglio, ecc.]
  </div>

  <h3>4.2 Limitazioni dello studio</h3>
  <p>Il presente studio presenta alcune limitazioni metodologiche che è opportuno considerare nell'interpretazione dei risultati. In primo luogo, l'assenza di un gruppo di controllo (disegno pre-sperimentale) non consente di escludere fattori confondenti (maturazione, effetto di apprendimento dal test, eventi esterni) come spiegazione alternativa dei miglioramenti osservati [7]. In secondo luogo, i campioni PRE e POST potrebbero non coincidere esattamente a causa di assenze il giorno della somministrazione, introducendo un potenziale bias di selezione. Infine, il questionario misura le conoscenze dichiarate e le intenzioni comportamentali, ma non è possibile verificare la corrispondenza con i comportamenti reali adottati dagli studenti nella vita quotidiana.</p>
  <div class="callout callout-yellow">
    [DA COMPLETARE — Aggiungere eventuali ulteriori limitazioni specifiche di questo contesto: es. ridotta numerosità campionaria, interruzioni del programma, difficoltà logistiche, ecc.]
  </div>

  <h3>4.3 Implicazioni pratiche</h3>
  <div class="callout callout-yellow">
    [DA COMPLETARE — Descrivere le implicazioni pratiche dei risultati per l'istituto scolastico, per i docenti, per le famiglie e per la programmazione futura del progetto S.A.N.E. in questo territorio.]
  </div>
</div>

<!-- ===== 5. CONCLUSIONI ===== -->
<div class="art-section">
  <h2 class="sec-h">5. Conclusioni</h2>
  <div class="callout callout-yellow">
    [DA COMPLETARE — Sintesi delle conclusioni principali in 3-5 frasi. Rispondere esplicitamente all'obiettivo dello studio enunciato nell'Introduzione: il programma ha raggiunto i suoi obiettivi? In che misura? Quali sono le prospettive future?]
  </div>
  <p>Il Progetto Mangiare Bene di S.A.N.E. Italia si configura come uno strumento di promozione della salute coerente con le raccomandazioni nazionali e internazionali sull'educazione alimentare scolastica. I dati raccolti costituiscono una base conoscitiva preziosa per la programmazione di interventi futuri e per la valutazione dell'impatto a lungo termine del progetto sul territorio.</p>
</div>

<!-- ===== 6. RACCOMANDAZIONI ===== -->
<div class="art-section">
  <h2 class="sec-h">6. Raccomandazioni</h2>
  <p>Sulla base dei risultati ottenuti, si formulano le seguenti raccomandazioni per il miglioramento del programma e per il potenziamento dell'educazione alimentare nell'istituto:</p>
  ${recosHTML}
</div>

<!-- ===== 7. CONFLITTI DI INTERESSE / FINANZIAMENTO ===== -->
<div class="art-section">
  <h2 class="sec-h">7. Dichiarazioni</h2>
  <p><strong>Conflitti di interesse:</strong> Gli autori dichiarano l'assenza di conflitti di interesse relativi al presente lavoro.</p>
  <p><strong>Finanziamento:</strong> [DA COMPLETARE — Es. "Il presente studio non ha ricevuto finanziamenti esterni" oppure indicare l'ente finanziatore.]</p>
  <p><strong>Consenso:</strong> La partecipazione al programma è avvenuta con il consenso della dirigenza scolastica. I dati sono stati trattati in forma anonima e aggregata, nel rispetto del Regolamento (UE) 2016/679 (GDPR).</p>
  <p><strong>Ringraziamenti:</strong> [DA COMPLETARE — Ringraziare i docenti, la dirigenza, il personale ATA e gli studenti partecipanti.]</p>
</div>

<!-- ===== 8. BIBLIOGRAFIA ===== -->
<div class="art-section">
  <h2 class="sec-h">8. Riferimenti Bibliografici</h2>
  <ol class="ref-list">
    <li>World Health Organization (WHO). <em>Obesity and overweight — Key facts</em>. Ginevra: WHO; 2023. Disponibile su: https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight</li>
    <li>Istituto Superiore di Sanità (ISS). <em>OKkio alla SALUTE 2023 — Sintesi dei risultati</em>. Roma: ISS; 2023. Disponibile su: https://www.epicentro.iss.it/okkioallasalute/</li>
    <li>Birch LL, Anzman SL. Learning to eat in an obesogenic environment: a developmental systems perspective on childhood obesity. <em>Child Dev Perspect</em>. 2010;4(3):138-143.</li>
    <li>Contento IR. <em>Nutrition Education: Linking Research, Theory, and Practice</em>. 3rd ed. Burlington: Jones & Bartlett Learning; 2016.</li>
    <li>Pérez-Rodrigo C, Aranceta J. School-based nutrition education: lessons learned and new perspectives. <em>Public Health Nutr</em>. 2001;4(1A):131-139.</li>
    <li>Harvard T.H. Chan School of Public Health. <em>The Healthy Eating Plate</em>. Boston: Harvard University; 2011. Disponibile su: https://www.hsph.harvard.edu/nutritionsource/healthy-eating-plate/</li>
    <li>Campbell DT, Stanley JC. <em>Experimental and Quasi-Experimental Designs for Research</em>. Chicago: Rand McNally; 1963.</li>
    <li>Consiglio per la ricerca in agricoltura e l'analisi dell'economia agraria (CREA). <em>Linee Guida per una Sana Alimentazione — Revisione 2018</em>. Roma: CREA; 2018.</li>
    <li>Società Italiana di Nutrizione Umana (SINU). <em>LARN — Livelli di Assunzione di Riferimento di Nutrienti ed energia per la popolazione italiana. IV Revisione</em>. Milano: SICS; 2014.</li>
    <li>World Health Organization (WHO). <em>Global action plan for the prevention and control of noncommunicable diseases 2013–2020</em>. Ginevra: WHO; 2013.</li>
  </ol>
</div>

<!-- ===== FIRMA ===== -->
<div class="firma-section">
  <h2 class="sec-h" style="border-bottom:none;margin-bottom:8px;">Dichiarazione dell'Autore</h2>
  <p style="font-size:.9rem;color:var(--muted);">Il sottoscritto dichiara che i dati riportati nel presente articolo sono veritieri e corrispondono alle rilevazioni effettuate nell'ambito del Progetto Mangiare Bene, A.S. ${anno}.</p>
  <div class="firma-line"></div>
  <div style="font-weight:700;color:var(--blue-dark);margin-bottom:4px;">${biologo.nome||'[Biologo Nutrizionista]'}</div>
  <div class="firma-label">Biologo Nutrizionista${biologo.ordine?' · Ordine Nazionale dei Biologi n° '+biologo.ordine:''}</div>
  <div class="firma-label" style="margin-top:12px;">Data: ___________________&nbsp;&nbsp;&nbsp;&nbsp;Luogo: ___________________</div>
</div>

</div><!-- end journal-wrap -->

<!-- FOOTER -->
<div class="art-footer">
  <strong>S.A.N.E. Italia · Progetto Mangiare Bene</strong> · Anno Scolastico ${anno}<br>
  Documento generato automaticamente dal portale S.A.N.E. il ${oggi} · Dati riservati · Non divulgare senza autorizzazione
</div>

<!-- BOTTONE STAMPA -->
<div class="no-print" style="position:fixed;bottom:20px;right:20px;z-index:999;">
  <button onclick="window.print()" style="background:var(--blue-dark);color:#fff;border:none;border-radius:8px;padding:12px 22px;font-family:'Source Sans 3',sans-serif;font-size:.9rem;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.25);">🖨️ Stampa / Salva PDF</button>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"><\/script>
<script>
${graficiScript}
<\/script>
</body>
</html>`;

        loadWin.document.open();
        loadWin.document.write(html);
        loadWin.document.close();
    }

    global.generaRelazioneFull = generaRelazioneFull;

})(window);
