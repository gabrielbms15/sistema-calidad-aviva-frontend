# API Contract — Módulo: Guía Técnica de Acreditación
**Sistema de Gestión DMC · v1.0**

> Este documento describe qué datos debe pedir el frontend al backend (Supabase) para renderizar el módulo de visualización de la guía técnica. Supabase expone una API REST automática por cada tabla — no necesitas escribir endpoints manualmente.

---

## Base URL

```
https://<tu-project-ref>.supabase.co/rest/v1
```

Headers obligatorios en cada request:
```
apikey: <tu-anon-key>
Authorization: Bearer <tu-anon-key>
```

---

## 1. Listar todos los macroprocesos

**Cuándo se usa:** al cargar el sidebar o el menú de navegación de la guía técnica.

```
GET /macroproceso?select=id,codigo,nombre,orden&order=orden.asc
```

**Respuesta esperada:**
```json
[
  { "id": "uuid", "codigo": "DIR", "nombre": "Direccionamiento", "orden": 1 },
  { "id": "uuid", "codigo": "ATH", "nombre": "Atención y Hospitalización", "orden": 2 }
]
```

---

## 2. Listar códigos de un macroproceso

**Cuándo se usa:** cuando el usuario selecciona un macroproceso en la navegación.

```
GET /codigo?select=id,codigo,descripcion,orden&macroproceso_id=eq.<uuid>&order=orden.asc
```

**Respuesta esperada:**
```json
[
  { "id": "uuid", "codigo": "DIR.1", "descripcion": "Planificación estratégica institucional", "orden": 1 },
  { "id": "uuid", "codigo": "DIR.2", "descripcion": "Organización institucional", "orden": 2 }
]
```

---

## 3. Listar criterios de un código

**Cuándo se usa:** cuando el usuario expande un código para ver sus criterios.

```
GET /criterio?select=id,codigo_criterio,descripcion,fuente_0,fuente_1,fuente_2&codigo_id=eq.<uuid>
```

**Respuesta esperada:**
```json
[
  {
    "id": "uuid",
    "codigo_criterio": "DIR1-1",
    "descripcion": "Plan Estratégico elaborado y difundido participativamente",
    "fuente_0": "Documento oficial del PEI elaborado solo por el Equipo de Gestión",
    "fuente_1": "Actas de reunión de formulación del PEI participativamente",
    "fuente_2": "Actas de reuniones y/o talleres de difusión del PEI"
  }
]
```

---

## 4. Vista completa anidada (un solo request)

**Cuándo se usa:** para renderizar toda la guía técnica de una vez, o exportar.
Supabase permite hacer JOINs automáticos usando la sintaxis de relaciones.

```
GET /macroproceso?select=id,codigo,nombre,orden,codigo(id,codigo,descripcion,orden,criterio(id,codigo_criterio,descripcion,fuente_0,fuente_1,fuente_2))&order=orden.asc
```

**Respuesta esperada:**
```json
[
  {
    "id": "uuid",
    "codigo": "DIR",
    "nombre": "Direccionamiento",
    "orden": 1,
    "codigo": [
      {
        "id": "uuid",
        "codigo": "DIR.1",
        "descripcion": "Planificación estratégica institucional",
        "orden": 1,
        "criterio": [
          {
            "id": "uuid",
            "codigo_criterio": "DIR1-1",
            "descripcion": "...",
            "fuente_0": "...",
            "fuente_1": "...",
            "fuente_2": "..."
          }
        ]
      }
    ]
  }
]
```

> ⚠️ Este request puede ser pesado si la guía tiene muchos criterios. Recomendado solo para exportación o carga inicial con caché. Para navegación, usar los requests 1, 2 y 3 encadenados.

---

## 5. Buscar criterio por código (búsqueda directa)

**Cuándo se usa:** cuando el usuario escribe "DIR1-1" en un buscador dentro de la guía.

```
GET /criterio?select=id,codigo_criterio,descripcion,fuente_0,fuente_1,fuente_2&codigo_criterio=ilike.*DIR1*
```

El operador `ilike` es case-insensitive. Cambia `DIR1` por el texto que escriba el usuario.

---

## 6. Obtener un criterio específico con su contexto completo

**Cuándo se usa:** al abrir el detalle de un criterio (modal o página de detalle).

```
GET /criterio?select=id,codigo_criterio,descripcion,fuente_0,fuente_1,fuente_2,codigo(codigo,descripcion,macroproceso(codigo,nombre))&id=eq.<uuid>
```

**Respuesta esperada:**
```json
[
  {
    "id": "uuid",
    "codigo_criterio": "DIR1-1",
    "descripcion": "...",
    "fuente_0": "...",
    "fuente_1": "...",
    "fuente_2": "...",
    "codigo": {
      "codigo": "DIR.1",
      "descripcion": "Planificación estratégica institucional",
      "macroproceso": {
        "codigo": "DIR",
        "nombre": "Direccionamiento"
      }
    }
  }
]
```

---

## Estructura de navegación sugerida para la UI

```
Sidebar
└── Macroproceso 1 — Direccionamiento (DIR)         ← request 1
    ├── DIR.1 — Planificación estratégica            ← request 2
    │   ├── DIR1-1 — [descripcion]                  ← request 3
    │   │     fuente_0: ...
    │   │     fuente_1: ...
    │   │     fuente_2: ...  ← siempre resaltada (es el objetivo)
    │   └── DIR1-2 — [descripcion]
    └── DIR.2 — Organización institucional
        └── DIR2-1 — ...
```

---

## Notas para el desarrollador frontend

| Concepto | Detalle |
|---|---|
| Datos inmutables | No hay PUT ni POST en estas tablas desde el frontend. Solo GET. |
| fuente_2 | Es el objetivo siempre (puntaje máximo). Resaltarla visualmente en la UI. |
| Paginación | Supabase pagina en 1000 filas por defecto. Agrega `&limit=500&offset=0` si necesitas controlar esto. |
| Caché | Estos datos no cambian. Puedes cachearlos en el cliente (localStorage o estado global) al inicio de sesión. |
| Relaciones | Supabase infiere los JOINs por FK automáticamente. La sintaxis `tabla_relacionada(campos)` dentro de `select=` es suficiente. |
