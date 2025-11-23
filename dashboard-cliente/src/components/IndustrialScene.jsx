import React, { useMemo, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stage, useGLTF, Html, Float } from '@react-three/drei';

// === 1. CONFIGURACIÓN DE ZONAS ===
const PARK_ZONES = {
    'PARQUE-NORTE': {
        label: 'NORTE',
        color: 'bg-red-500', // Color Tailwind para el botón
        hex: '#ef4444',      // Color Hex para efectos 3D
        sensors: {
            'PARQUE-NORTE-TEMP-01':     { position: [-0.22, 0.2, -0.5],   label: 'TEMP',   type: 'temp' },
            'PARQUE-NORTE-HUMO-01':     { position: [-0.1, -0.25, 0.25],  label: 'HUMO',   type: 'humo' },
            'PARQUE-NORTE-VIB-M1':      { position: [0.7, -0.6, 0.25],    label: 'VIB',    type: 'alert' },
            'PARQUE-NORTE-ACCESO-MAIN': { position: [-0.35, -1.08, 0.55], label: 'PUERTA', type: 'alert' },
            'PARQUE-NORTE-MOV-HALL':    { position: [-1.1, -0.6, 0.25],   label: 'MOV',    type: 'alert' },
            'PANIC-BTN':                { position: [0.25, -0.8, 0.55],   label: 'PÁNICO', type: 'panic' }
        }
    },
    'PARQUE-SUR': {
        label: 'SUR',
        color: 'bg-blue-500',
        hex: '#3b82f6',
        sensors: {
            'PARQUE-SUR-TEMP-01':     { position: [-0.22, 0.2, -0.5],   label: 'TEMP',   type: 'temp' },
            'PARQUE-SUR-HUMO-01':     { position: [-0.1, -0.25, 0.25],  label: 'HUMO',   type: 'humo' },
            'PARQUE-SUR-VIB-M1':      { position: [0.7, -0.6, 0.25],    label: 'VIB',    type: 'alert' },
            'PARQUE-SUR-ACCESO-MAIN': { position: [-0.35, -1.08, 0.55], label: 'PUERTA', type: 'alert' },
            'PARQUE-SUR-MOV-HALL':    { position: [-1.1, -0.6, 0.25],   label: 'MOV',    type: 'alert' },
            'PANIC-BTN':              { position: [0.25, -0.8, 0.55],   label: 'PÁNICO', type: 'panic' }
        }
    },
    'PARQUE-ESTE': {
        label: 'ESTE',
        color: 'bg-emerald-500',
        hex: '#10b981',
        sensors: {
            'PARQUE-ESTE-TEMP-01':     { position: [-0.22, 0.2, -0.5],   label: 'TEMP',   type: 'temp' },
            'PARQUE-ESTE-HUMO-01':     { position: [-0.1, -0.25, 0.25],  label: 'HUMO',   type: 'humo' },
            'PARQUE-ESTE-VIB-M1':      { position: [0.7, -0.6, 0.25],    label: 'VIB',    type: 'alert' },
            'PARQUE-ESTE-ACCESO-MAIN': { position: [-0.35, -1.08, 0.55], label: 'PUERTA', type: 'alert' },
            'PARQUE-ESTE-MOV-HALL':    { position: [-1.1, -0.6, 0.25],   label: 'MOV',    type: 'alert' },
            'PANIC-BTN':               { position: [0.25, -0.8, 0.55],   label: 'PÁNICO', type: 'panic' }
        }
    }
};

// === 2. EFECTOS VISUALES (VFX) ===
const SmokeEffect = () => {
    const ref = useRef();
    useFrame((state, delta) => {
        if(ref.current) ref.current.children.forEach((mesh, i) => {
            mesh.position.y += delta * 0.5; 
            mesh.scale.addScalar(delta * 0.2); 
            mesh.material.opacity -= delta * 0.3; 
            if (mesh.material.opacity <= 0) {
                mesh.position.set((Math.random()-0.5)*0.2, 0, (Math.random()-0.5)*0.2);
                mesh.scale.setScalar(0.2);
                mesh.material.opacity = 0.8;
            }
        });
    });
    return (
        <group ref={ref}>
            {[...Array(5)].map((_, i) => (
                <mesh key={i} position={[(Math.random()-0.5)*0.2, i*0.2, (Math.random()-0.5)*0.2]}>
                    <dodecahedronGeometry args={[0.15]} />
                    <meshStandardMaterial color="#555" transparent opacity={0.8} />
                </mesh>
            ))}
        </group>
    );
};

const HeatEffect = () => {
    const ref = useRef();
    useFrame((state) => { if(ref.current) { ref.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.2; ref.current.rotation.y += 0.1; } });
    return (
        <group>
            <pointLight color="orange" intensity={2} distance={1} decay={2} />
            <mesh ref={ref} position={[0, 0.2, 0]}>
                <coneGeometry args={[0.1, 0.4, 8]} />
                <meshBasicMaterial color="red" transparent opacity={0.6} wireframe />
            </mesh>
        </group>
    );
};

const PulseEffect = ({ color }) => {
    const ref = useRef();
    useFrame((state, delta) => {
        if(ref.current) {
            ref.current.scale.addScalar(delta * 2);
            ref.current.material.opacity -= delta * 1.5;
            if (ref.current.scale.x > 3) { ref.current.scale.setScalar(0.1); ref.current.material.opacity = 1; }
        }
    });
    return (
        <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[0.15, 0.2, 32]} />
            <meshBasicMaterial color={color} transparent opacity={1} side={2} />
        </mesh>
    );
};

