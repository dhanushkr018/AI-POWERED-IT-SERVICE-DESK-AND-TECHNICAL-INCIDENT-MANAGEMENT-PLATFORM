import { createClient } from "@supabase/supabase-js";
import { config, isSupabaseConfigured } from "../config.js";
import { HttpError } from "../errors.js";
import { mapProfile, mapRoles } from "../services/accountMapper.js";

const PROFILE_COLUMNS =
  "id, email, full_name, employee_id, department, job_title, phone, is_active";

export function createSupabaseAdmin() {
  if (!isSupabaseConfigured()) return null;
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createDirectory(client) {
  return {
    client,
    async getUser(token) {
      if (!client) {
        throw new HttpError(503, "Supabase is not configured on the server.");
      }
      try {
        const { data, error } = await client.auth.getUser(token);
        if (error) {
          const message = error.message || "";
          if (/fetch|network|enotfound|econnrefused/i.test(message)) {
            throw new HttpError(503, "Could not reach Supabase to verify your session.");
          }
          return null;
        }
        if (!data?.user) return null;
        return { id: data.user.id, email: data.user.email ?? "" };
      } catch (error) {
        if (error instanceof HttpError) throw error;
        throw new HttpError(503, "Could not reach Supabase to verify your session.");
      }
    },
    async loadAccess(userId) {
      if (!client) {
        throw new HttpError(503, "Supabase is not configured on the server.");
      }
      const { data: profile, error } = await client
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        console.error(error.message);
        throw new HttpError(500, "Could not load your profile.");
      }

      const { data: roleRows, error: roleError } = await client
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (roleError) {
        console.error(roleError.message);
        throw new HttpError(500, "Could not load your roles.");
      }

      return {
        profile: mapProfile(profile),
        roles: mapRoles(roleRows),
      };
    },
  };
}

export async function checkSupabase() {
  if (!isSupabaseConfigured()) return "not_configured";
  try {
    const response = await fetch(`${config.supabaseUrl}/auth/v1/health`, {
      headers: { apikey: config.supabaseServiceRoleKey },
      signal: AbortSignal.timeout(4000),
    });
    return response.ok ? "reachable" : "unreachable";
  } catch {
    return "unreachable";
  }
}
