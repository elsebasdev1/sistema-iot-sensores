import React, { useState, useEffect, useRef } from 'react';
// Usamos la importación que confirmaste que funciona con tu config
import mqtt from 'mqtt'; 
import { 
  Activity, Thermometer, ShieldAlert, Wifi, DoorOpen, Flame, 
  AlertOctagon, Play, Pause, LayoutDashboard, Radio, Server, Settings, 
  Smartphone, Footprints, Terminal, Network, Cpu, 
  MapPin, Filter, Eye, Inspect, ChartLine, RefreshCcw, Box
} from 'lucide-react';

import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, PieChart, Pie, Cell, Legend 
} from 'recharts';

// Importación del componente 3D
import IndustrialScene from './components/IndustrialScene';

// ==========================================
// 1. HOOKS DE CONEXIÓN
// ==========================================

const useMonitorConnection = (ip) => {
  const [mensajes, setMensajes] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);
  
  const cleanIP = ip.trim();
  const host = (cleanIP === 'localhost' || cleanIP === '') ? '127.0.0.1' : cleanIP;
  const url = `ws://${host}:9000`;

  useEffect(() => {
    let shouldReconnect = true;
    const connect = () => {
      if (ws.current?.url === url && ws.current?.readyState === WebSocket.OPEN) return;
      if (ws.current) ws.current.close();

      console.log(`[MONITOR] Conectando a ${url}...`);
      try {
        const socket = new WebSocket(url);
        ws.current = socket;
        
        socket.onopen = () => {
            if (!shouldReconnect) return;
            setIsConnected(true);
        };
        
        socket.onclose = () => {
          if (shouldReconnect) {
             setIsConnected(false);
             setTimeout(connect, 3000);
          }
        };
        
        socket.onmessage = (e) => {
          try {
              const msg = JSON.parse(e.data);
              const msgWithMeta = { ...msg, receivedAt: Date.now() };
              // Buffer de 100 mensajes para tener historial
              setMensajes(prev => [msgWithMeta, ...prev].slice(0, 100));
          } catch (err) { console.error(err); }
        };
      } catch (e) { console.error("Error WS:", e); }
    };
    connect();
    return () => { shouldReconnect = false; ws.current?.close(); };
  }, [url]);

  return { mensajes, isConnected };
};

const useMQTTSimulator = (ip) => {
    const [client, setClient] = useState(null);
    const [isMqttConnected, setIsMqttConnected] = useState(false);
    const cleanIP = ip.trim();
    const host = (cleanIP === 'localhost' || cleanIP === '') ? '127.0.0.1' : cleanIP;
    const brokerUrl = `ws://${host}:8888`;

    useEffect(() => {
        let mqttClient = null;
        try {
            mqttClient = mqtt.connect(brokerUrl, {
                keepalive: 60,
                clientId: 'WebSim_' + Math.random().toString(16).substr(2, 8),
                clean: true,
                reconnectPeriod: 2000,
                connectTimeout: 10000,
            });

            mqttClient.on('connect', () => setIsMqttConnected(true));
            mqttClient.on('offline', () => setIsMqttConnected(false));
            mqttClient.on('error', (err) => console.warn("MQTT Error:", err.message));

            setClient(mqttClient);
        } catch (e) { console.error("Error Fatal MQTT:", e); }

        return () => { if(mqttClient) mqttClient.end(); };
    }, [brokerUrl]);

    // Modificado para aceptar el ID del Parque
    const publicar = (datos, parqueId) => {
        if (client && isMqttConnected) {
            const payload = { ...datos, parque_id: parqueId };
            // Tópico jerárquico: sensores/PARQUE/TIPO
            const topic = `sensores/${parqueId.toLowerCase()}/${datos.tipo}`;
            client.publish(topic, JSON.stringify(payload));
        }
    };
    return { isMqttConnected, publicar };
};

// ==========================================
// 2. COMPONENTES UI
// ==========================================

