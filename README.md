# CloudVault

CloudVault is a cloud workspace for browsing and organizing connected Google Drive accounts. Files remain stored in Google Drive; CloudVault stores account metadata, encrypted OAuth credentials and file indexes.

## Phase 1 foundation
- Next.js App Router + TypeScript responsive SaaS workspace
- Supabase email/password, magic-link signup/sign-in, auth callback and session refresh
- Personal workspace and profile bootstrap
- Workspace membership model and row-level security
- Google Drive OAuth connection
- Provider token bundle encrypted server-side with AES-256-GCM
- Live provider quota metadata and connected-account state

## Phase 3 storage engine
- Live Google Drive file and folder listing, folder navigation and provider-side filename search
- Create folders and rename files
- Move files to Google Drive trash (recoverable in the provider's Trash)
- Download binary files and export Google Docs, Sheets (CSV), Slides and Drawings (PDF)
- Resumable uploads using 4 MB chunks, with server-side upload sessions and progress reporting
- Copy individual files between connected Google Drive accounts (20 MB per file in this serverless transfer route)
- Supabase file metadata index, transfer/upload job records and activity events
- Live provider quota refresh while browsing files
- Responsive SaaS workspace: functional navigation, account picker, file list, upload dropzone, transfer modal, loading/empty/error states and mobile navigation

## Phase 4 advanced engine
- Email-bound workspace invitations with seven-day expiry and single-use acceptance
- Owner-managed member role changes and invitation revocation
- Workspace invitation acceptance requires an authenticated account whose email matches the invitation
- Automation rule creation, listing, enable/pause and persisted hourly/daily/weekly scheduling metadata
- Scheduled-rule indexes and run-status fields for the forthcoming durable worker

## Phase 4 scheduler configuration\nThe daily Vercel Cron endpoint is `/api/cron/automations` (the current Vercel Hobby plan permits daily cron execution). Configure `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` as sensitive Vercel environment variables for Production, Preview and Development. The worker fails closed when either is absent and validates the bearer secret before using the service-role client. Do not expose either value to the browser or commit them.\n\n## Local development
Run `npm install`, then `npm run dev`.

Copy `.env.example` to `.env.local`. Never commit real credentials.

## Supabase Auth setup
In Supabase Authentication → URL Configuration:
- Set Site URL to `https://cloudvault-priyanshu-f732.vercel.app`
- Add `https://cloudvault-priyanshu-f732.vercel.app/auth/callback` to Redirect URLs
- Configure email confirmation and production SMTP before inviting external users

## Google Drive OAuth setup
1. In Google Cloud Console, create an OAuth Web application and enable the Google Drive API.
2. Add this exact authorized redirect URI: `https://cloudvault-priyanshu-f732.vercel.app/api/connect/google/callback`.
3. Configure the OAuth consent screen and add test users while the app is in testing.
4. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to Vercel for Production, Preview and Development.
5. `GOOGLE_REDIRECT_URI` and `TOKEN_ENCRYPTION_KEY` are configured in Vercel. Keep the encryption key secret and never commit it.
6. Redeploy after setting the Google credentials.

Google OAuth may require app verification before public distribution. The current OAuth flow requests Drive access to support file management across accounts.

## Security
- Provider access and refresh tokens are encrypted server-side using AES-256-GCM.
- Encryption key is stored as a Vercel sensitive environment variable.
- Supabase row-level security scopes account, file and transfer records by owner.
- Never expose Supabase service-role credentials to the browser.
- All Drive API routes verify the signed-in user and ownership of the connected account.
- Resumable upload session URLs are stored only in owner-scoped server-side job records and never returned to the browser.

## Known Phase 2 limits
- Cross-account transfers currently support individual files up to 20 MB; folders and larger transfers need a durable background worker.
- Google Sheets export defaults to CSV; other native Google file types export to PDF.
- Smart collections are navigation shortcuts at this stage; automatic classification and deduplication are not enabled.
- Automation rules are persisted with run history and executed by the hourly scheduled worker when its required server secrets are configured.
- Smart upload can route each file to the connected Google Drive with the most available capacity.
- Duplicate finder compares provider MD5 checksums and file sizes across connected drives; it reports candidates but never deletes files automatically.
- Folder-organization automation produces reviewable suggestions only; it never moves user files without explicit action.
- The current implementation is Google Drive-first. Dropbox, OneDrive and other providers are future work.
