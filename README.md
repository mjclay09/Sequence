# The North Star

Peptide goal quiz plus "Peptides Simplified", a plain-English peptide library.

```
index.html                 the quiz
api/submit.js              emails you each finished quiz (Resend)
peptides/                  generated library pages (commit these)
scripts/peptides-data.mjs  library content: edit this
scripts/build-learn.mjs    regenerates peptides/, robots.txt and sitemap.xml
```

## Editing the library

1. Edit `scripts/peptides-data.mjs`.
2. Rebuild: `SITE_URL=https://yourdomain.com node scripts/build-learn.mjs`
3. Commit and push. Vercel serves the files as-is, no build step.

`SITE_URL` adds canonical URLs and writes `sitemap.xml`. Submit `https://yourdomain.com/sitemap.xml` in Google Search Console.

## Email setup

Vercel → Settings → Environment Variables:
- `RESEND_API_KEY` from resend.com/api-keys
- `NOTIFY_TO` the inbox that gets results
- `NOTIFY_FROM` optional, e.g. `The North Star <hello@yourdomain.com>` after verifying the domain in Resend
