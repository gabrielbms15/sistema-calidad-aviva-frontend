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
}

/* ─── Exclusions (same as autoevaluacion module) ─────────── */
const EXCLUDED_CRITERIOS = new Set([
  "DIR1-4", "DIR1-5", "DIR1-6", "DIR1-8", "GRH4-1", "MRA8-1", "MRA8-2", "MRA8-3",
  "ATA1-3", "ATA3-2", "ATA3-3", "ATA3-4", "ATA3-5", "ATA3-6", "RCR4-1", "RCR4-2",
  "RCR4-3", "GMD3-4", "GMD3-5", "MRS1-1", "MRS1-2", "MRS1-3", "MRS2-1", "MRS2-2",
]);
const EXCLUDED_MACROS = new Set([8, 12]);

/* ─── Colors ─────────────────────────────────────────────── */
const STATUS_KEYS = ["cumplido", "parcial", "no_cumplido", "sin_estado"] as const;
type StatusKey = typeof STATUS_KEYS[number];

const STATUS_COLORS: Record<StatusKey, { bar: string; label: string; text: string; light: string }> = {
  cumplido:    { bar: "#22c55e", label: "Cumplido",    text: "#15803d", light: "#dcfce7" },
  parcial:     { bar: "#f59e0b", label: "Parcial",     text: "#b45309", light: "#fef3c7" },
  no_cumplido: { bar: "#ef4444", label: "No cumplido", text: "#b91c1c", light: "#fee2e2" },
  sin_estado:  { bar: "#d1d5db", label: "Sin estado",  text: "#6b7280", light: "#f3f4f6" },
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
                style={{ color: STATUS_COLORS[key].text }}
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
    { key: "cumplido",    count: cumplido },
    { key: "parcial",     count: parcial },
    { key: "no_cumplido", count: no_cumplido },
    { key: "sin_estado",  count: sin_estado },
  ];

  return (
    <div className="group flex items-center gap-4 py-2 px-3 rounded-xl transition-all duration-200 hover:bg-black/[0.02] border border-transparent hover:border-black/[0.04]">
      {/* Label */}
      <div className="w-[38%] shrink-0 flex items-center gap-2 pr-2">
        <span className="text-[11px] font-bold text-[#3d537e]/60 font-mono w-5 text-right shrink-0">
          {macro.orden}.
        </span>
        <span
          className="text-[13px] font-medium text-gray-700 truncate"
          title={macro.nombre}
        >
          {macro.nombre}
        </span>
      </div>

      {/* Bar — full width, equal for all rows */}
      <div className="flex-1">
        {total === 0 ? (
          <div className="h-7 bg-black/[0.03] rounded-full flex items-center justify-center ring-1 ring-inset ring-black/[0.06]">
            <span className="text-[10px] text-gray-300 font-medium">Sin entregables</span>
          </div>
        ) : (
          <div className="flex h-7 w-full rounded-full overflow-hidden shadow-sm ring-1 ring-inset ring-black/[0.08]">
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
                    <span className="text-[10px] font-bold text-white drop-shadow-sm select-none tabular-nums">
                      {count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Total outside bar */}
      <div className="w-10 shrink-0 text-right">
        <span className="text-[13px] font-black tabular-nums text-gray-700">
          {total > 0 ? total : "—"}
        </span>
        {total > 0 && (
          <span className="text-[9px] text-gray-400 block leading-none">total</span>
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
export default function EntregablesChart({ procesos, dataByProceso }: EntregablesChartProps) {
  const [selectedProcesoId, setSelectedProcesoId] = useState<string>(
    procesos[0]?.id ?? ""
  );

  const macros = useMemo(
    () => dataByProceso[selectedProcesoId] ?? [],
    [selectedProcesoId, dataByProceso]
  );

  const rows = useMemo(() => computeBarData(macros), [macros]);

  const totales = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.cumplido    += r.cumplido;
        acc.parcial     += r.parcial;
        acc.no_cumplido += r.no_cumplido;
        acc.sin_estado  += r.sin_estado;
        acc.total       += r.total;
        return acc;
      },
      { cumplido: 0, parcial: 0, no_cumplido: 0, sin_estado: 0, total: 0 }
    );
  }, [rows]);

  return (
    <div className="flex flex-col font-sans">
      {/* Card */}
      <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col ring-1 ring-black/[0.02]">

        {/* Header */}
        <div className="bg-[#1C1C1E]/95 backdrop-blur-xl px-8 py-4 border-b border-white/10 shrink-0 flex items-center justify-between gap-4 flex-wrap rounded-t-[2rem]">
          <div>
            <h2 className="text-white/95 font-bold text-[15px] tracking-tight">
              Entregables por Macroproceso
            </h2>
            <p className="text-white/40 text-[11px] mt-0.5">
              Estado de entregables agrupados por macroproceso · criterios excluidos no considerados
            </p>
          </div>

          {/* Proceso selector */}
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">Proceso:</span>
            <div className="relative">
              <select
                id="entregables-proceso-selector"
                value={selectedProcesoId}
                onChange={(e) => setSelectedProcesoId(e.target.value)}
                className="appearance-none bg-white/[0.08] hover:bg-white/[0.12] text-white/95 text-[13px] rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer font-medium border border-white/10 min-w-[200px] transition-all shadow-sm"
              >
                {procesos.map((p) => (
                  <option key={p.id} value={p.id} className="text-gray-900 bg-white">
                    {p.label}
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Body: bars + donut side by side */}
        <div className="flex gap-0 divide-x divide-gray-100">

          {/* Left: stacked bars */}
          <div className="flex-1 min-w-0 px-6 py-5">
            {rows.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="space-y-0.5">
                  {rows.map((row, idx) => (
                    <StackedBarRow key={row.macro.id} row={row} idx={idx} />
                  ))}
                </div>

                {/* Legend */}
                <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap gap-4">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider self-center mr-1">
                    Leyenda:
                  </span>
                  {STATUS_KEYS.map((key) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-sm ring-1 ring-black/5 shrink-0"
                        style={{ backgroundColor: STATUS_COLORS[key].bar }}
                      />
                      <span className="text-xs font-medium text-gray-500">{STATUS_COLORS[key].label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right: donut chart */}
          <div className="w-56 shrink-0 flex flex-col items-center justify-center px-6 py-6 bg-gray-50/40">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-4 text-center">
              Distribución global
            </p>
            <DonutChart totales={totales} />
          </div>
        </div>

      </div>
    </div>
  );
}
