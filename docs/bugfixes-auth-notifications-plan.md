# Plan: Corrección de Notificaciones, Lazy Auth Gate en Vehículo/Presupuesto y Registro en Producción

## Overview
Este plan aborda 3 problemas identificados en la aplicación **Regreso Seguro**:
1. **Banner de notificaciones**: No desaparece tras activarse o interactuar debido a la falta de persistencia en almacenamiento local y falta de ocultamiento inmediato cuando `Notification.permission === 'granted'`.
2. **Requerimiento FR-003 (Lazy Authentication Gate & Vehículo Temporal)**: Permitir a usuarios no autenticados completar los pasos 1, 2, 3 (ingresando datos de un vehículo temporal o seleccionando de local storage) y 4 (ver presupuesto de 3 tramos), e interceptar la autenticación sólo al hacer clic en "Confirmar y Solicitar Chofer" preservando los datos del viaje y auto para guardarlos en la cuenta una vez autenticado/registrado.
3. **Fallo de Registro en Producción (Vercel)**: Diagnóstico y endurecimiento del endpoint `/api/auth/register`, manejo de variables de entorno (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, etc.), logs detallados server-side y fallback/resiliencia ante fallos de email/triggers.

---

## Sub-Tasks

### Sub-Task 1: Corrección de Banner de Activación de Notificaciones
- **Intent**: Asegurar que el banner de notificaciones se oculte permanentemente una vez activado, descartado o si los permisos ya están concedidos.
- **Expected Outcomes**:
  - Si `Notification.permission === 'granted'`, el banner no se muestra.
  - Si el usuario hace clic en "Activar notificaciones" y se concede el permiso, el banner desaparece inmediatamente y se guarda la preferencia en `localStorage`.
  - Si el usuario hace clic en "✕" o "Ahora no", se recuerda la decisión en `localStorage` (o sessionStorage) para que no vuelva a aparecer en recargas inmediatas.
  - El banner no requiere que el usuario esté autenticado para ocultarse si el navegador ya otorgó los permisos.
- **Todo List**:
  1. Modificar `components/PushNotificationManager.tsx`:
     - Agregar condición `permission === 'granted'` a la guarda de no renderizado (`if (!isSupported || isSubscribed || permission === "denied" || permission === "granted" || bannerDismissed)`).
     - Persistir la bandera de descarte/activación en `localStorage` (ej: `regreso_push_banner_dismissed`).
     - Al presionar "Activar", si el permiso se otorga (`perm === 'granted'`), setear `setBannerDismissed(true)` y guardar en `localStorage` incluso si el backend `/api/push/subscribe` retorna 401 por no estar logueado aún.
- **Relevant Context**:
  - `components/PushNotificationManager.tsx`
  - `app/api/push/subscribe/route.ts`
- **Status**: `[ ] pending`

---

### Sub-Task 2: Lazy Authentication Gate y Almacenamiento Temporal de Vehículo (FR-003)
- **Intent**: Permitir a usuarios anónimos/invitados registrar temporalmente su vehículo en el Paso 3, ver la cotización de 3 tramos en el Paso 4, y requerir login/registro sólo al presionar "Confirmar y Solicitar Chofer", preservando y migrando los datos a su cuenta tras el inicio de sesión.
- **Expected Outcomes**:
  - Si el usuario no está autenticado:
    - En el Paso 3, el formulario de vehículo permite cargar los datos (patente, marca/modelo, color) y los guarda en estado local / `sessionStorage` / `localStorage` como vehículo temporal con un `id` temporal (ej: `temp-xxx`).
    - El usuario puede avanzar al Paso 4 y ver el cálculo de presupuesto completo sin estar logueado.
  - Al presionar "Confirmar y Solicitar Chofer" en el Paso 4:
    - Si el usuario no está autenticado, se guarda el estado completo de la solicitud (`pickup`, `destination`, `vehicle`) en `sessionStorage` (ej: `pending_service_request`) y se redirige a `/auth/login?returnUrl=/` o `/auth/register?returnUrl=/`.
    - Al loguearse o registrarse exitosamente:
      - La aplicación detecta la solicitud pendiente en `sessionStorage`.
      - Si el vehículo era temporal, crea/persiste el vehículo en la base de datos vía `POST /api/vehicles` asociándolo al nuevo usuario.
      - Devuelve al usuario al **Paso 4 (Resumen / Presupuesto)** con todos los datos y el vehículo precargados para confirmar con 1 clic.
