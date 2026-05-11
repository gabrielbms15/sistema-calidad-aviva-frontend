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
    { title: "Recopilación de Evidencias y Armado de Expediente", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", href: `/acreditacion/${procesoId}/recopilacion-evidencias` },
    { title: "Solicitud de Documentos a Responsables", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", href: `/acreditacion/${procesoId}/solicitud-documentos` },
    { title: "Autoevaluaciones", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", href: `/acreditacion/${procesoId}/autoevaluacion` },
  ];

  return (
    <div className="flex flex-col h-full">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/acreditacion"
            className="flex items-center gap-1 text-gray-400 hover:text-[#3d537e] text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al Inicio
          </Link>
        </div>
        <h1 className="text-4xl font-extrabold text-gray-800 drop-shadow-sm">
          Sede {proceso?.sede?.nombre}
        </h1>
        <p className="text-gray-600 mt-2 text-lg">
          Proceso de Acreditación {proceso?.anio}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
        {cards.map((card, index) => {
          const inner = (
            <>
              {/* Background decoration */}
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

          const className = "group relative flex flex-col items-center justify-center p-8 bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:-translate-y-2 overflow-hidden";

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
  );
}