const PanicEffect = () => {
    const lightRef = useRef();
    useFrame((state) => { if(lightRef.current) lightRef.current.intensity = Math.sin(state.clock.elapsedTime * 20) > 0 ? 5 : 0; });
    return (
        <group>
            <pointLight ref={lightRef} color="red" distance={3} />
            <mesh><sphereGeometry args={[0.15]} /><meshBasicMaterial color="red" wireframe /></mesh>
        </group>
    );
};

// === 3. COMPONENTE SENSOR INTELIGENTE ===
const SensorMarker = ({ config, estado }) => {
    const isCritical = estado?.nivel === 'critico';
    const isWarning = estado?.nivel === 'advertencia';
    const isActive = isCritical || isWarning;
    
    // Colores para efectos 3D
    const alertColor = isCritical ? '#ef4444' : '#f59e0b';

    return (
        <group position={config.position}>
            {/* ETIQUETA HTML MEJORADA (Texto negro, fondo sólido blanco, borde visible) */}
            <Html position={[0, 0.5, 0]} center distanceFactor={3.5} zIndexRange={[100, 0]}>
                <div className={`
                    transition-all duration-300 flex flex-col items-center select-none cursor-default
                    ${isActive ? 'scale-125 z-50' : 'scale-100 opacity-90 hover:opacity-100 hover:scale-110'}
                `}>
                    <div className={`
                        px-3 py-1 rounded-md shadow-lg border-2 flex flex-col items-center
                        ${isActive 
                            ? 'bg-red-600 border-red-400 text-white animate-pulse' 
                            : 'bg-white border-slate-300 text-slate-800'}
                    `}>
                        <span className="text-[10px] font-extrabold tracking-widest uppercase whitespace-nowrap">
                            {config.label}
                        </span>
                        {estado && (
                            <span className={`text-[9px] font-mono font-bold leading-none mt-0.5 ${isActive ? 'text-white' : 'text-slate-500'}`}>
                                {estado.valor}
                            </span>
                        )}
                    </div>
                    {/* Flecha inferior */}
                    <div className={`w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px]
                        ${isActive ? 'border-t-red-600' : 'border-t-slate-300'}
                    `}></div>
                </div>
            </Html>

            {/* VFX SOLO SI HAY ALERTA */}
            {isActive && (
                <>
                    {config.type === 'humo' && <SmokeEffect />}
                    {config.type === 'temp' && <HeatEffect />}
                    {config.type === 'alert' && <PulseEffect color={alertColor} />}
                    {config.type === 'panic' && <PanicEffect />}
                </>
            )}
        </group>
    );
};

// === 4. ESCENA PRINCIPAL ===
const Model = () => {
    const { scene } = useGLTF('/factory.glb');
    return <primitive object={scene} />;
};

export default function IndustrialScene({ mensajes }) {
    const [activePark, setActivePark] = useState('PARQUE-NORTE');

    const estadosSensores = useMemo(() => {
        const map = {};
        [...mensajes].reverse().forEach(msg => map[msg.sensor_id] = msg);
        return map;
    }, [mensajes]);

    const currentZone = PARK_ZONES[activePark];

    return (
        <div className="w-full h-[600px] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative shadow-xl group">
            
            {/* UI NAVEGACIÓN (Overlay) */}
            <div className="absolute top-4 left-0 right-0 z-10 flex flex-col items-center pointer-events-none">
                {/* Título Dinámico */}
                <div className="bg-white/90 backdrop-blur px-6 py-2 rounded-full shadow-lg border border-slate-200 mb-3 pointer-events-auto">
                    <h2 className="text-sm font-black text-slate-800 tracking-widest flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${currentZone.color}`}></span>
                        {currentZone.label}
                    </h2>
                </div>

                {/* BOTONERA DE COLORES */}
                <div className="flex bg-slate-800/90 p-1 rounded-xl shadow-2xl pointer-events-auto backdrop-blur-sm">
                    {Object.keys(PARK_ZONES).map((parkKey) => (
                        <button
                            key={parkKey}
                            onClick={() => setActivePark(parkKey)}
                            className={`
                                px-5 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-300
                                ${activePark === parkKey 
                                    ? `${PARK_ZONES[parkKey].color} text-white shadow-md transform scale-105` // Botón ACTIVO (Color del parque)
                                    : 'text-slate-400 hover:text-white hover:bg-white/10'} // Botón INACTIVO
                            `}
                        >
                            {parkKey.replace('PARQUE-', '')}
                        </button>
                    ))}
                </div>
            </div>

            {/* CANVAS 3D */}
            <Canvas shadows dpr={[1, 2]} 
                camera={{ position: [0, 0, 12], fov: 70 }}>

                <Stage environment="city" intensity={0.6} contactShadowOpacity={0.5} shadowBias={-0.0015} adjustCamera={false}>
                    <Model />
                </Stage>
                
                {/* CONTROLES DE CÁMARA AJUSTADOS */}
                {/* target={[0,0,0]} fuerza a la cámara a mirar siempre al centro del modelo */}
                <OrbitControls 
                    makeDefault 
                    minPolarAngle={0} 
                    maxPolarAngle={Math.PI / 2.2} 
                    autoRotate={false}
                    target={[0, 0, 0]} 
                />

                {/* RENDERIZADO DE SENSORES */}
                <group>
                    {Object.entries(currentZone.sensors).map(([id, config]) => (
                        <SensorMarker 
                            key={id} 
                            config={config} 
                            estado={estadosSensores[id]} 
                        />
                    ))}
                </group>
            </Canvas>
        </div>
    );
}