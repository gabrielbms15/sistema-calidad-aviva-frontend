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
  "DIR1-4", "DIR1-5", "DIR1-6", "DIR1-8", "GRH4-1", "MRA8-1", "MRA8-2", "MRA8-3",
  "ATA1-3", "ATA3-2", "ATA3-3", "ATA3-4", "ATA3-5", "ATA3-6", "RCR4-1", "RCR4-2",
  "RCR4-3", "GMD3-4", "GMD3-5", "MRS1-1", "MRS1-2", "MRS1-3", "MRS2-1", "MRS2-2", "ATH6-1", "ATH6-2",
]);
const EXCLUDED_MACROS = new Set([8, 12]);

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

  // Popover for descripción
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
    <div className="flex flex-col h-full font-avenir gap-4">

      {/* ─── Encabezado y Filtros ─── */}
      <div className="w-[95%] flex flex-col gap-4">
        {/* Título */}
        <div className="w-full flex items-center justify-between shrink-0 pl-2">
          <div className="flex items-center gap-3">
            <span className="text-xl leading-none drop-shadow-sm">📋</span>
            <h1 className="text-gray-900 font-sans text-[20px] font-bold tracking-tight leading-none">
              Autoevaluación
            </h1>
          </div>
          <Link
            href={`/acreditacion/${proceso.id}`}
            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#1E50EF] text-[11px] font-bold tracking-wide uppercase transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </Link>
        </div>

      </div>

      {/* ─── Contenido Principal (Sidebar + Tabla) ─── */}
      <div className="flex-1 min-h-0 grid grid-cols-[22.5%_1fr] gap-4 overflow-hidden w-[95%]">

        {/* Sidebar de Macroprocesos */}
        <aside className="col-span-1 bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden border border-gray-200 relative">
          <div className="px-4 pt-4 pb-2 flex items-center gap-2 border-b border-gray-100 mb-2 shrink-0 bg-teal-aviva-1/40">
            <svg className="w-3.5 h-3.5 text-blue-manhattan-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="font-sans font-extrabold text-blue-manhattan-1 text-[9px] uppercase tracking-wider">
              Macroprocesos
            </span>
          </div>

          <OverlayScrollbarsComponent
            element="nav"
            options={{ scrollbars: { autoHide: "scroll", theme: "os-theme-dark" } }}
            defer
            className="flex-1 py-1 px-3"
          >
            {macroprocesos.filter(m => !EXCLUDED_MACROS.has(m.orden)).map((macro) => {
              const isActive = macro.id === selectedMacroId;
              return (
                <button
                  key={macro.id}
                  onClick={() => handleMacroClick(macro)}
                  disabled={isPending}
                  className={`w-full text-left flex flex-row items-stretch gap-3 px-3 py-2 rounded-xl mb-1.5 transition-all duration-200 group ${isActive
                    ? "border border-[#DEEBF7] shadow-md bg-[#DEEBF7] text-[#02163a] scale-[1.02]"
                    : "text-black/60 hover:text-black hover:bg-black/5"
                    }`}
                >
                  <div
                    className={`flex items-center justify-center shrink-0 w-8 rounded-lg text-[9px] font-extrabold transition-colors duration-200 shadow-sm ${isActive
                      ? "bg-[#1E50EF] text-white"
                      : "bg-gray-200 text-gray-900"
                      }`}
                  >
                    {macro.orden}
                  </div>
                  <div className="flex flex-col justify-center min-w-0">
                    <span className={`font-bold text-[9px] tracking-wide mb-0.5 truncate ${isActive ? "text-[#02163a] font-extrabold" : "text-black/90 group-hover:text-black"}`}>
                      {macro.codigo}
                    </span>
                    <span className={`text-[7px] leading-snug line-clamp-2 ${isActive ? "text-[#02163a]/80" : "text-black/60 group-hover:text-black/80"}`}>
                      {macro.nombre}
                    </span>
                  </div>
                </button>
              );
            })}
          </OverlayScrollbarsComponent>

          <div className="px-5 py-3 border-t border-gray-100">
            <p className="text-[9px] text-black/40">Sistema de Calidad · Aviva</p>
          </div>
        </aside>

        {/* Tabla Principal */}
        <main className="col-span-1 bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col min-w-0 overflow-hidden relative">

          {isPending && (
            <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center">
              <svg className="w-10 h-10 animate-spin text-[#1E50EF]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="mt-3 text-sm font-bold text-[#1E50EF] uppercase tracking-widest">Cargando</p>
            </div>
          )}

          {/* Cabecera integrada */}
          <div className="bg-white px-6 pt-5 pb-2 flex items-center justify-between shrink-0">
            <h2 className="text-black text-[13px] leading-tight flex items-center gap-3">
              {macroActual ? (
                <>
                  <span className="font-sans font-extrabold text-black">Macroproceso {macroActual.orden}</span>
                  <span className="text-black/30 font-light">|</span>
                  <span className="font-medium text-black">{macroActual.nombre}</span>
                </>
              ) : (
                <span className="text-gray-400 italic text-[13px]">Cargando...</span>
              )}
            </h2>

            {/* Selector de estándar */}
            {macroActual && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-black font-bold">Estándar:</span>
                <div className="relative">
                  <select
                    value={selectedCodigoId ?? ""}
                    onChange={(e) => setSelectedCodigoId(e.target.value || null)}
                    disabled={isPending}
                    className="appearance-none bg-gray-50 border border-gray-200 text-black text-[9px] rounded-md pl-2 pr-6 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all w-24 font-medium disabled:opacity-50"
                  >
                    <option value="">Todos</option>
                    {codigos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.codigo}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Subheader estándar seleccionado */}
          {selectedCodigoId && (() => {
            const obj = codigos.find((c) => c.id === selectedCodigoId);
            return obj ? (
              <div className="bg-white px-8 py-4 border-b border-gray-200 text-[13px] text-black shadow-sm animate-in fade-in shrink-0">
                <span className="font-bold text-black mr-2">{obj.codigo}:</span>
                {obj.descripcion}
              </div>
            ) : null;
          })()}

          <OverlayScrollbarsComponent
            element="div"
            options={{ scrollbars: { autoHide: "scroll", theme: "os-theme-light" } }}
            defer
            className="flex-1 px-6 pt-1 pb-2"
          >
            <div className="bg-white rounded-2xl border border-gray-300 shadow-sm overflow-hidden">
              {/* Table header */}
              <div className="flex border-b border-gray-300 bg-[#DEEBF7] text-[8px] font-sans font-extrabold uppercase tracking-wider text-black shrink-0">
                <div className="w-[8%]  shrink-0 px-2 py-2 text-center flex items-center justify-center">Criterio</div>
                <div className="w-[32%] shrink-0 px-3 py-2 border-l border-gray-300 flex items-center">Verificadores</div>
                <div className="w-[25%] shrink-0 px-3 py-2 border-l border-gray-300 flex items-center">Evidencias</div>
                <div className="w-[35%] shrink-0 px-3 py-2 border-l border-gray-300 flex items-center">Puntaje</div>
              </div>

              {/* Rows */}
              {!isPending && (
                criteriosFiltrados.length === 0 ? (
                  <div className="flex items-center justify-center py-20 text-gray-300 text-sm">
                    No hay criterios para este estándar.
                  </div>
                ) : (
                  criteriosFiltrados.map((criterio, ci) => {
                    const auto = getAuto(criterio.id);
                    const rowBg = ci % 2 !== 0 ? "bg-gray-100" : "bg-white";

                    return (
                      <div key={criterio.id} className={`flex min-h-[72px] ${ci !== 0 ? "border-t border-gray-300" : ""} ${rowBg}`}>
                        {/* Criterio */}
                        <div className="w-[8%] shrink-0 border-r border-gray-300 px-1.5 py-2 flex flex-col items-center justify-between">
                          <span className="font-sans text-[8px] font-extrabold text-black text-center break-all leading-tight">
                            {criterio.codigo_criterio}
                          </span>
                          {/* Info button — descripción popover */}
                          <div className="flex items-center gap-1.5">
                            <div className="relative" ref={activePopover === `info-${criterio.id}` ? popoverRef : undefined}>
                              <button
                                onClick={() => setActivePopover(activePopover === `info-${criterio.id}` ? null : `info-${criterio.id}`)}
                                title="Ver descripción"
                                className="text-gray-400 hover:text-emerald-600 transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                              {activePopover === `info-${criterio.id}` && (
                                <div className={`absolute left-full ml-2 ${ci < 2 ? "top-0" : "bottom-0"} z-50 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 p-3`}>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Descripción</p>
                                  <p className="text-xs text-gray-700 leading-relaxed">
                                    {criterio.descripcion || <span className="italic text-gray-400">Sin descripción</span>}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Verificadores */}
                        <div className="w-[32%] shrink-0 border-r border-gray-300 px-3 py-2 flex flex-col gap-1.5">
                          {criterio.fuente_0 && <div className="flex items-start gap-1.5"><span className="mt-0.5 w-2 h-2 rounded-full bg-red-500 shrink-0" /><p className="text-[9px] text-gray-700 leading-relaxed">{criterio.fuente_0}</p></div>}
                          {criterio.fuente_1 && <div className="flex items-start gap-1.5"><span className="mt-0.5 w-2 h-2 rounded-full bg-amber-400 shrink-0" /><p className="text-[9px] text-gray-700 leading-relaxed">{criterio.fuente_1}</p></div>}
                          {criterio.fuente_2 && <div className="flex items-start gap-1.5"><span className="mt-0.5 w-2 h-2 rounded-full bg-green-500 shrink-0" /><p className="text-[9px] text-gray-700 leading-relaxed">{criterio.fuente_2}</p></div>}
                          {!criterio.fuente_0 && !criterio.fuente_1 && !criterio.fuente_2 && <span className="text-gray-300 text-[9px] italic">Sin verificadores</span>}
                        </div>

                        {/* Evidencias */}
                        <div className="w-[25%] shrink-0 border-r border-gray-300 px-3 py-2 flex flex-col gap-1">
                          {criterio.evidencias.length === 0
                            ? <span className="text-gray-300 text-[9px] italic">Sin evidencias cargadas</span>
                            : criterio.evidencias.map((ev, i) => (
                              ev.link_evidencia ? (
                                <a key={ev.id || i} href={ev.link_evidencia} target="_blank" rel="noopener noreferrer"
                                  className="text-[9px] text-blue-600 hover:underline truncate block" title={ev.nombre_evidencia || ev.link_evidencia}>
                                  {ev.nombre_evidencia || ev.link_evidencia}
                                </a>
                              ) : (
                                <p key={ev.id || i} className="text-[9px] text-gray-700 leading-snug truncate" title={ev.nombre_evidencia}>
                                  {ev.nombre_evidencia || <span className="text-gray-300 italic">Sin nombre</span>}
                                </p>
                              )
                            ))
                          }
                        </div>

                        {/* Puntaje + Observación + Guardar (columna combinada) */}
                        {(() => {
                          const p = auto.puntaje_propuesto;
                          // Three-tier color tokens per score value
                          const COLORS: Record<number, { border: string; boxActive: string; cellBg: string }> = {
                            0: { border: "border-red-500", boxActive: "bg-red-200 text-red-800", cellBg: "bg-red-50" },
                            1: { border: "border-amber-400", boxActive: "bg-amber-200 text-amber-800", cellBg: "bg-amber-50" },
                            2: { border: "border-green-500", boxActive: "bg-green-200 text-green-800", cellBg: "bg-green-50" },
                          };
                          const activeCellBg = p !== null ? COLORS[p].cellBg : "";

                          return (
                            <div className={`w-[35%] shrink-0 px-3 py-2 flex flex-col gap-2 transition-colors duration-200 ${activeCellBg}`}>
                              {/* Puntaje label + boxes en la misma fila */}
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] font-extrabold text-black/50 uppercase tracking-wide shrink-0">Puntaje:</span>
                                <div className="flex items-center gap-1">
                                  {([0, 1, 2] as const).map((val) => {
                                    const isSelected = auto.puntaje_propuesto === val;
                                    const c = COLORS[val];
                                    return (
                                      <button
                                        key={val}
                                        onClick={() => patchAuto(criterio.id, { puntaje_propuesto: isSelected ? null : val })}
                                        className={`w-7 h-6 rounded border text-[10px] font-extrabold transition-all duration-150
                                          ${isSelected
                                            ? `${c.border} ${c.boxActive}`
                                            : `border-gray-200 bg-white text-gray-400 hover:border-gray-400 hover:text-gray-600`
                                          }`}
                                      >
                                        {val}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Observación */}
                              <div className="flex flex-col gap-1 flex-1">
                                <span className="text-[8px] font-extrabold text-black/50 uppercase tracking-wide">Observación:</span>
                                <textarea
                                  value={auto.observacion_evaluador}
                                  onChange={e => patchAuto(criterio.id, { observacion_evaluador: e.target.value })}
                                  placeholder="Observación del evaluador..."
                                  rows={2}
                                  className="w-full text-[9px] text-gray-700 bg-white/80 border border-gray-200 rounded-md p-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white transition-colors placeholder:text-gray-300"
                                />
                                {/* Guardar — debajo del textarea, alineado a la derecha */}
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => saveRow(criterio.id)}
                                    disabled={auto.isSaving}
                                    title="Guardar fila"
                                    className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-40"
                                  >
                                    {auto.isSaving
                                      ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                                      : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                    }
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })
                )
              )}
            </div>
          </OverlayScrollbarsComponent>

          {/* Footer fijo — fuera del scroll */}
          <div className="shrink-0 border-t border-gray-100 px-6 py-2 flex items-center justify-between bg-white">
            <p className="text-[9px] text-gray-400">
              {!isPending && (
                <>Mostrando <span className="font-medium text-gray-600">{criteriosFiltrados.length}</span>{" "}
                  de <span className="font-medium text-gray-600">{criterios.length}</span> criterios</>
              )}
            </p>
            <div className="flex items-center gap-3">
              {selectedCodigoId && (
                <button onClick={() => setSelectedCodigoId(null)} className="text-[9px] text-blue-500 hover:text-blue-700 transition-colors">
                  Limpiar filtro ×
                </button>
              )}
              <button
                onClick={saveAll}
                disabled={isSavingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-[9px] uppercase tracking-wider font-bold rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                {isSavingAll
                  ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                  : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                }
                {isSavingAll ? "Guardando..." : "Guardar todo"}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
