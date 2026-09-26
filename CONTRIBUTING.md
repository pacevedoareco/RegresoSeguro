# Guía de Contribución y Desarrollo Local — Regreso Seguro

## Requisitos Previos

- **Node.js**: v18.18+ o v20+
- **npm**: v9+
- **Supabase CLI**: `npx supabase`
- **Cuenta de OpenRouteService** (clave API gratuita)
- **Cuenta de Resend** (clave API gratuita)

---

## Configuración del Entorno Local

1. **Clonar el repositorio:**
   ```bash
   git clone <repo-url>
   cd RegresoSeguro
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Copiar `.env.example` a `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Completar las credenciales de Supabase, OpenRouteService, Resend y VAPID.

4. **Levantar Supabase local (opcional para desarrollo offline):**
   ```bash
   npx supabase start
   npx supabase db push
   ```

5. **Generar claves VAPID para Web Push (si es necesario):**
   ```bash
   npx web-push generate-vapid-keys
   ```

---

## Ejecución del Proyecto

- **Iniciar servidor de desarrollo:**
  ```bash
  npm run dev
  ```
  Acceder a [http://localhost:3000](http://localhost:3000).

- **Ejecutar pruebas unitarias e integración:**
  ```bash
  npm run test
  ```

- **Verificación de tipos TypeScript:**
  ```bash
  npm run typecheck
  ```

- **Verificación de Linting:**
  ```bash
  npm run lint
  ```

---

## Estructura del Código

- `app/`: Next.js App Router (rutas de interfaz y API routes).
- `lib/`: Lógica de negocio pura (cálculo de precios, transiciones, penalidades, analítica).
- `components/`: Componentes UI modulares (mapas, formularios, paneles de estado).
- `supabase/migrations/`: Esquema de base de datos PostgreSQL y políticas RLS.
- `docs/`: Documentación de producto, reglas de negocio y arquitectura.
