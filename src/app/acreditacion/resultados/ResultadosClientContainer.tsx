"use client";

import { useState } from "react";
import ResultadosChart, {
  ProcesoOption,
  MacroprocesoData,
} from "./ResultadosChart";
import ResponsablesTable, {
  ResponsableRow,
} from "./ResponsablesTable";
import EntregablesChart, {
  MacroprocesoEntregable,
} from "./EntregablesChart";
import CriteriosChart from "./CriteriosChart";
import CriteriosResponsablesTable from "./CriteriosResponsablesTable";
import EstatusChart from "./EstatusChart";

interface Props {
  procesos: ProcesoOption[];
  dataByProceso: Record<string, MacroprocesoData[]>;
  entregablesByProceso: Record<string, MacroprocesoEntregable[]>;
  responsablesByProceso: Record<string, ResponsableRow[]>;
}

export default function ResultadosClientContainer({
  procesos,
  dataByProceso,
  entregablesByProceso,
  responsablesByProceso,
}: Props) {
  const [selectedProcesoId, setSelectedProcesoId] = useState<string>(
    procesos[procesos.length - 1]?.id ?? ""
  );

  return (
    <div className="flex flex-col gap-6 pb-10 font-avenir">
      {/* Global Proceso Selector */}
      <div className="flex items-center justify-between bg-white/80 backdrop-blur-2xl rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 py-2 px-4 shrink-0 ring-1 ring-black/[0.02]">
        <div className="flex items-center gap-2">
          <span className="text-[#000000]/60 text-[9px] font-avenir-demi font-semibold uppercase tracking-wider">
            Proceso de Acreditación:
          </span>
          <div className="relative">
            <select
              id="global-proceso-selector"
              value={selectedProcesoId}
              onChange={(e) => setSelectedProcesoId(e.target.value)}
              className="appearance-none bg-black/[0.04] hover:bg-black/[0.08] text-[#000000] text-[10px] font-avenir-demi rounded-md pl-2 pr-6 py-1 focus:outline-none focus:ring-1 focus:ring-black/10 cursor-pointer font-medium border border-black/[0.08] min-w-[200px] transition-all shadow-sm"
            >
              {procesos.map((p) => (
                <option key={p.id} value={p.id} className="text-gray-900 bg-white">
                  {p.label}
                </option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Charts & Tables */}
      <div className="flex flex-col gap-6">

        {/* Fila 1: Autoevaluación & ResponsablesTable */}
        <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch lg:h-[500px]">
          <div className="w-[50%] shrink-0">
            <ResultadosChart
              procesos={procesos}
              dataByProceso={dataByProceso}
              selectedProcesoId={selectedProcesoId}
            />
          </div>
          <div className="w-[50%] shrink-0">
            <ResponsablesTable
              procesos={procesos}
              dataByProceso={responsablesByProceso}
              selectedProcesoId={selectedProcesoId}
            />
          </div>
        </div>

        {/* Fila 2: Entregables por Macroproceso (HIDDEN PER USER REQUEST) */}
        {/*
        <EntregablesChart
          procesos={procesos}
          dataByProceso={entregablesByProceso}
          selectedProcesoId={selectedProcesoId}
        />
        */}

        {/* Fila 3: Criterios por Macroproceso (HIDDEN PER USER REQUEST)
        <CriteriosChart
          procesos={procesos}
          dataByProceso={entregablesByProceso}
          selectedProcesoId={selectedProcesoId}
        />
        */}

        {/* Fila 4: Tablas 50/50 — Criterios por resp. (Criterios hidden per user request) */}
        {/*
        <div className="flex flex-col lg:flex-row gap-6 w-full items-start">
          <CriteriosResponsablesTable
            procesos={procesos}
            dataByProceso={responsablesByProceso}
            selectedProcesoId={selectedProcesoId}
          />
        </div>
        */}

        {/* Fila 5: Estatus — ancho completo */}
        <EstatusChart
          procesos={procesos}
          dataByProceso={entregablesByProceso}
          selectedProcesoId={selectedProcesoId}
        />

      </div>
    </div>
  );
}

