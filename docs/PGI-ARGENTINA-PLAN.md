# PGI Argentina - Plan de trabajo

Fecha: 2026-04-21
Estado: En curso

## 0. Pre-etapa 0

Antes de tocar comportamiento de la app, resolver estos habilitadores:

- No pushear a `main` mientras estemos validando PGI localmente
- Configurar Vercel MCP en el cliente de Codex
- Conseguir acceso autenticado y repetible al perfil de Instagram

### Estado de estos habilitadores

#### Git y deploy

- Permitido hacer commits locales
- No hacer push a `main` porque dispara deploy en Vercel para `elpanatucasa`
- Validacion inicial y pruebas deben hacerse localmente
- `pgiweb` ya fue creado en Vercel como proyecto separado
- `pgi.com.ar` ya apunta y responde desde Vercel
- La home institucional PGI ya esta publicada y verificada

#### Vercel MCP

- `codex-cli` esta instalado en esta maquina
- El servidor `vercel` ya fue agregado a la config local de Codex
- La autorizacion OAuth ya fue completada
- Para que quede utilizable dentro de una sesion nueva del agente, puede hacer falta reiniciar la sesion actual
- En esta sesion aun no hay recursos MCP de Vercel disponibles desde las herramientas cargadas al inicio
- `pgiweb` ya quedo asociado al repo `ecommerce` y se administran env vars y deploys desde CLI

#### Instagram

- Se pudo inspeccionar parte del feed por endpoints publicos
- `Instaloader` fue instalado correctamente
- `browser-cookie3` fue instalado para intentar importar sesion desde navegador
- En modo anonimo no alcanza para leer todo de forma confiable
- Se logro autenticar con cookies de Chrome
- Quedo guardada una sesion reusable en `~/.config/instaloader/session-ahorrointeligente.ai`
- Se descargaron metadatos completos del perfil `@pgiargentina` en `/tmp/instaloader`
- Se pudieron leer las 27 publicaciones sin export manual

### Hallazgos concretos del feed de Instagram

- El perfil mezcla principalmente dos ejes: hogar/jardin y agro/suelo
- Hay una mencion clara a cesped deportivo, pero todavia es marginal dentro del feed
- No aparecen bien representadas las audiencias de viveros, paisajismo y distribuidores
- No se detectaron menciones solidas a las variantes `citronela` y `cannabis`
- Los beneficios mas repetidos son germinacion, enraizamiento, retencion de humedad, floracion y enfoque organico
- Conclusion: Instagram sirve como base de tono y beneficios, pero la home debera completar audiencias y variantes que el feed aun no cubre bien

### Estado operativo actual

- `pgiweb` esta publicado en Vercel
- `pgi.com.ar` ya fue apuntado a Vercel y esta funcionando
- La home institucional ya usa el contenido base de PGI y queda abierta a refinarse con material de marca
- El siguiente paso operativo principal es el alta de correo corporativo y transaccional

## 1. Decision de arquitectura

### Decision actual

Mantener `ecommerce` como aplicacion `single-tenant por deploy`.

Cada tienda tendra:

- Su propio proyecto de Vercel
- Su propia base de datos
- Sus propias variables de entorno
- Su propia configuracion en `store_settings`
- Idealmente su propio almacenamiento de assets

### Por que esta decision es viable hoy

- Reduce el radio de impacto entre clientes
- Hace mas simple el soporte y el debugging
- Evita una migracion grande antes de validar el producto
- Permite que cada cliente sea responsable de su propia infraestructura
- Encaja con el escenario esperado: pocos clientes, no venta masiva

### Cuando reevaluar multi-tenant real

Revisar esta decision si se cumplen varias de estas condiciones:

- Mas de 5 a 10 tiendas activas mantenidas en paralelo
- Necesidad de onboarding muy rapido de nuevas tiendas
- Necesidad de panel centralizado para administrar multiples tiendas
- Necesidad de analytics cross-store
- Presion real por reducir costos operativos duplicados
- Problemas frecuentes por drift entre deploys o configuraciones

## 2. Estado actual del proyecto

### Hallazgos tecnicos

