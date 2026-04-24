// ============================================================
// reportProfessionale.js — S.A.N.E. Italia
// Generatore Report .docx professionale per pacchetti completati
// ============================================================

(function (global) {

    // ---- Caricamento librerie CDN ----
    async function caricaLibrerie() {
        if (window.docx && window.saveAs) return;
        await Promise.all([
            new Promise((res, rej) => {
                if (window.docx) return res();
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.min.js';
                s.onload = res; s.onerror = rej;
                document.head.appendChild(s);
            }),
            new Promise((res, rej) => {
                if (window.saveAs) return res();
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js';
                s.onload = res; s.onerror = rej;
                document.head.appendChild(s);
            })
        ]);
    }

    // ---- Scarica logo come base64 ----
    async function fetchImgBase64(url) {
        try {
            const r = await fetch(url);
            const blob = await r.blob();
            return new Promise((res, rej) => {
                const reader = new FileReader();
                reader.onload = e => res(e.target.result.split(',')[1]);
                reader.onerror = rej;
                reader.readAsDataURL(blob);
            });
        } catch { return null; }
    }

    // ---- Logica testi condizionali ----
    function livelloMig(val) {
        if (val === null || val === undefined) return null;
        const v = parseFloat(val);
        if (v >= 15) return 'ottimo';
        if (v >= 8)  return 'buono';
        if (v >= 3)  return 'sufficiente';
        return 'insufficiente';
    }

    function testoClasse(mig, nomeClasse) {
        const v = parseFloat(mig);
        const cls = `La classe ${nomeClasse||''}`.trim();
        const lv = livelloMig(mig);
        if (lv === 'ottimo')
            return `${cls} ha registrato un miglioramento eccellente di ${v >= 0 ? '+' : ''}${v.toFixed(1)} punti, evidenziando una notevole acquisizione di conoscenze alimentari nel corso del percorso formativo.`;
        if (lv === 'buono')
            return `${cls} ha mostrato un buon progresso di ${v >= 0 ? '+' : ''}${v.toFixed(1)} punti, segnalando una significativa crescita nella comprensione delle corrette abitudini nutrizionali.`;
        if (lv === 'sufficiente')
            return `${cls} ha evidenziato un miglioramento di ${v >= 0 ? '+' : ''}${v.toFixed(1)} punti, indicando un discreto recepimento dei contenuti del percorso di educazione alimentare.`;
        return `${cls} ha registrato una variazione di ${v >= 0 ? '+' : ''}${v.toFixed(1)} punti. Si raccomanda di valutare eventuali approfondimenti nelle aree meno consolidate.`;
    }

    function raccomandazioni(media) {
        const lv = livelloMig(media);
        if (lv === 'ottimo') return [
            'Consolidare i risultati raggiunti attraverso attività di rinforzo periodiche integrate nel curricolo.',
            'Condividere le buone pratiche adottate con altri istituti del territorio per diffondere il modello.',
            'Valutare l\'ampliamento del progetto ad ulteriori classi o livelli scolastici dell\'istituto.',
        ];
        if (lv === 'buono') return [
            'Proseguire con moduli di approfondimento sulle aree nutrizionali che mostrano margini di miglioramento.',
            'Coinvolgere le famiglie tramite incontri informativi per consolidare i comportamenti appresi a scuola.',
            'Prevedere una sessione di verifica a 3-6 mesi per valutare il mantenimento delle conoscenze acquisite.',
        ];
        return [
            'Pianificare interventi integrativi focalizzati sulle aree con minore acquisizione di conoscenze.',
            'Aumentare il coinvolgimento dei docenti per il rinforzo quotidiano dei messaggi chiave.',
            'Strutturare attività pratiche (lettura etichette, laboratori) per un approccio esperienziale e duraturo.',
            'Prevedere un modulo aggiuntivo specifico sulle abitudini alimentari familiari e il contesto domestico.',
        ];
    }

    // ---- Costanti colori ----
    const DARK    = '0A2647';
    const TEAL    = '00A896';
    const GRIGIO  = '64748B';
    const GRIGIO2 = '94A3B8';

    // ============================================================
    // FUNZIONE PRINCIPALE
    // ============================================================
    async function generaReportDocx(data) {
        await caricaLibrerie();

        const {
            Document, Paragraph, TextRun, Table, TableRow, TableCell,
            Packer, ImageRun, Footer, PageBreak,
            AlignmentType, BorderStyle, WidthType, ShadingType,
        } = window.docx;

        const { biologo, scuola, pacchetto, classi } = data;
        const dataOggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

        // Logo
        const logoB64 = await fetchImgBase64(
            'https://raw.githubusercontent.com/patrickorlando86-stack/sane-portal/main/immagini/logo/logo2.webp'
        );

        // ---- Helper builders ----
        const p = (text, opts = {}) => new Paragraph({
            children: [new TextRun({ text, font: 'Calibri', size: 22, color: '334155', ...opts })],
            spacing: { after: 120 },
        });

        const pCenter = (text, opts = {}) => new Paragraph({
            children: [new TextRun({ text, font: 'Calibri', size: 22, color: '334155', ...opts })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
        });

        const titolo = (text) => new Paragraph({
            children: [new TextRun({ text, font: 'Calibri', bold: true, size: 32, color: DARK })],
            spacing: { before: 400, after: 200 },
            border: { bottom: { color: TEAL, space: 1, size: 6, style: BorderStyle.SINGLE } },
        });

        const spazio = (n = 200) => new Paragraph({ children: [new TextRun('')], spacing: { after: n } });

        const cella = (text, opts = {}) => new TableCell({
            children: [new Paragraph({
                children: [new TextRun({ text: String(text), font: 'Calibri', size: 20, color: '334155', ...opts.run })],
                alignment: opts.align || AlignmentType.LEFT,
            })],
            shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            columnSpan: opts.colSpan,
        });

        const cellaHeader = (text) => new TableCell({
            children: [new Paragraph({
                children: [new TextRun({ text, font: 'Calibri', bold: true, size: 20, color: 'FFFFFF' })],
                alignment: AlignmentType.CENTER,
            })],
            shading: { fill: DARK, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
        });

        // ============================================================
        // COPERTINA
        // ============================================================
        const copertina = [];

        if (logoB64) {
            copertina.push(new Paragraph({
                children: [new ImageRun({ data: logoB64, transformation: { width: 110, height: 74 }, type: 'webp' })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 560 },
            }));
        } else {
            copertina.push(spazio(560));
        }

        copertina.push(new Paragraph({
            children: [new TextRun({ text: 'S.A.N.E. Italia', font: 'Calibri', bold: true, size: 56, color: DARK })],
            alignment: AlignmentType.CENTER, spacing: { after: 80 },
        }));
        copertina.push(new Paragraph({
            children: [new TextRun({ text: 'Sistema di Alimentazione Naturale ed Educativa', font: 'Calibri', size: 20, color: GRIGIO2 })],
            alignment: AlignmentType.CENTER, spacing: { after: 700 },
        }));
        copertina.push(new Paragraph({
            children: [new TextRun({ text: 'REPORT DI PROGETTO', font: 'Calibri', bold: true, size: 52, color: TEAL })],
            alignment: AlignmentType.CENTER, spacing: { after: 160 },
        }));
        copertina.push(new Paragraph({
            children: [new TextRun({ text: 'Educazione Alimentare nelle Scuole', font: 'Calibri', size: 26, color: GRIGIO })],
            alignment: AlignmentType.CENTER, spacing: { after: 700 },
        }));

        // Riquadro info scuola
        copertina.push(new Table({
            width: { size: 70, type: WidthType.PERCENTAGE },
            alignment: AlignmentType.CENTER,
            rows: [
                new TableRow({ children: [new TableCell({
                    children: [
                        new Paragraph({ children: [new TextRun({ text: scuola.nome, font: 'Calibri', bold: true, size: 32, color: DARK })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
                        scuola.comune ? new Paragraph({ children: [new TextRun({ text: scuola.comune, font: 'Calibri', size: 22, color: GRIGIO })], alignment: AlignmentType.CENTER, spacing: { after: 120 } }) : spazio(60),
                        new Paragraph({ children: [new TextRun({ text: `Biologo Nutrizionista: ${biologo.nome}`, font: 'Calibri', size: 22, color: '334155' })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
                        biologo.ordine ? new Paragraph({ children: [new TextRun({ text: `N° Ordine: ${biologo.ordine}`, font: 'Calibri', size: 20, color: GRIGIO })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }) : spazio(40),
                        pacchetto.anno_scolastico ? new Paragraph({ children: [new TextRun({ text: `Anno Scolastico ${pacchetto.anno_scolastico}`, font: 'Calibri', size: 20, color: GRIGIO })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }) : spazio(40),
                        new Paragraph({ children: [new TextRun({ text: `Generato il ${dataOggi}`, font: 'Calibri', size: 18, color: GRIGIO2, italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 0 } }),
                    ],
                    shading: { fill: 'F0FDF9', type: ShadingType.CLEAR },
                    margins: { top: 300, bottom: 300, left: 400, right: 400 },
                    borders: {
                        top: { color: TEAL, size: 8, style: BorderStyle.SINGLE },
                        bottom: { color: TEAL, size: 8, style: BorderStyle.SINGLE },
                        left: { color: TEAL, size: 8, style: BorderStyle.SINGLE },
                        right: { color: TEAL, size: 8, style: BorderStyle.SINGLE },
                    },
                })] }),
            ],
        }));

        copertina.push(new Paragraph({ children: [new PageBreak()], spacing: { after: 0 } }));

        // ============================================================
        // SEZIONE 1 — SINTESI DEL PERCORSO
        // ============================================================
        const totStudenti = classi.reduce((a, c) => a + (c.num_studenti || 0), 0);
        const totOre = classi.reduce((a, c) =>
            a + ['m1','m2','m3','m4','m5','m6'].reduce((b, m) => b + (parseFloat(c[m + '_ore']) || 0), 0), 0);
        const classiConScore = classi.filter(c => c.score_pre != null && c.score_post != null);
        const mediaMig = classiConScore.length > 0
            ? classiConScore.reduce((a, c) => a + (parseFloat(c.score_post) - parseFloat(c.score_pre)), 0) / classiConScore.length
            : null;

        const tipoLabel = (pacchetto.tipo === 'gratuito' || pacchetto.prezzo === 0) ? 'Gratuito' : 'A Pagamento';

        const kpiRighe = [
            ['Classi coinvolte',       `${classi.length}`],
            ['Studenti totali',         `${totStudenti}`],
            ['Ore erogate',             `${totOre.toFixed(1)}h`],
            ['Ore previste (pacchetto)',`${pacchetto.ore_totali || '—'}h`],
            ['Tipo pacchetto',          tipoLabel],
            mediaMig !== null
                ? ['Miglioramento medio PRE→POST', `${mediaMig >= 0 ? '+' : ''}${mediaMig.toFixed(1)} punti`]
                : ['Score questionari', 'Non ancora rilevati'],
        ];

        const sezione1 = [
            titolo('1. Sintesi del Percorso'),
            p(`Il presente report documenta il percorso di educazione alimentare condotto dal${biologo.titolo ? ' ' + biologo.titolo : ' Biologo Nutrizionista'} ${biologo.nome} presso l'istituto ${scuola.nome}${scuola.comune ? ' di ' + scuola.comune : ''}${pacchetto.anno_scolastico ? ', nell\'anno scolastico ' + pacchetto.anno_scolastico : ''}.`),
            spazio(120),
            new Table({
                width: { size: 80, type: WidthType.PERCENTAGE },
                alignment: AlignmentType.CENTER,
                rows: [
                    new TableRow({
                        children: [cellaHeader('Indicatore'), cellaHeader('Valore')],
                        tableHeader: true,
                    }),
                    ...kpiRighe.map(([k, v], i) => new TableRow({
                        children: [
                            cella(k, { shading: i % 2 === 0 ? 'F8FAFC' : 'FFFFFF' }),
                            cella(v, {
                                shading: i % 2 === 0 ? 'F8FAFC' : 'FFFFFF',
                                align: AlignmentType.CENTER,
                                run: {
                                    bold: k.includes('Miglioramento'),
                                    color: k.includes('Miglioramento') && mediaMig >= 0 ? '16A34A' : '334155',
                                },
                            }),
                        ],
                    })),
                ],
            }),
            spazio(),
        ];

        // ============================================================
        // SEZIONE 2 — RISULTATI PER CLASSE
        // ============================================================
        const sezione2 = [titolo('2. Risultati per Classe')];

        if (classiConScore.length > 0) {
            sezione2.push(new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: ['Classe', 'N° Studenti', 'Score PRE', 'Score POST', 'Miglioramento'].map(h => cellaHeader(h)),
                        tableHeader: true,
                    }),
                    ...classiConScore.map((c, i) => {
                        const mig = parseFloat(c.score_post) - parseFloat(c.score_pre);
                        const migStr = `${mig >= 0 ? '+' : ''}${mig.toFixed(1)}`;
                        return new TableRow({
                            children: [
                                cella(c.nome_classe || '—', { shading: i % 2 === 0 ? 'F8FAFC' : 'FFFFFF' }),
                                cella(String(c.num_studenti || '—'), { shading: i % 2 === 0 ? 'F8FAFC' : 'FFFFFF', align: AlignmentType.CENTER }),
                                cella(String(c.score_pre), { shading: i % 2 === 0 ? 'F8FAFC' : 'FFFFFF', align: AlignmentType.CENTER }),
                                cella(String(c.score_post), { shading: i % 2 === 0 ? 'F8FAFC' : 'FFFFFF', align: AlignmentType.CENTER }),
                                cella(migStr, {
                                    shading: i % 2 === 0 ? 'F8FAFC' : 'FFFFFF',
                                    align: AlignmentType.CENTER,
                                    run: { bold: true, color: mig >= 0 ? '16A34A' : 'DC2626' },
                                }),
                            ],
                        });
                    }),
                ],
            }));
            sezione2.push(spazio());
            classiConScore.forEach(c => {
                const mig = parseFloat(c.score_post) - parseFloat(c.score_pre);
                sezione2.push(p(`• ${testoClasse(mig, c.nome_classe)}`));
            });
        } else {
            sezione2.push(p('I dati dei questionari PRE e POST non sono ancora stati rilevati per questo pacchetto. Inserire i dati nel portale e rigenerare il report per ottenere l\'analisi completa.'));
        }
        sezione2.push(spazio());

        // ============================================================
        // SEZIONE 3 — MODULI EROGATI
        // ============================================================
        const sezione3 = [
            titolo('3. Moduli Erogati'),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: ['Classe', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'Ore Totali'].map(h => cellaHeader(h)),
                        tableHeader: true,
                    }),
                    ...classi.map((c, i) => {
                        const oreC = ['m1','m2','m3','m4','m5','m6']
                            .reduce((a, m) => a + (parseFloat(c[m + '_ore']) || 0), 0);
                        return new TableRow({
                            children: [
                                cella(c.nome_classe || '—', { shading: i % 2 === 0 ? 'F8FAFC' : 'FFFFFF' }),
                                ...[1,2,3,4,5,6].map(n => cella(
                                    c[`m${n}_data`] ? `${c[`m${n}_ore`] || 0}h` : '—',
                                    {
                                        shading: i % 2 === 0 ? 'F8FAFC' : 'FFFFFF',
                                        align: AlignmentType.CENTER,
                                        run: { color: c[`m${n}_data`] ? '16A34A' : GRIGIO2 },
                                    }
                                )),
                                cella(`${oreC.toFixed(1)}h`, {
                                    shading: i % 2 === 0 ? 'F8FAFC' : 'FFFFFF',
                                    align: AlignmentType.CENTER,
                                    run: { bold: true, color: DARK },
                                }),
                            ],
                        });
                    }),
                    // Riga totale
                    new TableRow({
                        children: [
                            cella('TOTALE', { shading: 'E2E8F0', run: { bold: true, color: DARK } }),
                            ...[1,2,3,4,5,6].map(() => cella('', { shading: 'E2E8F0' })),
                            cella(`${totOre.toFixed(1)}h`, { shading: 'E2E8F0', align: AlignmentType.CENTER, run: { bold: true, color: DARK } }),
                        ],
                    }),
                ],
            }),
            spazio(),
        ];

        // ============================================================
        // SEZIONE 4 — RACCOMANDAZIONI
        // ============================================================
        const sezione4 = [titolo('4. Raccomandazioni')];
        if (mediaMig !== null) {
            sezione4.push(p(`Sulla base dei risultati rilevati (miglioramento medio: ${mediaMig >= 0 ? '+' : ''}${mediaMig.toFixed(1)} punti, livello: ${livelloMig(mediaMig).toUpperCase()}), si formulano le seguenti raccomandazioni:`));
            sezione4.push(spazio(80));
            raccomandazioni(mediaMig).forEach((r, i) => {
                sezione4.push(new Paragraph({
                    children: [
                        new TextRun({ text: `${i + 1}.  `, font: 'Calibri', bold: true, size: 22, color: TEAL }),
                        new TextRun({ text: r, font: 'Calibri', size: 22, color: '334155' }),
                    ],
                    spacing: { after: 140 },
                }));
            });
        } else {
            sezione4.push(p('Al completamento della raccolta dati questionari, verranno formulate raccomandazioni personalizzate. Nel frattempo:'));
            sezione4.push(spazio(80));
            [
                'Assicurarsi di raccogliere e inserire i dati dei questionari PRE e POST per tutte le classi.',
                'Dopo l\'inserimento, rigenerare il report per ottenere le raccomandazioni basate sui risultati.',
                'Prevedere eventuali sessioni di rinforzo a conclusione del percorso.',
            ].forEach((r, i) => {
                sezione4.push(new Paragraph({
                    children: [
                        new TextRun({ text: `${i + 1}.  `, font: 'Calibri', bold: true, size: 22, color: TEAL }),
                        new TextRun({ text: r, font: 'Calibri', size: 22, color: '334155' }),
                    ],
                    spacing: { after: 140 },
                }));
            });
        }
        sezione4.push(spazio());

        // ============================================================
        // SEZIONE 5 — NOTE METODOLOGICHE
        // ============================================================
        const sezione5 = [
            titolo('5. Note Metodologiche'),
            p('Il progetto "Mangiare bene, crescere meglio" è un programma di educazione alimentare strutturato su 6 moduli tematici, progettato per studenti di scuola primaria e secondaria di primo grado. Il percorso è conforme alle linee guida del Ministero della Salute in materia di educazione alimentare e promozione di stili di vita sani.'),
            spazio(80),
            p('La valutazione delle conoscenze è effettuata attraverso questionari standardizzati somministrati prima (pre-test) e dopo (post-test) il percorso formativo, al fine di misurare oggettivamente l\'efficacia dell\'intervento educativo e il miglioramento delle conoscenze nutrizionali degli studenti.'),
            spazio(80),
            p('Tutti i dati sono trattati in conformità al Regolamento UE 2016/679 (GDPR). I dati degli studenti sono pseudonimizzati e non vengono comunicati a terzi. Il presente documento è destinato esclusivamente all\'istituto scolastico e al biologo responsabile del percorso.'),
            spazio(),
        ];

        // ============================================================
        // SEZIONE FIRMA
        // ============================================================
        const sezioneFirma = [
            titolo('Dichiarazione del Biologo Nutrizionista'),
            p('Il sottoscritto dichiara che il percorso documentato nel presente report è stato condotto nel rispetto delle metodologie scientifiche e delle normative vigenti in materia di educazione alimentare nelle scuole.'),
            spazio(600),
            new Paragraph({
                children: [
                    new TextRun({ text: '_______________________________________', font: 'Calibri', size: 22, color: '334155' }),
                ],
                spacing: { after: 80 },
            }),
            new Paragraph({
                children: [new TextRun({ text: biologo.nome, font: 'Calibri', bold: true, size: 22, color: DARK })],
                spacing: { after: 60 },
            }),
            new Paragraph({
                children: [new TextRun({
                    text: `Biologo Nutrizionista${biologo.ordine ? ' — N° Ordine: ' + biologo.ordine : ''}`,
                    font: 'Calibri', size: 20, color: GRIGIO,
                })],
                spacing: { after: 60 },
            }),
            new Paragraph({
                children: [new TextRun({ text: `Data: ___________________`, font: 'Calibri', size: 20, color: '94A3B8' })],
                spacing: { after: 0 },
            }),
        ];

        // ============================================================
        // FOOTER
        // ============================================================
        const footer = new Footer({
            children: [new Paragraph({
                children: [new TextRun({
                    text: `S.A.N.E. Italia — Documento riservato — A.S. ${pacchetto.anno_scolastico || new Date().getFullYear()}`,
                    font: 'Calibri', size: 16, color: GRIGIO2, italics: true,
                })],
                alignment: AlignmentType.CENTER,
            })],
        });

        // ============================================================
        // DOCUMENTO FINALE
        // ============================================================
        const doc = new Document({
            creator: 'S.A.N.E. Italia Portal',
            title: `Report Progetto — ${scuola.nome}`,
            description: `Report di progetto educazione alimentare — ${biologo.nome}`,
            styles: {
                default: { document: { run: { font: 'Calibri', size: 22 } } },
            },
            sections: [{
                footers: { default: footer },
                children: [
                    ...copertina,
                    ...sezione1,
                    ...sezione2,
                    ...sezione3,
                    ...sezione4,
                    ...sezione5,
                    ...sezioneFirma,
                ],
            }],
        });

        return await window.docx.Packer.toBlob(doc);
    }

    // ============================================================
    // FUNZIONE PUBBLICA — chiamata dai portali
    // ============================================================
    async function scaricaReportDocx(data, nomeFile) {
        try {
            const blob = await generaReportDocx(data);
            await caricaLibrerie();
            window.saveAs(blob, nomeFile || 'report-sane.docx');
        } catch (e) {
            console.error('[SANE] Errore generazione report:', e);
            const msg = e instanceof Event ? 'Impossibile caricare le librerie Word (CDN non raggiungibile). Verifica la connessione internet e riprova.' : (e?.message || String(e));
            alert('Errore nella generazione del report.\n\n' + msg);
        }
    }

    // Esponi globalmente
    global.generaReportDocx  = generaReportDocx;
    global.scaricaReportDocx = scaricaReportDocx;

})(window);
