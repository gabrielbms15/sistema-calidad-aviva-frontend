"use client";

import { useState, useTransition, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";

/* ─── Types ──────────────────────────────────────────────── */
interface Macroproceso { id: string; codigo: string; nombre: string; orden: number; }
interface Codigo { id: string; codigo: string; descripcion: string; orden: number; macroproceso_id: string; }
interface EvidenciaItem { id: string; nombre_evidencia: string; link_evidencia: string; }
interface CriterioData {
  id: string; codigo_criterio: string; descripcion: string; codigo_id: string;
  fuente_0: string | null; fuente_1: string | null; fuente_2: string | null;
  evidencias: EvidenciaItem[];
}
interface AutoRow {
  id?: string; criterio_id: string;
  puntaje_propuesto: 0 | 1 | 2 | null;
  observacion_evaluador: string;
  isSaving: boolean;
}
interface Props {
  proceso: { id: string; anio: number; sede: { id: string; nombre: string } };
  macroprocesos: Macroproceso[];
  macroprocesoInicialId: string;
  codigosIniciales: Codigo[];
  criteriosIniciales: any[];
}

/* ─── Constants ──────────────────────────────────────────── */
const EXCLUDED_CRITERIOS = new Set([
  "DIR1-4","DIR1-5","DIR1-6","DIR1-8","GRH4-1","MRA8-1","MRA8-2","MRA8-3",
  "ATA1-3","ATA3-2","ATA3-3","ATA3-4","ATA3-5","ATA3-6","RCR4-1","RCR4-2",
  "RCR4-3","GMD3-4","GMD3-5","MRS1-1","MRS1-2","MRS1-3","MRS2-1","MRS2-2",
]);
const EXCLUDED_MACROS = new Set([8, 12]);

// Cell background color based on puntaje
const CELL_BG: Record<string, string> = {
  "null": "",
  "0":    "bg-red-50",
  "1":    "bg-amber-50",
  "2":    "bg-green-50",
};

/* ─── Helpers ────────────────────────────────────────────── */
function extractCriterio(c: any, procesoId: string): CriterioData {
  const evidencias: EvidenciaItem[] = [];
  for (const ent of (c.entregable ?? [])) {
    for (const seg of (ent.entregable_seguimiento ?? [])) {
      if (seg.proceso_id === procesoId) {
        for (const ev of (seg.entregable_evidencia ?? [])) {
          if (ev.nombre_evidencia || ev.link_evidencia) {
            evidencias.push({ id: ev.id, nombre_evidencia: ev.nombre_evidencia ?? "", link_evidencia: ev.link_evidencia ?? "" });
          }
        }
      }
    }
  }
  return {
    id: c.id, codigo_criterio: c.codigo_criterio, descripcion: c.descripcion, codigo_id: c.codigo_id,
    fuente_0: c.fuente_0 ?? null, fuente_1: c.fuente_1 ?? null, fuente_2: c.fuente_2 ?? null, evidencias,
  };
}

function emptyRow(criterioId: string): AutoRow {
  return { criterio_id: criterioId, puntaje_propuesto: null, observacion_evaluador: "", isSaving: false };
}

/* ─── Component ──────────────────────────────────────────── */
export default function AutoevaluacionView({ proceso, macroprocesos, macroprocesoInicialId, codigosIniciales, criteriosIniciales }: Props) {
  const [selectedMacroId, setSelectedMacroId] = useState(macroprocesoInicialId);
  const [selectedCodigoId, setSelectedCodigoId] = useState<string | null>(null);
  const [codigos, setCodigos] = useState<Codigo[]>(codigosIniciales);
  const [criterios, setCriterios] = useState<CriterioData[]>(
    criteriosIniciales.filter(c => !EXCLUDED_CRITERIOS.has(c.codigo_criterio)).map(c => extractCriterio(c, proceso.id))
  );
  // Use functional updates everywhere to avoid stale closure bugs
  const [autoMap, setAutoMap] = useState<Record<string, AutoRow>>({});
  // Keep a ref in sync so saveRow always reads the latest state (avoids stale closure)
  const autoMapRef = useRef<Record<string, AutoRow>>({});
  autoMapRef.current = autoMap;
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isPending, startTransition] = useTransition();

  /* ─── State helpers — always use prev ─── */
  const getAuto = (criterioId: string) => autoMap[criterioId] ?? emptyRow(criterioId);

  const patchAuto = (criterioId: string, patch: Partial<AutoRow>) =>
    setAutoMap(prev => ({
      ...prev,
      [criterioId]: { ...(prev[criterioId] ?? emptyRow(criterioId)), ...patch },
    }));

  /* ─── Load autoevaluaciones ─── */
  const loadAutos = async (criterioIds: string[]) => {
    if (!criterioIds.length) return;
    const { data } = await supabase
      .from("autoevaluacion")
      .select("id, criterio_id, puntaje_propuesto, observacion_evaluador")
      .eq("proceso_id", proceso.id)
      .in("criterio_id", criterioIds);

    setAutoMap(prev => {
      const next = { ...prev };
      for (const row of (data ?? [])) {
        next[row.criterio_id] = {
          id: row.id,
          criterio_id: row.criterio_id,
          puntaje_propuesto: row.puntaje_propuesto as (0 | 1 | 2 | null),
          observacion_evaluador: row.observacion_evaluador ?? "",
          isSaving: false,
        };
      }
      return next;
    });
  };

  /* ─── Load initial autoevaluaciones on mount ─── */
  useEffect(() => {
    if (criteriosIniciales.length > 0) {
      const ids = criteriosIniciales
        .filter(c => !EXCLUDED_CRITERIOS.has(c.codigo_criterio))
        .map(c => c.id);
      loadAutos(ids);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Macroproceso click ─── */
  const handleMacroClick = (macro: Macroproceso) => {
    if (macro.id === selectedMacroId) return;
    setSelectedMacroId(macro.id);
    setSelectedCodigoId(null);
    startTransition(async () => {
      const { data: cRaw } = await supabase.from("codigo")
        .select("id, codigo, descripcion, orden, macroproceso_id")
        .eq("macroproceso_id", macro.id).order("orden", { ascending: true });
      const newCodigos = cRaw ?? [];
      setCodigos(newCodigos);
      if (newCodigos.length) {
        const ids = newCodigos.map(c => c.id);
        const { data: crRaw } = await supabase.from("criterio")
          .select(`id, codigo_criterio, descripcion, codigo_id, fuente_0, fuente_1, fuente_2,
            entregable(id, entregable_seguimiento(id, proceso_id, entregable_evidencia(id, nombre_evidencia, link_evidencia, orden)))`)
          .in("codigo_id", ids);
        const filtered = (crRaw ?? []).filter(c => !EXCLUDED_CRITERIOS.has(c.codigo_criterio));
        const mapped = filtered.map(c => extractCriterio(c, proceso.id));
        setCriterios(mapped);
        await loadAutos(mapped.map(c => c.id));
      } else {
        setCriterios([]);
      }
    });
  };

  /* ─── Filtered list ─── */
  const criteriosFiltrados = useMemo(() => {
    let f = criterios.filter(c => !EXCLUDED_CRITERIOS.has(c.codigo_criterio));
    if (selectedCodigoId) f = f.filter(c => c.codigo_id === selectedCodigoId);
    return f.sort((a, b) => a.codigo_criterio.localeCompare(b.codigo_criterio, undefined, { numeric: true, sensitivity: "base" }));
  }, [criterios, selectedCodigoId]);

  /* ─── Save single row ─── */
  const saveRow = async (criterioId: string) => {
    // Read from ref to avoid stale closure — always gets the latest state
    const row = autoMapRef.current[criterioId] ?? emptyRow(criterioId);
    patchAuto(criterioId, { isSaving: true });
    try {
      const { data, error } = await supabase.from("autoevaluacion")
        .upsert({
          criterio_id: criterioId,
          proceso_id: proceso.id,
          puntaje_propuesto: row.puntaje_propuesto,
          observacion_evaluador: row.observacion_evaluador || null,
        }, { onConflict: "criterio_id, proceso_id" })
        .select("id").single();
      if (error) throw error;
      if (data) patchAuto(criterioId, { id: data.id });
    } catch (err: any) {
      console.error("Error saving autoevaluacion:", err.message || err);
    } finally {
      patchAuto(criterioId, { isSaving: false });
    }
  };

  /* ─── Save all ─── */
  const saveAll = async () => {
    setIsSavingAll(true);
    try {
      for (const criterio of criteriosFiltrados) {
        const row = autoMap[criterio.id];
        if (row?.puntaje_propuesto !== null || row?.observacion_evaluador) {
          await saveRow(criterio.id);
        }
      }
      alert("Se han guardado todos los cambios correctamente.");
    } catch (err) {
      alert("Error al guardar.");
    } finally {
      setIsSavingAll(false);
    }
  };

  const macroActual = macroprocesos.find(m => m.id === selectedMacroId);

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full items-center justify-center font-sans">
      <div className="w-full mb-6 flex flex-col items-start gap-4">
        <div>
          <h1 className="text-gray-900 text-3xl font-extrabold leading-snug drop-shadow-sm">Autoevaluaciones</h1>
          <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded">Sede {proceso.sede.nombre}</span>
            <span>·</span>
            <span>Proceso de Acreditación {proceso.anio}</span>
          </p>
        </div>
      </div>

      <div className="w-full flex flex-col h-[80vh] min-h-[500px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-[#272729] border-b border-white/10 flex flex-col shrink-0">
          <div className="px-8 py-4 flex items-center justify-between">
            <h2 className="text-white text-lg leading-tight">
              {macroActual ? (
                <><span className="font-bold">Macroproceso {macroActual.orden}</span><span className="mx-8 text-white/30">|</span><span className="font-light text-white/90">{macroActual.nombre}</span></>
              ) : <span className="text-white/50 italic">Cargando...</span>}
            </h2>
            {macroActual && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50 font-medium">Estándar:</span>
                <div className="relative">
                  <select value={selectedCodigoId ?? ""} onChange={e => setSelectedCodigoId(e.target.value || null)} disabled={isPending}
                    className="appearance-none bg-white text-gray-900 text-sm rounded-lg pl-3 pr-8 py-1.5 focus:outline-none cursor-pointer w-36 font-medium truncate disabled:opacity-50">
                    <option value="">Todos</option>
                    {codigos.map(c => <option key={c.id} value={c.id}>{c.codigo}</option>)}
                  </select>
                  <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden relative">
          {isPending && (
            <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center">
              <svg className="w-10 h-10 animate-spin text-[#3d537e]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="mt-3 text-sm font-bold text-[#3d537e] uppercase tracking-widest">Cargando</p>
            </div>
          )}

          {/* Sidebar liquid glass */}
          <aside className="w-64 shrink-0 bg-[#3d557c] flex flex-col border-r border-white/5">
            <OverlayScrollbarsComponent element="nav" options={{ scrollbars: { autoHide: "scroll", theme: "os-theme-dark" } }} defer className="flex-1 py-3 px-4">
              {macroprocesos.filter(m => !EXCLUDED_MACROS.has(m.orden)).map(macro => {
                const isActive = macro.id === selectedMacroId;
                return (
                  <button key={macro.id} onClick={() => handleMacroClick(macro)}
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
            {selectedCodigoId && (() => {
              const obj = codigos.find(c => c.id === selectedCodigoId);
              return obj ? (
                <div className="bg-white px-8 py-3 border-b border-gray-200 text-sm text-gray-600 shrink-0">
                  <span className="font-bold text-gray-900 mr-2">{obj.codigo}:</span>{obj.descripcion}
                </div>
              ) : null;
            })()}

            <OverlayScrollbarsComponent element="div" options={{ scrollbars: { autoHide: "scroll", theme: "os-theme-light" } }} defer className="flex-1 p-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Table header */}
                <div className="flex border-b border-gray-200 bg-gray-200/80 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <div className="w-[6%]  shrink-0 px-2 py-3 text-center">Cr.</div>
                  <div className="w-[19%] shrink-0 px-3 py-3 border-l border-gray-200">Verificadores</div>
                  <div className="w-[21%] shrink-0 px-3 py-3 border-l border-gray-200">Evidencias</div>
                  <div className="w-[21%] shrink-0 px-3 py-3 border-l border-gray-200">Fuentes</div>
                  <div className="w-[9%]  shrink-0 px-2 py-3 border-l border-gray-200 text-center">Puntaje</div>
                  <div className="w-[19%] shrink-0 px-3 py-3 border-l border-gray-200">Obs. Evaluador</div>
                  <div className="w-[5%]  shrink-0 px-2 py-3 border-l border-gray-200 text-center">Acción</div>
                </div>

                {/* Rows */}
                {criteriosFiltrados.length === 0 ? (
                  <div className="flex items-center justify-center py-20 text-gray-300 text-sm">No hay criterios para este estándar.</div>
                ) : criteriosFiltrados.map((criterio, ci) => {
                  const auto = getAuto(criterio.id);
                  const pKey = auto.puntaje_propuesto === null ? "null" : String(auto.puntaje_propuesto);
                  const cellBg = CELL_BG[pKey] ?? "";
                  const rowBg = ci % 2 !== 0 ? "bg-gray-100" : "bg-white";

                  return (
                    <div key={criterio.id} className={`flex min-h-[80px] ${ci !== 0 ? "border-t border-gray-200" : ""} ${rowBg}`}>
                      {/* Criterio */}
                      <div className="w-[6%] shrink-0 border-r border-gray-100 px-2 py-3 flex items-start justify-center">
                        <span className="font-mono text-xs font-bold text-gray-900 text-center break-all">{criterio.codigo_criterio}</span>
                      </div>

                      {/* Verificadores */}
                      <div className="w-[19%] shrink-0 border-r border-gray-100 px-3 py-3 flex flex-col gap-1.5">
                        {criterio.fuente_0 && <div className="flex items-start gap-1.5"><span className="mt-1 w-2 h-2 rounded-full bg-red-500 shrink-0" /><p className="text-xs text-gray-700 leading-relaxed">{criterio.fuente_0}</p></div>}
                        {criterio.fuente_1 && <div className="flex items-start gap-1.5"><span className="mt-1 w-2 h-2 rounded-full bg-amber-400 shrink-0" /><p className="text-xs text-gray-700 leading-relaxed">{criterio.fuente_1}</p></div>}
                        {criterio.fuente_2 && <div className="flex items-start gap-1.5"><span className="mt-1 w-2 h-2 rounded-full bg-green-500 shrink-0" /><p className="text-xs text-gray-700 leading-relaxed">{criterio.fuente_2}</p></div>}
                        {!criterio.fuente_0 && !criterio.fuente_1 && !criterio.fuente_2 && <span className="text-gray-300 text-xs italic">Sin verificadores</span>}
                      </div>

                      {/* Evidencias */}
                      <div className="w-[21%] shrink-0 border-r border-gray-100 px-3 py-3 flex flex-col gap-1">
                        {criterio.evidencias.length === 0
                          ? <span className="text-gray-300 text-xs italic">Sin evidencias cargadas</span>
                          : criterio.evidencias.map((ev, i) => (
                            <p key={ev.id || i} className="text-xs text-gray-700 leading-snug truncate" title={ev.nombre_evidencia}>
                              {ev.nombre_evidencia || <span className="text-gray-300 italic">Sin nombre</span>}
                            </p>
                          ))
                        }
                      </div>

                      {/* Fuentes */}
                      <div className="w-[21%] shrink-0 border-r border-gray-100 px-3 py-3 flex flex-col gap-1">
                        {criterio.evidencias.filter(ev => ev.link_evidencia).length === 0
                          ? <span className="text-gray-300 text-xs italic">Sin fuentes</span>
                          : criterio.evidencias.filter(ev => ev.link_evidencia).map((ev, i) => (
                            <a key={ev.id || i} href={ev.link_evidencia} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline truncate block" title={ev.link_evidencia}>
                              {ev.link_evidencia}
                            </a>
                          ))
                        }
                      </div>

                      {/* Puntaje — toda la celda se pinta */}
                      <div className={`w-[9%] shrink-0 border-r border-gray-100 px-2 py-3 flex items-start justify-center transition-colors ${cellBg}`}>
                        <select
                          value={auto.puntaje_propuesto === null ? "" : String(auto.puntaje_propuesto)}
                          onChange={e => {
                            const raw = e.target.value;
                            const val: 0 | 1 | 2 | null = raw === "" ? null : (Number(raw) as 0 | 1 | 2);
                            // Only update local state — saving requires clicking the save button
                            patchAuto(criterio.id, { puntaje_propuesto: val });
                          }}
                          className="w-full appearance-none text-center text-sm font-bold rounded-lg px-1 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer bg-white/70 border border-gray-200"
                        >
                          <option value="">—</option>
                          <option value="0">0</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                        </select>
                      </div>

                      {/* Observación evaluador */}
                      <div className="w-[19%] shrink-0 border-r border-gray-100 px-3 py-3 flex items-start">
                        <textarea
                          value={auto.observacion_evaluador}
                          onChange={e => patchAuto(criterio.id, { observacion_evaluador: e.target.value })}
                          placeholder="Observación del evaluador..."
                          rows={3}
                          className="w-full text-xs text-gray-700 bg-transparent border border-gray-200 rounded-md p-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white transition-colors placeholder:text-gray-300"
                        />
                      </div>

                      {/* Acción — solo guardar fila */}
                      <div className="w-[5%] shrink-0 px-1 py-3 flex items-start justify-center">
                        <button
                          onClick={() => saveRow(criterio.id)}
                          disabled={auto.isSaving}
                          title="Guardar"
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-40"
                        >
                          {auto.isSaving
                            ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                            : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          }
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer stats + Guardar Todo */}
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
                      {isSavingAll
                        ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                        : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      }
                      {isSavingAll ? "Guardando..." : "Guardar todo"}
                    </button>
                  </div>
                </div>
              )}
            </OverlayScrollbarsComponent>
          </main>
        </div>
      </div>

      {/* Back link */}
      <div className="w-full mt-4 flex justify-end">
        <Link href={`/acreditacion/${proceso.id}`} className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 text-sm transition-colors font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Volver al Dashboard
        </Link>
      </div>
    </div>
  );
}
