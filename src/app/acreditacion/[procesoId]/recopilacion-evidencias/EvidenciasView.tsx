"use client";

import { useState, useTransition, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";

/* ─── Types ──────────────────────────────────────────────── */
interface Macroproceso { id: string; codigo: string; nombre: string; orden: number; }
interface Codigo { id: string; codigo: string; descripcion: string; orden: number; }
interface CriterioData {
  id: string;
  codigo_criterio: string;
  descripcion: string;
  codigo_id: string;
  fuente_0: string | null;
  fuente_1: string | null;
  fuente_2: string | null;
  responsables: { nombre: string; apellido: string; cargo: string; area_nombre: string }[];
}

interface Seguimiento {
  id?: string;
  estado: string;
  observacion: string;
  isObservacionOpen: boolean;
  isSavingObservacion: boolean;
}

interface EvidenciaRow {
  id?: string;
  nombre_evidencia: string;
  link_evidencia: string;
  orden: number;
  isSaving: boolean;
}

interface EntregableRow {
  id: string;
  criterio_id: string;
  descripcion: string;
  tipo_entregable: string;
  nota: string;
  orden: number;
  seguimiento: Seguimiento;
  evidencias: EvidenciaRow[];
}

interface Props {
  proceso: { id: string; anio: number; sede: { id: string; nombre: string } };
  macroprocesos: Macroproceso[];
  macroprocesoInicialId: string;
  codigosIniciales: Codigo[];
  criteriosIniciales: any[];
}

/* ─── Constants ──────────────────────────────────────────── */
const TIPO_LABELS: Record<string, string> = {
  documento: "Doc.",
  proceso: "Proc.",
  in_situ: "Obs.",
  ambos: "Ambos",
};

const ESTADO_OPTIONS = [
  { value: "", label: "— Estado —" },
  { value: "cumplido", label: "Cumplido" },
  { value: "parcial", label: "Parcial" },
  { value: "no_cumplido", label: "No cumplido" },
];

const ESTADO_COLORS: Record<string, string> = {
  "": "bg-gray-50 text-gray-500 border-gray-300",
  "cumplido": "bg-green-100 text-green-700 border-green-200",
  "parcial": "bg-amber-100 text-amber-700 border-amber-200",
  "no_cumplido": "bg-red-100 text-red-700 border-red-200",
};

const EXCLUDED_CRITERIOS = new Set([
  "DIR1-4", "DIR1-5", "DIR1-6", "DIR1-8", "GRH4-1", "MRA8-1", "MRA8-2", "MRA8-3",
  "ATA1-3", "ATA3-2", "ATA3-3", "ATA3-4", "ATA3-5", "ATA3-6", "RCR4-1", "RCR4-2",
  "RCR4-3", "GMD3-4", "GMD3-5", "MRS1-1", "MRS1-2", "MRS1-3", "MRS2-1", "MRS2-2"
]);

const EXCLUDED_MACROS = new Set([8, 12]);

/* ─── Helpers ────────────────────────────────────────────── */
function buildEntregables(c: any, procesoId: string): EntregableRow[] {
  return (c.entregable ?? [])
    .sort((a: any, b: any) => (a.orden ?? 1) - (b.orden ?? 1))
    .map((e: any) => {
      const segs = e.entregable_seguimiento ?? [];
      const seg = segs.find((s: any) => s.proceso_id === procesoId);

      let evidencias: EvidenciaRow[] = [];
      if (seg && seg.entregable_evidencia) {
        evidencias = [...seg.entregable_evidencia]
          .sort((a: any, b: any) => (a.orden ?? 1) - (b.orden ?? 1))
          .map((ev: any) => ({
            id: ev.id,
            nombre_evidencia: ev.nombre_evidencia ?? "",
            link_evidencia: ev.link_evidencia ?? "",
            orden: ev.orden ?? 1,
            isSaving: false,
          }));
      }

      if (evidencias.length === 0) {
        evidencias = [{
          nombre_evidencia: "",
          link_evidencia: "",
          orden: 1,
          isSaving: false,
        }];
      }

      return {
        id: e.id,
        criterio_id: c.id,
        descripcion: e.descripcion ?? "",
        tipo_entregable: e.tipo_entregable ?? "",
        nota: e.nota ?? "",
        orden: e.orden ?? 1,
        seguimiento: {
          id: seg?.id,
          estado: seg?.estado ?? "",
          observacion: seg?.observacion ?? "",
          isObservacionOpen: false,
          isSavingObservacion: false,
        },
        evidencias,
      };
    });
}

function extractCriterio(c: any): CriterioData {
  return {
    id: c.id,
    codigo_criterio: c.codigo_criterio,
    descripcion: c.descripcion,
    codigo_id: c.codigo_id,
    fuente_0: c.fuente_0 ?? null,
    fuente_1: c.fuente_1 ?? null,
    fuente_2: c.fuente_2 ?? null,
    responsables: [], // populated separately via fetchResponsablesForCriterios
  };
}

/* ─── Separate responsable fetch ─── */
async function fetchResponsablesForCriterios(
  criterioIds: string[],
  sedeId: string
): Promise<Record<string, CriterioData["responsables"]>> {
  if (!criterioIds.length) return {};

  // Step 1: criterio_id → responsable_id
  const { data: crRows } = await supabase
    .from("criterio_responsable")
    .select("criterio_id, responsable_id")
    .in("criterio_id", criterioIds);
  if (!crRows?.length) return {};

  const responsableIds = [...new Set(crRows.map((r: any) => r.responsable_id))];

  // Step 2: responsable → cargo + area_id
  const { data: respRows } = await supabase
    .from("responsable")
    .select("id, cargo, area_id")
    .in("id", responsableIds);
  if (!respRows?.length) return {};

  // Step 3: area → nombre
  const areaIds = [...new Set(respRows.map((r: any) => r.area_id).filter(Boolean))];
  const areaMap: Record<string, string> = {};
  if (areaIds.length) {
    const { data: areaRows } = await supabase
      .from("area")
      .select("id, nombre")
      .in("id", areaIds);
    for (const a of areaRows ?? []) areaMap[a.id] = a.nombre;
  }

  // Step 4: personal → nombre + apellido (all sedes, prefer proceso sede)
  const { data: personalRows } = await supabase
    .from("personal")
    .select("responsable_id, sede_id, nombre, apellido")
    .in("responsable_id", responsableIds);

  // Prefer the person from the proceso sede; fall back to any match (corporate areas use Magdalena)
  const personalByRespId: Record<string, { nombre: string; apellido: string }> = {};
  for (const p of personalRows ?? []) {
    const existing = personalByRespId[p.responsable_id];
    if (!existing) {
      // First found — take it as baseline
      personalByRespId[p.responsable_id] = { nombre: p.nombre ?? "", apellido: p.apellido ?? "" };
    } else if (p.sede_id === sedeId) {
      // Override with the sede-specific person when found
      personalByRespId[p.responsable_id] = { nombre: p.nombre ?? "", apellido: p.apellido ?? "" };
    }
  }

  // responsable lookup
  const respById: Record<string, { cargo: string; area_nombre: string; nombre: string; apellido: string }> = {};
  for (const r of respRows) {
    const persona = personalByRespId[r.id];
    respById[r.id] = {
      cargo: r.cargo ?? "",
      area_nombre: areaMap[r.area_id] ?? "",
      nombre: persona?.nombre ?? "",
      apellido: persona?.apellido ?? "",
    };
  }

  // Build criterio_id → responsables[]
  const result: Record<string, CriterioData["responsables"]> = {};
  for (const row of crRows) {
    const resp = respById[row.responsable_id];
    if (!resp) continue;
    if (!result[row.criterio_id]) result[row.criterio_id] = [];
    result[row.criterio_id].push(resp);
  }
  return result;
}

/* ─── Component ──────────────────────────────────────────── */
export default function EvidenciasView({
  proceso,
  macroprocesos,
  macroprocesoInicialId,
  codigosIniciales,
  criteriosIniciales,
}: Props) {
  const [selectedMacroId, setSelectedMacroId] = useState<string>(macroprocesoInicialId);
  const [codigos, setCodigos] = useState<Codigo[]>(codigosIniciales);
  const [criterios, setCriterios] = useState<CriterioData[]>(criteriosIniciales.map(extractCriterio));
  const [selectedCodigoId, setSelectedCodigoId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSavingAll, setIsSavingAll] = useState(false);
  // Popover: "verf-{criterioId}" | "resp-{criterioId}" | null
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActivePopover(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load responsables for the initial criterios on mount
  useEffect(() => {
    const ids = criteriosIniciales.map((c: any) => c.id);
    if (!ids.length) return;
    fetchResponsablesForCriterios(ids, proceso.sede.id).then((respMap) => {
      setCriterios((prev) =>
        prev.map((c) => ({ ...c, responsables: respMap[c.id] ?? [] }))
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [entregableMap, setEntregableMap] = useState<Record<string, EntregableRow[]>>(() => {
    const map: Record<string, EntregableRow[]> = {};
    criteriosIniciales.forEach((c) => {
      map[c.id] = buildEntregables(c, proceso.id);
    });
    return map;
  });

  /* ─── Navigation ─── */
  const handleMacroprocesoClick = (macro: Macroproceso) => {
    if (macro.id === selectedMacroId) return;
    startTransition(async () => {
      setSelectedMacroId(macro.id);
      setSelectedCodigoId(null);

      const { data: nuevosCodigos } = await supabase
        .from("codigo")
        .select("id, codigo, descripcion, orden")
        .eq("macroproceso_id", macro.id)
        .order("orden", { ascending: true });
      const codigosResult = nuevosCodigos ?? [];
      setCodigos(codigosResult);

      const ids = codigosResult.map((c) => c.id);
      if (ids.length > 0) {
        const { data: raw, error } = await supabase
          .from("criterio")
          .select(`
            id, codigo_criterio, descripcion, codigo_id,
            fuente_0, fuente_1, fuente_2,
            entregable (
              id, descripcion, tipo_entregable, nota, orden,
              entregable_seguimiento (
                id, estado, observacion, proceso_id,
                entregable_evidencia (
                  id, nombre_evidencia, link_evidencia, orden
                )
              )
            )
          `)
          .in("codigo_id", ids);

        if (error) console.error("Error fetching criterios:", error);

        const rawArray = raw ?? [];
        const filteredArray = rawArray.filter((c: any) => !EXCLUDED_CRITERIOS.has(c.codigo_criterio));
        const mappedCriterios = filteredArray.map(extractCriterio);

        // Separate query for responsables
        const criterioIds = mappedCriterios.map((c: CriterioData) => c.id);
        const respMap = await fetchResponsablesForCriterios(criterioIds, proceso.sede.id);
        const criteriosWithResp = mappedCriterios.map((c: CriterioData) => ({ ...c, responsables: respMap[c.id] ?? [] }));

        setCriterios(criteriosWithResp);
        const newMap: Record<string, EntregableRow[]> = {};
        filteredArray.forEach((c: any) => {
          newMap[c.id] = buildEntregables(c, proceso.id);
        });
        setEntregableMap(newMap);
      } else {
        setCriterios([]);
        setEntregableMap({});
      }
    });
  };

  /* ─── Mutations: Seguimiento ─── */
  const updateSeguimiento = (criterioId: string, idx: number, patch: Partial<Seguimiento>) => {
    setEntregableMap((prev) => {
      const rows = [...(prev[criterioId] ?? [])];
      rows[idx] = { ...rows[idx], seguimiento: { ...rows[idx].seguimiento, ...patch } };
      return { ...prev, [criterioId]: rows };
    });
  };

  const saveSeguimiento = async (entregableId: string, currentSeg: Seguimiento, patch?: Partial<Seguimiento>, criterioId?: string, idx?: number) => {
    const seg = { ...currentSeg, ...patch };
    const hasIds = criterioId !== undefined && idx !== undefined;

    if (hasIds) {
      updateSeguimiento(criterioId!, idx!, { isSavingObservacion: true });
    }

    try {
      const payload = {
        entregable_id: entregableId,
        proceso_id: proceso.id,
        estado: seg.estado || null,
        observacion: seg.observacion || null,
      };

      let result;
      if (seg.id) {
        result = await supabase.from("entregable_seguimiento").update(payload).eq("id", seg.id).select("id").single();
      } else {
        // Use upsert to avoid unique constraint errors if the record was created in the meantime
        result = await supabase.from("entregable_seguimiento").upsert(payload, { onConflict: "entregable_id, proceso_id" }).select("id").single();
      }

      if (result.error) throw result.error;
      if (result.data && hasIds) {
        updateSeguimiento(criterioId!, idx!, { id: result.data.id });
      }
    } catch (err: any) {
      console.error("Error saving seguimiento:", err.message || err.code || "Unknown error", err);
    } finally {
      if (hasIds) {
        updateSeguimiento(criterioId!, idx!, { isSavingObservacion: false });
      }
    }
  };

  const saveAll = async () => {
    setIsSavingAll(true);
    try {
      for (const criterio of criteriosFiltrados) {
        const rows = entregableMap[criterio.id] ?? [];
        for (let entIdx = 0; entIdx < rows.length; entIdx++) {
          const row = rows[entIdx];

          if (row.seguimiento.observacion || row.seguimiento.estado) {
            await saveSeguimiento(row.id, row.seguimiento, undefined, criterio.id, entIdx);
          }

          for (let evIdx = 0; evIdx < row.evidencias.length; evIdx++) {
            const ev = row.evidencias[evIdx];
            if (ev.nombre_evidencia.trim() || ev.link_evidencia.trim()) {
              await saveEvidencia(criterio.id, entIdx, evIdx);
            }
          }
        }
      }
      alert("Se han guardado todos los cambios correctamente.");
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al guardar todo.");
    } finally {
      setIsSavingAll(false);
    }
  };

  /* ─── Mutations: Evidencia ─── */
  const updateEvidencia = (criterioId: string, entIdx: number, evIdx: number, patch: Partial<EvidenciaRow>) => {
    setEntregableMap((prev) => {
      const rows = [...(prev[criterioId] ?? [])];
      const evs = [...rows[entIdx].evidencias];
      evs[evIdx] = { ...evs[evIdx], ...patch };
      rows[entIdx] = { ...rows[entIdx], evidencias: evs };
      return { ...prev, [criterioId]: rows };
    });
  };

  const addEvidencia = (criterioId: string, entIdx: number) => {
    setEntregableMap((prev) => {
      const rows = [...(prev[criterioId] ?? [])];
      const maxOrden = Math.max(0, ...rows[entIdx].evidencias.map((e) => e.orden));
      const evs = [...rows[entIdx].evidencias, { nombre_evidencia: "", link_evidencia: "", orden: maxOrden + 1, isSaving: false }];
      rows[entIdx] = { ...rows[entIdx], evidencias: evs };
      return { ...prev, [criterioId]: rows };
    });
  };

  const removeEvidencia = async (criterioId: string, entIdx: number, evIdx: number) => {
    const row = entregableMap[criterioId]?.[entIdx];
    const ev = row?.evidencias[evIdx];
    if (!ev) return;

    if (ev.id) {
      if (!confirm("¿Seguro que deseas eliminar esta evidencia?")) return;
      updateEvidencia(criterioId, entIdx, evIdx, { isSaving: true });
      await supabase.from("entregable_evidencia").delete().eq("id", ev.id);
    }

    setEntregableMap((prev) => {
      const rows = [...(prev[criterioId] ?? [])];
      const evs = [...rows[entIdx].evidencias];
      evs.splice(evIdx, 1);
      if (evs.length === 0) {
        evs.push({ nombre_evidencia: "", link_evidencia: "", orden: 1, isSaving: false });
      }
      rows[entIdx] = { ...rows[entIdx], evidencias: evs };
      return { ...prev, [criterioId]: rows };
    });
  };

  const saveEvidencia = async (criterioId: string, entIdx: number, evIdx: number) => {
    const row = entregableMap[criterioId]?.[entIdx];
    const ev = row?.evidencias[evIdx];
    if (!ev) return;

    updateEvidencia(criterioId, entIdx, evIdx, { isSaving: true });

    let segId = row.seguimiento.id;
    if (!segId) {
      const { data: savedSeg } = await supabase
        .from("entregable_seguimiento")
        .insert({
          entregable_id: row.id,
          proceso_id: proceso.id,
          estado: row.seguimiento.estado || null,
        })
        .select("id").single();
      if (savedSeg) {
        segId = savedSeg.id;
        updateSeguimiento(criterioId, entIdx, { id: segId });
      }
    }

    if (segId) {
      if (ev.id) {
        await supabase
          .from("entregable_evidencia")
          .update({
            nombre_evidencia: ev.nombre_evidencia || null,
            link_evidencia: ev.link_evidencia || null,
            orden: ev.orden,
          })
          .eq("id", ev.id);
      } else {
        const { data: savedEv } = await supabase
          .from("entregable_evidencia")
          .insert({
            entregable_seguimiento_id: segId,
            nombre_evidencia: ev.nombre_evidencia || null,
            link_evidencia: ev.link_evidencia || null,
            orden: ev.orden,
          })
          .select("id").single();
        if (savedEv) {
          updateEvidencia(criterioId, entIdx, evIdx, { id: savedEv.id });
        }
      }
    }

    updateEvidencia(criterioId, entIdx, evIdx, { isSaving: false });
  };

  /* ─── Filtering ─── */
  const criteriosFiltrados = useMemo(() => {
    let filtrados = criterios.filter((c) => !EXCLUDED_CRITERIOS.has(c.codigo_criterio));
    if (selectedCodigoId) {
      filtrados = filtrados.filter((c) => c.codigo_id === selectedCodigoId);
    }
    return filtrados.sort((a, b) =>
      a.codigo_criterio.localeCompare(b.codigo_criterio, undefined, { numeric: true, sensitivity: "base" })
    );
  }, [criterios, selectedCodigoId]);

  const macroActual = macroprocesos.find((m) => m.id === selectedMacroId);

  /* ─── Render ─── */
  return (
    <div className="flex flex-col h-full items-center justify-center font-sans">
      <div className="w-full mb-6 flex flex-col items-start gap-4">
        <div>
          <h1 className="text-gray-900 text-3xl font-extrabold leading-snug drop-shadow-sm">
            Recopilación de Evidencias
          </h1>
          <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded">Sede {proceso.sede.nombre}</span>
            <span>·</span>
            <span>Proceso de Acreditación {proceso.anio}</span>
          </p>
        </div>
      </div>

      <div className="w-full flex flex-col h-[80vh] min-h-[500px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">

        {/* ─── Header ─── */}
        <div className="bg-[#272729] border-b border-white/10 flex flex-col shrink-0">
          <div className="px-8 py-4 flex items-center justify-between">
            <h2 className="text-white text-lg leading-tight">
              {macroActual ? (
                <>
                  <span className="font-bold">Macroproceso {macroActual.orden}</span>
                  <span className="ml-8 mr-8 text-white/30 font-light">|</span>
                  <span className="font-light text-white/90">{macroActual.nombre}</span>
                </>
              ) : (
                <span className="text-white/50 italic">Cargando...</span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50 font-medium">Estándar:</span>
              <div className="relative">
                <select
                  value={selectedCodigoId ?? ""}
                  onChange={(e) => setSelectedCodigoId(e.target.value || null)}
                  disabled={isPending}
                  className="appearance-none bg-white border border-transparent text-gray-900 text-sm rounded-lg pl-3 pr-8 py-1.5 focus:outline-none cursor-pointer transition-all w-36 font-medium truncate disabled:opacity-50"
                >
                  <option value="">Todos</option>
                  {codigos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo}
                    </option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Body ─── */}
        <div className="flex flex-1 min-h-0 overflow-hidden relative">

          {/* Loading overlay */}
          {isPending && (
            <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center">
              <svg className="w-10 h-10 animate-spin text-[#3d537e]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="mt-3 text-sm font-bold text-[#3d537e] uppercase tracking-widest">Cargando</p>
            </div>
          )}

          {/* Sidebar */}
          <aside className="w-64 shrink-0 bg-[#3d557c] flex flex-col border-r border-white/5">
            <OverlayScrollbarsComponent
              element="nav"
              options={{ scrollbars: { autoHide: "scroll", theme: "os-theme-dark" } }}
              defer
              className="flex-1 py-3 px-4"
            >
              {macroprocesos.filter(m => !EXCLUDED_MACROS.has(m.orden)).map((macro) => {
                const isActive = macro.id === selectedMacroId;
                return (
                  <button
                    key={macro.id}
                    onClick={() => handleMacroprocesoClick(macro)}
                    className={`w-full text-left flex flex-col px-4 py-3 rounded-xl mb-2 transition-all duration-200 ${isActive
                      ? "border border-white/30 shadow-2xl/20 inset-shadow-sm inset-shadow-white/30 backdrop-blur-md bg-white/5 text-white scale-[1.02]"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5"
                      }`}
                  >
                    <span className="font-bold text-sm tracking-wide mb-1 text-white">{macro.orden}. {macro.codigo}</span>
                    <span className={`text-[11px] leading-snug ${isActive ? "text-white" : "text-white/70"}`}>{macro.nombre}</span>
                  </button>
                );
              })}
            </OverlayScrollbarsComponent>
            <div className="px-5 py-4 border-t border-white/5">
              <p className="text-[10px] text-white/20">Sistema de Calidad · Aviva</p>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 flex flex-col min-w-0 bg-[#f8f8f8]">
            {/* Header Código Descripción */}
            {selectedCodigoId && (() => {
              const obj = codigos.find((c) => c.id === selectedCodigoId);
              return obj ? (
                <div className="bg-white px-8 py-3 border-b border-gray-200 text-sm text-gray-600 shrink-0">
                  <span className="font-bold text-gray-900 mr-2">{obj.codigo}:</span>
                  {obj.descripcion}
                </div>
              ) : null;
            })()}

            <OverlayScrollbarsComponent
              element="div"
              options={{ scrollbars: { autoHide: "scroll", theme: "os-theme-light" } }}
              defer
              className="flex-1 p-6"
            >
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex border-b border-gray-200 bg-gray-200/80 text-[11px] font-bold uppercase tracking-wider text-gray-500 shrink-0">
                  <div className="w-[5%] shrink-0 px-2 py-3 text-center">Cr.</div>
                  <div className="w-[25%] shrink-0 px-3 py-3 border-l border-gray-200">Entregable</div>
                  <div className="w-[5%] shrink-0 px-2 py-3 border-l border-gray-200 text-center">Tipo</div>
                  <div className="w-[11%] shrink-0 px-2 py-3 border-l border-gray-200 text-center">Estado</div>
                  <div className="w-[25%] shrink-0 px-3 py-3 border-l border-gray-200">Evidencia</div>
                  <div className="w-[24%] shrink-0 px-3 py-3 border-l border-gray-200">Fuente</div>
                  <div className="w-[5%] shrink-0 px-2 py-3 border-l border-gray-200 text-center">Acción</div>
                </div>

                {/* Rows */}
                {!isPending && (
                  criteriosFiltrados.length === 0 ? (
                    <div className="flex items-center justify-center py-20 text-gray-300 text-sm">
                      No hay criterios para este estándar.
                    </div>
                  ) : (
                    criteriosFiltrados.map((criterio, ci) => {
                      const entregables = entregableMap[criterio.id] ?? [];

                      return (
                        <div
                          key={criterio.id}
                          className={`flex ${ci !== 0 ? "border-t border-gray-200" : ""} ${ci % 2 !== 0 ? "bg-gray-100" : "bg-white"}`}
                        >
                           {/* Col 1 — Criterio */}
                          <div className="w-[5%] shrink-0 border-r border-gray-100 px-1.5 py-2 flex flex-col items-center justify-between">
                            <span className="font-mono text-[10px] font-bold text-gray-900 text-center break-all leading-tight">
                              {criterio.codigo_criterio}
                            </span>
                            {/* Info buttons — bottom, side by side */}
                            <div className="flex items-center gap-1.5">
                              {/* Verificadores */}
                              <div className="relative" ref={activePopover === `verf-${criterio.id}` ? popoverRef : undefined}>
                                <button
                                  onClick={() => setActivePopover(activePopover === `verf-${criterio.id}` ? null : `verf-${criterio.id}`)}
                                  title="Ver verificadores"
                                  className="text-gray-400 hover:text-indigo-600 transition-colors"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                </button>
                                {activePopover === `verf-${criterio.id}` && (
                                  <div className="absolute left-full ml-2 bottom-0 z-50 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Verificadores</p>
                                    {!criterio.fuente_0 && !criterio.fuente_1 && !criterio.fuente_2 ? (
                                      <p className="text-xs text-gray-400 italic">Sin verificadores registrados.</p>
                                    ) : (
                                      <ul className="space-y-2">
                                        {criterio.fuente_0 && (
                                          <li className="flex items-start gap-2">
                                            <span className="mt-1 w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                                            <span className="text-xs text-gray-700 leading-relaxed">{criterio.fuente_0}</span>
                                          </li>
                                        )}
                                        {criterio.fuente_1 && (
                                          <li className="flex items-start gap-2">
                                            <span className="mt-1 w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                                            <span className="text-xs text-gray-700 leading-relaxed">{criterio.fuente_1}</span>
                                          </li>
                                        )}
                                        {criterio.fuente_2 && (
                                          <li className="flex items-start gap-2">
                                            <span className="mt-1 w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
                                            <span className="text-xs text-gray-700 leading-relaxed">{criterio.fuente_2}</span>
                                          </li>
                                        )}
                                      </ul>
                                    )}
                                  </div>
                                )}
                              </div>
                              {/* Responsable */}
                              <div className="relative" ref={activePopover === `resp-${criterio.id}` ? popoverRef : undefined}>
                                <button
                                  onClick={() => setActivePopover(activePopover === `resp-${criterio.id}` ? null : `resp-${criterio.id}`)}
                                  title="Ver responsable"
                                  className="text-gray-400 hover:text-blue-600 transition-colors"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </button>
                                {activePopover === `resp-${criterio.id}` && (
                                  <div className="absolute left-full ml-2 bottom-0 z-50 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Responsable</p>
                                    {criterio.responsables.length === 0 ? (
                                      <p className="text-xs text-gray-400 italic">Sin responsable asignado.</p>
                                    ) : (
                                      <ul className="space-y-2.5">
                                        {criterio.responsables.map((r, ri) => (
                                          <li key={ri} className="text-xs text-gray-700 border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                                            <p className="font-semibold text-gray-900">{r.nombre} {r.apellido}</p>
                                            <p className="text-gray-500">{r.cargo}</p>
                                            <p className="text-indigo-600 font-medium">{r.area_nombre}</p>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Cols 2-7 — Entregable rows stacked */}
                          <div className="w-[95%] shrink-0 flex flex-col min-w-0">
                            {entregables.length === 0 ? (
                              <div className="flex items-center px-4 py-3 text-xs text-gray-300 italic">
                                Sin entregables definidos.
                              </div>
                            ) : (
                              entregables.map((row, idx) => {
                                const seg = row.seguimiento;
                                const estadoColor = ESTADO_COLORS[seg.estado] ?? ESTADO_COLORS[""];

                                return (
                                  <div
                                    key={row.id}
                                    className={`flex flex-col ${idx !== 0 ? "border-t border-gray-100" : ""}`}
                                  >
                                    <div className="flex min-h-[72px]">
                                      {/* Left side (Cols 2-4) 41/95 = 43.2% */}
                                      <div className="w-[43.2%] flex items-stretch border-r border-gray-100">
                                        {/* Entregable 25/41 = 61% */}
                                        <div className="w-[61%] shrink-0 px-3 py-3 border-r border-gray-100 flex items-center relative">
                                          <p className="text-sm text-gray-700 leading-relaxed line-clamp-3 pr-14">
                                            {row.descripcion}
                                          </p>
                                          <div className="absolute bottom-2 right-2 flex gap-1">
                                            <button
                                              onClick={() => updateSeguimiento(criterio.id, idx, { isObservacionOpen: !seg.isObservacionOpen })}
                                              className={`transition-colors ${seg.observacion ? "text-amber-500 hover:text-amber-600" : "text-gray-400 hover:text-gray-600"}`}
                                              title="Añadir/Ver observación"
                                            >
                                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                              </svg>
                                            </button>
                                            <button
                                              onClick={() => addEvidencia(criterio.id, idx)}
                                              className="text-gray-400 hover:text-blue-600 transition-colors"
                                              title="Añadir evidencia"
                                            >
                                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                              </svg>
                                            </button>
                                          </div>
                                        </div>
                                        {/* Tipo 5/41 = 12.2% */}
                                        <div className="w-[12.2%] shrink-0 px-1 py-3 border-r border-gray-100 flex items-center justify-center">
                                          {row.tipo_entregable ? (
                                            <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 whitespace-nowrap">
                                              {TIPO_LABELS[row.tipo_entregable] ?? row.tipo_entregable}
                                            </span>
                                          ) : (
                                            <span className="text-gray-300 text-xs">—</span>
                                          )}
                                        </div>
                                        {/* Estado 11/41 = 26.8% */}
                                        <div className="w-[26.8%] shrink-0 px-2 py-3 flex items-center">
                                          <select
                                            value={seg.estado}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              updateSeguimiento(criterio.id, idx, { estado: val });
                                              saveSeguimiento(row.id, seg, { estado: val }, criterio.id, idx);
                                            }}
                                            className={`w-full appearance-none text-center text-xs font-medium rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors border ${estadoColor}`}
                                          >
                                            {ESTADO_OPTIONS.map((opt) => (
                                              <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>

                                      {/* Right side (Cols 5-7) 54/95 = 56.8% */}
                                      <div className="w-[56.8%] flex flex-col min-w-0">
                                        {row.evidencias.map((ev, evIdx) => (
                                          <div key={ev.id || evIdx} className={`flex items-stretch min-h-[72px] ${evIdx !== 0 ? "border-t border-gray-100" : ""}`}>
                                            {/* Evidencia 25/54 = 46.3% */}
                                            <div className="w-[46.3%] shrink-0 px-3 py-3 border-r border-gray-100 flex items-center">
                                              <textarea
                                                value={ev.nombre_evidencia}
                                                onChange={(e) => updateEvidencia(criterio.id, idx, evIdx, { nombre_evidencia: e.target.value })}
                                                placeholder="Ej. Acta de comité..."
                                                className="w-full text-sm text-gray-700 bg-transparent border-0 focus:ring-0 p-0 resize-none h-full focus:outline-none placeholder:text-gray-300"
                                                rows={2}
                                              />
                                            </div>

                                            {/* Fuente 24/54 = 44.4% */}
                                            <div className="w-[44.4%] shrink-0 px-3 py-3 border-r border-gray-100 flex items-center relative group">
                                              <input
                                                type="text"
                                                value={ev.link_evidencia}
                                                onChange={(e) => updateEvidencia(criterio.id, idx, evIdx, { link_evidencia: e.target.value })}
                                                placeholder="https://..."
                                                className="w-full text-sm text-blue-600 bg-transparent border-0 focus:ring-0 p-0 h-full focus:outline-none placeholder:text-gray-300 truncate pr-6"
                                              />
                                              {ev.link_evidencia && ev.link_evidencia.startsWith("http") && (
                                                <a
                                                  href={ev.link_evidencia}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="absolute right-2 p-1 text-gray-400 hover:text-blue-600 transition-colors bg-white rounded shadow-sm opacity-0 group-hover:opacity-100 border border-gray-100"
                                                  title="Abrir enlace"
                                                >
                                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                  </svg>
                                                </a>
                                              )}
                                            </div>

                                            {/* Acción 5/54 = 9.3% */}
                                            <div className="w-[9.3%] shrink-0 py-2 flex flex-col items-center justify-center gap-1.5">
                                              <button
                                                onClick={() => saveEvidencia(criterio.id, idx, evIdx)}
                                                disabled={ev.isSaving}
                                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
                                                title="Guardar"
                                              >
                                                {ev.isSaving ? (
                                                  <svg className="w-4 h-4 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                  </svg>
                                                ) : (
                                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                  </svg>
                                                )}
                                              </button>
                                              <button
                                                onClick={() => removeEvidencia(criterio.id, idx, evIdx)}
                                                disabled={ev.isSaving}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                                                title="Eliminar fila"
                                              >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Observation Panel */}
                                    {seg.isObservacionOpen && (
                                      <div className="bg-amber-50 p-3 border-t border-amber-100/80 flex flex-col gap-2 relative">
                                        <div className="flex items-center justify-between">
                                          <label className="text-xs font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                                            <span>📝</span> Observación
                                          </label>
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => updateSeguimiento(criterio.id, idx, { isObservacionOpen: false })}
                                              className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 transition-colors"
                                            >
                                              Cerrar
                                            </button>
                                            <button
                                              onClick={() => saveSeguimiento(row.id, seg, undefined, criterio.id, idx)}
                                              disabled={seg.isSavingObservacion}
                                              className="text-xs px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-800 rounded font-medium transition-colors disabled:opacity-50 shadow-sm"
                                            >
                                              {seg.isSavingObservacion ? "Guardando..." : "Guardar nota"}
                                            </button>
                                          </div>
                                        </div>
                                        <textarea
                                          value={seg.observacion}
                                          onChange={(e) => updateSeguimiento(criterio.id, idx, { observacion: e.target.value })}
                                          placeholder="Escribe una observación o comentario adicional para este entregable..."
                                          className="w-full text-sm text-gray-700 bg-white/70 border border-amber-200/50 rounded-md p-2.5 resize-y focus:outline-none focus:ring-1 focus:ring-amber-400 focus:bg-white transition-colors min-h-[60px]"
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })
                  )
                )}
              </div>

              {/* Stats */}
              {!isPending && (
                <div className="flex items-center justify-between mt-4 px-1">
                  <p className="text-xs text-gray-400">
                    Mostrando <span className="font-medium text-gray-600">{criteriosFiltrados.length}</span>{" "}
                    de <span className="font-medium text-gray-600">{criterios.length}</span> criterios
                  </p>

                  <div className="flex items-center gap-4">
                    {selectedCodigoId && (
                      <button onClick={() => setSelectedCodigoId(null)} className="text-xs text-blue-500 hover:text-blue-700 transition-colors">
                        Limpiar filtro ×
                      </button>
                    )}
                    <button
                      onClick={saveAll}
                      disabled={isSavingAll}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-[11px] uppercase tracking-wider font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
                    >
                      {isSavingAll ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {isSavingAll ? "Guardando..." : "Guardar todo"}
                    </button>
                  </div>
                </div>
              )}
            </OverlayScrollbarsComponent>
          </main>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full mt-4 flex justify-end">
        <Link
          href={`/acreditacion/${proceso.id}`}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 text-sm transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver al Dashboard
        </Link>
      </div>
    </div>
  );
}
