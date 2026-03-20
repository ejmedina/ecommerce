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
- **Database**: Prisma with PostgreSQL (Neon)
- **Auth**: NextAuth.js with credentials + guest checkout
- **Payment**: MercadoPago integration with webhooks
- **UI**: shadcn/ui components with Tailwind CSS

## Key Components
- `checkout-steps.tsx` - Multi-step checkout form with grid layout
- `cart-context.tsx` - Client-side cart state management
- `products/` - Product listing and detail pages
- `account/` - User account, addresses, orders
- `admin/` - Admin dashboard, products management
