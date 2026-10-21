# Deployment guide — connected staging release 0.7.1

**This ZIP is not a production certification.** The preview and automated tests run locally; the new SQL, storage policies, Edge deployment, browser/mobile checkout, Google sign-in, real email and Razorpay test/live transactions have NOT been exercised against your account. Do not accept customer money until the staging checklist passes. Uploading files and running SQL alone is not sufficient.

There are two screens:

- `/index.html`: the original browser-local design preview. No real authentication, payments or shared inventory.
- `/connected.html`: the new server-connected storefront, admin and rider screens. Requires the configuration below. No SMS provider is used.

The connected screens reuse tested pricing/inventory rules. They do not yet reproduce every design-preview feature: settings use an advanced JSON editor, promotion cards are static rather than an automatic slideshow, video playback and AI/human chat are not implemented here. Reporting loads the latest 500 orders. These are known remaining development items, not unlocked by adding keys.

## 1. Put the files in GitHub

1. Download and unzip `racharla-store-staging-v0.7.1.zip`.
2. Open the inner `racharla-store` folder. You should see `dist`, `supabase`, `tests`, `scripts`, `config`, `.github` and `package.json`.
3. Create a **private** GitHub repository, then choose Add file → Upload files. Upload the contents of that folder, preserving folders. Do not upload the ZIP itself as the website.
4. Ensure `.github/workflows/test.yml` is included. Commit the files. GitHub Actions runs `npm test` on Node 24.
5. Never upload `.env.server`, service-role keys, Razorpay secrets, Resend keys or actual ebook files into the public website folder. `.gitignore` is included but does not protect manually uploaded secrets.
6. For a local check with Node 24 installed, run `npm test`. No dependency installation is needed for these tests. `npm run preview` is optional for local preview only.

## 2. Create an isolated Supabase staging project

Use a fresh project for this release. Do not run these scripts on an existing live commerce database without a migration review and backup.

In Supabase → SQL Editor, run these files in order:

1. `supabase/setup/01_connected_store.sql` — five `rm_*` tables, transaction/rate-limit/outbox functions, RLS and two storage buckets.
2. `supabase/setup/05_sample_catalog.sql` — optional sample categories/products, **all stock zero**, store closed. It does not overwrite a populated catalog.
3. `supabase/setup/03_diagnostics.sql` — inspect expected results in its comments.
4. `supabase/setup/06_permission_smoke.sql` — negative direct-access checks; it rolls back. This is not a substitute for actual user/rider/API tests.

**Do not run `supabase/migrations/202610150001...` or `202610150002...` for connected mode.** Those are older, unused draft `store_*` schemas kept for reference. The connected app uses `rm_*` and `supabase/setup` exclusively. Do not blindly run `supabase db push` against the old drafts.

Tables:

| Table | Purpose |
|---|---|
| `rm_store` | Single-store catalog/settings and revision counter |
| `rm_roles` | Server-owned enabled admin/rider assignments |
| `rm_orders` | Immutable price/file snapshots, payment/refund records, delivery and events |
| `rm_outbox` | Durable queued order emails with retry status |
| `rm_rate_limits` | Per-account action limits and email budget counters |

Stock/settings writes use a short store-row lock plus version checks. This deliberately serializes writes for a small single-store deployment. It is not designed as a multi-shop marketplace or high-volume platform.

Buckets:

- `product-images`: public images, maximum 2 MB, JPEG/PNG/WebP; authenticated admins can upload/update/delete.
- `ebooks`: **private**, maximum 20 MB, PDF/EPUB; enabled admins can create new files. No browser download, overwrite or delete policy is granted. New file versions use new object names so old purchases keep their original asset.

If either bucket already exists, inspect its settings and all other `storage.objects` policies. The script intentionally does not change an existing bucket. A pre-existing public `ebooks` bucket or broad storage policy must be corrected before uploading paid files. Prefer a fresh project.

## 3. Configure authentication

