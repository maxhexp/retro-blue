# Retro Blue website editor

The editor is deployed at https://retroblue.pages.dev/admin/. Google sign-in is configured in production. The first complete live login and editing session still needs verification in the manager's browser.

## Manager workflow

Visit `/admin` and sign in with the Google account an owner added to Team. Gmail and managed Google Workspace addresses are supported. Website edits are shared drafts:

1. Edit Website, Stories & shows, Homepage banner, or Sections.
2. Save draft.
3. Open Preview.
4. Publish changes to update the database. No website rebuild is needed.

Each entry is one show or story, with an optional cover and up to 30 gallery photos. Upload multiple photos at once, add descriptions/captions, and move them into order. No placeholder image is required.

Collection sections can use a vertical list or a grid. Shows default to a vertical list, sorted by upcoming date. Other posts use their post date for newest-first ordering, so editing an old story does not move it to the top. Both layouts stack on phones. Empty sections can stay hidden; their activity tiles open the club introduction until content exists.

Team changes are immediate. Owners can add an email as an editor or owner, change its role, or remove it. Editors can edit and publish content but cannot manage the team. The last owner cannot be removed or demoted. Authorization is checked on every admin request, even if that person still has an active Google sign-in session.

History keeps the last 20 published versions. Restore copies a version into the draft; publishing is a separate action. Concurrent saves are rejected rather than silently overwriting another manager’s changes.

Images are resized in the browser and uploaded as WebP, up to 1 MB each. Uploaded images are public assets, including uploads to drafts. Do not upload private documents. Shows need start/end dates and can be marked sold out or cancelled. Dates are entered in the manager’s device time zone and displayed to visitors in Pacific time.

## Production setup status

Cloudflare account: `634077e01dbe86dcbd142397247a6e4f`.
Pages project: `retroblue`; website: https://retroblue.pages.dev.
D1 database: `retro-blue-content`, ID `c9302953-da4a-497b-8216-fa2edcf503e8`.

Completed in Cloudflare:

- Created the D1 database on the existing free plan.
- Executed `server/schema.sql`.
- Added production Pages binding `DB` to this database and deployed the backend.
- Configured `GOOGLE_CLIENT_ID` and deployed it.
- Seeded the two approved owners once after explicit access confirmation. Do not rerun the seed after team changes.
- Published the November 6 Lyric Hyperion flyer, without a ticket link.
- Created the Google Auth web client in project `retro-blue`, authorized only for `https://retroblue.pages.dev`, and moved Google Auth to production. No billing account was linked. Future managers can be added through Team without maintaining Google's test-user list.
- Published the factual website data-use notice at `/privacy`.

Pending:

- Complete a live manager login, then verify upload, draft preview, publish and sign-out. The Google button renders, but the automated in-app browser did not open the account chooser. These flows and authorization checks pass local tests; that is not a substitute for live sign-in verification.

Only basic Google identity is needed; no Gmail, Drive, contacts or calendar permissions. A Google client secret is not used by this Google Identity Services button/token flow.

Cloudflare Access was NOT activated. Its free-plan checkout required a payment method and authorization for overage charges. The user selected Google sign-in without billing instead. Do not enable Cloudflare Zero Trust or paid services as a workaround.

Authentication verifies Google JWT signature, issuer, audience, expiry and verified Google-managed email. Login uses a per-browser nonce and same-origin POST checks. The session token is held in a Secure, HttpOnly, SameSite=Strict cookie and expires within one hour. The D1 Team list determines permissions on every request. No Google token is stored in localStorage or in the database. Non-Gmail consumer Google accounts using a third-party email are rejected because Google does not remain authoritative for those email addresses.

The public editor shell contains no private content. All admin APIs check authentication and roles. Preview data is fetched from the protected API and not stored in the public-site cache. Never configure `LOCAL_DEV` in production; the test bypass additionally rejects non-loopback hostnames.

This implementation uses Pages Functions and D1 with Google Identity Services. It does not require Sanity, paid media storage, or an email sending provider. Free plans have usage limits and providers can change terms; “free forever” cannot be guaranteed. No paid plan should be enabled without approval.

## Local development

Use Node 24 and `npm ci`, then:

```sh
npm run build
npx wrangler d1 execute DB --config wrangler.local.json --local --file server/schema.sql
npx wrangler d1 execute DB --config wrangler.local.json --local --file server/seed-owners.sql
npm run preview:admin
npm test
```

The preview is at `http://127.0.0.1:4179/admin/`. It signs in as a test owner and does not test live Google login. If seed-owners.sql is absent, create a local test owner using SQL; never commit private email lists to the public repo. `wrangler.local.json` has a dummy database ID and is not a deployment configuration. Restart the local Wrangler server after rebuilding its Worker.

The existing GitHub Pages static deployment cannot run this backend. Cloudflare Pages is the production target.
