import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(serverRoot, ".env"), quiet: true });

function optional(name) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function readPort() {
  const parsed = Number(process.env.PORT || 4000);
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : 4000;
}

export const config = {
  port: readPort(),
  clientOrigin: optional("CLIENT_ORIGIN") || "http://localhost:5173",
  supabaseUrl: optional("SUPABASE_URL"),
  supabaseAnonKey: optional("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: optional("SUPABASE_SERVICE_ROLE_KEY"),
  // Read now so later phases have one configuration place.
  // Phase 1 does not call Ollama or generate assistant replies.
  aiProvider: optional("AI_PROVIDER") || "rules",
  ollamaBaseUrl: optional("OLLAMA_BASE_URL") || "http://127.0.0.1:11434",
  ollamaModel: optional("OLLAMA_MODEL"),
  seedDemoPassword: optional("SEED_DEMO_PASSWORD") || "CampusDesk#2026",
};

export function isSupabaseConfigured() {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);
}
