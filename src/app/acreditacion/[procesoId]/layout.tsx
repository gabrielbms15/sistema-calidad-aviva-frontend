import { supabase } from "@/lib/supabase";
import { redirect } from "next/navigation";

export default async function ProcesoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ procesoId: string }>;
}) {
  const { procesoId } = await params;

  // Validate UUID format to prevent Supabase 500 errors
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(procesoId);
  
  if (!isUUID) {
    redirect("/acreditacion");
  }

  // Validate that the process exists
  const { data: proceso } = await supabase
    .from("proceso_acreditacion")
    .select("id")
    .eq("id", procesoId)
    .single();

  if (!proceso) {
    redirect("/acreditacion");
  }

  return <>{children}</>;
}
