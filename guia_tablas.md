# Tablas — Módulo Interpretación y Asignación de Responsables

---

## LECTURA

### `criterio`
| campo | tipo |
|---|---|
| id | uuid |
| codigo_id | uuid FK → codigo |
| codigo_criterio | text |
| descripcion | text |
| fuente_0 | text |
| fuente_1 | text |
| fuente_2 | text |

### `codigo`
| campo | tipo |
|---|---|
| id | uuid |
| macroproceso_id | uuid FK → macroproceso |
| codigo | text |
| descripcion | text |
| orden | int |

### `macroproceso`
| campo | tipo |
|---|---|
| id | uuid |
| codigo | text |
| nombre | text |
| orden | int |

### `area`
| campo | tipo |
|---|---|
| id | uuid |
| nombre | text |

### `responsable`
| campo | tipo |
|---|---|
| id | uuid |
| area_id | uuid FK → area |
| cargo | text |

### `personal`
| campo | tipo |
|---|---|
| id | uuid |
| responsable_id | uuid FK → responsable |
| sede_id | uuid FK → sede |
| nombre | text |
| apellido | text |
| correo | text |
| activo | boolean |

---

## LECTURA Y ESCRITURA

### `entregable`
> Antes llamada `interpretacion`. Un criterio puede tener múltiples entregables. No está asociada a sede ni año.

| campo | tipo | notas |
|---|---|---|
| id | uuid | generado |
| criterio_id | uuid FK → criterio | |
| descripcion | text | qué entregable específico pide la norma |
| tipo_entregable | varchar | `documento` / `proceso` / `observacion` / `ambos` |
| nota | text | observaciones adicionales, opcional |
| orden | int | orden de visualización |

**GET** — entregables de un criterio
```
/entregable?select=id,criterio_id,descripcion,tipo_entregable,nota,orden&criterio_id=eq.<uuid>&order=orden.asc
```
**POST** — agregar entregable
```json
{ "criterio_id": "uuid", "descripcion": "Plan estratégico institucional", "tipo_entregable": "documento", "nota": "...", "orden": 1 }
```
**PATCH** — editar entregable
```
/entregable?id=eq.<uuid>
body: { "descripcion": "...", "tipo_entregable": "...", "nota": "..." }
```
**DELETE** — quitar entregable
```
/entregable?id=eq.<uuid>
```

---

### `criterio_responsable`
| campo | tipo | notas |
|---|---|---|
| id | uuid | generado |
| criterio_id | uuid FK → criterio | |
| responsable_id | uuid FK → responsable | |

**GET** — responsables de un criterio
```
/criterio_responsable?select=id,criterio_id,responsable(id,cargo,area(nombre))&criterio_id=eq.<uuid>
```
**POST** — asignar responsable
```json
{ "criterio_id": "uuid", "responsable_id": "uuid" }
```
**DELETE** — quitar responsable
```
/criterio_responsable?id=eq.<uuid>
```

---

## QUERY COMPLETA — criterio con entregables y responsables

```
GET /criterio?select=
  id,
  codigo_criterio,
  descripcion,
  fuente_0,
  fuente_1,
  fuente_2,
  entregable(id,descripcion,tipo_entregable,nota,orden),
  criterio_responsable(
    responsable(
      id,
      cargo,
      area(nombre)
    )
  )
&codigo_criterio=eq.DIR1-1
```