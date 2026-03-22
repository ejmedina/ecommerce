<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# E-commerce Project Context

## Branch Strategy
- **Main branch**: `main` - production/deployment branch (Vercel)
- **Development branch**: `develop` - working branch for all features
- All work should be done on `develop` branch
- Merge to `main` when MVP is ready for deployment

## Project Structure
- **Storefront**: `(storefront)` route group with products, cart, checkout
- **Admin**: `/admin` route for store management
- **API**: `/api` routes for backend functionality
- **Database**: Prisma with PostgreSQL (local)
- **Auth**: NextAuth.js with credentials + guest checkout
- **Payment**: MercadoPago integration with webhooks
- **UI**: shadcn/ui components with Tailwind CSS

## Key Components
- `checkout-steps.tsx` - Multi-step checkout form with grid layout
- `cart-context.tsx` - Client-side cart state management
- `order-status-manager.tsx` - Order status management with 2 independent axes
- `products/` - Product listing and detail pages
- `account/` - User account, addresses, orders
- `admin/` - Admin dashboard, products management

## Order Status Model (Simplified - 2 Axes)

### Axis 1: OrderStatus
States: RECEIVED → CONFIRMED → PREPARING → READY_FOR_DELIVERY → OUT_FOR_DELIVERY → DELIVERED
Also: NOT_DELIVERED, CANCELLED

### Axis 2: PaymentStatus
States: PENDING → AUTHORIZED → PAID
Also: PARTIALLY_REFUNDED, REFUNDED, FAILED, VOIDED

### OrderItem Fulfillment
Fulfillment tracking at OrderItem level with fields:
- `quantityOrdered` - Original quantity
- `quantityFulfilled` - Actually prepared
- `quantityMissing` - Shortage count
- `missingReason` - Optional reason

### Store Settings
- `autoConfirmOrders`: If true, new orders start as CONFIRMED; if false, start as RECEIVED (requires manual confirmation)
- `requiresPaymentToFulfill`: If true, only advance to PREPARING when paymentStatus = PAID

## Development Workflow

### Running the Server
- The user runs their own Next.js development server (`npm run dev`)
- If you need to run a server for testing, kill it before completing the task

### Database Commands
- Generate Prisma client: `npm run db:generate`
- Push schema to DB: `npm run db:push`
- Seed database: `npx tsx prisma/seed.ts`
- Full reset: `npm run db:push -- --force-reset && npx tsx prisma/seed.ts`

## Database Setup (Local PostgreSQL)

### Prerequisites
- PostgreSQL 17+ must be installed via Homebrew: `brew install postgresql@17`
- Start the service: `brew services start postgresql@17`

### Configuration
- The `.env` file uses: `postgresql://postgres:postgres@localhost:5432/ecommerce`
- Make sure the `postgres` user has access to the `ecommerce` database
- If you get permission errors, run:
  ```sql
  GRANT ALL PRIVILEGES ON DATABASE ecommerce TO postgres;
  GRANT ALL ON SCHEMA public TO postgres;
  ```
