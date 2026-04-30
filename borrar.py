"""
extraer_acreditacion.py  v4
Extrae datos del PDF: Guía Técnica del Evaluador en Acreditación
Salida: acreditacion_data.json  y  acreditacion_data.csv
"""

import re, json, csv, sys, subprocess
from pathlib import Path
from collections import Counter

if len(sys.argv) > 1:
    PDF_PATH = Path(sys.argv[1])
else:
    PDF_PATH = Path(r"C:\Users\P01231\Downloads\Guia Tecnica del Evaluador en Acreditacion.pdf")
    if not PDF_PATH.exists():
        PDF_PATH = Path("/mnt/user-data/uploads/Guia_Tecnica_del_Evaluador_en_Acreditacion.pdf")

if not PDF_PATH.exists():
    sys.exit(f"ERROR: PDF no encontrado en {PDF_PATH}")

OUT_JSON = Path("acreditacion_data.json")
OUT_CSV  = Path("acreditacion_data.csv")

# ── Patrones ──────────────────────────────────────────────────────────────────
P_MACRO     = re.compile(r"Macroproceso\s+\d+\s*:\s*(.+)")
P_CRIT_ONLY = re.compile(r"^([A-Z]{2,5}\.\d{1,2})\s*$")
P_CODE      = re.compile(r"\b([A-Z]{2,5}\d{1,2}-\d{1,2})\b")
P_FV        = re.compile(r"\b([012])\s*:\s*(.+)")

# Detectar si la línea (stripped) ES un token de calificador,
# y capturar lo que viene después (puede ser FV)
P_SPEC_LINE = re.compile(
    r"^(ESPECIFICO|SECTOR\s+PUBLICO|PARA\s+MINSA|SECTOR|PUBLICO|PARA|MINSA)\s*(.*)",
    re.I | re.DOTALL
)

SKIP_RE = re.compile(
    r"(Acreditaci[oó]n de Establec|Gu[ií]a T[eé]cnica del Evaluador"
    r"|^\s*C[oó]digo\s*$|^\s*Fuente de Verif|^\s*\d{1,3}\s*$"
    r"|^\s*Criterio\s*$|^\s*Anexo\s+\d+)"
)

def should_skip(line: str) -> bool:
    return not line.strip() or bool(SKIP_RE.search(line))

