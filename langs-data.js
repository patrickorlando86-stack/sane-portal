/* ============================================================
   S.A.N.E. Italia — testi del sito pubblico (IT / ES / EN)
   + template dei blocchi generati (TPL).
   Questo file è usato SOLO da build-langs.js: non viene
   caricato dalle pagine. Per modificare i testi del sito:
   1. modifica qui, 2. lancia `node build-langs.js`.
   ============================================================ */

// Icone SVG inline: riferimenti allo sprite definito in index.html
const ic = (name) => `<svg class='ic' aria-hidden='true'><use href='#i-${name}'/></svg>`;

const T = {
  it: {
    nav: ["Chi siamo", "Il programma", "Il gioco", "Scuole Aderenti", "I Biologi"],
    nav_cta: "Contattaci",
    hero_eyebrow: "Programma di Educazione Alimentare · Scuole di Ogni Ordine e Grado",
    hero_title: "Mangiare Bene,<br><em>Crescere Meglio.</em>",
    hero_sub: "Un percorso strutturato in 6 moduli tematici, progettato da una Biologa Nutrizionista qualificata, che integra interventi in presenza, strumenti digitali interattivi e coinvolgimento attivo delle famiglie. Rivolto a bambini e ragazzi dai 6 ai 18 anni.",
    hero_btn1: "Prova l'app gratuita", hero_btn2: "Parla con noi", hero_dl: "Scarica la locandina (PDF)",
    hero_allergie: "Unico gioco con gestione personalizzata dei 14 allergeni EU",
    trust_lead: "Con il patrocinio di",
    patroni: ["Comune di Novi Ligure", "Ordine dei Biologi di Piemonte, Liguria e Valle d'Aosta"],
    stat1_label: "moduli tematici del programma — dalla nutrizione alle allergie",
    stat2_label: "allergeni EU gestiti nell'app «Il Piatto Sano»",
    stat3_label: "anni — fascia d'età a cui è rivolto il programma",
    stat4_label: "miglioramento medio PRE/POST nei test di consapevolezza alimentare",
    acr: [
      { l: "S", w: "Sicurezza", d: "Sicurezza alimentare in classe" },
      { l: "A", w: "Alimentazione", d: "Corrette abitudini a tavola" },
      { l: "N", w: "Nutrizione", d: "Expertise della Biologa Nutrizionista" },
      { l: "E", w: "Educazione", d: "Metodo ludico e misurabile" }
    ],
    chi_eyebrow: "Chi siamo",
    chi_title: "Chi è <em>S.A.N.E. Italia</em>.",
    chi_p1: "S.A.N.E. Italia è una rete di biologi nutrizionisti che porta l'educazione alimentare e la sicurezza alimentare nelle scuole. Il nome riassume i nostri quattro pilastri: <strong>Sicurezza</strong>, <strong>Alimentazione</strong>, <strong>Nutrizione</strong>, <strong>Educazione</strong>.",
    chi_p2: "Sotto la guida scientifica della Dott.ssa Serafina Cardaci, abbiamo sviluppato il programma «Mangiare Bene, Crescere Meglio» e il gioco educativo «Il Piatto Sano», con un approccio pratico, ludico e misurabile. Il primo pilota all'I.C. «Carducci–Fattori» di Rosignano Marittimo ha coinvolto circa 100 studenti.",
    game_eyebrow: "Lo strumento digitale del programma",
    game_title: "Il gioco <em>«Il Piatto Sano»</em> — 6 mini-giochi educativi.",
    game_sub: "Il cuore digitale del programma «Mangiare Bene, Crescere Meglio»: un gioco su browser, tablet, LIM e Android, guidato dalla mascotte Serafina. Multilingua (IT/EN/ES), gestisce in modo personalizzato tutti i 14 allergeni obbligatori EU per ogni bambino, con 2 livelli di difficoltà e modalità classe. Due giochi sono gratuiti, gli altri sono a pagamento.",
    games: [
      { img: "piattosano.webp", icon: "🍽️", name: "Il Piatto Sano", desc: "Componi il piatto equilibrato secondo il modello di Harvard (½ frutta e verdura, ¼ cereali integrali, ¼ proteine) rispettando le tue allergie", tag: "Gratis" },
      { img: "tempo.webp", icon: "🚨", name: "Il Coraggio di Agire", desc: "Storia interattiva su una reazione allergica grave: scegli cosa fare in emergenza e allenati all'uso dell'autoiniettore (EpiPen, Jext, Emerade, Fastjekt) passo per passo", tag: "Gratis" },
      { img: "quiz.webp", icon: "❓", name: "Quiz Alimentare", desc: "Nutrizione, allergie, spreco, miti e stagionalità con timer, streak e power-up", tag: "Premium", pro: true },
      { img: "piramide.webp", icon: "🔺", name: "Piramide Alimentare", desc: "La piramide mediterranea e le piramidi alimentari del mondo", tag: "Premium", pro: true },
      { img: "stagioni.webp", icon: "🌿", name: "Stagionalità", desc: "Riconosci la frutta e la verdura di stagione", tag: "Premium", pro: true },
      { img: "etichetta.webp", icon: "🔍", name: "Detective Etichette", desc: "Leggi le etichette e trova gli allergeni in grassetto, poi abbina ogni alimento ai suoi allergeni su 3 livelli", tag: "Premium", pro: true }
    ],
    allergens: ["Glutine", "Crostacei", "Uova", "Pesce", "Arachidi", "Soia", "Latte", "Frutta a guscio", "Sedano", "Senape", "Sesamo", "Anidride solforosa", "Lupini", "Molluschi"],
    allerg_eyebrow: "Sicurezza alimentare · ciò che ci rende unici",
    allerg_title: "Allergie: <em>nessuno le gestisce come noi.</em>",
    allerg_lead: "In Italia il <strong>6–8% dei bambini</strong> soffre di allergie alimentari. Non è un capriccio, non è una moda: è sicurezza. Per questo «Il Piatto Sano» è l'<strong>unico gioco educativo che gestisce in modo personalizzato i 14 allergeni obbligatori EU</strong> per ogni singolo bambino.",
    allerg_steps: [
      { n: "01", t: "Imposti il profilo", d: "Selezioni gli allergeni e le intolleranze del singolo bambino o dell'intera classe." },
      { n: "02", t: "Il gioco si adatta", d: "I cibi a rischio vengono segnalati e personalizzati in tempo reale, con 2 livelli di difficoltà." },
      { n: "03", t: "Impara in sicurezza", d: "Il bambino riconosce gli allergeni nelle etichette e impara come agire in emergenza con l'autoiniettore." }
    ],
    allerg_chips_title: "I 14 allergeni obbligatori EU gestiti dall'app",
    coraggio_tag: "Gioco gratuito",
    coraggio_h: "«Il Coraggio di Agire»",
    coraggio_lead: "In un'emergenza allergica, <strong>ogni secondo conta</strong>. In questa storia interattiva il bambino vive una reazione allergica grave, sceglie cosa fare e si allena <strong>passo per passo all'uso dell'autoiniettore</strong> (EpiPen, Jext, Emerade, Fastjekt). Unico nel suo genere — e gratuito.",
    coraggio_btn: "Prova «Il Coraggio di Agire»",
    target_eyebrow: "A chi ci rivolgiamo", target_title: "Un programma che parla a tutti.",
    cards: [
      { icon: "school", title: "Scuole e istituti", desc: "Programma strutturato con gestione allergeni per ogni studente, integrabile nel curriculo.", li: ["Percorsi per primaria, secondaria e superiori", "Gestione allergeni personalizzata per classe", "Formazione docenti inclusa", "Compatibile con MIUR / Carta del Docente"], href: "/scuole.html", cta: "Scopri come aderire" },
      { icon: "users", title: "Famiglie", desc: "Strumenti concreti per genitori di bambini con allergie e intolleranze, in sinergia con la scuola.", li: ["Workshop su allergie e lettura etichette", "Accesso al gioco «Il Piatto Sano»", "Guide pratiche per la spesa sicura", "Supporto nutrizionista certificato"], href: "#contact", cta: "Scrivici" },
      { icon: "microscope", title: "Biologi nutrizionisti", desc: "Network professionale certificato con strumenti operativi per portare S.A.N.E. nel proprio territorio.", li: ["Certificazione S.A.N.E. Educator", "Crediti ECM via FNOB", "Portale operativo dedicato", "Supporto commerciale e marketing"], href: "/biologi.html", cta: "Entra nella rete" }
    ],
    method_eyebrow: "I 6 moduli del programma", method_title: "Un percorso completo, <em>dalla nutrizione alla sicurezza.</em>",
    steps: [
      { n: "01", t: "Conosciamo gli Alimenti", d: "Scopriamo i gruppi alimentari, le proprietà nutrizionali e come costruire un'alimentazione equilibrata." },
      { n: "02", t: "Il Piatto Equilibrato", d: "Le proporzioni Harvard (50/25/25), la varietà e la qualità nel piatto quotidiano — con l'app «Il Piatto Sano»." },
      { n: "03", t: "Energia in Movimento", d: "Il legame tra alimentazione, attività fisica e benessere: come il cibo diventa carburante." },
      { n: "04", t: "Lo Zaino della Salute", d: "Cosa portare a scuola, come fare spesa consapevole e leggere le etichette degli alimenti." },
      { n: "05", t: "Cibo, Ambiente e Cultura", d: "Stagionalità, filiera corta, tradizioni alimentari e impatto ambientale delle nostre scelte." },
      { n: "06", t: "Allergie e Sicurezza", d: "Riconoscere i 14 allergeni EU, gestire le intolleranze in sicurezza a scuola e in famiglia." }
    ],
    bio_more: "Leggi la bio",
    ser_role: "Biologa Nutrizionista · Responsabile Scientifica",
    ser_creds: [ic('microscope') + " Biologa Nutrizionista", ic('book') + " Ideatrice del programma «Mangiare Bene e Crescere Meglio»", ic('school') + " Responsabile Scientifica S.A.N.E. Italia", ic('globe') + " www.serafinacardacinutrizione.com"],
    ser_p1: "La Dott.ssa Serafina Cardaci è la mente scientifica del programma. Ha progettato i 6 moduli di «Mangiare Bene, Crescere Meglio» integrando le più recenti evidenze in nutrizione pediatrica con un approccio pratico, ludico e misurabile.",
    ser_p2: "Il primo pilota all'I.C. «Carducci–Fattori» di Rosignano Marittimo — con circa 100 studenti — ha dimostrato l'efficacia del programma nel migliorare consapevolezza alimentare e gestione delle allergie.",
    team_eyebrow: "Il team",
    team_title: "Tre competenze, <em>un'unica missione.</em>",
    sara_role: "Responsabile S.A.N.E. Toscana · Biologa Nutrizionista",
    sara_creds: [ic('microscope') + " Biologa Nutrizionista", ic('map-pin') + " Responsabile S.A.N.E. Toscana", ic('presentation') + " Educatrice del progetto pilota (5 classi, ~100 studenti)", ic('school') + " Referente territoriale · Provincia di Livorno"],
    sara_p1: "La Dott.ssa Sara Comandi è la Responsabile S.A.N.E. per la Toscana. Biologa nutrizionista, porta il programma nelle scuole del territorio e cura il rapporto con istituti, docenti e famiglie.",
    sara_p2: "Ha condotto in prima persona le lezioni del progetto pilota all'I.C. «Carducci–Fattori» di Rosignano Marittimo — 5 classi, circa 100 studenti — traducendo i moduli scientifici in esperienza concreta in classe.",
    pat_role: "Sviluppatore App · Partner Tecnologico e Media",
    pat_creds: [ic('gamepad') + " Sviluppatore dell'app «Il Piatto Sano»", ic('code') + " Partner Tecnologico e Media S.A.N.E. Italia", ic('radio') + " Comunicatore — Radio PNR · Venerdì Tech", ic('pen') + " Autore — libri e musica"],
    pat_p1: "L'Ing. Patrick Orlando è il co-fondatore e sviluppatore dell'app «Il Piatto Sano», il cuore digitale del programma. Disponibile su browser, tablet, LIM e Android, il gioco rende l'educazione alimentare interattiva, personalizzata e multilingua.",
    pat_p2: "Si occupa della parte tecnologica e media di S.A.N.E. Italia: sviluppo della piattaforma, comunicazione e diffusione del programma sul territorio.",
    field_eyebrow: "Sul campo · pilota 2026",
    field_title: "Il programma <em>in classe.</em>",
    field_cap1: "Il gioco «Il Piatto Sano» alla LIM durante una lezione.",
    field_cap2: "Il modulo dedicato alle allergie e ai 14 allergeni EU.",
    field_cap3: "Il progetto pilota raccontato dalla stampa locale.",
    field_meta: "Marzo–aprile 2026: 5 classi, circa 100 ragazzi all'I.C. «Carducci–Fattori» di Rosignano Marittimo. Fonti ufficiali: <a href='https://www.fattorirosignano.edu.it/mangiare-bene-crescere-meglio/' target='_blank' rel='noopener'>Istituto Carducci–Fattori</a> · <a href='https://www.comune.rosignano.livorno.it/Novita/Notizie/MANGIARE-BENE-CRESCERE-MEGLIO-UN-PROGETTO-DI-EDUCAZIONE-ALIMENTARE-PER-CINQUE-CLASSI-DELL-ISTITUTO-COMPRENSIVO-CARDUCCI-FATTORI' target='_blank' rel='noopener'>Comune di Rosignano Marittimo</a>.",
    educator_lead: "Lezioni del pilota condotte da",
    educator_role: "Biologa Nutrizionista · Referente territoriale (Provincia di Livorno)",
    quote_eyebrow: "Le istituzioni che ci sostengono",
    quote_title: "Cosa dicono di <em>S.A.N.E.</em>",
    quote_text: "«Abbiamo accolto questo progetto perché nutrirsi in maniera giusta è molto importante, specialmente per i ragazzi e le ragazze.»",
    quote_author: "— Cristina Santinelli, Assessora alle Politiche Educative · Comune di Rosignano Marittimo",
    faq_eyebrow: "Domande frequenti",
    faq_title: "Le risposte alle domande <em>più comuni.</em>",
    faqs: [
      { q: "A chi è rivolto il programma S.A.N.E.?", a: "A tutte le scuole di ogni ordine e grado — primaria, secondaria e superiori — per bambini e ragazzi dai 6 ai 18 anni. Coinvolge attivamente anche docenti e famiglie." },
      { q: "Il gioco «Il Piatto Sano» è gratuito?", a: "Sì. Due dei sei mini-giochi sono completamente gratuiti (Il Piatto Sano e Il Coraggio di Agire, con l'allenamento all'uso dell'autoiniettore). Gli altri quattro si sbloccano con un codice. Il gioco è disponibile su browser, tablet, LIM e Android, in italiano, spagnolo e inglese." },
      { q: "Come funziona la gestione delle allergie?", a: "L'app gestisce in modo personalizzato tutti i 14 allergeni obbligatori EU per ogni bambino, con due livelli di difficoltà e una modalità classe pensata per la LIM." },
      { q: "Quanto costa il programma?", a: "Ci sono due formule di adesione: il «Kit Classe Il Piatto Sano», per lavorare in autonomia con l'insegnante, e il «Programma SANE Completo» con la biologa nutrizionista in classe. I costi variano in base al numero di classi: scrivici per un preventivo su misura." },
      { q: "Servono LIM o tablet in classe?", a: "No. Il gioco funziona su qualsiasi browser, anche da smartphone o computer. La LIM è consigliata per la modalità classe, ma non è indispensabile." },
      { q: "Il programma è finanziabile?", a: "Sì: il programma è compatibile con i fondi MIUR e con la Carta del Docente. Ti aiutiamo a individuare la formula più adatta al budget della tua scuola." },
      { q: "Come può aderire la mia scuola?", a: "Scrivici dalla sezione Contatti: ti mettiamo in contatto con un biologo nutrizionista certificato S.A.N.E. del tuo territorio per costruire il percorso più adatto alla tua scuola." }
    ],
    contact_eyebrow: "Contatti",
    contact_title: "Porta S.A.N.E. nella tua <em>scuola</em> o territorio.",
    contact_desc: "Sei un dirigente scolastico, un biologo nutrizionista, un genitore di un bambino con allergie o un ente locale? Scrivici.",
    form_title: "Scrivici un messaggio",
    form_name: "Nome e cognome",
    form_role: "Chi sei?",
    form_roles: ["Dirigente scolastico o docente", "Genitore", "Biologo/a nutrizionista", "Ente o istituzione", "Altro"],
    form_msg: "Il tuo messaggio",
    form_send: "Invia il messaggio",
    form_note: "Il messaggio si aprirà nel tuo programma di posta, pronto da inviare.",
    ci: [
      { type: "person", img: "/immagini/logo/serafina.webp", name: "Dott.ssa Serafina Cardaci", role: "Biologa Nutrizionista · Responsabile Scientifica", email: "serafinacardaci@gmail.com", tel: "+39 347 375 0087", address: "Via Mazzini 129 — Novi Ligure (AL)", site: "https://www.serafinacardacinutrizione.com/", sitelabel: "serafinacardacinutrizione.com", ig: "https://www.instagram.com/sery.cardaci.nutrizionista/", fb: "https://www.facebook.com/Dott.ssaSerafinaCardaciNutrizionista/", li: "https://www.linkedin.com/in/serafina-cardaci-70707793/" },
      { type: "person", img: "/immagini/logo/patrick.webp", name: "Ing. Patrick Orlando", role: "Sviluppatore App · Partner Tecnologico e Media", email: "patrick.orlando@libero.it", tel: "+39 347 183 4091", li: "https://www.linkedin.com/in/patrickorlando86/?locale=it" }
    ],
    footer: "Sicurezza · Alimentazione · Nutrizione · Educazione",
    ft_payoff: "La rete di biologi nutrizionisti che porta l'educazione alimentare e la sicurezza alimentare nelle scuole italiane.",
    ft_explore: "Esplora",
    ft_l_moduli: "I 6 moduli",
    ft_l_gioco: "Il gioco «Il Piatto Sano»",
    ft_l_scuole: "Scuole Aderenti",
    ft_l_biologi: "I Biologi",
    ft_l_contatti: "Contatti",
    ft_contact_h: "Contatti",
    ft_legal_h: "Informazioni",
    ft_privacy: "Privacy & Cookie Policy",
    ft_portale: "Portale operatori",
    ft_gioco_link: "Gioca a «Il Piatto Sano»"
  },

  es: {
    nav: ["Quiénes somos", "El programa", "El juego", "Escuelas Adheridas", "Los Biólogos"],
    nav_cta: "Contáctanos",
    hero_eyebrow: "Programa de Educación Alimentaria · Escuelas de Todos los Niveles",
    hero_title: "Mangiare Bene,<br><em>Crescere Meglio.</em>",
    hero_sub: "Un recorrido estructurado en 6 módulos temáticos, diseñado por una Bióloga Nutricionista cualificada, que integra intervenciones presenciales, herramientas digitales interactivas y la participación activa de las familias. Dirigido a niños y jóvenes de 6 a 18 años.",
    hero_btn1: "Prueba la app gratis", hero_btn2: "Habla con nosotros", hero_dl: "Descargar el folleto (PDF)",
    hero_allergie: "Único juego con gestión personalizada de los 14 alérgenos UE",
    trust_lead: "Con el patrocinio de",
    patroni: ["Comune di Novi Ligure", "Ordine dei Biologi di Piemonte, Liguria e Valle d'Aosta"],
    stat1_label: "módulos temáticos del programa — de la nutrición a las alergias",
    stat2_label: "alérgenos UE gestionados en la app «Il Piatto Sano»",
    stat3_label: "años — franja de edad a la que va dirigido el programa",
    stat4_label: "mejora media PRE/POST en los tests de consciencia alimentaria",
    acr: [
      { l: "S", w: "Seguridad", d: "Seguridad alimentaria en el aula" },
      { l: "A", w: "Alimentación", d: "Hábitos correctos en la mesa" },
      { l: "N", w: "Nutrición", d: "Expertise de la Bióloga Nutricionista" },
      { l: "E", w: "Educación", d: "Método lúdico y medible" }
    ],
    chi_eyebrow: "Quiénes somos",
    chi_title: "Qué es <em>S.A.N.E. Italia</em>.",
    chi_p1: "S.A.N.E. Italia es una red de biólogos nutricionistas que lleva la educación alimentaria y la seguridad alimentaria a las escuelas. El nombre resume nuestros cuatro pilares: <strong>Seguridad</strong>, <strong>Alimentación</strong>, <strong>Nutrición</strong>, <strong>Educación</strong>.",
    chi_p2: "Bajo la dirección científica de la Dra. Serafina Cardaci, hemos desarrollado el programa «Mangiare Bene, Crescere Meglio» y el juego educativo «Il Piatto Sano», con un enfoque práctico, lúdico y medible. El primer piloto en el I.C. «Carducci–Fattori» de Rosignano Marittimo involucró a unos 100 estudiantes.",
    game_eyebrow: "La herramienta digital del programa",
    game_title: "El juego <em>«Il Piatto Sano»</em> — 6 mini-juegos educativos.",
    game_sub: "El corazón digital del programa «Mangiare Bene, Crescere Meglio»: un juego en la web, tablet, PDI y Android, guiado por la mascota Serafina. Multilingüe (IT/EN/ES), gestiona de forma personalizada los 14 alérgenos obligatorios de la UE para cada niño, con 2 niveles de dificultad y modo clase. Dos juegos son gratuitos; los demás son de pago.",
    games: [
      { img: "piattosano.webp", icon: "🍽️", name: "Il Piatto Sano", desc: "Compón la comida equilibrada según el modelo de Harvard (½ fruta y verdura, ¼ cereales integrales, ¼ proteínas) respetando tus alergias", tag: "Gratis" },
      { img: "tempo.webp", icon: "🚨", name: "El Coraje de Actuar", desc: "Historia interactiva sobre una reacción alérgica grave: elige qué hacer en una emergencia y entrénate en el uso del autoinyector (EpiPen, Jext, Emerade, Fastjekt) paso a paso", tag: "Gratis" },
      { img: "quiz.webp", icon: "❓", name: "Quiz Alimentario", desc: "Nutrición, alergias, desperdicio, mitos y estacionalidad con cronómetro, racha y power-ups", tag: "Premium", pro: true },
      { img: "piramide.webp", icon: "🔺", name: "Pirámide Alimentaria", desc: "La pirámide mediterránea y las pirámides alimentarias del mundo", tag: "Premium", pro: true },
      { img: "stagioni.webp", icon: "🌱", name: "Estacionalidad", desc: "Reconoce la fruta y la verdura de temporada", tag: "Premium", pro: true },
      { img: "etichetta.webp", icon: "🔍", name: "Detective Etiquetas", desc: "Lee las etiquetas y encuentra los alérgenos en negrita, luego asocia cada alimento a sus alérgenos en 3 niveles", tag: "Premium", pro: true }
    ],
    allergens: ["Gluten", "Crustáceos", "Huevos", "Pescado", "Cacahuetes", "Soja", "Leche", "Frutos secos", "Apio", "Mostaza", "Sésamo", "Dióxido de azufre", "Altramuces", "Moluscos"],
    allerg_eyebrow: "Seguridad alimentaria · lo que nos hace únicos",
    allerg_title: "Alergias: <em>nadie las gestiona como nosotros.</em>",
    allerg_lead: "En Italia el <strong>6–8% de los niños</strong> sufre alergias alimentarias. No es un capricho ni una moda: es seguridad. Por eso «Il Piatto Sano» es el <strong>único juego educativo que gestiona de forma personalizada los 14 alérgenos obligatorios UE</strong> para cada niño.",
    allerg_steps: [
      { n: "01", t: "Configuras el perfil", d: "Seleccionas las alergias e intolerancias del niño o de toda la clase." },
      { n: "02", t: "El juego se adapta", d: "Los alimentos de riesgo se señalan y personalizan en tiempo real, con 2 niveles de dificultad." },
      { n: "03", t: "Aprende con seguridad", d: "El niño reconoce los alérgenos en las etiquetas y aprende cómo actuar en una emergencia con el autoinyector." }
    ],
    allerg_chips_title: "Los 14 alérgenos obligatorios UE que gestiona la app",
    coraggio_tag: "Juego gratuito",
    coraggio_h: "«El Coraje de Actuar»",
    coraggio_lead: "En una emergencia alérgica, <strong>cada segundo cuenta</strong>. En esta historia interactiva el niño vive una reacción alérgica grave, elige qué hacer y se entrena <strong>paso a paso en el uso del autoinyector</strong> (EpiPen, Jext, Emerade, Fastjekt). Único en su género — y gratuito.",
    coraggio_btn: "Prueba «El Coraje de Actuar»",
    target_eyebrow: "A quién nos dirigimos", target_title: "Un programa que habla a todos.",
    cards: [
      { icon: "school", title: "Escuelas e institutos", desc: "Programa estructurado con gestión de alérgenos para cada estudiante, integrable en el currículo.", li: ["Rutas para primaria, secundaria y superior", "Gestión personalizada de alérgenos por clase", "Formación docente incluida", "Compatible con convocatorias MIUR"], href: "/scuole.html", cta: "Cómo adherirse" },
      { icon: "users", title: "Familias", desc: "Herramientas concretas para padres de niños con alergias e intolerancias, en sintonía con la escuela.", li: ["Talleres sobre alergias y lectura de etiquetas", "Acceso al juego «Il Piatto Sano»", "Guías prácticas de compra segura", "Apoyo de nutricionista certificado"], href: "#contact", cta: "Escríbenos" },
      { icon: "microscope", title: "Biólogos nutricionistas", desc: "Red profesional certificada con herramientas operativas para llevar S.A.N.E. a tu territorio.", li: ["Certificación S.A.N.E. Educator", "Créditos ECM vía FNOB", "Portal operativo dedicado", "Apoyo comercial y marketing"], href: "/biologi.html", cta: "Únete a la red" }
    ],
    method_eyebrow: "Los 6 módulos del programa", method_title: "Un recorrido completo, <em>de la nutrición a la seguridad.</em>",
    steps: [
      { n: "01", t: "Conocemos los Alimentos", d: "Descubrimos los grupos alimentarios, las propiedades nutricionales y cómo construir una alimentación equilibrada." },
      { n: "02", t: "El Plato Equilibrado", d: "Las proporciones Harvard (½ fruta y verdura, ¼ cereales, ¼ proteínas), la variedad y la calidad en el plato diario — con la app «Il Piatto Sano»." },
      { n: "03", t: "Energía en Movimiento", d: "El vínculo entre alimentación, actividad física y bienestar: cómo el alimento se convierte en energía." },
      { n: "04", t: "La Mochila de la Salud", d: "Qué llevar a la escuela, cómo hacer una compra consciente y leer las etiquetas de los alimentos." },
      { n: "05", t: "Alimentación, Ambiente y Cultura", d: "Estacionalidad, cadena corta, tradiciones alimentarias e impacto ambiental de nuestras elecciones." },
      { n: "06", t: "Alergias y Seguridad", d: "Reconocer los 14 alérgenos UE, gestionar las intolerancias con seguridad en la escuela y en familia." }
    ],
    bio_more: "Leer la bio",
    ser_role: "Bióloga Nutricionista · Responsable Científica",
    ser_creds: [ic('microscope') + " Bióloga Nutricionista", ic('book') + " Creadora del programa «Mangiare Bene e Crescere Meglio»", ic('school') + " Responsable Científica S.A.N.E. Italia", ic('globe') + " www.serafinacardacinutrizione.com"],
    ser_p1: "La Dra. Serafina Cardaci es la mente científica del programa. Diseñó los 6 módulos de «Mangiare Bene, Crescere Meglio» integrando las evidencias más recientes en nutrición pediátrica con un enfoque práctico, lúdico y medible.",
    ser_p2: "El primer piloto en el I.C. «Carducci–Fattori» de Rosignano Marittimo — con cerca de 100 estudiantes — demostró la eficacia del programa para mejorar la consciencia alimentaria y la gestión de las alergias.",
    team_eyebrow: "El equipo",
    team_title: "Tres competencias, <em>una sola misión.</em>",
    sara_role: "Responsable S.A.N.E. Toscana · Bióloga Nutricionista",
    sara_creds: [ic('microscope') + " Bióloga Nutricionista", ic('map-pin') + " Responsable S.A.N.E. Toscana", ic('presentation') + " Educadora del proyecto piloto (5 clases, ~100 alumnos)", ic('school') + " Referente territorial · Provincia de Livorno"],
    sara_p1: "La Dra. Sara Comandi es la Responsable de S.A.N.E. para la Toscana. Bióloga nutricionista, lleva el programa a las escuelas del territorio y cuida la relación con centros, docentes y familias.",
    sara_p2: "Impartió personalmente las clases del proyecto piloto en el I.C. «Carducci–Fattori» de Rosignano Marittimo — 5 clases, unos 100 alumnos — traduciendo los módulos científicos en experiencia concreta en el aula.",
    pat_role: "Desarrollador App · Partner Tecnológico y Media",
    pat_creds: [ic('gamepad') + " Desarrollador de la app «Il Piatto Sano»", ic('code') + " Partner Tecnológico y Media S.A.N.E. Italia", ic('radio') + " Comunicador — Radio PNR · Venerdì Tech", ic('pen') + " Autor — libros y música"],
    pat_p1: "El Ing. Patrick Orlando es el cofundador y desarrollador de la app «Il Piatto Sano», el corazón digital del programa. Disponible en la web, tablet, PDI y Android, el juego hace la educación alimentaria interactiva, personalizada y multilingüe.",
    pat_p2: "Se ocupa de la parte tecnológica y media de S.A.N.E. Italia: desarrollo de la plataforma, comunicación y difusión del programa en el territorio.",
    field_eyebrow: "Sobre el terreno · piloto 2026",
    field_title: "El programa <em>en el aula.</em>",
    field_cap1: "El juego «Il Piatto Sano» en la PDI durante una clase.",
    field_cap2: "El módulo dedicado a las alergias y los 14 alérgenos UE.",
    field_cap3: "El proyecto piloto en la prensa local.",
    field_meta: "Marzo–abril de 2026: 5 clases, unos 100 chicos en el I.C. «Carducci–Fattori» de Rosignano Marittimo. Fuentes oficiales: <a href='https://www.fattorirosignano.edu.it/mangiare-bene-crescere-meglio/' target='_blank' rel='noopener'>Instituto Carducci–Fattori</a> · <a href='https://www.comune.rosignano.livorno.it/Novita/Notizie/MANGIARE-BENE-CRESCERE-MEGLIO-UN-PROGETTO-DI-EDUCAZIONE-ALIMENTARE-PER-CINQUE-CLASSI-DELL-ISTITUTO-COMPRENSIVO-CARDUCCI-FATTORI' target='_blank' rel='noopener'>Ayuntamiento de Rosignano Marittimo</a>.",
    educator_lead: "Clases del piloto impartidas por",
    educator_role: "Bióloga Nutricionista · Referente territorial (Provincia de Livorno)",
    quote_eyebrow: "Las instituciones que nos respaldan",
    quote_title: "Qué dicen de <em>S.A.N.E.</em>",
    quote_text: "«Acogimos este proyecto porque alimentarse de la manera correcta es muy importante, especialmente para los chicos y las chicas.»",
    quote_author: "— Cristina Santinelli, Concejala de Políticas Educativas · Ayuntamiento de Rosignano Marittimo",
    faq_eyebrow: "Preguntas frecuentes",
    faq_title: "Respuestas a las dudas <em>más comunes.</em>",
    faqs: [
      { q: "¿A quién va dirigido el programa S.A.N.E.?", a: "A todas las escuelas de cualquier nivel — primaria, secundaria y bachillerato — para niños y jóvenes de 6 a 18 años. Involucra activamente también a docentes y familias." },
      { q: "¿El juego «Il Piatto Sano» es gratuito?", a: "Sí. Dos de los seis mini-juegos son totalmente gratuitos (Il Piatto Sano y El Coraje de Actuar, con el entrenamiento en el uso del autoinyector). Los otros cuatro se desbloquean con un código. El juego está disponible en la web, tablet, PDI y Android, en italiano, español e inglés." },
      { q: "¿Cómo funciona la gestión de las alergias?", a: "La app gestiona de forma personalizada los 14 alérgenos obligatorios de la UE para cada niño, con dos niveles de dificultad y un modo clase pensado para la PDI." },
      { q: "¿Cuánto cuesta el programa?", a: "Hay dos fórmulas de adhesión: el «Kit Clase Il Piatto Sano», para trabajar de forma autónoma con el docente, y el «Programa SANE Completo» con la bióloga nutricionista en el aula. Los costes varían según el número de clases: escríbenos para un presupuesto a medida." },
      { q: "¿Se necesitan PDI o tablets en clase?", a: "No. El juego funciona en cualquier navegador, también desde smartphone u ordenador. La PDI es recomendable para el modo clase, pero no es imprescindible." },
      { q: "¿El programa es financiable?", a: "Sí: el programa es compatible con los fondos MIUR y con la Carta del Docente. Te ayudamos a encontrar la fórmula más adecuada al presupuesto de tu escuela." },
      { q: "¿Cómo puede adherirse mi escuela?", a: "Escríbenos desde la sección Contacto: te ponemos en contacto con un biólogo nutricionista certificado S.A.N.E. de tu territorio para diseñar el recorrido más adecuado para tu escuela." }
    ],
    contact_eyebrow: "Contacto",
    contact_title: "Lleva S.A.N.E. a tu <em>escuela</em> o territorio.",
    contact_desc: "¿Eres director escolar, biólogo nutricionista, padre de un niño con alergias o entidad local? Escríbenos.",
    form_title: "Escríbenos un mensaje",
    form_name: "Nombre y apellidos",
    form_role: "¿Quién eres?",
    form_roles: ["Director escolar o docente", "Padre / madre", "Biólogo/a nutricionista", "Entidad o institución", "Otro"],
    form_msg: "Tu mensaje",
    form_send: "Enviar el mensaje",
    form_note: "El mensaje se abrirá en tu programa de correo, listo para enviar.",
    ci: [
      { type: "person", img: "/immagini/logo/serafina.webp", name: "Dott.ssa Serafina Cardaci", role: "Bióloga Nutricionista · Responsable Científica", email: "serafinacardaci@gmail.com", tel: "+39 347 375 0087", address: "Via Mazzini 129 — Novi Ligure (AL)", site: "https://www.serafinacardacinutrizione.com/", sitelabel: "serafinacardacinutrizione.com", ig: "https://www.instagram.com/sery.cardaci.nutrizionista/", fb: "https://www.facebook.com/Dott.ssaSerafinaCardaciNutrizionista/", li: "https://www.linkedin.com/in/serafina-cardaci-70707793/" },
      { type: "person", img: "/immagini/logo/patrick.webp", name: "Ing. Patrick Orlando", role: "Desarrollador App · Partner Tecnológico y Media", email: "patrick.orlando@libero.it", tel: "+39 347 183 4091", li: "https://www.linkedin.com/in/patrickorlando86/?locale=it" }
    ],
    footer: "Seguridad · Alimentación · Nutrición · Educación",
    ft_payoff: "La red de biólogos nutricionistas que lleva la educación alimentaria y la seguridad alimentaria a las escuelas italianas.",
    ft_explore: "Explora",
    ft_l_moduli: "Los 6 módulos",
    ft_l_gioco: "El juego «Il Piatto Sano»",
    ft_l_scuole: "Escuelas Adheridas",
    ft_l_biologi: "Los Biólogos",
    ft_l_contatti: "Contacto",
    ft_contact_h: "Contacto",
    ft_legal_h: "Información",
    ft_privacy: "Privacidad & Cookies",
    ft_portale: "Portal operadores",
    ft_gioco_link: "Juega a «Il Piatto Sano»"
  },

  en: {
    nav: ["Who we are", "The programme", "The game", "Partner Schools", "The Biologists"],
    nav_cta: "Contact us",
    hero_eyebrow: "Food Education Programme · Schools of All Levels",
    hero_title: "Mangiare Bene,<br><em>Crescere Meglio.</em>",
    hero_sub: "A structured path of 6 thematic modules, designed by a qualified Nutritionist Biologist, combining in-person sessions, interactive digital tools and active family involvement. For children and teens aged 6 to 18.",
    hero_btn1: "Try the app for free", hero_btn2: "Talk to us", hero_dl: "Download the brochure (PDF)",
    hero_allergie: "The only game with personalised management of the 14 EU allergens",
    trust_lead: "Under the patronage of",
    patroni: ["Comune di Novi Ligure", "Ordine dei Biologi di Piemonte, Liguria e Valle d'Aosta"],
    stat1_label: "thematic modules — from nutrition to allergy management",
    stat2_label: "EU allergens managed in the «Il Piatto Sano» app",
    stat3_label: "years old — the age range the programme is designed for",
    stat4_label: "average PRE/POST improvement in food-awareness tests",
    acr: [
      { l: "S", w: "Safety", d: "Food safety in the classroom" },
      { l: "A", w: "Alimentation", d: "Correct eating habits at the table" },
      { l: "N", w: "Nutrition", d: "Expertise of the Nutritionist Biologist" },
      { l: "E", w: "Education", d: "A playful, measurable method" }
    ],
    chi_eyebrow: "Who we are",
    chi_title: "What is <em>S.A.N.E. Italia</em>.",
    chi_p1: "S.A.N.E. Italia is a network of nutritionist biologists bringing food education and food safety into schools. The name sums up our four pillars: <strong>Safety</strong>, <strong>Food</strong>, <strong>Nutrition</strong>, <strong>Education</strong>.",
    chi_p2: "Under the scientific direction of Dr. Serafina Cardaci, we developed the «Mangiare Bene, Crescere Meglio» programme and the «Il Piatto Sano» educational game, with a practical, playful and measurable approach. The first pilot at I.C. «Carducci–Fattori» in Rosignano Marittimo involved around 100 students.",
    game_eyebrow: "The programme's digital tool",
    game_title: "The <em>«Il Piatto Sano»</em> game — 6 educational mini-games.",
    game_sub: "The digital heart of the «Mangiare Bene, Crescere Meglio» programme: a game on web, tablet, IWB and Android, guided by the «Serafina» mascot. Multilingual (IT/EN/ES), it personally manages all 14 mandatory EU allergens for each child, with 2 difficulty levels and a class mode. Two games are free; the others are paid.",
    games: [
      { img: "piattosano.webp", icon: "🍽️", name: "The Healthy Plate", desc: "Build a balanced meal following the Harvard model (½ fruit & veg, ¼ whole grains, ¼ protein) while respecting your allergies", tag: "Free" },
      { img: "tempo.webp", icon: "🚨", name: "The Courage to Act", desc: "Interactive story about a severe allergic reaction: choose what to do in an emergency and train step by step on using the auto-injector (EpiPen, Jext, Emerade, Fastjekt)", tag: "Free" },
      { img: "quiz.webp", icon: "❓", name: "Food Quiz", desc: "Nutrition, allergies, food waste, myths and seasonality with timer, streak and power-ups", tag: "Premium", pro: true },
      { img: "piramide.webp", icon: "🔺", name: "Food Pyramid", desc: "The Mediterranean pyramid and food pyramids from around the world", tag: "Premium", pro: true },
      { img: "stagioni.webp", icon: "🌱", name: "Seasonality", desc: "Recognise seasonal fruit and vegetables", tag: "Premium", pro: true },
      { img: "etichetta.webp", icon: "🔍", name: "Label Detective", desc: "Read labels and spot allergens in bold, then match each food to its allergens across 3 levels", tag: "Premium", pro: true }
    ],
    allergens: ["Gluten", "Crustaceans", "Eggs", "Fish", "Peanuts", "Soya", "Milk", "Tree nuts", "Celery", "Mustard", "Sesame", "Sulphur dioxide", "Lupin", "Molluscs"],
    allerg_eyebrow: "Food safety · what makes us unique",
    allerg_title: "Allergies: <em>no one manages them like we do.</em>",
    allerg_lead: "In Italy <strong>6–8% of children</strong> have food allergies. It's not a whim or a trend: it's safety. That's why «Il Piatto Sano» is the <strong>only educational game that personally manages the 14 mandatory EU allergens</strong> for each child.",
    allerg_steps: [
      { n: "01", t: "Set the profile", d: "Select the allergies and intolerances of the individual child or the whole class." },
      { n: "02", t: "The game adapts", d: "Risky foods are flagged and personalised in real time, with 2 difficulty levels." },
      { n: "03", t: "Learn safely", d: "The child recognises allergens on labels and learns how to act in an emergency with the auto-injector." }
    ],
    allerg_chips_title: "The 14 mandatory EU allergens managed by the app",
    coraggio_tag: "Free game",
    coraggio_h: "«The Courage to Act»",
    coraggio_lead: "In an allergic emergency, <strong>every second counts</strong>. In this interactive story the child experiences a severe allergic reaction, chooses what to do and trains <strong>step by step on using the auto-injector</strong> (EpiPen, Jext, Emerade, Fastjekt). One of a kind — and free.",
    coraggio_btn: "Try «The Courage to Act»",
    target_eyebrow: "Who we serve", target_title: "A programme that speaks to everyone.",
    cards: [
      { icon: "school", title: "Schools & institutions", desc: "Structured programme with per-student allergen management, fully integrable into the curriculum.", li: ["Pathways for primary, secondary and high school", "Personalised allergen management per class", "Teacher training included", "Compatible with MIUR funding schemes"], href: "/scuole.html", cta: "How to join" },
      { icon: "users", title: "Families", desc: "Practical tools for parents of children with allergies and intolerances, in sync with school.", li: ["Allergy & label-reading workshops", "Access to «Il Piatto Sano» game", "Safe shopping practical guides", "Certified nutritionist support"], href: "#contact", cta: "Write to us" },
      { icon: "microscope", title: "Nutritionist biologists", desc: "Certified professional network with operational tools to bring S.A.N.E. to your area.", li: ["S.A.N.E. Educator certification", "ECM credits via FNOB", "Dedicated operational portal", "Commercial and marketing support"], href: "/biologi.html", cta: "Join the network" }
    ],
    method_eyebrow: "The 6 programme modules", method_title: "A complete path, <em>from nutrition to safety.</em>",
    steps: [
      { n: "01", t: "Getting to Know Food", d: "We discover food groups, nutritional properties and how to build a balanced diet." },
      { n: "02", t: "The Balanced Plate", d: "The Harvard proportions (½ fruit & veg, ¼ grains, ¼ protein), variety and quality on the daily plate — with the «Il Piatto Sano» app." },
      { n: "03", t: "Energy in Motion", d: "The link between food, physical activity and wellbeing: how food becomes fuel." },
      { n: "04", t: "The Health Backpack", d: "What to bring to school, how to shop consciously and read food labels." },
      { n: "05", t: "Food, Environment and Culture", d: "Seasonality, short supply chains, food traditions and the environmental impact of our choices." },
      { n: "06", t: "Allergies and Safety", d: "Recognising the 14 EU allergens, managing intolerances safely at school and at home." }
    ],
    bio_more: "Read bio",
    ser_role: "Nutritionist Biologist · Scientific Director",
    ser_creds: [ic('microscope') + " Nutritionist Biologist", ic('book') + " Creator of the «Mangiare Bene e Crescere Meglio» programme", ic('school') + " Scientific Director, S.A.N.E. Italia", ic('globe') + " www.serafinacardacinutrizione.com"],
    ser_p1: "Dr. Serafina Cardaci is the scientific mind of the programme. She designed the 6 modules of «Mangiare Bene, Crescere Meglio», combining the latest evidence in paediatric nutrition with a practical, playful and measurable approach.",
    ser_p2: "The first pilot at I.C. «Carducci–Fattori» in Rosignano Marittimo — with around 100 students — proved the programme's effectiveness in improving food awareness and allergy management.",
    team_eyebrow: "The team",
    team_title: "Three expertises, <em>one mission.</em>",
    sara_role: "S.A.N.E. Tuscany Lead · Nutritionist Biologist",
    sara_creds: [ic('microscope') + " Nutritionist Biologist", ic('map-pin') + " S.A.N.E. Tuscany Lead", ic('presentation') + " Pilot-programme educator (5 classes, ~100 students)", ic('school') + " Local coordinator · Province of Livorno"],
    sara_p1: "Dr Sara Comandi is the S.A.N.E. lead for Tuscany. A nutritionist biologist, she brings the programme into local schools and manages the relationship with institutes, teachers and families.",
    sara_p2: "She personally delivered the pilot-programme lessons at I.C. «Carducci–Fattori» in Rosignano Marittimo — 5 classes, around 100 students — turning the scientific modules into concrete classroom experience.",
    pat_role: "App Developer · Technology & Media Partner",
    pat_creds: [ic('gamepad') + " Developer of the «Il Piatto Sano» app", ic('code') + " Technology & Media Partner, S.A.N.E. Italia", ic('radio') + " Communicator — Radio PNR · Venerdì Tech", ic('pen') + " Author — books and music"],
    pat_p1: "Patrick Orlando is the co-founder and developer of the «Il Piatto Sano» app, the digital heart of the programme. Available on web, tablet, IWB and Android, the game makes food education interactive, personalised and multilingual.",
    pat_p2: "He looks after the technology and media side of S.A.N.E. Italia: platform development, communication and spreading the programme across the country.",
    field_eyebrow: "In the field · 2026 pilot",
    field_title: "The programme <em>in the classroom.</em>",
    field_cap1: "The «Il Piatto Sano» game on the IWB during a lesson.",
    field_cap2: "The module on allergies and the 14 EU allergens.",
    field_cap3: "The pilot project covered by the local press.",
    field_meta: "March–April 2026: 5 classes, around 100 students at I.C. «Carducci–Fattori» in Rosignano Marittimo. Official sources: <a href='https://www.fattorirosignano.edu.it/mangiare-bene-crescere-meglio/' target='_blank' rel='noopener'>Carducci–Fattori School</a> · <a href='https://www.comune.rosignano.livorno.it/Novita/Notizie/MANGIARE-BENE-CRESCERE-MEGLIO-UN-PROGETTO-DI-EDUCAZIONE-ALIMENTARE-PER-CINQUE-CLASSI-DELL-ISTITUTO-COMPRENSIVO-CARDUCCI-FATTORI' target='_blank' rel='noopener'>Municipality of Rosignano Marittimo</a>.",
    educator_lead: "Pilot lessons delivered by",
    educator_role: "Nutritionist Biologist · Local coordinator (Province of Livorno)",
    quote_eyebrow: "The institutions backing us",
    quote_title: "What they say about <em>S.A.N.E.</em>",
    quote_text: "«We embraced this project because eating the right way is very important, especially for boys and girls.»",
    quote_author: "— Cristina Santinelli, Councillor for Educational Policy · Municipality of Rosignano Marittimo",
    faq_eyebrow: "Frequently asked questions",
    faq_title: "Answers to the <em>most common questions.</em>",
    faqs: [
      { q: "Who is the S.A.N.E. programme for?", a: "For schools of all levels — primary, secondary and high school — for children and teens aged 6 to 18. It actively involves teachers and families too." },
      { q: "Is the «Il Piatto Sano» game free?", a: "Yes. Two of the six mini-games are completely free (The Healthy Plate and The Courage to Act, with auto-injector training). The other four unlock with a code. The game runs on web, tablet, IWB and Android, in Italian, Spanish and English." },
      { q: "How does allergen management work?", a: "The app personally manages all 14 mandatory EU allergens for each child, with two difficulty levels and a class mode designed for the interactive whiteboard." },
      { q: "How much does the programme cost?", a: "There are two options: the «Il Piatto Sano Class Kit», for teachers working independently, and the «Full SANE Programme» with the nutritionist biologist in the classroom. Costs depend on the number of classes: write to us for a tailored quote." },
      { q: "Do we need an IWB or tablets in class?", a: "No. The game runs in any browser, including smartphones and computers. The interactive whiteboard is recommended for class mode, but not required." },
      { q: "Can the programme be funded?", a: "Yes: the programme is compatible with MIUR funds and the Italian «Carta del Docente». We'll help you find the option that best fits your school's budget." },
      { q: "How can my school join?", a: "Write to us from the Contact section: we'll connect you with a certified S.A.N.E. nutritionist biologist in your area to build the path best suited to your school." }
    ],
    contact_eyebrow: "Contact",
    contact_title: "Bring S.A.N.E. to your <em>school</em> or area.",
    contact_desc: "Are you a school principal, a nutritionist biologist, a parent of an allergic child, or a local authority? Write to us.",
    form_title: "Send us a message",
    form_name: "Full name",
    form_role: "Who are you?",
    form_roles: ["School principal or teacher", "Parent", "Nutritionist biologist", "Local authority or institution", "Other"],
    form_msg: "Your message",
    form_send: "Send the message",
    form_note: "The message will open in your email app, ready to send.",
    ci: [
      { type: "person", img: "/immagini/logo/serafina.webp", name: "Dott.ssa Serafina Cardaci", role: "Nutritionist Biologist · Scientific Director", email: "serafinacardaci@gmail.com", tel: "+39 347 375 0087", address: "Via Mazzini 129 — Novi Ligure (AL)", site: "https://www.serafinacardacinutrizione.com/", sitelabel: "serafinacardacinutrizione.com", ig: "https://www.instagram.com/sery.cardaci.nutrizionista/", fb: "https://www.facebook.com/Dott.ssaSerafinaCardaciNutrizionista/", li: "https://www.linkedin.com/in/serafina-cardaci-70707793/" },
      { type: "person", img: "/immagini/logo/patrick.webp", name: "Ing. Patrick Orlando", role: "App Developer · Technology & Media Partner", email: "patrick.orlando@libero.it", tel: "+39 347 183 4091", li: "https://www.linkedin.com/in/patrickorlando86/?locale=it" }
    ],
    footer: "Safety · Food · Nutrition · Education",
    ft_payoff: "The network of nutritionist biologists bringing food education and food safety into Italian schools.",
    ft_explore: "Explore",
    ft_l_moduli: "The 6 modules",
    ft_l_gioco: "The «Il Piatto Sano» game",
    ft_l_scuole: "Partner Schools",
    ft_l_biologi: "The Biologists",
    ft_l_contatti: "Contact",
    ft_contact_h: "Contact",
    ft_legal_h: "Information",
    ft_privacy: "Privacy & Cookie Policy",
    ft_portale: "Operators' portal",
    ft_gioco_link: "Play «Il Piatto Sano»"
  }
};

