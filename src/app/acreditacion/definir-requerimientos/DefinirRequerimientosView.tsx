"use client";

import { useState, useTransition } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";

/* ─── Types ──────────────────────────────────────────────── */
interface Macroproceso { id: string; codigo: string; nombre: string; orden: number; }
interface Codigo { id: string; codigo: string; descripcion: string; orden: number; }
interface Area { id: string; nombre: string; }
interface Responsable { id: string; area_id: string; cargo: string; }
interface CriterioData { id: string; codigo_criterio: string; descripcion: string; codigo_id: string; }

interface EntregableRow {
  id?: string;
  criterio_id: string;
  descripcion: string;
  tipo_entregable: string;
  nota: string;
  orden: number;
  isSaving: boolean;
}

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
const TIPO_OPTIONS = [
  { value: "documento", label: "Documento" },
  { value: "proceso", label: "Proceso" },
  { value: "observacion", label: "Observación" },
  { value: "ambos", label: "Ambos" },
];

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
function buildEntregables(c: any): EntregableRow[] {
  const rows: EntregableRow[] = (c.entregable ?? []).map((e: any) => ({
    id: e.id,
    criterio_id: c.id,
    descripcion: e.descripcion ?? "",
    tipo_entregable: e.tipo_entregable ?? "",
    nota: e.nota ?? "",
    orden: e.orden ?? 1,
    isSaving: false,
  }));
  if (rows.length === 0) {
    rows.push({ criterio_id: c.id, descripcion: "", tipo_entregable: "", nota: "", orden: 1, isSaving: false });
  }
  return rows;
}

function buildResponsable(c: any, responsables: Responsable[]): ResponsableState {
  const cr = c.criterio_responsable?.[0];
  const responsable_id = cr?.responsable_id ?? "";
  const area_id = responsables.find((r) => r.id === responsable_id)?.area_id ?? "";
  return { criterioResponsableId: cr?.id, responsable_id, area_id };
}

function extractCriterio(c: any): CriterioData {
  return { id: c.id, codigo_criterio: c.codigo_criterio, descripcion: c.descripcion, codigo_id: c.codigo_id };
}

