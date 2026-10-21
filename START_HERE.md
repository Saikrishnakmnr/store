# Start here — 0.7.1 connected staging release

Open **DEPLOYMENT_GUIDE.md** for the complete GitHub → Supabase SQL → authentication → Edge Functions → Razorpay → Resend → Cloudflare setup sequence.

This package includes:

- Original visual preview at `/index.html` (browser-local demo).
- New connected storefront at `/connected.html` (requires your configuration).
- Server-side physical/ebook/mixed checkout, stock reservation, payment verification and refund reconciliation source.
- Private ebook uploads/downloads, no-SMS delivery code and admin exception flow.
- Three Edge Functions, setup SQL, storage policies, sample catalog and diagnostics.
- Eleven automated suites plus JavaScript/Edge source syntax checks; `npm test` on Node 24.

**Not production-certified.** Real Supabase SQL/RLS/storage, provider transactions, Google/email sign-in and browser/mobile/printing still need staging validation. The connected UI has known missing feature parity and operational limitations; see DEPLOYMENT_GUIDE.md and RELEASE_STATUS.md. Do not call the app production-ready simply because files upload successfully.

Do not run the old SQL drafts under `supabase/migrations`. Connected mode uses the scripts in `supabase/setup`, as directed in the deployment guide.

Keep secrets out of chat, GitHub and browser files. `dist/store-config.js` takes only a public project URL and publishable key. All provider secrets belong in the server settings.
