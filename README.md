# KNG Staff Management Portal

This replaces the old static organisation-chart deployment with an Express web service.
It includes Discord OAuth login, management-controlled team ADM permissions, shared roster
storage, staff search, and a responsive hamburger sidebar.

## Teams
Gangs, Legal, Actions, Interactions, Calls, Order, Knowledge, Discord, Tickets, WallStreet.

## Permissions
- **Management**: configured through `MANAGEMENT_DISCORD_IDS`; can edit all rosters,
  search server members, grant/revoke team ADM access, and manage the organisation chart.
- **Team ADM**: management assigns one or more team permissions to a Discord account.
  They can edit only those teams.
- Roster data and permissions are stored server-side in `DATA_FILE`, not browser storage.

## Required Render environment variables
Set these in Render > your service > Environment:

- `DISCORD_CLIENT_ID`: Discord OAuth application client ID.
- `DISCORD_CLIENT_SECRET`: Discord OAuth application client secret.
- `DISCORD_REDIRECT_URI`: `https://YOUR-SERVICE.onrender.com/auth/discord/callback`
- `SESSION_SECRET`: long random secret (at least 32 characters).
- `MANAGEMENT_DISCORD_IDS`: comma-separated Discord user IDs for the initial management accounts.
- `DISCORD_BOT_TOKEN`: bot token for server member search (keep secret).
- `DISCORD_GUILD_ID`: Discord server ID used by staff search.
- `DATA_FILE`: `/var/data/kng-portal.json` (recommended with the persistent disk).

Also enable the **Server Members Intent** for the bot in the Discord Developer Portal.
The bot must be in the target server. Member search uses Discord's guild member search API.

## Discord OAuth setup
1. Open Discord Developer Portal > Applications > your application > OAuth2.
2. Add this exact redirect URI: `https://YOUR-SERVICE.onrender.com/auth/discord/callback`
3. Copy the Client ID and Client Secret into Render environment variables.
4. The OAuth flow requests `identify` only. The bot token is used server-side for staff search.

## Render deployment
1. Push the contents of this folder to your GitHub repository.
2. Create a **Web Service**, not a Static Site.
3. Use the included `render.yaml`, or set Build Command to `npm install` and Start Command to `npm start`.
4. Attach a persistent disk mounted at `/var/data`.
5. Add all required environment variables and deploy.

## First login
The Discord IDs in `MANAGEMENT_DISCORD_IDS` are the management bootstrap accounts.
Log in with one of those Discord accounts, open **Management**, then use Staff Search
to find members and grant them ADM access to one or more teams.

## Important notes
- Never put the bot token, client secret, or session secret in frontend files or GitHub.
- Use a persistent disk. Without it, Render may replace the local data file during deploy/restart.
- The example Discord IDs in the original message were not imported into any roster.
- The original organisation chart has been retained as a management-only editable page.
