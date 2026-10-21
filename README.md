> **0.7.0 update:** The original preview notes below are historical. The new connected implementation and its exact remaining gaps are documented in `DEPLOYMENT_GUIDE.md`, `RELEASE_STATUS.md` and `TEST_RESULTS.md`. Connected mode uses `supabase/setup`, not the old draft migrations. It has not been validated on a real Supabase project or in a browser.

# Racharla Mart

Private, single-store commerce preview. This is NOT a production commerce system.

## Working preview

`dist/` contains a buildless responsive application. It simulates catalog editing,
cart, size selection, stock checks, delivery rules, rider assignment, validated
order-status changes, cancellation quotes, partial refund requests, versioned
policies, customer timelines and notification records. Sample data is stored in
this browser's localStorage. Image uploads are temporary object URLs and are not
retained after reload. Reset demo clears sample state. Do not enter real customer
data, passwords, payment credentials or API secrets into this preview.

Cancellation fees are disabled by default. The optional fee toggle is a simulation
for new demo orders. It is not an approved legal policy. Customers receive no
deduction for store-fault cancellations. Provider-confirmed refund completion is
not simulated as real success. Failed deliveries need admin review; returned goods
need inspection before any stock is restored.

## Latest additions

Vegetables, footwear, belts/wallets, handbags/purses, bangles/jewellery, bindis/ticklies and beauty/personal care have editable categories and zero-stock sample variants. Customer, shop and duplicate printable receipt copies preserve the order ID and frozen pricing. Admin inventory includes per-variant stock and movement records; sales statistics use India dates and distinguish demo orders from collected payments. A basic PWA shell is included; installation and offline behavior still require device testing.

Start with `START_HERE.md`, `REQUIREMENTS_CHECKLIST.md`, `INTEGRATION_SETUP.md` and `TEST_RESULTS.md`.

## Verification

Run `npm test` for all seven automated suites and JavaScript syntax checks.

Run `node --check dist/app.js` and `node tests/order-rules.test.cjs`.
Run `node tests/commerce-rules.test.cjs` for offer and delivery arithmetic.
Run `node tests/content-rules.test.cjs` for safe media URLs and content controls.
Run `node tests/inventory-rules.test.cjs` for pack/size inventory and cart validation.
Run `node tests/security-basics.test.cjs` for static CSP/entrypoint regression checks.
Browser visual QA is unavailable in the current environment. SQL is a draft and
has not been executed or security-tested against Supabase.

## Pack sizes and review

Every product now has stable variant records: label, independent price, stock in
packs and enabled state. The customer dropdown updates its price and availability;
different pack sizes remain separate in cart and invoice snapshots. Admin → Products
can add, rename, price, stock or disable an option. Clothing sizes use the same model.

Migration preserves existing total demo stock. Pickle stock remains on its original
250 g pack; new weight choices start with zero stock and example proportional prices.
Existing aggregate clothing stock is put on M; L and XL start at zero until the admin
sets actual inventory. This does not invent stock for newly introduced options.
Old cart sizes remain identifiable and block checkout if unavailable.

`SECURITY_REVIEW.md` records the review, fixes, remaining production blockers and
future staging-test scope. Admin → Review shows a short launch-readiness summary.
Strix was unavailable; source review and targeted Node tests were used instead.

## Store content and service notices

Admin → Content controls store name, tagline, description, logo, contact details,
about text, editable category names/visibility, promotion slides and video links.
Brand changes update the app header, footer and page title, not the host URL or
an installed PWA identity. Slides support image URLs or small raster uploads,
ordering, visibility and category buttons. The carousel has manual navigation,
pause/play, reduced-motion support and stops rotating on hover/focus.

YouTube and Vimeo links are parsed against an exact hostname allowlist, including
YouTube short/live links and Vimeo unlisted hashes. The iframe loads only after
Play is pressed. Provider permissions can still block playback; an external link
is available. No video has been invented or supplied for the store. Admin must
add their own video. Media settings persist only in this browser; cloud storage,
size enforcement, moderation and authenticated publishing are not connected.

Admin → Delays publishes a manual notice for weather, traffic, demand or staff
issues, optional extra-wait estimate and expiry, and optional pause of new orders.
The notice is visible across screens. Publishing adds events and preview email
records to active orders without overwriting delivery status. Notices expire
locally while the page runs. There is no weather API or server scheduler yet.
Production must persist this centrally and deliver email from an outbox.

Snacks, Food and Homemade Food have sample, zero-stock listings. Product editing
supports category assignment, unit description and food information; customers
can view ingredients/allergen/preparation/storage notes. These fields do not
replace business registration, actual product checks or final food-sale rules.
Renaming a category preserves size-selection settings. Hidden categories block
their products at checkout, including items already in the bag.

## Offers and map preview

