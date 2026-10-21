> **0.7.0 update:** The original preview notes below are historical. The new connected implementation and its exact remaining gaps are documented in `DEPLOYMENT_GUIDE.md`, `RELEASE_STATUS.md` and `TEST_RESULTS.md`. Connected mode uses `supabase/setup`, not the old draft migrations. It has not been validated on a real Supabase project or in a browser.

# Google login, Supabase, Resend and Razorpay setup

## Important boundary

The preview is not wired to these services. The source includes configuration
templates and tested helper contracts, not complete production API endpoints.
Keys are necessary but not sufficient: authenticated backend implementation,
database validation and live staging tests must follow. Never paste secret values
into a chat, product setting, screenshot, issue, GitHub file or public JavaScript.

## Safe details to provide next

- Supabase project URL and publishable key (or legacy anon key).
- Intended GitHub repository URL.
- Exact store subdomain and main-admin email.
- Shop's actual map location, city and delivery area.
- Business name/address, contact information and applicable billing/tax details.
- Verified Resend sender address/domain, without the API key.
- Razorpay test key ID, without its secret.

## Where each key belongs

| Value | Where to configure it |
| --- | --- |
| Supabase URL + publishable/anon key | Frontend public configuration |
| Supabase secret/service-role key | Server encrypted secrets only |
| Google OAuth client ID + client secret | Supabase Auth → Google provider settings |
| Razorpay test key ID | Server config; public checkout may receive the ID |
| Razorpay key secret + webhook secret | Server encrypted secrets only |
| Resend API key | Server encrypted secrets; Supabase SMTP password if manually configured |
| Main-admin identity | Protected server-side role assignment; never user-editable metadata |

## Google and manual email login

1. Configure Google OAuth in your Google project.
2. Use the Supabase callback URL supplied by your project as Google's authorized
   redirect URI, normally `https://PROJECT.supabase.co/auth/v1/callback`.
3. Put Google credentials in Supabase's Google provider settings.
4. Set the real site URL and exact allowed callback/reset URLs in Supabase Auth.
   Avoid broad production redirect wildcards.
5. Integrate the official Supabase JavaScript client with
   `integrations/supabase-auth-adapter.mjs`. It uses PKCE and includes Google,
   email/password signup/sign-in, password reset, confirmation resend and sign-out.
6. Build the callback/recovery UI and verified backend session checks. The adapter
   does not create protected API routes or safely assign admin access by itself.
7. Test new users, returning users, unverified email, expired reset links, logout,
   session expiry, bad redirects and customer attempts to access admin/rider routes.

## Resend

Verify a sending domain you control and configure the DNS records Resend supplies
in Cloudflare. Configure Supabase custom SMTP or its Resend integration for signup
confirmation and password-reset emails. Transactional order emails are a separate
server workflow using the Resend API.

Use an order-event outbox: save the event and notification record with the order
change, send asynchronously with a stable idempotency key, retry failures, and
record provider delivery state. A failed email must not roll back a paid order.
`provider-contracts.mjs` builds a request but does not send it or implement the queue.

Test order confirmation, dispatch, failure, cancellation, refund processing and
provider-confirmed refund completion. Test resend throttling, duplicate events,
invalid addresses and failures. Do not claim an email was delivered merely because
an API call was accepted.

## Razorpay

Use test mode first. Compute amount/currency from server-owned prices and delivery
rules, reserve the selected SKUs transactionally, then create a Razorpay order on
the server. Do not accept an amount calculated by the browser as authoritative.

On checkout completion, verify the signature against the order ID stored by the
server, then verify the payment's captured status, exact amount, currency and identity.
Verify webhook signatures against the raw request body. Persist and deduplicate
provider event IDs and handle out-of-order events.

The supplied helper tests cover signature correctness and payment-field matching
with synthetic data. They do not perform a real payment or integrate callbacks.
Refund endpoints, idempotent reservation/refund ledger transitions and reconciliation
still need implementation. Provider-confirmed completion must be authoritative.

## Before live mode

Run staging end-to-end tests for payment success/failure/abandonment, duplicate
webhooks, delayed capture, simultaneous purchase of the last pack, order cancellation
after dispatch, partial/full refunds, repeat refund attempts, expired sessions,
wrong-account order access, server outage and email failure. Test actual phones,
desktops, printers/PDF receipts, Google sign-in and maps. Only then review live-mode
activation and real business policies.

References:
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/partners/resend
- https://resend.com/supabase
- https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
