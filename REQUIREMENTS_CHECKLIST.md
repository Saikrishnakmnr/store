> **0.7.0 update:** The original preview notes below are historical. The new connected implementation and its exact remaining gaps are documented in `DEPLOYMENT_GUIDE.md`, `RELEASE_STATUS.md` and `TEST_RESULTS.md`. Connected mode uses `supabase/setup`, not the old draft migrations. It has not been validated on a real Supabase project or in a browser.

# Requirements review

Reviewed against the full conversation on 16 October 2026.
“Preview complete” means browser-local functionality, not production readiness.

| Requested feature | Current state | Remaining work |
| --- | --- | --- |
| Single-store app; later multi-shop idea withdrawn | Single store | No marketplace/partner dashboards intentionally |
| Groceries, pickles, plastic/home, clothing | Preview complete | Real catalogue/images/inventory |
| Snacks, food, homemade food | Preview complete; zero-stock samples | Actual food details and business setup |
| Vegetables, shoes, belts, wallets, purses, bangles, bindis/ticklies, beauty | Category widgets and variant sample listings added | Set real products, prices and stock |
| Weight/size dropdowns and automatic price changes | Separate variant price/stock; cart/invoice retain option | Backend SKU enforcement |
| Product names, images, categories and availability | Admin preview controls | Authenticated cloud storage and permissions |
| Product and bill offers; 5% launch offer | Percentage, schedule, minimum, cap, optional stacking | Server-owned pricing and real business policy |
| Cart/order flow across all categories | Tested rules with mixed-category basket | Live backend and browser/device tests |
| Customer copy, shop copy, duplicate receipt | Same order ID and immutable pricing; print/PDF control | Printer/PDF visual QA; actual tax invoice configuration |
| Inventory and today's sales statistics | SKU stock, low/out-of-stock filters, movement journal; IST date reports | Shared database, reconciled captures/refunds and durable audit |
| Delivery charge: first km free, later charge, free promotion | Configurable preview calculation | Server verification; confirm straight-line vs road basis |
| 5 km service area and map locator | Store/customer pins, circle, optional PIN list | Actual shop location, address/PIN validation and road routing |
| Delivery staff controls and navigation | Demo assignment/status controls, directions link | Real staff accounts, authorization, proof of delivery |
| Weather delay | Manual notice, extra wait, expiry and pause-new-orders | Server scheduling and real notifications; no automatic weather API |
| Store live/off/maintenance | Preview controls; tracking/support remain reachable | Independent edge outage handling and protected server switch |
| Order history and status trace | Demo history and actor labels | Verified identities and cross-device realtime data |
| Cancellation grace, charges and refund breakdown | Tested preview rules; fees default off | Legal review, reciprocal business obligation, server enforcement |
| Stock unavailable/store cancellation/failed delivery | Reason-based flows and admin review | Payment/stock reconciliation and return inspection |
| Google and manual login | UI preview; PKCE adapter prepared and unit-tested | Supabase/provider configuration plus full auth/callback integration |
| Resend email/confirmation/resend | Notification preview records; request helper tested | Verified domain, SMTP/API configuration, outbox delivery integration |
| Razorpay payment/refund | No live integration; signature/capture helpers tested | Server endpoints, test keys, webhooks, capture/refund reconciliation |
| AI chatbot + human handoff | Scripted enquiry preview only | AI provider, protected order lookup and actual support channel |
| App name, logo, contact, brand, banners | Admin preview controls | Server persistence; installed PWA/domain identity needs separate configuration |
| Slideshow and YouTube/Vimeo | Editable slides; click-to-play allowlisted embeds | Browser playback checks and video-owner embed permissions |
| Privacy/about/contact/terms | About/contact editable; legal placeholders identified | Final real policy text and legal/business details |
| PWA | Manifest, install hook and static offline shell added | Install/offline verification on target devices; production cache policy |
| SEO/indexing | Preview intentionally noindex | Real public metadata, canonical URLs, sitemap and indexable product pages |
| Mobile + desktop shared orders | Responsive UI; local data only | Shared backend, authenticated realtime updates and device testing |
| Security/Strix | Source review and targeted tests; Strix unavailable | Connected staging app, authenticated scan and independent security review |
| GitHub files | Portable source ZIP + tests/configuration/docs | Upload/select user's repository; no secret values included |

## Discrepancies found and corrected

- Aggregate size/weight stock was replaced with separate SKU-style records.
- Invalid numeric inputs and unavailable variants are blocked.
- Whole-cart stock validation runs before any stock is reduced.
- Customer-reported store-fault cancellations now require review rather than bypassing fees.
- Old paid prices/options remain fixed when the catalogue changes.
- Reprinting a receipt does not create another order or change stock.
- Delivered sales, placed orders, pending refunds and completed refunds are distinguished.
- India reporting dates are used instead of the execution machine's timezone.
- Recipient name and phone are required for newly placed demo delivery orders.

## Main gap

This package is ready for GitHub as a preview/development handoff, **not** as a live
shop. The missing backend is an implementation gap as well as a credential gap.
Full production testing cannot be completed by adding keys alone.
