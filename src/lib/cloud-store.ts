import { supabase } from "@/integrations/supabase/client";

// Salva o conjunto de dados na nuvem (banco de dados).
// Nunca apaga: apenas insere ou atualiza a chave.
export async function cloudSave(key: string, data: unknown): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("app_state")
      .upsert(
        { key, data: data as never, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) {
      console.error("[cloudSave]", key, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[cloudSave]", key, err);
    return false;
  }
}

// Lê o conjunto de dados da nuvem. Retorna null quando não existe/erro.
export async function cloudLoad(key: string): Promise<unknown | null> {
  try {
    const { data, error } = await supabase
      .from("app_state")
      .select("data")
      .eq("key", key)
      .maybeSingle();
    if (error) {
      console.error("[cloudLoad]", key, error.message);
      return null;
    }
    return data?.data ?? null;
  } catch (err) {
    console.error("[cloudLoad]", key, err);
    return null;
  }
}
