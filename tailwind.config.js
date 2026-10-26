// Configurazione di Tailwind per portale biologo e pannello admin.
// Il CSS compilato (css/tailwind.css) contiene solo le classi trovate in
// questi file. Si rigenera da solo su GitHub a ogni push su main
// (.github/workflows/tailwind.yml); a mano:
//   npx tailwindcss@3.4.17 -c tailwind.config.js -i css/tailwind.src.css -o css/tailwind.css --minify
// Le classi vanno scritte per intero nel codice (es. "bg-red-500"), non
// composte con + o ${}: altrimenti Tailwind non le vede e non le include.
module.exports = {
  content: [
    './biologo.html',
    './admin.html',
    './js/biologo.js',
    './js/admin.js',
    './js/reportProfessionale.js',
    './js/relazioneFull.js',
  ],
  theme: { extend: {} },
  plugins: [],
};
