> **0.7.0 update:** The original preview notes below are historical. The new connected implementation and its exact remaining gaps are documented in `DEPLOYMENT_GUIDE.md`, `RELEASE_STATUS.md` and `TEST_RESULTS.md`. Connected mode uses `supabase/setup`, not the old draft migrations. It has not been validated on a real Supabase project or in a browser.

# Security and launch review — 16 October 2026

## Result

**Not approved for real orders or public commerce.** This is an owner-private
front-end prototype with local browser data. A private hosting gate is not a
replacement for the store's customer/admin/rider authorization model.

This review covers the local JavaScript, HTML and draft SQL, with targeted Node
tests. Strix is not installed. No authenticated penetration test, live provider
test, browser visual QA, Supabase policy execution or database migration was run.
Do not describe this as a certified audit or as free of vulnerabilities.

## Findings addressed

| Finding | Change | Limit |
| --- | --- | --- |
| Pack sizes and clothing sizes shared aggregate stock | Independent variant IDs, prices and stock; separate cart lines | Local only; server must enforce atomic reservations |
| Whole-cart failure could otherwise leave partial stock mutations | Validate all variant quantities before consuming any stock | A browser operation is not a database transaction |
| Invalid/negative/non-finite prices or quantities could enter calculations | Numeric ranges, decimal-price checks, whole-stock checks, maximum 99 packs per cart line | Browser code is still bypassable |
| Product images were interpolated without escaping their URL | Validated HTTPS/raster data URLs and escaped HTML attributes; raster upload size limit | Production uploads need verified decoding/re-encoding and storage policy |
| Customer could select a store-fault reason to bypass a cancellation fee | Store-fault reasons require admin review; server-rule function rejects customer use | Production actor identity must come from authenticated authorization |
| Refund ledger could hide an invalid negative balance | Reject malformed amounts, over-refunded ledgers and invalid timestamps | Requires provider reconciliation and database constraints |
| Missing page-level script restriction | CSP meta restricts scripts, embeds, objects, base URLs and forms | HTTP frame-ancestors, transport and production CSP need deployment verification |
| Old cart entries could silently refer to wrong pack sizes | Stable ID migration, unavailable-option blocking and retained invoice snapshots | Existing legacy invoices have only their original available detail |

The CSP allows same-origin scripts and pinned Leaflet from unpkg (with integrity
hashes); it does not allow inline scripts or eval. CSS still permits inline styles
for the existing UI/map library. Customer-selected images can use HTTPS hosts.
YouTube and Vimeo embeds use exact provider allowlists and load on interaction.
Meta CSP does not implement frame-ancestors. No claim is made about HTTP response
headers that have not been tested.

## Open launch blockers

1. **Critical for public use: no app authentication or authorization.** The role
   switcher intentionally exposes admin/rider demo screens. Use Supabase Auth,
   server-side role checks and tested row-level policies. A customer must never
   be able to update roles, prices, stock, refunds, notices or another customer's
   orders. Riders must see only assigned delivery details.
2. **Critical for real money: client-owned commerce state.** localStorage values
   and frontend JavaScript are editable. Move all prices, offer eligibility,
   delivery quotes, stock reservations and status transitions to trusted endpoints.
   Browser calculations are display-only once production is connected.
3. **Critical integration gaps:** Razorpay capture verification, raw webhook
   signature checks, duplicate-event handling, refund reconciliation and durable
   Resend outbox processing are not implemented. Do not accept payment yet.
4. **Inventory concurrency:** local stock does not synchronize between devices.
   Reserve SKU stock atomically, expire unpaid reservations, and reconcile late
   captures before confirming fulfillment. Test simultaneous last-item purchases.
5. **Production availability:** add monitoring, backups, restoration drills,
   independent maintenance handling, server-enforced rate limits and order limits.
6. **Delivery integrity:** current radius checks use editable customer inputs and
   straight-line distance. Verify coordinates, service areas, address/PIN matching
   and route rules on the server. Configure the actual shop location.
7. **Privacy/storage:** browser-local address data is not suitable as a shared-device
   production store. Add authenticated storage, retention/deletion, upload controls,
   access logs and a complete privacy policy. Do not store provider secrets in JS.
8. **Business rules:** legal cancellation review, actual tax/invoice rules, food
   details, return eligibility, damaged goods, delivery proof and customer support
   need real store configuration and end-to-end testing.

## Tests run in this pass

- Variant identity, independent weights/sizes, available stock, hidden variants,
  oversell prevention, cart migration and all-or-nothing prevalidation.
- Money/quantity rejection, duplicate IDs/labels, invalid cart keys and line limits.
- Discount rounding, allocation, offer dates, caps and minimum spend.
- Delivery radius, PIN restrictions, free-distance and charged-distance behavior.
- Cancellation and refund limits, actor/reason restrictions, failed transitions,
  duplicate refunds and resend cooldowns.
- Media URL normalization, host-spoofing rejection, unsupported URL schemes and
  content-policy presence. These are targeted tests, not a full XSS assessment.

## Staging security test after integrations

Use a separate staging domain/database and Razorpay test mode. Seed customer A,
customer B, rider and admin test accounts. Run Strix or another authorized scanner
against this staging app only, with written scope and no real customer records.
Verify role bypass, cross-account order access, stored XSS, malicious uploads,
CSRF where applicable, brute-force/rate limits, price tampering, negative quantities,
webhook replay, duplicate refund requests, concurrent stock purchase and ordering
while closed. Verify fixes, then rerun relevant tests. Do not scan shared hosting
infrastructure or third-party payment, map, video or email services.

References used to structure the review:
- https://owasp.org/projects/web-security-testing-guide
- https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors
