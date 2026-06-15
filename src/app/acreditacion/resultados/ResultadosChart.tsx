"use client";

import { useState, useMemo } from "react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";

/* ─── Types ──────────────────────────────────────────────── */
export interface ProcesoOption {
  id: string;
  label: string;
}

export interface CriterioRaw {
  codigo_criterio: string;
  tipo: "estructura" | "proceso" | "resultado";
  puntaje_propuesto: number | null;
}

export interface EstandarData {
  id: string;
  codigo: string;
  criterios: CriterioRaw[];
}

export interface MacroprocesoData {
  id: string;
  orden: number;
  codigo: string;
  nombre: string;
  tipo: string;
  peso: number;
  estandares: EstandarData[];
}

interface Props {
  procesos: ProcesoOption[];
  dataByProceso: Record<string, MacroprocesoData[]>;
  selectedProcesoId: string;
}

/* ─── Exclusions (same as autoevaluacion module) ─────────── */
const EXCLUDED_CRITERIOS = new Set([
  "DIR1-4", "DIR1-5", "DIR1-6", "DIR1-8", "GRH4-1", "MRA8-1", "MRA8-2", "MRA8-3",
  "ATA1-3", "ATA3-2", "ATA3-3", "ATA3-4", "ATA3-5", "ATA3-6", "RCR4-1", "RCR4-2",
  "RCR4-3", "GMD3-4", "GMD3-5", "MRS1-1", "MRS1-2", "MRS1-3", "MRS2-1", "MRS2-2", "ATH6-1", "ATH6-2",
]);
const EXCLUDED_MACROS = new Set([8, 12]);

/* ─── Constants ──────────────────────────────────────────── */
const COLOR_AVIVA_1 = "#2A687E";
const COLOR_AVIVA_2 = "#66AEC2";
const PESO: Record<string, number> = { estructura: 45, proceso: 36, resultado: 19 };

/* ─── Helpers ────────────────────────────────────────────── */
function getCriteriosActivos(criterios: CriterioRaw[]) {
  return criterios.filter((c) => !EXCLUDED_CRITERIOS.has(c.codigo_criterio));
}

function calcAvance(criterios: CriterioRaw[]): number {
  const activos = getCriteriosActivos(criterios);
  const groups: Record<string, { score: number; n: number }> = {};
  for (const c of activos) {
    if (!groups[c.tipo]) groups[c.tipo] = { score: 0, n: 0 };
    groups[c.tipo].n += 1;
    groups[c.tipo].score += (c.puntaje_propuesto ?? 0) / 2;
  }
  const present = Object.keys(groups).filter((k) => groups[k].n > 0);
  if (!present.length) return 0;
  const sumPesos = present.reduce((s, k) => s + (PESO[k] ?? 0), 0);
  if (!sumPesos) return 0;
  return present.reduce((avance, k) => {
    return avance + ((PESO[k] ?? 0) / sumPesos) * 100 * (groups[k].score / groups[k].n);
  }, 0);
}



/* ─── Sub-components ─────────────────────────────────────── */