def extract_text(pdf_path: Path) -> list:
    r = subprocess.run(["pdftotext", "-layout", str(pdf_path), "-"],
                       capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        sys.exit(f"ERROR pdftotext: {r.stderr}")
    return r.stdout.splitlines()

def resolve_spec(tokens: list) -> str:
    joined = " ".join(t.upper() for t in tokens)
    if "MINSA" in joined:
        return "ESPECIFICO PARA MINSA"
    if "PUBLICO" in joined or "SECTOR" in joined:
        return "ESPECIFICO SECTOR PUBLICO"
    if "ESPECIFICO" in joined:
        return "ESPECIFICO"
    return ""

def leading_spaces(line: str) -> int:
    return len(line) - len(line.lstrip(" "))

def parse(lines: list) -> list:
    records = []
    current_macro = ""
    current_crit  = ""
    current_code  = ""
    spec_tokens   = []
    fv            = {}
    last_fv_key   = None
    code_indent   = 0

    def flush():
        nonlocal current_code, fv, spec_tokens, last_fv_key, code_indent
        if current_code and fv:
            spec = resolve_spec(spec_tokens)
            records.append({
                "nombre_macroproceso": current_macro,
                "criterio":            current_crit,
                "codigo_criterio":     current_code,
                "es_especifico":       bool(spec),
                "tipo_especifico":     spec,
                "fuente_verificacion": dict(fv),
            })
        current_code = ""; fv = {}; spec_tokens = []
        last_fv_key = None; code_indent = 0

    def process_fv_text(text: str):
        """Intenta extraer FV de un texto. Devuelve True si encontró algo."""
        nonlocal last_fv_key
        text = text.strip()
        if not text:
            return False
        m = P_FV.match(text)
        if m:
            key, desc = m.group(1), m.group(2).strip()
            fv[key]     = desc
            last_fv_key = key
            return True
        return False

    for line in lines:
        if should_skip(line):
            continue

        stripped = line.strip()
        indent   = leading_spaces(line)

        # ── 1. Macroproceso ──────────────────────────────────────────────
        m = P_MACRO.search(stripped)
        if m:
            flush()
            current_macro = m.group(1).strip()
            current_crit  = ""
            continue

        # ── 2. ¿Línea con código criterio? ───────────────────────────────
        m_code = P_CODE.search(stripped)
        if m_code:
            code_candidate = m_code.group(1)

            # Lo que hay antes del código (puede ser criterio agrupador)
            before = stripped[:stripped.index(code_candidate)].strip()
            m_crit = P_CRIT_ONLY.match(before) if before else None
            if m_crit:
                current_crit = m_crit.group(1)
            # También puede haber criterio al inicio de la línea original (col 0)
            elif indent == 0 or indent <= 4:
                left_token = stripped.split()[0] if stripped.split() else ""
                if re.match(r"^[A-Z]{2,5}\.\d{1,2}$", left_token):
                    current_crit = left_token

            flush()
            current_code = code_candidate
            code_indent  = indent

            # Lo que viene después del código en la misma línea
            after = stripped[stripped.index(code_candidate) + len(code_candidate):].strip()
            process_fv_text(after)
            continue

        # ── 3. Criterio agrupador solo ────────────────────────────────────
        if P_CRIT_ONLY.match(stripped) and len(stripped.split()) == 1:
            current_crit = stripped
            continue

        # ── 4. Línea con token ESPECIFICO / SECTOR / PARA MINSA ──────────
        if current_code:
            m_spec = P_SPEC_LINE.match(stripped)
            if m_spec:
                token = m_spec.group(1)
                rest  = m_spec.group(2).strip()
                spec_tokens.append(token)
                # Puede haber FV en el resto de la línea
                if rest:
                    process_fv_text(rest)
                continue

        # ── 5. Línea FV estándar (0: / 1: / 2:) ─────────────────────────
        if current_code:
            if process_fv_text(stripped):
                continue

        # ── 6. Continuación de descripción FV ────────────────────────────
        if last_fv_key is not None and current_code and stripped:
            if indent > code_indent + 8:
                fv[last_fv_key] = fv[last_fv_key] + " " + stripped
                continue

        last_fv_key = None

    flush()
    return records

def clean(records: list) -> list:
    for r in records:
        for k in r["fuente_verificacion"]:
            r["fuente_verificacion"][k] = re.sub(
                r"\s{2,}", " ", r["fuente_verificacion"][k]
            ).strip()
    return records

def save_json(records, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print(f"  JSON: {path}  ({len(records)} registros)")

def save_csv(records, path):
    fields = ["nombre_macroproceso","criterio","codigo_criterio",
              "es_especifico","tipo_especifico","fv_0","fv_1","fv_2"]
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in records:
            fv = r["fuente_verificacion"]
            w.writerow({
                "nombre_macroproceso": r["nombre_macroproceso"],
                "criterio":            r["criterio"],
                "codigo_criterio":     r["codigo_criterio"],
                "es_especifico":       r["es_especifico"],
                "tipo_especifico":     r["tipo_especifico"],
                "fv_0":                fv.get("0",""),
                "fv_1":                fv.get("1",""),
                "fv_2":                fv.get("2",""),
            })
    print(f"  CSV:  {path}  ({len(records)} registros)")

if __name__ == "__main__":
    print(f"PDF: {PDF_PATH}\n")
    lines   = extract_text(PDF_PATH)
    records = parse(lines)
    records = clean(records)

    cnt    = Counter(r["nombre_macroproceso"] for r in records)
    n_spec = sum(1 for r in records if r["es_especifico"])

    print(f"Macroprocesos: {len(cnt)}")
    for macro, n in sorted(cnt.items()):
        print(f"  {macro:<60} → {n:>3} códigos")

    print(f"\nTotal: {len(records)} registros  |  Específicos: {n_spec}  |  Generales: {len(records)-n_spec}\n")

    save_json(records, OUT_JSON)
    save_csv(records,  OUT_CSV)

    # Verificación GMD completa
    gmd = [r for r in records if r["nombre_macroproceso"] == "Gestión de Medicamentos (GMD)"]
    print(f"\n── GMD ({len(gmd)} registros) ────────────────────────────────")
    for r in gmd:
        spec_tag = f"  [{r['tipo_especifico']}]" if r["es_especifico"] else ""
        print(f"  {r['criterio']:<8} {r['codigo_criterio']}{spec_tag}")
        for k in ["0","1","2"]:
            v = r["fuente_verificacion"].get(k,"—")
            print(f"    {k}: {v[:90]}{'…' if len(v)>90 else ''}")
        print()