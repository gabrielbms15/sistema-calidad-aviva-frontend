"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  getCumplimientoGlobal,
  getCumplimientoUpss,
  getCumplimientoGrupoProfesional,
  getFallasPorPregunta,
} from "@/app/metas-internacionales/actions";
import {
  BarChart,
  Bar,
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
}

interface CumplimientoGlobalSet {
  set_nombre: string;
  set_orden: number;
  porcentaje_cumplimiento: number;
}

interface CumplimientoPorGrupo {
  grupo_profesional: string;
  porcentaje_cumplimiento: number;
}

interface FallaPorPregunta {
  pregunta_id: string;
  texto: string;
  orden: number;
  total_si: number;
  total_no: number;
  porcentaje_no: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BRAND = "#2b3f64";
const PALETTE = [
  "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899",
  "#f59e0b", "#10b981", "#0ea5e9", "#f97316",
  "#14b8a6", "#a855f7", "#ef4444", "#84cc16",
  "#06b6d4", "#d946ef",
];

function colorForValue(pct: number): string {
  if (pct >= 90) return "#10b981";
  if (pct >= 75) return "#f59e0b";
  return "#ef4444";
}

function pctLabel(value: unknown) {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return isNaN(n) ? "" : `${n.toFixed(1)}%`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  children,
  loading,
  empty,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  loading: boolean;
  empty: boolean;
}) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
      <div>
        <h2 className="text-base font-bold text-gray-800">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[220px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#2b3f64]/20 border-t-[#2b3f64] rounded-full animate-spin" />
            <span className="text-xs text-gray-400">Cargando datos…</span>
          </div>
        </div>
      ) : empty ? (
        <div className="flex-1 flex items-center justify-center min-h-[220px]">
          <div className="flex flex-col items-center gap-2 text-center">
            <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm text-gray-400 font-medium">Sin datos aún para este set</p>
            <p className="text-xs text-gray-300">Los datos aparecerán cuando haya evaluaciones completadas</p>
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
    <div className="bg-white border border-gray-100 rounded-2xl shadow-xl px-4 py-3">
      <p className="text-xs text-gray-500 mb-1 font-medium">{label}</p>
      <p className="text-lg font-bold text-gray-800">{payload[0].value.toFixed(1)}%</p>
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

  const [mostrarTodasFallas, setMostrarTodasFallas] = useState(false);

  // Carga global (una sola vez)
  const cargarDatosGlobales = useCallback(async () => {
    if (!proceso) return;
    setLoadingGlobal(true);
    const { data } = await getCumplimientoGlobal(proceso.id);
    setDataGlobal((data ?? []).sort(
      (a: CumplimientoGlobalSet, b: CumplimientoGlobalSet) => a.set_orden - b.set_orden
    ));
    setLoadingGlobal(false);
  }, [proceso]);

  // Carga por set (al montar y al cambiar selector)
  const cargarDatosPorSet = useCallback(async (setId: string) => {
    if (!proceso) return;
    setLoadingBySet(true);
    setMostrarTodasFallas(false);

    const [resUpss, resGrupo, resFallas] = await Promise.all([
      getCumplimientoUpss(setId, proceso.id),
      getCumplimientoGrupoProfesional(setId, proceso.id),
      getFallasPorPregunta(setId, proceso.id),
    ]);

    setDataUpss(resUpss.data ?? []);
    setDataGrupo(resGrupo.data ?? []);
    setDataFallas(resFallas.data ?? []);
    setLoadingBySet(false);
  }, [proceso]);

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-700">No hay proceso activo</h2>
        <p className="text-sm text-gray-400 max-w-sm">
          No se encontró ningún proceso de prevalencia con estado <strong>activo</strong>.
          Crea o activa un proceso desde el panel de administración para visualizar los datos.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Proceso info banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#2b3f64]/5 border border-[#2b3f64]/10 rounded-2xl px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-semibold text-[#2b3f64]">{proceso.nombre}</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500">{proceso.sede?.nombre}</span>
        </div>
        <span className="text-xs text-gray-400">
          {new Date(proceso.fecha).toLocaleDateString("es-PE", {
            day: "numeric", month: "long", year: "numeric"
          })}
        </span>
      </div>

      {/* Selector de set */}
      <div className="flex flex-wrap gap-2">
        {sets.map((s) => (
          <button
            key={s.id}
            onClick={() => setSetSeleccionado(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              setSeleccionado?.id === s.id
                ? "bg-[#2b3f64] text-white shadow-md shadow-[#2b3f64]/20"
                : "bg-white text-gray-600 border border-gray-200 hover:border-[#2b3f64]/30 hover:text-[#2b3f64]"
            }`}
          >
            {s.nombre}
          </button>
        ))}
      </div>

      {/* Fila 1: Gráficas 1 y 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfica 1 — Cumplimiento por UPSS */}
        <ChartCard
          title="Cumplimiento por UPSS"
          subtitle={setSeleccionado?.nombre}
          loading={loadingBySet}
          empty={!loadingBySet && dataUpss.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={dataUpss}
              layout="vertical"
              margin={{ top: 4, right: 60, left: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="upss"
                width={110}
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f3f4f6" }} />
              <Bar dataKey="porcentaje_cumplimiento" radius={[0, 6, 6, 0]} maxBarSize={18}>
                {dataUpss.map((entry, i) => (
                  <Cell key={i} fill={colorForValue(entry.porcentaje_cumplimiento)} />
                ))}
                <LabelList
                  dataKey="porcentaje_cumplimiento"
                  position="right"
                  formatter={pctLabel}
                  style={{ fontSize: 11, fontWeight: 600, fill: "#374151" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Gráfica 3 — Cumplimiento por grupo profesional */}
        <ChartCard
          title="Cumplimiento por Grupo Profesional"
          subtitle={setSeleccionado?.nombre}
          loading={loadingBySet}
          empty={!loadingBySet && dataGrupo.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={dataGrupo}
              layout="vertical"
              margin={{ top: 4, right: 60, left: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="grupo_profesional"
                width={130}
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f3f4f6" }} />
              <Bar dataKey="porcentaje_cumplimiento" radius={[0, 6, 6, 0]} maxBarSize={18}>
                {dataGrupo.map((entry, i) => (
                  <Cell key={i} fill={colorForValue(entry.porcentaje_cumplimiento)} />
                ))}
                <LabelList
                  dataKey="porcentaje_cumplimiento"
                  position="right"
                  formatter={pctLabel}
                  style={{ fontSize: 11, fontWeight: 600, fill: "#374151" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Gráfica 2 — Cumplimiento global por set (ancho completo) */}
      <ChartCard
        title="Cumplimiento Global por Set"
        subtitle="Todos los sets del proceso — actualización única al cargar"
        loading={loadingGlobal}
        empty={!loadingGlobal && dataGlobal.length === 0}
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={dataGlobal}
            margin={{ top: 16, right: 24, left: 0, bottom: 8 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="set_nombre"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
              interval={0}
              // Wraps long labels
              height={50}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f3f4f6" }} />
            <Bar dataKey="porcentaje_cumplimiento" radius={[6, 6, 0, 0]} maxBarSize={52}>
              {dataGlobal.map((entry, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
              <LabelList
                dataKey="porcentaje_cumplimiento"
                position="top"
                formatter={pctLabel}
                style={{ fontSize: 11, fontWeight: 700, fill: "#374151" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Listado 4 — Top preguntas con mayor falla */}
      <ChartCard
        title="Preguntas con Mayor Tasa de Fallo"
        subtitle={setSeleccionado ? `${setSeleccionado.nombre} — ordenadas de mayor a menor falla` : undefined}
        loading={loadingBySet}
        empty={!loadingBySet && dataFallas.length === 0}
      >
        <div className="flex flex-col gap-3">
          {fallasVisibles.map((falla, i) => (
            <div key={falla.pregunta_id} className="flex items-start gap-4 group">
              {/* Rank badge */}
              <div
                className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold mt-0.5"
                style={{ backgroundColor: `${BRAND}10`, color: BRAND }}
              >
                {i + 1}
              </div>
              {/* Bar + texto */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 font-medium leading-snug mb-1.5 line-clamp-2">
                  {falla.texto}
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${falla.porcentaje_no}%`,
                        backgroundColor: colorForValue(100 - falla.porcentaje_no),
                      }}
                    />
                  </div>
                  <span
                    className="text-sm font-bold shrink-0 w-14 text-right"
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
              className="mt-2 self-start text-xs font-semibold text-[#2b3f64] hover:text-[#1e2d4a] flex items-center gap-1 transition-colors"
            >
              {mostrarTodasFallas ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Ver menos
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Ver todas ({dataFallas.length} preguntas)
                </>
              )}
            </button>
          )}
        </div>
      </ChartCard>
    </div>
  );
}
