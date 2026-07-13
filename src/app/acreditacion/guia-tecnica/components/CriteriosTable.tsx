"use client";

import React from "react";
import type { Criterio, Codigo, Macroproceso } from "./types";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";

interface CriteriosTableProps {
  macroActual?: Macroproceso;
  criteriosFiltrados: Criterio[];
  selectedCodigoId: string | null;
  codigos: Codigo[];
  totalCriterios: number;
  setSelectedCodigoId: (id: string | null) => void;
  isPending: boolean;
}

export default function CriteriosTable({
  macroActual,
  criteriosFiltrados,
  selectedCodigoId,
  codigos,
  totalCriterios,
  setSelectedCodigoId,
  isPending,
}: CriteriosTableProps) {
  return (
    <main className="flex flex-col min-w-0 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden h-full">

      {/* Cabecera integrada */}
      <div className="bg-white px-6 pt-5 pb-2 flex items-center justify-between shrink-0">
        <h2 className="text-black text-[13px] leading-tight flex items-center gap-3">
          <span className="font-sans font-extrabold text-black">Macroproceso {macroActual?.orden}</span>
          <span className="text-black/30 font-light">|</span>
          <span className="font-medium text-black">{macroActual?.nombre}</span>
        </h2>

        {/* Selector de codigo */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-black font-bold">Estándar:</span>
          <div className="relative">
            <select
              value={selectedCodigoId ?? ""}
              onChange={(e) => setSelectedCodigoId(e.target.value || null)}
              className="appearance-none bg-gray-50 border border-gray-200 text-black text-[9px] rounded-md pl-2 pr-6 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all w-24 font-medium"
            >
              <option value="">Todos</option>
              {codigos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Definition of selected code (Subheader) */}
      {selectedCodigoId && (() => {
        const selectedCodigoObj = codigos.find(c => c.id === selectedCodigoId);
        return selectedCodigoObj ? (
          <div className="bg-white px-8 py-4 border-b border-gray-200 text-[13px] text-black shadow-sm animate-in fade-in slide-in-from-top-1 duration-300">
            <span className="font-bold text-black mr-2">
              {selectedCodigoObj.codigo}:
            </span>
            {selectedCodigoObj.descripcion}
          </div>
        ) : null;
      })()}

      {/* Table area */}
      <OverlayScrollbarsComponent
        element="div"
        options={{ scrollbars: { autoHide: "scroll", theme: "os-theme-light" } }}
        defer
        className="flex-1"
      >
        {isPending ? (
          <div className="flex items-center justify-center h-48 gap-3 text-gray-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Cargando criterios...
          </div>
        ) : (
          <div className="px-6 pb-4 pt-1">
            <div className="flex flex-col border border-gray-300 rounded-xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[70px_calc(50%-80px)_calc(50%+10px)] border-b border-gray-300 bg-[#DEEBF7]">
                <div className="px-5 py-2 text-[8px] font-sans font-extrabold uppercase tracking-wider text-black text-center">
                  Criterio
                </div>
                <div className="px-5 py-2 text-[8px] font-sans font-extrabold uppercase tracking-wider text-black border-l border-gray-300 text-center">
                  Descripción
                </div>
                <div className="px-5 py-2 text-[8px] font-sans font-extrabold uppercase tracking-wider text-black border-l border-gray-300 text-center">
                  Verificadores
                </div>
              </div>

              {/* Table rows */}
              {criteriosFiltrados.length === 0 ? (
                <div className="flex items-center justify-center py-20 text-black/40 text-[11px] bg-white">
                  No hay criterios para este filtro.
                </div>
              ) : (
                criteriosFiltrados.map((criterio, i) => (
                  <div
                    key={criterio.id}
                    className={`grid grid-cols-[70px_calc(50%-80px)_calc(50%+10px)] hover:bg-blue-50/30 transition-colors duration-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-100/70"
                      } ${i !== 0 ? "border-t border-gray-300" : ""}`}
                  >
                    <div className="px-5 py-3 flex items-start mt-1">
                      <span className="font-sans text-[8px] font-extrabold text-black">
                        {criterio.codigo_criterio}
                      </span>
                    </div>
                    <div className="px-5 py-3 border-l border-gray-300 flex items-start">
                      <p className="text-[9px] font-medium text-black leading-relaxed">
                        {criterio.descripcion}
                      </p>
                    </div>
                    <div className="px-5 py-3 border-l border-gray-300 flex items-start">
                      <ul className="text-[9px] font-medium text-black leading-relaxed space-y-2 w-full">
                        {criterio.fuente_0 && (
                          <li className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5" />
                            <span>{criterio.fuente_0}</span>
                          </li>
                        )}
                        {criterio.fuente_1 && (
                          <li className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0 mt-1.5" />
                            <span>{criterio.fuente_1}</span>
                          </li>
                        )}
                        {criterio.fuente_2 && (
                          <li className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 mt-1.5" />
                            <span>{criterio.fuente_2}</span>
                          </li>
                        )}
                        {!criterio.fuente_0 && !criterio.fuente_1 && !criterio.fuente_2 && (
                          <span className="text-black/40 italic">Sin verificadores</span>
                        )}
                      </ul>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Stats bar */}
        {!isPending && (
          <div className="flex items-center justify-between px-5 py-4 bg-white border-t border-gray-100">
            <p className="text-[9px] text-black/60">
              Mostrando{" "}
              <span className="font-semibold text-black">{criteriosFiltrados.length}</span>{" "}
              de{" "}
              <span className="font-semibold text-black">{totalCriterios}</span> criterios
            </p>
            {selectedCodigoId && (
              <button
                onClick={() => setSelectedCodigoId(null)}
                className="text-[9px] text-blue-500 hover:text-blue-700 transition-colors"
              >
                Limpiar filtro x
              </button>
            )}
          </div>
        )}
      </OverlayScrollbarsComponent>
    </main>
  );
}
