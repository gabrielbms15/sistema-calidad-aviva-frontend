import React from "react";
import type { Macroproceso, Codigo } from "./types";

interface GuiaHeaderProps {
  macroActual?: Macroproceso;
  codigos: Codigo[];
  selectedCodigoId: string | null;
  setSelectedCodigoId: (id: string | null) => void;
}

export default function GuiaHeader({
  macroActual,
  codigos,
  selectedCodigoId,
  setSelectedCodigoId,
}: GuiaHeaderProps) {
  return (
    <div className="bg-[#272729] rounded-2xl shadow-lg border border-white/10 flex flex-col shrink-0">
      <div className="px-6 py-2 flex items-center justify-between">
        <h2 className="text-white text-[10px] leading-tight">
          <span className="font-bold">Macroproceso {macroActual?.orden}</span>
          <span className="ml-16 mr-6 text-white/30 font-light">|</span>
          <span className="font-light text-white/90">{macroActual?.nombre}</span>
        </h2>

        {/* Selector de codigo */}
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-white/50 font-medium">Estándar:</span>
          <div className="relative">
            <select
              value={selectedCodigoId ?? ""}
              onChange={(e) => setSelectedCodigoId(e.target.value || null)}
              className="appearance-none bg-white border border-transparent text-gray-900 text-[8px] rounded-lg pl-2 pr-6 py-0.5 focus:outline-none focus:ring-2 focus:ring-white/20 cursor-pointer transition-all w-24 font-medium"
            >
              <option value="">Todos</option>
              {codigos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