/* ─── Component ──────────────────────────────────────────── */
export default function DefinirRequerimientosView({
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

  const [entregablesMap, setEntregablesMap] = useState<Record<string, EntregableRow[]>>(() => {
    const m: Record<string, EntregableRow[]> = {};
    criteriosIniciales.forEach((c) => { m[c.id] = buildEntregables(c); });
    return m;
  });

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
          .select("id,codigo_criterio,descripcion,codigo_id,entregable(id,criterio_id,descripcion,tipo_entregable,nota,orden),criterio_responsable(id,criterio_id,responsable_id)")
          .in("codigo_id", ids);
        const result = raw ?? [];
        setCriterios(result.map(extractCriterio));
        const newE: Record<string, EntregableRow[]> = {};
        const newR: Record<string, ResponsableState> = {};
        result.forEach((c: any) => { newE[c.id] = buildEntregables(c); newR[c.id] = buildResponsable(c, responsables); });
        setEntregablesMap(newE);
        setResponsableMap(newR);
      } else {
        setCriterios([]); setEntregablesMap({}); setResponsableMap({});
      }
    });
  };

  /* ─── Mutations ─── */
  const addEntregableRow = (criterioId: string) => {
    setEntregablesMap((prev) => {
      const rows = prev[criterioId] ?? [];
      return { ...prev, [criterioId]: [...rows, { criterio_id: criterioId, descripcion: "", tipo_entregable: "", nota: "", orden: rows.length + 1, isSaving: false }] };
    });
  };

  const updateEntregableRow = (criterioId: string, idx: number, patch: Partial<EntregableRow>) => {
    setEntregablesMap((prev) => {
      const rows = [...(prev[criterioId] ?? [])];
      rows[idx] = { ...rows[idx], ...patch };
      return { ...prev, [criterioId]: rows };
    });
  };

  const updateResponsable = (criterioId: string, patch: Partial<ResponsableState>) => {
    setResponsableMap((prev) => ({ ...prev, [criterioId]: { ...prev[criterioId], ...patch } }));
  };

  const saveEntregable = async (criterioId: string, idx: number) => {
    const row = entregablesMap[criterioId]?.[idx];
    const resp = responsableMap[criterioId];
    if (!row?.descripcion.trim() || !row.tipo_entregable) {
      alert("Completa la descripción y el tipo de entregable."); return;
    }
    updateEntregableRow(criterioId, idx, { isSaving: true });

    let savedId = row.id;

    if (row.id) {
      // UPDATE existing entregable
      const { error } = await supabase
        .from("entregable")
        .update({ descripcion: row.descripcion, tipo_entregable: row.tipo_entregable, nota: row.nota || null })
        .eq("id", row.id);
      if (error) {
        alert("Error al actualizar el entregable.");
        updateEntregableRow(criterioId, idx, { isSaving: false }); return;
      }
    } else {
      // INSERT new entregable
      const { data: saved, error } = await supabase
        .from("entregable")
        .insert({ criterio_id: criterioId, descripcion: row.descripcion, tipo_entregable: row.tipo_entregable, nota: row.nota || null, orden: row.orden })
        .select("id").single();
      if (error || !saved) {
        alert("Error al guardar el entregable.");
        updateEntregableRow(criterioId, idx, { isSaving: false }); return;
      }
      savedId = saved.id;
    }

    // Upsert criterio_responsable
    if (resp?.responsable_id) {
      if (resp.criterioResponsableId) {
        // UPDATE existing responsable
        await supabase
          .from("criterio_responsable")
          .update({ responsable_id: resp.responsable_id })
          .eq("id", resp.criterioResponsableId);
      } else {
        // INSERT new responsable
        const { data: cr } = await supabase
          .from("criterio_responsable")
          .insert({ criterio_id: criterioId, responsable_id: resp.responsable_id })
          .select("id").single();
        if (cr) updateResponsable(criterioId, { criterioResponsableId: cr.id });
      }
    }

    updateEntregableRow(criterioId, idx, { id: savedId, isSaving: false });
  };

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
        <h1 className="text-gray-900 text-3xl font-extrabold leading-snug drop-shadow-sm">
          Definir Requerimientos
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
              {macroprocesos.filter((macro) => !HIDDEN_MACROS.has(macro.codigo)).map((macro) => {
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

                  {/* Table header */}
                  <div className="flex border-b border-gray-200 bg-gray-200/80 text-[11px] font-bold uppercase tracking-wider text-gray-500 shrink-0">
                    <div className="w-[5%] shrink-0 px-2 py-3">Criterio</div>
                    <div className="w-[20%] shrink-0 px-3 py-3 border-l border-gray-200">Área</div>
                    <div className="w-[25%] shrink-0 px-3 py-3 border-l border-gray-200">Cargo</div>
                    <div className="w-[40%] shrink-0 px-3 py-3 border-l border-gray-200">Entregable</div>
                    <div className="w-[5%] shrink-0 px-2 py-3 border-l border-gray-200 text-center">Tipo</div>
                    <div className="w-[5%] shrink-0 px-2 py-3 border-l border-gray-200 text-center">Acción</div>
                  </div>

                  {/* Rows */}
                  {criteriosFiltrados.length === 0 ? (
                    <div className="flex items-center justify-center py-20 text-gray-300 text-sm">
                      No hay criterios para este filtro.
                    </div>
                  ) : (
                    criteriosFiltrados.map((criterio, ci) => {
                      const entregables = entregablesMap[criterio.id] ?? [];
                      const resp = responsableMap[criterio.id] ?? { area_id: "", responsable_id: "" };
                      const cargosDelArea = responsables.filter((r) => r.area_id === resp.area_id);

                      return (
                        <div
                          key={criterio.id}
                          className={`flex ${ci !== 0 ? "border-t border-gray-200" : ""} ${ci % 2 !== 0 ? "bg-gray-50/40" : "bg-white"}`}
                        >
                          {/* Col 1 — Criterio (spans all entregable rows naturally) */}
                          <div className="w-[5%] shrink-0 border-r border-gray-100 px-2 py-4 flex flex-col justify-between items-center">
                            <span className="font-mono text-xs font-bold text-gray-900 text-center break-all">{criterio.codigo_criterio}</span>
                            <button
                              onClick={() => addEntregableRow(criterio.id)}
                              className="flex items-center justify-center p-1 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-md transition-colors mt-3"
                              title="Añadir entregable"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>

                          {/* Col 2 — Área (spans all entregable rows) */}
                          <div className="w-[20%] shrink-0 border-r border-gray-100 px-2 py-4 flex items-start">
                            <select
                              value={resp.area_id}
                              onChange={(e) => updateResponsable(criterio.id, { area_id: e.target.value, responsable_id: "" })}
                              className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300 cursor-pointer"
                            >
                              <option value="">— Área —</option>
                              {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                            </select>
                          </div>

                          {/* Col 3 — Cargo (spans all entregable rows) */}
                          <div className="w-[25%] shrink-0 border-r border-gray-100 px-2 py-4 flex items-start">
                            <select
                              value={resp.responsable_id}
                              disabled={!resp.area_id}
                              onChange={(e) => updateResponsable(criterio.id, { responsable_id: e.target.value })}
                              className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300 cursor-pointer"
                            >
                              <option value="">— Cargo —</option>
                              {cargosDelArea.map((r) => <option key={r.id} value={r.id}>{r.cargo}</option>)}
                            </select>
                          </div>

                          {/* Cols 4-6 — Entregable rows stacked vertically */}
                          <div className="w-[50%] shrink-0 flex flex-col min-w-0">
                            {entregables.map((row, idx) => (
                              <div
                                key={idx}
                                className={`flex items-stretch min-h-[68px] ${idx !== 0 ? "border-t border-gray-100" : ""}`}
                              >
                                {/* Entregable description */}
                                <div className="w-[80%] shrink-0 px-2 py-3 border-r border-gray-100 flex items-center">
                                  <textarea
                                    value={row.descripcion}
                                    onChange={(e) => updateEntregableRow(criterio.id, idx, { descripcion: e.target.value })}
                                    placeholder="Descripción del entregable..."
                                    rows={2}
                                    className="w-full text-sm text-gray-700 bg-transparent resize-none focus:outline-none placeholder-gray-300 leading-relaxed"
                                  />
                                </div>
                                {/* Tipo */}
                                <div className="w-[10%] shrink-0 px-1 py-3 border-r border-gray-100 flex items-center">
                                  <select
                                    value={row.tipo_entregable}
                                    onChange={(e) => updateEntregableRow(criterio.id, idx, { tipo_entregable: e.target.value })}
                                    className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-md px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300 cursor-pointer text-center"
                                  >
                                    <option value="">—</option>
                                    {TIPO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label.slice(0,3)}.</option>)}
                                  </select>
                                </div>
                                {/* Actions */}
                                <div className="w-[10%] shrink-0 px-2 py-3 flex items-center justify-center">
                                  <button
                                    onClick={() => saveEntregable(criterio.id, idx)}
                                    disabled={row.isSaving}
                                    className="flex items-center justify-center w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                                    title={row.id ? "Actualizar" : "Guardar"}
                                  >
                                    {row.isSaving ? (
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
                            ))}
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
        <Link href="/acreditacion" className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 text-sm transition-colors font-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a Acreditación
        </Link>
      </div>
    </div>
  );
}
