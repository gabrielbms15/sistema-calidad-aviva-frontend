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
  id?: string;          // undefined → todavía no existe en BD
  estado: string;
  nombre_evidencia: string;
  link_evidencia: string;
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
  observacion: "Obs.",
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
      // Buscar el seguimiento que corresponde a este proceso
      const seg = (e.entregable_seguimiento ?? []).find(
        (s: any) => s.proceso_id === procesoId
      );
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
          nombre_evidencia: seg?.nombre_evidencia ?? "",
          link_evidencia: seg?.link_evidencia ?? "",
          isSaving: false,
        },
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
        const { data: raw } = await supabase
          .from("criterio")
          .select(`
            id, codigo_criterio, descripcion, codigo_id,
            entregable (
              id, descripcion, tipo_entregable, nota, orden,
              entregable_seguimiento (
                id, estado, nombre_evidencia, link_evidencia, proceso_id
              )
            )
          `)
          .in("codigo_id", ids);

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

  /* ─── Seguimiento mutations ─── */
  const updateSeguimiento = (criterioId: string, idx: number, patch: Partial<Seguimiento>) => {
    setEntregableMap((prev) => {
      const rows = [...(prev[criterioId] ?? [])];
      rows[idx] = { ...rows[idx], seguimiento: { ...rows[idx].seguimiento, ...patch } };
      return { ...prev, [criterioId]: rows };
    });
  };

  const saveSeguimiento = async (criterioId: string, idx: number) => {
    const row = entregableMap[criterioId]?.[idx];
    if (!row) return;
    const seg = row.seguimiento;

    updateSeguimiento(criterioId, idx, { isSaving: true });

    if (seg.id) {
      // UPDATE
      const { error } = await supabase
        .from("entregable_seguimiento")
        .update({
          estado: seg.estado || null,
          nombre_evidencia: seg.nombre_evidencia || null,
          link_evidencia: seg.link_evidencia || null,
        })
        .eq("id", seg.id);

      if (error) {
        alert("Error al actualizar el seguimiento.");
        updateSeguimiento(criterioId, idx, { isSaving: false });
        return;
      }
    } else {
      // INSERT
      const { data: saved, error } = await supabase
        .from("entregable_seguimiento")
        .insert({
          entregable_id: row.id,
          proceso_id: proceso.id,
          estado: seg.estado || null,
          nombre_evidencia: seg.nombre_evidencia || null,
          link_evidencia: seg.link_evidencia || null,
        })
        .select("id")
        .single();

      if (error || !saved) {
        alert("Error al guardar el seguimiento.");
        updateSeguimiento(criterioId, idx, { isSaving: false });
        return;
      }
      updateSeguimiento(criterioId, idx, { id: saved.id });
    }

    updateSeguimiento(criterioId, idx, { isSaving: false });
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
                        ? "border border-white/30 backdrop-blur-md bg-white/5 text-white scale-[1.02]"
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
                                    className={`flex items-stretch min-h-[72px] ${idx !== 0 ? "border-t border-gray-100" : ""}`}
                                  >
                                    {/* Entregable descripción — read-only (definido en módulo anterior) */}
                                    <div className="w-[25.3%] shrink-0 px-3 py-3 border-r border-gray-100 flex items-center">
                                      <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
                                        {row.descripcion}
                                      </p>
                                    </div>

                                    {/* Tipo — badge read-only */}
                                    <div className="w-[6.3%] shrink-0 px-1 py-3 border-r border-gray-100 flex items-center justify-center">
                                      {row.tipo_entregable ? (
                                        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 whitespace-nowrap">
                                          {TIPO_LABELS[row.tipo_entregable] ?? row.tipo_entregable}
                                        </span>
                                      ) : (
                                        <span className="text-gray-300 text-xs">—</span>
                                      )}
                                    </div>

                                    {/* Estado */}
                                    <div className="w-[12.6%] shrink-0 px-2 py-3 border-r border-gray-100 flex items-center">
                                      <select
                                        value={seg.estado}
                                        onChange={(e) => updateSeguimiento(criterio.id, idx, { estado: e.target.value })}
                                        className={`w-full appearance-none text-xs font-medium rounded-lg px-2 py-1.5 border focus:outline-none focus:ring-1 focus:ring-blue-300 cursor-pointer ${estadoColor}`}
                                      >
                                        {ESTADO_OPTIONS.map((o) => (
                                          <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Nombre evidencia */}
                                    <div className="w-[25.3%] shrink-0 px-2 py-3 border-r border-gray-100 flex items-center">
                                      <textarea
                                        value={seg.nombre_evidencia}
                                        onChange={(e) => updateSeguimiento(criterio.id, idx, { nombre_evidencia: e.target.value })}
                                        placeholder="Nombre del documento o proceso..."
                                        rows={2}
                                        className="w-full text-sm text-gray-700 bg-transparent resize-none focus:outline-none placeholder-gray-300 leading-relaxed"
                                      />
                                    </div>

                                    {/* Link evidencia */}
                                    <div className="w-[24.2%] shrink-0 px-2 py-3 border-r border-gray-100 flex items-center">
                                      <input
                                        type="url"
                                        value={seg.link_evidencia}
                                        onChange={(e) => updateSeguimiento(criterio.id, idx, { link_evidencia: e.target.value })}
                                        placeholder="https://sharepoint.com/..."
                                        className="w-full text-sm text-blue-600 bg-transparent focus:outline-none placeholder-gray-300 leading-relaxed truncate"
                                      />
                                    </div>

                                    {/* Acción — guardar / actualizar */}
                                    <div className="w-[6.3%] shrink-0 px-2 py-3 flex items-center justify-center">
                                      <button
                                        onClick={() => saveSeguimiento(criterio.id, idx)}
                                        disabled={seg.isSaving}
                                        className="flex items-center justify-center w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                                        title={seg.id ? "Actualizar" : "Guardar"}
                                      >
                                        {seg.isSaving ? (
                                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                          </svg>
                                        ) : (
                                          <span className="text-base">💾</span>
                                        )}
                                      </button>
                                    </div>
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
                  {selectedCodigoId && (
                    <button onClick={() => setSelectedCodigoId(null)} className="text-xs text-blue-500 hover:text-blue-700 transition-colors">
                      Limpiar filtro ×
                    </button>
                  )}
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
