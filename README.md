# CloudVault

CloudVault is a multi-account cloud storage workspace. Each provider retains its own quota, permissions and source of truth.

## Phase 1 foundation
- Next.js App Router + TypeScript
- Premium responsive dark dashboard UI
- Navigation shell and mobile drawer
- Storage overview and connected-account preview
- Recent file list/grid and local search interaction
- Google Drive connection entry point (OAuth not active yet)
- Environment template and installable app manifest

## Local development
Run `npm install`, then `npm run dev`.

Copy `.env.example` to `.env.local` and fill values after configuring Supabase and Google Cloud. Never commit real credentials.

**Important:** Dashboard metrics and file rows are illustrative preview data. They are not live Google Drive data until OAuth, token storage, provider API calls and authorization are implemented and tested.
