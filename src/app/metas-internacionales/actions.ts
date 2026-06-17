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
  const { data, error } = await supabaseAdmin.rpc("get_cumplimiento_por_upss", {
    p_set_id: setId,
    p_proceso_id: procesoId,
  });

  if (error) {
    console.error("[actions/prevalencias] Error get_cumplimiento_por_upss:", error);
    return { data: null, error };
  }
  return { data, error: null };
}

export async function getCumplimientoGrupoProfesional(setId: string, procesoId: string) {
  const { data, error } = await supabaseAdmin.rpc("get_cumplimiento_por_grupo_profesional", {
    p_set_id: setId,
    p_proceso_id: procesoId,
  });

  if (error) {
    console.error("[actions/prevalencias] Error get_cumplimiento_por_grupo_profesional:", error);
    return { data: null, error };
  }
  return { data, error: null };
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
