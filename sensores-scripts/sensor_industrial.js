const mqtt = require('mqtt');

// Conexión al Broker (Puerto 1883)
const client = mqtt.connect('mqtt://localhost:1883');

// Definimos 3 parques industriales con perfiles de riesgo distintos
const PARQUES = [
    { id: "PARQUE-NORTE", zona: "Industria Cerámica" }, // Más calor y polvo
    { id: "PARQUE-SUR", zona: "Metalmecánica" },       // Más vibración y ruido
    { id: "PARQUE-ESTE", zona: "Tecnológica" }         // Control de accesos crítico
];

console.log(`[SISTEMA] Iniciando simulación de 3 Parques Industriales...`);

client.on('connect', () => {
    console.log(`[MQTT] Conectado. Generando tráfico distribuido...`);
    
    // Iniciamos la simulación independiente para cada parque
    PARQUES.forEach(parque => {
        iniciarSensoresDeParque(parque.id);
    });
});

function iniciarSensoresDeParque(parqueId) {
    console.log(`   >>> Desplegando sensores en ${parqueId}`);

    // 1. TEMPERATURA (Cada 4s aprox)
    setInterval(() => {
        // Parque Norte (Cerámica) tiene hornos, base 35°C. Los otros base 20°C.
        const baseTemp = parqueId === 'PARQUE-NORTE' ? 35 : 20; 
        // A veces sube +40 grados (alerta)
        simularSensor(`${parqueId}-TEMP-01`, "temperatura", baseTemp, baseTemp + 40, parqueId);
    }, 4000 + Math.random() * 2000);

    // 2. HUMO (Cada 8s)
    setInterval(() => {
        // Parque Norte es más propenso a polvo/humo
        const probabilidadHumo = parqueId === 'PARQUE-NORTE' ? 0.85 : 0.95;
        // Si pasa el umbral, genera valor alto (20-80%), sino 0
        const valor = Math.random() > probabilidadHumo ? (Math.random() * 60 + 20).toFixed(0) : 0;
        enviarPayload(`${parqueId}-HUMO-01`, "humo", parseFloat(valor), parqueId);
    }, 8000);

    // 3. PUERTA (Accesos aleatorios, cada 5s)
    setInterval(() => {
        // Parque Este (Tecnología) tiene más tráfico de gente
        const probPuerta = parqueId === 'PARQUE-ESTE' ? 0.7 : 0.9;
        if (Math.random() > probPuerta) {
            const estado = Math.random() > 0.5 ? 1 : 0; // 1: Abierta, 0: Cerrada
            enviarPayload(`${parqueId}-ACCESO-MAIN`, "puerta", estado, parqueId);
        }
    }, 5000);

    // 4. VIBRACIÓN (Solo Sur y Norte tienen maquinaria pesada)
    if (parqueId !== 'PARQUE-ESTE') {
        setInterval(() => {
            // Sur (Metalmecánica) vibra más
            const maxVib = parqueId === 'PARQUE-SUR' ? 8.0 : 4.0;
            simularSensor(`${parqueId}-VIB-M1`, "vibracion", 0.1, maxVib, parqueId);
        }, 3000);
    }

    // 5. MOVIMIENTO (Aleatorio en todos)
    setInterval(() => {
        if (Math.random() > 0.8) {
            enviarPayload(`${parqueId}-MOV-HALL`, "movimiento", 1, parqueId);
        }
    }, 6000);
}

// --- AUXILIARES ---

function simularSensor(id, tipo, min, max, parqueId) {
    const valor = (Math.random() * (max - min) + min).toFixed(2);
    enviarPayload(id, tipo, parseFloat(valor), parqueId);
}

function enviarPayload(id, tipo, valor, parqueId) {
    const payload = {
        sensor_id: id,
        parque_id: parqueId, // Dato clave para el Dashboard
        tipo: tipo,
        valor: valor,
        timestamp: new Date().toISOString()
    };

    // Tópico jerárquico: sensores/{PARQUE}/{TIPO}
    const topic = `sensores/${parqueId.toLowerCase()}/${tipo}`;
    client.publish(topic, JSON.stringify(payload));
    
    // Log reducido para no saturar
    if (Math.random() > 0.8) {
        let icon = "📡";
        if(tipo === 'temperatura') icon = "🌡️";
        if(tipo === 'humo') icon = "🔥";
        console.log(`${icon} [${parqueId}] ${tipo.toUpperCase()}: ${valor}`);
    }
}

client.on('error', (err) => {
    console.error("Error MQTT:", err.message);
});