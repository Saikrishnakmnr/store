# Release status — read before launch

## Added in code

Connected storefront with Google/email SDK wiring, server-side role checks, server quotes, version-checked stock reservation, shared order storage, 30-second polling, Razorpay order/capture/signature/webhook and refund reconciliation handlers, durable email queue/worker, stock editor, percentage offers, receipts, admin/rider roles, address/map directions and no-SMS handover.

Ebooks have a distinct product type, private storage, digital-only zero delivery, mixed-cart handling, captured-payment download checks, 60-second signed links and order-level refund access lock. File uploads are versioned and original file paths are snapshotted per purchase. No SMS integration is present.

## Still needed for a real launch

- Execute/test SQL, roles and storage policies on the selected staging Supabase project.
- Real test-mode payment/webhook/refund, email/auth/Google tests and two-session concurrency tests.
- Browser/mobile/print/accessibility validation and source/security review of the connected system.
- Real store details, products, geographic rules, legal/privacy/refund terms, tax and invoice requirements.
- Operational monitoring, backups/restore exercise, production credentials/provider approval and quota checks.

## Known development/operational limitations

- Connected UI does not have full preview parity: settings use a JSON editor; promotion cards do not auto-slide; connected video playback, AI/human chat and public SEO pages are not implemented.
- Connected order/report view loads the latest 500 orders. Full pagination/export and all-history analytics still need implementation; older orders remain in the database.
- Cancellation deductions are always disabled in connected mode. Cancellation refunds need admin submission/reconciliation, not automatic money movement.
- Unpaid reservations do not automatically expire. Admin must reconcile/cancel/inspect/restock; ambiguous provider-order creation requires manual linking. This prevents blindly releasing or duplicating uncertain work but requires daily operations.
- Partial refund locks all ebooks in that order. Item-level entitlement/refund allocation is not implemented. Downloaded files cannot be recalled; no DRM, watermark or malware scan is included.
- If an externally created provider refund has no matching app intent, it needs manual investigation; it is not silently attached to a customer order. Don't create parallel refunds outside the workflow without reconciliation planning.
- Email provider acceptance is tracked, not inbox delivery/bounces. Outbox review is through Supabase; there is no dedicated email operations screen yet. Free allowance is shared with auth SMTP.
- Single-store catalog/settings aggregate serializes writes; not a high-volume or multi-shop architecture.
- Maps use straight-line distance and typed PIN code, not verified city polygons/road pricing. No continuous rider location tracking.
- No GST/tax calculation. Receipts are order receipts, not tax invoices. No extra packing fee is implemented; totals show other charges as zero.
- Original preview PWA shell exists; connected PWA/offline experience and branded install identity require additional implementation/testing.

These are not solved by uploading the ZIP or supplying keys. Treat this as a documented staging handoff, not a final production launch.
