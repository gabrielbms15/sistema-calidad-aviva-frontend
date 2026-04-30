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

```

---


