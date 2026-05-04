import { supabase } from "@/lib/supabase";
import EvidenciasView from "./EvidenciasView";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ procesoId: string }>;
}

export default async function EvidenciasPage({ params }: PageProps) {
  const { procesoId } = await params;

  // ── 1. Cargar el proceso con su sede ──────────────────────
  const { data: proceso } = await supabase
    .from("proceso_acreditacion")
    .select("id, anio, sede(id, nombre)")
    .eq("id", procesoId)
    .single();

  if (!proceso) notFound();

  // ── 2. Cargar todos los macroprocesos para el sidebar ─────
  const { data: macroprocesos } = await supabase
    .from("macroproceso")
    .select("id, codigo, nombre, orden")
    .order("orden", { ascending: true });

  if (!macroprocesos || macroprocesos.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No se encontraron macroprocesos.
      </div>
    );
  }

  // ── 3. Cargar códigos del primer macroproceso ─────────────
  const primerMacro = macroprocesos[0];

  const { data: codigosIniciales } = await supabase
    .from("codigo")
    .select("id, codigo, descripcion, orden")
    .eq("macroproceso_id", primerMacro.id)
    .order("orden", { ascending: true });

  const codigoIds = (codigosIniciales ?? []).map((c) => c.id);

  // ── 4. Cargar criterios + entregables + seguimiento del proceso ──
  const { data: criteriosIniciales } = codigoIds.length > 0
    ? await supabase
        .from("criterio")
        .select(`
          id,
          codigo_criterio,
          descripcion,
          codigo_id,
          entregable (
            id,
            descripcion,
            tipo_entregable,
            nota,
            orden,
            entregable_seguimiento (
              id,
              estado,
              nombre_evidencia,
              link_evidencia,
              proceso_id
            )
          )
        `)
        .in("codigo_id", codigoIds)
    : { data: [] };

  return (
    <EvidenciasView
      proceso={proceso as any}
      macroprocesos={macroprocesos}
      macroprocesoInicialId={primerMacro.id}
      codigosIniciales={codigosIniciales ?? []}
      criteriosIniciales={criteriosIniciales ?? []}
    />
  );
}
