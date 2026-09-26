"""Scrive nell'HTML di scuole.html e biologi.html i testi italiani che la pagina
genera via JavaScript (elementi data-k + liste/griglie costruite dal render).

Perché: senza, l'HTML servito ha i testi vuoti. Google li legge dopo il
rendering, ma Bing, i crawler delle AI e le anteprime social vedono una pagina
vuota. Il JS continua a funzionare come prima (riscrive gli stessi testi e
cambia lingua).

Uso: python prerender-it.py   (dopo ogni modifica ai testi T.it o alle liste)
Serve Google Chrome installato e bs4 (pip install beautifulsoup4).
"""
import pathlib, re, subprocess, sys
from bs4 import BeautifulSoup

ROOT = pathlib.Path(__file__).resolve().parent
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
# id dei contenitori riempiti dal render (oltre agli elementi data-k)
PAGES = {
    "scuole.html": ["citta-attivazione", "scuole-grid", "aderire-grid"],
    "biologi.html": ["req-list"],
}


def dump_dom(path):
    out = subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--virtual-time-budget=4000",
         "--dump-dom", path.as_uri()],
        capture_output=True, text=True, encoding="utf-8", timeout=90)
    if "<body" not in out.stdout:
        sys.exit(f"dump fallito per {path.name}: {out.stderr[:300]}")
    return BeautifulSoup(out.stdout, "html.parser")


def inner(el):
    return "".join(str(c) for c in el.contents)


def replace_inner(src, open_re, content):
    """Sostituisce il contenuto dell'elemento che apre con open_re, rispettando
    i tag annidati con lo stesso nome."""
    m = re.search(open_re, src)
    if not m:
        return src, False
    tag, start = m.group(1), m.end()
    depth, pos = 1, start
    tok = re.compile(rf"<(/?){tag}\b[^>]*>", re.I)
    while depth:
        t = tok.search(src, pos)
        if not t:
            return src, False
        depth += -1 if t.group(1) else 1
        pos = t.end()
    return src[:start] + content + src[t.start():], True


for name, ids in PAGES.items():
    path = ROOT / name
    src = path.read_text(encoding="utf-8")
    dom = dump_dom(path)
    body_start = src.index("<body")
    head, body = src[:body_start], src[body_start:]
    n = 0

    seen = {}
    for el in dom.body.find_all(attrs={"data-k": True}):
        k = el["data-k"]
        i = seen.get(k, 0)
        seen[k] = i + 1
        # i-esima occorrenza di data-k="k" nel sorgente
        occ = [m.start() for m in re.finditer(rf'data-k="{re.escape(k)}"', body)]
        if i >= len(occ):
            continue
        tag_start = body.rfind("<", 0, occ[i])
        open_re = re.compile(rf"<(\w+)\b[^>]*>")
        m = open_re.match(body, tag_start)
        before, rest = body[:tag_start], body[tag_start:]
        rest, ok = replace_inner(rest, rf"^<({m.group(1)})\b[^>]*>", inner(el))
        if ok:
            body, n = before + rest, n + 1

    for id_ in ids:
        el = dom.find(id=id_)
        body, ok = replace_inner(body, rf'<(\w+)\b[^>]*\bid="{id_}"[^>]*>', inner(el))
        n += ok

    path.write_text(head + body, encoding="utf-8", newline="")
    print(f"{name}: {n} blocchi scritti")
