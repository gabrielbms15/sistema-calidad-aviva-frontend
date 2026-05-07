"use client";

import { useState, useTransition } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";

/* ─── Types ──────────────────────────────────────────────── */
interface Macroproceso { id: string; codigo: string; nombre: string; orden: number; }
interface Codigo { id: string; codigo: string; descripcion: string; orden: number; }
interface CriterioData { id: string; codigo_criterio: string; descripcion: string; codigo_id: string; }

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
  documento:   "Doc.",
  proceso:     "Proc.",
  in_situ:     "Obs.",
  ambos:       "Ambos",
};



const ESTADO_OPTIONS = [
  { value: "",            label: "— Estado —" },
  { value: "cumplido",    label: "Cumplido" },
  { value: "parcial",     label: "Parcial" },
  { value: "no_cumplido", label: "No cumplido" },
];

const ESTADO_COLORS: Record<string, string> = {
  cumplido:    "bg-green-100 text-green-700 border-green-200",
  parcial:     "bg-yellow-100 text-yellow-700 border-yellow-200",
  no_cumplido: "bg-red-100 text-red-700 border-red-200",
};

/** Macroprocesos ocultos (por código) */
const HIDDEN_MACROS = new Set(["AEX", "DIV"]);

/** Criterios ocultos (por codigo_criterio) */
const HIDDEN_CRITERIOS = new Set([
  "DIR1-4", "DIR1-5", "DIR1-6", "DIR1-8",
  "GRH4-1",
  "MRA8-1", "MRA8-2", "MRA8-3",
  "ATA1-3", "ATA3-2", "ATA3-3", "ATA3-4", "ATA3-5", "ATA3-6",
  "RCR4-1", "RCR4-2", "RCR4-3",
  "GMD3-4", "GMD3-5",
  "MRS1-1", "MRS1-2", "MRS1-3",
  "MRS2-1", "MRS2-2",
]);

