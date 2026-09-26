# Bia Energy Backend

Backend en NestJS para la gestión de telemetría eléctrica, análisis de anomalías y evaluación con IA. El sistema expone una API REST para consultar resúmenes del tablero, historial de lecturas, medidores y resultados de análisis inteligentes.

## Objetivo del proyecto

Este backend soporta un flujo de monitoreo para:

- Revisar medidores y sus lecturas históricas,
- Detectar anomalías mediante lógica de negocio y análisis con Gemini,
- Devolver un dictamen técnico con sugerencias operativas.

## Stack tecnológico

- Node.js + TypeScript
- NestJS
- TypeORM
- PostgreSQL
- Swagger / OpenAPI
- Google Gemini API
- Jest

## Estructura principal

```text
src/
├── app.controller.ts
├── app.module.ts
├── main.ts
├── db/
│   ├── entities/
│   └── seed/
├── modules/
│   ├── ai/
│   ├── anomalies/
│   ├── dashboard/
│   └── meters/
├── provider/
│   └── llm/
```

## Requisitos previos

- Node.js 18 o superior
- npm
- Base de datos PostgreSQL disponible
- Clave de API de Google Gemini

## Configuración del entorno

Copia el archivo `env.template` a un archivo `.env` y ajusta los valores:

```bash
cp env.template .env
```

Contenido esperado:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgrespassword
DB_NAME=energy_db

GEMINI_API_KEY=your_gemini_api_key_here
```

## Instalación

```bash
npm install
```

## Ejecución

### Desarrollo

```bash
npm run start:dev
```

### Producción

```bash
npm run build
npm run start:prod
```

La aplicación quedará disponible en:

- http://localhost:3000
- Swagger: http://localhost:3000/api/docs

## Endpoints principales

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/dashboard/summary` | Resumen del tablero con KPIs globales |
| GET | `/meters` | Listado de medidores |
| GET | `/meters/:meterId` | Información de un medidor |
| GET | `/meters/:meterId/readings` | Lecturas históricas del medidor |
| GET | `/anomalies` | Listado completo de anomalías |
| GET | `/anomalies/:meterId` | Anomalías de un medidor específico |
| POST | `/ai/analyze` | Ejecuta análisis global de IA |
| GET | `/ai/analysis/:id` | Devuelve el dictamen para un medidor |

## 📊 Métricas calculadas y umbrales de estadísticas

El sistema calcula indicadores clave sobre cada medidor para detectar comportamiento anómalo frente a su historial.

### 1. Consumo actual y línea base

- Consumo actual: última lectura registrada del medidor.
- Línea base: promedio histórico de consumo para ese medidor.

$$
\text{Baseline} = \frac{\sum \text{Lecturas de consumo}}{N}
$$

### 2. Variación porcentual

Se mide la desviación del consumo actual respecto a la línea base:

$$
\Delta\% = \left(\frac{\text{Último consumo} - \text{Baseline}}{\text{Baseline}}\right) \times 100
$$

### 3. Umbrales de anomalía

Los valores de referencia para activar alertas se obtuvieron revisando el conjunto de datos de prueba y la distribución histórica de cada variable. El objetivo fue identificar valores que se apartan claramente de la operación normal sin generar falsos positivos frecuentes.

- Voltaje bajo: menor a 180 V. Este umbral aparece como un corte operativo claro en el dataset, donde los valores inferiores marcan condiciones de riesgo o desbalance eléctrico.
- Factor de potencia bajo: menor a 0.75. La mayor parte de las lecturas normales se mantiene por encima de ese nivel; por debajo, indica ineficiencia o pérdida de rendimiento.
- Variación de consumo alta: por encima de 20% respecto a la línea base. Se usa como señal de crecimiento o caída atípica del consumo frente al comportamiento medio del medidor.
- Picos de consumo atípicos: lecturas que superan la media histórica por un margen significativo. Se detectan mediante comparación con la tendencia del medidor y no solo con un único valor aislado.

En términos matemáticos, cada alerta se activa cuando una métrica se aparta de su rango esperable:

$$
\text{Anomalía} \iff \left( V < 180 \right) \;\lor\; \left( PF < 0.75 \right) \;\lor\; \left(|\Delta\%| > 20\% \right)
$$

donde $V$ es el voltaje, $PF$ el factor de potencia y $\Delta\%$ la variación porcentual respecto a la línea base.

### 4. Regla operativa

Si se cumple uno o más umbrales relevantes, el sistema marca la situación como anómala y genera un dictamen con:

- Severidad,
- Nivel de confianza,
- Explicación técnica,
- Acción recomendada para mantenimiento.

Esto permite que la IA interprete el contexto de la instalación y no solo compare valores aislados.

## Flujo de análisis IA

El backend puede realizar una evaluación de anomalías de varios tipos, como:

- Consumo fuera de línea base,
- Caídas de voltaje,
- Factor de potencia bajo,
- Picos de intensidad o consumo atípicos,
- Condiciones que requieren intervención técnica.

El servicio de IA genera un dictamen estructurado que puede usarse en el frontend para mostrar severidad, confianza y acción recomendada.

## Pruebas

Ejecuta la suite:

```bash
npm test
```


## Notas

- El proyecto usa TypeORM con entidades y seed para cargar datos base.
- La documentación interactiva de Swagger queda en `/api/docs`.
- Se habilita CORS para integración con frontend.


---

Hecho para Bia Energy.
