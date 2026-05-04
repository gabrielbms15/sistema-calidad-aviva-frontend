# Tablas — Módulo 3: Recopilación de Evidencias y Armado de Expediente

---

## CONTEXTO
Este módulo está ligado a una **sede y periodo** (proceso_acreditacion).
Los entregables que se listan son globales (tabla `entregable`), pero su estado y evidencia son por proceso.

---

## LECTURA (catálogo — no cambia)

### `macroproceso`
| campo | aloja |
|---|---|
| codigo | código del macroproceso — encabezado de sección (DIR, ATH...) |
| nombre | nombre del macroproceso |
| orden | orden de visualización |

### `criterio`
| campo | aloja |
|---|---|
| codigo_criterio | columna **Criterio** de la tabla (DIR1-1, DIR1-2...) |
| descripcion | descripción del criterio, visible en tooltip o detalle |

### `entregable`
| campo | aloja |
|---|---|
| descripcion | columna **Entregable** — cada fila de entregable por criterio |
| tipo_entregable | badge de tipo (documento / proceso / in_situ / ambos) |
| nota | nota adicional visible en detalle del entregable |
| orden | orden de las filas de entregable dentro del criterio |

---

## LECTURA Y ESCRITURA (por proceso — sede + año)

### `entregable_seguimiento`
> Una fila por entregable por proceso. Aquí vive el estado y la evidencia.

| campo | aloja | operación |
|---|---|---|
| entregable_id | FK al entregable global | — |
| proceso_id | FK al proceso (sede + año) | — |
| estado | columna **Estado** del entregable (`cumplido` / `parcial` / `no_cumplido`) | escritura |
| nombre_evidencia | columna **Evidencia** — nombre del documento o descripción del proceso verificado | escritura |
| link_evidencia | columna **Fuente** — link a SharePoint o carpeta de fotos | escritura |

### `criterio_comentario`
> Un solo registro por criterio por proceso. Sobreescribible.

| campo | aloja | operación |
|---|---|---|
| criterio_id | FK al criterio | — |
| proceso_id | FK al proceso (sede + año) | — |
| comentario | widget de comentario libre por criterio | escritura |

---

## QUERIES

### Cargar la tabla completa del módulo para un proceso

```
GET /macroproceso?select=
  codigo,
  nombre,
  orden,
  codigo(
    codigo,
    orden,
    criterio(
      id,
      codigo_criterio,
      descripcion,
      entregable(
        id,
        descripcion,
        tipo_entregable,
        nota,
        orden,
        entregable_seguimiento(
          id,
          estado,
          nombre_evidencia,
          link_evidencia,
          proceso_id
        )
      ),
      criterio_comentario(
        comentario,
        proceso_id
      )
    )
  )
&order=orden.asc
```

> El frontend filtra `entregable_seguimiento` y `criterio_comentario` por `proceso_id` en cliente, o puedes usar una RPC en Supabase para filtrar en servidor.

---

### Guardar / actualizar estado y evidencia de un entregable

**Si no existe aún (primer guardado) — POST:**
```json
POST /entregable_seguimiento
{
  "entregable_id": "uuid",
  "proceso_id": "uuid",
  "estado": "cumplido",
  "nombre_evidencia": "Plan Estratégico Institucional 2024",
  "link_evidencia": "https://sharepoint.com/.../PEI_2024.pdf"
}
```

**Si ya existe — PATCH:**
```
PATCH /entregable_seguimiento?entregable_id=eq.<uuid>&proceso_id=eq.<uuid>
body: {
  "estado": "cumplido",
  "nombre_evidencia": "Plan Estratégico Institucional 2024",
  "link_evidencia": "https://sharepoint.com/.../PEI_2024.pdf"
}
```

---

### Guardar / actualizar comentario de un criterio

**POST (primer guardado):**
```json
POST /criterio_comentario
{
  "criterio_id": "uuid",
  "proceso_id": "uuid",
  "comentario": "El documento existe pero no tiene firma de la Gerencia General."
}
```

**PATCH (actualizar):**
```
PATCH /criterio_comentario?criterio_id=eq.<uuid>&proceso_id=eq.<uuid>
body: { "comentario": "..." }
```

---

## MAPEO COLUMNA → TABLA

| Columna en UI | Tabla | Campo |
|---|---|---|
| Criterio | `criterio` | `codigo_criterio` |
| Entregable (fila) | `entregable` | `descripcion` |
| Tipo | `entregable` | `tipo_entregable` |
| Estado | `entregable_seguimiento` | `estado` |
| Evidencia | `entregable_seguimiento` | `nombre_evidencia` |
| Fuente | `entregable_seguimiento` | `link_evidencia` |
| Comentarios | `criterio_comentario` | `comentario` |