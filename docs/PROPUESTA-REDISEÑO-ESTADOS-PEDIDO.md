# Propuesta: Rediseño de Estados de Pedido

## Objetivo

Desacoplar el estado de pago del avance operativo del pedido para soportar:
1. Ecommerce tradicional con pago anticipado
2. Ecommerce con pago contra entrega (ej: "El Pan a Tu Casa")

---

## Diagnóstico del Código Actual

### Problemas identificados:

1. **En `schema.prisma` - Mezcla de conceptos:**
   ```prisma
   enum OrderStatus {
     PENDING, PAID, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED
   }
   // PAID mezcla pago con estado operativo
   // SHIPPED mezcla logística con estado
   ```

2. **En `update-order-status.tsx`:**
   El mismo dropdown mezcla: estado de negocio, pago y logística.

3. **En `route.ts` (API status):**
   Al cambiar orderStatus, cambia paymentStatus automáticamente.

---

## Propuesta: 3 Ejes Independientes

### Eje 1: `OrderStatus` (Estado de Negocio/Operativo)

```
RECEIVED              → Pedido recibido
CONFIRMED             → Confirmado
PREPARING            → En preparación
READY_FOR_DELIVERY    → Listo para entregar/repartir
OUT_FOR_DELIVERY     → En reparto
DELIVERED            → Entregado
NOT_DELIVERED        → No entregado (requiere motivo)
CANCELLED            → Cancelado
```

### Eje 2: `PaymentStatus` (Estado del Cobro)

```
PENDING              → Pendiente de cobro
AUTHORIZED           → Reservado/autorizado
PAID                 → Cobrado
PARTIALLY_REFUNDED   → Reembolso parcial
REFUNDED             → Reembolsado completamente
FAILED               → Falló el cobro
VOIDED               → Anulado/sin efecto
```

### Eje 3: `FulfillmentStatus` (Preparación/Faltantes)

```
PENDING              → Pendiente de preparar
IN_PROGRESS          → En preparación
PARTIALLY_FULFILLED  → Preparado parcialmente (hay faltantes)
FULFILLED            → Preparado completo
UNFULFILLABLE        → No se pudo preparar
```

---

## PaymentMethod - Refactorizado

```prisma
enum PaymentMethod {
  ONLINE_CARD           // Tarjeta online (MercadoPago, Stripe)
  BANK_TRANSFER         // Transferencia bancaria
  DIGITAL_WALLET        // Wallet digital
  CASH_ON_DELIVERY      // Efectivo al entregar
  CARD_ON_DELIVERY      // Tarjeta al entregar
  TRANSFER_ON_DELIVERY  // Transferencia al entregar
}
```

---

## Regla Configurable

En `StoreSettings`:

```prisma
model StoreSettings {
  requiresPaymentToFulfill Boolean @default(false)
  // true = solo avanzar si PAID
  // false = avanzar aunque PENDING (contra entrega)
}
```

---

## Cambios en Prisma

### Enums nuevos/actualizados:

```prisma
enum OrderStatus {
  RECEIVED
  CONFIRMED
  PREPARING
  READY_FOR_DELIVERY
  OUT_FOR_DELIVERY
  DELIVERED
  NOT_DELIVERED
  CANCELLED
}

enum PaymentMethod {
  ONLINE_CARD
  BANK_TRANSFER
  DIGITAL_WALLET
  CASH_ON_DELIVERY
  CARD_ON_DELIVERY
  TRANSFER_ON_DELIVERY
}

enum PaymentStatus {
  PENDING
  AUTHORIZED
  PAID
  PARTIALLY_REFUNDED
  REFUNDED
  FAILED
  VOIDED
}

enum FulfillmentStatus {
  PENDING
  IN_PROGRESS
  PARTIALLY_FULFILLED
  FULFILLED
  UNFULFILLABLE
}
```

### Order actualizado:

```prisma
model Order {
  id              String        @id @default(cuid())
  orderNumber     String        @unique
  userId          String
  user            User          @relation(fields: [userId], references: [id])

  // Nuevos campos de estado
  orderStatus         OrderStatus      @default(RECEIVED)
  paymentStatus       PaymentStatus    @default(PENDING)
  paymentMethod       PaymentMethod
  fulfillmentStatus   FulfillmentStatus @default(PENDING)

  items              OrderItem[]
  subtotal           Decimal    @db.Decimal(10, 2)
  shippingCost       Decimal    @db.Decimal(10, 2) @default(0)
  taxAmount          Decimal    @db.Decimal(10, 2) @default(0)
  discountAmount     Decimal    @db.Decimal(10, 2) @default(0)
  total              Decimal    @db.Decimal(10, 2)
  
  // Total según lo preparado (para faltantes)
  fulfilledTotal     Decimal?   @db.Decimal(10, 2)

  shippingMethod    String
  shippingAddress  Json
  billingAddress   Json?

  mercadopagoId    String?
  mercadopagoData  Json?

  customerNotes    String?
  adminNotes       String?

  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  paidAt          DateTime?
  cancelledAt      DateTime?

  routeSheetItems  RouteSheetItem[]

  @@map("orders")
}
```

### OrderItem actualizado:

