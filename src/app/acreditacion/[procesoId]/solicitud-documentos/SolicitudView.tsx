"use client";

import { useState, useTransition, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";

/* ─── Types ──────────────────────────────────────────────── */
interface Macroproceso { id: string; codigo: string; nombre: string; orden: number; }
interface Codigo { id: string; codigo: string; descripcion: string; orden: number; macroproceso_id: string; }
interface CriterioData { 
  id: string; 
  codigo_criterio: string; 
  descripcion: string; 
  codigo_id: string; 
  asignacion?: {
    id?: string;
    fecha_asignacion: string | null;
    fecha_seguimiento: string | null;
    fecha_deadline: string | null;
    isSavingF1?: boolean;
    isSavingF2?: boolean;
    isSavingF3?: boolean;
  };
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
  documento: "Doc.",
  proceso: "Proc.",
  in_situ: "Obs.",
  ambos: "Ambos",
};

const ESTADO_COLORS: Record<string, string> = {
  "": "bg-gray-50 text-gray-500 border-gray-300",
  "cumplido": "bg-green-100 text-green-700 border-green-200",
  "parcial": "bg-amber-100 text-amber-700 border-amber-200",
  "no_cumplido": "bg-red-100 text-red-700 border-red-200",
};

const EXCLUDED_CRITERIOS = new Set([
  "DIR1-4", "DIR1-5", "DIR1-6", "DIR1-8", "GRH4-1", "MRA8-1", "MRA8-2", "MRA8-3",
  "ATA1-3", "ATA3-2", "ATA3-3", "ATA3-4", "ATA3-5", "ATA3-6", "RCR4-1", "RCR4-2",
  "RCR4-3", "GMD3-4", "GMD3-5", "MRS1-1", "MRS1-2", "MRS1-3", "MRS2-1", "MRS2-2", "ATH6-1", "ATH6-2"
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

function extractCriterio(c: any, procesoId: string): CriterioData {
  const asig = (c.asignacion ?? []).find((a: any) => a.proceso_id === procesoId);
  return { 
    id: c.id, 
    codigo_criterio: c.codigo_criterio, 
    descripcion: c.descripcion, 
    codigo_id: c.codigo_id,
    asignacion: {
      id: asig?.id,
      fecha_asignacion: asig?.fecha_asignacion ?? null,
      fecha_seguimiento: asig?.fecha_seguimiento ?? null,
      fecha_deadline: asig?.fecha_deadline ?? null,
    }
  };
}

/* ─── Component ──────────────────────────────────────────── */
export default function SolicitudView({
  proceso,
  responsables,
}: Props) {
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [selectedResponsableId, setSelectedResponsableId] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [isSavingGlobalFechas, setIsSavingGlobalFechas] = useState(false);

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
          ),
          asignacion (
            id, fecha_asignacion, fecha_seguimiento, fecha_deadline, proceso_id
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
      const newCriterios = filteredCriterios.map(c => extractCriterio(c, proceso.id));

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
      const finalEstado = seg.estado || 'parcial';
      const payload = {
        entregable_id: entregableId,
        proceso_id: proceso.id,
        estado: finalEstado,
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
        updateSeguimiento(criterioId!, idx!, { id: result.data.id, estado: finalEstado });
      }
    } catch (err: any) {
      console.error("Error saving seguimiento:", err.message || err.code || "Unknown error", err);
    } finally {
      if (hasIds) {
        updateSeguimiento(criterioId!, idx!, { isSavingObservacion: false });
      }
    }
  };

  const updateCriterioAsignacion = (criterioId: string, patch: Partial<CriterioData["asignacion"]>) => {
    setAllCriterios(prev => prev.map(c => c.id === criterioId ? {
      ...c, asignacion: { ...c.asignacion, ...patch } as any
    } : c));
  };

  const saveAsignacionFechas = async (criterioId: string) => {
    updateCriterioAsignacion(criterioId, { isSavingF1: true }); // Using existing boolean type as loader
    try {
      const current = allCriterios.find(c => c.id === criterioId)?.asignacion;
      const payload = {
        proceso_id: proceso.id,
        criterio_id: criterioId,
        fecha_asignacion: current?.fecha_asignacion || null,
        fecha_seguimiento: current?.fecha_seguimiento || null,
        fecha_deadline: current?.fecha_deadline || null,
      };

      let result;
      if (current?.id) {
        result = await supabase.from("asignacion").update(payload).eq("id", current.id).select("id").single();
      } else {
        result = await supabase.from("asignacion").upsert(payload, { onConflict: "proceso_id, criterio_id" }).select("id").single();
      }

      if (result.error) throw result.error;
      updateCriterioAsignacion(criterioId, { id: result.data.id });
    } catch (err: any) {
      console.error("Error saving asignacion fechas:", err);
      alert("Error al guardar las fechas.");
    } finally {
      updateCriterioAsignacion(criterioId, { isSavingF1: false });
    }
  };

  const saveAllFechasGlobal = async () => {
    setIsSavingGlobalFechas(true);
    try {
      for (const crit of criteriosFiltrados) {
        await saveAsignacionFechas(crit.id);
      }
    } finally {
      setIsSavingGlobalFechas(false);
    }
  };

  const renderAsignacionDate = (criterioId: string, field: "fecha_asignacion"| "fecha_seguimiento"| "fecha_deadline", val: string | null | undefined) => {
    return (
      <input 
         type="date"
         value={val || ""}
         onChange={(e) => updateCriterioAsignacion(criterioId, { [field]: e.target.value || null })}
         className="w-full text-[10px] p-1.5 border border-gray-200 bg-white rounded-md shadow-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all outline-none text-gray-700 hover:border-gray-300"
      />
    );
  };

  const macroActual = macroprocesos.find((m) => m.id === selectedMacroId);

  return (
    <div className="flex flex-col h-full font-avenir gap-4">

      {/* ─── Encabezado ─── */}
      <div className="w-[95%] flex flex-col gap-4">
        {/* Título + Volver */}
        <div className="w-full flex items-center justify-between shrink-0 pl-2">
          <div className="flex items-center gap-3">
            <span className="text-xl leading-none drop-shadow-sm">📄</span>
            <h1 className="text-gray-900 font-sans text-[20px] font-bold tracking-tight leading-none">
              Solicitud de Documentos
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

        {/* Barra de filtros: Área + Responsable + Badges */}
        <div className="w-full bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            {/* Área */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-extrabold text-black/50 uppercase tracking-wide shrink-0">Área:</span>
              <div className="relative">
                <select
                  value={selectedArea}
                  onChange={(e) => handleAreaChange(e.target.value)}
                  disabled={isPending}
                  className="appearance-none bg-gray-50 border border-gray-200 text-black text-[9px] font-medium rounded-md pl-2 pr-6 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all w-40 disabled:opacity-50"
                >
                  <option value="">— Seleccionar —</option>
                  {areas.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Responsable */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-extrabold text-black/50 uppercase tracking-wide shrink-0">Responsable:</span>
              <div className="relative">
                <select
                  value={selectedResponsableId}
                  onChange={(e) => handleResponsableChange(e.target.value)}
                  disabled={isPending || !selectedArea}
                  className="appearance-none bg-gray-50 border border-gray-200 text-black text-[9px] font-medium rounded-md pl-2 pr-6 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all w-52 disabled:opacity-50"
                >
                  <option value="">Todos del área</option>
                  {responsablesDropdown.map((r) => (
                    <option key={r.responsable_id} value={r.responsable_id}>
                      {r.nombre} {r.apellido} | {r.cargo}
                    </option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Spinner */}
            {isPending && (
              <svg className="w-3.5 h-3.5 animate-spin text-[#1E50EF] shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
          </div>

          {/* Badges sede / año */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="bg-[#EBF1FA] text-[#1E50EF] font-bold text-[9px] px-2 py-1 rounded-md">
              Sede {proceso.sede.nombre}
            </span>
            <span className="bg-aviva-coral1/10 text-aviva-coral1 font-bold text-[9px] px-2 py-1 rounded-md">
              Proceso {proceso.anio}
            </span>
          </div>
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

          {!selectedArea ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <p className="text-[9px] text-gray-400 text-center italic">Selecciona un área para ver los macroprocesos asignados.</p>
            </div>
          ) : macroprocesos.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <p className="text-[9px] text-gray-400 text-center italic">Sin macroprocesos asignados.</p>
            </div>
          ) : (
            <OverlayScrollbarsComponent
              element="nav"
              options={{ scrollbars: { autoHide: "scroll", theme: "os-theme-dark" } }}
              defer
              className="flex-1 py-1 px-3"
            >
              {macroprocesos.map((macro) => {
                const isActive = macro.id === selectedMacroId;
                return (
                  <button
                    key={macro.id}
                    onClick={() => { setSelectedMacroId(macro.id); setSelectedCodigoId(null); }}
                    disabled={isPending}
                    className={`w-full text-left flex flex-row items-stretch gap-3 px-3 py-2 rounded-xl mb-1.5 transition-all duration-200 group ${isActive
                      ? "border border-[#DEEBF7] shadow-md bg-[#DEEBF7] text-[#02163a] scale-[1.02]"
                      : "text-black/60 hover:text-black hover:bg-black/5"
                      }`}
                  >
                    <div className={`flex items-center justify-center shrink-0 w-8 rounded-lg text-[9px] font-extrabold transition-colors duration-200 shadow-sm ${isActive ? "bg-[#1E50EF] text-white" : "bg-gray-200 text-gray-900"}`}>
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
          )}

          <div className="px-5 py-3 border-t border-gray-100 shrink-0">
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

          {/* Cabecera: macroproceso actual + selector estándar */}
          <div className="bg-white px-6 pt-5 pb-2 flex items-center justify-between shrink-0">
            <h2 className="text-black text-[13px] leading-tight flex items-center gap-3">
              {macroActual ? (
                <>
                  <span className="font-sans font-extrabold text-black">Macroproceso {macroActual.orden}</span>
                  <span className="text-black/30 font-light">|</span>
                  <span className="font-medium text-black">{macroActual.nombre}</span>
                </>
              ) : (
                <span className="text-gray-400 italic text-[13px]">
                  {!selectedArea ? "Selecciona un área para comenzar" : "Sin macroprocesos asignados"}
                </span>
              )}
            </h2>

            {macroActual && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-black font-bold">Estándar:</span>
                <div className="relative">
                  <select
                    value={selectedCodigoId ?? ""}
                    onChange={(e) => setSelectedCodigoId(e.target.value || null)}
                    className="appearance-none bg-gray-50 border border-gray-200 text-black text-[9px] rounded-md pl-2 pr-6 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all w-24 font-medium"
                  >
                    <option value="">Todos</option>
                    {codigosEnMacro.map((c) => (
                      <option key={c.id} value={c.id}>{c.codigo}</option>
                    ))}
                  </select>
                  <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Subheader estándar seleccionado */}
          {selectedCodigoId && (() => {
            const obj = codigosEnMacro.find((c) => c.id === selectedCodigoId);
            return obj ? (
              <div className="bg-white px-8 py-2 border-b border-gray-200 text-[13px] text-black shadow-sm animate-in fade-in shrink-0">
                <span className="font-bold text-black mr-2">{obj.codigo}:</span>
                {obj.descripcion}
              </div>
            ) : null;
          })()}

          {/* Sin área seleccionada */}
          {!selectedArea ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-300">
                <svg className="w-14 h-14 mx-auto mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-[11px] font-medium">Selecciona un área para ver sus requerimientos.</p>
              </div>
            </div>
          ) : (
            <>
              <OverlayScrollbarsComponent
                element="div"
                options={{ scrollbars: { autoHide: "scroll", theme: "os-theme-light" } }}
                defer
                className="flex-1 px-6 pt-1 pb-2"
              >
                <div className="bg-white rounded-2xl border border-gray-300 shadow-sm overflow-hidden w-full">
                  {/* Table header */}
                  <div className="flex border-b border-gray-300 bg-[#DEEBF7] text-[8px] font-sans font-extrabold uppercase tracking-wider text-black shrink-0">
                    <div className="w-[8%] shrink-0 px-2 py-2 text-center flex items-center justify-center">Criterio</div>
                    <div className="w-[62%] flex shrink-0 min-w-0">
                      <div className="w-[50%] shrink-0 px-3 py-2 border-l border-gray-300 flex items-center">Entregable</div>
                      <div className="w-[50%] shrink-0 px-3 py-2 border-l border-gray-300 flex items-center">Evidencia</div>
                    </div>
                    <div className="w-[30%] shrink-0 px-3 py-2 border-l border-gray-300 flex items-center justify-center bg-transparent">Fechas</div>
                  </div>

                  {/* Rows */}
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
                          className={`flex ${ci !== 0 ? "border-t border-gray-300" : ""} ${ci % 2 !== 0 ? "bg-gray-100" : "bg-white"}`}
                        >
                          {/* Criterio */}
                          <div className="w-[8%] shrink-0 border-r border-gray-300 px-1.5 py-2 flex items-start justify-center">
                            <span className="font-sans text-[8px] font-extrabold text-black text-center break-all leading-tight">
                              {criterio.codigo_criterio}
                            </span>
                          </div>

                          {/* Entregables */}
                          <div className="w-[62%] shrink-0 flex flex-col min-w-0">
                            {entregables.length === 0 ? (
                              <div className="flex items-center px-4 py-3 text-[9px] text-gray-300 italic">
                                Sin entregables definidos.
                              </div>
                            ) : (
                              entregables.map((row, idx) => {
                                const seg = row.seguimiento;
                                const estadoColor = ESTADO_COLORS[seg.estado] ?? ESTADO_COLORS[""];

                                return (
                                  <div key={row.id} className={`flex flex-col flex-1 ${idx !== 0 ? "border-t border-gray-200" : ""}`}>
                                    <div className="flex flex-1 min-h-[64px]">
                                      <div className="w-[50%] flex flex-col border-r border-gray-200">
                                        {/* Descripción entregable + Pills */}
                                        <div className="w-[100%] shrink-0 px-3 py-2 flex flex-col justify-between relative min-h-[64px] flex-1">
                                          <p className="text-[9px] text-gray-700 leading-relaxed pb-8">
                                            {row.descripcion}
                                          </p>
                                          <div className="absolute bottom-1.5 left-3 right-3 flex items-center justify-between gap-2">
                                            {/* Left: Tipo */}
                                            <div className="flex items-center">
                                              {row.tipo_entregable ? (
                                                <span className="text-[8px] font-bold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 whitespace-nowrap">
                                                  {(() => {
                                                    const t = row.tipo_entregable.replace("_", " ");
                                                    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
                                                  })()}
                                                </span>
                                              ) : (
                                                <span className="text-gray-300 text-[8px]">—</span>
                                              )}
                                            </div>

                                            {/* Right: Estado + Actions */}
                                            <div className="flex items-center gap-1.5">
                                              <span className={`text-center text-[8px] font-bold rounded px-1.5 py-0.5 border ${estadoColor}`}>
                                                {seg.estado ? seg.estado.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "— Estado —"}
                                              </span>
                                              
                                              {/* Actions */}
                                              <div className="flex items-center gap-1 transition-opacity">
                                                <button
                                                  onClick={() => updateSeguimiento(criterio.id, idx, { isObservacionOpen: !seg.isObservacionOpen })}
                                                  className={`transition-colors p-1 rounded-md ${seg.observacion ? "text-amber-500 hover:text-amber-600 bg-amber-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                                                  title="Ver observación"
                                                >
                                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                                  </svg>
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Evidencias + Fuentes */}
                                      <div className="w-[50%] flex flex-col min-w-0">
                                        {row.evidencias.map((ev, evIdx) => (
                                          <div key={ev.id || evIdx} className={`flex flex-col px-3 pt-3 pb-1.5 min-h-[72px] justify-center ${evIdx !== 0 ? "border-t border-gray-200" : ""}`}>
                                            <div className="flex flex-col gap-1.5 w-full">
                                              {/* Nombre evidencia (Box style) */}
                                              <div className="w-full text-[9px] font-medium text-black bg-gray-50 border border-gray-200 rounded px-2 py-1.5 min-h-[28px] flex items-center">
                                                <span className="leading-relaxed whitespace-pre-wrap">
                                                  {ev.nombre_evidencia || <span className="text-gray-400 italic">Sin descripción</span>}
                                                </span>
                                              </div>
                                              
                                              {/* Link evidencia (Box style) */}
                                              <div className="relative flex-1 group">
                                                <div className="w-full text-[9px] font-medium text-blue-600 bg-gray-50 border border-gray-200 rounded px-2 py-1.5 pr-8 min-h-[28px] flex items-center overflow-hidden">
                                                  {ev.link_evidencia ? (
                                                    <span className="truncate w-full select-all">{ev.link_evidencia}</span>
                                                  ) : (
                                                    <span className="text-gray-400 italic w-full">Sin enlace</span>
                                                  )}
                                                </div>
                                                {ev.link_evidencia && ev.link_evidencia.startsWith("http") && (
                                                  <a
                                                    href={ev.link_evidencia}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                                                    title="Abrir enlace"
                                                  >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                  </a>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Panel observación */}
                                    {seg.isObservacionOpen && (
                                      <div className="bg-amber-50 p-2.5 border-t border-amber-200/50 flex flex-col gap-1.5 relative">
                                        <div className="flex items-center justify-between">
                                          <label className="text-[8px] font-sans font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                                            <span>📝</span> Observación
                                          </label>
                                          <button
                                            onClick={() => updateSeguimiento(criterio.id, idx, { isObservacionOpen: false })}
                                            className="text-[8px] font-sans font-extrabold uppercase tracking-wider px-2 py-1 text-gray-500 hover:text-gray-700 transition-colors"
                                          >
                                            Cerrar
                                          </button>
                                        </div>
                                        <textarea
                                          readOnly
                                          value={seg.observacion || ""}
                                          placeholder="Sin observaciones adicionales..."
                                          className="w-full text-[9px] font-medium text-gray-700 bg-white/70 border border-amber-200/50 rounded p-2 resize-y focus:outline-none min-h-[50px] cursor-default leading-relaxed"
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Fechas */}
                          <div className="w-[30%] shrink-0 p-3 border-l border-gray-200 bg-transparent flex flex-col gap-2 relative group/cell">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] font-bold text-gray-500">Fecha de asignación:</span>
                              {renderAsignacionDate(criterio.id, "fecha_asignacion", criterio.asignacion?.fecha_asignacion)}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] font-bold text-gray-500">Fecha de seguimiento:</span>
                              {renderAsignacionDate(criterio.id, "fecha_seguimiento", criterio.asignacion?.fecha_seguimiento)}
                            </div>
                            <div className="flex flex-col gap-0.5 pb-5">
                              <span className="text-[8px] font-bold text-gray-500">Deadline:</span>
                              {renderAsignacionDate(criterio.id, "fecha_deadline", criterio.asignacion?.fecha_deadline)}
                            </div>

                            <button 
                               onClick={() => saveAsignacionFechas(criterio.id)}
                               disabled={criterio.asignacion?.isSavingF1}
                               className="absolute bottom-2 right-2 p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
                               title="Guardar fechas"
                            >
                              {criterio.asignacion?.isSavingF1 ? (
                                 <svg className="w-3 h-3 animate-spin text-green-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                              ) : (
                                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </OverlayScrollbarsComponent>

              {/* Footer fijo */}
              <div className="shrink-0 border-t border-gray-100 px-6 py-2 flex items-center justify-between bg-white">
                <p className="text-[9px] text-gray-400 flex-1">
                  Mostrando <span className="font-medium text-gray-600">{criteriosFiltrados.length}</span>{" "}
                  de <span className="font-medium text-gray-600">{allCriterios.length}</span> criterios
                </p>
                <div className="flex gap-4 items-center">
                  {selectedCodigoId && (
                    <button onClick={() => setSelectedCodigoId(null)} className="text-[9px] text-blue-500 hover:text-blue-700 transition-colors">
                      Limpiar filtro ×
                    </button>
                  )}
                  <button
                    onClick={saveAllFechasGlobal}
                    disabled={isSavingGlobalFechas || criteriosFiltrados.length === 0}
                    className="flex items-center gap-1.5 text-[9px] px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md font-extrabold uppercase tracking-wide transition-colors disabled:opacity-50"
                  >
                    {isSavingGlobalFechas ? (
                      <>
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        Guardar todo
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
