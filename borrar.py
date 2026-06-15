"""
Extrae los criterios con viñeta del PDF de macroprocesos y genera un CSV
con columnas: Criterio, Tipo, Descripcion.

Lógica:
  El PDF exporta el texto con doble espacio entre palabras y con palabras
  partidas en líneas cortas. Este script:
    1. Lee todo el texto del PDF.
    2. Une líneas cortas ("palabras sueltas") con la línea anterior.
    3. Separa entradas usando el carácter de viñeta ● como delimitador.
    4. Extrae Criterio (ej. DIR1-1), Tipo (ej. Administrativo) y Descripción.
    5. Normaliza espacios dobles.

Uso:
    pip install pypdf
    python extraer_criterios.py <ruta_al_pdf> [<archivo_salida.csv>]

Ejemplo:
    python extraer_criterios.py documento.pdf criterios.csv
"""

import re
import sys
import csv
import argparse
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:
    raise SystemExit("Instala pypdf primero:  pip install pypdf")


# Patrón para una entrada completa después de separar por viñeta:
#   DIR1-1 (Administrativo): Formulación y difusión...
ENTRY_PATTERN = re.compile(
    r"([A-Z]{2,6}\d+-\d+)"   # Criterio  →  grupo 1
    r"\s*\(([^)]+)\)\s*:\s*"  # (Tipo):   →  grupo 2
    r"(.+)",                   # Desc.     →  grupo 3  (puede incluir saltos ya unidos)
    re.DOTALL,
)


def extract_raw_text(pdf_path: str) -> str:
    """Lee todas las páginas y devuelve el texto concatenado."""
    reader = PdfReader(pdf_path)
    parts = []
    for page in reader.pages:
        parts.append(page.extract_text() or "")
    return "\n".join(parts)


def normalize_text(raw: str) -> str:
    """
    El PDF tiene dos problemas:
      a) Palabras partidas en líneas muy cortas (ej. 'organización\\n \\nde\\n \\nplanes')
      b) Dobles espacios entre tokens en la misma línea.

    Estrategia:
      - Si una línea tiene ≤ 3 palabras Y no empieza con ●, probablemente es
        continuación de la anterior → la unimos con espacio.
      - Luego colapsamos múltiples espacios en uno.
    """
    lines = raw.splitlines()
    merged: list[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            merged.append("")
            continue

        # Línea nueva que inicia una viñeta → siempre la respetamos
        if stripped.startswith("●"):
            merged.append(stripped)
            continue

        # Detectamos si es una línea "corta" (fragmento de palabra partido)
        word_count = len(stripped.split())
        is_fragment = word_count <= 3 and not re.match(r"^Macroproceso", stripped)

        if is_fragment and merged:
            # Pegar al final de la línea anterior
            merged[-1] = merged[-1].rstrip() + " " + stripped
        else:
            merged.append(stripped)

    combined = " ".join(merged)           # todo en una sola cadena
    combined = re.sub(r"\s{2,}", " ", combined)   # colapsar espacios múltiples
    return combined


def parse_entries(text: str) -> list[dict]:
    """
    Divide el texto usando ● como separador y extrae los campos de cada entrada.
    """
    # Separamos por el símbolo de viñeta
    chunks = re.split(r"●", text)

    rows = []
    for chunk in chunks:
        chunk = chunk.strip()
        if not chunk:
            continue
        m = ENTRY_PATTERN.match(chunk)
        if m:
            descripcion = m.group(3).strip()
            # Eliminar residuos de encabezados de macroproceso al final
            descripcion = re.sub(r"\s*Macroproceso\s+\d+.*$", "", descripcion, flags=re.IGNORECASE).strip()
            rows.append({
                "Criterio":    m.group(1).strip(),
                "Tipo":        m.group(2).strip(),
                "Descripcion": descripcion,
            })

    return rows


def save_csv(rows: list[dict], output_path: str) -> None:
    fieldnames = ["Criterio", "Tipo", "Descripcion"]
    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main():
    parser = argparse.ArgumentParser(
        description="Extrae criterios con viñeta de un PDF de macroprocesos."
    )
    parser.add_argument("pdf",    help="Ruta al archivo PDF de entrada")
    parser.add_argument(
        "output",
        nargs="?",
        default="criterios.csv",
        help="Archivo CSV de salida (default: criterios.csv)",
    )
    args = parser.parse_args()

    if not Path(args.pdf).exists():
        raise SystemExit(f"No se encontró el archivo: {args.pdf}")

    print(f"Leyendo PDF: {args.pdf}")
    raw_text = extract_raw_text(args.pdf)

    print("Normalizando texto...")
    clean_text = normalize_text(raw_text)

    print("Extrayendo criterios...")
    rows = parse_entries(clean_text)

    if not rows:
        print("⚠  No se encontraron criterios. Revisa el formato del PDF.")
        return

    save_csv(rows, args.output)
    print(f"✓  {len(rows)} criterios guardados en: {args.output}")

    # Vista previa
    print("\nVista previa (primeros 5 registros):")
    print(f"{'Criterio':<12} {'Tipo':<18} {'Descripcion'}")
    print("-" * 80)
    for row in rows[:5]:
        d = row["Descripcion"]
        preview = d[:52] + ("…" if len(d) > 52 else "")
        print(f"{row['Criterio']:<12} {row['Tipo']:<18} {preview}")


if __name__ == "__main__":
    main()