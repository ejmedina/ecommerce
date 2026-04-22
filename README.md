# Ecommerce Base

Una base de ecommerce reusable para deploy en Vercel. Una tienda por deployment, configurable por cliente.

## Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript
- **UI**: Tailwind CSS 4 + shadcn/ui
- **Backend**: Next.js Server Actions + Route Handlers
- **DB**: PostgreSQL (Neon/Vercel Postgres)
- **ORM**: Prisma 7
- **Auth**: Auth.js v5
- **Payments**: Mercado Pago
- **Email**: Resend
- **Images**: Uploadthing

## Empezar

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Completar las variables en `.env`:
- `DATABASE_URL` - URL de PostgreSQL
- `AUTH_SECRET` - Generar con: `openssl rand -base64 32`
- `MERCADOPAGO_ACCESS_TOKEN` - Token de Mercado Pago
- `RESEND_API_KEY` - API key de Resend
- `UPLOADTHING_SECRET` y `UPLOADTHING_APP_ID` - Configuración de Uploadthing
- `HOME_MODE` - `storefront` por defecto. Usar `institutional` para que `"/"` deje de redirigir a `"/home"`
- `HOME_FLAVOR` - preset de home institucional a usar. Hoy el primer preset disponible es `pgi`
- `CONTACT_FORM_TO` - Casilla que recibe las consultas del formulario institucional

### 3. Configurar base de datos

```bash
# Generar cliente Prisma
npx prisma generate

# Aplicar migraciones
npx prisma migrate dev

# Opcional: Poblar con datos de prueba
npx prisma db seed
```

### 4. Correr en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

### Variantes de home por deploy

La app soporta dos modos de entrada en la raíz:

- `HOME_MODE=storefront` - comportamiento actual, `"/"` redirige a `"/home"`
- `HOME_MODE=institutional` - `"/"` queda reservado para una home institucional independiente

Además, la home institucional ahora requiere un flavor explícito:

- `HOME_FLAVOR=pgi` - habilita la home institucional de PGI
- si `HOME_MODE=institutional` pero `HOME_FLAVOR` falta o es inválido, la app vuelve al fallback seguro de `"/home"`

Esto permite reutilizar el mismo codebase para múltiples tiendas sin afectar deployments existentes mientras no se cambie esa variable de entorno.

## Deploy en Vercel

### 1. Conectar repositorio en Vercel

```bash
vercel
```

### 2. Configurar variables de entorno en Vercel Dashboard

Todas las variables de `.env.example` deben estar configuradas.

### 3. Agregar integration de PostgreSQL

Vercel Postgres o Neon:

```bash
vercel postgres create
```

### 4. Configurar Webhook de Mercado Pago

En el dashboard de Mercado Pago:
1. Ir a tu aplicación > Webhooks
2. URL: `https://tu-dominino.com/api/webhooks/mercadopago`
3. Eventos: `payment`

## Estructura del proyecto

```
src/
├── app/
│   ├── (storefront)/     # Tienda pública
│   │   ├── products/
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── account/
│   │   └── login/
│   ├── (admin)/          # Panel de administración
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── orders/
│   │   ├── customers/
│   │   ├── route-sheet/
│   │   └── settings/
│   └── api/              # API routes
├── components/
│   ├── ui/              # Componentes shadcn/ui
│   └── ...
└── lib/
    ├── actions/          # Server Actions
    ├── utils/            # Utilidades
    └── ...
```

## Roles de usuario

| Rol | Descripción |
|-----|-------------|
| SUPERADMIN | Acceso total al sistema |
| OWNER | Dueño de la tienda, acceso total |
| ADMIN | Gestiona productos, pedidos, clientes |
| CUSTOMER | Cliente de la tienda |

## Crear primer usuario admin

En desarrollo, puedes crear un usuario manualmente en la base de datos:

```sql
INSERT INTO users (email, passwordHash, name, role)
VALUES ('admin@example.com', '$2a$12$...', 'Admin', 'ADMIN');
```

O usar el seed de Prisma.

## Features implementadas

### Tienda (Storefront)
- [x] Catálogo de productos con filtros
- [x] Detalle de producto
- [x] Carrito persistente
- [x] Checkout (guest + logged)
- [x] Métodos de pago: Mercado Pago, transferencia, efectivo
- [x] Métodos de envío: retiro en tienda, envío a domicilio
- [x] Cuenta de cliente con historial de pedidos

### Admin
- [x] Dashboard con estadísticas
- [x] CRUD de productos
- [x] CRUD de categorías y marcas
- [x] Gestión de pedidos
- [x] Gestión de clientes
- [x] Configuración de tienda

### Feature: Hoja de Ruta
- [x] Crear hoja de ruta desde pedidos seleccionados
- [x] Reordenar entregas con botones up/down
- [x] Vista mobile-optimized
- [x] Info por parada: cliente, dirección, productos
- [x] Botón llamar (tel:)
- [x] Botón WhatsApp con mensaje pre-formateado

## Comandos útiles

```bash
# Lint
npm run lint

# Typecheck
npx tsc --noEmit

# Build
npm run build

# Prisma Studio (editor de DB)
npx prisma studio
```

## Licencia

MIT
