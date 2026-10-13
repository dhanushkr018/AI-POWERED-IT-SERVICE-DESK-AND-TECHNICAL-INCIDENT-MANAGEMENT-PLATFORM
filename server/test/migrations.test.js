import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const migrationDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../supabase/migrations",
);

const sql = readdirSync(migrationDir)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => readFileSync(path.join(migrationDir, name), "utf8"))
  .join("\n");

const tables = [
  "profiles",
  "user_roles",
  "support_teams",
  "support_team_members",
  "technical_devices",
  "tickets",
  "ticket_assignments",
  "ticket_conversations",
  "ticket_diagnostics",
  "ticket_status_history",
  "ticket_escalations",
  "support_knowledge_articles",
  "ticket_attachments",
  "notifications",
  "audit_logs",
  "support_sla_policies",
];

test("migrations define the service-desk tables and row level security", () => {
  for (const table of tables) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`, "i"));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(sql, /'user',\s*'support_executive',\s*'administrator'/);
  assert.doesNotMatch(sql, /'employee'/);
  assert.match(sql, /next_ticket_number/);
  assert.match(sql, /is_internal/);
  assert.match(sql, /ticket-attachments/);
  assert.match(sql, /grant_app_role/);
  assert.match(sql, /Laptop does not power on/);
});
