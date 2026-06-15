export const dynamic = "force-dynamic";

import { supabase } from "@/lib/supabase";
import ResultadosClientContainer from "./ResultadosClientContainer";
import {
  ProcesoOption,
  MacroprocesoData,
} from "./ResultadosChart";
import {
  MacroprocesoEntregable,
} from "./EntregablesChart";
import {
  ResponsableRow,
} from "./ResponsablesTable";

/* ─── Excluded criterios (same set used everywhere) ──────── */
const EXCLUDED_CRITERIOS = new Set([
  "DIR1-4", "DIR1-5", "DIR1-6", "DIR1-8", "GRH4-1", "MRA8-1", "MRA8-2", "MRA8-3",
  "ATA1-3", "ATA3-2", "ATA3-3", "ATA3-4", "ATA3-5", "ATA3-6", "RCR4-1", "RCR4-2",
  "RCR4-3", "GMD3-4", "GMD3-5", "MRS1-1", "MRS1-2", "MRS1-3", "MRS2-1", "MRS2-2", "ATH6-1", "ATH6-2",
]);
const EXCLUDED_MACROS_ORDEN = new Set([8, 12]);

/* ─── Raw DB types — autoevaluacion chart ─────────────────── */
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

/* ─── Raw DB types — entregables chart ───────────────────── */
interface SeguimientoRaw {
  estado: "cumplido" | "parcial" | "no_cumplido" | null;
  proceso_id: string;
}
interface EntregableRawDB {
  id: string;
  entregable_seguimiento: SeguimientoRaw[];
}
interface CriterioEntregableRawDB {
  id: string;
  codigo_criterio: string;
  entregable: EntregableRawDB[];
}
interface CodigoEntregableRaw {
  id: string;
  codigo: string;
  criterio: CriterioEntregableRawDB[];
}
interface MacroEntregableRaw {
  id: string;
  codigo: string;
  nombre: string;
  orden: number;
  estandares: CodigoEntregableRaw[];
}

/* ─── Raw DB types — responsables table ──────────────────── */
interface PersonalRaw {
  nombre: string;
  apellido: string;
  sede_id: string;
}
interface AreaRaw {
  nombre: string;
}
interface ResponsableRawDB {
  id: string;
  cargo: string;
  area: AreaRaw;
  personal: PersonalRaw[];
}
interface EntregableSeguimientoRaw {
  estado: "cumplido" | "parcial" | "no_cumplido" | null;
  proceso_id: string;
}
interface EntregableForRespRaw {
  id: string;
  entregable_seguimiento: EntregableSeguimientoRaw[];
}
interface CriterioForRespRaw {
  id: string;
  codigo_criterio: string;
  /* codigo → macroproceso_id used to exclude macro 8 & 12 */
  codigo: { macroproceso: { orden: number } };
  entregable: EntregableForRespRaw[];
  criterio_responsable: { responsable_id: string }[];
}

