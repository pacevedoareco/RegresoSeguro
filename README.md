🚘 Regreso Seguro
==================

> Acompañamiento vehicular nocturno: volver a casa sin dejar el auto atrás.

**Seminario de Gestión de Tecnología — UADE**
2º cuatrimestre de 2026 · Jueves full online · Grupo 6
**Estado general:** 🔵 Especificación completa — en desarrollo

---

## Tabla de contenidos

1. [El problema](#el-problema)
2. [Objetivo del MVP](#objetivo-del-mvp)
3. [Validación: research y datos](#validación-research-y-datos)
4. [Usuario objetivo y casos de uso](#usuario-objetivo-y-casos-de-uso)
5. [Alcance del MVP](#alcance-del-mvp)
6. [Stack tecnológico](#stack-tecnológico)
7. [Desarrollo local](#desarrollo-local)
8. [Estado y plan de trabajo](#estado-y-plan-de-trabajo)
9. [Decisiones del proyecto](#decisiones-del-proyecto)
10. [Riesgos](#riesgos)
11. [Criterios de aceptación y plan de lanzamiento](#criterios-de-aceptación-y-plan-de-lanzamiento)
12. [Próximos pasos](#próximos-pasos)
13. [Equipo](#equipo)
14. [Documentación del proyecto](#documentación-del-proyecto)

---

## El problema

Volver a casa después de tomar alcohol implica resolver **dos problemas al mismo tiempo**:

1. **¿Cómo vuelvo yo?** — La persona necesita llegar a su casa sin manejar alcoholizada, arriesgando su seguridad física y legal.
2. **¿Qué hago con el auto?** — El vehículo queda solo en el lugar, expuesto a robos o multas, y hay que volver a buscarlo al día siguiente.

Las alternativas actuales (Uber, taxi, remis) sólo resuelven el traslado de la persona: **el auto siempre queda atrás.** Hoy no existe una solución simple que permita que la persona y su auto vuelvan juntos a casa de manera segura.

## Objetivo del MVP

Validar que existe una necesidad real por un servicio que permita a las personas volver a casa de forma segura **junto con su propio vehículo**. La primera versión debe permitir solicitar un conductor, coordinar el servicio y completar el regreso de persona + auto de manera simple, rápida y confiable, generando evidencia suficiente para evaluar la viabilidad del modelo antes de invertir en una solución tecnológica más compleja.

**Métricas de éxito**

| Métrica | Qué mide |
|---|---|
| **Demanda** | Cantidad de solicitudes de servicio y % de usuarios que efectivamente completan una solicitud |
| **Conversión** | % de solicitudes que se convierten en servicios realizados |
| **Experiencia** | Satisfacción post-servicio (CSAT/NPS) y tasa de incidencias o cancelaciones |
| **Repetición** | % de usuarios que vuelven a usar el servicio dentro del período de prueba |

## Validación: research y datos

La hipótesis del problema se validó en cuatro etapas: encuestas cuantitativas → entrevistas y observación → modelado de usuarios (persona, mapa de empatía, journey map) → análisis de resultados.

**Encuesta cuantitativa (375 respuestas)**

| Hallazgo | Valor |
|---|---|
| Personas en el segmento afectado | 211 (56,3 %) |
| Cuenta con auto propio o de uso habitual | 77,9 % |
| De quienes salen, consume alcohol | 95,2 % |
| Del segmento tiene entre 25 y 44 años | 83,5 % |
| Gasta más de $20.000 en una salida nocturna | 76 % |
| Reside en CABA/AMBA | 93,7 % |
| Manifestó interés en un servicio como este | 81 % |

**La brecha entre lo que preferirían hacer y lo que hacen:**

| Comportamiento | % de encuestados |
|---|---|
| Preferiría volver en su propio auto | 56,3 % |
| Vuelve en su auto cuando sabe que va a tomar | 27,7 % |
| Vuelve en Uber / taxi (dejando el auto) | 42,9 % |

**El dolor es recurrente, no un hecho aislado (últimos 12 meses):**
- 80,1 % dejó el auto estacionado por haber tomado, al menos una vez
- 65,4 % evitó directamente tomar alcohol por haber ido manejando
- 77,3 % dejó de ir a un evento por lo complicado que resultaba volver con el auto
- 80,6 % descartó un lugar por no tener una forma cómoda de volver junto con su auto

**Conclusión:** existe un segmento amplio, geográficamente concentrado en CABA/AMBA y con capacidad de pago, que hoy resigna consumo, planes o su propio vehículo por no tener una forma de volver a casa junto con el auto.

## Usuario objetivo y casos de uso

**Usuario primario:** persona adulta de 25–44 años, residente en CABA/AMBA, con auto propio o de uso habitual, que sale regularmente a bares, restaurantes, fiestas o eventos y consume alcohol en esas ocasiones.

**Persona:** Nicolás González, 31 años, CABA, empleado en relación de dependencia, vive en pareja sin hijos. *"Quiero volver a casa tranquilo y encontrar el auto donde lo dejé."*

**Casos de uso prioritarios**

| # | Caso | Descripción |
|---|---|---|
| 1 | **"Tomé más de lo que pensaba"** *(killer use case)* | Fue en su auto sin planearlo, termina alcoholizado y pide un conductor que lo lleve a él y a su auto a destino |
| 2 | **"Sé que voy a tomar"** | Sabe de antemano que va a consumir, quiere igual ir en su auto y planifica el regreso con el servicio |
| 3 | **"Soy responsable de llevar a otros"** | Salió con su auto y acompañantes; el conductor profesional lleva el vehículo y a todos los ocupantes |
| 4 | **"No quiero dejar el auto toda la noche"** | Evita el viaje extra del día siguiente para recuperar el vehículo dejado en Uber/taxi |

## Alcance del MVP

**Incluido**
- **Solicitud de un "Regreso Seguro":** el pasajero ingresa ubicación de origen, destino y vehículo; recibe un precio estimado en 3 tramos antes de confirmar.
- **Gestión de vehículos:** los pasajeros pueden guardar uno o más autos en su perfil y reutilizarlos en futuras solicitudes.
- **Asignación manual de conductor:** el operador asigna un conductor validado desde el panel de administración; el precio final se recalcula con la ubicación GPS real del conductor asignado.
- **Seguimiento en tiempo real:** 5 estados — Solicitado → Asignado → En camino → En curso → Finalizado, con actualizaciones en tiempo real vía Supabase Realtime.
- **Interfaz del conductor:** los conductores tienen su propia vista en la app, actualizan el estado del servicio y comparten su ubicación GPS cuando están disponibles.
- **Sistema de calificaciones:** pasajero y conductor se califican mutuamente al finalizar el servicio (1–5 estrellas).
- **Sistema de strikes:** cancelar un servicio ya asignado genera 1 strike; al acumular 3 strikes la cuenta queda suspendida.
- **Notificaciones push (PWA):** el pasajero recibe una notificación en cada cambio de estado, incluso con la app en segundo plano.
- **Correos transaccionales:** confirmación de registro y avisos de strike vía Resend.
- **Historial de servicios:** el pasajero puede consultar todos sus viajes anteriores.
- **Panel de administración:**
  - *Operador:* gestión de solicitudes y asignación de conductores.
  - *Super-Admin:* gestión de conductores, configuración del precio por km y dashboard de analítica básica.

**Fuera del alcance inicial**
- Asignación automática y optimización de conductores (matching, rutas, distribución dinámica).
- Pagos y facturación integrados (Mercado Pago, Stripe, etc. — el cobro es manual/en efectivo en el MVP).
- Penalización monetaria por strikes (prevista para cuando se integren pagos, post-MVP).
- Geolocalización del conductor visible en el mapa para el pasajero.
- Personalización avanzada: fidelización, promociones, múltiples tipos de servicio.
- Apps nativas para iOS/Android.

## Stack tecnológico

| Componente | Tecnología | Notas |
|---|---|---|
| **Plataforma** | PWA (Progressive Web App) | Mobile-first, instalable en Android e iOS |
| **Framework** | Next.js 14+ (App Router) | Frontend + API routes en un solo proyecto |
| **Lenguaje** | TypeScript | En todo el proyecto |
| **Estilos** | Tailwind CSS | |
| **Base de datos** | PostgreSQL (Supabase) | |
| **Autenticación** | Supabase Auth | Email + contraseña |
| **Tiempo real** | Supabase Realtime | Actualizaciones de estado en vivo |
| **Mapas** | Leaflet.js + OpenStreetMap | Tiles gratuitos, sin costo de API |
| **Ruteo y distancias** | OpenRouteService (free tier) | Cálculo de los 3 tramos de precio |
| **Correo transaccional** | Resend (free tier) | 3.000 emails/mes gratis |
| **Notificaciones push** | Web Push API + VAPID | Nativo del navegador, sin costo |
| **Despliegue** | Vercel (free tier) | CI/CD automático desde GitHub |
| **Infraestructura** | Supabase (free tier) | DB + Auth + Realtime + Storage |

> **Restricción clave:** todos los servicios y APIs utilizados son gratuitos o de código abierto, sin costos de uso.

## Desarrollo local

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd regreso-seguro

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Completar las claves de Supabase, OpenRouteService, Resend y VAPID

# 4. Iniciar Supabase local
npx supabase start

# 5. Aplicar migraciones de base de datos
npx supabase db push

# 6. Iniciar el servidor de desarrollo
npm run dev
```

> Las instrucciones completas de configuración y las variables de entorno requeridas están en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Estado y plan de trabajo

**Líder del proyecto / PM:** Ignacio Caprara
**Fecha de inicio:** 20-08-2026 · **Fecha objetivo de lanzamiento del MVP:** 30 de octubre de 2026

| Entregable | Estado | Fecha objetivo |
|---|---|---|
| Definición del problema | ✅ Terminado | — |
| Entrevistas y encuestas | ✅ Terminado | — |
| Análisis de resultados | ✅ Terminado | — |
| Primera presentación de avances | ✅ Terminado | Septiembre 18 |
| Canvas | ✅ Terminado | Septiembre 25 |
| **Especificación completa y arquitectura** | ✅ **Terminado** | Septiembre 25 |
| Prototipo y pruebas internas | 🔵 En progreso | Octubre 2 |
| Piloto con usuarios / Beta cerrada | ⚪ No iniciado | Octubre 9 |
| Lanzamiento del MVP | ⚪ No iniciado | Octubre 30 |

*Leyenda: ⚪ No iniciado · 🔵 En progreso · ✅ Terminado · 🔴 Bloqueado*

## Decisiones del proyecto

Las decisiones de arquitectura y producto están documentadas en detalle en [`docs/DECISIONS.md`](docs/DECISIONS.md) y [`docs/ADR.md`](docs/ADR.md). A continuación, un resumen de las principales:

| ID | Decisión | Estado |
|---|---|---|
| D-001 | Despliegue como PWA (no apps nativas) | ✅ Aceptada |
| D-002 | Next.js 14 + TypeScript como framework full-stack | ✅ Aceptada |
| D-003 | Supabase para base de datos, autenticación y tiempo real | ✅ Aceptada |
| D-004 | Vercel free tier para despliegue | ✅ Aceptada |
| D-005 | OpenRouteService para cálculo de rutas y distancias | ✅ Aceptada |
| D-006 | Todos los servicios externos deben ser gratuitos | ✅ Restricción confirmada |
| D-007 | Precio en 3 tramos: conductor→origen, origen→destino, destino→conductor | ✅ Aceptada |
| D-008 | Sistema de strikes: penalización por cancelaciones post-asignación | ✅ Aceptada |
| D-009 | Dos roles de administración: Operador y Super-Admin | ✅ Aceptada |
| D-010 | Conductores se auto-registran; Super-Admin los promueve | ✅ Aceptada |

> Para el registro completo de decisiones, alternativas rechazadas y decisiones post-MVP documentadas, ver [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Riesgos

| Tipo | Descripción | Impacto | Probabilidad | Mitigación | Responsable |
|---|---|---|---|---|---|
| Operativo | Los costos operativos pueden llegar a ser altos | Alto | Media | Validar modelo de precios con datos reales del piloto | PM |
| Técnico | Límite de 2.000 req/día de OpenRouteService en free tier | Medio | Baja (escala del piloto) | Monitorear uso; migrar a self-hosted OSRM si supera el límite | Arquitecto |
| Técnico | Push notifications en iOS requieren iOS 16.4+ y agregar a pantalla de inicio | Medio | Media | Comunicar requisito a usuarios del piloto | Frontend |
| Producto | Baja adopción inicial (conductores sin incentivo suficiente) | Alto | Media | Piloto con conductores conocidos; iterar propuesta de valor | PM |

## Criterios de aceptación y plan de lanzamiento

**Criterios de aceptación del MVP**
- [ ] Los 4 casos de uso prioritarios funcionan de punta a punta.
- [ ] Se validó la experiencia con usuarios objetivo (beta cerrada).
- [ ] No existen errores críticos (P0) abiertos.
- [ ] Hay monitoreo básico (Vercel Analytics) y un plan de respuesta a incidentes.
- [ ] La documentación técnica y de uso está completa.
- [ ] Se definió el plan de lanzamiento y de reversión.
- [ ] El checklist completo de lanzamiento está disponible en [`docs/MVP_CHECKLIST.md`](docs/MVP_CHECKLIST.md).

**Plan de lanzamiento**

| | |
|---|---|
| Audiencia inicial | Beta cerrada con conocidos |
| Estrategia | Piloto con un número limitado de usuarios |
| Canal de comunicación | Redes sociales |
| Fecha tentativa | 30 de octubre de 2026 |
| Señales para avanzar | Interés y uso real del segmento objetivo |
| Señales para detener o revertir | Falta de interés / uso / problemas críticos sin resolución |

## Próximos pasos

- [x] Confirmar problema, usuario objetivo y alcance.
- [x] Asignar responsables y fechas.
- [x] Definir arquitectura y stack tecnológico.
- [x] Documentar especificación completa (PRD, requisitos, modelo de datos, plan de implementación).
- [x] Resolver todas las preguntas abiertas de producto y arquitectura.
- [ ] Implementar TASK-001 a TASK-015 según [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).
- [ ] Prototipar el flujo del servicio y testearlo con usuarios.
- [ ] Piloto con usuarios / Beta cerrada.
- [ ] Lanzamiento del MVP.

## Equipo

| Nombre completo | Legajo | Rol |
|---|---|---|
| Acevedo Areco, Pablo | LU1207827 | Arquitecto / Business Analyst |
| Berensztein, Nahuel | LU1199745 | Frontend |
| Calle Gutierrez, Jordan Ariel | LU1155302 | UX Designer |
| Campo, Guido Hernan | LU1129992 | Testing y DevOps |
| Caprara, Ignacio Nicolás | LU1207737 | Project Manager |

## Documentación del proyecto

Toda la especificación técnica y de producto vive en la carpeta [`docs/`](docs/):

| Documento | Descripción |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | Documento de Requisitos de Producto — visión, alcance, métricas |
| [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) | Requisitos funcionales (FR-001 a FR-025) con criterios de aceptación |
| [`docs/BUSINESS_RULES.md`](docs/BUSINESS_RULES.md) | Reglas de negocio (BR-001 a BR-030), explícitas y testeables |
| [`docs/USER_FLOWS.md`](docs/USER_FLOWS.md) | Flujos de usuario con todos los estados (carga, vacío, error, éxito) |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arquitectura del sistema, seguridad, despliegue, desarrollo local |
| [`docs/ADR.md`](docs/ADR.md) | Registros de Decisiones de Arquitectura (ADR-001 a ADR-009) |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Modelo de datos completo, políticas RLS, índices |
| [`docs/TEST_PLAN.md`](docs/TEST_PLAN.md) | Plan de pruebas con trazabilidad requisito → test |
| [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) | 15 tareas de implementación con dependencias y Definition of Done |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Registro completo de decisiones de producto y tecnología |
| [`docs/OPEN_QUESTIONS.md`](docs/OPEN_QUESTIONS.md) | Preguntas abiertas (todas resueltas al 25/09/2026) |
| [`docs/MVP_CHECKLIST.md`](docs/MVP_CHECKLIST.md) | Checklist de lanzamiento del MVP |
| [`docs/AGENTS.md`](docs/AGENTS.md) | Instrucciones para agentes de IA que trabajen en este repositorio |

> El seguimiento detallado de avances, bloqueos y actualizaciones del proyecto también vive en Notion.
> Presentación de research y validación: `Regreso_Seguro_Avance.pptx` (incluida en este repositorio / adjunta en Notion).

---

*Proyecto académico desarrollado para el Seminario de Gestión de Tecnología de UADE (2º cuatrimestre de 2026, Grupo 6). Uso interno del equipo.*
