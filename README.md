# SalvaQuincena

Nota de contexto del proyecto. Esta app es un prototipo funcional de finanzas personales para usuarios en Colombia, pensado con experiencia mobile-first y posibilidad de empaquetarse con Capacitor.

## Objetivo

SalvaQuincena ayuda a registrar ingresos, gastos, metas de ahorro y deudas para dar una vista simple del estado financiero personal. Tambien incluye un simulador para comparar estrategias de pago de deudas:

- Bola de Nieve: prioriza la deuda con menor saldo.
- Avalancha: prioriza la deuda con mayor tasa de interes.

La app trabaja en pesos colombianos (COP) y usa textos orientados al mercado colombiano.

## Stack actual

- React 18
- TypeScript
- Vite
- Capacitor 6
- Lucide React para iconos
- Wompi Checkout para pago del plan PRO
- Persistencia local con `localStorage`
- Backend Laravel 12 en `backend/`
- Filament 5 para administracion
- Sanctum para tokens de API

## Estructura principal

- `src/App.tsx`: componente principal. Contiene navegacion, estado de datos, formularios, modales, calculos derivados y flujo PRO.
- `src/types/index.ts`: tipos de transacciones, metas, deudas y resultados de simulacion.
- `src/utils/debtCalculator.ts`: logica del simulador de deudas y conversion TEA a TEM.
- `src/utils/wompi.ts`: helper de pago Wompi, referencia, firma de integridad y apertura del checkout.
- `src/index.css`: estilos globales mobile-first.
- `public/logo.jpg`: logo usado en header y favicon.
- `capacitor.config.ts`: configuracion para empaquetado mobile.
- `backend/`: API Laravel, base de datos, panel Filament y webhook de Wompi.

## Funcionalidad actual

- Dashboard con balance general, ingresos y gastos.
- Registro, listado y eliminacion de transacciones.
- Metas de ahorro con progreso y aportes.
- Registro y eliminacion de deudas.
- Simulador de pago de deudas con pago mensual extra.
- Comparacion entre Bola de Nieve y Avalancha.
- Plan PRO mensual por $15.000 COP o anual por $165.000 COP.
- Activacion PRO guardada localmente.
- Registro local de cuenta para asociar compras y respaldos.
- Historial local de pagos Wompi asociados a la cuenta.
- Aceptacion de terminos requerida al crear o actualizar la cuenta.
- Cierre de sesion local desde la pantalla Cuenta.
- Registro automatico del pago PRO aprobado como gasto en transacciones.
- Exportacion CSV de transacciones para usuarios PRO.
- Diagnostico financiero PRO con puntaje, semaforo y recomendaciones.
- Presupuesto inteligente por categoria con limites sugeridos.
- Flujo de caja quincenal y gasto diario seguro.
- Calendario de pagos estimado a partir de deudas y gastos fijos.
- Plan anti-deudas con estrategia recomendada, meses e intereses evitados.
- Plan automatico de metas por aporte quincenal.
- Reportes visuales por categoria.
- Deteccion de gastos hormiga.
- Modo emergencia cuando hay balance negativo, deuda alta o flujo diario bajo.

## Persistencia

La app todavia conserva persistencia local para funcionar rapido en el dispositivo:

- `salvaquincena_transactions`
- `salvaquincena_savings`
- `salvaquincena_debts`
- `salvaquincena_ispro`
- `salvaquincena_account`
- `salvaquincena_payments`
- `salvaquincena_tx_id`

Ya existe backend en Laravel para guardar usuarios, historico financiero, pagos y suscripciones. El siguiente paso del frontend es conectar las pantallas actuales contra estos endpoints para que el respaldo sea automatico entre dispositivos.

El boton "Cerrar sesion" elimina del dispositivo la cuenta local, pagos asociados, estado PRO y el ultimo id de transaccion Wompi. No borra ingresos, gastos, metas ni deudas.

## Pagos PRO

El checkout de Wompi se carga desde `index.html`:

```html
<script src="https://checkout.wompi.co/widget.js" data-render="explicit"></script>
```

La configuracion del pago vive en `src/utils/wompi.ts`. Lee estas variables de entorno de Vite y, si no existen, usa los valores definidos en el archivo:

- `VITE_WOMPI_PUBLIC_KEY`
- `VITE_WOMPI_INTEGRITY_SECRET`

Existe un ejemplo en `.env.example`. Crea un archivo `.env.local` con tus llaves reales:

```bash
VITE_WOMPI_PUBLIC_KEY=pub_test_o_pub_prod_del_panel
VITE_WOMPI_INTEGRITY_SECRET=test_integrity_o_prod_integrity_del_mismo_ambiente
```

