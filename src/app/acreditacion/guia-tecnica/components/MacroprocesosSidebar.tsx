"use client";

import React from "react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import type { Macroproceso } from "./types";

interface MacroprocesosSidebarProps {
  macroprocesos: Macroproceso[];
  selectedMacroId: string;
  handleMacroprocesoClick: (macro: Macroproceso) => void;
  isPending: boolean;
}

export default function MacroprocesosSidebar({
  macroprocesos,
  selectedMacroId,
  handleMacroprocesoClick,
  isPending,
}: MacroprocesosSidebarProps) {
  return (
    <aside className="col-span-1 bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden border border-gray-200">
      
      {/* Cabecera del Sidebar con Isotipo */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2 border-b border-gray-100 mb-2 shrink-0">
        <svg className="w-3.5 h-3.5 text-[#1E50EF] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span className="font-sans font-extrabold text-black text-[9px] uppercase tracking-wider">
          Macroprocesos
        </span>
      </div>

      <OverlayScrollbarsComponent
        element="nav"
        options={{ scrollbars: { autoHide: "scroll", theme: "os-theme-dark" } }}
        defer
        className="flex-1 py-1 px-3"
      >
        {macroprocesos.map((macro) => {
          const isActive = macro.id === selectedMacroId;
          return (
            <button
              key={macro.id}
              onClick={() => handleMacroprocesoClick(macro)}
              disabled={isPending}
              className={`w-full text-left flex flex-row items-stretch gap-3 px-3 py-2 rounded-xl mb-1.5 transition-all duration-200 group ${isActive
                ? "border border-[#DEEBF7] shadow-md bg-[#DEEBF7] text-[#02163a] scale-[1.02]"
                : "text-black/60 hover:text-black hover:bg-black/5"
                }`}
            >
              {/* Recuadro del número */}
              <div
                className={`flex items-center justify-center shrink-0 w-8 rounded-lg text-[9px] font-extrabold transition-colors duration-200 shadow-sm ${
                  isActive
                    ? "bg-[#1E50EF] text-white"
                    : "bg-gray-200 text-gray-900"
                }`}
              >
                {macro.orden}
              </div>

              {/* Textos */}
              <div className="flex flex-col justify-center min-w-0">
                <span className={`font-bold text-[9px] tracking-wide mb-0.5 truncate ${isActive ? "text-[#02163a] font-extrabold" : "text-black/90 group-hover:text-black"}`}>
                  {macro.codigo}
                </span>
                <span className={`text-[7px] leading-snug line-clamp-2 ${isActive ? "text-[#02163a]/80" : "text-black/60 group-hover:text-black/80"}`}>
                  {macro.nombre}
                </span>
              </div>
            </button>
          );
        })}
      </OverlayScrollbarsComponent>

      <div className="px-5 py-3 border-t border-gray-100">
        <p className="text-[9px] text-black/40">Sistema de Calidad · Aviva</p>
      </div>
    </aside>
  );
}