- **Todo List**:
  1. Modificar `components/VehicleForm.tsx` y `components/VehicleSelector.tsx`:
     - Permitir modo invitado / offline si el usuario no tiene sesión o si `fetch('/api/vehicles')` responde 401.
     - Enviar `onSuccess` con un objeto `Vehicle` temporal `{ id: 'temp-...', license_plate, make_model, color, rider_id: '' }` sin bloquear con error de red/401 si no está autenticado.
  2. Modificar `components/ServiceRequestWizard.tsx`:
     - Manejar gracefully la carga de vehículos cuando el usuario es anónimo (no mostrar error, permitir registrar auto temporal).
     - En `handleSubmitRequest`, chequear si el usuario está autenticado (vía endpoint o cliente supabase). Si no está autenticado, guardar `pickup`, `destination`, `selectedVehicle` en `sessionStorage` y redirigir a `/auth/login?redirect=/`.
     - Agregar efecto inicial que verifique si existe un `pending_service_request` tras el login, restaure el wizard en el paso 4 o auto-guarde el vehículo y cree la solicitud.
  3. Modificar `app/auth/login/page.tsx` y `app/auth/register/page.tsx`:
     - Respetar el parámetro `returnUrl` / `redirect` en caso de venir de un flujo de solicitud.
- **Relevant Context**:
  - `docs/REQUIREMENTS.md` (FR-003, AC-003-1, AC-003-2, AC-003-3)
  - `components/ServiceRequestWizard.tsx`
  - `components/VehicleSelector.tsx`
  - `components/VehicleForm.tsx`
  - `app/api/vehicles/route.ts`
  - `app/auth/login/page.tsx`
  - `app/auth/register/page.tsx`
- **Status**: `[ ] pending`

---

### Sub-Task 3: Diagnóstico y Solución del Registro de Usuarios en Producción
- **Intent**: Resolver el error "No se pudo crear la cuenta. Intentá de nuevo más tarde." en producción (Vercel).
- **Expected Outcomes**:
  - Los usuarios pueden registrarse exitosamente en https://regresoseguro.vercel.app/auth/register.
  - Los errores de configuración en el servidor de producción son identificados claramente y documentados.
  - `/api/auth/register` maneja de forma robusta la ausencia o falla de variables de entorno (como `SUPABASE_SERVICE_ROLE_KEY` o `RESEND_API_KEY`) y devuelve mensajes claros en logs.
- **Todo List**:
  1. Revisar e inspeccionar `app/api/auth/register/route.ts`:
     - Validar que `createServiceClient()` verifique que `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` estén definidos y arroje un mensaje descriptivo en logs de Vercel si faltan.
     - En Vercel / Supabase, comprobar que la función `handle_new_user()` del trigger `on_auth_user_created` en Supabase no esté fallando por restricciones de columnas (ej. `full_name`, `registered_as_driver`, `phone`).
     - Asegurar que si `sendRegistrationConfirmation` falla (por falta de `RESEND_API_KEY` o dominio no verificado en Resend en producción), no interrumpa ni afecte la creación del usuario en Supabase Auth.
     - Documentar los pasos de configuración necesarios en el panel de Vercel (Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`).
- **Relevant Context**:
  - `app/api/auth/register/route.ts`
  - `lib/supabase/service.ts`
  - `lib/resend/emails.ts`
  - `supabase/migrations/20260926000000_initial_schema.sql`
- **Status**: `[ ] pending`
