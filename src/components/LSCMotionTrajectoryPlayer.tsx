
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type FotogramaTrayectoria = {
  tiempoMs: number;
  cambioPostura: number;
  desplazamientoMuneca: number;
  caracteristicas: number[];
  posicionMuneca?: {
    x: number;
    y: number;
    z: number;
  };
};

type Props = {
  trayectoria: FotogramaTrayectoria[];
};

const CONEXIONES_MANO: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

type Punto3D = {
  x: number;
  y: number;
  z: number;
};


function Mano3D({ puntos }: { puntos: Punto3D[] }) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const esferasRef = useRef<THREE.Mesh[]>([]);
  const lineasRef = useRef<THREE.Line[]>([]);

  // Crear la escena 3D una sola vez.
  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;

    const escena = new THREE.Scene();
    escena.background = new THREE.Color("#f1f5f9");

    const camara = new THREE.PerspectiveCamera(
      45,
      1,
      0.1,
      100
    );

    camara.position.set(2.8, 2.2, 3.2);

    const renderizador = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });

    renderizador.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 1.5)
    );

    renderizador.setSize(
      contenedor.clientWidth,
      contenedor.clientHeight
    );

    renderizador.outputColorSpace = THREE.SRGBColorSpace;
    contenedor.appendChild(renderizador.domElement);

    const controles = new OrbitControls(
      camara,
      renderizador.domElement
    );

    controles.enableDamping = true;
    controles.dampingFactor = 0.08;
    controles.enableZoom = true;
    controles.minDistance = 1.5;
    controles.maxDistance = 8;
    controles.target.set(0, -0.25, 0);
    controles.update();

    escena.add(new THREE.AmbientLight(0xffffff, 1.8));

    const luzPrincipal = new THREE.DirectionalLight(
      0xffffff,
      2.2
    );

    luzPrincipal.position.set(3, 5, 4);
    escena.add(luzPrincipal);

    const luzSecundaria = new THREE.DirectionalLight(
      0xffffff,
      0.8
    );

    luzSecundaria.position.set(-3, 1, -3);
    escena.add(luzSecundaria);

    const ejes = new THREE.AxesHelper(1.5);
    escena.add(ejes);

    const cuadricula = new THREE.GridHelper(
      4,
      12,
      0x94a3b8,
      0xdbe4ed
    );

    cuadricula.position.y = -1.15;
    escena.add(cuadricula);

    // Geometría compartida para las 21 articulaciones.
    const geometriaPunto = new THREE.SphereGeometry(
      0.035,
      16,
      12
    );

    const materialPunto = new THREE.MeshStandardMaterial({
      color: 0x168bca,
      roughness: 0.45,
    });

    const materialMuneca = new THREE.MeshStandardMaterial({
      color: 0xe49a36,
      roughness: 0.4,
    });

    const esferas: THREE.Mesh[] = [];

    for (let i = 0; i < 21; i++) {
      const esfera = new THREE.Mesh(
        geometriaPunto,
        i === 0 ? materialMuneca : materialPunto
      );

      escena.add(esfera);
      esferas.push(esfera);
    }

    esferasRef.current = esferas;

    // Crear las conexiones una sola vez.
    const materialLineas = new THREE.LineBasicMaterial({
      color: 0x168bca,
    });

    const lineas: THREE.Line[] = [];

    CONEXIONES_MANO.forEach(() => {
      const datos = new Float32Array(6);

      const geometria = new THREE.BufferGeometry();

      const atributo = new THREE.BufferAttribute(datos, 3);
      atributo.setUsage(THREE.DynamicDrawUsage);

      geometria.setAttribute("position", atributo);

      const linea = new THREE.Line(
        geometria,
        materialLineas
      );

      escena.add(linea);
      lineas.push(linea);
    });

    lineasRef.current = lineas;

    let animacion = 0;

    const dibujar = () => {
      animacion = requestAnimationFrame(dibujar);
      controles.update();
      renderizador.render(escena, camara);
    };

    dibujar();

    const ajustarTamano = () => {
      const ancho = contenedor.clientWidth;
      const alto = contenedor.clientHeight;

      if (ancho <= 0 || alto <= 0) return;

      camara.aspect = ancho / alto;
      camara.updateProjectionMatrix();
      renderizador.setSize(ancho, alto);
    };

    const observador = new ResizeObserver(ajustarTamano);
    observador.observe(contenedor);

    return () => {
      cancelAnimationFrame(animacion);
      observador.disconnect();
      controles.dispose();

      lineas.forEach((linea) => {
        linea.geometry.dispose();
      });

      geometriaPunto.dispose();
      materialLineas.dispose();
      materialPunto.dispose();
      materialMuneca.dispose();

      cuadricula.geometry.dispose();

      const materialesCuadricula = Array.isArray(
        cuadricula.material
      )
        ? cuadricula.material
        : [cuadricula.material];

      materialesCuadricula.forEach((material) =>
        material.dispose()
      );

      ejes.geometry.dispose();

      const materialesEjes = Array.isArray(ejes.material)
        ? ejes.material
        : [ejes.material];

      materialesEjes.forEach((material) =>
        material.dispose()
      );

      esferasRef.current = [];
      lineasRef.current = [];

      renderizador.dispose();

      if (
        renderizador.domElement.parentElement === contenedor
      ) {
        contenedor.removeChild(renderizador.domElement);
      }
    };
  }, []);

  // Actualizar las articulaciones sin reconstruir la escena.
  useEffect(() => {
    if (puntos.length !== 21) return;

    const posiciones = puntos.map(
      (punto) =>
        new THREE.Vector3(
          punto.x * 0.85,
          -punto.y * 0.85,
          punto.z * 0.85
        )
    );

    esferasRef.current.forEach((esfera, indice) => {
      esfera.position.copy(posiciones[indice]);
    });

    lineasRef.current.forEach((linea, indice) => {
      const [origen, destino] = CONEXIONES_MANO[indice];

      const atributo = linea.geometry.getAttribute(
        "position"
      ) as THREE.BufferAttribute;

      atributo.setXYZ(
        0,
        posiciones[origen].x,
        posiciones[origen].y,
        posiciones[origen].z
      );

      atributo.setXYZ(
        1,
        posiciones[destino].x,
        posiciones[destino].y,
        posiciones[destino].z
      );

      atributo.needsUpdate = true;
    });
  }, [puntos]);

  return (
    <div
      ref={contenedorRef}
      style={{
        width: "100%",
        height: "320px",
        overflow: "hidden",
        borderRadius: "12px",
        border: "1px solid #cbd5e1",
        touchAction: "pan-y",
      }}
      role="img"
      aria-label="Modelo tridimensional de los 21 puntos de la mano"
    />
  );
}

