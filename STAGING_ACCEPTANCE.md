# Staging acceptance record

All boxes below are intentionally unchecked. Fill them only after performing the tests on your actual staging deployment. Record tester, date, devices, screenshot/log references and result. Never record passwords, keys or full payment credentials.

- [ ] Setup SQL executes; expected tables/RPCs/buckets exist.
- [ ] Anonymous/customer direct commerce table and private RPC writes are denied.
- [ ] Private ebooks cannot be downloaded without verified purchase; no broad existing storage policy bypasses this.
- [ ] Admin/rider/customer role boundaries and disabled-rider behavior pass.
- [ ] Google, email signup/confirmation, password sign-in/recovery/sign-out pass.
- [ ] Every physical category/option Add, plus/minus and sold-out/disabled state works on mobile and desktop.
- [ ] Quantity × unit price, product/bill discounts and delivery sum reconcile to provider amount and printed receipt.
- [ ] Two simultaneous last-unit purchases cannot oversell; concurrent admin edits do not overwrite reservations.
- [ ] Closed/maintenance/delay blocks new orders while existing history/support remains available.
- [ ] Paid/free/out-of-radius/PIN-blocked delivery and correct map/address/navigation work.
- [ ] Razorpay success, failure, dismissal, delayed capture, repeated webhook/callback and amount/signature mismatch pass.
- [ ] Uncertain provider-order setup can be reconciled without duplicate charge/order/stock.
- [ ] Failed/retried/duplicate/partial/full refund reconciliation matches provider records.
- [ ] Order creation/status/refund emails queue, send, retry and respect cooldown/budgets; auth SMTP works separately.
- [ ] Scheduler/Vault secrets configured; outbox errors are monitored.
- [ ] Ebook-only order has zero delivery and no physical address requirement.
- [ ] Mixed order unlocks paid ebook while tracking physical delivery separately.
- [ ] Old purchase retains its original file; links expire; other users and refunds block access.
- [ ] Rider sees only assigned work, addresses/call links render comfortably on phone.
- [ ] Code is customer-only, correct code works once; wrong/expired/locked code is handled.
- [ ] Admin handover exception requires receiver/reason/customer confirmation and records actor/time.
- [ ] Failed handover never automatically marks delivered or restores uninspected stock.
- [ ] Customer/shop/duplicate receipts print correctly with the same ID.
- [ ] Live tax/business/privacy/returns policies completed and remaining RELEASE_STATUS gaps resolved or deliberately scoped out before launch.
- [ ] Monitoring, backup recovery, security review and actual provider production approval completed.

Final deployment URL: __________________
Source commit: __________________
Tester/date/device(s): __________________
Decision: NOT APPROVED until required checks and remaining development are resolved.