1. Supabase → Authentication → URL Configuration: set Site URL to the exact HTTPS staging domain. Add `https://YOUR-DOMAIN/connected.html` as an allowed redirect.
2. Enable Email/password sign-in, email confirmation and your desired password/abuse protections.
3. Configure custom SMTP for authentication emails. For Resend SMTP use its documented host/port/credentials and verified sender. This is separate from the order-email API key.
4. For Google: create a Google OAuth web client; use the **callback URL shown by Supabase’s Google provider page** in Google Cloud’s Authorized redirect URIs. Enter Google Client ID/secret into Supabase’s provider settings. Never put the client secret in the app.
5. Enter only the Supabase project URL and **publishable key** in `dist/store-config.js`. Keep `mode: 'preview'` until the connected page can load.
6. Visit `/connected.html`, create your own account and confirm its email.
7. Edit the email placeholder in `supabase/setup/02_admin.sql`; run it in SQL Editor. It grants admin only to one verified account. Refresh the connected page.
8. Riders sign up and confirm email too. Their Account screen shows User ID. Admin → Assign / disable rider grants or removes access. Customers cannot self-promote.

Never expose the service-role key in `dist/`, browser console, GitHub or customer configuration. Edge Functions use the server-injected `SUPABASE_SERVICE_ROLE_KEY`.

## 4. Deploy the three Edge Functions

Install the official Supabase CLI on your own computer using the current official instructions. From the project folder:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Copy `config/server.env.example` to a local **untracked** `.env.server`. Fill in:

- `STORE_ORIGIN`: exact HTTPS origin, no trailing slash or path.
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`: use TEST credentials first.
- `RAZORPAY_WEBHOOK_SECRET`: a separate random secret chosen for your webhook.
- `RESEND_API_KEY`: Resend server API key.
- `RESEND_FROM`: verified sender such as `My Store <orders@yourdomain.in>`.
- `EMAIL_WORKER_SECRET`: generate a long random secret (at least 32 random bytes).

Then:

```sh
supabase secrets set --env-file .env.server
supabase functions deploy store-api
supabase functions deploy razorpay-webhook
supabase functions deploy email-worker
```

`supabase/config.toml` sets `verify_jwt = false` because handlers perform their own explicit authentication: `store-api` calls Supabase Auth to verify the user's bearer token, the webhook validates its raw-body HMAC, and the email worker requires its private worker secret. The catalog action alone is public. Do not remove these in-handler checks.

Do not call private RPCs from the browser. They are service-role-only by design.

## 5. Connect Razorpay TEST mode

1. Configure automatic capture in the Razorpay dashboard.
2. Add webhook URL `https://PROJECT.supabase.co/functions/v1/razorpay-webhook`.
3. Set the same webhook secret configured on the Edge runtime.
4. Subscribe to `payment.captured`, `refund.created`, `refund.processed`, `refund.failed`.
5. Order placement calculates the total on the server and reserves variant stock atomically before creating the provider order.
6. The browser opens Razorpay Checkout with the provider order ID. A browser success callback alone never marks an order paid. The backend verifies the signature and fetches the captured payment, checking order ID, amount and INR currency.
7. Webhooks and “Check payment” reconcile delayed confirmation. Duplicate capture does not create a second order/email.
8. If provider-order creation times out, the app keeps the order/reservation for review. Admin must locate the matching receipt in Razorpay and use **Link uncertain provider order**. The app must not blindly create a second provider order.
9. Cancellation has **zero deduction** in connected mode. Captured refunds require admin submission; they are not silently treated as completed. If submission is uncertain, reconcile before retrying. Refund requests use durable request IDs.
10. Unpaid/failed orders do not automatically expire and release stock in this release. Review them regularly. Cancel and reconcile payment before inspecting/restoring stock; late capture after cancellation is flagged for refund review.

After test-mode acceptance, use a separate live configuration, live webhook and approved policies. Gateway fees are separate from your website hosting and are not claimed to be free.

## 6. Connect order emails without SMS

