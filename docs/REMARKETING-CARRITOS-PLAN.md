# Plan de remarketing para carritos abandonados

Estado: propuesta. No implementado.

## Situación actual

- `Cart` y `CartItem` se guardan en PostgreSQL. Los usuarios con sesión usan `userId`; los visitantes anónimos usan `sessionId` en una cookie de 30 días. `CartProvider` mantiene una copia para la interfaz.
- Un cambio en `CartItem` no garantiza actualizar `Cart.updatedAt`, así que esa fecha no sirve por sí sola para medir abandono.
- El checkout de invitado captura email, pero el carrito anónimo no queda vinculado a ese contacto para recuperación.
- Al crear un pedido se vacían sus `CartItem`; no se registra un ciclo de carrito convertido.
- `getDeliveryOptions` calcula las opciones por zona y hora local, pero no expone la fecha y hora límite de pedido para usarla en mensajes.

## Definiciones propuestas

- **Abierto:** carrito con al menos un producto y sin conversión en el ciclo actual.
- **Abandonado:** abierto, sin actividad durante al menos una hora.
- **Reciente para correo:** ciclo iniciado en las últimas 72 horas. Estos umbrales deben ser configurables.
- **Un envío:** como máximo un recordatorio por ciclo de carrito, con una separación adicional por cliente que se defina al implementar. Un carrito que se vacía y se vuelve a llenar inicia otro ciclo.
- **Importe del panel:** subtotal estimado con precios y descuentos actuales; no incluye envío ni promete un precio congelado.

## Etapa 1: datos y actividad

Agregar a `Cart` un identificador o inicio de ciclo, `lastActivityAt`, `checkoutZoneId` cuando se conozca y una marca de conversión. Actualizar la actividad en todas las mutaciones de productos y desde checkout con un latido limitado mientras la página esté visible. Al vaciar el carrito, cerrar el ciclo; al volver a agregar, iniciar uno nuevo. Al crear el pedido, marcar la conversión dentro de la misma transacción que vacía el carrito.

Crear un registro de recuperación por ciclo con estado, fecha de reclamo, intento, resultado e identificador del proveedor. Una restricción única por ciclo y reclamo atómico deben impedir dos envíos simultáneos. Ante una respuesta ambigua del proveedor, conservar el intento para revisión en lugar de repetir automáticamente un correo que podría haberse entregado.

## Etapa 2: panel administrativo

Agregar `/admin/carts`, protegido por el control de acceso administrativo existente. Mostrar conteos de abiertos y abandonados; listado paginado con productos, variantes y componentes de combos, cantidades, subtotal estimado, última actividad, cliente identificable y estado del recordatorio. Incluir filtros por estado y fecha. Los carritos anónimos sin contacto permanecen visibles, sin exponer el `sessionId`.

## Etapa 3: mensaje al salir

Mostrar un mensaje propio antes de salir mediante intención de salida en escritorio y navegación interna; limitarlo a una vez por sesión. Al volver al sitio, mostrar un recordatorio discreto si el carrito sigue abierto. No basar la experiencia en `beforeunload`: el navegador no permite personalizar su texto y el evento puede faltar en móviles.

Texto cuando se conoce una zona de entrega válida: «Tu carrito te espera. Volvé y seguí desde donde te quedaste. Pedí antes de {fecha y hora de corte} para recibir {primera opción de envío disponible}». Obtener la zona desde una dirección seleccionada o guardada; si se desconoce, usar «Tu carrito te espera. Volvé y elegí tu entrega» sin prometer una fecha. No mostrar promesa de envío si la agenda no está habilitada o no hay opción válida.

Extender el cálculo compartido de agenda para obtener tanto la primera opción elegible como su corte en la zona horaria de la tienda. Volver a calcularlo al mostrar el mensaje y antes de enviar el correo. Evitar opciones cuyo corte sea inminente según un margen configurable.

## Etapa 4: correo único de recuperación

Ejecutar periódicamente un proceso protegido que seleccione ciclos recientes, abandonados, no convertidos, con productos y sin recordatorio anterior. Antes del envío, reclamar el ciclo de forma atómica y volver a verificar sus condiciones. Usar el servicio de correo existente y registrar resultado, sin que un error afecte la compra.

Comenzar con usuarios identificados y email verificado. Para invitados, vincular explícitamente el carrito con el contacto capturado en checkout y habilitar el correo solo después de verificar ese email. Mantener una preferencia de exclusión para recordatorios, separada de `newsletter`. Un enlace de recuperación para invitados que funcione en otro dispositivo requiere un token seguro con vencimiento; no incluir el `sessionId` en el enlace.

El correo incluirá productos, subtotal estimado, enlace de recuperación y, cuando se conozca la zona, primera entrega disponible y corte calculados al enviarlo. Si faltan datos de zona o agenda, utilizar una invitación genérica sin promesa de fecha.

Para producción, incorporar el proceso programado en `vercel.json` y proteger el endpoint con un secreto. Preparar una forma de ejecutarlo manualmente en desarrollo, donde no se ejecuta el cron de producción.

## Pruebas y lanzamiento

- Probar transición vacío/abierto/abandonado/convertido, cambios de cantidad, login y fusión de carritos.
- Probar cálculo de importes y desglose de variantes y combos del panel.
- Probar cortes de entrega en distintas zonas horarias, reglas editadas, ausencia de zona y corte vencido.
- Probar elegibilidad, exclusión, revalidación justo antes del envío, ejecuciones simultáneas y respuesta ambigua del proveedor.
- Probar recuperación desde otro dispositivo y que un carrito convertido nunca reciba un recordatorio.
- Lanzar primero con envío desactivado y métricas visibles; activar el cron tras revisar los candidatos y el contenido del correo.

## Decisiones pendientes antes de implementar

Confirmar el tiempo de inactividad, la ventana de carritos recientes, el margen mínimo antes del corte y la separación entre recordatorios de ciclos distintos del mismo cliente. Los valores de una hora y 72 horas son propuestas iniciales.