/* ============================================================
   TEMPLATE dei blocchi generati (marcatori @gen: in index.html)
   Ogni funzione riceve t = T[lang] e restituisce l'HTML interno.
   ============================================================ */
const stepColors = ['#00C9B1', '#F4A261', '#4DA3FF', '#6BCB77', '#B98CFF', '#FF7B9C'];

const TPL = {
  'trust-list': t =>
    `<span class="trust-lead">${t.trust_lead}</span>` +
    t.patroni.map(p => `<span class="trust-item">${p}</span>`).join(''),

  'statband': t => {
    const nums = ['6', '14', '6–18', '+117%'];
    return [t.stat1_label, t.stat2_label, t.stat3_label, t.stat4_label].map((l, i) =>
      `<div class="statband-item"><div class="statband-n">${nums[i]}</div><div class="statband-l">${l}</div></div>`
    ).join('');
  },

  'sane-pillars': t => t.acr.map(a =>
    `<div class="sane-pillar"><span class="sane-l">${a.l}</span><span class="sane-txt"><span class="sane-w">${a.w}</span><span class="sane-d">${a.d}</span></span></div>`
  ).join(''),

  'steps': t => t.steps.map((s, i) => {
    const c = stepColors[i % stepColors.length];
    return `<div class="step" style="border-top:3px solid ${c}"><div class="step-n" style="color:${c}">${s.n}</div><h3>${s.t}</h3><p>${s.d}</p></div>`;
  }).join(''),

  'game-cards': t => t.games.map(g =>
    `<div class="game-card">${g.img ? `<img class="game-img" src="/immagini/carosello/${g.img}" alt="${g.name}" loading="lazy" width="104" height="104">` : `<div class="game-icon">${g.icon}</div>`}<div class="game-body"><div class="game-top"><h3>${g.name}</h3>${g.tag ? `<span class="game-tag${g.pro ? ' tag-pro' : ''}">${g.tag}</span>` : ''}</div><p>${g.desc}</p></div></div>`
  ).join(''),

  'allerg-steps': t => t.allerg_steps.map(s =>
    `<div class="allerg-step"><div class="allerg-step-n">${s.n}</div><h3>${s.t}</h3><p>${s.d}</p></div>`
  ).join(''),

  'allerg-chips': t => t.allergens.map(a =>
    `<span class="allerg-chip">${a}</span>`
  ).join(''),

  'cards-grid': t => t.cards.map(c =>
    `<div class="card"><div class="card-icon"><svg class="ic" aria-hidden="true"><use href="#i-${c.icon}"/></svg></div><h3>${c.title}</h3><p>${c.desc}</p><ul>${c.li.map(l => `<li>${l}</li>`).join('')}</ul><a class="card-link" href="${c.href}">${c.cta} →</a></div>`
  ).join(''),

  'ser-creds': t => t.ser_creds.map(c => `<div class="ser-cred">${c}</div>`).join(''),
  'pat-creds': t => t.pat_creds.map(c => `<div class="ser-cred">${c}</div>`).join(''),
  'sara-creds': t => t.sara_creds.map(c => `<div class="ser-cred">${c}</div>`).join(''),

  'faq-list': t => t.faqs.map(f =>
    `<details class="faq-item"><summary class="faq-q">${f.q}<svg class="ic" aria-hidden="true"><use href="#i-chevron-down"/></svg></summary><div class="faq-a">${f.a}</div></details>`
  ).join(''),

  'form-roles': t => t.form_roles.map(r => `<option>${r}</option>`).join(''),

  'contact-cards': t => t.ci.map(c =>
    `<div class="cc">
        <div class="cc-head">
          <div><div class="cc-name">${c.name}</div><div class="cc-role">${c.role}</div></div>
        </div>
        <div class="cc-lines">
          <div class="cc-line"><svg class="ic" aria-hidden="true"><use href="#i-mail"/></svg> <a href="mailto:${c.email}">${c.email}</a></div>
          <div class="cc-line"><svg class="ic" aria-hidden="true"><use href="#i-phone"/></svg> <a href="tel:${c.tel.replace(/\s/g, '')}">${c.tel}</a></div>
          ${c.address ? `<div class="cc-line"><svg class="ic" aria-hidden="true"><use href="#i-map-pin"/></svg> ${c.address}</div>` : ''}
          ${c.site ? `<div class="cc-line"><svg class="ic" aria-hidden="true"><use href="#i-globe"/></svg> <a href="${c.site}" target="_blank" rel="noopener">${c.sitelabel}</a></div>` : ''}
        </div>
        <div class="cc-socials">
          ${c.ig ? `<a href="${c.ig}" target="_blank" rel="noopener" class="cc-social"><svg class="ic" aria-hidden="true"><use href="#i-instagram"/></svg> Instagram</a>` : ''}
          ${c.fb ? `<a href="${c.fb}" target="_blank" rel="noopener" class="cc-social"><svg class="ic" aria-hidden="true"><use href="#i-facebook"/></svg> Facebook</a>` : ''}
          ${c.li ? `<a href="${c.li}" target="_blank" rel="noopener" class="cc-social"><svg class="ic" aria-hidden="true"><use href="#i-linkedin"/></svg> LinkedIn</a>` : ''}
        </div>
      </div>`
  ).join('')
};

module.exports = { T, TPL };
