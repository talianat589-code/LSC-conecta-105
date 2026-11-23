
export type PosicionMunecaLSC = {
  x: number;
  y: number;
  z: number;
};

export type FotogramaMovimientoGuardado = {
  tiempoMs: number;
  cambioPostura: number;
  desplazamientoMuneca: number;
  caracteristicas: number[];

  // Opcional para conservar compatibilidad con muestras antiguas.
  posicionMuneca?: PosicionMunecaLSC;
};

export type SegmentoMovimientoGuardado = {
  id: string;
  inicio: number;
  fin: number;
  fotogramas: number;
  movimientoMaximo: number;
  trayectoria: FotogramaMovimientoGuardado[];
  lado: "Left" | "Right" | "No identificado";
  estado: "experimental";
  estadoValidacion: "no_validado_linguisticamente";
    // Métricas opcionales de calidad de captura.
    calidadCaptura?: "alta" | "media" | "baja";
    intervaloPromedioMs?: number;
    intervaloMaximoMs?: number;
    frecuenciaPromedioFps?: number;
    porcentajeCaracteristicasValidas?: number;
    observacionesCalidad?: string[];
  reviewStatus?: "pendiente" | "revisada" | "descartada";

  validacionLinguistica?:
    | "pendiente"
    | "validada"
    | "requiere-correccion";

  fechaImportacion?: string;
};

const CLAVE_ALMACENAMIENTO = "lsc-conecta-motion-dataset-v1";
const MAX_SEGMENTOS = 200;

function esNumeroFinito(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor);
}

export function analizarCalidadCaptura(
  trayectoria: FotogramaMovimientoGuardado[]
) {

    const intervalos = trayectoria
      .slice(1)
      .map(
        (fotograma, indice) =>
          fotograma.tiempoMs - trayectoria[indice].tiempoMs
      )
      .filter(
        (intervalo) =>
          Number.isFinite(intervalo) && intervalo > 0
      );
  
    const intervaloPromedioMs =
      intervalos.length > 0
        ? intervalos.reduce((suma, valor) => suma + valor, 0) /
          intervalos.length
        : 0;
  
    const intervaloMaximoMs =
      intervalos.length > 0
        ? Math.max(...intervalos)
        : 0;
  
    const frecuenciaPromedioFps =
      intervaloPromedioMs > 0
        ? 1000 / intervaloPromedioMs
        : 0;
  
    const fotogramasValidos = trayectoria.filter(
      (fotograma) =>
        Array.isArray(fotograma.caracteristicas) &&
        fotograma.caracteristicas.length >= 63 &&
        fotograma.caracteristicas
          .slice(0, 63)
          .every(esNumeroFinito)
    ).length;
  
    const porcentajeCaracteristicasValidas =
      trayectoria.length > 0
        ? (fotogramasValidos / trayectoria.length) * 100
        : 0;
  
    const observacionesCalidad: string[] = [];
  
    if (trayectoria.length < 4) {
      observacionesCalidad.push(
        "La muestra tiene pocos fotogramas."
      );
    }
  
    if (intervalos.length === 0) {
      observacionesCalidad.push(
        "No se pudieron calcular los intervalos temporales."
      );
    }
  
    if (intervaloPromedioMs > 150) {
      observacionesCalidad.push(
        "La separación promedio entre fotogramas es elevada."
      );
    }
  
    if (intervaloMaximoMs > 250) {
      observacionesCalidad.push(
        "Hay pausas prolongadas entre algunos fotogramas."
      );
    }
  
    if (porcentajeCaracteristicasValidas < 95) {
      observacionesCalidad.push(
        "Algunos fotogramas no contienen las 63 características válidas."
      );
    }
  
    let calidadCaptura: "alta" | "media" | "baja";
  
    if (
      trayectoria.length >= 8 &&
      intervaloPromedioMs > 0 &&
      intervaloPromedioMs <= 150 &&
      intervaloMaximoMs <= 250 &&
      porcentajeCaracteristicasValidas >= 95
    ) {
      calidadCaptura = "alta";
    } else if (
      trayectoria.length >= 4 &&
      intervaloPromedioMs > 0 &&
      intervaloPromedioMs <= 220 &&
      intervaloMaximoMs <= 400 &&
      porcentajeCaracteristicasValidas >= 80
    ) {
      calidadCaptura = "media";
    } else {
      calidadCaptura = "baja";
    }
  
    if (observacionesCalidad.length === 0) {
      observacionesCalidad.push(
        "No se detectaron problemas importantes en las métricas básicas."
      );
    }
  
    return {
      calidadCaptura,
      intervaloPromedioMs,
      intervaloMaximoMs,
      frecuenciaPromedioFps,
      porcentajeCaracteristicasValidas,
      observacionesCalidad,
    };
  
  }

  export function validarSegmentoMovimiento(

  valor: unknown
): valor is SegmentoMovimientoGuardado {
  if (!valor || typeof valor !== "object") return false;

  const segmento = valor as SegmentoMovimientoGuardado;

  return (
    typeof segmento.id === "string" &&
    segmento.id.length > 0 &&
    esNumeroFinito(segmento.inicio) &&
    esNumeroFinito(segmento.fin) &&
    esNumeroFinito(segmento.fotogramas) &&
    esNumeroFinito(segmento.movimientoMaximo) &&
    Array.isArray(segmento.trayectoria) &&
    segmento.trayectoria.length > 0 &&
    segmento.trayectoria.every((fotograma) =>
      esNumeroFinito(fotograma.tiempoMs) &&
      esNumeroFinito(fotograma.cambioPostura) &&
      esNumeroFinito(fotograma.desplazamientoMuneca) &&
      Array.isArray(fotograma.caracteristicas) &&
      fotograma.caracteristicas.every(esNumeroFinito) &&
      (
        fotograma.posicionMuneca === undefined ||
        (
          esNumeroFinito(fotograma.posicionMuneca.x) &&
          esNumeroFinito(fotograma.posicionMuneca.y) &&
          esNumeroFinito(fotograma.posicionMuneca.z)
        )
      )
    ) &&
    ["Left", "Right", "No identificado"].includes(segmento.lado) &&
    segmento.estado === "experimental" &&
    segmento.estadoValidacion === "no_validado_linguisticamente" &&
    (
      segmento.calidadCaptura === undefined ||
      ["alta", "media", "baja"].includes(segmento.calidadCaptura)
    ) &&
    (
      segmento.intervaloPromedioMs === undefined ||
      esNumeroFinito(segmento.intervaloPromedioMs)
    ) &&
    (
      segmento.intervaloMaximoMs === undefined ||
      esNumeroFinito(segmento.intervaloMaximoMs)
    ) &&
    (
      segmento.frecuenciaPromedioFps === undefined ||
      esNumeroFinito(segmento.frecuenciaPromedioFps)
    ) &&
    (
      segmento.porcentajeCaracteristicasValidas === undefined ||
      (
        esNumeroFinito(segmento.porcentajeCaracteristicasValidas) &&
        segmento.porcentajeCaracteristicasValidas >= 0 &&
        segmento.porcentajeCaracteristicasValidas <= 100
      )
    ) &&
    (
      segmento.observacionesCalidad === undefined ||
      (
        Array.isArray(segmento.observacionesCalidad) &&
        segmento.observacionesCalidad.every(
          (observacion) => typeof observacion === "string"
        )
      )
    )
  );
}

