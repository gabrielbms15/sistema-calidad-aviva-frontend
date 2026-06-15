"use client";

import { useState, useMemo } from "react";

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

export interface EntregablesChartProps {
  procesos: { id: string; label: string }[];
  dataByProceso: Record<string, MacroprocesoEntregable[]>;
  selectedProcesoId: string;
}

/* ─── Exclusions (same as autoevaluacion module) ─────────── */
const EXCLUDED_CRITERIOS = new Set([
  "DIR1-4", "DIR1-5", "DIR1-6", "DIR1-8", "GRH4-1", "MRA8-1", "MRA8-2", "MRA8-3",
  "ATA1-3", "ATA3-2", "ATA3-3", "ATA3-4", "ATA3-5", "ATA3-6", "RCR4-1", "RCR4-2",
  "RCR4-3", "GMD3-4", "GMD3-5", "MRS1-1", "MRS1-2", "MRS1-3", "MRS2-1", "MRS2-2", "ATH6-1", "ATH6-2",
]);
const EXCLUDED_MACROS = new Set([8, 12]);

/* ─── Colors ─────────────────────────────────────────────── */
const STATUS_KEYS = ["cumplido", "parcial", "no_cumplido", "sin_estado"] as const;
type StatusKey = typeof STATUS_KEYS[number];

// Colors specified by Aviva Design System
const aviva01 = "#4C96B0";
const aviva01_lighter = "#AADAE2";
const aviva_gray_01 = "#D9D9D9";

