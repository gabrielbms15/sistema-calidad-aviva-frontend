"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";

/* ─── Types ──────────────────────────────────────────────── */
interface Macroproceso { id: string; codigo: string; nombre: string; orden: number; }
interface Codigo { id: string; codigo: string; descripcion: string; orden: number; }
interface Area { id: string; nombre: string; }
interface Responsable { id: string; area_id: string; cargo: string; }
interface CriterioData { id: string; codigo_criterio: string; descripcion: string; codigo_id: string; fuente_0?: string; fuente_1?: string; fuente_2?: string; }

interface ResponsableState {
  criterioResponsableId?: string;
  responsable_id: string;
  area_id: string;
}

interface Props {
  macroprocesos: Macroproceso[];
  macroprocesoInicialId: string;
  codigosIniciales: Codigo[];
  criteriosIniciales: any[];
  areas: Area[];
  responsables: Responsable[];
}

/* ─── Constants ──────────────────────────────────────────── */

/** Macroprocesos ocultos (por orden) */
const EXCLUDED_MACROS = new Set([8, 12]);

/** Criterios ocultos (por codigo_criterio) */
const EXCLUDED_CRITERIOS = new Set([
  "DIR1-4", "DIR1-5", "DIR1-6", "DIR1-8", "GRH4-1", "MRA8-1", "MRA8-2", "MRA8-3", 
  "ATA1-3", "ATA3-2", "ATA3-3", "ATA3-4", "ATA3-5", "ATA3-6", "RCR4-1", "RCR4-2", 
  "RCR4-3", "GMD3-4", "GMD3-5", "MRS1-1", "MRS1-2", "MRS1-3", "MRS2-1", "MRS2-2", "ATH6-1", "ATH6-2"
]);

/* ─── Helpers ────────────────────────────────────────────── */

function buildResponsable(c: any, responsables: Responsable[]): ResponsableState {
  const cr = c.criterio_responsable?.[0];
  const responsable_id = cr?.responsable_id ?? "";
  const area_id = responsables.find((r) => r.id === responsable_id)?.area_id ?? "";
  return { criterioResponsableId: cr?.id, responsable_id, area_id };
}

function extractCriterio(c: any): CriterioData {
  return { id: c.id, codigo_criterio: c.codigo_criterio, descripcion: c.descripcion, codigo_id: c.codigo_id, fuente_0: c.fuente_0, fuente_1: c.fuente_1, fuente_2: c.fuente_2 };
}