- La app actual no es multi-tenant real
- `storeSettings` se resuelve hoy como una configuracion unica
- La raiz `/` redirige a `/home`
- El deploy actual observado (`https://elpanatucasa.vercel.app/`) sigue ese flujo
- Los colores y branding se resuelven de forma dinamica desde DB
- Los uploads no estan namespaced por tienda

### Riesgo principal actual

Si cambiamos el comportamiento de `/` o de la home sin feature flags, podemos afectar el deploy vigente.

## 3. Estrategia segura para PGI

### Objetivo

Agregar una home institucional nueva para PGI sin modificar el comportamiento por defecto de tiendas ya desplegadas.

### Regla de rollout

Agregar una bandera de entorno por deploy:

- `HOME_MODE=storefront` -> comportamiento actual
- `HOME_MODE=institutional` -> nueva home institucional en `/`
- `HOME_FLAVOR=pgi` -> habilita explícitamente el preset institucional de PGI

### Principios

- El default debe seguir siendo `storefront`
- `elpanatucasa` no debe cambiar si no se toca su env
- Si `HOME_MODE=institutional` pero no hay flavor válido, la app debe volver al fallback seguro de `/home`
- `/products` se mantiene como ruta de catalogo
- La navegacion puede mostrar "Tienda" aunque la ruta siga siendo `/products`
- La home institucional debe convivir con el storefront actual

## 4. Etapas

### Etapa 0 - Aislamiento y guardrails

Objetivo:

Evitar impactos sobre deploys existentes.

Tareas:

- Introducir `HOME_MODE` con default seguro
- Introducir `HOME_FLAVOR` para explicitar la marca institucional
- Revisar si hace falta un `STORE_KEY` para assets y config futura
- Definir convencion de variables de entorno por tienda
- Preparar un checklist de alta de nueva tienda

Entregable:

- App lista para soportar variantes de home por deploy sin afectar el default

### Etapa 1 - Base institucional PGI

Objetivo:

Montar la home institucional responsive dentro del mismo proyecto.

Secciones iniciales:

- Hero
- Sobre el producto
- Presentaciones
- Testimonios segmentados
- FAQ
- Contacto
- Acceso a tienda

Entregable:

- Home institucional funcional bajo `HOME_MODE=institutional`

### Etapa 2 - Integracion visual con tienda

Objetivo:

Hacer que la home institucional y la tienda se perciban como una misma marca.

Tareas:

- Ajustar paleta y tokens visuales
- Revisar header, footer y CTAs
- Unificar tono visual entre institucional y `/products`

Entregable:

- Experiencia consistente entre home y catalogo

### Etapa 3 - Contenido administrable

Objetivo:

Evitar hardcode excesivo y dejar puntos clave configurables.

Tareas sugeridas:

- Ajustes de hero institucional
- Bloques de testimonios
- FAQ
- Datos de contacto

Entregable:

- Primera capa de CMS liviano para la home institucional

### Etapa 3.1 - Correo y entregabilidad

Objetivo:

Dejar resuelto el circuito de correo de marca y el envio transaccional de la tienda.

Tareas:

- Elegir proveedor de correo corporativo para `@pgi.com.ar`
- Configurar casillas principales
- Definir si el envio transaccional va por ZeptoMail u otro proveedor
- Cargar SPF, DKIM y DMARC
- Alinear `EMAIL_FROM`, `RESEND_API_KEY` o la alternativa elegida en Vercel

Entregable:

- Correo corporativo operativo y envios transaccionales funcionando desde la tienda

### Etapa 4 - Endurecimiento operativo

Objetivo:

Dejar una base repetible para nuevas tiendas.

Tareas:

- Namespacing de uploads por tienda
- Seed o script de bootstrap por tienda
- Checklist de alta en Vercel
- Checklist de variables y dominio

Entregable:

- Proceso repetible de provision para nuevas tiendas

## 5. Instagram y contenido

### Lo validado hasta ahora

Del perfil publico de `@pgiargentina` se pudo verificar:

- Bio orientada a organico, pet/kid friendly y uso agricola/urbano
- 27 publicaciones publicas
- Mensajes repetidos: enraizamiento, retencion de humedad, floracion, fotosintesis, recuperacion de plantas, crecimiento desde la raiz
- Existe al menos una pieza orientada a cesped/canchas deportivas

