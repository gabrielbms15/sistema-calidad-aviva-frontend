"use client";

import { useState, useTransition } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import MacroprocesosSidebar from "./components/MacroprocesosSidebar";
import CriteriosTable from "./components/CriteriosTable";
import type { Macroproceso, Codigo, Criterio } from "./components/types";

interface Props {
  macroprocesos: Macroproceso[];
  macroprocesoInicialId: string;
  codigosIniciales: Codigo[];
  criteriosIniciales: Criterio[];
}

export default function GuiaTecnicaView({
  macroprocesos,
  macroprocesoInicialId,
  codigosIniciales,
  criteriosIniciales,
}: Props) {
  const [selectedMacroId, setSelectedMacroId] = useState(macroprocesoInicialId);
  const [codigos, setCodigos] = useState<Codigo[]>(codigosIniciales);
  const [criterios, setCriterios] = useState<Criterio[]>(
    [...criteriosIniciales].sort((a, b) =>
      a.codigo_criterio.localeCompare(b.codigo_criterio, undefined, { numeric: true, sensitivity: "base" })
    )
  );
  const [selectedCodigoId, setSelectedCodigoId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleMacroprocesoClick = (macro: Macroproceso) => {
    if (macro.id === selectedMacroId) return;
    startTransition(async () => {
      setSelectedMacroId(macro.id);
      setSelectedCodigoId(null);

      const { data: nuevosCodigos } = await supabase
        .from("codigo")
        .select("id,codigo,descripcion,orden")
        .eq("macroproceso_id", macro.id)
        .order("orden", { ascending: true });

      const codigosResult = nuevosCodigos ?? [];
      setCodigos(codigosResult);

      const ids = codigosResult.map((c) => c.id);
      if (ids.length > 0) {
        const { data: nuevosCriterios } = await supabase
          .from("criterio")
          .select("id,codigo_criterio,descripcion,codigo_id,fuente_0,fuente_1,fuente_2")
          .in("codigo_id", ids);
        const sorted = (nuevosCriterios ?? []).sort((a, b) =>
          a.codigo_criterio.localeCompare(b.codigo_criterio, undefined, { numeric: true, sensitivity: "base" })
        );
        setCriterios(sorted);
      } else {
        setCriterios([]);
      }
    });
  };

  const criteriosFiltrados = (selectedCodigoId
    ? criterios.filter((c) => c.codigo_id === selectedCodigoId)
    : criterios
  ).sort((a, b) =>
    a.codigo_criterio.localeCompare(b.codigo_criterio, undefined, { numeric: true, sensitivity: "base" })
  );

  const macroActual = macroprocesos.find((m) => m.id === selectedMacroId);

  return (
    <div className="flex flex-col h-full font-avenir gap-4">
      {/* Header above the table */}
      <div className="w-full flex flex-col items-start shrink-0">
        <h1 className="text-black font-sans font-black text-[19px] leading-snug drop-shadow-sm flex items-center gap-2.5">
          <span className="flex items-center justify-center bg-aviva-coral1/50 w-7 h-7 rounded-lg text-xs shadow-sm">
            📖
          </span>
          Guía Técnica del Evaluador
        </h1>
      </div>

      {/* Body Container (Sidebar + Content) */}
      <div className="flex-1 min-h-0 grid grid-cols-[22.5%_1fr] gap-4 overflow-hidden w-[95%]">
        
        {/* Componente Izquierdo */}
        <MacroprocesosSidebar
          macroprocesos={macroprocesos}
          selectedMacroId={selectedMacroId}
          handleMacroprocesoClick={handleMacroprocesoClick}
          isPending={isPending}
        />

        {/* Componente Derecho */}
        <CriteriosTable
          macroActual={macroActual}
          criteriosFiltrados={criteriosFiltrados}
          selectedCodigoId={selectedCodigoId}
          codigos={codigos}
          totalCriterios={criterios.length}
          setSelectedCodigoId={setSelectedCodigoId}
          isPending={isPending}
        />
        
      </div>
    </div>
  );
}