/* ─── Helpers ────────────────────────────────────────────── */
function buildEntregables(c: any, procesoId: string): EntregableRow[] {
  return (c.entregable ?? [])
    .slice()
    .sort((a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0))
    .map((e: any) => {
      const seg = (e.entregable_seguimiento ?? []).find(
        (s: any) => s.proceso_id === procesoId
      );

      let evidencias = (seg?.entregable_evidencia ?? [])
        .slice()
        .sort((a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0))
        .map((ev: any) => ({
          id: ev.id,
          nombre_evidencia: ev.nombre_evidencia ?? "",
          link_evidencia: ev.link_evidencia ?? "",
          orden: ev.orden ?? 1,
          isSaving: false,
        }));

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
  return { id: c.id, codigo_criterio: c.codigo_criterio, descripcion: c.descripcion, codigo_id: c.codigo_id };
}

/* ─── Component ──────────────────────────────────────────── */
export default function EvidenciasView({
  proceso,
  macroprocesos,
  macroprocesoInicialId,
  codigosIniciales,
  criteriosIniciales,
}: Props) {
  const [selectedMacroId, setSelectedMacroId] = useState(macroprocesoInicialId);
  const [codigos, setCodigos] = useState<Codigo[]>(codigosIniciales);
  const [criterios, setCriterios] = useState<CriterioData[]>(criteriosIniciales.map(extractCriterio));
  const [selectedCodigoId, setSelectedCodigoId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSavingAll, setIsSavingAll] = useState(false);

  // entregableMap: criterioId → EntregableRow[]
  const [entregableMap, setEntregableMap] = useState<Record<string, EntregableRow[]>>(() => {
    const m: Record<string, EntregableRow[]> = {};
    criteriosIniciales.forEach((c) => { m[c.id] = buildEntregables(c, proceso.id); });
    return m;
  });

  const macroActual = macroprocesos.find((m) => m.id === selectedMacroId);

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

        if (error) {
          alert("Error cargando criterios: " + error.message);
          console.error(error);
        }

        const result = raw ?? [];
        setCriterios(result.map(extractCriterio));
        const newE: Record<string, EntregableRow[]> = {};
        result.forEach((c: any) => { newE[c.id] = buildEntregables(c, proceso.id); });
        setEntregableMap(newE);
      } else {
        setCriterios([]); setEntregableMap({});
      }
    });
  };

  /* ─── Mutations ─── */
  const updateSeguimiento = (criterioId: string, idx: number, patch: Partial<Seguimiento>) => {
    setEntregableMap((prev) => {
      const rows = [...(prev[criterioId] ?? [])];
      rows[idx] = { ...rows[idx], seguimiento: { ...rows[idx].seguimiento, ...patch } };
      return { ...prev, [criterioId]: rows };
    });
  };

  const saveEstado = async (criterioId: string, idx: number, newEstado: string) => {
    updateSeguimiento(criterioId, idx, { estado: newEstado });
    const row = entregableMap[criterioId]?.[idx];
    if (!row) return;
    const seg = row.seguimiento;

    if (seg.id) {
      await supabase.from("entregable_seguimiento").update({ estado: newEstado || null }).eq("id", seg.id);
    } else {
      const { data: saved } = await supabase
        .from("entregable_seguimiento")
        .insert({ entregable_id: row.id, proceso_id: proceso.id, estado: newEstado || null, observacion: seg.observacion || null })
        .select("id").single();
      if (saved) updateSeguimiento(criterioId, idx, { id: saved.id });
    }
  };

  const saveObservacion = async (criterioId: string, idx: number) => {
    const row = entregableMap[criterioId]?.[idx];
    if (!row) return;
    const seg = row.seguimiento;

    updateSeguimiento(criterioId, idx, { isSavingObservacion: true });

    if (seg.id) {
      await supabase.from("entregable_seguimiento").update({ observacion: seg.observacion || null }).eq("id", seg.id);
    } else {
      const { data: saved } = await supabase
        .from("entregable_seguimiento")
        .insert({ entregable_id: row.id, proceso_id: proceso.id, estado: seg.estado || null, observacion: seg.observacion || null })
        .select("id").single();
      if (saved) updateSeguimiento(criterioId, idx, { id: saved.id });
    }
    updateSeguimiento(criterioId, idx, { isSavingObservacion: false });
  };

  const saveAll = async () => {
    setIsSavingAll(true);
    try {
      // Usamos ejecución secuencial para evitar "race conditions" si un entregable no tiene seguimiento aún
      for (const criterio of criteriosFiltrados) {
        const rows = entregableMap[criterio.id] ?? [];
        for (let entIdx = 0; entIdx < rows.length; entIdx++) {
          const row = rows[entIdx];
          
          if (row.seguimiento.observacion) {
            await saveObservacion(criterio.id, entIdx);
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

  const updateEvidencia = (criterioId: string, entIdx: number, evIdx: number, patch: Partial<EvidenciaRow>) => {
    setEntregableMap((prev) => {
      const rows = [...(prev[criterioId] ?? [])];
      const evs = [...rows[entIdx].evidencias];
      evs[evIdx] = { ...evs[evIdx], ...patch };
      rows[entIdx] = { ...rows[entIdx], evidencias: evs };
      return { ...prev, [criterioId]: rows };
    });
  };

  const addEvidenciaRow = (criterioId: string, entIdx: number) => {
    setEntregableMap((prev) => {
      const rows = [...(prev[criterioId] ?? [])];
      const newOrden = rows[entIdx].evidencias.length + 1;
      rows[entIdx] = {
        ...rows[entIdx],
        evidencias: [...rows[entIdx].evidencias, { nombre_evidencia: "", link_evidencia: "", orden: newOrden, isSaving: false }]
      };
      return { ...prev, [criterioId]: rows };
    });
  };

  const saveEvidencia = async (criterioId: string, entIdx: number, evIdx: number) => {
    const row = entregableMap[criterioId]?.[entIdx];
    if (!row) return;
    const ev = row.evidencias[evIdx];
    let segId = row.seguimiento.id;

    updateEvidencia(criterioId, entIdx, evIdx, { isSaving: true });

    if (!segId) {
      const { data: savedSeg, error: segError } = await supabase
        .from("entregable_seguimiento")
        .insert({ entregable_id: row.id, proceso_id: proceso.id, estado: row.seguimiento.estado || null })
        .select("id").single();
      if (segError || !savedSeg) {
        alert("Error al inicializar el seguimiento de la evidencia.");
        updateEvidencia(criterioId, entIdx, evIdx, { isSaving: false });
        return;
      }
      segId = savedSeg.id;
      updateSeguimiento(criterioId, entIdx, { id: segId });
    }

    if (ev.id) {
      const { error } = await supabase.from("entregable_evidencia")
        .update({ nombre_evidencia: ev.nombre_evidencia, link_evidencia: ev.link_evidencia })
        .eq("id", ev.id);
      if (error) alert("Error al actualizar evidencia.");
    } else {
      const { data: saved, error } = await supabase.from("entregable_evidencia")
        .insert({ entregable_seguimiento_id: segId, nombre_evidencia: ev.nombre_evidencia, link_evidencia: ev.link_evidencia, orden: ev.orden })
        .select("id").single();
      if (error || !saved) {
        alert("Error al guardar evidencia.");
      } else {
        updateEvidencia(criterioId, entIdx, evIdx, { id: saved.id });
      }
    }
    updateEvidencia(criterioId, entIdx, evIdx, { isSaving: false });
  };

  const deleteEvidencia = async (criterioId: string, entIdx: number, evIdx: number) => {
    const row = entregableMap[criterioId]?.[entIdx];
    if (!row) return;
    const ev = row.evidencias[evIdx];

    if (!ev.id) {
      setEntregableMap((prev) => {
        const rows = [...(prev[criterioId] ?? [])];
        const newEvs = [...rows[entIdx].evidencias];
        newEvs.splice(evIdx, 1);
        if (newEvs.length === 0) {
          newEvs.push({ nombre_evidencia: "", link_evidencia: "", orden: 1, isSaving: false });
        }
        rows[entIdx] = { ...rows[entIdx], evidencias: newEvs };
        return { ...prev, [criterioId]: rows };
      });
      return;
    }

    if (!confirm("¿Eliminar esta evidencia?")) return;

    updateEvidencia(criterioId, entIdx, evIdx, { isSaving: true });
    const { error } = await supabase.from("entregable_evidencia").delete().eq("id", ev.id);
    if (error) {
      alert("Error al eliminar evidencia.");
      updateEvidencia(criterioId, entIdx, evIdx, { isSaving: false });
      return;
    }

    setEntregableMap((prev) => {
      const rows = [...(prev[criterioId] ?? [])];
      const newEvs = [...rows[entIdx].evidencias];
      newEvs.splice(evIdx, 1);
      if (newEvs.length === 0) {
        newEvs.push({ nombre_evidencia: "", link_evidencia: "", orden: 1, isSaving: false });
      }
      rows[entIdx] = { ...rows[entIdx], evidencias: newEvs };
      return { ...prev, [criterioId]: rows };
    });
  };

  /* ─── Derived list ─── */
  const criteriosFiltrados = (selectedCodigoId
    ? criterios.filter((c) => c.codigo_id === selectedCodigoId)
    : criterios
  )
    .filter((c) => !HIDDEN_CRITERIOS.has(c.codigo_criterio))
    .sort((a, b) =>
      a.codigo_criterio.localeCompare(b.codigo_criterio, undefined, { numeric: true, sensitivity: "base" })
    );

  /* ─── Render ─── */
  return (
    <div className="flex flex-col h-full items-center justify-center font-sans">
      <div className="w-full mb-6 flex flex-col items-start">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/acreditacion/recopilacion-evidencias"
            className="flex items-center gap-1 text-gray-400 hover:text-[#3d537e] text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Procesos
          </Link>
          <span className="text-gray-300 text-sm">/</span>
          <span className="text-gray-500 text-sm">{(proceso.sede as any)?.nombre ?? "—"} · {proceso.anio}</span>
        </div>
        <h1 className="text-gray-900 text-3xl font-extrabold leading-snug drop-shadow-sm">
          Recopilación de Evidencias
        </h1>
      </div>

      <div className="w-full flex flex-col h-[80vh] min-h-[500px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">

        {/* ─── Header ─── */}
        <div className="bg-[#272729] border-b border-white/10 flex flex-col shrink-0">
          <div className="px-8 py-4 flex items-center justify-between">
            <h2 className="text-white text-lg leading-tight">
              <span className="font-bold">Macroproceso {macroActual?.orden}</span>
              <span className="ml-8 mr-8 text-white/30 font-light">|</span>
              <span className="font-light text-white/90">{macroActual?.nombre}</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50 font-medium">Estándar:</span>
              <div className="relative">
                <select
                  value={selectedCodigoId ?? ""}
                  onChange={(e) => setSelectedCodigoId(e.target.value || null)}
                  className="appearance-none bg-white border border-transparent text-gray-900 text-sm rounded-lg pl-3 pr-8 py-1.5 focus:outline-none cursor-pointer transition-all w-36 font-medium"
                >
                  <option value="">Todos</option>
                  {codigos.map((c) => <option key={c.id} value={c.id}>{c.codigo}</option>)}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Body ─── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Sidebar */}
          <aside className="w-64 shrink-0 bg-[#3d557c] flex flex-col border-r border-white/5">
            <OverlayScrollbarsComponent
              element="nav"
              options={{ scrollbars: { autoHide: "scroll", theme: "os-theme-dark" } }}
              defer
              className="flex-1 py-3 px-4"
            >
              {macroprocesos.filter((m) => !HIDDEN_MACROS.has(m.codigo)).map((macro) => {
                const isActive = macro.id === selectedMacroId;
                return (
                  <button
                    key={macro.id}
                    onClick={() => handleMacroprocesoClick(macro)}
                    disabled={isPending}
                    className={`w-full text-left flex flex-col px-4 py-3 rounded-xl mb-2 transition-all duration-200 ${
                      isActive
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
            {/* Subheader estándar seleccionado */}
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
              {isPending ? (
                <div className="flex items-center justify-center h-48 gap-3 text-gray-400">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Cargando...
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                  {/* ── Table header ── */}
                  <div className="flex border-b border-gray-200 bg-gray-200/80 text-[11px] font-bold uppercase tracking-wider text-gray-500 shrink-0">
                    <div className="w-[5%]  shrink-0 px-2 py-3">Criterio</div>
                    <div className="w-[24%] shrink-0 px-3 py-3 border-l border-gray-200">Entregable</div>
                    <div className="w-[6%]  shrink-0 px-2 py-3 border-l border-gray-200 text-center">Tipo</div>
                    <div className="w-[12%] shrink-0 px-2 py-3 border-l border-gray-200 text-center">Estado</div>
                    <div className="w-[24%] shrink-0 px-3 py-3 border-l border-gray-200">Evidencia</div>
                    <div className="w-[23%] shrink-0 px-3 py-3 border-l border-gray-200">Fuente</div>
                    <div className="w-[6%]  shrink-0 px-2 py-3 border-l border-gray-200 text-center">Acción</div>
                  </div>

                  {/* ── Rows ── */}
                  {criteriosFiltrados.length === 0 ? (
                    <div className="flex items-center justify-center py-20 text-gray-300 text-sm">
                      No hay criterios para este filtro.
                    </div>
                  ) : (
                    criteriosFiltrados.map((criterio, ci) => {
                      const entregables = entregableMap[criterio.id] ?? [];

                      return (
                        <div
                          key={criterio.id}
                          className={`flex ${ci !== 0 ? "border-t border-gray-200" : ""} ${ci % 2 !== 0 ? "bg-gray-50/40" : "bg-white"}`}
                        >
                          {/* Col 1 — Criterio */}
                          <div className="w-[5%] shrink-0 border-r border-gray-100 px-2 py-4 flex items-start justify-center">
                            <span className="font-mono text-xs font-bold text-gray-900 text-center break-all">
                              {criterio.codigo_criterio}
                            </span>
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
                                const estadoColor = ESTADO_COLORS[seg.estado] ?? "bg-gray-100 text-gray-500 border-gray-200";

                                return (
                                  <div
                                    key={row.id}
                                    className={`flex flex-col ${idx !== 0 ? "border-t border-gray-100" : ""}`}
                                  >
                                    <div className="flex min-h-[72px]">
                                      {/* Left side (Cols 2-4) */}
                                      <div className="w-[44.2%] flex items-stretch border-r border-gray-100">
                                        <div className="w-[57.2%] shrink-0 px-3 py-3 border-r border-gray-100 flex items-center relative group">
                                          <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
                                            {row.descripcion}
                                          </p>
                                          <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                              onClick={() => updateSeguimiento(criterio.id, idx, { isObservacionOpen: !seg.isObservacionOpen })}
                                              className={`flex items-center justify-center w-5 h-5 rounded-md transition-colors shadow-sm font-bold text-[10px] ${seg.observacion ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                                              title="Añadir/Ver observación"
                                            >
                                              📝
                                            </button>
                                            <button 
                                              onClick={() => addEvidenciaRow(criterio.id, idx)}
                                              className="flex items-center justify-center w-5 h-5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md transition-colors shadow-sm font-bold text-xs"
                                              title="Añadir evidencia"
                                            >+</button>
                                          </div>
                                        </div>
                                      <div className="w-[14.3%] shrink-0 px-1 py-3 border-r border-gray-100 flex items-center justify-center">
                                        {row.tipo_entregable ? (
                                          <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 whitespace-nowrap">
                                            {TIPO_LABELS[row.tipo_entregable] ?? row.tipo_entregable}
                                          </span>
                                        ) : (
                                          <span className="text-gray-300 text-xs">—</span>
                                        )}
                                      </div>
                                      <div className="w-[28.5%] shrink-0 px-2 py-3 flex items-center">
                                        <select
                                          value={seg.estado}
                                          onChange={(e) => saveEstado(criterio.id, idx, e.target.value)}
                                          className={`w-full appearance-none text-xs font-medium rounded-lg px-2 py-1.5 border focus:outline-none focus:ring-1 focus:ring-blue-300 cursor-pointer ${estadoColor}`}
                                        >
                                          {ESTADO_OPTIONS.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>

                                    {/* Right side (Cols 5-7) stacked rows of evidencias */}
                                    <div className="w-[55.8%] flex flex-col min-w-0">
                                      {row.evidencias.map((ev, evIdx) => (
                                        <div key={ev.id || evIdx} className={`flex items-stretch min-h-[72px] ${evIdx !== 0 ? "border-t border-gray-100" : ""}`}>
                                          {/* Evidencia (w=45.3%) */}
                                          <div className="w-[45.3%] shrink-0 px-2 py-3 border-r border-gray-100 flex flex-col justify-center gap-1">
                                            <textarea
                                              value={ev.nombre_evidencia}
                                              onChange={(e) => updateEvidencia(criterio.id, idx, evIdx, { nombre_evidencia: e.target.value })}
                                              placeholder="Nombre del documento o proceso..."
                                              rows={2}
                                              className="w-full text-sm text-gray-700 bg-transparent resize-none focus:outline-none placeholder-gray-300 leading-relaxed"
                                            />
                                          </div>

                                          {/* Fuente (w=43.4%) */}
                                          <div className="w-[43.4%] shrink-0 px-2 py-3 border-r border-gray-100 flex items-center relative group">
                                            <input
                                              type="url"
                                              value={ev.link_evidencia}
                                              onChange={(e) => updateEvidencia(criterio.id, idx, evIdx, { link_evidencia: e.target.value })}
                                              placeholder="https://sharepoint.com/..."
                                              className="w-full text-sm text-blue-600 bg-transparent focus:outline-none placeholder-gray-300 leading-relaxed truncate pr-8"
                                            />
                                            {ev.link_evidencia && ev.link_evidencia.startsWith("http") && (
                                              <a
                                                href={ev.link_evidencia}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="absolute right-2 p-1.5 text-gray-400 hover:text-blue-600 transition-all bg-white hover:bg-blue-50 rounded-md shadow-sm opacity-0 group-hover:opacity-100 border border-gray-200"
                                                title="Abrir enlace"
                                              >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                              </a>
                                            )}
                                          </div>

                                          {/* Acción (w=11.3%) */}
                                          <div className="w-[11.3%] shrink-0 px-2 py-2 flex flex-col items-center justify-center gap-1">
                                            <button
                                              onClick={() => saveEvidencia(criterio.id, idx, evIdx)}
                                              disabled={ev.isSaving}
                                              className="flex items-center justify-center w-7 h-7 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-md transition-colors disabled:opacity-50"
                                              title={ev.id ? "Actualizar" : "Guardar"}
                                            >
                                              {ev.isSaving ? (
                                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                </svg>
                                              ) : (
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                </svg>
                                              )}
                                            </button>
                                            <button
                                              onClick={() => deleteEvidencia(criterio.id, idx, evIdx)}
                                              disabled={ev.isSaving}
                                              className="flex items-center justify-center w-7 h-7 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-md transition-colors disabled:opacity-50"
                                              title="Eliminar"
                                            >
                                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                              onClick={() => saveObservacion(criterio.id, idx)}
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
                  )}
                </div>
              )}

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
          href="/acreditacion/recopilacion-evidencias"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 text-sm transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a Procesos
        </Link>
      </div>
    </div>
  );
}