### Implicancia para la home

La home no debe copiar el feed. Debe:

- Conservar su energia visual
- Ordenar mejor los beneficios
- Subir el tono institucional
- Hablarle a multiples audiencias

## 6. Testimonios segmentados

### Filtro recomendado

Segmentar testimonios por interes del visitante:

- Hogar y jardin
- Viveros y paisajismo
- Produccion y agro
- Cesped deportivo
- Cannabis

### Atributos por testimonio

Cada testimonio deberia poder etiquetarse con:

- Audiencia
- Variante del producto
- Tipo de uso
- Resultado principal

## 7. Preguntas abiertas

- Confirmar si PGI tendra branding propio en DB o tambien algunos tokens hardcodeados al principio
- Definir si la home institucional tendra contenido administrable desde el inicio o en una segunda pasada
- Definir si el formulario de contacto enviara email real desde el primer release o quedara stub temporal
- Confirmar si queremos namespacing de uploads ya en esta etapa o mas adelante
- Definir el proveedor final de correo corporativo para `@pgi.com.ar`
- Definir el proveedor final de envio transaccional de la tienda

## 8. Proximo paso recomendado

1. Cerrar alta de correo corporativo en Zoho u otra alternativa elegida.
2. Configurar la casilla de salida transaccional para la tienda.
3. Revisar y ajustar SPF, DKIM y DMARC.
4. Validar que el formulario de contacto institucional y los mails de tienda salgan con el dominio correcto.

Estado actual del hardening:

- `HOME_MODE`
- `HOME_FLAVOR`
- fallback seguro para no afectar `elpanatucasa`
- base documental para nuevos deploys

Siguiente paso recomendado:

- preparar preview deploy aislado para PGI
- revisar variables de entorno y base de datos nuevas
- usar MCP de Vercel en una sesion nueva para crear y configurar el proyecto

## 9. Estado actual implementado

- `HOME_MODE=storefront` ya fue configurado en `elpanatucasa`
- `elpanatucasa` debe seguir mostrando su flujo actual con `"/"` redirigiendo a `"/home"`
- la home institucional de PGI solo aparece con ambas variables:
  - `HOME_MODE=institutional`
  - `HOME_FLAVOR=pgi`
- si `HOME_MODE=institutional` pero `HOME_FLAVOR` falta o es invalido, la app vuelve a `"/home"`
- la home institucional ya incluye:
  - hero
  - producto y variantes
  - audiencias
  - testimonios filtrables con avatar y evidencia visual
  - FAQ
  - contacto
  - CTA a tienda en `/products`
- el estado local actual fue validado y se considera suficientemente bueno para un primer preview aunque todavia tenga textos placeholder

## 10. Handoff para nueva conversacion con Vercel MCP

Objetivo de la proxima sesion:

- crear un proyecto nuevo de Vercel para PGI
- asociarlo a una base de datos nueva
- configurar environment variables propias de PGI
- dejar listo un preview deploy sin afectar `elpanatucasa`

Contexto que la proxima sesion debe asumir:

- repo compartido entre multiples tiendas, estrategia `single-tenant por deploy`
- no convertir a multi-tenant por ahora
- `elpanatucasa` ya existe y debe quedar intacto
- la raiz institucional de PGI depende de `HOME_MODE=institutional` y `HOME_FLAVOR=pgi`
- el contenido institucional actual de PGI sigue siendo mayormente mock, pero apto para compartir internamente

Checklist sugerido para Vercel:

1. Crear proyecto nuevo, separado de `elpanatucasa`
2. Conectar el mismo repo
3. Configurar una DB nueva para PGI
4. Cargar env vars propias del proyecto PGI
5. Confirmar que `HOME_MODE=institutional`
6. Confirmar que `HOME_FLAVOR=pgi`
7. Definir `NEXT_PUBLIC_APP_URL` del nuevo dominio preview
8. Configurar email y form según disponibilidad real
9. Deployar sin tocar `main` de forma destructiva ni cambiar envs de `elpanatucasa`

Variables minimas importantes para PGI:

