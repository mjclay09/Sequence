# North Star Peptide

Peptide goal quiz plus "Peptides Simplified", a plain-English peptide library.

```
index.html                 the quiz (also serves private result links at /r/<id>)
api/result.js              looks up / deletes a saved result for a private link
api/_db.js                 Supabase helper (server only)
supabase-schema.sql        the one table saved results live in
manifest.webmanifest, sw.js  make the site installable as a phone app and work offline
api/submit.js              emails you each finished quiz (Resend)
peptides/                  generated library pages (commit these)
scripts/peptides-data.mjs  library content: edit this
scripts/build-learn.mjs    regenerates peptides/, robots.txt and sitemap.xml
```

## Editing the library

1. Edit `scripts/peptides-data.mjs`.
2. Rebuild: `SITE_URL=https://northstarpeptide.org node scripts/build-learn.mjs`
3. Commit and push. Vercel serves the files as-is, no build step.

`SITE_URL` adds canonical URLs and writes `sitemap.xml`. Submit `https://northstarpeptide.org/sitemap.xml` in Google Search Console.

## Email setup

Vercel → Settings → Environment Variables:
- `RESEND_API_KEY` from resend.com/api-keys
- `NOTIFY_TO` the inbox that gets results
- `NOTIFY_FROM` optional, e.g. `North Star Peptide <hello@northstarpeptide.org>` after verifying the domain in Resend

## Saved results (private links)

1. Create a Supabase project (supabase.com → New project), e.g. "North Star Peptide".
2. SQL Editor → paste `supabase-schema.sql` → Run.
3. Project Settings → API: copy the Project URL and the `service_role` secret key.
4. Vercel → Environment Variables: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Redeploy.

Without these, the quiz still works and still emails you; it just doesn't save or send private links.
Friends' private-link emails need a verified sending domain in Resend (`NOTIFY_FROM`); the test sender can only email your own address.

## Phone app

The site is a Progressive Web App. On iPhone: Safari → Share → Add to Home Screen. On Android: menu → Install app.
The site menu also has a "Get the app" button that walks people through it.