1. Verify a sender domain in Resend and add the DNS records it supplies in Cloudflare.
2. Authentication emails use Supabase SMTP. Order updates use `email-worker` and the durable outbox.
3. Every order/status/refund event queues its email in the same database commit as the event.
4. Invoke `email-worker` manually first using its URL and `Authorization: Bearer EMAIL_WORKER_SECRET` from a private HTTP client or Supabase tooling. **Never run this from browser JavaScript.**
5. Once tested, enable pg_cron and pg_net and follow `supabase/setup/04_email_cron.sql`. Put the worker URL and token into Supabase Vault using the names in that file. This processes queued mail every five minutes.
6. The worker conservatively caps attempts at 80/day and 2,000/month. Auth emails also consume your Resend allowance, so monitor the combined usage. Email failure never rolls back an order.
7. Email retries use the same idempotency key. Uncertain work older than 23 hours or repeated failures goes to review rather than retrying indefinitely. Inspect `rm_outbox`; don't reset/re-send blindly.
8. “Accepted by email provider” is not proof of inbox delivery. Bounce/delivery-webhook processing and an admin outbox UI are not included yet.

No mobile OTP is sent. The entered mobile number is explicitly unverified. The customer sees a delivery code inside their signed-in order; the rider never receives it from the API.

## 7. Add products, offers and ebooks

1. Admin → Add product / ebook: enter name/category, select Physical or Ebook, set variants with price and available packs/licences. Example: `500 g | 45 | 20 | true`.
2. Stock is per variant. Preserve existing variant order when editing; disable old variants instead of deleting them. Review real stock before enabling sales.
3. Upload a cover image. For ebooks also upload a private PDF/EPUB. Only sell files you own or have permission to distribute. File scanning/DRM/watermarking is not included.
4. Ebook quantity is limited to one copy per order. Available stock acts as the number of licences for sale; choose it deliberately.
5. Digital-only checkout skips physical address/delivery checks and charges ₹0 delivery. Captured payment makes the digital order fulfilled.
6. Mixed orders charge delivery only for the physical handover. Paid ebooks become downloadable while physical goods are prepared.
7. Customer → My orders → Download generates a private link valid for 60 seconds. Other customers and riders cannot obtain it. The purchase stores the original file path; replacing a product file does not replace earlier purchases.
8. Pending or completed refunds lock all ebook downloads for that order, including mixed orders. This is deliberately conservative; per-item refund entitlements are not implemented. Previously downloaded files cannot be recalled.
9. Duplicate receipts retain the same order ID and totals. They do not charge or decrement stock again.

## 8. Configure delivery and store details

Admin → Store, offers & delivery settings uses a JSON editor in this staging release. Keep all required fields:

- `branding`: actual shop name, address, phone, email, about text.
- `storePin`: `{"lat": YOUR_LATITUDE, "lng": YOUR_LONGITUDE}`.
- `radius`: for example `5`; `freeKm`: `1`; `rate`: `10` rupees per additional started km.
- `free`: `true` for a free-delivery offer; otherwise `false`.
- `allowedPincodes`: e.g. `["500001"]`, or `[]` for radius-only coverage.
- `deliveryEnabled`: `true` only after the location/rules are verified.
- `billOffer`: percentage, minimumPaise, capPaise and stack setting. ₹100 = 10,000 paise. Set explicit valid dates when scheduling.
- `policies.privacy`, `policies.terms`, `policies.returns`: replace blank placeholders with your actual reviewed terms.
- `storeMode`: keep `closed` until acceptance passes, then `open`.

Distance is straight-line radius, not road distance or city-boundary verification. PIN code is typed by the customer; it is not independently reverse-geocoded. Navigation opens Google Maps; there is **no live rider GPS tracking**. Maps and internet access may have usage/cost restrictions outside this code.

Admin progresses paid physical orders: Preparing → Ready for pickup → assign enabled rider → Out for delivery. Dispatch creates a fresh customer-only code valid for 24 hours. Rider opens the app on their phone, reads the saved receiver/address, calls using their own phone plan and opens directions. After the customer checks items, the rider enters the code and actual receiver name. Five wrong attempts lock the code; admin can reissue after contacting the customer.

If the customer cannot provide the code, use a reviewed admin exception recording receiver, reason and confirmation method. Without reliable confirmation, report failure rather than marking delivered. Handover does not waive later product complaints.

## 9. Host the frontend on Cloudflare

