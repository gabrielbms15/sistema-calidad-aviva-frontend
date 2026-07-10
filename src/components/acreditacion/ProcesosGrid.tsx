"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

/* ─── Types ──────────────────────────────────────────────── */
interface Sede {
  id: string;
  nombre: string;
}

export interface Proceso {
  id: string;
  anio: number;
  fecha_inicio: string;
  sede: Sede;
}

interface Props {
  procesos: Proceso[];
}

/* ─── Helpers ────────────────────────────────────────────── */
function sedeToSlug(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar tildes
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function getImagePath(proceso: Proceso, allProcesos: Proceso[]): string | null {
  const slug = sedeToSlug(proceso.sede.nombre);

  const siblings = allProcesos
    .filter((p) => p.sede.id === proceso.sede.id)
    .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime());

  const idx = siblings.findIndex((p) => p.id === proceso.id) + 1; // 1-based
  return `/${slug}${idx}.webp`;
}

/* ─── Card component ─────────────────────────────────────── */
function ProcesoCard({ proceso, imagePath }: { proceso: Proceso; imagePath: string | null }) {
  const [imgError, setImgError] = useState(false);
  const showImage = imagePath && !imgError;

  return (
    <Link
      href={`/acreditacion/${proceso.id}`}
      className="group relative flex flex-col bg-slate-100 rounded-3xl shadow-md hover:shadow-xl hover:bg-white transition-all duration-300 border border-slate-200 hover:border-gray-100 hover:-translate-y-2 overflow-hidden"
    >
      <div className="relative h-36 w-full bg-gradient-to-br from-[#3d537e]/10 to-[#3d537e]/20 overflow-hidden">
        {showImage ? (
          <Image
            src={imagePath!}
            alt={`${proceso.sede.nombre} ${proceso.anio}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex items-center justify-center h-full w-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-14 h-14 text-[#3d537e]/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
        )}

        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-[#3d537e] text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">
          {proceso.anio}
        </div>
      </div>

      <div className="flex flex-col p-4 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#3d537e]/60 mb-1">
          Proceso de Acreditación
        </p>
        <h3 className="text-lg font-extrabold text-gray-800 group-hover:text-[#3d537e] transition-colors leading-tight">
          {proceso.sede.nombre}
        </h3>
        <p className="text-xs text-gray-500 mt-1">Año {proceso.anio}</p>

        <div className="mt-4 flex items-center gap-2 text-[#3d537e] font-semibold text-xs">
          <span>Abrir proceso</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      <div className="h-1 w-0 bg-[#3d537e] group-hover:w-full transition-all duration-300 rounded-b-3xl" />
    </Link>
  );
}

/* ─── Main grid ──────────────────────────────────────────── */
export default function ProcesosGrid({ procesos }: Props) {
  if (!procesos || procesos.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        No se encontraron procesos de acreditación.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {procesos.map((proceso) => (
        <ProcesoCard
          key={proceso.id}
          proceso={proceso}
          imagePath={getImagePath(proceso, procesos)}
        />
      ))}
    </div>
  );
}
