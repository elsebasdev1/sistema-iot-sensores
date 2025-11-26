# 🏭 Sistema de Monitoreo IoT Industrial - Control Cuenca

Este es un sistema integral de **seguridad industrial y monitoreo en
tiempo real** diseñado para la ciudad de Cuenca. Implementa una
**Arquitectura Híbrida (EDA + REST)** para gestionar alertas críticas de
múltiples parques industriales, combinando un dashboard operativo,
analítica histórica y un **Gemelo Digital 3D** interactivo.

## 📸 Capturas del Sistema

### 🖥️ Dashboard en Tiempo Real

<img width="3440" height="2170" alt="monitor_sis_iot" src="https://github.com/user-attachments/assets/418f0f65-a939-4035-a0e3-822d1befbe58" />

### 🤖 Simulador manual/automático de eventos

<img width="3400" height="1800" alt="simulador_sis_iot" src="https://github.com/user-attachments/assets/9b1b7eb6-5b9e-473c-a809-887f51f1a7cb" />

### 🔍 Diágnostico de infraestructura de la red

<img width="3300" height="1880" alt="192 168 1 3_5173_" src="https://github.com/user-attachments/assets/80a84602-7709-46c6-99b9-03b43369fbe3" />

### 📊 Analítica Histórica

<img width="3000" height="1760" alt="historico_sis_iot" src="https://github.com/user-attachments/assets/49ee1f37-1eeb-44de-9517-e98cae599fae" />

### 🧊 Gemelo Digital 3D (Interactivo)

<img width="2800" height="1500" alt="192 168 1 3_5173_ (1)" src="https://github.com/user-attachments/assets/c1a1786d-edee-4a5e-ae13-c10114c47138" />

## 🚀 Tecnologías Utilizadas

### Frontend (Cliente)

-   **Framework:** [React](https://reactjs.org/) +
    [Vite](https://vitejs.dev/)
-   **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
-   **Visualización 3D:** [Three.js](https://threejs.org/) + [React
    Three Fiber](https://docs.pmnd.rs/react-three-fiber) +
    [Drei](https://github.com/pmndrs/drei)
-   **Gráficos:** [Recharts](https://recharts.org/) (Analítica de datos)
-   **Iconografía:** [Lucide React](https://lucide.dev/)

### Backend & Infraestructura

-   **Runtime:** [Node.js](https://nodejs.org/)
-   **Broker MQTT:** [Aedes](https://github.com/moscajs/aedes) (Gestión
    de colas de mensajes)
-   **Base de Datos:** [InfluxDB v2](https://www.influxdata.com/)
    (Series Temporales optimizada)
-   **Comunicación:**
    -   **WebSockets (Nativo):** Para alertas PUSH en tiempo real
        (Puerto 9000)
    -   **MQTT sobre WS:** Para comunicación con simuladores web (Puerto
        8888)
    -   **API REST:** Para consultas de datos históricos
-   **Contenedores:** [Docker](https://www.docker.com/) (Para
    persistencia de InfluxDB)

## 🎯 Objetivos del Proyecto

-   **Monitoreo en Tiempo Real:** Visualización inmediata de eventos
    (Temperatura, Humo, Vibración, Accesos) con latencia mínima
    (\<50ms).
-   **Gemelo Digital:** Representación espacial 3D de los parques
    (Norte, Sur, Este) para ubicar incidentes físicos con efectos
    visuales (fuego, humo, ondas).
-   **Persistencia de Datos:** Almacenamiento histórico eficiente para
    análisis de tendencias y auditoría.
-   **Escalabilidad:** Capacidad de procesar múltiples sensores
    simultáneos sin bloqueo.
-   **Diagnóstico de Red:** Visualización de topología y estado de salud
    de los nodos (LWT).

## 📁 Estructura del Proyecto

``` bash
SISTEMA-IOT-CUENCA/
│
├── dashboard-cliente/      # Frontend (React + Three.js)
│   ├── public/             # Modelos 3D (factory.glb)
│   ├── src/
│   │   ├── components/     # Escenas 3D, Tarjetas, Gráficos
│   │   ├── hooks/          # Lógica de conexión WS/MQTT
│   │   └── App.jsx         # Enrutamiento y Lógica Principal
│
├── servidor-central/       # Backend (Node.js)
│   ├── index.js            # Broker MQTT + Servidor WS + API REST
│   └── node_modules/
│
└── sensores-scripts/       # Simuladores Físicos
    └── sensor_industrial.js # Script generador de tráfico masivo
```

🧑‍💻 Funcionalidades Principales\
**Operador de Control:**

- **Monitor:** Feed de alertas priorizadas por colores (Gris, Amarillo, Rojo)
y contadores KPIs en vivo.

- **Vista 3D:** Navegación entre parques con indicadores visuales contextuales
(Fuego para temperatura crítica, humo volumétrico, luces
estroboscópicas).

- **Histórico:** Análisis de tendencias (curvas de área), distribución de
fallas (dona) y ranking de parques (barras), con filtrado dinámico y
deduplicación de datos.

- **Diagnóstico:** Verificación de conexión Cliente-Broker-Monitor y estado de
nodos.

**Sistema Autónomo:**

- Motor de reglas en backend para clasificación de alertas.

- Deduplicación de datos para integridad gráfica.

- Ingesta masiva de datos vía MQTT TCP.

## 📦 Instalación y Despliegue Local

### 1. Base de Datos (Docker)

Levantar el contenedor de InfluxDB con persistencia:

``` bash
docker run -d -p 8086:8086 --name influxdb -v influxdb_data:/var/lib/influxdb2 influxdb:2.0
```

(Configurar usuario/bucket en localhost:8086 y obtener el TOKEN).

### 2. Servidor Central (Backend)

Configurar el INFLUX_TOKEN en index.js e iniciar el núcleo:

``` bash
cd servidor-central
npm install
node index.js
```

Puertos activos: 1883 (MQTT TCP), 8888 (MQTT WS + API), 9000 (Alertas
WS).

### 3. Dashboard (Frontend)

Iniciar la interfaz visual:

``` bash
cd dashboard-cliente
npm install
npm run dev
```

### 4. Simulación de Sensores (Opcional)

Para generar tráfico de estrés desde terminal:

``` bash
cd sensores-scripts
node sensor_industrial.js
```

## 🛡️ Arquitectura y Buenas Prácticas

Arquitectura Híbrida: Uso estratégico de EDA (Event-Driven) para lo
crítico/inmediato y REST para la carga pesada histórica, optimizando el
ancho de banda.

Optimización 3D: Uso de Instances, Stage y descarga de geometría
(useGLTF) para mantener un alto rendimiento en el navegador.

Manejo de Errores: Backend robusto ante peticiones malformadas (Manejo
de CORS, Options y 404).

Modularidad: Separación clara de responsabilidades (Productores,
Procesador, Visualizador).

Desarrollado para la asignatura de Sistemas Distribuidos -- 2025