Para pruebas se deben usar llaves sandbox de Wompi (`pub_test_` y `test_integrity_`). Para cobros reales se usan llaves de produccion (`pub_prod_` y `prod_integrity_`) del mismo comercio.

Si Wompi responde `403` en `https://checkout.wompi.co/p/`, normalmente el problema esta en las llaves, el ambiente mezclado, el comercio no activo o una restriccion de Wompi. No es un error de React.

Antes de pagar se solicita una cuenta local. Cuando Wompi aprueba la transaccion, la app:

- activa PRO;
- guarda un registro en `salvaquincena_payments`;
- guarda el id de transaccion en `salvaquincena_tx_id`;
- crea una transaccion de gasto por el valor del plan PRO, ligada al pago por `paymentId`.

Importante: no agregar llaves privadas ni secrets de eventos en el frontend. El backend ya tiene webhook para validar eventos de Wompi y activar suscripciones PRO desde servidor.

## Backend Laravel / Filament

El backend vive en `backend/` y cubre:

- registro, login, cierre de sesion y cuenta actual;
- aceptacion de terminos al registrarse;
- sincronizacion de movimientos, metas y deudas por usuario;
- creacion de checkout mensual o anual de PRO desde servidor;
- webhook de Wompi para guardar pagos, eventos y activar suscripcion;
- panel Filament en `/admin` con usuarios, movimientos, metas, deudas, pagos, suscripciones, eventos e informe "Mi Balance General".

Rutas API principales:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/me
GET  /api/sync
POST /api/sync
GET  /api/subscription
POST /api/subscription/checkout
POST /api/wompi/webhook
```

Usuario admin local creado por seed:

```text
URL: /admin
Email: admin@salvaquincena.local
Clave: SalvaQuincena2026!
```

Cambia esa clave en produccion apenas subas el panel.

## Base de datos en Hostinger

En Hostinger crea una base MySQL desde el panel de hosting y copia nombre, usuario, clave y host. En `backend/.env` usa algo como:

```env
APP_NAME=SalvaQuincena
APP_ENV=production
APP_DEBUG=false
APP_URL=https://tu-dominio.com

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=u123456789_salvaquincena
DB_USERNAME=u123456789_salva
DB_PASSWORD=clave_segura

WOMPI_PUBLIC_KEY=pub_prod...
WOMPI_PRIVATE_KEY=prv_prod...
WOMPI_INTEGRITY_SECRET=prod_integrity...
WOMPI_EVENTS_SECRET=prod_events...
WOMPI_CURRENCY=COP
WOMPI_API_URL=https://production.wompi.co/v1
WOMPI_CHECKOUT_URL=https://checkout.wompi.co/p/
```

Para publicar en Hostinger:

1. Sube la carpeta `backend` al hosting.
2. Apunta el dominio o subdominio al directorio `backend/public`.
3. Crea el `.env` de produccion con MySQL y Wompi.
4. Ejecuta `composer install --no-dev --optimize-autoloader`.
5. Ejecuta `php artisan key:generate` si no tienes `APP_KEY`.
6. Ejecuta `php artisan migrate --force --seed`.
7. Ejecuta `php artisan config:cache` y `php artisan route:cache`.
8. Configura en Wompi el webhook: `https://tu-dominio.com/api/wompi/webhook`.

## Comandos

Instalar dependencias:

```bash
npm install
```

Levantar entorno local:

```bash
npm run dev
```

Compilar:

```bash
npm run build
```

Previsualizar build:

```bash
npm run preview
```

Sincronizar Capacitor despues del build:

```bash
npm run cap:sync
```

Backend local:

```bash
cd backend
composer install
php artisan migrate:fresh --seed
php artisan serve
```

## Notas de desarrollo

- La app esta concentrada en `App.tsx`; si crece, separar por componentes antes de agregar mas modales o pantallas.
- Mantener el formato COP con `Intl.NumberFormat('es-CO')`.
- Cuidar que los cambios sigan funcionando en pantallas pequenas; el layout esta limitado a `max-width: 480px`.
- El simulador usa una proteccion de maximo 360 meses para evitar ciclos largos.
- La activacion PRO actual es local y no prueba propiedad real del pago fuera del dispositivo.
- Los modulos PRO actuales son calculados con datos locales; para sincronizacion real, multi-dispositivo y validacion fuerte de pagos se requiere backend.
- Antes de publicar, validar textos visibles: hay una etiqueta en el formulario de deuda que dice "Monto Total Ovejado (COP)" y probablemente deberia ser "Monto Total Adeudado (COP)".
