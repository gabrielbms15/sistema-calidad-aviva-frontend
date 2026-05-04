"use client";

import { useState, useTransition } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";

/* Types */
interface Macroproceso {
  id: string;
  codigo: string;
  nombre: string;
  orden: number;
}

interface Codigo {
  id: string;
  codigo: string;
  descripcion: string;
  orden: number;
}

interface Criterio {
  id: string;
  codigo_criterio: string;
  descripcion: string;
  codigo_id: string;
  fuente_0?: string;
  fuente_1?: string;
  fuente_2?: string;
}

interface Props {
  macroprocesos: Macroproceso[];
  macroprocesoInicialId: string;
  codigosIniciales: Codigo[];
  criteriosIniciales: Criterio[];
}

/* Component */
export default function GuiaTecnicaView({
  macroprocesos,
  macroprocesoInicialId,
  codigosIniciales,
  criteriosIniciales,
}: Props) {
  const [selectedMacroId, setSelectedMacroId] = useState(macroprocesoInicialId);
  const [codigos, setCodigos] = useState<Codigo[]>(codigosIniciales);
  const [criterios, setCriterios] = useState<Criterio[]>(criteriosIniciales);
  const [selectedCodigoId, setSelectedCodigoId] = useState<string | null>(null);
  const [isVerificadoresMode, setIsVerificadoresMode] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleMacroprocesoClick = (macro: Macroproceso) => {
    if (macro.id === selectedMacroId) return;
    startTransition(async () => {
      setSelectedMacroId(macro.id);
      setSelectedCodigoId(null);

      const { data: nuevosCodigos } = await supabase
        .from("codigo")
        .select("id,codigo,descripcion,orden")
        .eq("macroproceso_id", macro.id)
        .order("orden", { ascending: true });

      const codigosResult = nuevosCodigos ?? [];
      setCodigos(codigosResult);

      const ids = codigosResult.map((c) => c.id);
      if (ids.length > 0) {
        const { data: nuevosCriterios } = await supabase
          .from("criterio")
          .select("id,codigo_criterio,descripcion,codigo_id,fuente_0,fuente_1,fuente_2")
          .in("codigo_id", ids);
        setCriterios(nuevosCriterios ?? []);
      } else {
        setCriterios([]);
      }
    });
  };

  const criteriosFiltrados = selectedCodigoId
    ? criterios.filter((c) => c.codigo_id === selectedCodigoId)
    : criterios;

  const macroActual = macroprocesos.find((m) => m.id === selectedMacroId);

  return (
    <div className="flex flex-col h-full items-center justify-center font-sans">
      {/* Header above the table */}
      <div className="w-full mb-6 flex flex-col items-start">
        <h1 className="text-gray-900 text-3xl font-extrabold leading-snug drop-shadow-sm">
          Guía Técnica del Evaluador
        </h1>
      </div>

      {/* Main Table Container (Rounded & Shadow) */}
      <div className="w-full flex flex-col h-[75vh] min-h-[500px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">

        {/* Top bar (Header now full width) */}
        <div className="bg-[#272729] border-b border-white/10 flex flex-col shrink-0">
          <div className="px-8 py-4 flex items-center justify-between">
            <h2 className="text-white text-lg leading-tight">
              <span className="font-bold">Macroproceso {macroActual?.orden}</span>
              <span className="ml-20 mr-8 text-white/30 font-light">|</span>
              <span className="font-light text-white/90">{macroActual?.nombre}</span>
            </h2>

            {/* Selector de codigo */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50 font-medium">Estándar:</span>
              <div className="relative">
                <select
                  value={selectedCodigoId ?? ""}
                  onChange={(e) => setSelectedCodigoId(e.target.value || null)}
                  className="appearance-none bg-white border border-transparent text-gray-900 text-sm rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-white/20 cursor-pointer transition-all w-32 font-medium"
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

        {/* Body Container (Sidebar + Content) */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 shrink-0 bg-[#3d557c] flex flex-col border-r border-white/5">
            <OverlayScrollbarsComponent
              element="nav"
              options={{ scrollbars: { autoHide: "scroll", theme: "os-theme-dark" } }}
              defer
              className="flex-1 py-3 px-4"
            >
              {macroprocesos.map((macro) => {
                const isActive = macro.id === selectedMacroId;
                return (
                  <button
                    key={macro.id}
                    onClick={() => handleMacroprocesoClick(macro)}
                    disabled={isPending}
                    className={`w-full text-left flex flex-col px-4 py-3 rounded-xl mb-2 transition-all duration-200 group ${isActive
                      ? "border border-white/30 shadow-2xl/20 inset-shadow-sm inset-shadow-white/30 backdrop-blur-md bg-white/5 text-white scale-[1.02]"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5"
                      }`}
                  >
                    <span className={`font-bold text-sm tracking-wide mb-1 ${isActive ? "text-white drop-shadow-md" : "text-white"}`}>
                      {macro.orden}. {macro.codigo}
                    </span>
                    <span className={`text-[11px] leading-snug ${isActive ? "text-white" : "text-white/70"}`}>
                      {macro.nombre}
                    </span>
                  </button>
                );
              })}
            </OverlayScrollbarsComponent>

            <div className="px-5 py-4 border-t border-white/5">
              <p className="text-[10px] text-white/20">Sistema de Calidad · Aviva</p>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 flex flex-col min-w-0 bg-[#f8f8f8] mac-scrollbar">
            {/* Definition of selected code (Subheader) */}
            {selectedCodigoId && (() => {
              const selectedCodigoObj = codigos.find(c => c.id === selectedCodigoId);
              return selectedCodigoObj ? (
                <div className="bg-white px-8 py-4 border-b border-gray-200 text-sm text-gray-600 shadow-sm animate-in fade-in slide-in-from-top-1 duration-300">
                  <span className="font-bold text-gray-900 mr-2">
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
              className="flex-1 p-8"
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
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-[120px_1fr] border-b border-gray-200 bg-gray-200/80">
                    <div className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Criterio
                    </div>
                    <div className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-l border-gray-200 flex items-center justify-between">
                      <span>{isVerificadoresMode ? "Verificadores" : "Descripcion"}</span>
                      <button
                        onClick={() => setIsVerificadoresMode(!isVerificadoresMode)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isVerificadoresMode ? 'bg-blue-600' : 'bg-gray-400'
                          }`}
                      >
                        <span
                          className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                          style={{ transform: isVerificadoresMode ? 'translateX(18px)' : 'translateX(3px)' }}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Table rows */}
                  {criteriosFiltrados.length === 0 ? (
                    <div className="flex items-center justify-center py-20 text-gray-300 text-sm">
                      No hay criterios para este filtro.
                    </div>
                  ) : (
                    criteriosFiltrados.map((criterio, i) => (
                      <div
                        key={criterio.id}
                        className={`grid grid-cols-[120px_1fr] hover:bg-blue-50/30 transition-colors duration-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-200/60"
                          } ${i !== 0 ? "border-t border-gray-100" : ""}`}
                      >
                        <div className="px-5 py-4 flex items-center">
                          <span className="font-mono text-xs font-bold text-gray-900">
                            {criterio.codigo_criterio}
                          </span>
                        </div>
                        <div className="px-5 py-4 border-l border-gray-100 flex items-center">
                          {!isVerificadoresMode ? (
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {criterio.descripcion}
                            </p>
                          ) : (
                            <ul className="text-sm text-gray-600 leading-relaxed space-y-2 w-full">
                              {criterio.fuente_0 && (
                                <li className="flex items-start gap-2">
                                  <div className="w-2 h-2 rounded-full bg-red-400 shrink-0 mt-1.5" />
                                  <span>{criterio.fuente_0}</span>
                                </li>
                              )}
                              {criterio.fuente_1 && (
                                <li className="flex items-start gap-2">
                                  <div className="w-2 h-2 rounded-full bg-yellow-400 shrink-0 mt-1.5" />
                                  <span>{criterio.fuente_1}</span>
                                </li>
                              )}
                              {criterio.fuente_2 && (
                                <li className="flex items-start gap-2">
                                  <div className="w-2 h-2 rounded-full bg-green-400 shrink-0 mt-1.5" />
                                  <span>{criterio.fuente_2}</span>
                                </li>
                              )}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Stats bar */}
              {!isPending && (
                <div className="flex items-center justify-between mt-4 px-1">
                  <p className="text-xs text-gray-400">
                    Mostrando{" "}
                    <span className="font-medium text-gray-600">{criteriosFiltrados.length}</span>{" "}
                    de{" "}
                    <span className="font-medium text-gray-600">{criterios.length}</span> criterios
                  </p>
                  {selectedCodigoId && (
                    <button
                      onClick={() => setSelectedCodigoId(null)}
                      className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                    >
                      Limpiar filtro x
                    </button>
                  )}
                </div>
              )}
            </OverlayScrollbarsComponent>
          </main>
        </div>
      </div>

      {/* Footer / Back link */}
      <div className="w-full mt-4 flex justify-end">
        <Link
          href="/acreditacion"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 text-sm transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a Acreditación
        </Link>
      </div>
    </div>
  );
}
