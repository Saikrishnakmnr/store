# RacharlaMart — background admin push staging

## Status

This is a **GitHub staging branch only**. No push notification code has been deployed, and no Supabase schema, function, secret, or cron has been changed.

## Hard constraints

- ₹0 additional spend; do not provision a paid Supabase branch/project or notification provider.
- Do not modify `main`, Razorpay capture/webhooks, stock, refund, delivery or existing order-status processing.
- Maintain admin-only subscriptions, never include customer PII or handover codes in notifications.
- Browser push requires user permission and may be delayed or unavailable on certain devices.

## Before implementation or live deployment

1. Review the prepared `RacharlaMart-Admin-Background-Push-STAGING.zip` files against current `main`.
2. Resolve and verify `npm:web-push@3.6.7` compatibility in Supabase Edge Functions; do not deploy an untested runtime.
3. Review the SQL trigger's `Preparing`/captured-state predicate, role filtering, RLS, grants and idempotence.
4. Find a genuinely no-cost isolated test environment or explicitly agree on the limited risks of using the current free Supabase project for staged integration tests.
5. Generate and store VAPID private key and worker token only in secure Supabase secrets; never commit credentials.
6. Test paid vs unpaid orders, duplicate callbacks, admin vs customer/rider authorization, mobile background delivery and rollback.
7. Only after verification consider merging to `main`.

## Production impact

None as of this commit. This file is documentation for a future staging integration and does not activate push notifications.
