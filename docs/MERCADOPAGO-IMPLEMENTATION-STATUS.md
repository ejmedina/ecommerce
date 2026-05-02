# MercadoPago implementation status

Last reviewed: 2026-05-02

## Current state

MercadoPago is scaffolded but not functionally integrated end to end.

The project has payment model fields, checkout UI labels, environment variable placeholders, and a webhook route. However, creating an order does not create a MercadoPago preference, does not call MercadoPago APIs, does not persist a MercadoPago payment/preference id, and does not redirect the customer to a real payment URL.

At runtime, selecting the Mercado Pago-style option in checkout currently creates a local order with `paymentStatus = PENDING` and redirects to the local success page.

## What exists

- Prisma order fields exist:
  - `paymentMethod`
  - `paymentStatus`
  - `mercadopagoId`
  - `mercadopagoData`
- Current payment model uses:
  - `PaymentMethod.ONLINE_CARD` for online card payment, labelled as Mercado Pago in checkout settings.
  - `PaymentStatus.PENDING`, `AUTHORIZED`, `PAID`, `PARTIALLY_REFUNDED`, `REFUNDED`, `FAILED`, `VOIDED`.
- Checkout supports configurable payment methods through `StoreSettings.paymentMethods`.
- Default checkout/admin settings label `ONLINE_CARD` as "Mercado Pago".
- Environment variables are documented in `.env.example`:
  - `MERCADOPAGO_ACCESS_TOKEN`
  - `MERCADOPAGO_WEBHOOK_SECRET`
- A webhook route exists at:
  - `src/app/api/webhooks/mercadopago/route.ts`
- Admin order detail can display `mercadopagoId` and `mercadopagoData` if present.

## Important files

- `prisma/schema.prisma`
  - Defines `PaymentMethod`, `PaymentStatus`, and MercadoPago fields on `Order`.
- `src/components/checkout-steps.tsx`
  - Active checkout UI.
  - Shows configured payment methods.
  - Submits selected `paymentMethod` to `createOrder`.
- `src/lib/actions/order-actions.ts`
  - Active order creation flow.
  - Maps legacy `MERCADOPAGO` to `ONLINE_CARD`.
  - Always stores `paymentStatus: "PENDING"`.
  - Always returns `paymentUrl: undefined`.
- `src/app/api/webhooks/mercadopago/route.ts`
  - Placeholder webhook.
  - Does not verify signature.
  - Does not fetch payment details from MercadoPago.
  - Searches by `mercadopagoId`, but order creation does not set it today.
- `src/app/(storefront)/checkout/success/page.tsx`
  - Contains legacy status/method labels such as `MERCADOPAGO` and `APPROVED`.
- `src/app/(storefront)/checkout/checkout-form.tsx`
  - Legacy checkout component.
  - The active checkout page uses `CheckoutSteps`, not this component.

## Known gaps

1. No MercadoPago SDK/server client is implemented for backend calls.
2. No payment preference is created when the customer selects online card/Mercado Pago.
3. No checkout redirect/init point is generated from MercadoPago.
4. `mercadopagoId` is never persisted during order creation.
5. Webhook signature validation is not implemented.
6. Webhook does not fetch the canonical payment status from MercadoPago.
7. Webhook status mapping is incomplete for the current two-axis order/payment model.
8. Success page still contains labels from the older model:
   - old method: `MERCADOPAGO`
   - old payment status: `APPROVED`
9. No tests cover the MercadoPago order/payment lifecycle.

## Suggested implementation plan

1. Read the current Next.js docs in `node_modules/next/dist/docs/` before editing route handlers or server actions, per project instructions.
2. Add a small MercadoPago server module, for example `src/lib/mercadopago.ts`.
3. In `createOrder`, when `paymentMethod === "ONLINE_CARD"`:
   - create the local order first with `paymentStatus = PENDING`;
   - create a MercadoPago preference using order id/order number as external reference;
   - persist the MercadoPago preference/payment identifier available at that stage;
   - return the MercadoPago checkout URL as `paymentUrl`.
4. Update checkout redirect behavior to send the user to MercadoPago only when a real `paymentUrl` exists.
5. Implement webhook verification with `MERCADOPAGO_WEBHOOK_SECRET`.
6. In the webhook, fetch payment details from MercadoPago before updating local order state.
7. Map MercadoPago statuses to current project statuses:
   - approved -> `PaymentStatus.PAID`
   - authorized -> `PaymentStatus.AUTHORIZED`
   - rejected/cancelled depending on MP detail -> `FAILED` or `VOIDED`
   - refunded -> `REFUNDED`
   - partially_refunded -> `PARTIALLY_REFUNDED`
   - pending/in_process -> `PENDING`
8. Use `external_reference` or metadata to find the local order reliably instead of only searching by `mercadopagoId`.
9. Update success/account/admin labels to the current enum model.
10. Add focused tests for:
   - online-card order creation returning a payment URL;
   - webhook mapping approved payment to `PAID`;
   - webhook ignoring invalid signatures;
   - fallback behavior when MercadoPago API fails.

## Practical status summary

Use this mental model next time:

> The app has MercadoPago-shaped fields and UI, but no real MercadoPago payment flow yet. Treat this as a fresh integration starting from an existing order model and checkout shell, not as a debugging task for a completed integration.