// Tarjeta de Alerta Detallada
const AlertCard = ({ data, index }) => {
    const isCritical = data.nivel === 'critico';
    const isWarning = data.nivel === 'advertencia';

    // Tema de colores mejorado para alto contraste
    const theme = {
        critico: {
            bg: 'bg-gradient-to-br from-red-950/50 to-slate-900', // Degradado sutil
            border: 'border-l-red-500 border-y-red-900/30 border-r-red-900/30',
            text: 'text-white',
            subtext: 'text-red-200',
            iconBg: 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]', // Glow rojo
            badge: 'bg-red-600/20 text-red-300 border-red-500/30'
        },
        advertencia: {
            bg: 'bg-gradient-to-br from-yellow-950/40 to-slate-900',
            border: 'border-l-yellow-500 border-y-yellow-900/30 border-r-yellow-900/30',
            text: 'text-white',
            subtext: 'text-yellow-200',
            iconBg: 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]', // Glow amarillo
            badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
        },
        normal: {
            bg: 'bg-slate-900',
            border: 'border-l-blue-500 border-y-slate-800 border-r-slate-800',
            text: 'text-slate-200',
            subtext: 'text-slate-400',
            iconBg: 'bg-slate-800 text-blue-400 border border-slate-700',
            badge: 'bg-slate-800 text-slate-400 border-slate-700'
        }
    };

    const style = theme[data.nivel] || theme.normal;
    const icons = { temperatura: Thermometer, humo: Flame, alarma_manual: ShieldAlert, puerta: DoorOpen, movimiento: Footprints, vibracion: Activity };
    const Icon = icons[data.tipo] || Activity;

    return (
      <div className={`relative group flex flex-col justify-between p-6 rounded-xl border-l-[6px] border-y border-r shadow-xl ${style.bg} ${style.border} transition-all hover:scale-[1.01] hover:shadow-2xl h-full`}>
        
        {/* NÚMERO DE SECUENCIA (Marca de agua sutil) */}
        <span className="absolute top-2 right-4 text-[35px] font-black opacity-[0.03] select-none pointer-events-none">
            #{index + 1}
        </span>

        {/* CABECERA: Icono + Info Principal */}
        <div className="flex items-start gap-4 mb-3">
            {/* Icono Extra Grande con Glow */}
            <div className={`p-3 rounded-xl shrink-0 ${style.iconBg}`}>
                <Icon size={26} strokeWidth={2} />
            </div>
            
            <div className="flex-1 min-w-0">
                {/* Badges de Ubicación y Tipo */}
                <div className="flex flex-wrap gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-widest border ${style.badge}`}>
                        {data.parque_id?.replace('PARQUE-', '') || 'GENERAL'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 pt-1">
                        • {new Date(data.timestamp_procesado).toLocaleTimeString()}
                    </span>
                </div>
                
                {/* Mensaje Gigante */}
                <h3 className={`text-xl font-bold leading-tight tracking-tight ${style.text}`}>
                    {data.mensaje_procesado}
                </h3>
            </div>
        </div>

        {/* PIE DE TARJETA: Datos técnicos */}
        <div className={`mt-2 pt-3 border-t border-white/5 flex justify-between items-end ${style.subtext}`}>
            <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold opacity-50">ID SENSOR</span>
                <span className="font-mono text-xs tracking-wider opacity-90">{data.sensor_id}</span>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold opacity-50">VALOR RAW</span>
                <span className="font-mono text-lg font-bold">{data.valor}</span>
            </div>
        </div>
      </div>
    );
};



