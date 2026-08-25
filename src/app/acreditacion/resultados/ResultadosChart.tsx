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
        className="px-6 py-4 h-full"
      >
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="space-y-[2px]">
              {rows.map((row, idx) => {
                const pct = row.avance;
                return (
                  <div key={row.id} className="group flex items-center gap-2 py-[1px] px-1.5 rounded-xl hover:bg-black/[0.02] transition-all duration-200 border border-transparent hover:border-black/[0.04]">
                    {/* Label */}
                    <div className="w-[40%] shrink-0 flex items-center justify-end gap-1.5 pr-1">
                      <span className="text-[8px] font-normal text-[#000000] font-avenir shrink-0">
                        {row.orden}.
                      </span>
                      <span
                        className="text-[9px] font-normal text-[#000000] truncate font-avenir text-right"
                        title={row.nombre}
                      >
                        {row.nombre}
                      </span>
                    </div>
                    <div className="flex-1 relative h-3 bg-black/[0.03] rounded overflow-hidden shadow-inner ring-1 ring-inset ring-black/[0.06]">
                      {[25, 50, 75].map((v) => (
                        <div key={v} className="absolute top-0 bottom-0 w-px bg-white/40" style={{ left: `${v}%` }} />
                      ))}
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-[#006A8F] z-10 transition-all duration-700 ease-out flex items-center justify-end pr-2 overflow-hidden shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)]"
                        style={{ width: `${pct}%`, minWidth: pct > 0 ? "35px" : "0", transitionDelay: `${idx * 40}ms` }}
                      >
                        {pct > 0 && (
                          <span className="text-[8px] font-avenir-demi text-white/95 tracking-wide z-20 drop-shadow-md">
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
                  <span key={v} className="text-[8px] text-gray-400 font-mono font-medium">{v}%</span>
                ))}
              </div>
            </div>
          </>
        )}
      </OverlayScrollbarsComponent>
    </>
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

    // Siempre ordenado de mayor a menor
    return result.sort((a, b) => b.avance - a.avance);
  }, [macrosActivos]);

  return (
    <div className="flex flex-col font-sans w-full lg:flex-1 h-full">
      <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col ring-1 ring-black/[0.02] h-full overflow-hidden">
        
        {/* Card header */}
        <div className="px-8 pt-5 pb-3 border-b border-black/[0.06] shrink-0 flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-[9px] font-sans font-extrabold uppercase tracking-wider text-gray-700">
            Autoevaluación de acreditación
          </h2>
        </div>

        {/* View */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          <ChartView rows={chartRows} />
        </div>
      </div>
    </div>
  );
}
