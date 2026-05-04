import { supabase } from "@/lib/supabase";
import ProcesosListView from "./ProcesosListView";

export default async function RecopilacionEvidenciasPage() {
  const { data: procesos, error } = await supabase
    .from("proceso_acreditacion")
    .select("id, anio, fecha_inicio, sede(id, nombre)")
    .order("fecha_inicio", { ascending: true });

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Error cargando los procesos de acreditación.
      </div>
    );
  }

  if (!procesos || procesos.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No se encontraron procesos de acreditación.
      </div>
    );
  }

  return <ProcesosListView procesos={procesos as any} />;
}