function TrayectoriaMuneca3D({
  trayectoria,
  indiceActual,
}: {
  trayectoria: FotogramaTrayectoria[];
  indiceActual: number;
}) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const marcadorRef = useRef<THREE.Mesh | null>(null);
  const posicionesRef = useRef<THREE.Vector3[]>([]);

  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;

    const fotogramasValidos = trayectoria.filter(
      (fotograma) =>
        fotograma.posicionMuneca &&
        Number.isFinite(fotograma.posicionMuneca.x) &&
        Number.isFinite(fotograma.posicionMuneca.y) &&
        Number.isFinite(fotograma.posicionMuneca.z)
    );

    if (fotogramasValidos.length < 2) return;

    const puntosOriginales = fotogramasValidos.map(
      (fotograma) => new THREE.Vector3(
        fotograma.posicionMuneca!.x,
        -fotograma.posicionMuneca!.y,
        fotograma.posicionMuneca!.z
      )
    );

    const caja = new THREE.Box3().setFromPoints(
      puntosOriginales
    );

    const centro = caja.getCenter(new THREE.Vector3());
    const tamano = caja.getSize(new THREE.Vector3());
    const dimensionMayor = Math.max(
      tamano.x,
      tamano.y,
      tamano.z,
      0.0001
    );

    const escala = 2.5 / dimensionMayor;

    const posiciones = puntosOriginales.map(
      (punto) =>
        punto.sub(centro).multiplyScalar(escala)
    );

    posicionesRef.current = posiciones;

    const escena = new THREE.Scene();
    escena.background = new THREE.Color("#f1f5f9");

    const camara = new THREE.PerspectiveCamera(
      45,
      1,
      0.1,
      100
    );

    camara.position.set(3.2, 2.6, 4.2);
    camara.lookAt(0, 0, 0);

    const renderizador = new THREE.WebGLRenderer({
      antialias: true,
    });

    renderizador.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 2)
    );

    renderizador.setSize(
      contenedor.clientWidth,
      contenedor.clientHeight
    );

    renderizador.outputColorSpace = THREE.SRGBColorSpace;
    contenedor.appendChild(renderizador.domElement);

    const controles = new OrbitControls(
      camara,
      renderizador.domElement
    );

    controles.enableDamping = true;
    controles.dampingFactor = 0.08;
    controles.target.set(0, 0, 0);
    controles.update();

    escena.add(new THREE.AmbientLight(0xffffff, 1.5));

    const luz = new THREE.DirectionalLight(
      0xffffff,
      2
    );

    luz.position.set(3, 5, 4);
    escena.add(luz);

    escena.add(new THREE.AxesHelper(1.5));

    const geometriaTrayectoria =
      new THREE.BufferGeometry().setFromPoints(posiciones);

    const materialTrayectoria =
      new THREE.LineBasicMaterial({
        color: 0x168bca,
      });

    const linea = new THREE.Line(
      geometriaTrayectoria,
      materialTrayectoria
    );

    escena.add(linea);

    const geometriaPuntos = new THREE.SphereGeometry(
      0.025,
      12,
      10
    );

    const materialPuntos = new THREE.MeshStandardMaterial({
      color: 0x64748b,
    });

    posiciones.forEach((posicion) => {
      const punto = new THREE.Mesh(
        geometriaPuntos,
        materialPuntos
      );

      punto.position.copy(posicion);
      escena.add(punto);
    });

    const geometriaMarcador = new THREE.SphereGeometry(
      0.075,
      20,
      16
    );

    const materialMarcador =
      new THREE.MeshStandardMaterial({
        color: 0xe49a36,
        emissive: 0x603000,
      });

    const marcador = new THREE.Mesh(
      geometriaMarcador,
      materialMarcador
    );

    escena.add(marcador);
    marcadorRef.current = marcador;

    let animacion = 0;

    const dibujar = () => {
      animacion = requestAnimationFrame(dibujar);
      controles.update();
      renderizador.render(escena, camara);
    };

    dibujar();

    const ajustarTamano = () => {
      const ancho = contenedor.clientWidth;
      const alto = contenedor.clientHeight;

      if (ancho <= 0 || alto <= 0) return;

      camara.aspect = ancho / alto;
      camara.updateProjectionMatrix();
      renderizador.setSize(ancho, alto);
    };

    const observador = new ResizeObserver(ajustarTamano);
    observador.observe(contenedor);

    return () => {
      cancelAnimationFrame(animacion);
      observador.disconnect();
      controles.dispose();

      geometriaTrayectoria.dispose();
      materialTrayectoria.dispose();
      geometriaPuntos.dispose();
      materialPuntos.dispose();
      geometriaMarcador.dispose();
      materialMarcador.dispose();

      marcadorRef.current = null;
      posicionesRef.current = [];

      renderizador.dispose();

      if (
        renderizador.domElement.parentElement === contenedor
      ) {
        contenedor.removeChild(renderizador.domElement);
      }
    };
  }, [trayectoria]);

  useEffect(() => {
    const marcador = marcadorRef.current;
    if (!marcador) return;

    const indiceBase = Math.floor(indiceActual);
    const fraccion = indiceActual - indiceBase;

    const fotograma = trayectoria[indiceBase];

    const siguienteFotograma =
      trayectoria[
        Math.min(indiceBase + 1, trayectoria.length - 1)
      ];

    const puntosValidos = trayectoria.filter(
      (item) =>
        item.posicionMuneca &&
        Number.isFinite(item.posicionMuneca.x) &&
        Number.isFinite(item.posicionMuneca.y) &&
        Number.isFinite(item.posicionMuneca.z)
    );

    const indicePosicion = puntosValidos.findIndex(
      (item) => item === fotograma
    );

    const indiceSiguiente = puntosValidos.findIndex(
      (item) => item === siguienteFotograma
    );

    const puntoActual =
      posicionesRef.current[indicePosicion];

    const puntoSiguiente =
      posicionesRef.current[indiceSiguiente];

    if (!puntoActual) {
      marcador.visible = false;
      return;
    }

    if (puntoSiguiente) {
      marcador.position.lerpVectors(
        puntoActual,
        puntoSiguiente,
        fraccion
      );
    } else {
      marcador.position.copy(puntoActual);
    }

    marcador.visible = true;
  }, [indiceActual, trayectoria]);

  const cantidadPosiciones = trayectoria.filter(
    (fotograma) =>
      fotograma.posicionMuneca &&
      Number.isFinite(fotograma.posicionMuneca.x) &&
      Number.isFinite(fotograma.posicionMuneca.y) &&
      Number.isFinite(fotograma.posicionMuneca.z)
  ).length;

  return (
    <section>
      <h6>Recorrido espacial de la muñeca</h6>

      {cantidadPosiciones >= 2 ? (
        <>
          <div
            ref={contenedorRef}
            style={{
              width: "100%",
              height: "280px",
              overflow: "hidden",
              borderRadius: "12px",
              border: "1px solid #cbd5e1",
              touchAction: "pan-y",
            }}
            role="img"
            aria-label="Recorrido tridimensional de la muñeca"
          />

          <p>
            Línea azul: recorrido completo.
            Marcador naranja: posición del fotograma actual.
          </p>

          <small>
            Coordenadas normalizadas de cámara, centradas y
            escaladas proporcionalmente para visualizar el recorrido.
          </small>
        </>
      ) : (
        <p>
          No hay suficientes posiciones de muñeca para
          reconstruir el recorrido espacial.
        </p>
      )}

      <p>
        Posiciones válidas: {cantidadPosiciones} de{" "}
        {trayectoria.length}
      </p>
    </section>
  );
}

