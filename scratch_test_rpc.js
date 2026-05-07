import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data: procesos } = await supabase.from('proceso_acreditacion').select('id').limit(1);
  if (!procesos || procesos.length === 0) return console.log("No procesos");
  const pId = procesos[0].id;
  
  const { data, error } = await supabase.rpc('get_responsables_por_proceso', { proceso_id_param: pId });
  console.log("RPC result:", data);
  console.log("RPC error:", error);
}

test();
