import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import DashboardPrevalencias from "@/components/metas-internacionales/DashboardPrevalencias";

export const metadata: Metadata = {
  title: "Dashboard Prevalencias | Metas Internacionales de Seguridad del Paciente",
  description:
    "Dashboard de Metas Internacionales de Seguridad del Paciente — cumplimiento por UPSS, grupo profesional y preguntas con mayor tasa de fallo.",
};

interface Props {
  params: Promise<{ sedeId: string }>;
}

export default async function MetasInternacionalesSedeePage({ params }: Props) {
  const { sedeId } = await params;

  // Validar que la sede existe
  const { data: sede, error: sedeError } = await supabaseAdmin
    .from("sede")
    .select("id, nombre")
    .eq("id", sedeId)
    .single();

  if (sedeError || !sede) notFound();

  // Cargar catálogos y proceso activo en paralelo
  // Nota: no usamos sede(nombre) para evitar depender de FK declarada en Supabase;
  // el nombre de sede ya viene del query anterior.
  console.log("[DEBUG] Fetching procesos for sedeId:", sedeId);
  const [{ data: sets }, { data: procesos, error: procesoError }] = await Promise.all([
    supabaseAdmin
      .from("set_preguntas")
      .select("id, nombre, orden")
      .eq("activo", true)
      .order("orden"),
    supabaseAdmin
      .from("proceso_prevalencia")
      .select("id, nombre, fecha, estado")
      .eq("sede_id", sedeId)
      .eq("estado", "activo")
      .order("fecha", { ascending: false })
      .limit(1),
  ]);

  if (procesoError) {
    console.error("[metas-internacionales] Error cargando proceso:", procesoError);
  }

  // Inyectamos el nombre de sede que ya tenemos para mantener el tipo esperado por DashboardPrevalencias
  const procesoActivo =
    procesos && procesos.length > 0
      ? { ...procesos[0], sede: { nombre: sede.nombre } }
      : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400">
        <Link
          href="/metas-internacionales"
          className="flex items-center gap-1.5 hover:text-[#2b3f64] transition-colors font-medium"
        >
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Metas Internacionales
        </Link>
        <span className="text-gray-200">/</span>
        <span className="text-gray-600 font-semibold">{sede.nombre}</span>
      </nav>

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
              {sede.nombre} — Evaluación de Prevalencias
            </p>
          </div>
        </div>
      </header>

      {/* Dashboard */}
      <DashboardPrevalencias
        sets={sets ?? []}
        proceso={procesoActivo as any}
      />
    </div>
  );
}
