# Manejo de Decimals de Prisma en Next.js

## ⚠️ Problema Común

Next.js (especialmente con Turbopack) **no puede serializar objetos Decimal de Prisma** para pasar datos del servidor al cliente.

### Error Típico
```
Only plain objects can be passed to Client Components from Server Components. 
Decimal objects are not supported.
```

## 🎯 Solución: Serialización

Cada vez que una función server-action devuelve datos que contienen campos `Decimal`, **siempre** hay que serializarlos antes de retornarlos:

```typescript
// ❌ INCORRECTO - Causa error
return { order: { total: order.total, ... } }

// ✅ CORRECTO - Serializar los Decimals
return { 
  order: { 
    total: Number(order.total),  // Convertir Decimal a número
    ... 
  } 
}
```

## 📋 Función Helper Reutilizable

En `src/lib/actions/route-sheet-actions.ts` hay una función `serializeRouteSheet` que convierte:

- `Decimal` → `number` (usando `Number()`)
- `Date` → `string` ISO (usando `.toISOString()`)
- Campos `null` → mantienen `null`

## 🔧 Lista de Campos que Siempre Son Decimal

En este proyecto, los campos `Decimal` son:

| Modelo | Campos |
|--------|--------|
| `Product` | `price`, `comparePrice` |
| `Order` | `subtotal`, `shippingCost`, `taxAmount`, `discountAmount`, `total`, `fulfilledTotal` |
| `OrderItem` | `price`, `unitTotal` |
| `StoreSettings` | `freeShippingMin`, `fixedShippingCost` |

## ✅ Regla de Oro

**SIEMPRE** que devuelvas datos de una server-action que incluya modelos con campos Decimal:

1. Convierte cada campo Decimal: `Number(decimalField)`
2. Convierte las fechas: `dateField.toISOString()`
3. O usa una función helper de serialización

## 📝 Ejemplo Completo

```typescript
async function getOrders() {
  const orders = await db.order.findMany({ ... })
  
  return orders.map(order => ({
    id: order.id,
    orderNumber: order.orderNumber,
    total: Number(order.total),           // ✅ Decimal → number
    subtotal: Number(order.subtotal),    // ✅ Decimal → number
    createdAt: order.createdAt.toISOString(), // ✅ Date → string
  }))
}
```

## 🔄 Cuando NO Necesitas Serializar

- Cuando pasas el resultado directamente a `revalidatePath` o `redirect`
- Cuando usas los datos solo en el servidor (no los retornas al cliente)
- Cuando usas Prisma solo en API routes internas (no en server-actions que retornan al cliente)