- `HOME_MODE=institutional`
- `HOME_FLAVOR=pgi`
- `CONTACT_FORM_TO=comercial@pgi.com.ar`
- `DATABASE_URL=<nueva DB>`
- `AUTH_SECRET=<nuevo secret>`
- `NEXT_PUBLIC_APP_URL=<url del proyecto PGI>`
- resto de credenciales requeridas por ecommerce segun el entorno

Prompt sugerido para retomar en una nueva sesion:

`Ya tengo Vercel MCP activo. Quiero crear un proyecto nuevo de Vercel para PGI usando este mismo repo ecommerce, con una DB nueva y env vars separadas. El proyecto existente elpanatucasa ya tiene HOME_MODE=storefront y no debe verse afectado. La home institucional de PGI debe salir con HOME_MODE=institutional y HOME_FLAVOR=pgi. Guiame y operá Vercel conmigo desde acá.`

Estado actual del hardening:

- `HOME_MODE`
- `HOME_FLAVOR`
- fallback seguro para no afectar `elpanatucasa`
- base documental para nuevos deploys

Siguiente paso recomendado:

- pulir la experiencia demo-safe
- preparar preview deploy aislado para PGI
- despues avanzar con el renderer de flavors y secciones reusables

## 11. Avances operativos de Vercel CLI

Estado actualizado: 2026-04-21

### Lo que ya quedo validado en esta maquina

- Mac Intel `x86_64` compatible con Vercel CLI
- macOS `15.7.4`
- Node `v20.20.1`
- npm `10.8.2`
- `vercel` CLI instalado y funcionando
- version instalada: `Vercel CLI 51.8.0`
- login completado correctamente en CLI
- cuenta autenticada: `ahorrointeligentecuentas-6290`
- scope visible: `ahorrointeligentecuentas-6290s-projects`

### Proyectos vistos por CLI

- `elpanatucasa`
- `ahorro-inteligente-web-panel`
- `ahorrointeligente`

### Lo que el CLI ya confirmo que puede automatizar

- crear proyecto nuevo con `vercel project add`
- listar e inspeccionar proyectos
- gestionar variables de entorno con `vercel env add`, `vercel env update`, `vercel env list`
- linkear el repo local a un proyecto con `vercel link`
- deployar previews y revisar logs

### Lo que sigue pendiente confirmar

- si la base de datos se va a crear con Vercel Postgres por CLI o con otro proveedor
- si conviene crear `pgiweb` directo desde CLI o primero desde la UI de Vercel
- como dejar protegido el flujo para no tocar por accidente el proyecto `elpanatucasa`

### Guardrails para retomar

- no pushear a `main` hasta tener claro el flujo de `pgiweb`
- recordar que `main` hoy sigue conectado al deploy existente de `elpanatucasa`
- hacer el alta de `pgiweb` como proyecto separado, apuntando al mismo repo
- preferir rama aislada o preview deploy antes de cualquier merge a `main`

### Variables confirmadas como minimas para PGI

- `DATABASE_URL`
- `POSTGRES_URL_NON_POOLING`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_NAME`
- `HOME_MODE=institutional`
- `HOME_FLAVOR=pgi`
- `CONTACT_FORM_TO`

### Variables opcionales pero probablemente necesarias segun alcance

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `OPENROUTESERVICE_API_KEY`
- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_WEBHOOK_SECRET`
- `UPLOADTHING_SECRET`
- `UPLOADTHING_APP_ID`

### Siguiente paso sugerido despues de reiniciar

1. Verificar que `vercel whoami` siga devolviendo la cuenta autenticada
2. Confirmar si vamos a crear `pgiweb` por CLI con `vercel project add pgiweb`
3. Confirmar proveedor de DB para PGI
4. Cargar env vars del proyecto nuevo
5. Linkear el repo local al proyecto `pgiweb`
6. Deployar preview aislado
7. Recien despues evaluar estrategia de commit y push sin afectar `elpanatucasa`

### Prompt sugerido para retomar tras reinicio

`Ya reinicie la Mac. En ecommerce/docs/PGI-ARGENTINA-PLAN.md quedo documentado que Vercel CLI ya esta instalado y autenticado como ahorrointeligentecuentas-6290. Quiero seguir con la creacion del proyecto pgiweb, la DB nueva y las env vars, cuidando que un push a main no afecte el proyecto existente elpanatucasa.`