/* ─── Component ──────────────────────────────────────────── */
export default function AsignarResponsablesView({
  macroprocesos,
  macroprocesoInicialId,
  codigosIniciales,
  criteriosIniciales,
  areas,
  responsables,
}: Props) {
  const [selectedMacroId, setSelectedMacroId] = useState(macroprocesoInicialId);
  const [codigos, setCodigos] = useState<Codigo[]>(codigosIniciales);
  const [criterios, setCriterios] = useState<CriterioData[]>(criteriosIniciales.map(extractCriterio));
  const [selectedCodigoId, setSelectedCodigoId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [openPopoverCriterioId, setOpenPopoverCriterioId] = useState<string | null>(null);
  const [openResponsablePopoverId, setOpenResponsablePopoverId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const responsablePopoverRef = useRef<HTMLDivElement>(null);

  // Cierra el popover al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenPopoverCriterioId(null);
      }
      if (responsablePopoverRef.current && !responsablePopoverRef.current.contains(e.target as Node)) {
        setOpenResponsablePopoverId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const [responsableMap, setResponsableMap] = useState<Record<string, ResponsableState>>(() => {
    const m: Record<string, ResponsableState> = {};
    criteriosIniciales.forEach((c) => { m[c.id] = buildResponsable(c, responsables); });
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
        .from("codigo").select("id,codigo,descripcion,orden")
        .eq("macroproceso_id", macro.id).order("orden", { ascending: true });
      const codigosResult = nuevosCodigos ?? [];
      setCodigos(codigosResult);

      const ids = codigosResult.map((c) => c.id);
      if (ids.length > 0) {
        const { data: raw } = await supabase
          .from("criterio")
          .select("id,codigo_criterio,descripcion,codigo_id,fuente_0,fuente_1,fuente_2,criterio_responsable(id,criterio_id,responsable_id)")
          .in("codigo_id", ids);
        const result = raw ?? [];
        setCriterios(result.map(extractCriterio));
        const newR: Record<string, ResponsableState> = {};
        result.forEach((c: any) => { newR[c.id] = buildResponsable(c, responsables); });
        setResponsableMap(newR);
      } else {
        setCriterios([]); setResponsableMap({});
      }
    });
  };

  /* ─── Mutations ─── */
  const updateResponsable = (criterioId: string, patch: Partial<ResponsableState>) => {
    setResponsableMap((prev) => ({ ...prev, [criterioId]: { ...prev[criterioId], ...patch } }));
  };

  const saveAll = async () => {
    setIsSavingAll(true);
    try {
      const promises: Promise<void>[] = [];
      
      for (const criterio of criteriosFiltrados) {
        const resp = responsableMap[criterio.id];
        if (resp) {
          promises.push((async () => {
            if (resp.responsable_id) {
              if (resp.criterioResponsableId) {
                // Update
                await supabase
                  .from("criterio_responsable")
                  .update({ responsable_id: resp.responsable_id })
                  .eq("id", resp.criterioResponsableId);
              } else {
                // Insert
                const { data: cr } = await supabase
                  .from("criterio_responsable")
                  .insert({ criterio_id: criterio.id, responsable_id: resp.responsable_id })
                  .select("id").single();
                if (cr) {
                  updateResponsable(criterio.id, { criterioResponsableId: cr.id });
                }
              }
            } else if (resp.criterioResponsableId) {
              // Delete if they cleared the selection but it had an ID
              await supabase
                .from("criterio_responsable")
                .delete()
                .eq("id", resp.criterioResponsableId);
              updateResponsable(criterio.id, { criterioResponsableId: undefined });
            }
          })());
        }
      }
      
      await Promise.all(promises);
      alert("Se han guardado los responsables correctamente.");
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al guardar los responsables.");
    } finally {
      setIsSavingAll(false);
    }
  };

  const criteriosFiltrados = (selectedCodigoId
    ? criterios.filter((c) => c.codigo_id === selectedCodigoId)
    : criterios
  )
    .filter((c) => !EXCLUDED_CRITERIOS.has(c.codigo_criterio))
    .sort((a, b) =>
      a.codigo_criterio.localeCompare(b.codigo_criterio, undefined, { numeric: true, sensitivity: "base" })
    );

  /* ─── Render ─── */
  return (
    <div className="flex flex-col h-full font-avenir gap-4">
      {/* Header above the table */}
      <div className="w-full flex items-center gap-3 shrink-0 pl-2">
        <span className="text-2xl leading-none drop-shadow-sm">👥</span>
        <h1 className="text-gray-900 font-sans text-[20px] font-bold tracking-tight leading-none">
          Asignar Responsables
        </h1>
      </div>

      {/* Main Container */}
      <div className="flex-1 min-h-0 grid grid-cols-[22.5%_1fr] gap-4 overflow-hidden w-[95%]">
        
        {/* Sidebar Selector */}
        <aside className="col-span-1 bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden border border-gray-200">
          
          {/* Cabecera del Sidebar con Isotipo */}
          <div className="px-4 pt-4 pb-2 flex items-center gap-2 border-b border-gray-100 mb-2 shrink-0">
            <svg className="w-3.5 h-3.5 text-[#1E50EF] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="font-sans font-extrabold text-black text-[9px] uppercase tracking-wider">
              Macroprocesos
            </span>
          </div>

          <OverlayScrollbarsComponent
            element="nav"
            options={{ scrollbars: { autoHide: "scroll", theme: "os-theme-dark" } }}
            defer
            className="flex-1 py-1 px-3"
          >
            {macroprocesos.filter((macro) => !EXCLUDED_MACROS.has(macro.orden)).map((macro) => {
              const isActive = macro.id === selectedMacroId;
              return (
                <button
                  key={macro.id}
                  onClick={() => handleMacroprocesoClick(macro)}
                  disabled={isPending}
                  className={`w-full text-left flex flex-row items-stretch gap-3 px-3 py-2 rounded-xl mb-1.5 transition-all duration-200 group ${isActive
                    ? "border border-[#DEEBF7] shadow-md bg-[#DEEBF7] text-[#02163a] scale-[1.02]"
                    : "text-black/60 hover:text-black hover:bg-black/5"
                    }`}
                >
                  {/* Recuadro del número */}
                  <div
                    className={`flex items-center justify-center shrink-0 w-8 rounded-lg text-[9px] font-extrabold transition-colors duration-200 shadow-sm ${
                      isActive
                        ? "bg-[#1E50EF] text-white"
                        : "bg-gray-200 text-gray-900"
                    }`}
                  >
                    {macro.orden}
                  </div>

                  {/* Textos */}
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

        {/* Main Content Card */}
        <main className="flex flex-col min-w-0 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden h-full">
          
          {/* Cabecera integrada */}
          <div className="bg-white px-6 pt-5 pb-2 flex items-center justify-between shrink-0">
            <h2 className="text-black text-sm leading-tight flex items-center gap-3">
              <span className="font-sans font-extrabold text-black">Macroproceso {macroActual?.orden}</span>
              <span className="text-black/30 font-light">|</span>
              <span className="font-medium text-black">{macroActual?.nombre}</span>
            </h2>

            {/* Selector de codigo */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-black font-bold">Estándar:</span>
              <div className="relative">
                <select
                  value={selectedCodigoId ?? ""}
                  onChange={(e) => setSelectedCodigoId(e.target.value || null)}
                  className="appearance-none bg-gray-50 border border-gray-200 text-black text-[9px] rounded-md pl-2 pr-6 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all w-24 font-medium"
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

          {/* Table Container */}
          <OverlayScrollbarsComponent
            element="div"
            options={{ scrollbars: { autoHide: "scroll", theme: "os-theme-light" } }}
            defer
            className="flex-1"
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
              <div className="px-6 pb-4 pt-1">
                <div className="flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white">
                  
                  {/* Table Header */}
                  <div className="flex border-b border-gray-200 bg-[#DEEBF7] text-[8px] font-sans font-extrabold uppercase tracking-wider text-black shrink-0">
                    <div className="w-[8%] shrink-0 px-2 py-2 text-center">Criterio</div>
                    <div className="w-[60%] shrink-0 px-3 py-2 border-l border-gray-200 text-center">Descripción</div>
                    <div className="w-[32%] shrink-0 px-3 py-2 border-l border-gray-200 text-center">Responsable</div>
                  </div>

                  {/* Rows */}
                  {criteriosFiltrados.length === 0 ? (
                    <div className="flex items-center justify-center py-20 text-black/40 text-[11px] bg-white">
                      No hay criterios para este filtro.
                    </div>
                  ) : (
                    criteriosFiltrados.map((criterio, ci) => {
                      const resp = responsableMap[criterio.id] ?? { area_id: "", responsable_id: "" };
                      const cargosDelArea = responsables.filter((r) => r.area_id === resp.area_id);

                      return (
                        <div
                          key={criterio.id}
                          className={`flex items-stretch min-h-[68px] ${ci !== 0 ? "border-t border-gray-200" : ""} ${ci % 2 !== 0 ? "bg-gray-100/70" : "bg-white"}`}
                        >
                          {/* Col 1 — Criterio */}
                          <div className="w-[8%] shrink-0 border-r border-gray-100 px-2 py-4 flex flex-col justify-between items-center bg-transparent">
                            <span className="font-sans text-[8px] font-extrabold text-black text-center break-all">{criterio.codigo_criterio}</span>
                            <div className="flex flex-row items-center justify-center gap-2 mt-3 w-full relative" ref={openPopoverCriterioId === criterio.id ? popoverRef : undefined}>
                              {/* Botón (i) fuentes */}
                              <div className="relative">
                                <button
                                  onClick={() => setOpenPopoverCriterioId(
                                    openPopoverCriterioId === criterio.id ? null : criterio.id
                                  )}
                                  className="flex items-center justify-center p-1 bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-500 rounded-md transition-colors"
                                  title="Ver fuentes de verificación"
                                >
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                  </svg>
                                </button>

                                {/* Popover */}
                                {openPopoverCriterioId === criterio.id && (
                                  <div
                                    ref={popoverRef}
                                    className={`absolute left-full ml-2 z-50 w-72 bg-white border border-gray-200 rounded-xl shadow-xl p-4 ${
                                      ci >= criteriosFiltrados.length - 2 && criteriosFiltrados.length > 3 
                                        ? "bottom-0" // Pop upward if near bottom
                                        : "top-0"    // Pop downward normally
                                    }`}
                                  >
                                    <p className="text-[9px] font-sans font-extrabold uppercase tracking-wider text-black mb-3">Fuentes de verificación</p>
                                    {!criterio.fuente_0 && !criterio.fuente_1 && !criterio.fuente_2 ? (
                                      <p className="text-[9px] text-black/40 italic">Sin fuentes registradas.</p>
                                    ) : (
                                      <ul className="space-y-2">
                                        {criterio.fuente_0 && (
                                          <li className="flex items-start gap-2">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                            <span className="text-[9px] text-black leading-snug">{criterio.fuente_0}</span>
                                          </li>
                                        )}
                                        {criterio.fuente_1 && (
                                          <li className="flex items-start gap-2">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                                            <span className="text-[9px] text-black leading-snug">{criterio.fuente_1}</span>
                                          </li>
                                        )}
                                        {criterio.fuente_2 && (
                                          <li className="flex items-start gap-2">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                                            <span className="text-[9px] text-black leading-snug">{criterio.fuente_2}</span>
                                          </li>
                                        )}
                                      </ul>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Col 2 — Descripción */}
                          <div className="w-[60%] shrink-0 border-r border-gray-100 px-4 py-4 flex items-center">
                            <p className="text-[10px] text-black leading-relaxed font-medium">
                              {criterio.descripcion}
                            </p>
                          </div>

                          {/* Col 3 — Responsable (badge + popover) */}
                          <div className="w-[32%] shrink-0 px-3 py-4 flex items-center justify-center relative bg-transparent">
                            <div ref={openResponsablePopoverId === criterio.id ? responsablePopoverRef : undefined} className="w-full">
                              {/* Badge / trigger */}
                              <button
                                onClick={() => setOpenResponsablePopoverId(
                                  openResponsablePopoverId === criterio.id ? null : criterio.id
                                )}
                                className={`w-full group flex flex-col items-start gap-0.5 px-2 py-1.5 rounded-lg border transition-all duration-150 text-left ${
                                  resp.responsable_id
                                    ? "bg-[#DEEBF7]/70 border-[#DEEBF7] hover:bg-[#DEEBF7] hover:border-blue-300"
                                    : "bg-gray-50 border-dashed border-gray-300 hover:border-[#1E50EF]/40 hover:bg-blue-50/30"
                                }`}
                              >
                                {resp.responsable_id ? (() => {
                                  const cargo = responsables.find(r => r.id === resp.responsable_id);
                                  const area = areas.find(a => a.id === resp.area_id);
                                  return (
                                    <>
                                      <span className="text-[7px] text-[#1E50EF]/70 font-sans font-extrabold uppercase tracking-wider truncate w-full">{area?.nombre ?? "—"}</span>
                                      <span className="text-[9px] font-sans font-extrabold text-[#02163a] leading-snug line-clamp-2">{cargo?.cargo ?? "—"}</span>
                                      <span className="text-[7px] text-black/30 mt-0.5 group-hover:text-[#1E50EF]/60 transition-colors">Editar ✎</span>
                                    </>
                                  );
                                })() : (
                                  <span className="flex items-center gap-1 text-[9px] text-black/40 font-medium group-hover:text-[#1E50EF] transition-colors w-full">
                                    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Asignar
                                  </span>
                                )}
                              </button>

                              {/* Popover de selección */}
                              {openResponsablePopoverId === criterio.id && (
                                <div
                                  className={`absolute right-0 z-50 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 ${
                                    ci >= criteriosFiltrados.length - 2 && criteriosFiltrados.length > 3
                                      ? "bottom-full mb-2"
                                      : "top-full mt-2"
                                  }`}
                                >
                                  {/* Header del popover */}
                                  <div className="flex items-center justify-between mb-3">
                                    <p className="text-[9px] font-sans font-extrabold uppercase tracking-wider text-black">Asignar responsable</p>
                                    <button
                                      onClick={() => setOpenResponsablePopoverId(null)}
                                      className="text-black/30 hover:text-black/60 transition-colors"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>

                                  {/* Selector de Área */}
                                  <div className="mb-2">
                                    <label className="block text-[8px] font-sans font-extrabold text-black/50 uppercase tracking-wider mb-1">Área</label>
                                    <select
                                      value={resp.area_id}
                                      onChange={(e) => updateResponsable(criterio.id, { area_id: e.target.value, responsable_id: "" })}
                                      className="w-full appearance-none bg-gray-50 border border-gray-200 text-black text-[9px] rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
                                    >
                                      <option value="">— Seleccionar área —</option>
                                      {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                                    </select>
                                  </div>

                                  {/* Selector de Cargo */}
                                  <div className="mb-3">
                                    <label className="block text-[8px] font-sans font-extrabold text-black/50 uppercase tracking-wider mb-1">Cargo</label>
                                    <select
                                      value={resp.responsable_id}
                                      disabled={!resp.area_id}
                                      onChange={(e) => updateResponsable(criterio.id, { responsable_id: e.target.value })}
                                      className="w-full appearance-none bg-gray-50 border border-gray-200 text-black text-[9px] rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500/20 cursor-pointer disabled:opacity-40"
                                    >
                                      <option value="">{resp.area_id ? "— Seleccionar cargo —" : "— Primero elige un área —"}</option>
                                      {cargosDelArea.map((r) => <option key={r.id} value={r.id}>{r.cargo}</option>)}
                                    </select>
                                  </div>

                                  {/* Botón confirmar + limpiar */}
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setOpenResponsablePopoverId(null)}
                                      disabled={!resp.responsable_id}
                                      className="flex-1 text-[9px] font-sans font-extrabold uppercase tracking-wider bg-[#1E50EF] hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                                    >
                                      Confirmar
                                    </button>
                                    {resp.responsable_id && (
                                      <button
                                        onClick={() => updateResponsable(criterio.id, { area_id: "", responsable_id: "" })}
                                        className="text-[9px] font-medium text-red-400 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                      >
                                        Quitar
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </OverlayScrollbarsComponent>

          {/* Stats & Actions Footer */}
          {!isPending && (
            <div className="flex items-center justify-between px-5 py-4 bg-white border-t border-gray-100 shrink-0">
              <p className="text-[9px] text-black/60">
                Mostrando <span className="font-semibold text-black">{criteriosFiltrados.length}</span>{" "}
                de <span className="font-semibold text-black">{criterios.length}</span> criterios
              </p>
              
              <div className="flex items-center gap-4">
                {selectedCodigoId && (
                  <button onClick={() => setSelectedCodigoId(null)} className="text-[9px] text-blue-500 hover:text-blue-700 transition-colors">
                    Limpiar filtro ×
                  </button>
                )}
                <button
                  onClick={saveAll}
                  disabled={isSavingAll}
                  className="flex items-center gap-2 px-3 py-1.5 bg-black hover:bg-neutral-800 text-white text-[9px] uppercase tracking-wider font-sans font-extrabold rounded-lg shadow-sm transition-all disabled:opacity-50"
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
        </main>
      </div>
    </div>
  );
}
