import { supabase } from "@/lib/supabase";
import EvidenciasView from "./EvidenciasView";

export default async function RecopilacionEvidenciasPage({
  params,
}: {
  params: Promise<{ procesoId: string }>;
}) {
  const { procesoId } = await params;

  const { data: proceso, error: pError } = await supabase
    .from("proceso_acreditacion")
    .select("id, anio, sede(id, nombre)")
    .eq("id", procesoId)
    .single();

  if (pError || !proceso) {
    return (
      <div className="p-8 text-red-500 font-mono">
        <h1>Error cargando proceso</h1>
        <p>Proceso ID buscado: {procesoId}</p>
        <pre className="mt-4 p-4 bg-red-50 rounded text-sm text-red-800">
          {JSON.stringify(pError || "Proceso no encontrado", null, 2)}
        </pre>
      </div>
    );
  }

  const { data: mRaw, error: mError } = await supabase
    .from("macroproceso")
    .select("id, codigo, nombre, orden")
    .not("orden", "in", "(8,12)")
    .order("orden", { ascending: true });
    
  if (mError) {
    console.error(mError);
  }
  const macroprocesos = mRaw || [];

  let macroprocesoInicialId = "";
  let codigosIniciales: any[] = [];
  let criteriosIniciales: any[] = [];

  if (macroprocesos.length > 0) {
    macroprocesoInicialId = macroprocesos[0].id;

    const { data: cRaw } = await supabase
      .from("codigo")
      .select("id, codigo, descripcion, orden")
      .eq("macroproceso_id", macroprocesoInicialId)
      .order("orden", { ascending: true });
    
    codigosIniciales = cRaw || [];

    if (codigosIniciales.length > 0) {
      const ids = codigosIniciales.map(c => c.id);
      const { data: crRaw } = await supabase
        .from("criterio")
        .select(`
          id, codigo_criterio, descripcion, codigo_id,
          fuente_0, fuente_1, fuente_2,
          entregable (
            id, descripcion, tipo_entregable, nota, orden,
            entregable_seguimiento (
              id, estado, observacion, proceso_id,
              entregable_evidencia (
                id, nombre_evidencia, link_evidencia, orden
              )
            )
          )
        `)
        .in("codigo_id", ids);

      const EXCLUDED_CRITERIOS = new Set([
        "DIR1-4", "DIR1-5", "DIR1-6", "DIR1-8", "GRH4-1", "MRA8-1", "MRA8-2", "MRA8-3", 
        "ATA1-3", "ATA3-2", "ATA3-3", "ATA3-4", "ATA3-5", "ATA3-6", "RCR4-1", "RCR4-2", 
        "RCR4-3", "GMD3-4", "GMD3-5", "MRS1-1", "MRS1-2", "MRS1-3", "MRS2-1", "MRS2-2"
      ]);
      
      criteriosIniciales = (crRaw || []).filter((c: any) => !EXCLUDED_CRITERIOS.has(c.codigo_criterio));
    }
  }

  return (
    <EvidenciasView
      proceso={proceso as any}
      macroprocesos={macroprocesos}
      macroprocesoInicialId={macroprocesoInicialId}
      codigosIniciales={codigosIniciales}
      criteriosIniciales={criteriosIniciales}
    />
  );
}
