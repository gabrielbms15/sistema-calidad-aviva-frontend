import { supabase } from "@/lib/supabase";
import Link from "next/link";
import DefinirRequerimientosView from "./DefinirRequerimientosView";

export default async function DefinirRequerimientosPage() {
  // 1. Cargar macroprocesos para el sidebar
  const { data: macroprocesos } = await supabase
    .from("macroproceso")
    .select("id,codigo,nombre,orden")
    .order("orden", { ascending: true });

  if (!macroprocesos || macroprocesos.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No se encontraron macroprocesos.
      </div>
    );
  }

  const primerMacroproceso = macroprocesos[0];

  // 2. Cargar en paralelo: codigos del primer macro + areas + responsables
  const [
    { data: codigosIniciales },
    { data: areas },
    { data: responsables },
  ] = await Promise.all([
    supabase
      .from("codigo")
      .select("id,codigo,descripcion,orden")
      .eq("macroproceso_id", primerMacroproceso.id)
      .order("orden", { ascending: true }),
    supabase
      .from("area")
      .select("id,nombre")
      .order("nombre", { ascending: true }),
    supabase
      .from("responsable")
      .select("id,area_id,cargo")
      .order("cargo", { ascending: true }),
  ]);

  // 3. Cargar criterios con sus entregables y responsables del primer macroproceso
  const codigoIds = (codigosIniciales ?? []).map((c) => c.id);

  const { data: criteriosIniciales } =
    codigoIds.length > 0
      ? await supabase
          .from("criterio")
          .select(
            "id,codigo_criterio,descripcion,codigo_id,entregable(id,criterio_id,descripcion,tipo_entregable,nota,orden),criterio_responsable(id,criterio_id,responsable_id)"
          )
          .in("codigo_id", codigoIds)
      : { data: [] };

  return (
    <DefinirRequerimientosView
      macroprocesos={macroprocesos}
      macroprocesoInicialId={primerMacroproceso.id}
      codigosIniciales={codigosIniciales ?? []}
      criteriosIniciales={criteriosIniciales ?? []}
      areas={areas ?? []}
      responsables={responsables ?? []}
    />
  );
}
