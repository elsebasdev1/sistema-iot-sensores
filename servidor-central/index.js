const aedes = require('aedes')();
const server = require('net').createServer(aedes.handle);
const httpServer = require('http').createServer();
const WebSocket = require('ws');
const mqtt = require('mqtt');
const wsStream = require('websocket-stream'); 
const { InfluxDB, Point } = require('@influxdata/influxdb-client');

// --- CONFIGURACIÓN DE BASE DE DATOS ---
const INFLUX_URL = 'http://localhost:8086';
// Asegúrate que este sea tu token actual y válido:
const INFLUX_TOKEN = 'iTHR4Ju65_cX_Ig_orfK4XR-6AkbMgZPFZy-_Eds57Ffhapslyhl_zhPmUwK-9iso8vQVojpL_Cf1AVO0h9USQ=='; 
const INFLUX_ORG = 'CuencaIoT';
const INFLUX_BUCKET = 'sensores_historico';

// Clientes InfluxDB (OPTIMIZADO: Una sola instancia de cliente)
const clienteInflux = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN });

const writeApi = clienteInflux.getWriteApi(INFLUX_ORG, INFLUX_BUCKET, 'ns');
const queryApi = clienteInflux.getQueryApi(INFLUX_ORG);

// --- PUERTOS ---
const PUERTO_MQTT_TCP = 1883;
const PUERTO_MQTT_WS  = 8888;
const PUERTO_DASHBOARD = 9000;

