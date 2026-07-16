"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  getCumplimientoGlobal,
  getCumplimientoUpss,
  getCumplimientoGrupoProfesional,
  getFallasPorPregunta,
  getEvaluacionesPorEvaluador,
  getDistribucionEvaluacionesPorSet,
} from "@/app/metas-internacionales/actions";
import {
  ComposedChart,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SetPreguntas {
  id: string;
  nombre: string;
  orden: number;
}

interface ProcesoPrevalencia {
  id: string;
  nombre: string;
  fecha: string;
  estado: string;
  sede: { nombre: string };
}

interface CumplimientoPorUpss {
  upss: string;
  total_si: number;
  total_no: number;
  porcentaje_cumplimiento: number;
  total_evaluados?: number;
}

interface CumplimientoGlobalSet {
  set_nombre: string;
  set_orden: number;
  porcentaje_cumplimiento: number;
}

interface CumplimientoPorGrupo {
  grupo_profesional: string;
  total_si?: number;
  total_no?: number;
  porcentaje_cumplimiento: number;
  total_evaluados?: number;
}

interface FallaPorPregunta {
  pregunta_id: string;
  texto: string;
  orden: number;
  total_si: number;
  total_no: number;
  porcentaje_no: number;
}

interface EvaluacionPorEvaluador {
  evaluador_nombre: string;
  total_evaluaciones: number;
}

interface DistribucionEvaluaciones {
  set_nombre: string;
  total: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BRAND = "#2b3f64";
const PALETTE = [
  "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899",
  "#f59e0b", "#10b981", "#0ea5e9", "#f97316",
  "#14b8a6", "#a855f7", "#ef4444", "#84cc16",
  "#06b6d4", "#d946ef",
];

const P3_PALETTE = [
  "var(--color-p3-ocean-blue-400)",
  "var(--color-p3-ocean-blue-300)",
  "var(--color-p3-ocean-blue-200)",
  "var(--color-p3-ocean-blue-100)",
];

function colorForValue(pct: number): string {
  if (pct === 100) return "var(--color-p2-ocean-teal-400)";
  if (pct >= 90) return "var(--color-p2-ocean-teal-300)";
  if (pct >= 75) return "var(--color-p2-ocean-teal-200)";
  return "var(--color-p2-ocean-teal-100)";
}

function pctLabel(value: unknown) {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return isNaN(n) ? "" : `${n.toFixed(1)}%`;
}


function getColorForSet(setName: string): string {
  if (!setName) return BRAND;
  const lower = setName.toLowerCase();
  if (lower.includes("lavado de manos")) return "var(--color-p1-primary-blue)";
  if (lower.includes("administraci") && lower.includes("medicamentos")) return "var(--color-p1-accent-aqua)";
  if (lower.includes("identificaci") && lower.includes("paciente")) return "var(--color-p1-primary-teal)";
  if (lower.includes("caídas") || lower.includes("caidas")) return "var(--color-p1-light-blue)";
  if (lower.includes("presión") || lower.includes("presion") || lower.includes("ulceras") || lower.includes("úlceras")) return "var(--color-p1-sky-blue)";
  if (lower.includes("comunicaci") && lower.includes("segura")) return "var(--color-p1-mint)";
  return BRAND;
}

// ─── SetSelector (filtro inline por meta) ─────────────────────────────────────

function SetSelector({
  sets,
  setSeleccionado,
  modoGlobal,
  onSelectSet,
}: {
  sets: SetPreguntas[];
  setSeleccionado: SetPreguntas | null;
  modoGlobal: boolean;
  onSelectSet: (set: SetPreguntas | null) => void;
}) {
  const currentValue = modoGlobal ? "__global__" : (setSeleccionado?.id ?? "__global__");

  return (
    <select
      value={currentValue}
      onChange={(e) => {
        const val = e.target.value;
        if (val === "__global__") {
          onSelectSet(null);
        } else {
          const found = sets.find((s) => s.id === val) ?? null;
          onSelectSet(found);
        }
      }}
      className="text-[8px] font-sans font-extrabold uppercase tracking-wider bg-gray-50 border border-gray-200 text-gray-600 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-manhattan-1 cursor-pointer hover:border-blue-manhattan-1/40 transition-colors"
    >
      <option value="__global__">Global</option>
      {sets.map((s) => (
        <option key={s.id} value={s.id}>
          {s.nombre}
        </option>
      ))}
    </select>
  );
}

function ChartCard({
  title,
  subtitle,
  filter,
  children,
  loading,
  empty,
}: {
  title: string;
  subtitle?: string;
  filter?: React.ReactNode;
  children: React.ReactNode;
  loading: boolean;
  empty: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 h-full font-avenir">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-[9px] font-sans font-extrabold uppercase tracking-wider text-gray-700">{title}</h2>
          {subtitle && <p className="text-[9px] text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {filter && <div className="shrink-0">{filter}</div>}
      </div>
      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[160px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-[#2b3f64]/20 border-t-[#2b3f64] rounded-full animate-spin" />
            <span className="text-[9px] text-gray-400">Cargando datos…</span>
          </div>
        </div>
      ) : empty ? (
        <div className="flex-1 flex items-center justify-center min-h-[160px]">
          <div className="flex flex-col items-center gap-2 text-center">
            <svg className="w-8 h-8 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-[9px] text-gray-400 font-semibold">Sin datos aún para este set</p>
            <p className="text-[9px] text-gray-300">Los datos aparecerán cuando haya evaluaciones completadas</p>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// Custom tooltip compartido
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-xl px-3 py-2 font-avenir">
      <p className="text-[9px] text-gray-500 mb-0.5 font-semibold">{label}</p>
      <p className="text-[13px] font-extrabold text-gray-800">{payload[0].value.toFixed(1)}%</p>
    </div>
  );
}

// Custom tick para XAxis con saltos de línea manuales para los Sets y fallback automático para UPSS
function CustomXAxisTick({ x, y, payload }: any) {
  const raw: string = payload.value ?? "";
  const lowerRaw = raw.toLowerCase();

  let lines: string[] = [];

  // Mapeos específicos solicitados:
  if (lowerRaw.includes("lavado de manos")) {
    lines = ["Lavado", "de manos"];
  } else if (lowerRaw.includes("administraci") && lowerRaw.includes("medicamentos")) {
    lines = ["Administración", "segura", "de medicamentos"];
  } else if (lowerRaw.includes("identificaci") && lowerRaw.includes("paciente")) {
    lines = ["Identificación", "del paciente"];
  } else if (lowerRaw.includes("caídas") || lowerRaw.includes("caidas")) {
    lines = ["Prevención de", "riesgo de caídas"];
  } else if (lowerRaw.includes("presión") || lowerRaw.includes("presion") || lowerRaw.includes("ulceras") || lowerRaw.includes("úlceras")) {
    lines = ["Prevención de", "úlceras por presión"];
  } else if (lowerRaw.includes("comunicaci") && lowerRaw.includes("segura")) {
    lines = ["Comunicación", "Segura"];
  } else {
    // Fallback genérico: sentence case + split
    const sentence = raw.length > 0 ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : raw;
    const words = sentence.split(" ");
    if (words.length > 3) {
      const half = Math.ceil(words.length / 2);
      lines = [words.slice(0, half).join(" "), words.slice(half).join(" ")];
    } else if (words.length === 3) {
      lines = [words.slice(0, 2).join(" "), words[2]];
    } else if (words.length === 2) {
      lines = [words[0], words[1]];
    } else {
      lines = [sentence];
    }
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={10} textAnchor="middle" fill="#111827" fontSize={8.5}>
        {lines.map((line, idx) => (
          <tspan x={0} dy={idx === 0 ? 0 : 11} key={idx}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

// Custom tick para YAxis (horizontal bars) — sentence case, negro
function CustomYAxisTick({ x, y, payload }: any) {
  const raw: string = payload.value ?? "";
  const sentence = raw.length > 0 ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : raw;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-4}
        y={0}
        dy={4}
        textAnchor="end"
        fill="#111827"
        fontSize={8.5}
      >
        {sentence}
      </text>
    </g>
  );
}

// Custom tooltip para PieChart
function CustomPieTooltip({ active, payload, unit = "sets" }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-xl px-3 py-2 font-avenir">
      <p className="text-[9px] text-gray-500 mb-0.5 font-semibold">{payload[0].name}</p>
      <p className="text-[13px] font-extrabold text-[#2b3f64]">
        {payload[0].value} <span className="text-[9px] font-normal text-gray-500">{unit}</span>
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardPrevalencias({
  sets,
  proceso,
}: {
  sets: SetPreguntas[];
  proceso: ProcesoPrevalencia | null;
}) {
  const [setSeleccionado, setSetSeleccionado] = useState<SetPreguntas | null>(
    sets.length > 0 ? sets[0] : null
  );

  const [loadingBySet, setLoadingBySet] = useState(false);
  const [loadingGlobal, setLoadingGlobal] = useState(true);

  const [dataUpss, setDataUpss] = useState<CumplimientoPorUpss[]>([]);
  const [dataGlobal, setDataGlobal] = useState<CumplimientoGlobalSet[]>([]);
  const [dataGrupo, setDataGrupo] = useState<CumplimientoPorGrupo[]>([]);
  const [dataFallas, setDataFallas] = useState<FallaPorPregunta[]>([]);
  const [dataEvaluadores, setDataEvaluadores] = useState<EvaluacionPorEvaluador[]>([]);
  const [dataDistribucion, setDataDistribucion] = useState<DistribucionEvaluaciones[]>([]);

  const [mostrarTodasFallas, setMostrarTodasFallas] = useState(false);
  const [modoGlobal, setModoGlobal] = useState(false);

  // Carga global (una sola vez)
  const cargarDatosGlobales = useCallback(async () => {
    if (!proceso) return;
    setLoadingGlobal(true);
    const [resGlobal, resEvaluadores, resDistribucion] = await Promise.all([
      getCumplimientoGlobal(proceso.id),
      getEvaluacionesPorEvaluador(proceso.id),
      getDistribucionEvaluacionesPorSet(proceso.id),
    ]);

    setDataGlobal((resGlobal.data ?? []).sort(
      (a: CumplimientoGlobalSet, b: CumplimientoGlobalSet) => b.porcentaje_cumplimiento - a.porcentaje_cumplimiento
    ));
    setDataEvaluadores(resEvaluadores.data ?? []);
    setDataDistribucion(resDistribucion.data ?? []);
    setLoadingGlobal(false);
  }, [proceso]);

  // Carga por set (al montar y al cambiar selector)
  const cargarDatosPorSet = useCallback(async (setId: string) => {
    if (!proceso) return;
    setLoadingBySet(true);
    setModoGlobal(false);
    setMostrarTodasFallas(false);

    const [resUpss, resGrupo, resFallas] = await Promise.all([
      getCumplimientoUpss(setId, proceso.id),
      getCumplimientoGrupoProfesional(setId, proceso.id),
      getFallasPorPregunta(setId, proceso.id),
    ]);

    const rawUpss = resUpss.data ?? [];
    const formattedUpss = rawUpss.map((item: CumplimientoPorUpss) => {
      let nombre = item.upss;
      // Normalizar para evitar problemas de mayúsculas/minúsculas
      const lower = nombre.toLowerCase();
      if (lower.includes("unidad de cuidados intensivos adulto")) {
        nombre = "UCI ADULTOS";
      } else if (lower.includes("unidad de cuidados intensivos neonatal")) {
        nombre = "UCI NEONATAL";
      } else if (lower.includes("central de esterilizaci")) {
        nombre = "ESTERILIZACION";
      }
      return { ...item, upss: nombre };
    });

    setDataUpss(
      [...formattedUpss].sort((a, b) => b.porcentaje_cumplimiento - a.porcentaje_cumplimiento)
    );
    setDataGrupo(
      [...(resGrupo.data ?? [])].sort((a: any, b: any) => b.porcentaje_cumplimiento - a.porcentaje_cumplimiento)
    );
    setDataFallas(resFallas.data ?? []);
    setLoadingBySet(false);
  }, [proceso]);

  // Carga global ponderada por UPSS y Grupo Profesional (opción "Global" del selector)
  const cargarDatosGlobal = useCallback(async () => {
    if (!proceso || sets.length === 0) return;
    setLoadingBySet(true);
    setModoGlobal(true);
    setMostrarTodasFallas(false);

    const [resUpssAll, resGrupoAll] = await Promise.all([
      Promise.all(sets.map((s) => getCumplimientoUpss(s.id, proceso.id))),
      Promise.all(sets.map((s) => getCumplimientoGrupoProfesional(s.id, proceso.id))),
    ]);

    // Agregar UPSS: sumar total_si y total_no por UPSS (porcentaje ponderado real)
    const upssMap: Record<string, { total_si: number; total_no: number; total_evaluados: number }> = {};
    for (const res of resUpssAll) {
      for (const raw of (res.data ?? [])) {
        const item = raw as CumplimientoPorUpss & { total_si: number; total_no: number };
        let nombre = item.upss;
        const lower = nombre.toLowerCase();
        if (lower.includes("unidad de cuidados intensivos adulto")) nombre = "UCI ADULTOS";
        else if (lower.includes("unidad de cuidados intensivos neonatal")) nombre = "UCI NEONATAL";
        else if (lower.includes("central de esterilizaci")) nombre = "ESTERILIZACION";
        if (!upssMap[nombre]) upssMap[nombre] = { total_si: 0, total_no: 0, total_evaluados: 0 };
        upssMap[nombre].total_si += (item.total_si ?? 0);
        upssMap[nombre].total_no += (item.total_no ?? 0);
        upssMap[nombre].total_evaluados += (item.total_evaluados ?? 0);
      }
    }
    const globalUpss: CumplimientoPorUpss[] = Object.entries(upssMap)
      .map(([upss, vals]) => ({
        upss,
        total_si: vals.total_si,
        total_no: vals.total_no,
        porcentaje_cumplimiento:
          vals.total_si + vals.total_no > 0
            ? (vals.total_si / (vals.total_si + vals.total_no)) * 100
            : 0,
        total_evaluados: vals.total_evaluados,
      }))
      .sort((a, b) => b.porcentaje_cumplimiento - a.porcentaje_cumplimiento);

    // Agregar Grupo Profesional: sumar total_si y total_no por grupo
    const grupoMap: Record<string, { total_si: number; total_no: number; total_evaluados: number }> = {};
    for (const res of resGrupoAll) {
      for (const raw of (res.data ?? [])) {
        const item = raw as CumplimientoPorGrupo & { total_si: number; total_no: number };
        const nombre = item.grupo_profesional;
        if (!grupoMap[nombre]) grupoMap[nombre] = { total_si: 0, total_no: 0, total_evaluados: 0 };
        grupoMap[nombre].total_si += (item.total_si ?? 0);
        grupoMap[nombre].total_no += (item.total_no ?? 0);
        grupoMap[nombre].total_evaluados += (item.total_evaluados ?? 0);
      }
    }
    const globalGrupo: CumplimientoPorGrupo[] = Object.entries(grupoMap)
      .map(([grupo_profesional, vals]) => ({
        grupo_profesional,
        total_si: vals.total_si,
        total_no: vals.total_no,
        porcentaje_cumplimiento:
          vals.total_si + vals.total_no > 0
            ? (vals.total_si / (vals.total_si + vals.total_no)) * 100
            : 0,
        total_evaluados: vals.total_evaluados,
      }))
      .sort((a, b) => b.porcentaje_cumplimiento - a.porcentaje_cumplimiento);

    setDataUpss(globalUpss);
    setDataGrupo(globalGrupo);
    setDataFallas([]); // No aplica en modo global
    setLoadingBySet(false);
  }, [proceso, sets]);

  // Mount
  useEffect(() => {
    cargarDatosGlobales();
  }, [cargarDatosGlobales]);

  useEffect(() => {
    if (setSeleccionado) cargarDatosPorSet(setSeleccionado.id);
  }, [setSeleccionado, cargarDatosPorSet]);

  // Fallas a mostrar (top 5 o todas)
  const fallasVisibles = mostrarTodasFallas ? dataFallas : dataFallas.slice(0, 5);

  // Sin proceso activo
  if (!proceso) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-4 font-avenir">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
          <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-[14px] font-bold text-gray-700">No hay proceso activo</h2>
        <p className="text-[11px] text-gray-400 max-w-sm leading-relaxed">
          No se encontró ningún proceso de prevalencia con estado <strong>activo</strong>.
          Crea o activa un proceso desde el panel de administración para visualizar los datos.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 font-avenir">
      {/* Proceso info banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#2b3f64]/5 border border-[#2b3f64]/10 rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] font-sans font-extrabold text-[#2b3f64]">{proceso.nombre}</span>
          <span className="text-gray-300 text-[10px]">·</span>
          <span className="text-[10px] text-gray-500">{proceso.sede?.nombre}</span>
        </div>
        <div className="flex items-center gap-4">
          <SetSelector sets={sets} setSeleccionado={setSeleccionado} modoGlobal={modoGlobal} onSelectSet={(s) => { setSetSeleccionado(s); if (s) cargarDatosPorSet(s.id); else cargarDatosGlobal(); }} />
          <span className="text-[9px] text-gray-400 hidden sm:inline-block">
            {new Date(proceso.fecha).toLocaleDateString("es-PE", {
              day: "numeric", month: "long", year: "numeric"
            })}
          </span>
        </div>
      </div>

      {/* Fila 1: Gráficas 1 y 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6">
        {/* Gráfica 1 — Cumplimiento por UPSS */}
        <ChartCard
          title="Cumplimiento por UPSS"
          loading={loadingBySet}
          empty={!loadingBySet && dataUpss.length === 0}
        >
          <ResponsiveContainer width="100%" height={190}>
            <ComposedChart
              data={dataUpss}
              layout="horizontal"
              margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="upss"
                tick={<CustomXAxisTick />}
                axisLine={false}
                tickLine={false}
                interval={0}
                height={34}
                tickMargin={6}
              />
              <YAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 8, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                width={28}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f3f4f6" }} />
              <Bar dataKey="porcentaje_cumplimiento" radius={[4, 4, 0, 0]} maxBarSize={24}>
                {dataUpss.map((entry, i) => (
                  <Cell key={i} fill={colorForValue(entry.porcentaje_cumplimiento)} />
                ))}
                <LabelList
                  dataKey="porcentaje_cumplimiento"
                  position="top"
                  formatter={pctLabel}
                  style={{ fontSize: 7.5, fontWeight: 700, fill: "#374151" }}
                />
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Gráfica 3 — Cumplimiento por grupo profesional */}
        <ChartCard
          title="Cumplimiento por Grupo Profesional"
          loading={loadingBySet}
          empty={!loadingBySet && dataGrupo.length === 0}
        >
          <ResponsiveContainer width="100%" height={206}>
            <BarChart
              data={dataGrupo}
              layout="vertical"
              margin={{ top: 4, right: 80, left: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 8, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="grupo_profesional"
                width={100}
                tick={<CustomYAxisTick />}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f3f4f6" }} />
              <Bar dataKey="porcentaje_cumplimiento" radius={[0, 4, 4, 0]} maxBarSize={10}>
                {dataGrupo.map((entry, i) => (
                  <Cell key={i} fill={colorForValue(entry.porcentaje_cumplimiento)} />
                ))}
                <LabelList
                  content={(props: any) => {
                    const { x, y, width, height, index } = props;
                    const item = dataGrupo[index];
                    if (!item || item.porcentaje_cumplimiento == null) return null;
                    return (
                      <text x={Number(x) + Number(width) + 5} y={Number(y) + Number(height) / 2 + 3.5} fill="#374151" fontSize={8} fontWeight={600}>
                        {item.porcentaje_cumplimiento.toFixed(1)}% <tspan fill="#9ca3af" fontSize={7.5} fontWeight={500}>(n={item.total_evaluados || 0})</tspan>
                      </text>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Fila 2: Gráficas 2, 4 y 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-[50fr_22fr_28fr] gap-6">
        {/* Gráfica 2 — Cumplimiento global por set */}
        <div>
          <ChartCard
            title="Cumplimiento Global por Set"
            loading={loadingGlobal}
            empty={!loadingGlobal && dataGlobal.length === 0}
          >
            <div className="flex-1 w-full min-h-[206px]">
              <ResponsiveContainer width="100%" height={206}>
                <BarChart
                  data={dataGlobal}
                  margin={{ top: 14, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="set_nombre"
                    tick={<CustomXAxisTick />}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    height={46}
                    tickMargin={6}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 8, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f3f4f6" }} />
                  <Bar dataKey="porcentaje_cumplimiento" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    {dataGlobal.map((entry, i) => (
                      <Cell key={i} fill={getColorForSet(entry.set_nombre)} />
                    ))}
                    <LabelList
                      dataKey="porcentaje_cumplimiento"
                      position="top"
                      formatter={pctLabel}
                      style={{ fontSize: 7.5, fontWeight: 700, fill: "#374151" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Gráfica 4 — Evaluaciones por Evaluador */}
        <div className="flex flex-col">
          <ChartCard
            title="Participación de Evaluadores"
            loading={loadingGlobal}
            empty={!loadingGlobal && dataEvaluadores.length === 0}
          >
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height={206}>
                <PieChart>
                  <Pie
                    data={dataEvaluadores}
                    dataKey="total_evaluaciones"
                    nameKey="evaluador_nombre"
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={4}
                    labelLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                    label={(p: any) => {
                      const RADIAN = Math.PI / 180;
                      // Número dentro
                      const insideRadius = p.innerRadius + (p.outerRadius - p.innerRadius) / 2;
                      const insideX = p.cx + insideRadius * Math.cos(-p.midAngle * RADIAN);
                      const insideY = p.cy + insideRadius * Math.sin(-p.midAngle * RADIAN);

                      // Texto fuera
                      const outsideRadius = p.outerRadius + 12;
                      const outsideX = p.cx + outsideRadius * Math.cos(-p.midAngle * RADIAN);
                      const outsideY = p.cy + outsideRadius * Math.sin(-p.midAngle * RADIAN);

                      const words = String(p.name).split(' ');
                      let firstLine = p.name;
                      let secondLine = '';
                      if (words.length > 1) {
                        const mid = Math.ceil(words.length / 2);
                        firstLine = words.slice(0, mid).join(' ');
                        secondLine = words.slice(mid).join(' ');
                      }

                      return (
                        <g>
                          <text x={insideX} y={insideY} fill="#ffffff" textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={800}>
                            {p.value}
                          </text>
                          <text x={outsideX} y={outsideY} fill="#111827" textAnchor={outsideX > p.cx ? 'start' : 'end'} dominantBaseline="central" fontSize={7.5} fontWeight={500}>
                            {secondLine ? (
                              <>
                                <tspan x={outsideX} dy="-4">{firstLine}</tspan>
                                <tspan x={outsideX} dy="10">{secondLine}</tspan>
                              </>
                            ) : (
                              <tspan x={outsideX} dy="0">{firstLine}</tspan>
                            )}
                          </text>
                        </g>
                      );
                    }}
                  >
                    {dataEvaluadores.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={P3_PALETTE[index % P3_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Gráfica 5 — Distribución de Evaluaciones */}
        <div className="flex flex-col">
          <ChartCard
            title="Distribución de Evaluaciones"
            loading={loadingGlobal}
            empty={!loadingGlobal && dataDistribucion.length === 0}
          >
            <div className="flex-1 w-full flex flex-col">
              <ResponsiveContainer width="100%" height={206}>
                <PieChart>
                  <Pie
                    data={dataDistribucion}
                    dataKey="total"
                    nameKey="set_nombre"
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={55}
                    paddingAngle={4}
                    labelLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                    label={(p: any) => {
                      const RADIAN = Math.PI / 180;
                      // Número dentro
                      const insideRadius = p.innerRadius + (p.outerRadius - p.innerRadius) / 2;
                      const insideX = p.cx + insideRadius * Math.cos(-p.midAngle * RADIAN);
                      const insideY = p.cy + insideRadius * Math.sin(-p.midAngle * RADIAN);

                      // Texto fuera
                      const outsideRadius = p.outerRadius + 12;
                      const outsideX = p.cx + outsideRadius * Math.cos(-p.midAngle * RADIAN);
                      const outsideY = p.cy + outsideRadius * Math.sin(-p.midAngle * RADIAN);

                      const words = String(p.name).split(' ');
                      let firstLine = p.name;
                      let secondLine = '';
                      if (words.length > 1) {
                        const mid = Math.ceil(words.length / 2);
                        firstLine = words.slice(0, mid).join(' ');
                        secondLine = words.slice(mid).join(' ');
                      }

                      return (
                        <g>
                          <text x={insideX} y={insideY} fill="#ffffff" textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={800}>
                            {p.value}
                          </text>
                          <text x={outsideX} y={outsideY} fill="#111827" textAnchor={outsideX > p.cx ? 'start' : 'end'} dominantBaseline="central" fontSize={7.5} fontWeight={500}>
                            {secondLine ? (
                              <>
                                <tspan x={outsideX} dy="-4">{firstLine}</tspan>
                                <tspan x={outsideX} dy="10">{secondLine}</tspan>
                              </>
                            ) : (
                              <tspan x={outsideX} dy="0">{firstLine}</tspan>
                            )}
                          </text>
                        </g>
                      );
                    }}
                  >
                    {dataDistribucion.map((entry, index) => (
                      <Cell key={`cell-dist-${index}`} fill={getColorForSet(entry.set_nombre)} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip unit="evaluaciones" />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Fila 3: Preguntas con mayor falla */}
      <div className="grid grid-cols-1 gap-6">
        <ChartCard
          title="Preguntas con Mayor Tasa de Fallo"
          loading={!modoGlobal && loadingBySet}
          empty={!modoGlobal && !loadingBySet && dataFallas.length === 0}
        >
          {modoGlobal ? (
            <div className="flex flex-col items-center justify-center min-h-[220px] text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#2b3f64]/5 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#2b3f64]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-400">No disponible en modo Global</p>
              <p className="text-xs text-gray-300 max-w-[220px] leading-relaxed">
                Selecciona una meta específica para ver las preguntas con mayor tasa de fallo
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {fallasVisibles.filter(f => f.porcentaje_no != null).map((falla, i) => (
                <div key={falla.pregunta_id} className="flex items-start gap-3 group">
                  {/* Rank badge */}
                  <div
                    className="w-5 h-5 shrink-0 rounded-md flex items-center justify-center text-[8px] font-extrabold mt-0.5"
                    style={{ backgroundColor: `${BRAND}10`, color: BRAND }}
                  >
                    {i + 1}
                  </div>
                  {/* Bar + texto */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] text-gray-700 font-medium leading-snug mb-1 line-clamp-2">
                      {falla.texto}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${falla.porcentaje_no}%`,
                            backgroundColor: colorForValue(100 - falla.porcentaje_no),
                          }}
                        />
                      </div>
                      <span
                        className="text-[9px] font-bold shrink-0 w-12 text-right"
                        style={{ color: colorForValue(100 - falla.porcentaje_no) }}
                      >
                        {falla.porcentaje_no.toFixed(1)}% NO
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Ver todas */}
              {dataFallas.length > 5 && (
                <button
                  onClick={() => setMostrarTodasFallas((v) => !v)}
                  className="mt-1 self-start text-[9px] font-sans font-extrabold uppercase tracking-wider text-blue-manhattan-1 hover:text-[#02163A]/70 flex items-center gap-1 transition-colors"
                >
                  {mostrarTodasFallas ? (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                      </svg>
                      Ver menos
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                      Ver todas ({dataFallas.length} preguntas)
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
