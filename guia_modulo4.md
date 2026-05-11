# Lógica de cálculo de avance por macroproceso

## Inputs

- Lista de criterios del macroproceso, cada uno con:
  - `categoria`: "estrategico" | "proceso" | "resultado"
  - `estado`: 0 (no cumplido) | 1 (parcial) | 2 (cumplido)

- Pesos base por categoría (constantes globales):
  - estrategico: 45
  - proceso: 36
  - resultado: 19

## Paso 1: Agrupar criterios por categoría

Para cada categoría presente en el macroproceso, calcular:
- `n_k` = total de criterios de esa categoría
- `score_k` = suma de (estado_i / 2) para cada criterio i de esa categoría

Una categoría está "presente" si `n_k > 0`.

## Paso 2: Calcular proporción de avance por categoría

  proporcion_k = score_k / n_k

Esto da un valor entre 0 y 1, donde:
- 0.0 = todos no cumplidos
- 0.5 = todos parciales
- 1.0 = todos cumplidos

## Paso 3: Renormalizar pesos

Sumar los pesos base solo de las categorías presentes:

  suma_pesos_presentes = sum(w_k para k en categorías presentes)

Calcular peso ajustado para cada categoría presente:

  w_k_ajustado = (w_k / suma_pesos_presentes) * 100

## Paso 4: Calcular avance del macroproceso

  avance_macroproceso = sum( w_k_ajustado * proporcion_k )
                        para k en categorías presentes

## Output

- `avance_macroproceso`: número entre 0 y 100

## Ejemplo

Macroproceso con:
- 3 estratégicos: estados [2, 1, 0] → score = 1 + 0.5 + 0 = 1.5 → proporcion = 1.5/3 = 0.50
- 5 de proceso:   estados [2, 2, 1, 0, 1] → score = 1 + 1 + 0.5 + 0 + 0.5 = 3.0 → proporcion = 3.0/5 = 0.60
- 0 de resultado  → categoría ausente, no aplica

Paso 3 → suma_pesos = 45 + 36 = 81
         w_estrategico_ajustado = (45/81)*100 = 55.56
         w_proceso_ajustado     = (36/81)*100 = 44.44

Paso 4 → avance = 55.56 * 0.50 + 44.44 * 0.60
               = 27.78 + 26.67
               = 54.4

| Variable en la lógica | Tabla de la BD | Campo |
|---|---|---|
| `categoria` | `criterio` | `tipo` (`estructura` / `proceso` / `resultado`) |
| `estado` | `autoevaluacion` | `puntaje_propuesto` (0, 1 o 2) |
| `n_k` | calculado | count de `criterio.tipo` por macroproceso |
| `score_k` | calculado | sum de (`puntaje_propuesto` / 2) por tipo |
| peso base `estructura` (45) | constante global | — |
| peso base `proceso` (36) | constante global | — |
| peso base `resultado` (19) | constante global | — |
| `avance_macroproceso` | calculado | no se persiste en BD, se calcula en runtime |