export default function LSCMotionTrajectoryPlayer({
  trayectoria,
}: Props) {
  const [indice, setIndice] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [velocidad, setVelocidad] = useState(1);
  const [progreso, setProgreso] = useState(0);

  // Reproducción sincronizada según el tiempo de cada fotograma.
    // Reproducción continua con interpolación temporal.
    useEffect(() => {
      if (!reproduciendo || trayectoria.length < 2) return;
  
      const indiceActual = Math.min(
        indice,
        trayectoria.length - 1
      );
  
      if (indiceActual >= trayectoria.length - 1) {
        setReproduciendo(false);
        setProgreso(0);
        return;
      }
  
      const actual = trayectoria[indiceActual];
      const siguiente = trayectoria[indiceActual + 1];
  
      const diferencia =
        siguiente.tiempoMs - actual.tiempoMs;
  
      const duracionBase =
        Number.isFinite(diferencia) && diferencia > 0
          ? diferencia
          : 100;
  
      const duracion = Math.min(
        2000,
        Math.max(40, duracionBase / velocidad)
      );
  
      const inicio = performance.now();
      let animacion = 0;
  
      const avanzar = (ahora: number) => {
        const transcurrido = ahora - inicio;
        const porcentaje = Math.min(
          transcurrido / duracion,
          1
        );
  
        if (porcentaje >= 1) {
          setProgreso(0);
          setIndice(indiceActual + 1);
          return;
        }
  
        setProgreso(porcentaje);
        animacion = requestAnimationFrame(avanzar);
      };
  
      animacion = requestAnimationFrame(avanzar);
  
      return () => {
        cancelAnimationFrame(animacion);
      };
    }, [reproduciendo, indice, trayectoria, velocidad]);

  if (!trayectoria.length) {
    return <p>No hay fotogramas para reproducir.</p>;
  }

  const indiceSeguro = Math.min(
    indice,
    trayectoria.length - 1
  );

  const fotogramaBase = trayectoria[indiceSeguro];

  const fotogramaSiguiente =
    trayectoria[
      Math.min(indiceSeguro + 1, trayectoria.length - 1)
    ];

  const interpolarValor = (
    inicial: number,
    final: number
  ) => inicial + (final - inicial) * progreso;

  const caracteristicasInterpoladas =
    Array.isArray(fotogramaBase.caracteristicas) &&
    Array.isArray(fotogramaSiguiente.caracteristicas) &&
    fotogramaBase.caracteristicas.length >= 63 &&
    fotogramaSiguiente.caracteristicas.length >= 63
      ? fotogramaBase.caracteristicas
          .slice(0, 63)
          .map((valor, i) =>
            Number.isFinite(valor) &&
            Number.isFinite(fotogramaSiguiente.caracteristicas[i])
              ? interpolarValor(
                  valor,
                  fotogramaSiguiente.caracteristicas[i]
                )
              : valor
          )
      : fotogramaBase.caracteristicas;

  const actual = {
    ...fotogramaBase,
    tiempoMs: interpolarValor(
      fotogramaBase.tiempoMs,
      fotogramaSiguiente.tiempoMs
    ),
    cambioPostura: interpolarValor(
      fotogramaBase.cambioPostura,
      fotogramaSiguiente.cambioPostura
    ),
    desplazamientoMuneca: interpolarValor(
      fotogramaBase.desplazamientoMuneca,
      fotogramaSiguiente.desplazamientoMuneca
    ),
    caracteristicas: caracteristicasInterpoladas,
  };

  const indiceInterpolado = Math.min(
    indiceSeguro + progreso,
    trayectoria.length - 1
  );

  const puntosValidos =
    Array.isArray(actual.caracteristicas) &&
    actual.caracteristicas.length >= 63 &&
    actual.caracteristicas
      .slice(0, 63)
      .every(Number.isFinite);

  const puntosMano: Punto3D[] = puntosValidos
    ? Array.from({ length: 21 }, (_, i) => ({
        x: actual.caracteristicas[i * 3],
        y: actual.caracteristicas[i * 3 + 1],
        z: actual.caracteristicas[i * 3 + 2],
      }))
    : [];

  const maximo = Math.max(
    0.000001,
    ...trayectoria.map((f) =>
      Math.max(
        f.cambioPostura,
        f.desplazamientoMuneca
      )
    )
  );

  const obtenerPuntos = (
    campo: "cambioPostura" | "desplazamientoMuneca"
  ) =>
    trayectoria
      .map((f, i) => {
        const x =
          trayectoria.length === 1
            ? 150
            : 12 + (i / (trayectoria.length - 1)) * 276;

        const y = 88 - (f[campo] / maximo) * 70;

        return `${x},${y}`;
      })
      .join(" ");

      const puntoActualX =
      trayectoria.length === 1
        ? 150
        : 12 +
          (indiceInterpolado / (trayectoria.length - 1)) * 276;

  const puntoActualY =
    88 - (actual.cambioPostura / maximo) * 70;

  return (
    <div className="motion-player">
      <h5>Reproducción de trayectoria</h5>

      <h6>Reconstrucción tridimensional de la mano</h6>

      {puntosValidos ? (
        <Mano3D puntos={puntosMano} />
      ) : (
        <p>
          Este fotograma no contiene las 63 características
          válidas necesarias para reconstruir la mano.
        </p>
      )}

      <p>
        Puntos de referencia disponibles:{" "}
        {puntosValidos ? 21 : 0} de 21
      </p>

      <TrayectoriaMuneca3D
        trayectoria={trayectoria}
        indiceActual={indiceInterpolado}
      />

      <p>
        Arrastra sobre la representación para girarla.
        Utiliza el gesto de ampliar o reducir para cambiar el zoom.
      </p>

      <p>
        Ejes de referencia: X (rojo), Y (verde), Z (azul).
        La muñeca está resaltada en naranja.
      </p>

      <h6>Evolución del movimiento</h6>

      <svg
        viewBox="0 0 300 110"
        width="100%"
        role="img"
        aria-label="Evolución de las métricas del movimiento"
      >
        <line
          x1="12"
          y1="18"
          x2="288"
          y2="18"
          stroke="#dce8e3"
        />

        <line
          x1="12"
          y1="53"
          x2="288"
          y2="53"
          stroke="#dce8e3"
        />

        <line
          x1="12"
          y1="88"
          x2="288"
          y2="88"
          stroke="#dce8e3"
        />

        <polyline
          points={obtenerPuntos("cambioPostura")}
          fill="none"
          stroke="#168bca"
          strokeWidth="2.5"
        />

        <polyline
          points={obtenerPuntos("desplazamientoMuneca")}
          fill="none"
          stroke="#e49a36"
          strokeWidth="2.5"
        />

        <line
          x1={puntoActualX}
          y1="10"
          x2={puntoActualX}
          y2="95"
          stroke="#64748b"
          strokeDasharray="3 3"
        />

        <circle
          cx={puntoActualX}
          cy={puntoActualY}
          r="5"
          fill="#168bca"
          stroke="white"
          strokeWidth="2"
        />
      </svg>

      <p>
        Fotograma {indiceSeguro + 1} de {trayectoria.length}
      </p>

      <input
        type="range"
        min={0}
        max={trayectoria.length - 1}
        value={indiceInterpolado}
        onChange={(event) => {
          setReproduciendo(false);
          setIndice(Number(event.target.value));
        }}
        aria-label="Seleccionar fotograma"
      />

<div className="motion-player-controls">

<button
  type="button"
  disabled={indiceSeguro === 0}
  onClick={() => {
    setReproduciendo(false);
    setIndice((actual) => Math.max(0, actual - 1));
  }}
>
  ← Anterior
</button>

<button
  type="button"
  disabled={trayectoria.length < 2}
  onClick={() => {
    if (reproduciendo) {
      setReproduciendo(false);
    } else {
      if (indiceSeguro >= trayectoria.length - 1) {
        setIndice(0);
      }

      setReproduciendo(true);
    }
  }}
>
  {reproduciendo ? "⏸ Pausar" : "▶ Reproducir"}
</button>

<button
  type="button"
  onClick={() => {
    setReproduciendo(false);
    setIndice(0);
  }}
>
  ↺ Reiniciar
</button>

<button
  type="button"
  disabled={indiceSeguro === trayectoria.length - 1}
  onClick={() => {
    setReproduciendo(false);
    setIndice((actual) =>
      Math.min(trayectoria.length - 1, actual + 1)
    );
  }}
>
  Siguiente →
</button>

</div>

<div className="motion-playback-speed">
<label htmlFor="motion-speed">
  Velocidad de reproducción
</label>

<select
  id="motion-speed"
  value={velocidad}
  onChange={(event) => {
    setVelocidad(Number(event.target.value));
  }}
>
  <option value={0.5}>0.5x - Lenta</option>
  <option value={1}>1x - Normal</option>
  <option value={1.5}>1.5x - Rápida</option>
  <option value={2}>2x - Muy rápida</option>
</select>
</div>

<p aria-live="polite">
Estado: {reproduciendo ? "Reproduciendo" : "En pausa"}
</p>

      <p>
        Tiempo: {actual.tiempoMs.toFixed(0)} ms
      </p>

      <p>
        Cambio de postura: {actual.cambioPostura.toFixed(4)}
      </p>

      <p>
        Desplazamiento de muñeca:{" "}
        {actual.desplazamientoMuneca.toFixed(4)}
      </p>

      <small>
        Visualización tridimensional relativa de características
        normalizadas. No representa una medición anatómica
        calibrada ni una traducción lingüística LSC validada.
      </small>
    </div>
  );
}