// --- API HTTP PARA GRÁFICAS (CORREGIDA) ---
httpServer.on('request', async (req, res) => {
    // 1. CORS (Permitir acceso desde React)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 2. MANEJO DE PREFLIGHT (Evita que se cuelgue si el navegador pregunta permisos)
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Log para depuración (Para que veas si llega la petición)
    console.log(`[HTTP] Solicitud recibida: ${req.method} ${req.url}`);

    // Preparar parámetros
    const baseURL = 'http://' + req.headers.host + '/';
    const urlObj = new URL(req.url, baseURL);
    const parqueParam = urlObj.searchParams.get('parque');
    
    // Filtro dinámico
    let filtroExtra = '';
    if (parqueParam && parqueParam !== 'TODOS') {
        filtroExtra = `|> filter(fn: (r) => r["parque_id"] == "${parqueParam}")`;
    }

    // --- RUTAS DE LA API ---

    // A. ESTADÍSTICAS (BARRAS)
    if (urlObj.pathname === '/api/estadisticas' && req.method === 'GET') {
        const fluxQuery = `
            from(bucket: "${INFLUX_BUCKET}")
            |> range(start: -1h)
            |> filter(fn: (r) => r["_measurement"] == "lectura_sensores")
            |> filter(fn: (r) => r["nivel"] == "critico" or r["nivel"] == "advertencia")
            ${filtroExtra} 
            |> group(columns: ["parque_id"])
            |> count()
        `;
        
        const resultados = [];
        try {
            await new Promise((resolve, reject) => {
                queryApi.queryRows(fluxQuery, {
                    next(row, tableMeta) {
                        const o = tableMeta.toObject(row);
                        resultados.push({
                            name: o.parque_id ? o.parque_id.replace('PARQUE-', '') : 'GENERAL',
                            alertas: o._value
                        });
                    },
                    complete() { resolve(); },
                    error(e) { reject(e); }
                });
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(resultados));
        } catch (e) {
            console.error("Error Influx:", e);
            res.writeHead(500);
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // B. TENDENCIA (ÁREA)
    if (urlObj.pathname === '/api/tendencia' && req.method === 'GET') {
        const fluxQuery = `
            from(bucket: "${INFLUX_BUCKET}")
            |> range(start: -5m)
            |> filter(fn: (r) => r["_measurement"] == "lectura_sensores")
            |> filter(fn: (r) => r["_field"] == "valor")
            |> filter(fn: (r) => r["nivel"] == "critico" or r["nivel"] == "advertencia")
            ${filtroExtra}
            |> group(columns: [])
            |> aggregateWindow(every: 30s, fn: count, createEmpty: true)
        `;
        procesarConsulta(fluxQuery, res, (o) => ({
            time: new Date(o._time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
            cantidad: o._value || 0,
            raw: new Date(o._time).getTime()
        }));
        return;
    }

    // C. DISTRIBUCIÓN (DONA)
    if (urlObj.pathname === '/api/distribucion' && req.method === 'GET') {
        const fluxQuery = `
            from(bucket: "${INFLUX_BUCKET}")
            |> range(start: -1h)
            |> filter(fn: (r) => r["_measurement"] == "lectura_sensores")
            |> filter(fn: (r) => r["nivel"] == "critico" or r["nivel"] == "advertencia")
            ${filtroExtra}
            |> group(columns: ["tipo"])
            |> count()
        `;
        procesarConsulta(fluxQuery, res, (o) => ({
            name: o.tipo.toUpperCase(),
            value: o._value
        }));
        return;
    }

    // SI LLEGA AQUÍ, LA RUTA NO EXISTE (Manejo de error 404 para no colgar)
    // Esto evita que el navegador se quede cargando infinitamente si pide /favicon.ico
    if (!res.writableEnded) {
        res.writeHead(404);
        res.end();
    }
});

// Helper genérico
async function procesarConsulta(query, res, formatter) {
    const resultados = [];
    try {
        await new Promise((resolve, reject) => {
            queryApi.queryRows(query, {
                next(row, tableMeta) {
                    const o = tableMeta.toObject(row);
                    resultados.push(formatter(o));
                },
                complete() { resolve(); },
                error(e) { reject(e); }
            });
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(resultados));
    } catch (e) {
        console.error("Error consulta:", e);
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
    }
}

// --- SERVIDORES ---
server.listen(PUERTO_MQTT_TCP, '0.0.0.0', () => console.log(`[MQTT TCP] :1883 (Sensores)`));
wsStream.createServer({ server: httpServer }, aedes.handle);
httpServer.listen(PUERTO_MQTT_WS, '0.0.0.0', () => console.log(`[MQTT WS]  :8888 (Web + API)`));
const wssDashboard = new WebSocket.Server({ port: PUERTO_DASHBOARD, host: '0.0.0.0' });
console.log(`[ALERTS WS] :9000 (Dashboard)`);

// --- LÓGICA DE NEGOCIO ---
const clienteInterno = mqtt.connect(`mqtt://localhost:${PUERTO_MQTT_TCP}`);
clienteInterno.on('connect', () => {
    clienteInterno.subscribe('sensores/#');
    console.log('[SISTEMA] Procesador activo 🟢');
});

clienteInterno.on('message', (topic, message) => {
    try {
        const raw = JSON.parse(message.toString());
        let parque = raw.parque_id;
        
        // Normalización robusta
        if (!parque) {
            const parts = topic.split('/');
            if (parts[1] && parts[1].toUpperCase().includes('PARQUE')) parque = parts[1].toUpperCase();
            else parque = 'PARQUE-CENTRAL';
        }

        const evento = { ...raw, parque_id: parque };
        const alerta = procesarReglas(evento);

        // Guardar y Notificar
        guardarEnInflux(alerta);
        
        const json = JSON.stringify(alerta);
        wssDashboard.clients.forEach(c => { if(c.readyState === WebSocket.OPEN) c.send(json); });

        if(alerta.nivel === 'critico') console.log(`🔴 ALERTA [${parque}]: ${alerta.mensaje_procesado}`);

    } catch (e) { console.error("Error msg:", e.message); }
});

function guardarEnInflux(data) {
    try {
        const p = new Point('lectura_sensores')
            .tag('parque_id', data.parque_id)
            .tag('sensor_id', data.sensor_id)
            .tag('tipo', data.tipo)
            .tag('nivel', data.nivel)
            .floatField('valor', data.valor)
            .stringField('mensaje', data.mensaje_procesado);
        writeApi.writePoint(p);
    } catch (e) { console.error('Error Influx Write:', e); }
}

function procesarReglas(e) {
    let n = 'normal', m = `Lectura: ${e.valor}`;
    if(e.tipo === 'temperatura') {
        if (e.valor > 50) { n = 'critico'; m = `PELIGRO TÉRMICO (${e.valor}°C)`; }
        else if (e.valor > 35) { n = 'advertencia'; m = `Temp. Alta (${e.valor}°C)`; }
    } else if(e.tipo === 'humo' && e.valor > 15) { n = 'critico'; m = `INCENDIO (${e.valor}%)`; }
    else if(e.tipo === 'alarma_manual') { n = 'critico'; m = `BOTÓN PÁNICO`; }
    else if(e.tipo === 'puerta' && e.valor === 1) { n = 'advertencia'; m = `Acceso Irregular`; }
    else if(e.tipo === 'vibracion' && e.valor > 6) { n = 'advertencia'; m = `Vibración Alta`; }
    else if(e.tipo === 'movimiento' && e.valor === 1) { n = 'advertencia'; m = `Movimiento`; }
    
    return { ...e, nivel: n, mensaje_procesado: m, timestamp_procesado: new Date().toISOString() };
}