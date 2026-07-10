import React from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default async function ProcesoDashboardPage({
  params,
}: {
  params: Promise<{ procesoId: string }>;
}) {
  const { procesoId } = await params;

  type ProcesoData = {
    id: string;
    anio: number;
    sede: { id: string; nombre: string } | null;
  };

  const result = await supabase
    .from("proceso_acreditacion")
    .select("id, anio, sede(id, nombre)")
    .eq("id", procesoId)
    .single();

  const proceso = result.data as ProcesoData | null;

  const cards = [
    { 
      title: "Recopilación de evidencias", 
      description: "Sube, organiza y adjunta los documentos y archivos solicitados como sustento.",
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", // Document icon
      href: `/acreditacion/${procesoId}/recopilacion-evidencias` 
    },
    { 
      title: "Asignación de fechas", 
      description: "Establece plazos y envía recordatorios para la entrega de documentos.",
      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", // Calendar icon
      href: `/acreditacion/${procesoId}/solicitud-documentos` 
    },
    { 
      title: "Autoevaluación", 
      description: "Evalúa el cumplimiento de los criterios con base en la evidencia adjunta.",
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", // Check circle icon
      href: `/acreditacion/${procesoId}/autoevaluacion` 
    },
  ];

  return (
    <div className="flex flex-col h-full font-avenir bg-white rounded-[24px] shadow-lg border border-gray-200 overflow-hidden">
      <div className="p-8 flex flex-col h-full">
        {/* Cabecera */}
        <header className="mb-8 shrink-0">
          <h1 className="text-gray-900 font-sans text-[20px] font-bold tracking-tight leading-none">
            Sede {proceso?.sede?.nombre}
          </h1>
          <p className="text-gray-500 text-[12px] mt-1.5 leading-snug max-w-2xl">
            Proceso de Acreditación {proceso?.anio}
          </p>
        </header>

        {/* Lista Vertical */}
        <div className="flex flex-col gap-4 overflow-y-auto pb-6 pr-2 custom-scrollbar">
          {cards.map((card, index) => {
            const inner = (
              <>
                <div className="w-14 h-14 bg-white text-[#1E50EF] rounded-2xl flex items-center justify-center group-hover:bg-[#1E50EF] group-hover:text-white transition-colors duration-300 shrink-0 border border-blue-100/50 group-hover:border-[#1E50EF] shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                  </svg>
                </div>
                
                <div className="ml-5 flex-1 flex flex-col justify-center">
                  <h3 className="text-[16px] font-bold text-gray-800 group-hover:text-[#1E50EF] transition-colors leading-tight">
                    {card.title}
                  </h3>
                  <p className="text-gray-500 text-[13px] mt-1">
                    {card.description}
                  </p>
                </div>

                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-300 group-hover:bg-[#1E50EF]/10 group-hover:text-[#1E50EF] transition-colors duration-300 shadow-sm border border-blue-50">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </>
            );

            const className = "group flex flex-row items-center p-5 bg-[#F5F8FF] hover:bg-[#EDF3FF] rounded-[20px] transition-all duration-300 border border-transparent hover:border-blue-100 hover:-translate-y-1";

            return card.href ? (
              <Link key={index} href={card.href} className={className}>
                {inner}
              </Link>
            ) : (
              <button key={index} className={className}>
                {inner}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
