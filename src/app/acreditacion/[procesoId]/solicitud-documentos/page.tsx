import { supabase } from "@/lib/supabase";
import SolicitudView from "./SolicitudView";
import { redirect } from "next/navigation";

export default async function SolicitudDocumentosPage({
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
    console.error("Error cargando proceso:", pError);
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

  const { data: responsables, error: rError } = await supabase.rpc(
    "get_responsables_por_proceso",
    { p_proceso_id: procesoId }
  );

  if (rError) {
    console.error("RPC Error Message:", (rError as any).message);
    console.error("RPC Error Details:", (rError as any).details);
    console.error("RPC Error Hint:", (rError as any).hint);
  }

  const { data: assignedRows } = await supabase
    .from("criterio_responsable")
    .select("responsable_id");

  const assignedIds = new Set((assignedRows || []).map((row) => row.responsable_id));
  const responsablesFiltrados = (responsables || []).filter((r: any) => 
    assignedIds.has(r.responsable_id)
  );

  return (
    <SolicitudView
      proceso={proceso as any}
      responsables={responsablesFiltrados}
    />
  );
}