// Generador de Sensor (Simulador)
const SensorGenerator = ({ id, label, type, icon: Icon, unit, parque, onSend }) => {
    const [mode, setMode] = useState('manual');
    const [isActive, setIsActive] = useState(false);
    const [manualVal, setManualVal] = useState(0);
    const intervalRef = useRef(null);
  
    useEffect(() => {
      if (mode === 'auto' && isActive) {
        intervalRef.current = setInterval(() => {
          let val;
          if (type === 'temperatura') val = (Math.random() * 50 + 10).toFixed(1);
          else if (type === 'humo') val = Math.random() > 0.9 ? (Math.random() * 80 + 20).toFixed(0) : 0;
          else if (type === 'vibracion') val = (Math.random() * 10).toFixed(2);
          else val = Math.random() > 0.7 ? 1 : 0;
          emitir(val);
        }, 2500);
      } else { clearInterval(intervalRef.current); }
      return () => clearInterval(intervalRef.current);
    }, [mode, isActive, parque]); // Dependencia parque añadida
  
    const emitir = (v) => {
      onSend({ sensor_id: id, tipo: type, valor: parseFloat(v), timestamp: new Date().toISOString() }, parque);
    };
  
    return (
      <div className={`border p-4 rounded-xl transition-colors duration-300 ${isActive ? 'border-blue-500/50 bg-blue-900/10' : 'border-slate-800 bg-slate-900'}`}>
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3 text-slate-200">
                <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'}`}><Icon size={20} /></div>
                <div>
                    <h3 className="font-bold text-sm leading-none">{label}</h3>
                    <p className="text-[10px] font-mono text-slate-500 mt-1">{id}</p>
                </div>
            </div>
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-700'}`} />
        </div>
        
        {/* Mostrar en qué parque está operando este sensor */}
        <div className="mb-3">
            <span className="text-[9px] uppercase font-bold text-emerald-500 bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-900/50">
                Ubicación: {parque}
            </span>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-lg mb-4 text-[10px] font-bold">
          <button onClick={() => setMode('manual')} className={`flex-1 py-1 rounded ${mode === 'manual' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>MANUAL</button>
          <button onClick={() => setMode('auto')} className={`flex-1 py-1 rounded ${mode === 'auto' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>AUTO</button>
        </div>

        <div className="min-h-[50px]">
            {!isActive ? (
                 <button onClick={() => setIsActive(true)} className="w-full py-2 border border-slate-700 rounded text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center gap-2 text-xs font-bold"><Play size={14} /> ACTIVAR SENSOR</button>
            ) : mode === 'auto' ? (
                <div className="text-center"><p className="text-xs text-blue-400 animate-pulse mb-2">Generando datos...</p><button onClick={() => setIsActive(false)} className="w-full py-1 text-[10px] text-red-400 border border-red-900/30 rounded hover:bg-red-900/20"><Pause size={10} className="inline" /> DETENER</button></div>
            ) : (
                <div className="space-y-2 animate-in fade-in">
                    {(type === 'temperatura' || type === 'humo' || type === 'vibracion') ? (
                        <div className="flex items-center gap-2">
                            <input type="range" min="0" max="100" value={manualVal} onChange={(e) => setManualVal(e.target.value)} className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                            <button onClick={() => emitir(manualVal)} className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold">ENVIAR {manualVal}{unit}</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => emitir(1)} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 py-2 rounded text-xs font-bold">DETECTAR</button>
                            <button onClick={() => emitir(0)} className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/50 py-2 rounded text-xs font-bold">NORMAL</button>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    );
};

// --- DIAGNÓSTICO ---
const NetworkDiagnostics = ({ monitorOk, simulatorOk, mensajes, ip }) => {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const sensoresEstado = mensajes.reduce((acc, msg) => {
        if (!acc[msg.sensor_id]) {
            acc[msg.sensor_id] = { lastSeen: msg.receivedAt, type: msg.tipo, parque: msg.parque_id || 'N/A' };
        } else if(msg.receivedAt > acc[msg.sensor_id].lastSeen) {
            acc[msg.sensor_id].lastSeen = msg.receivedAt;
            acc[msg.sensor_id].parque = msg.parque_id || 'N/A';
        }
        return acc;
    }, {});

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Network size={16} /> Topología de Red</h3>
                    <div className="flex items-center justify-between px-4 relative">
                        <div className={`absolute top-1/2 left-10 right-10 h-0.5 -z-0 ${simulatorOk && monitorOk ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500' : 'bg-slate-800'}`}></div>
                        <div className="flex flex-col items-center gap-2 z-10 bg-slate-900 p-2">
                            <div className={`p-3 rounded-full border-2 ${simulatorOk ? 'border-blue-500 bg-blue-500/20 text-blue-400' : 'border-red-500 bg-red-500/20 text-red-400'}`}><Smartphone size={24} /></div>
                            <span className="text-[10px] font-mono text-slate-400">CLIENTE</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 z-10 bg-slate-900 p-2">
                            <div className={`p-4 rounded-full border-2 ${(simulatorOk || monitorOk) ? 'border-purple-500 bg-purple-500/20 text-purple-400 animate-pulse' : 'border-slate-700 text-slate-600'}`}><Server size={32} /></div>
                            <span className="text-[10px] font-mono text-slate-400">BROKER ({ip})</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 z-10 bg-slate-900 p-2">
                            <div className={`p-3 rounded-full border-2 ${monitorOk ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-red-500 bg-red-500/20 text-red-400'}`}><Activity size={24} /></div>
                            <span className="text-[10px] font-mono text-slate-400">MONITOR</span>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Cpu size={16} /> Estado de Nodos (LWT)</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                        {Object.keys(sensoresEstado).map(sensorId => {
                            const info = sensoresEstado[sensorId];
                            const secondsSinceLast = Math.floor((now - info.lastSeen) / 1000);
                            const isDead = secondsSinceLast > 15; 
                            return (
                                <div key={sensorId} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${isDead ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
                                        <div><p className="text-xs font-bold text-slate-300">{sensorId}</p><p className="text-[9px] text-slate-500">{info.parque} • {info.type}</p></div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-xs font-mono ${isDead ? 'text-red-400' : 'text-emerald-400'}`}>{isDead ? 'OFFLINE' : 'ONLINE'}</p>
                                        <p className="text-[9px] text-slate-600">{secondsSinceLast}s</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="bg-black/40 border border-slate-800 p-5 rounded-xl flex flex-col h-full min-h-[500px]">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Terminal size={16} /> Logs (Raw JSON)</h3>
                <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                    {mensajes.map((m, i) => (
                        <div key={i} className="p-2 rounded border-b border-slate-800/50 hover:bg-slate-900">
                            <div className="flex gap-2 text-slate-500 mb-1">
                                <span className="text-blue-400">[{new Date(m.timestamp_procesado || Date.now()).toLocaleTimeString()}]</span>
                                <span className="text-yellow-600">{m.parque_id}</span>
                                <span>&gt; {m.tipo}</span>
                            </div>
                            <div className="text-emerald-300/80 break-all">{JSON.stringify(m)}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 3. APP PRINCIPAL (Lógica de Estados)
// ==========================================
export default function App() {
    const [connectionIP, setConnectionIP] = useState(window.location.hostname);
    const [tempIP, setTempIP] = useState(window.location.hostname);
    const { mensajes, isConnected: monitorOk } = useMonitorConnection(connectionIP);
    const { publicar, isMqttConnected: simulatorOk } = useMQTTSimulator(connectionIP);
    
    const [view, setView] = useState('monitor');
    const [showConfig, setShowConfig] = useState(false);
    
    // --- ESTADOS PARA GRÁFICAS -- HOOKS PARA GRAFICAS  ---
    const [statsData, setStatsData] = useState([]);       
    const [trendData, setTrendData] = useState([]);       
    const [typeData, setTypeData] = useState([]);         

    // MODIFICADO: Ahora acepta el filtro
    const cargarEstadisticas = async () => {
        try {
            const base = `http://${connectionIP}:8888/api`;
            // Agregamos el query param si no es TODOS
            const queryParam = filtroParque !== 'TODOS' ? `?parque=${filtroParque}` : '';
            
            // 1. Ranking Parques
            const res1 = await fetch(`${base}/estadisticas${queryParam}`);
            setStatsData(await res1.json());

            // 2. Tendencia Temporal (CON DEDUPLICACIÓN)
            const res2 = await fetch(`${base}/tendencia${queryParam}`);
            const dataTrend = await res2.json();
            
            // A. Ordenar por fecha numérica (para que la línea vaya hacia adelante)
            const dataOrdenada = dataTrend.sort((a, b) => a.raw - b.raw);

            // B. DEDUPLICAR (¡ESTO ARREGLA EL BUG!)
            // Usamos un Map para asegurar que cada etiqueta de hora (ej: "09:00 PM") sea única.
            // Si ya existe, el Map la sobrescribe con la nueva (nos quedamos con el dato más fresco).
            const uniqueMap = new Map();
            dataOrdenada.forEach(item => {
                uniqueMap.set(item.time, item);
            });
            
            // Convertimos el mapa de vuelta a array
            const dataFinal = Array.from(uniqueMap.values());
            
            setTrendData(dataFinal);

            // 3. Distribución por Tipo
            const res3 = await fetch(`${base}/distribucion${queryParam}`);
            setTypeData(await res3.json());
            
        } catch (e) { console.error("Error cargando dashboard", e); }
    };

    const totalAlertasTipo = typeData.reduce((acc, item) => acc + item.value, 0);
    // Si filtramos por un parque, el "Ranking" solo tendrá una barra, pero el total es correcto
    const totalAlertasParque = statsData.reduce((acc, item) => acc + item.alertas, 0);    

    // ESTADOS DE FILTRO Y SIMULACIÓN
    const [filtroParque, setFiltroParque] = useState('TODOS');
    const [soloCriticos, setSoloCriticos] = useState(false);
    const [simuladorParque, setSimuladorParque] = useState('PARQUE-NORTE');

    const handleApplyIP = () => { if(tempIP.trim()) { setConnectionIP(tempIP); setShowConfig(false); }};

    // Lógica de filtrado de mensajes
    const mensajesVisibles = mensajes.filter(m => {
        if (filtroParque !== 'TODOS' && m.parque_id !== filtroParque) return false;
        if (soloCriticos && m.nivel === 'normal') return false;
        return true;
    });

    useEffect(() => {
        if (view === 'historico') {
            cargarEstadisticas();
            const interval = setInterval(cargarEstadisticas, 5000); 
            return () => clearInterval(interval);
        }
        // IMPORTANTE: Añadir filtroParque aquí abajo para que recargue al cambiar
    }, [view, connectionIP, filtroParque]);

    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col">
        {/* NAVBAR */}
        <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShieldAlert className="text-blue-500" />
              <h1 className="font-bold text-lg hidden md:block">Control Cuenca</h1>
            </div>
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto">
              <button onClick={() => setView('monitor')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${view === 'monitor' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><LayoutDashboard size={16} /> <span className="hidden sm:inline">MONITOR</span></button>
              <button onClick={() => setView('simulador')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${view === 'simulador' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><Radio size={16} /> <span className="hidden sm:inline">SIMULADOR</span></button>
              <button onClick={() => setView('diagnostico')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${view === 'diagnostico' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><Inspect size={16} /> <span className="hidden sm:inline">DIAGNÓSTICO</span></button>
                <button onClick={() => setView('historico')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${view === 'historico' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                    <ChartLine size={16} /> <span className="hidden sm:inline">HISTÓRICO</span>
                </button>
            <button onClick={() => setView('3d')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${view === '3d' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                <Box size={16} /> <span className="hidden sm:inline">VISTA 3D</span>
            </button>
            </div>
            <button onClick={() => setShowConfig(!showConfig)} className={`p-2 rounded-full border transition-colors ${monitorOk ? 'border-slate-700 text-slate-400' : 'border-red-500 text-red-400 animate-pulse'}`}><Settings size={20}/></button>
          </div>
          {showConfig && (
            <div className="bg-slate-900 border-b border-slate-800 p-4 animate-in slide-in-from-top-2">
                <div className="max-w-6xl mx-auto flex gap-2"><input type="text" value={tempIP} onChange={(e) => setTempIP(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm" /><button onClick={handleApplyIP} className="bg-blue-600 text-white px-4 rounded font-bold text-xs">APLICAR</button></div>
            </div>
          )}
        </header>
  
        <main className="flex-1 max-w-7xl mx-auto w-full p-4">
          
          {/* 1. VISTA MONITOR */}
          {view === 'monitor' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                
                {/* BARRA DE HERRAMIENTAS Y FILTROS (Necesaria para que funcione la lógica) */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className="text-lg font-bold text-slate-200"></h2>
                    
                    <div className="flex items-center gap-3">
                        {/* Selector de Parque */}
                        <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
                            <MapPin size={14} className="text-blue-500" />
                            <select 
                                value={filtroParque} 
                                onChange={(e) => setFiltroParque(e.target.value)} 
                                className="bg-transparent text-xs font-bold text-slate-300 outline-none cursor-pointer uppercase"
                            >
                                <option value="TODOS" className="bg-slate-950">Todos los parques</option>
                                <option value="PARQUE-NORTE" className="bg-slate-950">Parque Norte</option>
                                <option value="PARQUE-SUR" className="bg-slate-950">Parque Sur</option>
                                <option value="PARQUE-ESTE" className="bg-slate-950">Parque Este</option>
                            </select>
                        </div>

                        {/* Botón Toggle */}
                        <button 
                            onClick={() => setSoloCriticos(!soloCriticos)} 
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                                soloCriticos 
                                ? 'bg-slate-800 border-slate-600 text-white' 
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                        >
                            {soloCriticos ? <Filter size={14} /> : <Eye size={14} />}
                            {soloCriticos ? 'SOLO ALERTAS' : 'VER TODO'}
                        </button>
                    </div>
                </div>

                {/* TARJETAS DE ESTADÍSTICAS (Tu diseño solicitado) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Eventos Recibidos</div>
                        <div className="text-3xl font-bold text-white mt-1">{mensajes.length}</div>
                    </div>

                    <div className="bg-red-900/10 p-4 rounded-xl border border-red-900/30 shadow-lg">
                        <div className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Alertas Críticas</div>
                        <div className="text-3xl font-bold text-red-500 mt-1">{mensajes.filter(m=>m.nivel==='critico').length}</div>
                    </div>

                    <div className="bg-yellow-900/10 p-4 rounded-xl border border-yellow-900/30 shadow-lg">
                        <div className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider">Advertencias</div>
                        <div className="text-3xl font-bold text-yellow-500 mt-1">{mensajes.filter(m=>m.nivel==='advertencia').length}</div>
                    </div>

                    <div className="bg-emerald-900/10 p-4 rounded-xl border border-emerald-900/30 shadow-lg">
                        <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Sensores Activos</div>
                        <div className="text-3xl font-bold text-emerald-500 mt-1">{[...new Set(mensajes.map(m => m.sensor_id))].length}</div>
                    </div>
                </div>

                {/* FEED EN TIEMPO REAL (Con funcionalidad recuperada) */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 min-h-[500px] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                         <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Activity size={16} className="text-blue-500" /> Feed en Tiempo Real
                        </h2>
                        <span className="text-[10px] text-slate-600 font-mono">Mostrando {mensajesVisibles.length} eventos</span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 px-1 pb-2">
                        {mensajesVisibles.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 pb-20">
                                <Wifi size={64} className="mb-6 opacity-10 animate-pulse" />
                                <p className="font-bold text-lg opacity-50">Esperando eventos...</p>
                                <p className="text-xs opacity-30">El sistema está escuchando en tiempo real</p>
                            </div>
                        ) : (
                            // CAMBIO CLAVE: lg:grid-cols-2 (Nunca 3)
                            // Gap-4 para más aire entre tarjetas
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-4">
                                {mensajesVisibles.map((m, i) => (
                                    // Pasamos el index 'i' para la marca de agua
                                    <AlertCard key={i} data={m} index={i}/>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
          )}
          
          {/* 2. VISTA SIMULADOR */}
          {view === 'simulador' && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                <div className="mb-6 flex flex-col md:flex-row gap-6 justify-between items-center bg-emerald-900/10 border border-emerald-800/30 p-6 rounded-xl">
                    <div className="flex gap-4 items-center">
                        <div className="bg-emerald-600/20 p-3 rounded-full text-emerald-400"><Smartphone size={32} /></div>
                        <div>
                            <h2 className="font-bold text-lg text-emerald-100">Inyector de Eventos</h2>
                            <p className="text-sm text-emerald-200/60">Control manual de sensores distribuidos.</p>
                        </div>
                    </div>
                    
                    {/* Selector de Parque para Inyección */}
                    <div className="flex flex-col items-end gap-2">
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Seleccionar Zona de Impacto</p>
                        <div className="flex bg-slate-950 p-1 rounded-lg border border-emerald-900/50">
                            {['PARQUE-NORTE', 'PARQUE-SUR', 'PARQUE-ESTE'].map(p => (
                                <button 
                                    key={p} 
                                    onClick={() => setSimuladorParque(p)} 
                                    className={`px-4 py-2 rounded text-[10px] font-bold transition-all ${simuladorParque === p ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
                                >
                                    {p.replace('PARQUE-', '')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* SENSORES COMPLETOS */}
                    <SensorGenerator id="SIM-TEMP" label="Temperatura" type="temperatura" unit="°C" icon={Thermometer} parque={simuladorParque} onSend={publicar}/>
                    <SensorGenerator id="SIM-DOOR" label="Puerta Acceso" type="puerta" unit="" icon={DoorOpen} parque={simuladorParque} onSend={publicar}/>
                    <SensorGenerator id="SIM-SMOKE" label="Sensor Humo" type="humo" unit="%" icon={Flame} parque={simuladorParque} onSend={publicar}/>
                    <SensorGenerator id="SIM-MOV" label="Movimiento" type="movimiento" unit="" icon={Footprints} parque={simuladorParque} onSend={publicar}/>
                    <SensorGenerator id="SIM-VIB" label="Vibración" type="vibracion" unit="Hz" icon={Activity} parque={simuladorParque} onSend={publicar}/>
                    
                    {/* BOTÓN DE PÁNICO */}
                    <div className="bg-red-950/30 border border-red-900/50 p-6 rounded-xl flex flex-col items-center justify-center gap-4 text-center group hover:border-red-500 transition-colors">
                        <div>
                            <h3 className="font-bold text-red-200 text-sm flex items-center gap-2 justify-center"><ShieldAlert size={18}/> ALARMA MANUAL</h3>
                            <p className="text-[10px] text-red-400/60 mt-1">Zona: {simuladorParque}</p>
                        </div>
                        <button 
                            onClick={()=>publicar({sensor_id:"PANIC-BTN", tipo:"alarma_manual", valor:1, timestamp:new Date().toISOString()}, simuladorParque)} 
                            className="bg-red-600 hover:bg-red-500 text-white p-6 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] active:scale-95 transition-all group-hover:animate-pulse"
                        >
                            <AlertOctagon size={40} />
                        </button>
                    </div>
                </div>
            </div>
          )}

          {/* 3. VISTA DIAGNÓSTICO */}
          {view === 'diagnostico' && (
              <NetworkDiagnostics monitorOk={monitorOk} simulatorOk={simulatorOk} mensajes={mensajes} ip={connectionIP} />
          )}
        

          {/* 4. VISTA HISTÓRICO / ANALÍTICA */}
        {view === 'historico' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
                
            {/* CABECERA CON FILTRO Y TOTAL */}
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <div className="flex flex-col gap-2">
                        <div>
                            <h2 className="text-xl font-bold text-white">Reporte Operativo</h2>
                        </div>
                        
                        {/* NUEVO: SELECTOR DE PARQUE EN HISTÓRICO */}
                        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-700 w-fit">
                            <MapPin size={12} className="text-blue-500" />
                            <select 
                                value={filtroParque} 
                                onChange={(e) => setFiltroParque(e.target.value)} 
                                className="bg-transparent text-[12px] font-bold text-slate-300 outline-none cursor-pointer uppercase"
                            >
                                <option value="TODOS" className="bg-slate-950">TODOS LOS PARQUES</option>
                                <option value="PARQUE-NORTE" className="bg-slate-950">PARQUE NORTE</option>
                                <option value="PARQUE-SUR" className="bg-slate-950">PARQUE SUR</option>
                                <option value="PARQUE-ESTE" className="bg-slate-950">PARQUE ESTE</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div className="text-right border-r border-slate-700 pr-6">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Eventos Totales</p>
                            <p className="text-3xl font-bold text-indigo-400 leading-none animate-in fade-in">{totalAlertasParque}</p>
                        </div>

                        <button
                            onClick={cargarEstadisticas}
                            className="bg-slate-800 p-3 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700"
                            title="Actualizar datos"
                        >
                            <RefreshCcw size={20} />
                        </button>
                    </div>
                </div>

                {/* FILA SUPERIOR: GRÁFICAS LIMPIAS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* 1. DONA (Sin badge de total, Tooltip arreglado) */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl h-[300px] flex flex-col relative">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Distribución por Tipo</h3>

                        <div className="flex-1 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={typeData}
                                        innerRadius={30}
                                        outerRadius={80}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {typeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#f59e0b', '#3b82f6', '#ef4444','#10b981', '#8b5cf6'][index % 5]} />
                                        ))}
                                    </Pie>
                                    {/* TOOLTIP ARREGLADO (Glassmorphism) */}
                                    <Tooltip 
                                        cursor={false}
                                        contentStyle={{ 
                                            backgroundColor: 'rgba(2, 6, 23, 0.8)', 
                                            backdropFilter: 'blur(4px)', 
                                            borderColor: 'rgba(255,255,255,0.1)', 
                                            borderRadius: '8px',
                                            color: '#fff',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                        }}
                                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                        formatter={(value) => [`${value} Eventos`, '']}
                                        separator=""
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="square" iconSize={9} wrapperStyle={{fontSize: '16px'}} />
                                </PieChart>
                            </ResponsiveContainer>

                        </div>
                    </div>

                    {/* 2. BARRAS (Sin badge de total) */}
                    <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-xl h-[300px] flex flex-col">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Ranking de Parques Críticos</h3>
                        
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statsData} layout="vertical" margin={{ left: 10, right: 40, top: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                    <XAxis type="number" stroke="#64748b" fontSize={10} />
                                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={80} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color:'#fff' }} />
                                    <Bar dataKey="alertas" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={25} label={{ position: 'right', fill: '#cbd5e1', fontSize: 12, fontWeight: 'bold' }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* FILA INFERIOR: EVOLUCIÓN TEMPORAL */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl h-[350px]">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Tendencia de Alertas (Últimos 5 mins)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData}>
                            <defs>
                                <linearGradient id="colorAlertas" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                            <Area type="monotone" dataKey="cantidad" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorAlertas)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        )}
        {/* 5. VISTA 3D (GEMELO DIGITAL) */}
        {view === '3d' && (
            <div className="animate-in fade-in zoom-in-95 duration-500">
                {/* Pasamos 'mensajes' que ya tienes del hook useMonitorConnection */}
                <IndustrialScene mensajes={mensajes} />

                {/* Instrucciones simples */}
                <div className="mt-4 text-center">
                    <p className="text-xs text-slate-500 font-mono">
                        [🖱️ CLICK IZQUIERDO: ROTAR] • [🖱️ CLICK DERECHO: MOVER] • [RUEDA: ZOOM]
                    </p>
                </div>
            </div>
        )}

        </main>
      </div>
    );
}