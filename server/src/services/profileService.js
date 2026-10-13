import { HttpError } from "../errors.js";
import { mapProfile } from "./accountMapper.js";

const PROFILE_COLUMNS =
  "id, email, full_name, employee_id, department, job_title, phone, is_active";

function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

export function createProfileService(client) {
  return {
    async updateProfile(userId, input) {
      if (!client) {
        throw new HttpError(503, "Supabase is not configured on the server.");
      }

      const patch = {
        full_name: input.fullName,
        employee_id: emptyToNull(input.employeeId),
        department: emptyToNull(input.department),
        job_title: emptyToNull(input.jobTitle),
        phone: emptyToNull(input.phone),
      };

      const { data, error } = await client
        .from("profiles")
        .update(patch)
        .eq("id", userId)
        .select(PROFILE_COLUMNS)
        .single();

      if (error) {
        console.error(error.message);
        if (error.code === "PGRST116") {
          throw new HttpError(404, "That account was not found.");
        }
        throw new HttpError(500, "Your profile could not be saved.");
      }

      return mapProfile(data);
    },
  };
}
