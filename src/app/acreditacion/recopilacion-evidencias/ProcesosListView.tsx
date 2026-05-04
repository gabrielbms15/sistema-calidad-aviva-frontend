"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

/* ─── Types ──────────────────────────────────────────────── */
interface Sede {
  id: string;
  nombre: string;
}

interface Proceso {
  id: string;
  anio: number;
  fecha_inicio: string;
  sede: Sede;
}

interface Props {
  procesos: Proceso[];
}

/* ─── Helpers ────────────────────────────────────────────── */
/** Convierte "Lima Centro" → "lima_centro" */
function sedeToSlug(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar tildes
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/**
 * Dado todos los procesos y el proceso actual, calcula el índice ordinal
 * de ese proceso dentro de los procesos de la misma sede (ordenados por
 * fecha_inicio asc), y devuelve la ruta de imagen correspondiente.
 * Si el archivo no existe en public, devuelve null → se muestra icono.
 */
function getImagePath(proceso: Proceso, allProcesos: Proceso[]): string | null {
  const slug = sedeToSlug(proceso.sede.nombre);

  // Procesos de la misma sede, ordenados por fecha_inicio ASC
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
      href={`/acreditacion/recopilacion-evidencias/${proceso.id}`}
      className="group relative flex flex-col bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:-translate-y-2 overflow-hidden"
    >
      {/* ── Foto / icono genérico ── */}
      <div className="relative h-48 w-full bg-gradient-to-br from-[#3d537e]/10 to-[#3d537e]/20 overflow-hidden">
        {showImage ? (
          <Image
            src={imagePath!}
            alt={`${proceso.sede.nombre} ${proceso.anio}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          /* Icono genérico cuando no hay imagen */
          <div className="flex items-center justify-center h-full w-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-20 h-20 text-[#3d537e]/30"
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

        {/* Año badge sobre la imagen */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-[#3d537e] text-sm font-bold px-3 py-1 rounded-full shadow-sm">
          {proceso.anio}
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="flex flex-col p-6 flex-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#3d537e]/60 mb-1">
          Proceso de Acreditación
        </p>
        <h3 className="text-xl font-extrabold text-gray-800 group-hover:text-[#3d537e] transition-colors leading-tight">
          {proceso.sede.nombre}
        </h3>
        <p className="text-sm text-gray-500 mt-1">Año {proceso.anio}</p>

        {/* Botón decorativo */}
        <div className="mt-5 flex items-center gap-2 text-[#3d537e] font-semibold text-sm">
          <span>Ver expediente</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* Borde inferior animado */}
      <div className="h-1 w-0 bg-[#3d537e] group-hover:w-full transition-all duration-300 rounded-b-3xl" />
    </Link>
  );
}

/* ─── Main view ──────────────────────────────────────────── */
export default function ProcesosListView({ procesos }: Props) {
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
            Acreditación
          </Link>
        </div>
        <h1 className="text-4xl font-extrabold text-gray-800 drop-shadow-sm">
          Recopilación de Evidencias
        </h1>
        <p className="text-gray-500 mt-2 text-lg">
          Selecciona el proceso de acreditación para gestionar su expediente.
          <span className="bg-[#3d537e]/10 text-[#3d537e] px-3 py-1 rounded-full text-sm font-medium ml-4">
            {procesos.length} {procesos.length === 1 ? "proceso" : "procesos"}
          </span>
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-10">
        {procesos.map((proceso) => (
          <ProcesoCard
            key={proceso.id}
            proceso={proceso}
            imagePath={getImagePath(proceso, procesos)}
          />
        ))}
      </div>
    </div>
  );
}
