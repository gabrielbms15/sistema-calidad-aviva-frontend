"use client";

import { useState, useTransition, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";

/* ─── Types ──────────────────────────────────────────────── */
interface Macroproceso { id: string; codigo: string; nombre: string; orden: number; }
interface Codigo { id: string; codigo: string; descripcion: string; orden: number; macroproceso_id: string; }
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

interface Responsable {
  responsable_id: string;
  nombre: string;
  apellido: string;
  cargo: string;
  area_nombre: string;
}

interface Props {
  proceso: { id: string; anio: number; sede: { id: string; nombre: string } };
  responsables: Responsable[];
}

/* ─── Constants ──────────────────────────────────────────── */
const TIPO_LABELS: Record<string, string> = {
  documento:   "Doc.",
  proceso:     "Proc.",
  in_situ:     "Obs.",
  ambos:       "Ambos",
};

const ESTADO_COLORS: Record<string, string> = {
  "":             "bg-gray-50 text-gray-500 border-gray-300",
  "cumplido":     "bg-green-100 text-green-700 border-green-200",
  "parcial":      "bg-amber-100 text-amber-700 border-amber-200",
  "no_cumplido":  "bg-red-100 text-red-700 border-red-200",
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
          }));
      }

      if (evidencias.length === 0) {
        evidencias = [{
          nombre_evidencia: "",
          link_evidencia: "",
          orden: 1,
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
export default function SolicitudView({
  proceso,
  responsables,
}: Props) {
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [selectedResponsableId, setSelectedResponsableId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const areas = useMemo(() => {
    const set = new Set(responsables.map((r) => r.area_nombre));
    return Array.from(set).sort();
  }, [responsables]);

  const responsablesDropdown = useMemo(() => {
    if (!selectedArea) return [];
    return responsables.filter((r) => r.area_nombre === selectedArea);
  }, [selectedArea, responsables]);

  const [macroprocesos, setMacroprocesos] = useState<Macroproceso[]>([]);
  const [allCodigos, setAllCodigos] = useState<Codigo[]>([]);
  const [allCriterios, setAllCriterios] = useState<CriterioData[]>([]);
  const [entregableMap, setEntregableMap] = useState<Record<string, EntregableRow[]>>({});

  const [selectedMacroId, setSelectedMacroId] = useState<string | null>(null);
  const [selectedCodigoId, setSelectedCodigoId] = useState<string | null>(null);

  const fetchDataForIds = (ids: string[]) => {
    if (ids.length === 0) {
      setMacroprocesos([]);
      setAllCodigos([]);
      setAllCriterios([]);
      setEntregableMap({});
      setSelectedMacroId(null);
      setSelectedCodigoId(null);
      return;
    }

    startTransition(async () => {
      const { data: raw, error } = await supabase
        .from("criterio")
        .select(`
          id, codigo_criterio, descripcion, codigo_id,
          codigo!inner (
            id, codigo, descripcion, orden,
            macroproceso!inner (
              id, codigo, nombre, orden
            )
          ),
          criterio_responsable!inner (
            responsable_id
          ),
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
        .in("criterio_responsable.responsable_id", ids);

      if (error) {
        console.error("Error fetching data:", error);
        alert("Error al cargar los datos del responsable.");
        return;
      }

      const rawCriterios = raw ?? [];
      
      const filteredCriterios = rawCriterios.filter((c: any) => {
        if (EXCLUDED_CRITERIOS.has(c.codigo_criterio)) return false;
        if (EXCLUDED_MACROS.has(c.codigo.macroproceso.orden)) return false;
        return true;
      });

      const macroMap = new Map<string, Macroproceso>();
      const codigoMap = new Map<string, Codigo>();
      
      filteredCriterios.forEach((c: any) => {
        const cod = c.codigo;
        const mac = cod.macroproceso;
        
        if (!macroMap.has(mac.id)) {
          macroMap.set(mac.id, { id: mac.id, codigo: mac.codigo, nombre: mac.nombre, orden: mac.orden });
        }
        if (!codigoMap.has(cod.id)) {
          codigoMap.set(cod.id, { id: cod.id, codigo: cod.codigo, descripcion: cod.descripcion, orden: cod.orden, macroproceso_id: mac.id });
        }
      });

      const newMacros = Array.from(macroMap.values()).sort((a, b) => a.orden - b.orden);
      const newCodigos = Array.from(codigoMap.values()).sort((a, b) => a.orden - b.orden);
      const newCriterios = filteredCriterios.map(extractCriterio);

      const uniqueCriteriosMap = new Map<string, CriterioData>();
      newCriterios.forEach(c => uniqueCriteriosMap.set(c.id, c));
      
      const newEMap: Record<string, EntregableRow[]> = {};
      filteredCriterios.forEach((c: any) => {
        newEMap[c.id] = buildEntregables(c, proceso.id);
      });

      setMacroprocesos(newMacros);
      setAllCodigos(newCodigos);
      setAllCriterios(Array.from(uniqueCriteriosMap.values()));
      setEntregableMap(newEMap);
      
      setSelectedMacroId(newMacros.length > 0 ? newMacros[0].id : null);
      setSelectedCodigoId(null);
    });
  };

  const handleAreaChange = (area: string) => {
    setSelectedArea(area);
    setSelectedResponsableId("");
    if (!area) {
      fetchDataForIds([]);
    } else {
      const ids = responsables.filter(r => r.area_nombre === area).map(r => r.responsable_id);
      fetchDataForIds(ids);
    }
  };

  const handleResponsableChange = (responsableId: string) => {
    setSelectedResponsableId(responsableId);
    if (!responsableId) {
      const ids = responsables.filter(r => r.area_nombre === selectedArea).map(r => r.responsable_id);
      fetchDataForIds(ids);
    } else {
      fetchDataForIds([responsableId]);
    }
  };

  const codigosEnMacro = useMemo(() => {
    if (!selectedMacroId) return [];
    return allCodigos.filter(c => c.macroproceso_id === selectedMacroId);
  }, [allCodigos, selectedMacroId]);

  const criteriosFiltrados = useMemo(() => {
    if (!selectedMacroId) return [];
    let filtrados = allCriterios.filter(c => {
      const codigo = allCodigos.find(cod => cod.id === c.codigo_id);
      return codigo?.macroproceso_id === selectedMacroId;
    });

    if (selectedCodigoId) {
      filtrados = filtrados.filter(c => c.codigo_id === selectedCodigoId);
    }

    return filtrados.sort((a, b) =>
      a.codigo_criterio.localeCompare(b.codigo_criterio, undefined, { numeric: true, sensitivity: "base" })
    );
  }, [allCriterios, allCodigos, selectedMacroId, selectedCodigoId]);

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
      // Ensure we have a real ID
      if (seg.id && seg.id.length > 5) {
        result = await supabase.from("entregable_seguimiento").update(payload).eq("id", seg.id).select("id").single();
      } else {
        result = await supabase.from("entregable_seguimiento")
          .upsert(payload, { onConflict: "entregable_id, proceso_id" })
          .select("id")
          .single();
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

  const macroActual = macroprocesos.find((m) => m.id === selectedMacroId);

  return (
    <div className="flex flex-col h-full items-center justify-center font-sans">
      <div className="w-full mb-6 flex flex-col items-start gap-4">
        <div>
          <h1 className="text-gray-900 text-3xl font-extrabold leading-snug drop-shadow-sm">
            Solicitud de Documentos
          </h1>
          <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded">Sede {proceso.sede.nombre}</span>
            <span>·</span>
            <span>Proceso de Acreditación {proceso.anio}</span>
          </p>
        </div>

        <div className="w-full max-w-4xl bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[250px]">
            <span className="text-sm font-semibold text-gray-700 shrink-0">Área:</span>
            <select
              value={selectedArea}
              onChange={(e) => handleAreaChange(e.target.value)}
              disabled={isPending}
              className="flex-1 appearance-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
            >
              <option value="">— Seleccionar Área —</option>
              {areas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[300px]">
            <span className="text-sm font-semibold text-gray-700 shrink-0">Responsable:</span>
            <select
              value={selectedResponsableId}
              onChange={(e) => handleResponsableChange(e.target.value)}
              disabled={isPending || !selectedArea}
              className="flex-1 appearance-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all disabled:opacity-50"
            >
              <option value="">Todos los responsables del área</option>
              {responsablesDropdown.map((r) => (
                <option key={r.responsable_id} value={r.responsable_id}>
                  {r.nombre} {r.apellido} | {r.cargo}
                </option>
              ))}
            </select>
          </div>
          
          {isPending && (
            <svg className="w-5 h-5 animate-spin text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
        </div>
      </div>

      {!selectedArea ? (
        <div className="w-full flex-1 flex items-center justify-center bg-white rounded-3xl shadow-sm border border-gray-200 min-h-[400px]">
          <div className="text-center text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-lg">Selecciona un área para ver sus requerimientos.</p>
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col h-[80vh] min-h-[500px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
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
                  <span className="text-white/50 italic">Sin macroprocesos asignados</span>
                )}
              </h2>
              {macroActual && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50 font-medium">Estándar:</span>
                  <div className="relative">
                    <select
                      value={selectedCodigoId ?? ""}
                      onChange={(e) => setSelectedCodigoId(e.target.value || null)}
                      className="appearance-none bg-white border border-transparent text-gray-900 text-sm rounded-lg pl-3 pr-8 py-1.5 focus:outline-none cursor-pointer transition-all w-36 font-medium truncate"
                    >
                      <option value="">Todos</option>
                      {codigosEnMacro.map((c) => <option key={c.id} value={c.id}>{c.codigo}</option>)}
                    </select>
                    <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-1 min-h-0 overflow-hidden">
            <aside className="w-64 shrink-0 bg-[#3d557c] flex flex-col border-r border-white/5">
              <OverlayScrollbarsComponent
                element="nav"
                options={{ scrollbars: { autoHide: "scroll", theme: "os-theme-dark" } }}
                defer
                className="flex-1 py-3 px-4"
              >
                {macroprocesos.map((macro) => {
                  const isActive = macro.id === selectedMacroId;
                  return (
                    <button
                      key={macro.id}
                      onClick={() => { setSelectedMacroId(macro.id); setSelectedCodigoId(null); }}
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

            <main className="flex-1 flex flex-col min-w-0 bg-[#f8f8f8]">
              {selectedCodigoId && (() => {
                const obj = codigosEnMacro.find((c) => c.id === selectedCodigoId);
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
                    <div className="w-[30%] shrink-0 px-3 py-3 border-l border-gray-200">Entregable</div>
                    <div className="w-[6%]  shrink-0 px-2 py-3 border-l border-gray-200 text-center">Tipo</div>
                    <div className="w-[12%] shrink-0 px-2 py-3 border-l border-gray-200 text-center">Estado</div>
                    <div className="w-[24%] shrink-0 px-3 py-3 border-l border-gray-200">Evidencia</div>
                    <div className="w-[23%] shrink-0 px-3 py-3 border-l border-gray-200">Fuente</div>
                  </div>

                  {criteriosFiltrados.length === 0 ? (
                    <div className="flex items-center justify-center py-20 text-gray-300 text-sm">
                      No hay criterios asignados.
                    </div>
                  ) : (
                    criteriosFiltrados.map((criterio, ci) => {
                      const entregables = entregableMap[criterio.id] ?? [];

                      return (
                        <div
                          key={criterio.id}
                          className={`flex ${ci !== 0 ? "border-t border-gray-200" : ""} ${ci % 2 !== 0 ? "bg-gray-100" : "bg-white"}`}
                        >
                          <div className="w-[5%] shrink-0 border-r border-gray-100 px-2 py-4 flex items-start justify-center">
                            <span className="font-mono text-xs font-bold text-gray-900 text-center break-all">
                              {criterio.codigo_criterio}
                            </span>
                          </div>

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
                                  <div key={row.id} className={`flex flex-col ${idx !== 0 ? "border-t border-gray-100" : ""}`}>
                                    <div className="flex min-h-[72px]">
                                      <div className="w-[50.5%] flex items-stretch border-r border-gray-100">
                                        <div className="w-[62.5%] shrink-0 px-3 py-3 border-r border-gray-100 flex items-center relative group">
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
                                          </div>
                                        </div>
                                        <div className="w-[12.5%] shrink-0 px-1 py-3 border-r border-gray-100 flex items-center justify-center">
                                          {row.tipo_entregable ? (
                                            <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 whitespace-nowrap">
                                              {TIPO_LABELS[row.tipo_entregable] ?? row.tipo_entregable}
                                            </span>
                                          ) : (
                                            <span className="text-gray-300 text-xs">—</span>
                                          )}
                                        </div>
                                        <div className="w-[25%] shrink-0 px-2 py-3 flex items-center">
                                          <div className={`w-full text-center text-xs font-medium rounded-lg px-2 py-1.5 border ${estadoColor}`}>
                                            {seg.estado || "— Estado —"}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="w-[49.5%] flex flex-col min-w-0">
                                        {row.evidencias.map((ev, evIdx) => (
                                          <div key={ev.id || evIdx} className={`flex items-stretch min-h-[72px] ${evIdx !== 0 ? "border-t border-gray-100" : ""}`}>
                                            <div className="w-[51.1%] shrink-0 px-3 py-3 border-r border-gray-100 flex items-center">
                                              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                {ev.nombre_evidencia || <span className="text-gray-300 italic">Sin descripción</span>}
                                              </p>
                                            </div>

                                            <div className="w-[48.9%] shrink-0 px-3 py-3 flex items-center relative group">
                                              {ev.link_evidencia ? (
                                                <p className="text-sm text-blue-600 truncate pr-8 w-full select-all">
                                                  {ev.link_evidencia}
                                                </p>
                                              ) : (
                                                <p className="text-sm text-gray-300 italic w-full">Sin enlace</p>
                                              )}
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
                                          </div>
                                        ))}
                                      </div>
                                    </div>

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

                <div className="flex items-center justify-between mt-4 px-1">
                  <p className="text-xs text-gray-400">
                    Mostrando <span className="font-medium text-gray-600">{criteriosFiltrados.length}</span>{" "}
                    de <span className="font-medium text-gray-600">{allCriterios.length}</span> criterios
                  </p>
                  {selectedCodigoId && (
                    <button onClick={() => setSelectedCodigoId(null)} className="text-xs text-blue-500 hover:text-blue-700 transition-colors">
                      Limpiar filtro ×
                    </button>
                  )}
                </div>
              </OverlayScrollbarsComponent>
            </main>
          </div>
        </div>
      )}

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
