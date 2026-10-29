import { supabase } from "../services/supabase";

export async function logActivity({
  action,
  entityType = null,
  entityId = null,
  description,
  institutionId = null,
  metadata = {},
}) {
  try {
    const { data, error } = await supabase.rpc("log_activity", {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_description: description,
      p_institution_id: institutionId,
      p_metadata: metadata,
    });

    if (error) {
      console.error("Activity log error:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Activity logger failed:", error);
    return null;
  }
}