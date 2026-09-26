🚘 Regreso Seguro
==================

> Acompañamiento vehicular nocturno: volver a casa sin dejar el auto atrás.

**Seminario de Gestión de Tecnología — UADE**
2º cuatrimestre de 2026 · Jueves full online · Grupo 6
**Estado general:** 🟡 Sin prisa pero sin pausa

---

## Tabla de contenidos

1. [El problema](#el-problema)
2. [Objetivo del MVP](#objetivo-del-mvp)
3. [Validación: research y datos](#validación-research-y-datos)
4. [Usuario objetivo y casos de uso](#usuario-objetivo-y-casos-de-uso)
5. [Alcance del MVP](#alcance-del-mvp)
6. [Stack tecnológico](#stack-tecnológico)
7. [Estado y plan de trabajo](#estado-y-plan-de-trabajo)
8. [Decisiones del proyecto](#decisiones-del-proyecto)
9. [Riesgos](#riesgos)
10. [Criterios de aceptación y plan de lanzamiento](#criterios-de-aceptación-y-plan-de-lanzamiento)
11. [Próximos pasos](#próximos-pasos)
12. [Equipo](#equipo)
13. [Documentación adicional](#documentación-adicional)

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

**Conclusión:** existe un segmento amplio, geográficamente concentrado en CABA/AMBA y con capacidad de pago, que hoy resigna consumo, planes o su propio vehículo por no tener una forma de volver a casa junto con el auto. Próximo paso: prototipar el flujo del servicio y testearlo.

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
- **Solicitud de un "Regreso Seguro":** ubicación, destino y datos básicos del vehículo.
- **Asignación y coordinación de un conductor:** gestión manual del pedido y asignación de un conductor validado.
- **Seguimiento del servicio:** estados simples — solicitado, conductor asignado, conductor en camino, servicio iniciado, finalizado.
- **Analítica y administración mínima:** panel básico de solicitudes, servicios realizados, cancelaciones, tiempos de respuesta y satisfacción.

**Fuera del alcance inicial**
- Asignación automática y optimización de conductores (matching, rutas, distribución dinámica).
- Pagos y facturación integrados (Mercado Pago, Stripe, etc. — inicialmente manual).
- Geolocalización y tracking en tiempo real avanzado.
- Personalización avanzada (fidelización, promociones, ratings sofisticados, múltiples tipos de servicio).

## Stack tecnológico

| Componente | Estado |
|---|---|
| Enfoque de despliegue | **Definido:** WebApp con opción de WPA (ver [D-001](#decisiones-del-proyecto)) |
| Frontend | Pendiente de definición |
| Backend | Pendiente de definición |
| Base de datos | Pendiente de definición |
| Infraestructura | Pendiente de definición |
| Integraciones | Pendiente de definición |
| Seguridad y privacidad | Pendiente de definición |

> Esta sección se irá completando a medida que se cierren las decisiones técnicas (ver [Próximos pasos](#próximos-pasos)). Instrucciones de instalación y desarrollo local se agregan una vez definida la arquitectura.

## Estado y plan de trabajo

**Líder del proyecto / PM:** Ignacio Caprara
**Fecha de inicio:** 20-08-2026 · **Fecha objetivo de lanzamiento del MVP:** Diciembre 2026

| Entregable | Estado | Fecha objetivo |
|---|---|---|
| Definición del problema | ✅ Terminado | — |
| Entrevistas y encuestas | ✅ Terminado | — |
| Análisis de resultados | ✅ Terminado | — |
| Primera presentación de avances | ✅ Terminado | Septiembre 18 |
| Canvas | ✅ Terminado | Septiembre 25 |
| Prototipo y pruebas internas | 🔵 En progreso | Octubre 2 |
| Piloto con usuarios / Beta cerrada | ⚪ No iniciado | Octubre 9 |
| Lanzamiento del MVP | ⚪ No iniciado | Octubre 30 |

*Leyenda: ⚪ No iniciado · 🔵 En progreso · ✅ Terminado · 🔴 Bloqueado*

## Decisiones del proyecto

### D-001 — Desarrollo y despliegue
- **Fecha:** 16 de septiembre de 2026 · **Estado:** Propuesta · **Responsable:** Pablo AA
- **Decisión:** desplegar la solución como WPA que funcione en la web y en cualquier dispositivo móvil.
- **Alternativas consideradas:** (1) apps nativas para Android/iOS, (2) WebApp con WPA *(elegida)*, (3) no soportar mobile y hacer sólo versión web.
- **Motivo:** facilidad de desarrollo, posibilidad de testear en distintos dispositivos rápidamente, costo nulo o casi inexistente.
- **Impacto:** bajo en una versión siguiente — se piensa la arquitectura como mobile-first y luego se puede desarrollar nativamente en cada sistema.
- **Próxima revisión:** al avanzar con la definición de arquitectura, antes de empezar el desarrollo.

## Riesgos

| Tipo | Descripción | Impacto | Probabilidad | Mitigación | Responsable |
|---|---|---|---|---|---|
| Riesgo | Los costos operativos pueden llegar a ser altos | Alto | Media | En definición | PM |

## Criterios de aceptación y plan de lanzamiento

**Criterios de aceptación del MVP**
- [ ] Los casos de uso prioritarios funcionan de punta a punta.
- [ ] Se validó la experiencia con usuarios objetivo.
- [ ] No existen errores críticos abiertos.
- [ ] Hay monitoreo y un plan de respuesta a incidentes.
- [ ] La documentación de uso y soporte está lista.
- [ ] Se definió el plan de lanzamiento y reversión.

**Plan de lanzamiento**

| | |
|---|---|
| Audiencia inicial | Beta cerrada con conocidos |
| Estrategia | Piloto con un número limitado de usuarios |
| Canal de comunicación | Redes sociales |
| Fecha tentativa | 30 de octubre |
| Señales para avanzar | Interés del segmento objetivo |
| Señales para detener o revertir | Falta de interés / uso |

## Próximos pasos

- [x] Confirmar problema, usuario objetivo y alcance.
- [x] Asignar responsables y fechas.
- [ ] Priorizar el backlog inicial.
- [ ] Validar las decisiones técnicas principales.
- [ ] Definir la primera actualización de progreso.
- [ ] Prototipar el flujo del servicio y testearlo.

## Equipo

| Nombre completo | Legajo | Rol |
|---|---|---|
| Acevedo Areco, Pablo | LU1207827 | Arquitecto / Business Analyst |
| Berensztein, Nahuel | LU1199745 | Frontend |
| Calle Gutierrez, Jordan Ariel | LU1155302 | UX Desginer |
| Campo, Guido Hernan | LU1129992 | Testing y DevOps |
| Caprara, Ignacio Nicolás | LU1207737 | Project Manager |

## Documentación adicional

- El seguimiento detallado de avances, bloqueos y actualizaciones del proyecto vive en Notion.
- Presentación de research y validación: `Regreso_Seguro_Avance.pptx` (incluida en este repositorio / adjunta en Notion).

---

*Proyecto académico desarrollado para el Seminario de Gestión de Tecnología de UADE (2º cuatrimestre de 2026, Grupo 6). Uso interno del equipo.*
