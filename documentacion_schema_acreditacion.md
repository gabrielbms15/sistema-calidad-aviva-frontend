# Sistema de Gestión de Acreditación — DMC
## Documentación del Schema de Base de Datos
**Supabase (PostgreSQL) · v1.0**

---

## Contexto del Sistema

Este sistema gestiona el proceso de acreditación hospitalaria de una organización con múltiples sedes. La acreditación se realiza cada 2 años por sede y consiste en demostrar el cumplimiento de criterios definidos en una guía técnica oficial, organizados en 22 macroprocesos.

El proceso tiene las siguientes etapas:
1. **Guía Técnica** — Visualización del catálogo inmutable de macroprocesos, códigos y criterios con sus fuentes de verificación.
2. **Definición de Requerimientos y Responsables** — Interpretación de cada criterio, definición de entregables (documentos, procesos, verificaciones in situ) y asignación de cargos responsables. Esta información es corporativa — no varía por sede ni año.
3. **Recopilación de Evidencias** — Por proceso (sede + año), se registra el estado de cada entregable (cumplido / parcial / no cumplido), las evidencias con sus links a SharePoint y observaciones internas.
4. **Solicitud de Documentos a Responsables** — Vista filtrada por responsable o área que muestra los criterios asignados y el estado de sus evidencias, para gestionar qué falta pedirle a cada quien.
5. **Autoevaluación** — Registro del puntaje propuesto (0, 1 o 2) por criterio en base a las evidencias recopiladas, y observaciones del evaluador externo durante la auditoría.
6. **Resultados** — Cálculo de avance por macroproceso usando pesos por tipo de criterio (estructura 45%, proceso 36%, resultado 19%), con renormalización cuando algún tipo está ausente.

---

## Tablas

---

### `macroproceso`
Catálogo inmutable de los 22 macroprocesos de la guía técnica de acreditación.

| campo | tipo | descripción |
|---|---|---|
| id | uuid PK | identificador |
| codigo | varchar | código corto (DIR, ATH...) |
| nombre | varchar | nombre completo |
| orden | int | orden de visualización |
| tipo | varchar | `gerencial` / `prestacional` / `apoyo` |
| peso | numeric(5,2) | peso porcentual en el cálculo global (ej: 7.5) |

**Relaciones:** ninguna hacia arriba. Es el punto de entrada del catálogo.
`macroproceso` → `codigo` (1 a muchos)

---

### `codigo`
Agrupador intermedio de criterios dentro de cada macroproceso (ej: DIR.1, DIR.2).

| campo | tipo | descripción |
|---|---|---|
| id | uuid PK | identificador |
| macroproceso_id | uuid FK | macroproceso al que pertenece |
| codigo | varchar | código (DIR.1, ATH.2...) |
| descripcion | text | descripción del código según la guía |
| orden | int | orden dentro del macroproceso |

**Relaciones:**
- pertenece a → `macroproceso`
- contiene → `criterio` (1 a muchos)

---

### `criterio`
Catálogo inmutable de criterios de la guía técnica. Cada criterio define qué se evalúa y los tres niveles de cumplimiento posibles.

| campo | tipo | descripción |
|---|---|---|
| id | uuid PK | identificador |
| codigo_id | uuid FK | código al que pertenece |
| codigo_criterio | varchar | código único (DIR1-1, ATH2-3...) |
| descripcion | text | descripción del criterio |
| fuente_0 | text | qué se evalúa para puntaje 0 |
| fuente_1 | text | qué se evalúa para puntaje 1 |
| fuente_2 | text | qué se evalúa para puntaje 2 (objetivo siempre) |
| tipo | varchar | `estructura` / `proceso` / `resultado` — usado para el cálculo de avance |

**Relaciones:**
- pertenece a → `codigo`
- tiene → `entregable` (1 a muchos)
- tiene → `criterio_responsable` (1 a muchos)
- tiene → `autoevaluacion` (1 a muchos, por proceso)

---

### `entregable`
Define qué entregables específicos pide la norma para cada criterio. Es corporativo — no varía por sede ni año. Un criterio puede tener múltiples entregables.

| campo | tipo | descripción |
|---|---|---|
| id | uuid PK | identificador |
| criterio_id | uuid FK | criterio al que pertenece |
| descripcion | text | qué entregable específico pide la norma |
| tipo_entregable | varchar | `documento` / `proceso` / `in_situ` / `ambos` |
| nota | text | observaciones adicionales opcionales |
| orden | int | orden de visualización |