/* ─── Server Component ────────────────────────────────────── */
export default async function ResultadosPage() {
  /* 1. Procesos */
  const { data: procesosRaw } = await supabase
    .from("proceso_acreditacion")
    .select("id, anio, sede(id, nombre)")
    .order("anio", { ascending: true });

  const procesos: ProcesoOption[] = (procesosRaw ?? []).map((p: any) => ({
    id: p.id,
    label: `${p.sede?.nombre ?? "Sin sede"} · ${p.anio}`,
  }));

  /* 2. Macroprocesos → estandares → criterios → autoevaluaciones */
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

  /* 3. Macroprocesos → estandares → criterios → entregables → seguimiento */
  const { data: macrosEntregablesRaw, error: errorEnt } = await supabase
    .from("macroproceso")
    .select(`
      id,
      codigo,
      nombre,
      orden,
      estandares:codigo(
        id,
        codigo,
        criterio(
          id,
          codigo_criterio,
          entregable(
            id,
            entregable_seguimiento(
              estado,
              proceso_id
            )
          )
        )
      )
    `)
    .order("orden", { ascending: true });

  if (errorEnt) {
    console.error("[ResultadosPage] Supabase entregables error:", errorEnt.message);
  }

  /* 4. Responsables con criterios asignados → entregables → seguimiento */
  /*    We load all responsables that have at least one criterio_responsable,
        then resolve their name from personal (per sede of each proceso),
        and their entregable states. Filtering of excluded criterios & macros
        happens in JS below so we don't need a complex Supabase query. */
  const { data: responsablesRaw, error: errorResp } = await supabase
    .from("responsable")
    .select(`
      id,
      cargo,
      area(nombre),
      personal(nombre, apellido, sede_id),
      criterio_responsable(
        criterio_id,
        criterio(
          id,
          codigo_criterio,
          codigo(
            macroproceso(orden)
          ),
          entregable(
            id,
            entregable_seguimiento(
              estado,
              proceso_id
            )
          )
        )
      )
    `);

  if (errorResp) {
    console.error("[ResultadosPage] Supabase responsables error:", errorResp.message);
  }

  /* 5. Build dataByProceso (autoevaluacion chart) */
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

  /* 6. Build entregablesByProceso */
  const entregablesByProceso: Record<string, MacroprocesoEntregable[]> = {};

  for (const proc of procesos) {
    const macros: MacroprocesoEntregable[] = ((macrosEntregablesRaw ?? []) as MacroEntregableRaw[]).map((m) => {
      const estandares: EstandarEntregable[] = (m.estandares ?? []).map((est) => {
        const criterios: CriterioEntregable[] = (est.criterio ?? []).map((cr) => {
          const entregables: EntregableRaw[] = (cr.entregable ?? []).map((ent) => {
            const seg = (ent.entregable_seguimiento ?? []).find((s) => s.proceso_id === proc.id);
            return {
              id: ent.id,
              estado: seg?.estado ?? null,
            };
          });
          return {
            id: cr.id,
            codigo_criterio: cr.codigo_criterio,
            entregables,
          };
        });
        return { id: est.id, codigo: est.codigo, criterios };
      });

      return {
        id: m.id,
        orden: m.orden,
        codigo: m.codigo,
        nombre: m.nombre,
        estandares,
      } satisfies MacroprocesoEntregable;
    });

    entregablesByProceso[proc.id] = macros;
  }

  /* 7. Build responsablesByProceso */
  const responsablesByProceso: Record<string, ResponsableRow[]> = {};

  // Build a lookup: sedeId → proceso[] for resolving personal by sede
  const sedeByProceso: Record<string, string> = {};
  for (const p of procesosRaw ?? []) {
    sedeByProceso[p.id] = (p as any).sede?.id ?? "";
  }

  for (const proc of procesos) {
    const sedeId = sedeByProceso[proc.id] ?? "";
    const rows: ResponsableRow[] = [];

    for (const resp of (responsablesRaw ?? []) as any[]) {
      // Collect all criterios for this responsable (from criterio_responsable)
      const criterioLinks: any[] = resp.criterio_responsable ?? [];

      // Resolve this responsable's person for the proceso's sede
      const personals: PersonalRaw[] = resp.personal ?? [];
      const persona =
        personals.find((p: PersonalRaw) => p.sede_id === sedeId) ??
        personals[0] ?? // fallback: corporate (Magdalena) or first found
        null;

      // Skip responsables with no personal data at all
      if (!persona) continue;

      // Collect entregables from non-excluded criterios of non-excluded macros
      const entregables: { estado: EstadoKey }[] = [];
      let hasCriterio = false;

      for (const link of criterioLinks) {
        const cr = link.criterio;
        if (!cr) continue;

        // Exclude by criterio code
        if (EXCLUDED_CRITERIOS.has(cr.codigo_criterio)) continue;

        // Exclude by macroproceso orden
        const macroOrden: number = cr.codigo?.macroproceso?.orden ?? 0;
        if (EXCLUDED_MACROS_ORDEN.has(macroOrden)) continue;

        hasCriterio = true;

        for (const ent of cr.entregable ?? []) {
          const seg = (ent.entregable_seguimiento ?? []).find(
            (s: EntregableSeguimientoRaw) => s.proceso_id === proc.id
          );
          const estado: EstadoKey = seg?.estado ?? "sin_estado";
          entregables.push({ estado });
        }
      }

      // Only include responsables that have at least one valid criterio
      if (!hasCriterio) continue;

      rows.push({
        responsable_id: resp.id,
        nombre: persona.nombre ?? "",
        apellido: persona.apellido ?? "",
        cargo: resp.cargo ?? "",
        area_nombre: (resp.area as AreaRaw)?.nombre ?? "",
        entregables,
      });
    }

    // Sort by area then by apellido
    rows.sort((a, b) =>
      a.area_nombre.localeCompare(b.area_nombre) ||
      `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)
    );

    responsablesByProceso[proc.id] = rows;
  }

  return (
    <ResultadosClientContainer
      procesos={procesos}
      dataByProceso={dataByProceso}
      entregablesByProceso={entregablesByProceso}
      responsablesByProceso={responsablesByProceso}
    />
  );
}
