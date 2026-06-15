"use client";

import { useMemo } from "react";
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-300">
      <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p className="text-sm font-avenir">Sin datos disponibles para este proceso.</p>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function ComparativoAutoevaluacionChart({ procesos, dataByProceso, selectedProcesoId }: Props) {

  // Find current and previous process labels/IDs
  const { currentLabel, prevLabel, prevProcesoId } = useMemo(() => {
    const selected = procesos.find((p) => p.id === selectedProcesoId);
    const currLabel = selected?.label || "";

    let pLabel = "";
    let pId = "";

    const yearMatch = currLabel.match(/\b\d{4}\b/);
    if (yearMatch) {
      const currentYear = parseInt(yearMatch[0], 10);
      const prevYear = currentYear - 1;
      pLabel = currLabel.replace(currentYear.toString(), prevYear.toString());
      const prevProcess = procesos.find((p) => p.label === pLabel);
      if (prevProcess) {
        pId = prevProcess.id;
      }
    }

    return { currentLabel: currLabel, prevLabel: pLabel, prevProcesoId: pId };
  }, [procesos, selectedProcesoId]);

  // Current data
  const currentMacros = useMemo(() => dataByProceso[selectedProcesoId] ?? [], [selectedProcesoId, dataByProceso]);

  // Previous data
  const prevMacros = useMemo(() => dataByProceso[prevProcesoId] ?? [], [prevProcesoId, dataByProceso]);

  // Combine data
  const chartRows = useMemo(() => {
    const actives = currentMacros.filter((m) => !EXCLUDED_MACROS.has(m.orden)).sort((a, b) => a.orden - b.orden);

    return actives.map(m => {
      const currentAvance = calcAvance(m.estandares.flatMap((e) => e.criterios));

      let prevAvance = null;
      if (prevProcesoId) {
        const prevM = prevMacros.find(pm => pm.orden === m.orden);
        if (prevM) {
          prevAvance = calcAvance(prevM.estandares.flatMap((e) => e.criterios));
        }
      }

      return {
        ...m,
        currentAvance,
        prevAvance
      };
    });
  }, [currentMacros, prevMacros, prevProcesoId]);

  return (
    <div className="flex flex-col font-sans w-full lg:w-[50%] mt-6">
      <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col ring-1 ring-black/[0.02]">

        {/* Card header */}
        <div className="px-8 pt-6 pb-4 border-b border-black/[0.06] shrink-0 flex flex-col gap-3">
          <h2 className="text-[#000000] font-avenir-demi text-base font-bold tracking-tight">
            Comparativa de Autoevaluación Anual
          </h2>

          {/* Leyenda */}
          <div className="flex flex-wrap gap-6 items-center">
            {prevProcesoId && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#A0AAB2] ring-1 ring-black/5 shrink-0" />
                <span className="text-xs font-medium text-gray-500 font-avenir">{prevLabel}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#006A8F] ring-1 ring-black/5 shrink-0" />
              <span className="text-xs font-medium text-gray-500 font-avenir">{currentLabel}</span>
            </div>
          </div>
        </div>

        {/* View */}
        <div className="flex-1 min-w-0 relative h-[450px]">
          <OverlayScrollbarsComponent
            element="div"
            options={{ scrollbars: { autoHide: "scroll", theme: "os-theme-light" } }}
            defer
            className="h-full px-8 py-4"
          >
            {chartRows.length === 0 ? (
              <EmptyState />
            ) : (
              /* Espacio entre filas */
              <div className="space-y-1">
                {chartRows.map((row, idx) => (

                  /* Espacio entre titulo y barra gap- */
                  <div key={row.id} className="flex flex-col gap-0 relative group">
                    {/* Background Scale Lines */}
                    <div className="absolute inset-y-0 left-0 right-10 pointer-events-none flex justify-between z-0 pl-1">
                      {[0, 25, 50, 75, 100].map((v) => (
                        <div key={v} className="w-px h-full bg-gray-100" />
                      ))}
                    </div>

                    <div className="text-[12px] leading-tight font-medium text-[#000000] font-avenir relative z-10 pl-1 group-hover:text-[#006A8F] transition-colors">
                      {row.orden}. {row.nombre}
                    </div>

                    <div className="flex flex-col gap-[0.1px] relative z-10 pl-1">
                      {/* Prev Year Bar */}
                      {row.prevAvance !== null && (
                        <div className="flex items-center gap-3 group/bar">
                          <div className="flex-1 relative h-[6px] bg-black/[0.03] rounded-full overflow-hidden shadow-inner ring-1 ring-inset ring-black/[0.06]">
                            <div
                              className="absolute left-0 top-0 bottom-0 bg-[#A0AAB2] rounded-full transition-all duration-700 ease-out group-hover/bar:bg-[#8D98A0]"
                              style={{ width: `${row.prevAvance}%`, transitionDelay: `${idx * 40}ms` }}
                            />
                          </div>
                          <span className="text-[10px] font-avenir-demi text-gray-500 w-10 text-right tabular-nums">
                            {row.prevAvance.toFixed(1)}%
                          </span>
                        </div>
                      )}

                      {/* Current Year Bar */}
                      <div className="flex items-center gap-3 group/bar">
                        <div className="flex-1 relative h-[6px] bg-black/[0.03] rounded-full overflow-hidden shadow-inner ring-1 ring-inset ring-black/[0.06]">
                          <div
                            className="absolute left-0 top-0 bottom-0 bg-[#006A8F] rounded-full transition-all duration-700 ease-out shadow-[inset_0_-1px_2px_rgba(0,0,0,0.1)] group-hover/bar:brightness-110"
                            style={{ width: `${row.currentAvance}%`, transitionDelay: `${idx * 40 + 100}ms` }}
                          />
                        </div>
                        <span className="text-[10px] font-avenir-demi text-[#006A8F] w-10 text-right tabular-nums">
                          {row.currentAvance.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Scale Axis */}
                <div className="flex items-center pt-2 mt-4 border-t border-gray-100 relative z-10 pl-1 pr-10">
                  <div className="flex-1 flex justify-between">
                    {[0, 25, 50, 75, 100].map((v) => (
                      <span key={v} className="text-[10px] text-gray-400 font-mono font-medium w-6 text-center -ml-3">{v}%</span>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </OverlayScrollbarsComponent>
        </div>
      </div>
    </div>
  );
}