Admin → Offers supports percentage product discounts and a bill promotion
(initial sample: 5%). It includes start/end times, minimum eligible merchandise
spend, a savings cap and explicit stacking. With stacking disabled, checkout uses
the better of all product discounts or the bill discount; it does not double count.
With stacking enabled, the bill percentage and minimum apply to merchandise after
product discounts. Delivery is never percentage-discounted. Arithmetic uses paise;
bill discounts are proportionally allocated to invoice lines with deterministic
rounding. Orders retain a pricing snapshot. A changed quote requires another review.

Admin → Delivery configures store pin, straight-line radius, free distance, charge
per additional started km, delivery pause, free delivery and optional PIN-code list.
No real store coordinates are assumed. The explicit sample-location button loads a
labelled Hyderabad reference point for testing. Customers select a pin and enter an
address and PIN code. Missing/out-of-area pins block demo checkout. City text is a
label, not geographic city-boundary validation. Typed PIN codes are not reverse-
geocoded or independently verified in this preview.

Leaflet 1.9.4 loads on demand with integrity checks. OpenStreetMap tiles are fetched
by the user's browser only when a map is opened. Users may tap or drag a pin, use
device geolocation after an explicit action, or enter coordinates if maps fail.
The service circle and pricing use Haversine straight-line distance, NOT road
distance. Routing APIs, monitored production map service and server-side geographic
checks remain required. The tile service has no guaranteed availability for this app.
Assigned new orders include Google Maps driving-direction links; these are not
live rider tracking. No background geolocation is collected.

Before production, use protected server-side SKU stock for size/color/weight variants;
the demo's separate variant stock is still browser-local. Implement authenticated backend price/offer
verification, tax rules, cart/order limits, provider integrations, observability,
backups, abuse limits and full payment/delivery failure testing.

## Production boundary

Do not expose this demo's role-switching UI as production authorization. Replace
localStorage commerce state with server-owned data and authenticated role checks.
Only the real backend may calculate totals, reserve inventory, confirm payments,
quote cancellations or request refunds. Keep the preview noindex until launch.

The draft migration is `supabase/migrations/202610150001_store_foundation.sql`.
It separates SKU stock, order snapshots, payment/refund ledger, audit events,
email outbox and webhook receipt deduplication. All client writes are denied.
It is a schema foundation, not a finished integration. Apply only after reviewing
the target project, testing migrations and adding transactional server functions.

## Required next connections

- Supabase project URL, publishable key, and selected development project.
- Verified main-admin user ID/email, Google OAuth and email authentication setup.
- Razorpay TEST key ID; secret and webhook secret through server secret settings.
- Resend verified sender domain/address; API secret through server secret settings.
- Actual shop address, city, service area, legal/business details and product data.
- Map provider, billing arrangement where applicable, and restricted browser key.
- GitHub repository and the intended Cloudflare/custom-domain deployment target.

Never commit secrets. Service-role keys and provider secrets stay server-side.

## Backend implementation sequence

1. Verify the authenticated user; read their role from a protected server-owned
   profile. Deny customer access to admin operations. Riders see only assignments.
2. Price orders on the server; validate geographic eligibility and all selected
   variants. Reserve stock atomically in one database transaction. Expire unpaid
   reservations, with reconciliation for delayed payment capture.
3. Create Razorpay orders server-side. Verify raw webhook signatures and record
   provider event IDs once. Verify amount, currency, order and payment IDs before
   confirming payment. Handle duplicate and out-of-order webhooks.
4. Execute cancellation/refund ledger changes while holding an order row lock.
   Freeze the accepted policy per order. Cap total pending and completed refunds
   plus retained fees by the captured payment. Use durable request IDs and provider
   reconciliation so retrying cannot refund twice.
5. Commit customer-visible events and email outbox records with each successful
   state transition. Deliver asynchronously through Resend with stable idempotency
   keys and retries. Email failure must not undo an order or refund. Apply server
   resend cooldowns and account/IP rate limits. Track delivery failures separately.
6. Confirm refunds only through verified provider evidence. Display refund amount,
   reason, fee, source payment method, status and available provider reference.
7. Add maps, route-based quotes if chosen, staff proof of delivery, signed image
   uploads, support, production invoice/tax rules and actual policy pages. Validate the included
   printable demo receipts and PWA manifest/service worker on real devices. Do not cache private order data in shared caches. Offline checkout fails
   closed. Store maintenance must preserve order tracking/support; independent edge
   maintenance page handles application failure.
8. Test simultaneous last-item purchases, authorization failures, duplicate webhooks,
   delayed captures, refund retries, store closure during checkout, failed emails,
   mixed variants, address tampering, partial refunds and cross-device updates.

## References consulted

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://github.com/razorpay/markdown-docs/blob/master/webhooks/validate-test.md
- https://resend.com/changelog/idempotency-keys
- https://leafletjs.com/examples/quick-start/
- https://operations.osmfoundation.org/policies/tiles/
- https://consumeraffairs.gov.in/public/upload/files/E%20commerce%20rules_1732703966.pdf

Rule 4(8) addresses reciprocal cancellation charges. Before enabling deductions,
obtain review of the full policy, free-delivery wording, reciprocal obligations and
applicable consumer protections. Store-fault refunds alone do not settle this issue.
