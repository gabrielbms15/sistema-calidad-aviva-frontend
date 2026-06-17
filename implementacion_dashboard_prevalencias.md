# Implementación Dashboard de Métricas — Evaluación de Prevalencias

## Resumen

4 gráficas, 4 RPCs ya creadas en Supabase. Todas requieren sesión activa (RLS) y reciben `proceso_id` — y algunas también `set_id` — como parámetros.

Las 4 gráficas viven en **una sola página**, sin scroll, visibles todas a la vez.

---

## Layout sugerido

```
┌─────────────────────────────────────────────┐
│  Selector de Set (compartido por gráficas    │
│  1, 3 y 4 — cambia las tres a la vez)        │
├──────────────────────┬───────────────────────┤
│  Gráfica 1            │  Gráfica 3            │
│  Cumplimiento x UPSS  │  Cumplimiento x Grupo │
│  (mitad izquierda)    │  (mitad derecha)      │
├──────────────────────┴───────────────────────┤
│  Gráfica 2 — Cumplimiento global x Set        │
│  (ancho completo, sin selector, fija)         │
├────────────────────────────────────────────────┤
│  Listado 4 — Top 5 preguntas con mayor falla   │
│  (ancho completo, botón "ver todas" para el    │
│  detalle completo si el set tiene más de 5)    │
└─────────────────────────────────────────────┘
```

**Un solo selector de set** controla las gráficas 1, 3 y 4 simultáneamente — evita que el usuario sincronice selectores repetidos. La gráfica 2 es fija, no depende del selector, así que se carga una sola vez al montar la página.

---

## 1. Gráfica: Cumplimiento por UPSS (con selector de set)

**RPC:** `get_cumplimiento_por_upss`

**Cuándo se llama:** al montar la pantalla con el primer set por defecto, y cada vez que el usuario cambia el selector de set.

```javascript
const { data, error } = await supabase.rpc('get_cumplimiento_por_upss', {
  p_set_id: setSeleccionado.id,
  p_proceso_id: procesoActivo.id
})

// data = [{ upss: 'Emergencia', total_si: 18, total_no: 2, porcentaje_cumplimiento: 90.0 }, ...]
```

**Eje X:** `upss` — **Eje Y:** `porcentaje_cumplimiento` (0–100).

El selector de set debe listar los 6 sets desde `set_preguntas` (`where activo = true order by orden`). Al cambiar de set, vuelve a llamar la RPC con el nuevo `p_set_id`.

---

## 2. Gráfica: Cumplimiento global por set (una sola gráfica, sin selector)

**RPC:** `get_cumplimiento_global_por_set`

**Cuándo se llama:** una sola vez al montar la pantalla. No tiene selector — siempre muestra los 6 sets juntos.

```javascript
const { data, error } = await supabase.rpc('get_cumplimiento_global_por_set', {
  p_proceso_id: procesoActivo.id
})

// data = [{ set_nombre: 'Lavado de manos', set_orden: 1, porcentaje_cumplimiento: 85.3 }, ...]
```

**Eje X:** `set_nombre` (ordenado por `set_orden`) — **Eje Y:** `porcentaje_cumplimiento` (0–100).

---

## 3. Gráfica: Cumplimiento por grupo profesional (con selector de set)

**RPC:** `get_cumplimiento_por_grupo_profesional`

**Cuándo se llama:** igual que la gráfica 1 — al montar con el set por defecto, y al cambiar el selector. Puede compartir el mismo selector de set de la gráfica 1 si están en la misma pantalla, o tener uno propio si están separadas.

```javascript
const { data, error } = await supabase.rpc('get_cumplimiento_por_grupo_profesional', {
  p_set_id: setSeleccionado.id,
  p_proceso_id: procesoActivo.id
})

// data = [{ grupo_profesional: 'Enfermería', porcentaje_cumplimiento: 78.5 }, ...]
```

**Eje X:** `grupo_profesional` — **Eje Y:** `porcentaje_cumplimiento` (0–100).

---

## 4. Listado: Preguntas con mayor tasa de fallo (con selector de set)

**RPC:** `get_fallas_por_pregunta`

**Cuándo se llama:** al montar con el set por defecto, y al cambiar el selector.

```javascript
const { data, error } = await supabase.rpc('get_fallas_por_pregunta', {
  p_set_id: setSeleccionado.id,
  p_proceso_id: procesoActivo.id
})

// data ya viene ordenado de mayor a menor falla (porcentaje_no DESC)
// data = [{ pregunta_id, texto, orden, total_si, total_no, porcentaje_no: 45.0 }, ...]
```

**Mostrar:** solo `porcentaje_no` por pregunta (no SI y NO juntos — saturan la lectura). El texto completo de la pregunta (`texto`) va como label de cada barra o fila. Si quieren ver el detalle SI/NO/NA completo, eso puede ir en un tooltip o modal al tocar la pregunta, no en la vista principal.

---

## Notas generales para las 4 implementaciones

**`procesoActivo`** — todas las RPC necesitan el `proceso_id` activo de la sede. Reutiliza la misma lógica que ya tienen en `ReportesScreen` (buscar `proceso_prevalencia` con `estado = 'activo'` de la sede actual).

**Estados de carga y vacío** — todas las RPCs pueden devolver `data = []` si no hay evaluaciones `completado` aún para ese set/proceso. Mostrar el mismo estado vacío que ya implementaron en `ReportesScreen` ("Sin datos aún para este set").

**Las 4 RPCs sí se llaman en paralelo al montar la página**, ya que las 4 gráficas son visibles simultáneamente (no hay scroll ni tabs que oculten alguna). Usar `Promise.all` para dispararlas juntas:

```javascript
const [cumplimientoUpss, cumplimientoGlobal, cumplimientoGrupo, fallas] = await Promise.all([
  supabase.rpc('get_cumplimiento_por_upss', { p_set_id: setInicial.id, p_proceso_id: procesoActivo.id }),
  supabase.rpc('get_cumplimiento_global_por_set', { p_proceso_id: procesoActivo.id }),
  supabase.rpc('get_cumplimiento_por_grupo_profesional', { p_set_id: setInicial.id, p_proceso_id: procesoActivo.id }),
  supabase.rpc('get_fallas_por_pregunta', { p_set_id: setInicial.id, p_proceso_id: procesoActivo.id }),
])
```

Al cambiar el selector de set, solo se vuelven a llamar las RPCs 1, 3 y 4 (las que dependen de `set_id`) — la RPC 2 (cumplimiento global) no se recalcula porque no depende del set seleccionado.

**Tipado TypeScript sugerido:**

```typescript
interface CumplimientoPorCategoria {
  upss?: string
  grupo_profesional?: string
  total_si?: number
  total_no?: number
  porcentaje_cumplimiento: number
}

interface CumplimientoGlobalSet {
  set_nombre: string
  set_orden: number
  porcentaje_cumplimiento: number
}

interface FallaPorPregunta {
  pregunta_id: string
  texto: string
  orden: number
  total_si: number
  total_no: number
  porcentaje_no: number
}
```