function ChartView({ rows }: { rows: (MacroprocesoData & { avance: number })[] }) {
  return (
    <>
      <OverlayScrollbarsComponent
        element="div"
        options={{ scrollbars: { autoHide: "scroll", theme: "os-theme-light" } }}
        defer
        className="px-8 py-6"
      >
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="space-y-[4px]">
              {rows.map((row, idx) => {
                const pct = row.avance;
                return (
                  <div key={row.id} className="group flex items-center gap-4 py-[1px] px-3 rounded-xl hover:bg-black/[0.02] transition-all duration-200 border border-transparent hover:border-black/[0.04]">
                    {/* Label */}
                    <div className="w-[40%] shrink-0 flex items-center justify-end gap-1.5 pr-2">
                      <span className="text-[11px] font-normal text-[#000000] font-avenir shrink-0">
                        {row.orden}.
                      </span>
                      <span
                        className="text-[13px] font-normal text-[#000000] truncate font-avenir text-right"
                        title={row.nombre}
                      >
                        {row.nombre}
                      </span>
                    </div>
                    <div className="flex-1 relative h-4 bg-black/[0.03] rounded overflow-hidden shadow-inner ring-1 ring-inset ring-black/[0.06]">
                      {[25, 50, 75].map((v) => (
                        <div key={v} className="absolute top-0 bottom-0 w-px bg-white/40" style={{ left: `${v}%` }} />
                      ))}
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-[#006A8F] z-10 transition-all duration-700 ease-out flex items-center justify-end pr-2.5 overflow-hidden shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)]"
                        style={{ width: `${pct}%`, minWidth: pct > 0 ? "40px" : "0", transitionDelay: `${idx * 40}ms` }}
                      >
                        {pct > 0 && (
                          <span className="text-[9px] font-avenir-demi text-white/95 tracking-wide z-20 drop-shadow-md">
                            {pct.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center mt-3" style={{ paddingLeft: "calc(40% + 1rem)", paddingRight: "12px" }}>
              <div className="flex-1 flex justify-between">
                {[0, 25, 50, 75, 100].map((v) => (
                  <span key={v} className="text-[10px] text-gray-400 font-mono font-medium">{v}%</span>
                ))}
              </div>
            </div>
          </>
        )}
      </OverlayScrollbarsComponent>
    </>
  );
}

function TableView({ rows }: { rows: MacroprocesoData[] }) {
  if (rows.length === 0) return (
    <OverlayScrollbarsComponent element="div" options={{ scrollbars: { autoHide: "scroll", theme: "os-theme-light" } }} defer className="p-8">
      <EmptyState />
    </OverlayScrollbarsComponent>
  );

  return (
    <OverlayScrollbarsComponent
      element="div"
      options={{ scrollbars: { autoHide: "scroll", theme: "os-theme-light" } }}
      defer
      className="w-full"
    >
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-20">
          <tr className="bg-white text-[10px] font-bold uppercase tracking-wider text-gray-500">
            <th colSpan={3} className="border-b border-gray-100"></th>
            <th colSpan={4} className="px-2 py-2 text-center border-b border-gray-200 bg-gray-100/50 border-r border-gray-200">
              N° total de criterios
            </th>
            <th colSpan={4} className="px-2 py-2 text-center border-b border-gray-200 bg-blue-50/50">
              Puntaje Evaluación
            </th>
          </tr>
          <tr className="bg-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3 text-left border-b border-gray-200 w-[24%]">Macroproceso</th>
            <th className="px-4 py-3 text-left border-b border-gray-200 w-[8%]">Estándar</th>
            <th className="px-4 py-3 text-left border-b border-gray-200">Criterios a evaluar</th>
            <th className="px-2 py-3 text-center border-b border-gray-200 w-[4%]">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-700 font-black text-[10px]">T</span>
            </th>
            <th className="px-2 py-3 text-center border-b border-gray-200 w-[4%]">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 text-violet-700 font-black text-[10px]">E</span>
            </th>
            <th className="px-2 py-3 text-center border-b border-gray-200 w-[4%]">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-700 font-black text-[10px]">P</span>
            </th>
            <th className="px-2 py-3 text-center border-b border-gray-200 w-[4%] border-r border-gray-200">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-black text-[10px]">R</span>
            </th>
            <th className="px-2 py-3 text-center border-b border-gray-200 w-[4%] bg-blue-50/30">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-700 font-black text-[10px]">T</span>
            </th>
            <th className="px-2 py-3 text-center border-b border-gray-200 w-[4%] bg-blue-50/30">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 text-violet-700 font-black text-[10px]">E</span>
            </th>
            <th className="px-2 py-3 text-center border-b border-gray-200 w-[4%] bg-blue-50/30">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-700 font-black text-[10px]">P</span>
            </th>
            <th className="px-2 py-3 text-center border-b border-gray-200 w-[4%] bg-blue-50/30">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-black text-[10px]">R</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows
            .map((macro) => {
              const estandaresConCriterios = macro.estandares
                .map((est) => ({
                  ...est,
                  activos: getCriteriosActivos(est.criterios),
                }))
                .filter((est) => est.activos.length > 0);
              return { macro, estandaresConCriterios };
            })
            .filter((item) => item.estandaresConCriterios.length > 0)
            .map(({ macro, estandaresConCriterios }, macroIdx) => {
              const rowBg = macroIdx % 2 === 0 ? "bg-white" : "bg-gray-100";

              return estandaresConCriterios.map((est, estIdx) => {
                const countE = est.activos.filter((c) => c.tipo === "estructura").length;
                const countP = est.activos.filter((c) => c.tipo === "proceso").length;
                const countR = est.activos.filter((c) => c.tipo === "resultado").length;
                const countT = est.activos.length;

                const scoreE = est.activos.filter((c) => c.tipo === "estructura").reduce((sum, c) => sum + (c.puntaje_propuesto ?? 0), 0);
                const scoreP = est.activos.filter((c) => c.tipo === "proceso").reduce((sum, c) => sum + (c.puntaje_propuesto ?? 0), 0);
                const scoreR = est.activos.filter((c) => c.tipo === "resultado").reduce((sum, c) => sum + (c.puntaje_propuesto ?? 0), 0);
                const scoreT = countT * 2;

                return (
                  <tr
                    key={`${macro.id}-${est.id}`}
                    className={`border-b border-gray-100 transition-colors hover:bg-blue-50/40 ${rowBg}`}
                  >
                    {/* Macroproceso — only on first estandar row */}
                    {estIdx === 0 ? (
                      <td
                        className="px-4 py-3 align-top border-r border-gray-100"
                        rowSpan={estandaresConCriterios.length}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-[11px] font-bold text-[#3d537e]/60 font-mono shrink-0 pt-0.5">
                            {macro.orden}.
                          </span>
                          <span className="text-xs font-medium text-gray-700 leading-relaxed">
                            {macro.nombre}
                          </span>
                        </div>
                      </td>
                    ) : null}

                    {/* Estándar */}
                    <td className="px-4 py-3 align-top border-r border-gray-100">
                      <span className="font-mono text-xs font-bold text-gray-600 whitespace-nowrap">
                        {est.codigo}
                      </span>
                    </td>

                    {/* Criterios */}
                    <td className="px-4 py-3 align-top border-r border-gray-100">
                      <div className="flex flex-wrap gap-1">
                        {est.activos.map((c) => (
                          <span
                            key={c.codigo_criterio}
                            className={`inline-block font-mono text-[10px] px-1.5 py-0.5 rounded font-semibold ${c.tipo === "estructura"
                              ? "bg-violet-50 text-violet-700"
                              : c.tipo === "proceso"
                                ? "bg-sky-50 text-sky-700"
                                : "bg-amber-50 text-amber-700"
                              }`}
                          >
                            {c.codigo_criterio}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* T */}
                    <td className="px-2 py-3 text-center align-top">
                      <span className={`text-sm font-bold tabular-nums ${countT > 0 ? "text-gray-800" : "text-gray-300"}`}>
                        {countT > 0 ? countT : "—"}
                      </span>
                    </td>

                    {/* E */}
                    <td className="px-2 py-3 text-center align-top">
                      <span className={`text-sm font-bold tabular-nums ${countE > 0 ? "text-violet-700" : "text-gray-300"}`}>
                        {countE > 0 ? countE : "—"}
                      </span>
                    </td>

                    {/* P */}
                    <td className="px-2 py-3 text-center align-top">
                      <span className={`text-sm font-bold tabular-nums ${countP > 0 ? "text-sky-700" : "text-gray-300"}`}>
                        {countP > 0 ? countP : "—"}
                      </span>
                    </td>

                    {/* R */}
                    <td className="px-2 py-3 text-center align-top border-r border-gray-100">
                      <span className={`text-sm font-bold tabular-nums ${countR > 0 ? "text-amber-700" : "text-gray-300"}`}>
                        {countR > 0 ? countR : "—"}
                      </span>
                    </td>

                    {/* Puntaje Evaluación */}
                    {/* Score T */}
                    <td className="px-2 py-3 text-center align-top bg-blue-50/10">
                      <span className={`text-sm font-bold tabular-nums ${countT > 0 ? "text-gray-800" : "text-gray-300"}`}>
                        {countT > 0 ? scoreT : "—"}
                      </span>
                    </td>

                    {/* Score E */}
                    <td className="px-2 py-3 text-center align-top bg-blue-50/10">
                      <span className={`text-sm font-bold tabular-nums ${countE > 0 ? "text-violet-700" : "text-gray-300"}`}>
                        {countE > 0 ? scoreE : "—"}
                      </span>
                    </td>

                    {/* Score P */}
                    <td className="px-2 py-3 text-center align-top bg-blue-50/10">
                      <span className={`text-sm font-bold tabular-nums ${countP > 0 ? "text-sky-700" : "text-gray-300"}`}>
                        {countP > 0 ? scoreP : "—"}
                      </span>
                    </td>

                    {/* Score R */}
                    <td className="px-2 py-3 text-center align-top bg-blue-50/10">
                      <span className={`text-sm font-bold tabular-nums ${countR > 0 ? "text-amber-700" : "text-gray-300"}`}>
                        {countR > 0 ? scoreR : "—"}
                      </span>
                    </td>
                  </tr>
                );
              });
            })}
        </tbody>
      </table>
    </OverlayScrollbarsComponent>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-300">
      <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p className="text-sm">Sin datos disponibles para este proceso.</p>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function ResultadosChart({ procesos, dataByProceso, selectedProcesoId }: Props) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [sortOrder, setSortOrder] = useState<"orden" | "asc" | "desc">("desc");
  const [filterTipo, setFilterTipo] = useState<string>("todos");

  const macros = useMemo(() => dataByProceso[selectedProcesoId] ?? [], [selectedProcesoId, dataByProceso]);

  // Filter excluded macros by orden
  const macrosActivos = useMemo(
    () => macros.filter((m) => !EXCLUDED_MACROS.has(m.orden)).sort((a, b) => a.orden - b.orden),
    [macros]
  );

  // For chart: flatten criterios per macro
  const chartRows = useMemo(() => {
    let result = macrosActivos.map((m) => ({
      ...m,
      avance: calcAvance(m.estandares.flatMap((e) => e.criterios)),
    }));

    if (filterTipo !== "todos") {
      result = result.filter((m) => m.tipo?.toLowerCase() === filterTipo.toLowerCase());
    }

    if (sortOrder === "asc") {
      result = result.sort((a, b) => a.avance - b.avance);
    } else if (sortOrder === "desc") {
      result = result.sort((a, b) => b.avance - a.avance);
    }

    return result;
  }, [macrosActivos, filterTipo, sortOrder]);

  return (
    <div className="flex flex-col font-sans w-full lg:flex-1">
      <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col ring-1 ring-black/[0.02]">
        
        {/* Card header */}
        <div className="px-8 pt-5 pb-3 border-b border-black/[0.06] shrink-0 flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-[#000000] font-avenir-demi text-base font-bold tracking-tight">
            Autoevaluación de acreditación
          </h2>

          {/* Group: Controls (Tipo filter, Sort buttons, and View switcher pill) aligned next to each other on the right */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Tipo Filter */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-black/60 text-[9px] font-avenir font-normal">Tipo:</span>
              <div className="relative">
                <select
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value)}
                  className="appearance-none bg-black/[0.04] hover:bg-black/[0.08] text-black text-[9px] font-avenir rounded-md pl-2 pr-6 py-[5px] focus:outline-none focus:ring-1 focus:ring-black/10 cursor-pointer font-medium border border-black/[0.08] min-w-[120px] transition-all shadow-sm"
                >
                  <option value="todos" className="text-gray-900 bg-white text-[9px]">Todos</option>
                  <option value="gerencial" className="text-gray-900 bg-white text-[9px]">Gerenciales</option>
                  <option value="prestacional" className="text-gray-900 bg-white text-[9px]">Asistenciales</option>
                  <option value="apoyo" className="text-gray-900 bg-white text-[9px]">De Apoyo</option>
                </select>
                <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-black/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Sort Order Button Group */}
            <div className="flex items-center bg-black/[0.04] rounded-md p-0.5 border border-black/[0.08] shadow-sm shrink-0 mt-0.5">
              <button
                type="button"
                title="Por orden"
                onClick={() => setSortOrder("orden")}
                className={`p-1.5 transition-all rounded-[4px] ${sortOrder === "orden" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </button>
              <button
                type="button"
                title="Mayor a menor"
                onClick={() => setSortOrder("desc")}
                className={`p-1.5 transition-all rounded-[4px] ${sortOrder === "desc" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4h11M3 8h9M3 12h5m12 0V4m0 8l3-3m-3 3l-3-3" />
                </svg>
              </button>
              <button
                type="button"
                title="Menor a mayor"
                onClick={() => setSortOrder("asc")}
                className={`p-1.5 transition-all rounded-[4px] ${sortOrder === "asc" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-700"}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4h5M3 8h9M3 12h11m5-8v8m0-8l3 3m-3-3l-3 3" />
                </svg>
              </button>
            </div>

            {/* View switcher pill (Gráfico / Tabla) */}
            <div className="flex items-center bg-black/[0.04] rounded-full p-0.5 border border-black/[0.08] shadow-sm shrink-0 mt-0.5">
              <button
                id="toggle-chart"
                onClick={() => setView("chart")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-avenir-demi font-semibold transition-all duration-300 ${view === "chart"
                  ? "bg-white text-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                  : "text-gray-500 hover:text-gray-900"
                  }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Gráfico
              </button>
              <button
                id="toggle-table"
                onClick={() => setView("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-avenir-demi font-semibold transition-all duration-300 ${view === "table"
                  ? "bg-white text-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                  : "text-gray-500 hover:text-gray-900"
                  }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M3 14h18M10 4v16M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" />
                </svg>
                Tabla
              </button>
            </div>
          </div>
        </div>

        {/* View */}
        {view === "chart" ? (
          <ChartView rows={chartRows} />
        ) : (
          <TableView rows={chartRows} />
        )}
      </div>
    </div>
  );
}