**Relaciones:**
- pertenece a → `criterio`
- tiene → `entregable_seguimiento` (1 a muchos, por proceso)

---

### `entregable_seguimiento`
Estado y evidencia de cada entregable por proceso (sede + año). Aquí vive la operación del módulo de recopilación de evidencias.

| campo | tipo | descripción |
|---|---|---|
| id | uuid PK | identificador |
| entregable_id | uuid FK | entregable corporativo al que aplica |
| proceso_id | uuid FK | proceso de acreditación (sede + año) |
| estado | varchar | `cumplido` / `parcial` / `no_cumplido` |
| observacion | text | explicación interna (ej: por qué está parcial) |

**Relaciones:**
- pertenece a → `entregable`
- pertenece a → `proceso_acreditacion`
- tiene → `entregable_evidencia` (1 a muchos)

---

### `entregable_evidencia`
Evidencias concretas (documentos, fotos, actas) que respaldan el cumplimiento de un entregable en un proceso específico. Un entregable puede tener múltiples evidencias.

| campo | tipo | descripción |
|---|---|---|
| id | uuid PK | identificador |
| entregable_seguimiento_id | uuid FK | seguimiento al que pertenece |
| nombre_evidencia | text | nombre del documento o descripción |
| link_evidencia | text | link directo a SharePoint o carpeta de fotos |
| orden | int | orden de visualización |

**Relaciones:**
- pertenece a → `entregable_seguimiento`

---

### `area`
Catálogo de áreas organizacionales.

| campo | tipo | descripción |
|---|---|---|
| id | uuid PK | identificador |
| nombre | varchar | nombre del área (RECURSOS HUMANOS, INGENIERÍA CLÍNICA...) |

**Relaciones:**
- tiene → `responsable` (1 a muchos)

---

### `responsable`
Catálogo de cargos responsables de criterios. Es corporativo — el cargo existe independientemente de quién lo ocupe o en qué sede.

| campo | tipo | descripción |
|---|---|---|
| id | uuid PK | identificador |
| area_id | uuid FK | área a la que pertenece el cargo |
| cargo | varchar | nombre del cargo (JEFE DE ENFERMERÍA, BIOMÉDICO...) |

**Relaciones:**
- pertenece a → `area`
- tiene → `personal` (1 a muchos, uno por sede)
- tiene → `criterio_responsable` (1 a muchos)

---

### `personal`
Persona que ocupa un cargo en una sede específica. Para cargos corporativos la sede es Magdalena.

| campo | tipo | descripción |
|---|---|---|
| id | uuid PK | identificador |
| responsable_id | uuid FK | cargo que ocupa |
| sede_id | uuid FK | sede donde ejerce el cargo |
| nombre | varchar | nombre de la persona |
| apellido | varchar | apellido de la persona |
| correo | varchar | correo corporativo |
| activo | boolean | false cuando ya no ocupa el cargo |

**Relaciones:**
- pertenece a → `responsable`
- pertenece a → `sede`

---

### `criterio_responsable`
Tabla pivote que relaciona criterios con sus cargos responsables. Es corporativa — define qué cargo es responsable de qué criterio, independientemente de sede o año. Un criterio puede tener múltiples responsables.

| campo | tipo | descripción |
|---|---|---|
| id | uuid PK | identificador |
| criterio_id | uuid FK | criterio |
| responsable_id | uuid FK | cargo responsable |

**Relaciones:**
- pertenece a → `criterio`
- pertenece a → `responsable`

---

### `sede`
Sedes de la organización.

| campo | tipo | descripción |
|---|---|---|
| id | uuid PK | identificador |
| nombre | varchar | nombre de la sede |
| ciudad | varchar | ciudad |
| activa | boolean | false para sedes en implementación |

**Relaciones:**
- tiene → `proceso_acreditacion` (1 a muchos)
- tiene → `personal` (1 a muchos)

---

### `proceso_acreditacion`
Cada proceso de acreditación es único por sede y año. Es el eje central que agrupa toda la operación de un ciclo de acreditación.

| campo | tipo | descripción |
|---|---|---|
| id | uuid PK | identificador |
| sede_id | uuid FK | sede del proceso |
| anio | int | año del proceso (2025, 2026...) |
| estado | varchar | `borrador` / `en_revision` / `cerrado` / `auditado` / `cancelado` |
| fecha_inicio | date | fecha de inicio del proceso |
| fecha_fin_esperada | date | fecha estimada de cierre |