const STATUS_COLORS: Record<StatusKey, { bar: string; label: string; text: string; light: string; barText: string }> = {
  cumplido: { bar: aviva01, label: "Cumplido", text: "#1a5a6b", light: "#e0f2f7", barText: "text-white drop-shadow-sm" },
  parcial: { bar: aviva01_lighter, label: "Parcial", text: "#854d0e", light: "#fef9ec", barText: "text-gray-900" },
  no_cumplido: { bar: "#fecaca", label: "No cumplido", text: "#991b1b", light: "#fef2f2", barText: "text-white drop-shadow-sm" },
  sin_estado: { bar: aviva_gray_01, label: "Sin estado", text: "#6b7280", light: "#f3f4f6", barText: "text-gray-900" },
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
          // Skip excluded criterios
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

/* ─── Donut Chart ────────────────────────────────────────── */
function DonutChart({ totales }: { totales: Record<StatusKey, number> & { total: number } }) {
  const R = 54;           // outer radius
  const r = 34;           // inner radius (donut hole)
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * R;

  // Build segments
  type Segment = { key: StatusKey; count: number; pct: number; offset: number; dash: number };
  const segments: Segment[] = [];
  let offsetAcc = 0;

  // Start from top (−90°): rotate the entire SVG by -90deg
  STATUS_KEYS.forEach((key) => {
    const count = totales[key];
    const pct = totales.total > 0 ? (count / totales.total) * 100 : 0;
    const dash = (pct / 100) * circumference;
    segments.push({ key, count, pct, offset: offsetAcc, dash });
    offsetAcc += dash;
  });

  const hasData = totales.total > 0;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Donut */}
      <div className="relative" style={{ width: 140, height: 140 }}>
        <svg
          width={140}
          height={140}
          viewBox="0 0 140 140"
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Background track */}
          <circle
            cx={cx} cy={cy} r={R}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={R - r}
          />

          {hasData ? (
            segments.map(({ key, dash, offset }) =>
              dash > 0 ? (
                <circle
                  key={key}
                  cx={cx} cy={cy} r={R}
                  fill="none"
                  stroke={STATUS_COLORS[key].bar}
                  strokeWidth={R - r}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  style={{ transition: "stroke-dasharray 0.7s ease, stroke-dashoffset 0.7s ease" }}
                />
              ) : null
            )
          ) : null}
        </svg>

        {/* Center label */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ pointerEvents: "none" }}
        >
          <span className="text-[22px] font-black text-gray-800 leading-none tabular-nums">
            {totales.total}
          </span>
          <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5">
            total
          </span>
        </div>
      </div>

      {/* Legend items */}
      <div className="flex flex-col gap-2 w-full">
        {STATUS_KEYS.map((key) => {
          const pct = totales.total > 0 ? (totales[key] / totales.total) * 100 : 0;
          return (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: STATUS_COLORS[key].bar }}
              />
              <span className="text-[11px] text-gray-500 flex-1 leading-none">
                {STATUS_COLORS[key].label}
              </span>
              <span className="text-[11px] font-bold tabular-nums text-gray-700">
                {totales[key]}
              </span>
              <span
                className="text-[10px] font-semibold tabular-nums w-10 text-right"
                style={{ color: STATUS_COLORS[key].bar }}
              >
                {pct.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Stacked Bar Row ────────────────────────────────────── */
function StackedBarRow({
  row,
  idx,
}: {
  row: ReturnType<typeof computeBarData>[number];
  idx: number;
}) {
  const { cumplido, parcial, no_cumplido, sin_estado, total, macro } = row;

  const segments: { key: StatusKey; count: number }[] = [
    { key: "cumplido", count: cumplido },
    { key: "parcial", count: parcial },
    { key: "no_cumplido", count: no_cumplido },
    { key: "sin_estado", count: sin_estado },
  ];

  return (
    <div
      className="group flex items-center gap-4 py-[1px] px-3 rounded-xl transition-all duration-200 border border-transparent hover:border-[#2D778B]/10 hover:bg-[#2D778B]/[0.04] bg-transparent relative z-10"
    >
      {/* Label */}
      <div className="w-[35%] shrink-0 flex items-center justify-end gap-1.5 pr-2">
        <span className="text-[11px] font-normal text-[#000000] font-mono shrink-0">
          {macro.orden}.
        </span>
        <span
          className="text-[13px] font-medium text-[#000000] truncate font-avenir text-right"
          title={macro.nombre}
        >
          {macro.nombre}
        </span>
      </div>

      {/* Bar — full width, equal for all rows */}
      <div className="flex-1">
        {total === 0 ? (
          <div className="h-5 bg-black/[0.03] rounded flex items-center justify-center ring-1 ring-inset ring-black/[0.06]">
            <span className="text-[10px] text-gray-300 font-medium">Sin entregables</span>
          </div>
        ) : (
          <div className="relative flex h-5 w-full rounded overflow-hidden shadow-sm ring-1 ring-inset ring-black/[0.08]">
            {segments.map(({ key, count }) => {
              if (count === 0) return null;
              const segPct = (count / total) * 100;
              return (
                <div
                  key={key}
                  title={`${STATUS_COLORS[key].label}: ${count}`}
                  className="relative flex items-center justify-center overflow-hidden"
                  style={{
                    width: `${segPct}%`,
                    backgroundColor: STATUS_COLORS[key].bar,
                    transition: `width 0.7s ease ${idx * 30}ms`,
                  }}
                >
                  {segPct >= 8 && (
                    <span className={`text-[10px] font-bold select-none tabular-nums ${STATUS_COLORS[key].barText}`}>
                      {count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Empty State ────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-gray-300">
      <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p className="text-sm">Sin datos disponibles para este proceso.</p>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function EntregablesChart({ procesos, dataByProceso, selectedProcesoId }: EntregablesChartProps) {

  const macros = useMemo(
    () => dataByProceso[selectedProcesoId] ?? [],
    [selectedProcesoId, dataByProceso]
  );

  const rows = useMemo(() => computeBarData(macros), [macros]);

  const totales = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.cumplido += r.cumplido;
        acc.parcial += r.parcial;
        acc.no_cumplido += r.no_cumplido;
        acc.sin_estado += r.sin_estado;
        acc.total += r.total;
        return acc;
      },
      { cumplido: 0, parcial: 0, no_cumplido: 0, sin_estado: 0, total: 0 }
    );
  }, [rows]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 font-sans w-full">
      {/* Left Card: Stacked Bars (70%) */}
      <div className="w-full lg:w-[70%] bg-white/80 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col ring-1 ring-black/[0.02]">
        
        {/* Title inside the card */}
        <div className="px-8 pt-6 pb-2 flex items-center justify-between gap-4 shrink-0">
          <h2 className="text-[#000000] font-avenir-demi text-base font-bold tracking-tight">
            Entregables por Macroproceso
          </h2>
        </div>

        {/* Body: bars */}
        <div className="flex-1 min-w-0 px-6 py-5 flex flex-col justify-between relative">
          {/* Background gridlines every 10% */}
          {rows.length > 0 && (
            <div className="absolute inset-y-5 left-[calc(36px+35%+16px)] right-[36px] pointer-events-none z-0">
              {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((v) => (
                <div
                  key={v}
                  className="absolute top-0 bottom-0 w-px bg-gray-200/50"
                  style={{ left: `${v}%` }}
                />
              ))}
            </div>
          )}

          {rows.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="space-y-[4px] relative z-10">
                {rows.map((row, idx) => (
                  <StackedBarRow key={row.macro.id} row={row} idx={idx} />
                ))}
              </div>

              {/* Scale at the bottom */}
              <div className="flex items-center mt-3 relative z-10" style={{ paddingLeft: "calc(35% + 1.5rem)", paddingRight: "12px" }}>
                <div className="flex-1 flex justify-between relative text-[9px] text-gray-400 font-mono font-medium h-4">
                  {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => (
                    <span key={v} className="absolute -translate-x-1/2" style={{ left: `${v}%` }}>
                      {v}%
                    </span>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap gap-6 justify-center relative z-10">
                {STATUS_KEYS.map((key) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-sm ring-1 ring-black/5 shrink-0"
                      style={{ backgroundColor: STATUS_COLORS[key].bar }}
                    />
                    <span className="text-xs font-medium text-gray-500 font-avenir">{STATUS_COLORS[key].label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Card: Distribución Global (30%) */}
      <div className="w-full lg:w-[30%] bg-white/80 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col ring-1 ring-black/[0.02]">
        
        {/* Title inside the card */}
        <div className="px-8 pt-6 pb-2 shrink-0">
          <h2 className="text-[#000000] font-avenir-demi text-base font-bold tracking-tight">
            Distribución Global
          </h2>
        </div>

        {/* Body: donut chart */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-transparent rounded-b-[2rem]">
          <DonutChart totales={totales} />
        </div>
      </div>
    </div>
  );
}
