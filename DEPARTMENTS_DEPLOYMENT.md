# New RacharlaMart departments — staging deployment

## New categories
Mobiles, Accessories, Electronic Gadgets. These are added to the LIVE Supabase store state by the admin UI (not by overwriting the existing catalog). Existing catalog and orders remain unchanged.

1. Commit `dist/connected.js`, `dist/connected.html`, `dist/premium-redesign.css`, all `dist/placeholders/*.svg`, and the new test.
2. Deploy the static site from your existing `dist` folder. Confirm `/connected.html` loads your Supabase configuration.
3. Log in as admin; click **Manage categories** and add/show each of the three categories, or click **Add sample mobile & accessory products** to add all three categories plus five zero-stock demo products. **Do not click repeatedly**; the add operation skips existing sample names.
4. Edit every demo product to specify real name, model, correct price, image, stock, variation, tax/warranty/return policy. Delete/disable demo listings you do not plan to sell. Upload genuine photos through existing product editor.
5. Test shopping, variant and quantity controls, server quote, Razorpay Test Mode payment capture, cancel, admin refund and refund processed webhook. Check amounts in rupees/paise and pending/restocked stock. Test failed payment and retry separately.

## Supabase
No new schema changes or SQL migration are needed for these three categories: the existing `saveStore` API persists the categories/products in the `rm_store` JSON state. **Do not run setup/catalog sample SQL** against an existing live store. This release DOES NOT deploy to Supabase for you. You must already have store-api and razorpay-webhook deployed, configured and secret-protected. Update the webhook function from this ZIP only if not already deployed.

## Limitations
Images are local vector **placeholders**, not photos or actual phone product pictures. Starter prices and stock are 0; you must provide genuine listings. This patch does not introduce an electronic-goods-specific warranty, tax invoice, serial/IMEI management, shipping insurance or returns automation. Those must be designed before selling real devices. Full live Supabase/Razorpay integration and browser-device tests were not performed here.