**Relaciones:**
- pertenece a → `sede`
- tiene → `entregable_seguimiento` (a través de los entregables)
- tiene → `autoevaluacion` (1 a muchos)

---

### `autoevaluacion`
Registro del puntaje por criterio en un proceso específico. También almacena las observaciones del evaluador externo durante la auditoría.

| campo | tipo | descripción |
|---|---|---|
| id | uuid PK | identificador |
| criterio_id | uuid FK | criterio evaluado |
| proceso_id | uuid FK | proceso (sede + año) |
| puntaje_propuesto | smallint | puntaje asignado internamente (0, 1 o 2) |
| puntaje_validado | smallint | a futuro: validación adicional (0, 1 o 2) |
| observacion_evaluador | text | observación del evaluador externo durante auditoría |
| fecha_autoevaluacion | date | fecha en que se registró el puntaje |
| validado_por | varchar | a futuro: quien valida el puntaje |
| fecha_validacion | date | a futuro: fecha de validación |

**Relaciones:**
- pertenece a → `criterio`
- pertenece a → `proceso_acreditacion`

---

### `asignacion`
Tabla para gestión operativa de fechas y seguimiento por criterio en un proceso. Pendiente de uso completo en módulos futuros.

| campo | tipo | descripción |
|---|---|---|
| id | uuid PK | identificador |
| proceso_id | uuid FK | proceso de acreditación |
| criterio_id | uuid FK | criterio asignado |
| tipo_entregable | varchar | `documento` / `in_situ` / `ambos` |
| fecha_asignacion | date | fecha en que se asignó |
| fecha_seguimiento | date | fecha de seguimiento |
| fecha_deadline | date | fecha límite |
| estado | varchar | `pendiente` / `en_proceso` / `entregado` / `aprobado` |

**Relaciones:**
- pertenece a → `proceso_acreditacion`
- pertenece a → `criterio`

---

### `evidencia`
Archivos enviados en el flujo de revisión formal de Calidad. Distinta de `entregable_evidencia` — esta tabla es para el flujo de feedback con revisión y aprobación.

| campo | tipo | descripción |
|---|---|---|
| id | uuid PK | identificador |
| asignacion_id | uuid FK | asignación a la que pertenece |
| tipo | varchar | `documento` / `acta` / `foto` / `registro` / `otro` |
| link_sharepoint | text | link al archivo |
| descripcion | text | qué demuestra este archivo |
| fecha_subida | timestamp | cuándo se subió |
| estado | varchar | `borrador` / `enviado` / `en_revision` / `aprobado` / `con_observaciones` |

**Relaciones:**
- pertenece a → `asignacion`
- tiene → `revision` (1 a muchos)

---

### `revision`
Ciclos de revisión y feedback de Calidad sobre una evidencia.

| campo | tipo | descripción |
|---|---|---|
| id | uuid PK | identificador |
| evidencia_id | uuid FK | evidencia revisada |
| revisor_nombre | varchar | nombre del revisor de Calidad |
| feedback | text | observaciones o motivo de rechazo |
| resultado | varchar | `aprobado` / `observado` |
| fecha_revision | timestamp | fecha de la revisión |

**Relaciones:**
- pertenece a → `evidencia`

---

## Mapa de relaciones resumido

```
macroproceso
  └── codigo
        └── criterio
              ├── entregable
              │     └── entregable_seguimiento (por proceso)
              │           └── entregable_evidencia
              ├── criterio_responsable ←→ responsable
              │                               ├── area
              │                               └── personal (por sede)
              └── autoevaluacion (por proceso)

sede
  ├── proceso_acreditacion
  │     ├── entregable_seguimiento
  │     ├── autoevaluacion
  │     └── asignacion
  │           ├── evidencia
  │           │     └── revision
  └── personal
```

---

## Separación corporativo vs. por proceso

| Dato | Corporativo (sin sede/año) | Por proceso (sede + año) |
|---|---|---|
| Criterios y fuentes | ✅ `criterio` | — |
| Entregables que pide la norma | ✅ `entregable` | — |
| Responsables por criterio | ✅ `criterio_responsable` | — |
| Personal por cargo | ✅ `personal` (con sede) | — |
| Estado de cada entregable | — | ✅ `entregable_seguimiento` |
| Evidencias y links | — | ✅ `entregable_evidencia` |
| Puntaje y observación evaluador | — | ✅ `autoevaluacion` |
