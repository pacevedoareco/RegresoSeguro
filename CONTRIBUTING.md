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

---

## Flujo de PRs y CI/CD

1. Crear una branch desde `main` y abrir un PR contra `main` (se usa la plantilla de `.github/pull_request_template.md`).
2. **CI (GitHub Actions)** — [`.github/workflows/ci.yml`](.github/workflows/ci.yml) corre en cada PR y en cada push a `main`, con cuatro jobs en paralelo:
   - **Lint** — `npm run lint`
   - **Typecheck** — `npm run typecheck`
   - **Unit tests** — `npm test`
   - **Build** — `npm run build` (con env vars dummy; no se conecta a servicios reales)

   El job **CI OK** agrupa los cuatro: es el único check que hay que marcar como obligatorio.
3. **CD (Vercel)** — Vercel genera un *preview deployment* por cada PR y despliega a producción al mergear en `main`.
4. **Dependabot** abre PRs semanales para actualizar dependencias npm y versiones de actions.

### Protección de la branch `main` (configurar una vez en GitHub)

En *Settings → Branches → Add branch ruleset* (o *Branch protection rule*) para `main`:

- ✅ Require a pull request before merging (opcional: 1 aprobación)
- ✅ Require status checks to pass → agregar **`CI OK`** (y opcionalmente el check de Vercel)
- ✅ Require branches to be up to date before merging
- ✅ Block force pushes

Además, en *Vercel → Project Settings → Git* se puede activar que el deploy a producción espere a que pasen los checks de GitHub.
