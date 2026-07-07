"use client";

import { useState, useMemo, useEffect } from "react";
import {
  EstadoKey,
  CriterioResumen,
  EntregableResumen,
  ResponsableRow,
} from "./ResponsablesTable";

/* ─── Props ──────────────────────────────────────────────── */
export interface CriteriosResponsablesTableProps {
  procesos: { id: string; label: string }[];
  dataByProceso: Record<string, ResponsableRow[]>;
  selectedProcesoId: string;
}

/* ─── Colors (same palette as ResponsablesTable) ─────────── */
const STATUS_COLORS: Record<EstadoKey, { bar: string; text: string; label: string }> = {
  cumplido:    { bar: "#2D778B", text: "text-emerald-700", label: "Cumplido"    },
  parcial:     { bar: "#FFF0C5", text: "text-amber-600",   label: "Parcial"     },
  no_cumplido: { bar: "#fecaca", text: "text-red-600",     label: "No cumplido" },
  sin_estado:  { bar: "#d1d5db", text: "text-gray-400",   label: "Sin estado"  },
};

const BAR_KEYS: EstadoKey[] = ["cumplido", "parcial", "no_cumplido", "sin_estado"];

function toTitleCase(str: string) {
  if (!str) return "";
  return str.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─── Derivation logic (same as CriteriosChart) ─────────── */
/**
 * Derives the status of a criterio from its entregables:
 *  - Al menos uno "cumplido"                                  → cumplido
 *  - Sin cumplido, al menos uno "parcial"                     → parcial
 *  - Sin cumplido ni parcial, TODOS con estado asignado son
 *    "no_cumplido" (sin ningún sin_estado mezclado)           → no_cumplido
 *  - Cualquier otro caso                                      → sin_estado
 */
function deriveCriterioStatus(entregables: EntregableResumen[]): EstadoKey {
  if (entregables.length === 0) return "sin_estado";

  let hasCumplido   = false;
  let hasParcial    = false;
  let hasNoCumplido = false;
  let allSinEstado  = true;

  for (const e of entregables) {
    if (e.estado === "cumplido")         { hasCumplido   = true; allSinEstado = false; }
    else if (e.estado === "parcial")     { hasParcial    = true; allSinEstado = false; }
    else if (e.estado === "no_cumplido") { hasNoCumplido = true; allSinEstado = false; }
    // sin_estado: no contribution
  }

  if (allSinEstado) return "sin_estado";
  if (hasCumplido)  return "cumplido";
  if (hasParcial)   return "parcial";

  // no_cumplido solo si todos los entregables tienen estado asignado (sin sin_estado mezclado)
  const todosAsignados = entregables.every((e) => e.estado !== "sin_estado");
  if (hasNoCumplido && todosAsignados) return "no_cumplido";

  return "sin_estado";
}

/* ─── Mini stacked bar ───────────────────────────────────── */
function StackedMiniBar({ counts, total }: { counts: Record<EstadoKey, number>; total: number }) {
  if (total === 0) return null;
  return (
    <div className="flex h-2 w-full rounded-full overflow-hidden mt-1 bg-gray-100">
      {BAR_KEYS.map((k) =>
        counts[k] > 0 ? (
          <div
            key={k}
            title={`${STATUS_COLORS[k].label}: ${counts[k]}`}
            className="h-full transition-all duration-500"
            style={{
              width: `${(counts[k] / total) * 100}%`,
              backgroundColor: STATUS_COLORS[k].bar,
            }}
          />
        ) : null
      )}
    </div>
  );
}

/* ─── Sort helpers ───────────────────────────────────────── */
type SortKey = "nombre" | "total" | EstadoKey;
type SortDir = "asc" | "desc";

/** Counts derived criterion statuses for a row */
function getCriteriosCounts(criterios: CriterioResumen[]): Record<EstadoKey, number> {
  const acc: Record<EstadoKey, number> = { cumplido: 0, parcial: 0, no_cumplido: 0, sin_estado: 0 };
  for (const cr of criterios) {
    acc[deriveCriterioStatus(cr.entregables)]++;
  }
  return acc;
}

function sortRows(rows: ResponsableRow[], key: SortKey, dir: SortDir): ResponsableRow[] {
  return [...rows].sort((a, b) => {
    let va: number | string;
    let vb: number | string;

    if (key === "nombre") {
      va = `${a.apellido} ${a.nombre}`.toLowerCase();
      vb = `${b.apellido} ${b.nombre}`.toLowerCase();
    } else if (key === "total") {
      va = a.criterios.length;
      vb = b.criterios.length;
    } else {
      va = getCriteriosCounts(a.criterios)[key as EstadoKey];
      vb = getCriteriosCounts(b.criterios)[key as EstadoKey];
    }

    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

/* ─── Main Component ─────────────────────────────────────── */
export default function CriteriosResponsablesTable({
  procesos,
  dataByProceso,
  selectedProcesoId,
}: CriteriosResponsablesTableProps) {
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [sortKey, setSortKey]           = useState<SortKey>("nombre");
  const [sortDir, setSortDir]           = useState<SortDir>("asc");

  useEffect(() => {
    setSelectedArea("");
  }, [selectedProcesoId]);

  const allRows = useMemo(
    () => dataByProceso[selectedProcesoId] ?? [],
    [selectedProcesoId, dataByProceso]
  );

  const areas = useMemo(() => {
    const s = new Set(allRows.map((r) => r.area_nombre));
    return Array.from(s).sort();
  }, [allRows]);

  const effectiveArea = areas.includes(selectedArea) ? selectedArea : "";

  const filteredRows = useMemo(() => {
    const base = effectiveArea
      ? allRows.filter((r) => r.area_nombre === effectiveArea)
      : allRows;
    return sortRows(base, sortKey, sortDir);
  }, [allRows, effectiveArea, sortKey, sortDir]);

  /* Grand totals for the footer */
  const totals = useMemo(() => {
    const acc: Record<EstadoKey, number> = { cumplido: 0, parcial: 0, no_cumplido: 0, sin_estado: 0 };
    for (const row of filteredRows) {
      const counts = getCriteriosCounts(row.criterios);
      for (const k of BAR_KEYS) acc[k] += counts[k];
    }
    return acc;
  }, [filteredRows]);

  const grandTotal = filteredRows.reduce((s, r) => s + r.criterios.length, 0);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  return (
    <div className="flex flex-col font-avenir w-full lg:flex-1">
      <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col ring-1 ring-black/[0.02]">

        {/* Card header */}
        <div className="px-8 pt-5 pb-3 border-b border-black/[0.06] shrink-0 flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-[#000000] font-avenir-demi text-base font-bold tracking-tight">
            Criterios por responsable y/o área
          </h2>

          {/* Área selector */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-black/60 text-[9px] font-avenir font-normal">Área:</span>
            <div className="relative">
              <select
                id="criterios-responsables-area-selector"
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="appearance-none bg-black/[0.04] hover:bg-black/[0.08] text-black text-[9px] font-avenir rounded-md pl-2 pr-6 py-[5px] focus:outline-none focus:ring-1 focus:ring-black/10 cursor-pointer font-medium border border-black/[0.08] min-w-[120px] transition-all shadow-sm"
              >
                <option value="" className="text-gray-900 bg-white text-[9px]">Todas</option>
                {areas.map((area) => (
                  <option key={area} value={area} className="text-gray-900 bg-white text-[9px]">{area}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-black/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="px-6 pb-6 pt-2">
          {filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-300">
              <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
              </svg>
              <p className="text-sm">Sin responsables para este proceso.</p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="w-full text-sm border-collapse table-fixed border-t border-b border-gray-200">
                <thead>
                  <tr className="bg-[#2D778B] font-avenir text-white select-none leading-tight">
                    <th className="px-3 py-1.5 text-left w-[40%] font-avenir font-bold text-[11px] border-r border-white/20">Responsable / cargo</th>
                    <th
                      className="px-0.5 py-1.5 text-center w-[10%] font-avenir font-bold text-[11px] border-r border-white/20 cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => handleSort("cumplido")}
                    >
                      Cumplido{sortKey === "cumplido" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </th>
                    <th
                      className="px-0.5 py-1.5 text-center w-[10%] font-avenir font-bold text-[11px] border-r border-white/20 cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => handleSort("parcial")}
                    >
                      Parcial{sortKey === "parcial" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </th>
                    <th
                      className="px-0.5 py-1.5 text-center w-[10%] font-avenir font-bold text-[11px] border-r border-white/20 cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => handleSort("no_cumplido")}
                    >
                      No cumplido{sortKey === "no_cumplido" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </th>
                    <th
                      className="px-0.5 py-1.5 text-center w-[10%] font-avenir font-bold text-[11px] border-r border-white/20 cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => handleSort("sin_estado")}
                    >
                      Sin estado{sortKey === "sin_estado" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </th>
                    <th
                      className="px-2 py-1.5 text-center w-[20%] font-avenir font-bold text-[11px] cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => handleSort("total")}
                    >
                      Total{sortKey === "total" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, i) => {
                    const counts = getCriteriosCounts(row.criterios);
                    const total  = row.criterios.length;
                    const rowBg  = i % 2 === 0 ? "bg-white" : "bg-[#2D778B]/[0.06]";

                    return (
                      <tr
                        key={row.responsable_id}
                        className={`border-t border-gray-100 transition-colors hover:bg-blue-50/30 ${rowBg}`}
                      >
                        {/* Responsable + Cargo */}
                        <td className="px-3 py-1.5 border-r border-gray-100">
                          <p className="text-[11px] font-semibold text-gray-800 leading-snug">
                            {toTitleCase(row.nombre)} {toTitleCase(row.apellido)}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{toTitleCase(row.cargo)}</p>
                        </td>

                        {/* Cumplido */}
                        <td className="px-1 py-1.5 text-center border-r border-gray-100">
                          {counts.cumplido > 0 ? (
                            <span className="text-[12px] font-bold tabular-nums text-emerald-600">{counts.cumplido}</span>
                          ) : (
                            <span className="text-gray-200 text-[12px] font-medium">—</span>
                          )}
                        </td>

                        {/* Parcial */}
                        <td className="px-1 py-1.5 text-center border-r border-gray-100">
                          {counts.parcial > 0 ? (
                            <span className="text-[12px] font-bold tabular-nums text-amber-500">{counts.parcial}</span>
                          ) : (
                            <span className="text-gray-200 text-[12px] font-medium">—</span>
                          )}
                        </td>

                        {/* No cumplido */}
                        <td className="px-1 py-1.5 text-center border-r border-gray-100">
                          {counts.no_cumplido > 0 ? (
                            <span className="text-[12px] font-bold tabular-nums text-red-500">{counts.no_cumplido}</span>
                          ) : (
                            <span className="text-gray-200 text-[12px] font-medium">—</span>
                          )}
                        </td>

                        {/* Sin estado */}
                        <td className="px-1 py-1.5 text-center border-r border-gray-100">
                          {counts.sin_estado > 0 ? (
                            <span className="text-[12px] font-bold tabular-nums text-gray-400">{counts.sin_estado}</span>
                          ) : (
                            <span className="text-gray-200 text-[12px] font-medium">—</span>
                          )}
                        </td>

                        {/* Total + stacked bar */}
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-bold tabular-nums text-gray-700 shrink-0 w-7 text-right">
                              {total}
                            </span>
                            <div className="flex-1 min-w-0">
                              <StackedMiniBar counts={counts} total={total} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Footer totals row */}
                  <tr className="bg-[#2D778B] text-[#ffffff] border-t border-black/10">
                    <td className="px-3 py-1.5 border-r border-white/20">
                      <span className="text-[11px] font-bold text-[#ffffff] uppercase tracking-wider">
                        Total general
                      </span>
                    </td>
                    {(["cumplido", "parcial", "no_cumplido", "sin_estado"] as EstadoKey[]).map((k) => (
                      <td key={k} className="px-1 py-1.5 text-center border-r border-white/20">
                        <span className="text-[12px] font-bold tabular-nums text-[#ffffff]">
                          {totals[k] > 0 ? totals[k] : "—"}
                        </span>
                      </td>
                    ))}
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold tabular-nums text-[#ffffff] shrink-0 w-7 text-right">
                          {grandTotal}
                        </span>
                        <div className="flex-1 min-w-0">
                          <StackedMiniBar counts={totals} total={grandTotal} />
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
