import { createApp } from "./app.js";
import { config, isSupabaseConfigured } from "./config.js";
import { checkSupabase, createDirectory, createSupabaseAdmin } from "./lib/supabase.js";
import { createAuthenticate } from "./middleware/authenticate.js";
import { createProfileService } from "./services/profileService.js";
import { createRoleService } from "./services/roleService.js";

const directory = createDirectory(createSupabaseAdmin());

const app = createApp({
  authenticate: createAuthenticate({
    getUser: (token) => directory.getUser(token),
    loadAccess: (userId) => directory.loadAccess(userId),
  }),
  profileService: createProfileService(directory.client),
  roleService: createRoleService(directory.client),
  supabaseStatus: checkSupabase,
});

app.listen(config.port, () => {
  console.log(`IT Service Desk API listening on port ${config.port}`);
  if (isSupabaseConfigured()) {
    console.log("Supabase credentials found.");
  } else {
    console.log("Supabase credentials missing. Copy server/.env.example to server/.env.");
  }
});
