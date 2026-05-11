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

  const cards = [
    { title: "Guia Técnica del Evaluador", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", href: "/acreditacion/guia-tecnica" },
    { title: "Definición de Requerimientos y Responsables", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01", href: "/acreditacion/definir-requerimientos" },
    { title: "Resultados y Tableros de Control", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", href: "/acreditacion/resultados" },
  ];

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

      {/* Acciones Globales */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <svg className="w-6 h-6 text-[#3d537e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Módulos Corporativos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cards.map((card, index) => {
            const inner = (
              <>
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#3d537e]/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
                <div className="w-16 h-16 bg-[#3d537e]/10 text-[#3d537e] rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#3d537e] group-hover:text-white transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-center text-gray-800 group-hover:text-[#3d537e] transition-colors">
                  {card.title}
                </h3>
                <div className="mt-4 w-10 h-1 bg-gray-100 rounded-full group-hover:w-20 group-hover:bg-[#3d537e] transition-all duration-300" />
              </>
            );

            return (
              <Link key={index} href={card.href} className="group relative flex flex-col items-center justify-center p-8 bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:-translate-y-2 overflow-hidden">
                {inner}
              </Link>
            );
          })}
        </div>
      </div>

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