1. Cloudflare Pages → connect the GitHub repository.
2. Framework preset: None; no build command; output directory: `dist`.
3. Set the project root to the folder containing `package.json`, if you uploaded an extra parent folder.
4. Add your actual subdomain through Cloudflare's custom-domain flow. Do not assume a guessed DNS target.
5. Use that exact HTTPS origin in `STORE_ORIGIN`, Supabase Site URL and allowed redirects.
6. Update `dist/store-config.js`: set Supabase URL/publishable key and `mode: 'connected'`. Commit to GitHub. The root page redirects to `/connected.html`.
7. Keep the staging site restricted from customers. A `noindex` tag is not access control. Connected pages intentionally remain noindex and are not advertised as public launch-ready.
8. Test a fresh/private browser to avoid old preview cache. The service worker caches only the preview shell; connected order/payment/ebook/API data is not cached for offline use.

## 10. Required staging acceptance — do not skip

Record result, tester, device and date for each case in `STAGING_ACCEPTANCE.md`.

- Run setup SQL and diagnostics successfully; test direct anonymous/authenticated table/RPC denial.
- Google and email sign-in, email verification, recovery, expired session, sign-out, wrong account.
- Every category/variant Add, plus/minus, sold-out/disabled items, quantity sums, discount rounding, paid/free/out-of-area delivery and receipts on mobile/desktop.
- Two sessions purchase the last physical unit simultaneously: only one reservation succeeds.
- Admin changes stock/price during checkout: stale request is rejected or repriced, not silently overwritten.
- Razorpay test success, failure, closed checkout, delayed capture, duplicate callback/webhook, invalid signature, wrong amount and uncertain provider-order creation.
- Customer isolation, rider assignment isolation, disabled rider, no direct admin promotion.
- Confirmed/failed/delayed emails, retries, resend cooldown, budget limits, scheduling and provider acceptance status.
- Physical, ebook-only and mixed orders; private bucket denial; unpaid/other-user download denial; successful paid download; expired link; refund lock; replaced ebook file retains old purchase version.
- Correct/incorrect/expired code, five-attempt lock, duplicate handover, admin exception, customer unavailable, failed delivery and inspected restock.
- Partial/full refund, duplicate refund request, provider timeout, webhook confirmation and reconciliation. Check actual provider dashboard totals.
- Print customer/shop/duplicate receipts; verify every line, discount, delivery and refund amount.
- Maintenance/closed store must preserve existing order history and support.

Still required before a real launch: actual tax/invoice treatment, final policy/business details, monitoring/backups/recovery, browser/accessibility/security review, production payment-provider approval, verified quotas and the known remaining development items listed at the beginning. This release cannot truthfully promise "no SQL issues" without running against your project.

## Troubleshooting permissions without weakening security

| Symptom | Check |
|---|---|
| `relation does not exist` / `PGRST205` | Correct Supabase project? Run setup 01. Connected mode uses `rm_*`, not old `store_*`. Inspect function logs. Reload schema after verified changes if needed. |
| Table permission denied from browser | Expected for commerce tables. Browser must call `store-api`, not insert directly. Never grant `anon` writes or disable RLS. |
| Permission denied inside Edge | Verify service-role server environment, execute grants from diagnostics, and exact deployed function versions. Never fix by exposing service key to frontend. |
| 401 / session expired | Correct project URL/key, confirmed email, fresh user session. The publishable key is not a user access token. |
| Origin blocked | `STORE_ORIGIN` must exactly equal the browser origin; no slash/path. |
| Storage upload denied | Verified account is enabled admin in `rm_roles`; bucket exists; expected policy is present. Refresh session/page. |
| Ebook accessible publicly | Stop sales immediately; inspect bucket `public` flag and all broad storage SELECT policies. Use fresh private bucket/project and validate denial. |
| Stock update conflict | Another order/admin save changed the revision. Refresh and reapply the intended edit. Do not overwrite the newer stock. |
| Payment succeeds but order pending | Check webhook secret/events/logs and use Check payment. Don't pay again just because a callback was delayed. |
| Email remains queued | Worker secrets/sender verification, cron HTTP response, budget cap and outbox timestamps. Auth SMTP is a separate setup. |

## Official references

- https://supabase.com/docs/guides/functions/auth
- https://supabase.com/docs/reference/javascript/auth-getuser
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/storage/buckets/fundamentals
- https://supabase.com/docs/guides/functions/schedule-functions
- https://supabase.com/docs/guides/functions/deploy
- https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
- https://resend.com/docs/api-reference/emails/send-email