export function cargarSegmentosMovimiento(): SegmentoMovimientoGuardado[] {
  try {
    const contenido = localStorage.getItem(CLAVE_ALMACENAMIENTO);

    if (!contenido) return [];

    const datos: unknown = JSON.parse(contenido);

    if (!Array.isArray(datos)) return [];

    return datos
      .filter(validarSegmentoMovimiento)
      .slice(0, MAX_SEGMENTOS);
  } catch (error) {
    console.error("No se pudo cargar la biblioteca de movimientos:", error);
    return [];
  }
}

export function guardarSegmentosMovimiento(
  segmentos: SegmentoMovimientoGuardado[]
): boolean {
  try {
    const validos = segmentos
      .filter(validarSegmentoMovimiento)
      .slice(0, MAX_SEGMENTOS);

    localStorage.setItem(
      CLAVE_ALMACENAMIENTO,
      JSON.stringify(validos)
    );

    return true;
  } catch (error) {
    console.error("No se pudo guardar la biblioteca de movimientos:", error);
    return false;
  }
}

export function agregarSegmentoMovimiento(
  actuales: SegmentoMovimientoGuardado[],
  nuevo: SegmentoMovimientoGuardado
): SegmentoMovimientoGuardado[] {
  if (!validarSegmentoMovimiento(nuevo)) return actuales;

  const sinDuplicado = actuales.filter(
    (segmento) => segmento.id !== nuevo.id
  );

  return [nuevo, ...sinDuplicado].slice(0, MAX_SEGMENTOS);
}

export function eliminarSegmentoMovimiento(
  actuales: SegmentoMovimientoGuardado[],
  id: string
): SegmentoMovimientoGuardado[] {
  return actuales.filter((segmento) => segmento.id !== id);
}

export function exportarBibliotecaMovimiento(
  segmentos: SegmentoMovimientoGuardado[]
): string {
  return JSON.stringify(
    {
      proyecto: "LSC Conecta",
      versionFormato: "1.2.0",
      fechaExportacion: new Date().toISOString(),
      tipoDatos: "biblioteca_de_trayectorias_experimentales",
      estadoValidacion: "no_validado_linguisticamente",
      cantidadSegmentos: segmentos.length,
      segmentos,
    },
    null,
    2
  );
}
