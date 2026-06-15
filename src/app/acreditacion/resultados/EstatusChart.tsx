"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

/* ─── Types ──────────────────────────────────────────────── */
export interface EntregableRaw {
  id: string;
  estado: "cumplido" | "parcial" | "no_cumplido" | null;
}

export interface CriterioEntregable {
  id: string;
  codigo_criterio: string;
  entregables: EntregableRaw[];
}

export interface EstandarEntregable {
  id: string;
  codigo: string;
  criterios: CriterioEntregable[];
}

export interface MacroprocesoEntregable {
  id: string;
  orden: number;
  codigo: string;
  nombre: string;
  estandares: EstandarEntregable[];
}

export interface EstatusChartProps {
  procesos: { id: string; label: string }[];
  dataByProceso: Record<string, MacroprocesoEntregable[]>;
  selectedProcesoId: string;
}

/* ─── Exclusions ─────────────────────────────────────────── */
const EXCLUDED_CRITERIOS = new Set([
  "DIR1-4", "DIR1-5", "DIR1-6", "DIR1-8", "GRH4-1", "MRA8-1", "MRA8-2", "MRA8-3",
  "ATA1-3", "ATA3-2", "ATA3-3", "ATA3-4", "ATA3-5", "ATA3-6", "RCR4-1", "RCR4-2",
  "RCR4-3", "GMD3-4", "GMD3-5", "MRS1-1", "MRS1-2", "MRS1-3", "MRS2-1", "MRS2-2", "ATH6-1", "ATH6-2",
]);
const EXCLUDED_MACROS = new Set([8, 12]);

/* ─── Colors ─────────────────────────────────────────────── */
const aviva01 = "#4C96B0";
const aviva01_lighter = "#AADAE2";
const aviva_gray_01 = "#D9D9D9";

const STATUS_COLORS = {
  cumplido: aviva01,
  parcial: aviva01_lighter,
  no_cumplido: "#fecaca",
  sin_estado: aviva_gray_01,
};

const STATUS_LABELS = {
  cumplido: "Cumplido",
  parcial: "Parcial",
  no_cumplido: "No cumplido",
  sin_estado: "Sin estado",
};

/* ─── Helper ─────────────────────────────────────────────── */
function computeBarData(macros: MacroprocesoEntregable[]) {
  return macros
    .filter((m) => !EXCLUDED_MACROS.has(m.orden))
    .sort((a, b) => a.orden - b.orden)
    .map((m) => {
      let cumplido = 0, parcial = 0, no_cumplido = 0, sin_estado = 0;
      for (const est of m.estandares) {
        for (const cr of est.criterios) {
          if (EXCLUDED_CRITERIOS.has(cr.codigo_criterio)) continue;
          for (const e of cr.entregables) {
            if (e.estado === "cumplido") cumplido++;
            else if (e.estado === "parcial") parcial++;
            else if (e.estado === "no_cumplido") no_cumplido++;
            else sin_estado++;
          }
        }
      }
      const total = cumplido + parcial + no_cumplido + sin_estado;
      return { macro: m, cumplido, parcial, no_cumplido, sin_estado, total };
    });
}

/* ─── Main Component ─────────────────────────────────────── */
export default function EstatusChart({ procesos, dataByProceso, selectedProcesoId }: EstatusChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const macros = useMemo(
    () => dataByProceso[selectedProcesoId] ?? [],
    [selectedProcesoId, dataByProceso]
  );

  const rows = useMemo(() => computeBarData(macros), [macros]);

  // Format data for Recharts
  const chartData = useMemo(() => {
    return rows.map((r) => ({
      name: `${r.macro.orden}. ${r.macro.nombre}`,
      cumplido: r.cumplido,
      parcial: r.parcial,
      no_cumplido: r.no_cumplido,
      sin_estado: r.sin_estado,
    }));
  }, [rows]);

  return (
    <div className="flex flex-col font-sans">
      <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col ring-1 ring-black/[0.02]">
        
        {/* Title inside the card */}
        <div className="px-8 pt-6 pb-2 flex items-center justify-between gap-4 shrink-0">
          <h2 className="text-[#000000] font-avenir-demi text-base font-bold tracking-tight">
            Estatus
          </h2>
        </div>

        {/* Body: vertical columns chart */}
        <div className="flex-1 min-w-0 px-8 py-6 flex flex-col relative">
          {!isMounted ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-300">
              <p className="text-sm font-avenir">Cargando gráfico...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-300">
              <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm">Sin datos disponibles para este proceso.</p>
            </div>
          ) : (
            <div className="w-full flex flex-col">
              <div className="w-full" style={{ height: "450px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 20, left: 0, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#000000", fontSize: 11, fontWeight: 500, fontFamily: "var(--font-avenir)" }}
                      angle={-40}
                      textAnchor="end"
                      interval={0}
                      stroke="#d1d5db"
                      height={160}
                    />
                    
                    <YAxis
                      tick={{ fill: "#000000", fontSize: 11, fontWeight: 500, fontFamily: "var(--font-avenir)" }}
                      stroke="#d1d5db"
                      allowDecimals={false}
                    />
                    
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderRadius: "1rem",
                        border: "1px solid rgba(0, 0, 0, 0.08)",
                        fontFamily: "var(--font-avenir)",
                        fontSize: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
                      }}
                      itemStyle={{
                        padding: "2px 0",
                      }}
                    />
                    
                    <Bar dataKey="cumplido" name="Cumplido" stackId="a" fill={STATUS_COLORS.cumplido} label={(props: any) => {
                      const { x, y, width, height, value } = props;
                      if (value === 0 || width < 15 || height < 15) return null;
                      return (
                        <text x={x + width / 2} y={y + height / 2} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="bold" fontFamily="var(--font-avenir)">
                          {value}
                        </text>
                      );
                    }} />
                    <Bar dataKey="parcial" name="Parcial" stackId="a" fill={STATUS_COLORS.parcial} label={(props: any) => {
                      const { x, y, width, height, value } = props;
                      if (value === 0 || width < 15 || height < 15) return null;
                      return (
                        <text x={x + width / 2} y={y + height / 2} fill="#374151" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="bold" fontFamily="var(--font-avenir)">
                          {value}
                        </text>
                      );
                    }} />
                    <Bar dataKey="no_cumplido" name="No cumplido" stackId="a" fill={STATUS_COLORS.no_cumplido} label={(props: any) => {
                      const { x, y, width, height, value } = props;
                      if (value === 0 || width < 15 || height < 15) return null;
                      return (
                        <text x={x + width / 2} y={y + height / 2} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="bold" fontFamily="var(--font-avenir)">
                          {value}
                        </text>
                      );
                    }} />
                    <Bar dataKey="sin_estado" name="Sin estado" stackId="a" fill={STATUS_COLORS.sin_estado} label={(props: any) => {
                      const { x, y, width, height, value } = props;
                      if (value === 0 || width < 15 || height < 15) return null;
                      return (
                        <text x={x + width / 2} y={y + height / 2} fill="#374151" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="bold" fontFamily="var(--font-avenir)">
                          {value}
                        </text>
                      );
                    }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Custom Legend outside of Recharts to prevent overlap */}
              <div className="mt-4 pb-4 flex flex-wrap gap-6 justify-center">
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-sm ring-1 ring-black/5 shrink-0"
                      style={{ backgroundColor: STATUS_COLORS[key as keyof typeof STATUS_COLORS] }}
                    />
                    <span className="text-xs font-medium text-gray-500 font-avenir">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
