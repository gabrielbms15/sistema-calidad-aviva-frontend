"use client";

import { useState, useMemo } from "react";

/* ─── Types ──────────────────────────────────────────────── */
export type EstadoKey = "cumplido" | "parcial" | "no_cumplido" | "sin_estado";

export interface EntregableResumen {
  estado: EstadoKey;
}

export interface ResponsableRow {
  responsable_id: string;
  nombre: string;
  apellido: string;
  cargo: string;
  area_nombre: string;
  entregables: EntregableResumen[];
}

export interface ResponsablesTableProps {
  procesos: { id: string; label: string }[];
  dataByProceso: Record<string, ResponsableRow[]>;
}

/* ─── Colors ─────────────────────────────────────────────── */
const STATUS_COLORS: Record<EstadoKey, { bar: string; text: string; label: string }> = {
  cumplido:    { bar: "#22c55e", text: "text-emerald-700", label: "Cumplido"    },
  parcial:     { bar: "#f59e0b", text: "text-amber-600",   label: "Parcial"     },
  no_cumplido: { bar: "#ef4444", text: "text-red-600",     label: "No cumplido" },
  sin_estado:  { bar: "#d1d5db", text: "text-gray-400",   label: "Sin estado"  },
};

const BAR_KEYS: EstadoKey[] = ["cumplido", "parcial", "no_cumplido", "sin_estado"];

