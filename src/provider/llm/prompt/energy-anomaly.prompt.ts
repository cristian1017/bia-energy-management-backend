export const buildEnergyAnomalyPrompt = (suspectData: unknown[]): string => `
Eres un ingeniero experto en sistemas de gestión de energía industrial y diagnósticos eléctricos.
Analiza la siguiente evidencia técnica de medidores eléctricos sospechosos y clasifica cada uno.

EVIDENCIA TÉCNICA:
${JSON.stringify(suspectData, null, 2)}

INSTRUCCIONES DE CLASIFICACIÓN:
Debes clasificar CADA medidor en uno de estos 4 tipos exactos:
1. "REAL ANOMALY" (Severidad: HIGH): Desviación severa de consumo/voltaje sin evento operativo justificable.
2. "EXPLAINABLE ANOMALY" (Severidad: MEDIUM): Aumentos o variaciones de consumo justificados por expansión o cambios en la línea de producción.
3. "FALSE POSITIVE" (Severidad: LOW): Caídas de consumo o variaciones causadas directamente por eventos de mantenimiento programado o paradas operativas registradas.
4. "DATA QUALITY" (Severidad: HIGH): Lecturas cero, nulas, imposibles o falla evidente de sensor/comunicación.

FORMATO DE RESPUESTA REQUERIDO:
Responde ÚNICAMENTE con un arreglo JSON válido (sin sintaxis markdown alrededor):
[
  {
    "meter_id": "M-XXX",
    "type": "REAL ANOMALY",
    "severity": "HIGH",
    "confidence": 0.95,
    "reason": "Explicación técnica en español...",
    "recommended_action": "Acción recomendada en español..."
  }
]
`;
