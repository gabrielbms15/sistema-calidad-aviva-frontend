import React from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ProcesosGrid from "@/components/acreditacion/ProcesosGrid";

export default async function AcreditacionPage() {
  const { data: procesos, error: pError } = await supabase
    .from("proceso_acreditacion")
    .select("id, anio, fecha_inicio, sede(id, nombre)")
    .order("fecha_inicio", { ascending: true });

  const { count: countSedes } = await supabase
    .from("sede")
    .select("*", { count: "exact", head: true });

  const { data: criterioResp } = await supabase
    .from("criterio_responsable")
    .select("responsable_id");

  const uniqueResponsablesCount = new Set(
    criterioResp?.map((r) => r.responsable_id) || []
  ).size;

  return (
    <div className="flex flex-col h-full font-avenir gap-4">
      {/* Cabecera */}
      <header className="w-full flex items-end justify-between shrink-0">
        <div className="flex items-center gap-3.5">
          <span className="text-4xl leading-none drop-shadow-sm">🎖️</span>
          <div className="flex flex-col justify-center">
            <h1 className="text-gray-900 font-sans text-[20px] font-bold tracking-tight leading-none">
              Acreditación Nacional
            </h1>
            <p className="text-gray-500 text-[12px] mt-1.5 leading-snug max-w-2xl">
              Gestión integral de las solicitudes, evidencias y autoevaluaciones de los criterios de acreditación.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-3.5 py-2 bg-gray-100 text-gray-700 border border-transparent text-[9px] font-extrabold font-sans uppercase tracking-wider rounded-lg shadow-sm hover:bg-gray-200 transition-colors flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Sede
          </button>
          <button className="px-3.5 py-2 bg-[#1E50EF] text-white border border-transparent text-[9px] font-extrabold font-sans uppercase tracking-wider rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Proceso de Acreditación
          </button>
        </div>
      </header>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        {/* Card 1: Sedes */}
        <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-blue-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider truncate">Cantidad de Sedes</span>
            <span className="text-xl font-black text-gray-800 leading-none my-1">{countSedes || 0}</span>
            <span className="text-[9px] font-semibold text-gray-500">Registradas</span>
          </div>
        </div>

        {/* Card 2: Criterios */}
        <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-purple-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider truncate">Criterios de acreditación</span>
            <span className="text-xl font-black text-gray-800 leading-none my-1">307</span>
            <span className="text-[9px] font-semibold text-gray-500">por cumplir</span>
          </div>
        </div>

        {/* Card 3: Entregables */}
        <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-amber-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider truncate">Entregables</span>
            <span className="text-xl font-black text-gray-800 leading-none my-1">444</span>
            <span className="text-[9px] font-semibold text-gray-500">por recopilar</span>
          </div>
        </div>

        {/* Card 4: Responsables */}
        <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-green-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider truncate">Responsables</span>
            <span className="text-xl font-black text-gray-800 leading-none my-1">{uniqueResponsablesCount}</span>
            <span className="text-[9px] font-semibold text-gray-500">Activos</span>
          </div>
        </div>
      </div>

      <div className="w-full flex flex-col items-start shrink-0 mt-4 mb-1 pl-2">
        <h2 className="text-gray-800 text-[18px] font-black tracking-tight flex items-center gap-2">
          Procesos de acreditación activos
        </h2>
      </div>

      {/* Contenedor Cuadrado Grande para Procesos */}
      <div className="flex-1 bg-white rounded-[24px] shadow-lg border border-gray-200 overflow-hidden flex flex-col p-8 mb-3">
        {pError ? (
          <div className="text-red-500">Error cargando procesos.</div>
        ) : (
          <ProcesosGrid procesos={procesos as any} />
        )}
      </div>
    </div>
  );
}

