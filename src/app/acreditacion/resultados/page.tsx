import { supabase } from "@/lib/supabase";
import ResultadosChart, {
  ProcesoOption,
  MacroprocesoData,
  EstandarData,
  CriterioRaw,
} from "./ResultadosChart";

/* ─── Raw DB types ────────────────────────────────────────── */
interface AutoRaw {
  puntaje_propuesto: number | null;
  proceso_id: string;
}
interface CriterioRawDB {
  id: string;
  codigo_criterio: string;
  tipo: string;
  autoevaluacion: AutoRaw[];
}
interface CodigoRaw {
  id: string;
  codigo: string;
  criterio: CriterioRawDB[];
}
interface MacroRaw {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  orden: number;
  peso: number;
  estandares: CodigoRaw[];
}

/* ─── Server Component ────────────────────────────────────── */
export default async function ResultadosPage() {
  /* 1. Procesos */
  const { data: procesosRaw } = await supabase
    .from("proceso_acreditacion")
    .select("id, anio, sede(nombre)")
    .order("anio", { ascending: true });

  const procesos: ProcesoOption[] = (procesosRaw ?? []).map((p: any) => ({
    id: p.id,
    label: `${p.sede?.nombre ?? "Sin sede"} · ${p.anio}`,
  }));

  /* 2. Macroprocesos → estandares (codigo) → criterios → autoevaluaciones */
  const { data: macrosRaw, error } = await supabase
    .from("macroproceso")
    .select(`
      id,
      codigo,
      nombre,
      tipo,
      orden,
      peso,
      estandares:codigo(
        id,
        codigo,
        criterio(
          id,
          codigo_criterio,
          tipo,
          autoevaluacion(
            puntaje_propuesto,
            proceso_id
          )
        )
      )
    `)
    .order("orden", { ascending: true });

  if (error) {
    console.error("[ResultadosPage] Supabase error:", error.message);
  }

  /* 3. Build dataByProceso */
  const dataByProceso: Record<string, MacroprocesoData[]> = {};

  for (const proc of procesos) {
    const macros: MacroprocesoData[] = ((macrosRaw ?? []) as MacroRaw[]).map((m) => {
      const estandares: EstandarData[] = (m.estandares ?? []).map((est) => {
        const criterios: CriterioRaw[] = (est.criterio ?? [])
          .filter((cr) => cr.tipo === "estructura" || cr.tipo === "proceso" || cr.tipo === "resultado")
          .map((cr) => {
            const auto = (cr.autoevaluacion ?? []).find((a) => a.proceso_id === proc.id);
            return {
              codigo_criterio: cr.codigo_criterio,
              tipo: cr.tipo as CriterioRaw["tipo"],
              puntaje_propuesto: auto?.puntaje_propuesto ?? null,
            };
          });

        return { id: est.id, codigo: est.codigo, criterios };
      });

      return {
        id: m.id,
        orden: m.orden,
        codigo: m.codigo,
        nombre: m.nombre,
        tipo: m.tipo,
        peso: m.peso,
        estandares,
      } satisfies MacroprocesoData;
    });

    dataByProceso[proc.id] = macros;
  }

  return <ResultadosChart procesos={procesos} dataByProceso={dataByProceso} />;
}
