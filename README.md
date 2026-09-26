# Sequence Stack Finder

Peptide goal quiz. When a friend finishes, `/api/submit` emails you their name, email, mailing address, answers and stack through Resend.

```
index.html       the quiz (static, no build step)
api/submit.js    Vercel serverless function that sends the email
```

## Deploy

1. Push this folder to a new GitHub repo (e.g. `mjclay09/sequence`).
2. In Vercel: Add New → Project → import the repo. Framework preset: **Other**. No build command.
3. Settings → Environment Variables:
   - `RESEND_API_KEY` — from resend.com/api-keys
   - `NOTIFY_TO` — the inbox that gets results
   - `NOTIFY_FROM` — optional, e.g. `Sequence <hello@yourdomain.com>` after verifying the domain in Resend
4. Redeploy, finish the quiz once yourself, and check your inbox.

Without `NOTIFY_FROM`, Resend's test sender (`onboarding@resend.dev`) is used. It only delivers to the email on your Resend account, so set `NOTIFY_TO` to that address or verify a domain.

## Test locally

```
npm i -g vercel
vercel dev
```
Put the same variables in `.env.local`.
