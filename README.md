# KNG Staff Management Portal (Supabase edition)

This is the Supabase-backed KNG staff portal. It includes Discord OAuth login, Management-controlled
team ADM permissions, shared roster storage, Discord server staff search, and an editable organisation chart.

## Teams
Gangs, Legal, Actions, Interactions, Calls, Order, Knowledge, Discord, Tickets, WallStreet.

## Permission model
- **Management**: the Discord IDs in `MANAGEMENT_DISCORD_IDS` have global access to all teams,
  all roster edits, staff permission allocation/revocation, and organisation chart editing.
- **Team ADM**: Management assigns one or more team permissions to a Discord account. An ADM can
  edit only the assigned team rosters.
- **Other staff**: can sign in and view the team rosters but cannot edit unless granted team ADM access.
- Permission checks happen in the Node backend. Hiding a button in the browser is not treated as security.

## 1. Create the Supabase database
1. Open the Supabase project dashboard.
2. Go to **SQL Editor** -> **New query**.
3. Run the supplied `kng_supabase_schema.sql` file.
4. Confirm the `teams` table contains the 10 teams and that the other tables/functions were created.

The schema creates:
- `teams`
- `staff_profiles`
- `team_permissions`
- `team_members`
- `organisation_chart`
- `portal_settings`
- `permission_audit_log`

It also creates the server-only RPC functions `replace_team_roster`, `replace_team_permissions`,
and `replace_organisation_chart`. Roster, permission and chart replacement operations use these
functions so each replacement is atomic.

## 2. Configure environment variables
Set these in Render -> your service -> Environment:

- `DISCORD_CLIENT_ID`: Discord OAuth application client ID.
- `DISCORD_CLIENT_SECRET`: Discord OAuth application client secret.
- `DISCORD_REDIRECT_URI`: `https://YOUR-SERVICE.onrender.com/auth/discord/callback`
- `SESSION_SECRET`: long random secret (at least 32 characters).
- `MANAGEMENT_DISCORD_IDS`: comma-separated Discord user IDs for initial Management accounts.
- `DISCORD_BOT_TOKEN`: bot token used for server member search (keep secret).
- `DISCORD_GUILD_ID`: Discord server ID used by staff search.
- `SUPABASE_URL`: `https://aevjkzbfjjctfxcfjsjv.supabase.co` (already filled into `.env.example`).
- `SUPABASE_SECRET_KEY`: Supabase secret/service-role key. The publishable key is not a replacement for this server-side key.
- `SUPABASE_PUBLISHABLE_KEY`: optional; not used by this server-only database integration.

**Never put `SUPABASE_SECRET_KEY`, the Discord bot token, or OAuth client secret in frontend files or GitHub.**
The Supabase secret key bypasses Row Level Security. It belongs only in the Node server's environment.

## 3. Discord setup
1. In Discord Developer Portal -> Applications -> your app -> OAuth2, add the redirect URI above.
2. Copy the Client ID and Client Secret into Render.
3. The OAuth flow requests the `identify` scope.
4. Invite your Discord bot to the target server and enable the Server Members Intent in the Developer Portal.
5. Add the bot token and guild ID to Render.

## 4. Deploy
1. Push this project folder to your GitHub repository.
2. Create/use a Render **Web Service**, not a Static Site.
3. Build command: `npm install`.
4. Start command: `npm start`.
5. Add all environment variables above and deploy.

A Render persistent disk is no longer required for application data because rosters, permissions,
profiles and chart data are stored in Supabase.

## 5. First login and Management bootstrap
1. Add your Management Discord IDs to `MANAGEMENT_DISCORD_IDS` in Render.
2. Deploy/restart the service.
3. Log in using one of those Discord accounts.
4. Open **Management** -> **Staff Search**.
5. Search for a server member and allocate one or more team ADM permissions.
6. The target account can then log in with Discord and edit only its assigned team rosters.

The `MANAGEMENT_DISCORD_IDS` environment variable is the source of truth for global Management
access. The `staff_profiles.is_management` field is updated after login for reference, but the
backend does not trust a browser-supplied Management flag.

## 6. Data and security notes
- The current website uses its own signed Discord OAuth session cookie. Supabase Auth is not used.
- RLS is enabled on all application tables and no direct `anon` or `authenticated` policies are added.
- All database access goes through the Express backend using the secret key.
- Every management/roster/chart API route performs a server-side permission check.
- `permission_audit_log` records roster, permission and organisation chart changes.
- The SQL schema starts with empty team rosters. Existing JSON-file roster data is not automatically imported.
- Back up any existing JSON data before switching. If you have already used the old JSON version, its records
  need to be imported into the matching Supabase tables before removing the old deployment.
