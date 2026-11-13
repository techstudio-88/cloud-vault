# CloudVault

CloudVault is a multi-account cloud storage workspace. Each provider retains its own quota, permissions and source of truth.

## Phase 1 foundation
- Next.js App Router + TypeScript, with a responsive dark dashboard
- Supabase email/password signup and sign-in, magic links, session refresh and auth callback
- Personal workspace + profile provisioned automatically when a user signs up
- Workspace membership model with Row Level Security
- Google Drive OAuth connect/callback routes
- Provider token bundle encrypted at rest with AES-256-GCM
- Connected Google Drive account metadata and storage quota loaded from Supabase
- Recent file UI preview (sample rows until Drive file indexing is added)
- Installable app manifest and branded 404 page

## Local development
Run `npm install`, then `npm run dev`.

Copy `.env.example` to `.env.local`. Never commit real credentials.

## Supabase Auth setup
In Supabase Authentication → URL Configuration:
- Set Site URL to `https://cloudvault-priyanshu-f732.vercel.app`
- Add `https://cloudvault-priyanshu-f732.vercel.app/auth/callback` to Redirect URLs
- Configure email confirmation and SMTP before inviting external users

## Google Drive OAuth setup
1. In Google Cloud Console, create an OAuth Web application and enable the Google Drive API.
2. Add this exact authorized redirect URI: `https://cloudvault-priyanshu-f732.vercel.app/api/connect/google/callback`.
3. Configure the OAuth consent screen and add test users while the app is in testing.
4. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to the Vercel project for Production, Preview and Development.
5. `GOOGLE_REDIRECT_URI` and a generated `TOKEN_ENCRYPTION_KEY` are already configured in Vercel. Keep the encryption key secret and never commit it.
6. Redeploy after adding credentials.

Google Drive requests full Drive access for the planned cross-drive manager. Google may require OAuth app verification before public release.

## Security notes
- Provider access/refresh tokens are encrypted server-side using AES-256-GCM.
- The encryption key is stored as a Vercel sensitive environment variable.
- Row Level Security is enabled on all public data tables.
- Service-role credentials must never be exposed to the browser.
- Do not treat dashboard sample file rows as live provider files. File listing, upload, download, copy/move and background sync are Phase 2.

## Current scope
Authentication, workspace bootstrap, account connection scaffolding and live account quota metadata are Phase 1. File operations and sync workers are not yet enabled.