/* ─── Mini stacked bar (total column only) ───────────────── */
function StackedMiniBar({ counts, total }: { counts: Record<EstadoKey, number>; total: number }) {
  if (total === 0) return null;
  return (
    <div className="flex h-2 w-full rounded-full overflow-hidden mt-1.5 bg-gray-100">
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

function sortRows(rows: ResponsableRow[], key: SortKey, dir: SortDir): ResponsableRow[] {
  return [...rows].sort((a, b) => {
    const count = (r: ResponsableRow, k: EstadoKey) =>
      r.entregables.filter((e) => e.estado === k).length;

    let va: number | string;
    let vb: number | string;

    if (key === "nombre") {
      va = `${a.apellido} ${a.nombre}`.toLowerCase();
      vb = `${b.apellido} ${b.nombre}`.toLowerCase();
    } else if (key === "total") {
      va = a.entregables.length;
      vb = b.entregables.length;
    } else {
      va = count(a, key as EstadoKey);
      vb = count(b, key as EstadoKey);
    }

    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

/* ─── Sortable header cell ───────────────────────────────── */
function Th({
  label,
  sortKey,
  current,
  dir,
  onSort,
  className = "",
  center = false,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
  center?: boolean;
}) {
  const active = current === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`px-4 py-3 cursor-pointer select-none group transition-colors hover:bg-white/5 ${className}`}
    >
      <div className={`flex items-center gap-1 ${center ? "justify-center" : ""}`}>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
            active ? "text-white/95" : "text-white/45 group-hover:text-white/70"
          }`}
        >
          {label}
        </span>
        <svg
          className={`w-3 h-3 shrink-0 transition-colors ${
            active ? "text-white/60" : "text-white/15 group-hover:text-white/35"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {active && dir === "asc" ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          )}
        </svg>
      </div>
    </th>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function ResponsablesTable({ procesos, dataByProceso }: ResponsablesTableProps) {
  const [selectedProcesoId, setSelectedProcesoId] = useState<string>(procesos[0]?.id ?? "");
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("nombre");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const allRows = useMemo(() => dataByProceso[selectedProcesoId] ?? [], [selectedProcesoId, dataByProceso]);

  /* Areas that have ≥1 responsable with criterios */
  const areas = useMemo(() => {
    const s = new Set(allRows.map((r) => r.area_nombre));
    return Array.from(s).sort();
  }, [allRows]);

  /* When proceso changes, reset area if it no longer exists */
  const effectiveArea = areas.includes(selectedArea) ? selectedArea : "";

  /* Rows for the selected area */
  const filteredRows = useMemo(() => {
    const base = effectiveArea
      ? allRows.filter((r) => r.area_nombre === effectiveArea)
      : allRows;
    return sortRows(base, sortKey, sortDir);
  }, [allRows, effectiveArea, sortKey, sortDir]);

  /* Grand totals across ALL rows in the process (for summary pills) */
  const totals = useMemo(() => {
    const acc: Record<EstadoKey, number> = { cumplido: 0, parcial: 0, no_cumplido: 0, sin_estado: 0 };
    for (const row of filteredRows) {
      for (const e of row.entregables) acc[e.estado] += 1;
    }
    return acc;
  }, [filteredRows]);
  const grandTotal = filteredRows.reduce((s, r) => s + r.entregables.length, 0);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function handleAreaClick(area: string) {
    setSelectedArea((prev) => (prev === area ? "" : area));
  }

  return (
    <div className="flex flex-col font-sans">
      <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col ring-1 ring-black/[0.02]">

        {/* ── Header bar ── */}
        <div className="bg-[#1C1C1E]/95 backdrop-blur-xl px-8 py-4 border-b border-white/10 shrink-0 flex items-center justify-between gap-4 flex-wrap rounded-t-[2rem]">
          <div>
            <h2 className="text-white/95 font-bold text-[15px] tracking-tight">
              Entregables por Responsable
            </h2>
            <p className="text-white/40 text-[11px] mt-0.5">
              Responsables con criterios asignados · estado de entregables por proceso
            </p>
          </div>

          {/* Proceso selector */}
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">Proceso:</span>
            <div className="relative">
              <select
                id="responsables-proceso-selector"
                value={selectedProcesoId}
                onChange={(e) => { setSelectedProcesoId(e.target.value); setSelectedArea(""); }}
                className="appearance-none bg-white/[0.08] hover:bg-white/[0.12] text-white/95 text-[13px] rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer font-medium border border-white/10 min-w-[200px] transition-all shadow-sm"
              >
                {procesos.map((p) => (
                  <option key={p.id} value={p.id} className="text-gray-900 bg-white">{p.label}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* ── Area selector tabs ── */}
        <div className="px-8 py-4 border-b border-gray-100 flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-1 shrink-0">Área:</span>

          {/* "Todas" button */}
          <button
            onClick={() => setSelectedArea("")}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 border ${
              effectiveArea === ""
                ? "bg-[#2d3748] text-white border-[#2d3748] shadow-sm"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Todas
          </button>

          {areas.map((area) => (
            <button
              key={area}
              onClick={() => handleAreaClick(area)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 border ${
                effectiveArea === area
                  ? "bg-[#2d3748] text-white border-[#2d3748] shadow-sm"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {area}
            </button>
          ))}
        </div>

        {/* ── Summary pills ── */}
        <div className="px-8 pt-4 pb-2 flex flex-wrap gap-3 items-center">
          {(["cumplido", "parcial", "no_cumplido", "sin_estado"] as EstadoKey[]).map((k) => (
            <div
              key={k}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-gray-50 border border-gray-100"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: STATUS_COLORS[k].bar }}
              />
              <span className="text-gray-500">{STATUS_COLORS[k].label}</span>
              <span className="font-black tabular-nums text-gray-700">{totals[k]}</span>
            </div>
          ))}
          <div className="ml-auto text-[11px] text-gray-400">
            <span className="font-bold text-gray-600 tabular-nums">{filteredRows.length}</span>
            {" responsables · "}
            <span className="font-bold text-gray-600 tabular-nums">{grandTotal}</span>
            {" entregables"}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="px-6 pb-6 pt-2">
          {filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-300">
              <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
              </svg>
              <p className="text-sm">Sin responsables para este proceso.</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#2d3748]">
                    <Th label="Responsable / Cargo" sortKey="nombre" current={sortKey} dir={sortDir} onSort={handleSort} className="w-[32%] rounded-tl-2xl" />
                    <Th label="Cumplido" sortKey="cumplido" current={sortKey} dir={sortDir} onSort={handleSort} className="w-[12%]" center />
                    <Th label="Parcial" sortKey="parcial" current={sortKey} dir={sortDir} onSort={handleSort} className="w-[10%]" center />
                    <Th label="No cumplido" sortKey="no_cumplido" current={sortKey} dir={sortDir} onSort={handleSort} className="w-[12%]" center />
                    <Th label="Sin estado" sortKey="sin_estado" current={sortKey} dir={sortDir} onSort={handleSort} className="w-[10%]" center />
                    <Th label="Total" sortKey="total" current={sortKey} dir={sortDir} onSort={handleSort} className="w-[24%] rounded-tr-2xl" center />
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, i) => {
                    const counts: Record<EstadoKey, number> = {
                      cumplido:    row.entregables.filter((e) => e.estado === "cumplido").length,
                      parcial:     row.entregables.filter((e) => e.estado === "parcial").length,
                      no_cumplido: row.entregables.filter((e) => e.estado === "no_cumplido").length,
                      sin_estado:  row.entregables.filter((e) => e.estado === "sin_estado").length,
                    };
                    const total = row.entregables.length;
                    const rowBg = i % 2 === 0 ? "bg-white" : "bg-gray-50/60";

                    return (
                      <tr
                        key={row.responsable_id}
                        className={`border-t border-gray-100 transition-colors hover:bg-blue-50/30 ${rowBg}`}
                      >
                        {/* Responsable + Cargo */}
                        <td className="px-4 py-3 border-r border-gray-100">
                          <p className="text-[13px] font-semibold text-gray-800 leading-snug">
                            {row.nombre} {row.apellido}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{row.cargo}</p>
                        </td>

                        {/* Cumplido */}
                        <td className="px-4 py-3 text-center border-r border-gray-100">
                          {counts.cumplido > 0 ? (
                            <span className="text-[15px] font-black tabular-nums text-emerald-600">
                              {counts.cumplido}
                            </span>
                          ) : (
                            <span className="text-gray-200 text-sm font-medium">—</span>
                          )}
                        </td>

                        {/* Parcial */}
                        <td className="px-4 py-3 text-center border-r border-gray-100">
                          {counts.parcial > 0 ? (
                            <span className="text-[15px] font-black tabular-nums text-amber-500">
                              {counts.parcial}
                            </span>
                          ) : (
                            <span className="text-gray-200 text-sm font-medium">—</span>
                          )}
                        </td>

                        {/* No cumplido */}
                        <td className="px-4 py-3 text-center border-r border-gray-100">
                          {counts.no_cumplido > 0 ? (
                            <span className="text-[15px] font-black tabular-nums text-red-500">
                              {counts.no_cumplido}
                            </span>
                          ) : (
                            <span className="text-gray-200 text-sm font-medium">—</span>
                          )}
                        </td>

                        {/* Sin estado */}
                        <td className="px-4 py-3 text-center border-r border-gray-100">
                          {counts.sin_estado > 0 ? (
                            <span className="text-[15px] font-black tabular-nums text-gray-400">
                              {counts.sin_estado}
                            </span>
                          ) : (
                            <span className="text-gray-200 text-sm font-medium">—</span>
                          )}
                        </td>

                        {/* Total + stacked bar */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-[15px] font-black tabular-nums text-gray-700 shrink-0 w-7 text-right">
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
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td className="px-4 py-3 border-r border-gray-200">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Total general
                      </span>
                    </td>
                    {(["cumplido", "parcial", "no_cumplido", "sin_estado"] as EstadoKey[]).map((k) => (
                      <td key={k} className="px-4 py-3 text-center border-r border-gray-200">
                        <span
                          className={`text-[15px] font-black tabular-nums ${
                            totals[k] > 0 ? STATUS_COLORS[k].text : "text-gray-200"
                          }`}
                        >
                          {totals[k] > 0 ? totals[k] : "—"}
                        </span>
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-[15px] font-black tabular-nums text-gray-700 shrink-0 w-7 text-right">
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
