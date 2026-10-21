# Test results — 16 October 2026, release 0.7.1

**Executed:** `npm test` using Node 24.19.0. **11 suites passed, 0 failed checks.** The runner also syntax-checks every top-level browser JavaScript file and all JS/MJS/TS files under `supabase/functions`.

| Suite | Scope |
|---|---|
| Commerce | Percentage offers, best/stacked discounts, date/minimum/cap rules, paise allocation, distance and delivery fees |
| Inventory | Independent variant price/stock, add/remove, maximum quantity, oversell and whole-basket validation |
| Retail flow | New physical categories through mixed basket, quantity totals, stock and customer/shop/duplicate receipts; frozen values and India reporting dates |
| Order rules | Demo cancellation/grace/refund limits, transitions and resend cooldown |
| Content | Allowed video URLs, category validation and notice expiry |
| Provider contracts | Synthetic checkout/webhook signatures, capture identity/amount, email request and mocked Google adapter |
| Connected engine | Server quantities/offers/delivery, physical/ebook/mixed orders, download payment/refund gate, customer isolation, no-SMS code limits and exceptions |
| Connected Edge API | Actual handler with mocked database/Auth/Razorpay/Storage: origin/auth checks, quote, repeated checkout stock once, verified/repeated capture, duplicate refund, protected orders/downloads |
| Email worker | Mocked worker authentication, escaped email body, provider acceptance, stable idempotency and retry |
| Security basics | Original preview CSP/script regression checks and limited credential-pattern scan |

## Preview rendering repair

The 0.7.0 header link replacement removed a span still accessed by `syncBrand()`. That raised a null-reference error before the storefront rendered. A new lightweight DOM contract harness reproduced the failure against the actual entry script. The fix uses an explicit guarded tagline ID. The same harness now checks category/product rendering, filtering, Add/quantity/cart actions and saved-state reload. This is not a browser or layout test. The Ebooks preview category was also added, clearly marked as needing connected mode for purchases.

## Not performed

- No real PostgreSQL/Supabase SQL execution, transaction race test, RLS/storage policy execution or Edge deployment.
- No live Auth/Google/SMTP/Resend/Razorpay request or real payment/refund.
- No full Deno runtime/type test. Edge syntax and mocked handler execution used Node's TS support.
- No browser/button-click end-to-end, mobile viewport/accessibility, real map rendering, printing, PWA installation or external checkout CSP test. The required browser QA surface is unavailable here.
- No Strix or other penetration-test certification. The static security suite is not a complete audit of the new connected app.

Passing rule/mocked tests does not establish these external properties. All unperformed acceptance cases are left explicitly unchecked in STAGING_ACCEPTANCE.md. No customer emails or money were sent/moved during these tests.

The package integrity check verifies the ZIP can be extracted and excludes Git/Sites internals and real environment files. It is not a full secret-discovery or security guarantee.
