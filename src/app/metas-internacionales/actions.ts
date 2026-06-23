"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function getCumplimientoGlobal(procesoId: string) {
  const { data, error } = await supabaseAdmin.rpc("get_cumplimiento_global_por_set", {
    p_proceso_id: procesoId,
  });

  if (error) {
    console.error("[actions/prevalencias] Error get_cumplimiento_global_por_set:", error);
    return { data: null, error };
  }
  return { data, error: null };
}

export async function getCumplimientoUpss(setId: string, procesoId: string) {
  const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("get_cumplimiento_por_upss", {
    p_set_id: setId,
    p_proceso_id: procesoId,
  });

  if (rpcError) {
    console.error("[actions/prevalencias] Error get_cumplimiento_por_upss:", rpcError);
    return { data: null, error: rpcError };
  }

  // Obtenemos el total de evaluados por UPSS para este set y proceso
  const { data: evaluadosData, error: evaluadosError } = await supabaseAdmin
    .from("evaluacion_set")
    .select(`
      evaluacion_personal!inner (
        proceso_id,
        personal_prevalencia!inner (
          upss!inner ( nombre )
        )
      )
    `)
    .eq("set_id", setId)
    .eq("evaluacion_personal.proceso_id", procesoId)
    .eq("estado", "completado");

  if (evaluadosError) {
    console.error("[actions/prevalencias] Error fetching evaluados por upss:", evaluadosError);
    return { data: rpcData, error: null };
  }

  // Count unique evaluations per UPSS
  const upssCounts: Record<string, number> = {};
  for (const row of (evaluadosData || [])) {
    try {
      const ep = Array.isArray(row.evaluacion_personal) ? row.evaluacion_personal[0] : row.evaluacion_personal;
      const pp = Array.isArray(ep?.personal_prevalencia) ? ep.personal_prevalencia[0] : ep?.personal_prevalencia;
      const up = Array.isArray(pp?.upss) ? pp.upss[0] : pp?.upss;
      
      const upssNombre = up?.nombre;
      if (upssNombre) {
        upssCounts[upssNombre] = (upssCounts[upssNombre] || 0) + 1;
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  // Merge counts into rpcData
  const mergedData = (rpcData || []).map((item: any) => ({
    ...item,
    total_evaluados: upssCounts[item.upss] || 0,
  }));

  return { data: mergedData, error: null };
}

export async function getCumplimientoGrupoProfesional(setId: string, procesoId: string) {
  const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("get_cumplimiento_por_grupo_profesional", {
    p_set_id: setId,
    p_proceso_id: procesoId,
  });

  if (rpcError) {
    console.error("[actions/prevalencias] Error get_cumplimiento_por_grupo_profesional:", rpcError);
    return { data: null, error: rpcError };
  }

  // Obtenemos el total de evaluados por grupo para este set y proceso
  const { data: evaluadosData, error: evaluadosError } = await supabaseAdmin
    .from("evaluacion_set")
    .select(`
      evaluacion_personal!inner (
        proceso_id,
        personal_prevalencia!inner (
          grupo_profesional!inner ( nombre )
        )
      )
    `)
    .eq("set_id", setId)
    .eq("evaluacion_personal.proceso_id", procesoId)
    .eq("estado", "completado");

  if (evaluadosError) {
    console.error("[actions/prevalencias] Error fetching evaluados por grupo:", evaluadosError);
    // Return just the rpcData if this fails, so it doesn't break the whole app
    return { data: rpcData, error: null };
  }

  // Count unique evaluations per group
  const groupCounts: Record<string, number> = {};
  for (const row of (evaluadosData || [])) {
    try {
      const ep = Array.isArray(row.evaluacion_personal) ? row.evaluacion_personal[0] : row.evaluacion_personal;
      const pp = Array.isArray(ep?.personal_prevalencia) ? ep.personal_prevalencia[0] : ep?.personal_prevalencia;
      const gp = Array.isArray(pp?.grupo_profesional) ? pp.grupo_profesional[0] : pp?.grupo_profesional;
      
      const grupoNombre = gp?.nombre;
      if (grupoNombre) {
        groupCounts[grupoNombre] = (groupCounts[grupoNombre] || 0) + 1;
      }
    } catch (e) {
      // Ignore parsing errors for single rows
    }
  }

  // Merge counts into rpcData
  const mergedData = (rpcData || []).map((item: any) => ({
    ...item,
    total_evaluados: groupCounts[item.grupo_profesional] || 0,
  }));

  return { data: mergedData, error: null };
}

export async function getFallasPorPregunta(setId: string, procesoId: string) {
  const { data, error } = await supabaseAdmin.rpc("get_fallas_por_pregunta", {
    p_set_id: setId,
    p_proceso_id: procesoId,
  });

  if (error) {
    console.error("[actions/prevalencias] Error get_fallas_por_pregunta:", error);
    return { data: null, error };
  }
  return { data, error: null };
}

export async function getEvaluacionesPorEvaluador(procesoId: string) {
  const { data, error } = await supabaseAdmin.rpc("get_evaluaciones_por_evaluador", {
    p_proceso_id: procesoId,
  });

  if (error) {
    console.error("[actions/prevalencias] Error get_evaluaciones_por_evaluador:", error);
    return { data: null, error };
  }
  return { data, error: null };
}

export async function getDistribucionEvaluacionesPorSet(procesoId: string) {
  const { data, error } = await supabaseAdmin
    .from("evaluacion_set")
    .select(`
      id,
      set_preguntas!inner ( nombre ),
      evaluacion_personal!inner ( proceso_id )
    `)
    .eq("evaluacion_personal.proceso_id", procesoId)
    .eq("estado", "completado");

  if (error) {
    console.error("[actions/prevalencias] Error getDistribucionEvaluacionesPorSet:", error);
    return { data: null, error };
  }

  const result: Record<string, number> = {};
  for (const row of (data || [])) {
    // Supabase can return arrays or objects for relations depending on schema, but typically it's an object for standard relations.
    // Ensure we correctly extract the name.
    const sp = Array.isArray(row.set_preguntas) ? row.set_preguntas[0] : row.set_preguntas;
    const nombre = sp?.nombre || "Desconocido";
    result[nombre] = (result[nombre] || 0) + 1;
  }

  const formattedData = Object.entries(result).map(([set_nombre, total]) => ({
    set_nombre,
    total,
  }));

  return { data: formattedData, error: null };
}
