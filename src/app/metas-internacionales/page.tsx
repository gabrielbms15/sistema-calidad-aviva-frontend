import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const metadata: Metadata = {
  title: "Metas Internacionales de Seguridad del Paciente | Sistema de Calidad Aviva",
  description:
    "Selecciona una sede para visualizar el dashboard de Metas Internacionales de Seguridad del Paciente.",
};

const SEDE_META: Record<
  string,
  { image: string; tag: string; accentColor: string }
> = {
  "Lima Centro": {
    image: "/LimaCentro_qps.webp",
    tag: "Sede Central",
    accentColor: "#1E50EF",
  },
  "Los Olivos": {
    image: "/LosOlivos_qps.webp",
    tag: "Sede Norte",
    accentColor: "#32CEBB",
  },
  "San Martin de Porres": {
    image: "/SanMartin_qps.webp",
    tag: "Sede Norte 2",
    accentColor: "#02163A",
  },
};

const SEDE_NOMBRES_PRIORITY = ["Lima Centro", "Los Olivos", "San Martin de Porres"];

export default async function MetasInternacionalesPage() {
  const { data: sedes, error } = await supabaseAdmin
    .from("sede")
    .select("id, nombre")
    .in("nombre", SEDE_NOMBRES_PRIORITY);

  const sedesOrdenadas = SEDE_NOMBRES_PRIORITY
    .map((nombre) => sedes?.find((s) => s.nombre === nombre))
    .filter(Boolean) as { id: string; nombre: string }[];

  return (
    <div className="flex flex-col h-full font-avenir gap-6">
      {/* Cabecera — estilo idéntico a /acreditacion */}
      <header className="w-full flex items-end justify-between shrink-0">
        <div className="flex items-center gap-3.5">
          <span className="text-4xl leading-none drop-shadow-sm">🌐</span>
          <div className="flex flex-col justify-center">
            <h1 className="text-gray-900 font-sans text-[20px] font-bold tracking-tight leading-none">
              Prácticas Organizacionales Requeridas
            </h1>
            <p className="text-gray-500 text-[12px] mt-1.5 leading-snug max-w-2xl">
              Calidad y Seguridad del Paciente (QPS) — Selecciona una sede para ver el dashboard de prevalencias.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-[11px] font-sans rounded-2xl px-5 py-3">
          Error al cargar las sedes. Intenta recargar la página.
        </div>
      )}

      {/* Sección de cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[8px] font-sans font-extrabold uppercase tracking-wider text-gray-400">
            Selecciona una sede
          </h2>
          <span className="text-[9px] font-sans text-gray-400">
            {sedesOrdenadas.length} sede{sedesOrdenadas.length !== 1 ? "s" : ""} disponible{sedesOrdenadas.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {sedesOrdenadas.map((sede) => {
            const meta = SEDE_META[sede.nombre] ?? {
              image: "/LimaCentro_qps.webp",
              tag: "Sede",
              accentColor: "#1E50EF",
            };

            return (
              <Link
                key={sede.id}
                href={`/metas-internacionales/${sede.id}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 border border-gray-100"
              >
                {/* Imagen de sede con overlay */}
                <div className="relative h-52 overflow-hidden">
                  <Image
                    src={meta.image}
                    alt={`Sede ${sede.nombre}`}
                    fill
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* Tag badge */}
                  <span
                    className="absolute top-3 left-3 text-[8px] font-sans font-extrabold uppercase tracking-widest text-white px-2.5 py-1 rounded-full backdrop-blur-sm"
                    style={{ backgroundColor: `${meta.accentColor}CC` }}
                  >
                    {meta.tag}
                  </span>

                  {/* Arrow button top-right */}
                  <div
                    className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center backdrop-blur-sm bg-white/15 group-hover:bg-white/30 transition-colors duration-300"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3.5 w-3.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  {/* Nombre de sede sobre la imagen */}
                  <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
                    <h3 className="text-white font-sans font-extrabold text-[15px] leading-tight drop-shadow-sm">
                      {sede.nombre}
                    </h3>
                  </div>
                </div>

                {/* Card footer — glassmorphism / minimal */}
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-100">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] font-sans font-extrabold uppercase tracking-wider text-gray-400">
                      Dashboard de prevalencias
                    </span>
                    <span className="text-[10px] font-sans font-semibold text-gray-700">
                      Ver indicadores QPS →
                    </span>
                  </div>
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: meta.accentColor }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