```prisma
model OrderItem {
  id              String   @id @default(cuid())
  orderId         String
  order           Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId       String
  product         Product  @relation(fields: [productId], references: [id])

  name            String
  sku             String?
  price           Decimal  @db.Decimal(10, 2)
  
  // Cantidades para faltantes
  quantityOrdered   Int      // Cantidad comprada
  unitTotal        Decimal  @db.Decimal(10, 2)  // price * quantityOrdered

  quantityFulfilled Int?    @default(0)   // Cantidad realmente preparada
  quantityMissing   Int?    @default(0)   // Cantidad faltante
  missingReason     String?              // Motivo opcional
  fulfilledAt      DateTime?            // Cuándo se marcó

  @@map("order_items")
}
```

### RouteSheetItem actualizado:

```prisma
model RouteSheetItem {
  id           String     @id @default(cuid())
  routeSheetId String
  routeSheet   RouteSheet @relation(fields: [routeSheetId], references: [id], onDelete: Cascade)
  orderId      String
  order        Order      @relation(fields: [orderId], references: [id])
  position     Int
  notes        String?

  // Outcome de entrega
  deliveryOutcome          String?
  deliveryFailureReason    String?
  deliveryNotes           String?
  deliveredAt             DateTime?

  @@unique([routeSheetId, orderId])
  @@map("route_sheet_items")
}
```

---

## Transiciones Válidas

### OrderStatus:
```
RECEIVED → CONFIRMED → PREPARING → READY_FOR_DELIVERY → OUT_FOR_DELIVERY → DELIVERED
    ↓          ↓           ↓               ↓                     ↓
CANCELLED  CANCELLED   CANCELLED       CANCELLED          NOT_DELIVERED
```

### PaymentStatus (prepago):
```
PENDING → AUTHORIZED → PAID
    ↓         ↓            ↓
  FAILED    FAILED    PARTIALLY_REFUNDED / REFUNDED
```

### PaymentStatus (contra entrega):
```
PENDING → PAID (al cobrar)
    ↓
 VOIDED / CANCELLED
```

### FulfillmentStatus:
```
PENDING → IN_PROGRESS → FULFILLED
                        ↓
                 PARTIALLY_FULFILLED
                        ↓
                   UNFULFILLABLE
```

---

## Impacto en UI/Admin

### Admin - Lista de Pedidos:
- 3 columnas de estado o 3 badges por pedido
- Filtros por cada eje

### Admin - Detalle de Pedido:
- 3 secciones de estado independientes
- Edición de faltantes por item
- Cálculo automático de total real

### Admin - Hoja de Ruta:
- Mantiene estructura actual
- Botones de outcome que actualizan OrderStatus

### Storefront - Mi Cuenta:
- Mostrar los 3 estados claramente

---

## Estrategia de Migración

### Fase 1 - Schema (sin downtime):
1. Agregar nuevos enums
2. Agregar nuevos campos en Order
3. Agregar campos faltantes en OrderItem

### Fase 2 - Migración de datos:
```sql
-- OrderStatus
UPDATE "orders" SET "orderStatus" = 
  CASE 
    WHEN status = 'PENDING' THEN 'RECEIVED'
    WHEN status = 'PAID' THEN 'CONFIRMED'
    WHEN status = 'PROCESSING' THEN 'PREPARING'
    WHEN status = 'SHIPPED' THEN 'OUT_FOR_DELIVERY'
    WHEN status = 'DELIVERED' THEN 'DELIVERED'
    WHEN status = 'CANCELLED' THEN 'CANCELLED'
    WHEN status = 'REFUNDED' THEN 'CANCELLED'
  END;

-- PaymentStatus
UPDATE "orders" SET "paymentStatus" = 
  CASE
    WHEN paymentStatus = 'PENDING' THEN 'PENDING'
    WHEN paymentStatus = 'APPROVED' THEN 'PAID'
    WHEN paymentStatus = 'REJECTED' THEN 'FAILED'
    WHEN paymentStatus = 'REFUNDED' THEN 'REFUNDED'
    WHEN paymentStatus = 'CANCELLED' THEN 'VOIDED'
  END;

-- PaymentMethod
UPDATE "orders" SET "paymentMethod" = 
  CASE
    WHEN paymentMethod = 'MERCADOPAGO' THEN 'ONLINE_CARD'
    WHEN paymentMethod = 'BANK_TRANSFER' THEN 'BANK_TRANSFER'
    WHEN paymentMethod = 'CASH_ON_DELIVERY' THEN 'CASH_ON_DELIVERY'
  END;

-- FulfillmentStatus
UPDATE "orders" SET "fulfillmentStatus" = 'FULFILLED';

-- OrderItem
UPDATE "order_items" SET "quantityOrdered" = quantity, "unitTotal" = total;
```

### Fase 3 - UI:
1. Actualizar componentes a nuevos estados
2. Agregar lógica de transición

### Fase 4 - Limpieza:
1. Eliminar campos old

---

## Resumen

| Campo | Tabla | Cambio |
|-------|-------|--------|
| OrderStatus | Order | 8 valores, nuevo |
| PaymentStatus | Order | 7 valores, renombrado |
| PaymentMethod | Order | 6 valores, refactorizado |
| FulfillmentStatus | Order | 5 valores, nuevo |
| quantityOrdered | OrderItem | nuevo |
| quantityFulfilled | OrderItem | nuevo |
| quantityMissing | OrderItem | nuevo |
| fulfilledTotal | Order | nuevo |
| requiresPaymentToFulfill | StoreSettings | nuevo |

---

*Documento generado: 22/3/2026*
