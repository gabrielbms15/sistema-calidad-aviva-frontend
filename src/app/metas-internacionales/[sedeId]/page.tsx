import type { Metadata } from "next";
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

  const { data: sede, error: sedeError } = await supabaseAdmin
    .from("sede")
    .select("id, nombre")
    .eq("id", sedeId)
    .single();

  if (sedeError || !sede) notFound();

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

  const procesoActivo =
    procesos && procesos.length > 0
      ? { ...procesos[0], sede: { nombre: sede.nombre } }
      : null;

  return (
    <DashboardPrevalencias
      sets={sets ?? []}
      proceso={procesoActivo as any}
    />
  );
}
