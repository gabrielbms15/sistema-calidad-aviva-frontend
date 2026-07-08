import React from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ProcesosGrid from "@/components/acreditacion/ProcesosGrid";

export default async function AcreditacionPage() {
  const { count, error: cError } = await supabase
    .from('criterio')
    .select('*', { count: 'exact', head: true });

  const { data: procesos, error: pError } = await supabase
    .from("proceso_acreditacion")
    .select("id, anio, fecha_inicio, sede(id, nombre)")
    .order("fecha_inicio", { ascending: true });


  return (
    <div className="flex flex-col h-full">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold text-gray-800 drop-shadow-sm">Acreditación Nacional</h1>
        <p className="text-gray-600 mt-2 text-lg">
          Gestión y seguimiento del proceso de acreditación corporativo.
          {cError ? (
            <span className="text-red-500 ml-2">Error cargando criterios</span>
          ) : (
            <span className="bg-[#3d537e]/10 text-[#3d537e] px-3 py-1 rounded-full text-sm font-medium ml-4">
              {count} Criterios Totales
            </span>
          )}
        </p>
      </header>


      {/* Selector de Procesos */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <svg className="w-6 h-6 text-[#3d537e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Sedes en Evaluación
        </h2>
        <p className="text-gray-500 mb-6">
          Selecciona una sede para gestionar la Recopilación de Evidencias, Solicitud de Documentos y Resultados.
        </p>
        
        {pError ? (
          <div className="text-red-500">Error cargando procesos.</div>
        ) : (
          <ProcesosGrid procesos={procesos as any} />
        )}
      </div>
    </div>
  );
}

