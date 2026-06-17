import type { Metadata } from "next";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const metadata: Metadata = {
  title: "Metas Internacionales de Seguridad del Paciente | Sistema de Calidad Aviva",
  description:
    "Selecciona una sede para visualizar el dashboard de Metas Internacionales de Seguridad del Paciente.",
};

// Íconos decorativos distintos por sede para distinguirlas visualmente
const SEDE_META: Record<string, { gradient: string; icon: string; tag: string }> = {
  "Lima Centro": {
    gradient: "from-[#2b3f64] to-[#3d5a9a]",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    tag: "Sede Central",
  },
  "Los Olivos": {
    gradient: "from-[#1a4d3a] to-[#2d7a5f]",
    icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    tag: "Sede Norte",
  },
  "San Martin de Porres": {
    gradient: "from-[#5c2d7a] to-[#8b4db8]",
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    tag: "Sede Norte 2",
  },
};

const SEDE_NOMBRES_PRIORITY = ["Lima Centro", "Los Olivos", "San Martin de Porres"];

export default async function MetasInternacionalesPage() {
  const { data: sedes, error } = await supabaseAdmin
    .from("sede")
    .select("id, nombre")
    .in("nombre", SEDE_NOMBRES_PRIORITY);

  // Ordenar según el orden predefinido
  const sedesOrdenadas = SEDE_NOMBRES_PRIORITY
    .map((nombre) => sedes?.find((s) => s.nombre === nombre))
    .filter(Boolean) as { id: string; nombre: string }[];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-[#2b3f64] flex items-center justify-center shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800 leading-tight">
              Metas Internacionales de Seguridad del Paciente
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Calidad y Seguridad del Paciente (QPS) — Selecciona una sede para ver el dashboard
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-5 py-3">
          Error al cargar las sedes. Intenta recargar la página.
        </div>
      )}

      {/* Sede cards */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-5 px-1">
          Selecciona una sede
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sedesOrdenadas.map((sede) => {
            const meta = SEDE_META[sede.nombre] ?? {
              gradient: "from-[#2b3f64] to-[#3d5a9a]",
              icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5",
              tag: "Sede",
            };

            return (
              <Link
                key={sede.id}
                href={`/metas-internacionales/${sede.id}`}
                className="group relative flex flex-col overflow-hidden rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 border border-white/10"
              >
                {/* Gradient header */}
                <div
                  className={`bg-gradient-to-br ${meta.gradient} p-8 flex flex-col gap-4 relative overflow-hidden`}
                >
                  {/* Decorative circles */}
                  <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/5 group-hover:scale-125 transition-transform duration-500" />
                  <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full bg-white/5 group-hover:scale-150 transition-transform duration-700" />

                  {/* Icon */}
                  <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-sm relative z-10 group-hover:bg-white/25 transition-colors duration-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-7 w-7 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d={meta.icon}
                      />
                    </svg>
                  </div>

                  {/* Tag */}
                  <span className="relative z-10 self-start text-[10px] font-bold uppercase tracking-widest text-white/60 bg-white/10 px-2.5 py-1 rounded-full">
                    {meta.tag}
                  </span>
                </div>

                {/* Card body */}
                <div className="bg-white flex-1 px-7 py-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 group-hover:text-[#2b3f64] transition-colors duration-200">
                      {sede.nombre}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Ver dashboard de prevalencias</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-[#2b3f64] group-hover:text-white text-gray-400 transition-all duration-300 shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
