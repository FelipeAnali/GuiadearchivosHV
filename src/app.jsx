/* ============================================================================
   CÓDIGO DE LA APP — Documentos de ingreso (Supertiendas Cañaveral)
   ----------------------------------------------------------------------------
   Este archivo es la FUENTE del código de la app. La configuración (cargos,
   documentos, textos, links) NO está aquí: está en index.html, bloque CONFIGURACIÓN.

   Después de cambiar este archivo hay que compilarlo para que llegue a index.html:
       npm install        (solo la primera vez)
       npm run compilar
   Guía paso a paso: GUIA.md. Cómo funciona por dentro: COMO_FUNCIONA.md.

   QUÉ USA
     React 18 (pantallas), JSZip (arma el ZIP) y pdf.js (lee los PDF). Se cargan
     desde internet en index.html; aquí se usan como React, JSZip y pdfjsLib.
     No hay servidor: todo pasa en el navegador del candidato.

   MAPA DE ESTE ARCHIVO (en este orden)
     1. GUARDADO LOCAL       Guardar / leer / borrar el avance en el navegador (IndexedDB).
     2. FUNCIONES DE APOYO   Lógica sin pantallas:
          2.1 Textos y formatos
          2.2 Cargos y documentos que aplican a cada candidato
          2.3 Revisión de los PDF
          2.4 Revisión de la foto 3×4
          2.5 Armado del ZIP y descargas
     3. DATOS DE PRUEBA      Modo ?prueba=1.
     4. INACTIVIDAD          Borrado automático en dispositivos prestados.
     5. PANTALLAS            Lo que ve el candidato:
          5.1 Piezas comunes (encabezado, avisos, paneles de PC)
          5.2 Pantallas 1 a 4 (Inicio → Datos → Documentos → Envío)
          5.3 Tutoriales y ventanas emergentes
          5.4 Pantalla final
     6. APP PRINCIPAL        Decide qué pantalla mostrar, guarda cada cambio y arranca la app.

   PALABRAS QUE SE REPITEN
     sesion   Todo el avance del candidato: { datos, archivos, expira, ... } (ver sesionNueva).
     doc      Un documento de la CONFIGURACIÓN (ej. la cédula), con sus reglas de revisión.
     item     Un archivo ya aceptado: { nombre, blob, huella, revisado, ... }.
     puesto   Una fila de la lista de cargos: { cargo, seccion, manipulacion }.
   ============================================================================ */
const { useState, useEffect, useRef, useMemo } = React;
/** Configuración editable (bloque CONFIGURACIÓN de index.html). */
const CONFIG = window.CONFIG;
/** Logo de Cañaveral en texto (base64), también definido en index.html. */
const LOGO = window.LOGO_CANAVERAL;

/* ============================================================================
   1. GUARDADO LOCAL (IndexedDB)
   ----------------------------------------------------------------------------
   IndexedDB es una "base de datos" que trae el navegador. Todo lo que se guarda
   aquí queda SOLO en el celular/computador del candidato: no viaja a internet.
   Guardamos un único registro llamado "actual" con toda la sesión.
   ============================================================================ */
const BD = {
  nombre: 'canaveral_documentos_ingreso',
  almacen: 'sesion',
  clave: 'actual',

  /** Abre (o crea) la base de datos local. */
  abrir() {
    return new Promise((resolver, rechazar) => {
      if (!window.indexedDB) return rechazar(new Error('Este navegador no permite guardar datos.'));
      const solicitud = indexedDB.open(this.nombre, 1);
      solicitud.onupgradeneeded = () => solicitud.result.createObjectStore(this.almacen);
      solicitud.onsuccess = () => resolver(solicitud.result);
      solicitud.onerror = () => rechazar(solicitud.error);
    });
  },

  /** Ejecuta una operación ('readonly' o 'readwrite') sobre el almacén. */
  async operar(modo, accion) {
    const bd = await this.abrir();
    return new Promise((resolver, rechazar) => {
      const transaccion = bd.transaction(this.almacen, modo);
      const solicitud = accion(transaccion.objectStore(this.almacen));
      transaccion.oncomplete = () => { bd.close(); resolver(solicitud && solicitud.result); };
      transaccion.onerror = () => { bd.close(); rechazar(transaccion.error); };
    });
  },

  leer()         { return this.operar('readonly',  (a) => a.get(this.clave)); },
  guardar(valor) { return this.operar('readwrite', (a) => a.put(valor, this.clave)); },
  borrar()       { return this.operar('readwrite', (a) => a.delete(this.clave)); },
};

/* ============================================================================
   2. FUNCIONES DE APOYO (no dibujan nada en pantalla)
   ============================================================================ */

/* ---------------------------------------------------------------------------
   2.1 TEXTOS Y FORMATOS
   --------------------------------------------------------------------------- */

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** "1 documento" / "3 documentos". */
function plural(cantidad, singular, pluralTexto) {
  return `${cantidad} ${cantidad === 1 ? singular : pluralTexto}`;
}

/** Peso legible: 845 KB, 2,4 MB. */
function pesoLegible(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString('es-CO', { maximumFractionDigits: 1 })} MB`;
}

/** Fecha legible: "12 de noviembre". */
function fechaLegible(ms) {
  return new Date(ms).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
}

/**
 * Convierte un texto en algo seguro para nombre de archivo:
 * "María José Peña" → "MARIA_JOSE_PENA". Quita tildes, ñ y símbolos.
 */
function textoParaArchivo(texto, maximo = 40) {
  const limpio = (texto || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes (la ñ queda como n)
    .replace(/[^A-Za-z0-9]+/g, '_')                     // todo lo raro → guion bajo
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  if (limpio.length <= maximo) return limpio;
  // Si es muy largo, se corta en la última palabra completa (no deja "VILLEGAS_D").
  const cortado = limpio.slice(0, maximo);
  const ultimoGuion = cortado.lastIndexOf('_');
  return (ultimoGuion > 0 ? cortado.slice(0, ultimoGuion) : cortado).replace(/_+$/g, '');
}

/** Texto en mayúsculas, sin tildes ni espacios dobles: sirve para comparar y buscar. */
function normalizar(texto) {
  return (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
}

/* ---------------------------------------------------------------------------
   2.2 CARGOS Y DOCUMENTOS QUE APLICAN A CADA CANDIDATO
   La lista de cargos viene de CONFIG.cargosTexto (pegada desde Excel). Según el
   cargo, la sección y si es su primer empleo, cambia la lista de documentos.
   --------------------------------------------------------------------------- */

/**
 * Convierte el texto pegado desde Excel (CARGO, SECCIÓN, MANIPULACIÓN separados por
 * tabulación o por ;) en una lista de puestos: [{ cargo, seccion, manipulacion }].
 * Ignora líneas vacías y la fila de encabezado si alguien la pega.
 */
function leerPuestos(texto) {
  const equivalencias = { NO: 'no', GENERAL: 'general', DECRETO1500: 'decreto1500' };
  return (texto || '')
    .split(/\r?\n/)
    .map((linea) => linea.split(/\t|;/).map((celda) => celda.trim()))
    .filter(([cargo, seccion]) => cargo && seccion && normalizar(cargo) !== 'CARGO')
    .map(([cargo, seccion, manipulacion]) => ({
      cargo,
      seccion,
      manipulacion: equivalencias[normalizar(manipulacion).replace(/\s/g, '')] || 'no',
    }));
}

/** Todos los puestos (cargo + sección) de la CONFIGURACIÓN. */
const PUESTOS = leerPuestos(CONFIG.cargosTexto);
/** Nombres de cargo sin repetir y en orden alfabético (para el buscador). */
const CARGOS_UNICOS = [...new Set(PUESTOS.map((p) => p.cargo))].sort((a, b) => a.localeCompare(b, 'es'));

/** Secciones donde existe un cargo. */
function seccionesDelCargo(cargo) {
  return PUESTOS.filter((p) => p.cargo === cargo).map((p) => p.seccion).sort((a, b) => a.localeCompare(b, 'es'));
}

/** Busca la combinación cargo + sección. */
function buscarPuesto(cargo, seccion) {
  return PUESTOS.find((p) => p.cargo === cargo && p.seccion === seccion) || null;
}

/**
 * Buscador de cargos: devuelve los que contienen TODAS las palabras escritas,
 * sin importar tildes ni mayúsculas ("aux fruver" encuentra "AUXILIAR DE FRUVER").
 * Primero los que empiezan por la primera palabra.
 */
function buscarCargos(texto, limite = 8) {
  const palabras = normalizar(texto).split(' ').filter(Boolean);
  if (palabras.length === 0) return [];
  const empiezaIgual = (c) => (normalizar(c).startsWith(palabras[0]) ? 0 : 1);
  return CARGOS_UNICOS
    .filter((c) => palabras.every((p) => normalizar(c).includes(p)))
    .sort((a, b) => empiezaIgual(a) - empiezaIgual(b) || a.localeCompare(b, 'es'))
    .slice(0, limite);
}

/**
 * Devuelve solo los documentos que aplican al candidato:
 *   - según su cargo y sección (manipulación de alimentos), y
 *   - según si es su primer empleo: no se piden pensión ni referencia laboral,
 *     y en cambio se piden referencias personales.
 */
function documentosQueAplican(datos) {
  const puesto = buscarPuesto(datos.cargo, datos.seccion);
  return CONFIG.documentos.filter((doc) => {
    if (doc.omitirSiPrimerEmpleo && datos.primerEmpleo) return false;
    if (doc.soloSiPrimerEmpleo && !datos.primerEmpleo) return false;
    if (doc.requerido !== 'segunCargo') return true;
    return puesto && puesto.manipulacion !== 'no';
  });
}

/** Texto de ayuda del documento; cambia para puestos bajo Decreto 1500. */
function ayudaDelDocumento(doc, datos) {
  const puesto = buscarPuesto(datos.cargo, datos.seccion);
  if (doc.ayudaDecreto1500 && puesto && puesto.manipulacion === 'decreto1500') return doc.ayudaDecreto1500;
  return doc.ayuda;
}

/* ---------------------------------------------------------------------------
   2.3 REVISIÓN DE LOS PDF
   Flujo: revisarArchivo() → (huellaDelArchivo, leerPdf) → acepta o devuelve un mensaje.
   Si el PDF tiene texto se revisa el contenido; si es escaneado, el nombre del archivo.
   --------------------------------------------------------------------------- */

// pdf.js trabaja con un "ayudante" en segundo plano (worker) que se carga del mismo sitio.
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = window.PDF_DESDE_RESPALDO
    ? 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
    : 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/**
 * Huella digital del archivo (SHA-256): dos archivos idénticos tienen la misma huella.
 * Sirve para detectar que suban el mismo PDF en dos documentos distintos.
 */
async function huellaDelArchivo(archivo, bytesYaLeidos) {
  try {
    const bytes = bytesYaLeidos || await archivo.arrayBuffer();
    const resumen = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(resumen)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return `${archivo.size}-${archivo.name}`; // respaldo si el navegador no permite calcularla
  }
}

/**
 * Abre el PDF con pdf.js: cuenta las páginas, saca el texto de las primeras 3 y
 * mira si traen alguna imagen (foto o escaneo).
 * Si el PDF tiene contraseña, prueba con la cédula del candidato (casi todos los
 * certificados de EPS y fondos de pensión usan la cédula como clave).
 * Devuelve { paginas, texto, tieneImagen, claveEsCedula },
 * { protegido: true } si tiene una contraseña distinta (no se puede leer, pero se acepta)
 * o { error } si está dañado.
 * Si pdf.js no cargó (sin internet), devuelve { paginas: null } y no bloquea.
 */
async function leerPdf(bytes, cedula) {
  if (!window.pdfjsLib) return { paginas: null, texto: '', tieneImagen: null };

  // Cada intento recibe su propia copia de los bytes (pdf.js se queda con la que recibe).
  let tarea = null;
  const abrir = (clave) => {
    if (tarea) tarea.destroy();
    tarea = pdfjsLib.getDocument({ data: new Uint8Array(bytes.slice(0)), password: clave });
    return tarea.promise;
  };

  try {
    let pdf;
    let claveEsCedula = false;
    try {
      pdf = await abrir(undefined);
    } catch (e) {
      if (!(e && e.name === 'PasswordException' && cedula)) throw e;
      pdf = await abrir(cedula); // segundo intento: la cédula como contraseña
      claveEsCedula = true;
    }
    // 1) Texto de las primeras 3 páginas (es lo rápido)
    const paginasARevisar = Math.min(pdf.numPages, 3);
    let texto = '';
    for (let n = 1; n <= paginasARevisar; n++) {
      const pagina = await pdf.getPage(n);
      const contenido = await pagina.getTextContent();
      texto += ' ' + contenido.items.map((item) => item.str).join(' ');
      pagina.cleanup();
    }
    // 2) Buscar imágenes es lento: solo se hace si casi no hay texto (escaneo o PDF en blanco)
    let tieneImagen = null;
    if (texto.replace(/[^A-Za-z0-9]/g, '').length < 30) {
      const OPS = pdfjsLib.OPS;
      const dibujosDeImagen = [OPS.paintImageXObject, OPS.paintInlineImageXObject,
                               OPS.paintImageMaskXObject, OPS.paintJpegXObject].filter(Boolean);
      tieneImagen = false;
      for (let n = 1; n <= paginasARevisar && !tieneImagen; n++) {
        const pagina = await pdf.getPage(n);
        const operaciones = await pagina.getOperatorList();
        tieneImagen = operaciones.fnArray.some((op) => dibujosDeImagen.includes(op));
        pagina.cleanup();
      }
    }
    return { paginas: pdf.numPages, texto, tieneImagen, claveEsCedula };
  } catch (e) {
    // Tiene una contraseña que no es la cédula: al candidato le cuesta quitarla,
    // así que se acepta sin revisar el contenido y lo revisa Gestión Humana.
    if (e && e.name === 'PasswordException') return { protegido: true, paginas: null, texto: '', tieneImagen: null };
    if (e && (e.name === 'InvalidPDFException' || e.name === 'MissingPDFException')) {
      return { error: 'El PDF está dañado y no se puede abrir. Vuelve a generarlo.' };
    }
    return { paginas: null, texto: '', tieneImagen: null }; // otro problema técnico: no bloqueamos al candidato
  } finally {
    // Libera la memoria del PDF (importante en celulares con poca memoria)
    if (tarea) tarea.destroy();
  }
}

/**
 * Revisa que el NOMBRE del archivo diga qué documento es.
 * "Acta de Bachiller.pdf" → palabras ACTA, DE, BACHILLER, PDF → coincide con "BACHILLER".
 * Cada palabra del nombre se compara por su comienzo ("TECNIC" sirve para TÉCNICO y TÉCNICA).
 */
function nombreIdentificaDocumento(nombreArchivo, palabrasClave) {
  if (!palabrasClave || palabrasClave.length === 0) return true;
  const palabrasDelNombre = normalizar(nombreArchivo.replace(/\.pdf$/i, '')).split(/[^A-Z0-9]+/).filter(Boolean);
  return palabrasDelNombre.some((palabra) => palabrasClave.some((clave) => palabra.startsWith(clave)));
}

/**
 * ¿El texto del PDF se parece más a OTRO documento que a este?
 * Cuenta las palabras "distintivas" de cada documento que aparecen en el texto.
 * Devuelve el documento al que más se parece (si gana claramente), o null.
 */
function pareceOtroDocumento(texto, doc) {
  const puntaje = (d) => ((d.revision && d.revision.distintivas) || []).filter((p) => texto.includes(p)).length;
  const propio = puntaje(doc);
  let mejor = null;
  let mejorPuntaje = 0;
  for (const otro of CONFIG.documentos) {
    if (otro.id === doc.id || otro.tipo === 'imagen') continue;
    const p = puntaje(otro);
    if (p > mejorPuntaje) { mejor = otro; mejorPuntaje = p; }
  }
  // Solo se rechaza si es claro: el PDF no trae NINGUNA palabra propia de este documento,
  // o trae al menos 2 palabras más del otro. Así no se rechazan documentos buenos que
  // mencionan de pasada otro tema (ej. una referencia laboral que dice "afiliado a pensión").
  const claro = mejorPuntaje > propio && (propio === 0 || mejorPuntaje >= propio + 2);
  return claro ? mejor : null;
}

/**
 * Revisa un archivo antes de aceptarlo para un documento:
 *   1. Que sea un PDF real, no vacío y no muy pesado.
 *   2. Que no sea el mismo archivo ya subido en otro documento.
 *   3. Que no tenga más páginas de las esperadas.
 *   4. Que no esté en blanco: debe traer texto o una imagen (foto/escaneo).
 *   5. Si el PDF tiene texto: que tenga alguna palabra clave del documento y que no
 *      se parezca más a otro documento (ej. el certificado de pensión subido como EPS).
 *   6. Si el PDF es escaneado o tiene clave (no se puede leer): el NOMBRE del archivo
 *      debe decir qué documento es (ej. "acta_bachiller.pdf"). Queda para revisión de GH.
 * Devuelve { error } si no se acepta, o { item } con el archivo listo para guardar.
 */
async function revisarArchivo(archivo, doc, cedula, archivosActuales) {
  if (!archivo) return { error: 'No se seleccionó ningún archivo.' };
  if (archivo.size === 0) return { error: 'El archivo está vacío. Vuelve a generarlo e inténtalo otra vez.' };
  const maximo = CONFIG.tamanoMaximoMB * 1024 * 1024;
  if (archivo.size > maximo) {
    return {
      error: `Pesa ${pesoLegible(archivo.size)} y el máximo es ${CONFIG.tamanoMaximoMB} MB. Comprímelo gratis y vuelve a subirlo.`,
      comprimir: true,
    };
  }
  // Todo PDF real tiene la marca "%PDF-" al inicio (no basta con que el nombre termine en .pdf)
  const inicio = await archivo.slice(0, 1024).text();
  if (!inicio.includes('%PDF-')) {
    return { error: 'Ese archivo no es un PDF. Si tienes una foto, conviértela a PDF antes de subirla.' };
  }

  // El archivo se lee UNA sola vez y esos bytes se usan para la huella y para pdf.js
  const bytes = await archivo.arrayBuffer();

  // ¿Ya subió este mismo archivo en otro documento (o en este)?
  const huella = await huellaDelArchivo(archivo, bytes);
  for (const otro of CONFIG.documentos) {
    if ((archivosActuales[otro.id] || []).some((item) => item.huella === huella)) {
      return { error: otro.id === doc.id
        ? 'Ya subiste este mismo archivo aquí.'
        : `Este mismo archivo ya lo subiste en "${otro.nombre}". Cada documento va en su lugar.` };
    }
  }

  const reglas = doc.revision || {};
  const lectura = await leerPdf(bytes, cedula);
  if (lectura.error) return { error: lectura.error };

  if (reglas.paginasMax && lectura.paginas && lectura.paginas > reglas.paginasMax) {
    return { error: `Tiene ${lectura.paginas} páginas y este documento debe tener máximo ${reglas.paginasMax}. Revisa que sea el documento correcto.` };
  }

  // Solo se puede revisar el contenido si el PDF tiene texto (no es una foto escaneada)
  const texto = normalizar(lectura.texto);
  const tieneTexto = texto.replace(/[^A-Z0-9]/g, '').length >= 30;
  const leido = lectura.paginas !== null; // false si tiene contraseña o pdf.js no pudo revisar (no bloqueamos)

  if (leido && !tieneTexto && !lectura.tieneImagen) {
    return { error: 'El PDF está en blanco: no tiene texto ni imagen. Revisa que sea el archivo correcto.' };
  }

  if (tieneTexto) {
    // Se puede leer: se revisa el CONTENIDO (el nombre del archivo da igual)
    if (reglas.palabras && !reglas.palabras.some((p) => texto.includes(p))) {
      return { error: `Este archivo no parece ser "${doc.nombre}". Revisa que estés subiendo el documento correcto.` };
    }
    const otro = pareceOtroDocumento(texto, doc);
    if (otro) {
      return { error: `Este archivo parece ser "${otro.nombre}", no "${doc.nombre}". Revisa que lo estés subiendo en el lugar correcto.` };
    }
  } else if (!nombreIdentificaDocumento(archivo.name, reglas.nombreArchivo)) {
    // No se puede leer (escaneado o con clave): el nombre del archivo es la única pista
    const motivo = lectura.protegido ? 'tiene contraseña' : 'es escaneado (una foto del documento)';
    return { error: `Este PDF ${motivo}, así que no podemos leer qué documento es. Cámbiale el nombre para que lo diga, por ejemplo: "${reglas.ejemploNombre}".` };
  }

  return {
    item: {
      nombre: archivo.name, tamano: archivo.size, blob: archivo, fecha: Date.now(), huella,
      paginas: lectura.paginas,
      revisado: tieneTexto,        // true = se leyó y pasó la revisión automática
      // ¿El texto trae el número de documento del candidato? (los certificados de EPS y pensión lo traen)
      // Solo se mira en los documentos que siempre lo traen (revision.traeCedula)
      mencionaCedula: tieneTexto && reglas.traeCedula ? texto.replace(/[^0-9]/g, '').includes(cedula) : null,
      protegido: !!lectura.protegido, // true = tiene contraseña que no es la cédula, no se pudo revisar
      claveEsCedula: !!lectura.claveEsCedula, // true = tenía contraseña y era la cédula (se revisó igual)
    },
  };
}

/* ---------------------------------------------------------------------------
   2.4 REVISIÓN DE LA FOTO 3×4 (único documento que se sube como imagen)
   Flujo: revisarImagen() → (esJpgOPng, abrirImagen, analizarFondo) → comprimirImagen()
   --------------------------------------------------------------------------- */

/** ¿Es una imagen JPG o PNG de verdad? Se mira la "firma" de los primeros bytes. */
async function esJpgOPng(archivo) {
  const b = new Uint8Array(await archivo.slice(0, 4).arrayBuffer());
  const esJpg = b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
  const esPng = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;
  return esJpg || esPng;
}

/** Abre una imagen para poder medirla y dibujarla. Respeta la rotación de las fotos del celular. */
async function abrirImagen(archivo) {
  if (window.createImageBitmap) {
    try { return await createImageBitmap(archivo, { imageOrientation: 'from-image' }); } catch { /* sigue abajo */ }
  }
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolver(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rechazar(new Error('imagen ilegible')); };
    img.src = url;
  });
}

/**
 * Achica la imagen (lado más largo = maximo px) y la guarda como JPG.
 * Una foto de celular de 4 MB queda en unos 200–400 KB.
 */
function comprimirImagen(imagen, maximo, calidad, fondo) {
  const escala = Math.min(1, maximo / Math.max(imagen.width, imagen.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(imagen.width * escala);
  lienzo.height = Math.round(imagen.height * escala);
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = '#FFFFFF'; // por si la imagen PNG trae partes transparentes
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  if (fondo) aclararFondo(ctx, lienzo.width, lienzo.height, fondo);
  return new Promise((resolver) => lienzo.toBlob((blob) => resolver({ blob, ancho: lienzo.width, alto: lienzo.height }), 'image/jpeg', calidad));
}

/**
 * Mira el fondo de la foto: una franja delgada en los bordes (laterales y arriba; abajo
 * suele ir la ropa). Devuelve su color promedio, qué tan claro es y qué tanto color tiene.
 */
function analizarFondo(imagen) {
  const lienzo = document.createElement('canvas');
  lienzo.width = 60; lienzo.height = 80;
  const ctx = lienzo.getContext('2d');
  ctx.drawImage(imagen, 0, 0, 60, 80);
  const { data } = ctx.getImageData(0, 0, 60, 80);
  let r = 0, g = 0, b = 0, cuenta = 0;
  for (let y = 0; y < 80; y++) {
    for (let x = 0; x < 60; x++) {
      if (!(x < 4 || x >= 56 || y < 4)) continue;
      const i = (y * 60 + x) * 4;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; cuenta++;
    }
  }
  r /= cuenta; g /= cuenta; b /= cuenta;
  const maximo = Math.max(r, g, b);
  return {
    r, g, b,
    brillo: (r + g + b) / 3,                               // 0 = negro, 255 = blanco
    color: maximo > 0 ? (maximo - Math.min(r, g, b)) / maximo : 0, // 0 = gris/blanco, 1 = color puro
  };
}

/**
 * Aclara la foto para que el fondo quede blanco: si la pared salió gris (poca luz)
 * o amarillenta (bombillo cálido), sube cada color lo justo para que el fondo quede
 * casi blanco. Trabaja sobre el lienzo ya achicado.
 */
function aclararFondo(ctx, ancho, alto, fondo) {
  const objetivo = 245;
  const ganancia = (c) => Math.min(2.2, Math.max(1, objetivo / Math.max(c, 1)));
  const gr = ganancia(fondo.r), gg = ganancia(fondo.g), gb = ganancia(fondo.b);
  if (gr < 1.03 && gg < 1.03 && gb < 1.03) return; // ya está bien
  const datos = ctx.getImageData(0, 0, ancho, alto);
  const d = datos.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.min(255, d[i] * gr);
    d[i + 1] = Math.min(255, d[i + 1] * gg);
    d[i + 2] = Math.min(255, d[i + 2] * gb);
  }
  ctx.putImageData(datos, 0, 0);
}

/**
 * Revisa la foto 3×4 (se sube como imagen, no como PDF):
 * JPG o PNG real, no repetida, tamaño mínimo, vertical y con fondo claro.
 * Si pasa, la entrega comprimida en JPG.
 */
async function revisarImagen(archivo, doc, archivosActuales) {
  if (!archivo || archivo.size === 0) return { error: 'El archivo está vacío. Vuelve a elegir la foto.' };
  if (archivo.size > CONFIG.tamanoMaximoMB * 4 * 1024 * 1024) {
    return { error: `La foto pesa ${pesoLegible(archivo.size)}. Elige una más liviana.` };
  }
  if (!(await esJpgOPng(archivo))) {
    return { error: 'La foto debe ser una imagen JPG o PNG (no PDF ni otro formato).' };
  }

  const huella = await huellaDelArchivo(archivo);
  for (const otro of CONFIG.documentos) {
    if ((archivosActuales[otro.id] || []).some((item) => item.huella === huella)) {
      return { error: otro.id === doc.id ? 'Ya subiste esta misma foto.' : `Esta misma imagen ya la usaste en "${otro.nombre}".` };
    }
  }

  let imagen;
  try { imagen = await abrirImagen(archivo); } catch {
    return { error: 'No pudimos abrir la imagen. Tómala de nuevo o elige otra.' };
  }
  const { anchoMinimo, altoMinimo } = CONFIG.foto;
  if (imagen.width < anchoMinimo || imagen.height < altoMinimo) {
    return { error: `La foto es muy pequeña (${imagen.width}×${imagen.height}). Debe medir al menos ${anchoMinimo}×${altoMinimo} píxeles.` };
  }
  if (imagen.width > imagen.height) {
    return { error: 'La foto debe ser vertical (más alta que ancha), como una foto tipo documento.' };
  }
  const fondo = analizarFondo(imagen);
  if (fondo.color > CONFIG.foto.colorMaximoFondo) {
    return { error: 'El fondo de la foto tiene color. Debe ser blanco: tómala frente a una pared blanca.' };
  }
  if (fondo.brillo < CONFIG.foto.brilloMinimoFondo) {
    return { error: 'La foto está muy oscura. Tómala de día cerca de una ventana o con la luz encendida, frente a una pared blanca.' };
  }

  // Si el fondo salió gris o amarillento por la luz, se aclara solo para que quede blanco
  const { blob } = await comprimirImagen(imagen, 1200, 0.88, fondo);
  return {
    item: {
      nombre: archivo.name, tamano: blob.size, blob, fecha: Date.now(), huella,
      extension: 'jpg',
      revisado: true,
    },
  };
}

/* ---------------------------------------------------------------------------
   2.5 ARMADO DEL ZIP Y DESCARGAS
   Nombres estándar, datos_candidato.json, 00_LEEME_REVISION.txt y descarga.
   --------------------------------------------------------------------------- */

/**
 * Nombre estándar de cada archivo dentro del ZIP:
 *   1144123456_02_CEDULA.pdf
 *   1144123456_03_DIPLOMAS_2.pdf   (cuando hay varios)
 *   1144123456_01_FOTO.jpg         (la foto va como imagen)
 */
function nombreArchivoEnZip(cedula, doc, item, indice, total) {
  const sufijo = total > 1 ? `_${indice + 1}` : '';
  const extension = item.extension || 'pdf';
  return `${cedula}_${doc.codigo}_${textoParaArchivo(doc.id)}${sufijo}.${extension}`;
}

/** Nombre del ZIP: 1144123456_MARIA_JOSE_PENA_AUXILIAR_DE_FRUVER.zip */
function nombreDelZip(datos) {
  return `${datos.cedula}_${textoParaArchivo(datos.nombre, 40)}_${textoParaArchivo(datos.cargo, 30)}.zip`;
}

/**
 * Arma el ZIP con los archivos renombrados y un archivo "datos_candidato.json".
 * Ese JSON lo usará el panel de Gestión Humana para reconocer al candidato
 * por su cédula.
 */
async function armarZip(sesion) {
  const zip = new JSZip();
  const { datos, archivos } = sesion;
  const listado = [];
  const resumen = []; // para el archivo de texto 00_LEEME_REVISION.txt

  documentosQueAplican(datos).forEach((doc) => {
    const lista = archivos[doc.id] || [];
    lista.forEach((item, i) => {
      const nombre = nombreArchivoEnZip(datos.cedula, doc, item, i, lista.length);
      zip.file(nombre, item.blob);
      // revisado/protegido le dicen a Gestión Humana qué archivos debe mirar con más cuidado
      listado.push({ documento: doc.id, archivo: nombre, nombreOriginal: item.nombre,
                     revisadoAutomaticamente: !!item.revisado,
                     conContrasena: !!item.protegido || !!item.claveEsCedula,
                     contrasenaEsCedula: !!item.claveEsCedula,
                     traeNumeroDocumento: item.mencionaCedula === undefined ? null : item.mencionaCedula });
      resumen.push({ doc, nombre, item });
    });
  });

  zip.file('datos_candidato.json', JSON.stringify({
    version: 1,
    cedula: datos.cedula,
    nombre: datos.nombre,
    cargo: datos.cargo,
    seccion: datos.seccion,
    primerEmpleo: !!datos.primerEmpleo,
    autorizacionDatos: sesion.autorizacion,
    generado: new Date().toISOString(),
    archivos: listado,
  }, null, 2));

  zip.file('00_LEEME_REVISION.txt', textoDeRevision(sesion, resumen));

  // Los PDF ya vienen comprimidos; "STORE" evita gastar tiempo y batería del celular.
  return zip.generateAsync({ type: 'blob', compression: 'STORE' });
}

/**
 * Resumen en texto para Gestión Humana: qué revisó la página en cada archivo y cuáles
 * hay que mirar a mano. Va dentro del ZIP como 00_LEEME_REVISION.txt.
 */
function textoDeRevision(sesion, resumen) {
  const { datos } = sesion;
  const lineas = [
    'DOCUMENTOS DE INGRESO — Supertiendas Cañaveral S.A.S.',
    '',
    `Nombre:        ${datos.nombre}`,
    `Documento:     ${datos.cedula}`,
    `Cargo:         ${datos.cargo}`,
    `Sección:       ${datos.seccion}`,
    `Primer empleo: ${datos.primerEmpleo ? 'Sí' : 'No'}`,
    `Generado:      ${new Date().toLocaleString('es-CO')}`,
    '',
    'REVISIÓN DE CADA ARCHIVO',
    '------------------------',
  ];
  let porRevisar = 0;
  resumen.forEach(({ doc, nombre, item }) => {
    let estado;
    if (doc.tipo === 'imagen') estado = 'OK — foto revisada (tamaño, vertical y fondo claro).';
    else if (item.protegido) { estado = 'REVISAR A MANO — tiene contraseña y no se pudo leer.'; porRevisar++; }
    else if (!item.revisado) { estado = 'REVISAR A MANO — es escaneado (imagen), no se pudo leer el texto.'; porRevisar++; }
    else {
      estado = 'OK — el contenido corresponde al documento.';
      if (item.mencionaCedula === false) {
        estado += ' OJO: no trae el número de documento del candidato, confirmar que sea suyo.';
        porRevisar++;
      }
    }
    lineas.push(`${nombre}`, `   ${doc.nombre} (archivo original: ${item.nombre})`, `   ${estado}`, '');
  });
  lineas.push(
    porRevisar === 0 ? 'No hay archivos marcados para revisar a mano.' : `Archivos para revisar a mano: ${porRevisar}.`,
    '',
    'LO QUE LA PÁGINA NO REVISA (siempre a mano):',
    '- Que los certificados estén vigentes y firmados.',
    '- Que la foto sea realmente de la persona.',
    '- La revisión automática busca palabras clave: un documento con un formato muy raro',
    '  podría pasar sin ser el correcto. Dale una mirada rápida a cada archivo.',
  );
  return lineas.join('\r\n'); // \r\n para que se vea bien en el Bloc de notas de Windows
}

/** Descarga un archivo al dispositivo del candidato. */
function descargarArchivo(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
}

/** Abre un PDF en otra pestaña para que el candidato lo revise. */
function verArchivo(blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
}

/** Crea una sesión nueva y vacía. */
function sesionNueva(dispositivoPersonal, primerEmpleo) {
  const ahora = Date.now();
  return {
    version: 1,
    creado: ahora,
    expira: ahora + CONFIG.diasConservacion * MS_POR_DIA,
    dispositivoPersonal,
    primerEmpleo,   // respuesta a "¿Es tu primer empleo?" (se copia a datos al guardar los datos)
    autorizacion: { aceptada: true, fecha: new Date(ahora).toISOString() },
    datos: null,    // { nombre, cedula, cargo, seccion, primerEmpleo }
    archivos: {},   // { idDocumento: [ { nombre, tamano, blob, fecha } ] }
  };
}

/* ============================================================================
   3. DATOS DE PRUEBA (solo con ?prueba=1 en la dirección)
   ----------------------------------------------------------------------------
   Sirven para ver cómo se comporta la página con casos difíciles sin tener
   documentos reales. No se guardan en ningún lado.
   ============================================================================ */
const MODO_PRUEBA = new URLSearchParams(location.search).has('prueba');

/** Crea un PDF mínimo de mentira (solo para el modo prueba). */
function pdfFalso(nombre) {
  return new File(['%PDF-1.4\n% archivo de prueba\n'], nombre, { type: 'application/pdf' });
}

/**
 * Arma una sesión de prueba lista en la pantalla de documentos.
 * tipo 'extremo' = nombre y cargo largos, nombres de archivo enormes, 3 diplomas, uno pendiente.
 * tipo 'vacio'   = nombre de 2 letras y ningún documento subido.
 */
function sesionDePrueba(tipo) {
  const s = sesionNueva(false);
  s.esPrueba = true;
  if (tipo === 'vacio') {
    s.datos = { nombre: 'Jo', cedula: '12345', cargo: 'AUXILIAR DE BODEGA', seccion: 'BODEGA' };
    return s;
  }
  // Caso extremo: nombre largo, cargo largo, nombres de archivo larguísimos, varios diplomas.
  s.datos = {
    nombre: 'María de los Ángeles Restrepo Villegas de Castañeda',
    cedula: '1144123456',
    cargo: 'COORDINADOR DE PANADERIA Y RESTAURANTE',
    seccion: 'PANADERIA Y RESTAURANTE',
  };
  const largo = 'certificado_escaneado_desde_el_celular_con_camscanner_version_final_definitiva_2026.pdf';
  CONFIG.documentos.forEach((doc, i) => {
    if (doc.id === 'pension') return; // dejamos uno pendiente a propósito
    const cantidad = doc.variosArchivos ? 3 : 1;
    s.archivos[doc.id] = Array.from({ length: cantidad }, (_, j) => {
      // La foto de prueba lleva nombre de imagen; los demás, nombres de PDF (el primero larguísimo)
      const nombre = doc.tipo === 'imagen' ? 'IMG_20261105_093012_foto_carnet.jpg' : (i === 1 ? largo : `${doc.id}_${j + 1}.pdf`);
      const f = pdfFalso(nombre);
      return { nombre: f.name, tamano: 2400000, blob: f, fecha: Date.now(), extension: doc.tipo === 'imagen' ? 'jpg' : 'pdf' };
    });
  });
  return s;
}

/* ============================================================================
   4. LIMPIEZA POR INACTIVIDAD (solo dispositivos prestados o públicos)
   ----------------------------------------------------------------------------
   Si nadie toca la página en X minutos, se borra todo. Un minuto antes avisa.
   ============================================================================ */
function useInactividad(activo, minutos, alVencer) {
  const [segundosRestantes, setSegundosRestantes] = useState(null);
  const ultimaActividad = useRef(Date.now());
  const alVencerRef = useRef(alVencer);
  alVencerRef.current = alVencer; // siempre la versión más reciente

  useEffect(() => {
    if (!activo) { setSegundosRestantes(null); return; }
    ultimaActividad.current = Date.now();

    // Cualquier toque, tecla o scroll reinicia el conteo y esconde el aviso
    const marcarActividad = () => { ultimaActividad.current = Date.now(); setSegundosRestantes(null); };
    const eventos = ['pointerdown', 'keydown', 'scroll'];
    eventos.forEach((e) => window.addEventListener(e, marcarActividad, { passive: true }));

    const reloj = setInterval(() => {
      const restanteMs = minutos * 60 * 1000 - (Date.now() - ultimaActividad.current);
      if (restanteMs <= 0) {
        ultimaActividad.current = Date.now();
        alVencerRef.current();
      } else if (restanteMs <= 60 * 1000) {
        setSegundosRestantes(Math.ceil(restanteMs / 1000));
      }
    }, 1000);

    return () => {
      eventos.forEach((e) => window.removeEventListener(e, marcarActividad));
      clearInterval(reloj);
    };
  }, [activo, minutos]);

  return segundosRestantes;
}

/* ============================================================================
   5. PANTALLAS (estilo iPhone)
   ----------------------------------------------------------------------------
   Cada pantalla es un componente de React: recibe datos ("props") y funciones
   que empiezan por "al..." (alGuardar, alAgregar...) para avisarle a App() lo
   que hizo el candidato. Las pantallas no guardan nada: eso lo hace App().
   ============================================================================ */

/* ---------------------------------------------------------------------------
   5.1 PIEZAS COMUNES
   Íconos, avisos, enlace al manual, paneles de PC y encabezado.
   --------------------------------------------------------------------------- */


/** Palomita (✓) dibujada, igual a la de iOS. */
function Palomita({ tamano = 17 }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * ¿La página se abrió dentro de una app (Instagram, Facebook, TikTok…)? Ahí la descarga
 * del ZIP suele fallar. Devuelve el nombre de la app, o null si es un navegador normal.
 * En modo prueba se puede simular con ?prueba=1&app=1.
 */
function navegadorDentroDeApp() {
  if (MODO_PRUEBA && new URLSearchParams(location.search).has('app')) return 'Instagram';
  const ua = navigator.userAgent || '';
  const apps = [
    [/Instagram/i, 'Instagram'], [/FBAN|FBAV|FB_IAB|FBIOS|FB4A/i, 'Facebook'], [/Messenger/i, 'Messenger'],
    [/musical_ly|TikTok|BytedanceWebview|trill/i, 'TikTok'], [/Snapchat/i, 'Snapchat'],
    [/LinkedInApp/i, 'LinkedIn'], [/Twitter/i, 'X (Twitter)'], [/Line\//i, 'LINE'], [/Pinterest/i, 'Pinterest'],
  ];
  const encontrada = apps.find(([patron]) => patron.test(ua));
  return encontrada ? encontrada[1] : null;
}
/** Nombre de la app donde se abrió la página (ej. "Instagram"), o null si es un navegador normal. */
const APP_ACTUAL = navegadorDentroDeApp();
/** Tipo de celular, para decir "Safari" o "Chrome" en el aviso. */
const ES_IPHONE = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
const ES_ANDROID = /Android/i.test(navigator.userAgent || '');
/** Dirección de esta página, sin "?prueba=1" ni nada extra (para copiarla). */
const ENLACE_PAGINA = location.origin + location.pathname;

/** Aviso para abrir la página en Chrome o Safari. Solo aparece dentro de apps. */
function AvisoNavegadorApp() {
  const [copiado, setCopiado] = useState(false);
  if (!APP_ACTUAL) return null;
  const navegador = ES_IPHONE ? 'Safari' : 'Chrome';

  async function copiar() {
    try {
      await navigator.clipboard.writeText(ENLACE_PAGINA);
    } catch {
      // Respaldo para navegadores que no dejan usar el portapapeles
      const campo = document.createElement('textarea');
      campo.value = ENLACE_PAGINA;
      document.body.appendChild(campo);
      campo.select();
      try { document.execCommand('copy'); } catch { /* no se pudo */ }
      campo.remove();
    }
    setCopiado(true);
  }

  // En Android se puede pedir directamente que se abra en Chrome
  const abrirEnChrome = `intent://${ENLACE_PAGINA.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;

  return (
    <div className="aviso-app" role="alert">
      <strong>Abre esta página en {navegador}</strong>
      Estás dentro de {APP_ACTUAL} y ahí la descarga de tus documentos puede fallar.
      {' '}<b>Hazlo antes de empezar:</b> lo que subas aquí no pasa a {navegador}, así que si cambias
      al final tendrás que subir todo otra vez. Ábrela en {navegador}:
      <span className="enlace-pagina">{ENLACE_PAGINA}</span>
      <ol>
        {ES_IPHONE ? (
          <li>Toca los tres puntos (<b>⋯</b>) arriba o abajo a la derecha y elige <b>Abrir en el navegador</b> o <b>Abrir en Safari</b>.</li>
        ) : (
          <li>Toca los tres puntos (<b>⋮</b>) arriba a la derecha y elige <b>Abrir en Chrome</b> o <b>Abrir en el navegador</b>.</li>
        )}
        <li>Si no aparece esa opción, copia el enlace, abre {navegador} y pégalo en la barra de direcciones.</li>
      </ol>
      <div className="doc-acciones">
        {ES_ANDROID && <a className="boton boton-principal boton-chico" href={abrirEnChrome}>Abrir en Chrome</a>}
        <button type="button" className="boton boton-tintado boton-chico" onClick={copiar}>
          {copiado ? 'Enlace copiado ✓' : 'Copiar enlace'}
        </button>
      </div>
    </div>
  );
}

/** Enlace al manual para celular (en PC ya está en el panel de ayuda de la derecha). */
function AyudaMovil() {
  if (!CONFIG.enlaceManual) return null;
  return (
    <a className="ayuda-movil" href={CONFIG.enlaceManual} target="_blank" rel="noopener noreferrer">
      <span className="ayuda-movil-icono" aria-hidden="true">?</span>
      <span className="fila-cuerpo">
        <span className="ayuda-movil-titulo">¿Necesitas ayuda?</span>
        <span className="ayuda-movil-sub">Ver el manual paso a paso, con imágenes</span>
      </span>
      <span className="ayuda-movil-flecha" aria-hidden="true">›</span>
    </a>
  );
}

/** Nombres de los 4 pasos, en orden (panel izquierdo en PC). */
const PASOS = ['Preguntas iniciales', 'Tus datos y cargo', 'Sube tus documentos', 'Descarga y envía'];

/**
 * Panel izquierdo en PC con el avance: los pasos anteriores van con ✓ y el actual resaltado.
 * paso: número del paso actual (1 a 4), o undefined en la pantalla final (todos con ✓).
 */
function PanelPasos({ paso }) {
  return (
    <aside className="lateral" aria-label="Pasos">
      <h2 className="lateral-titulo">Tu avance</h2>
      <ol className="pasos-lista">
        {PASOS.map((t, i) => {
          const n = i + 1, estado = !paso ? 'hecho' : n < paso ? 'hecho' : n === paso ? 'actual' : '';
          return (
            <li key={t} className={`paso-item ${estado}`} aria-current={estado === 'actual' ? 'step' : undefined}>
              <span className={`circulo ${estado === 'hecho' ? 'hecho' : estado === 'actual' ? 'activo' : ''}`}>
                {estado === 'hecho' ? '✓' : n}
              </span>
              {t}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
/** Ayuda (solo se ve en computador). */
function PanelAyuda() {
  return (
    <aside className="lateral" aria-label="Ayuda">
      <h2 className="lateral-titulo">Ayuda</h2>
      <div className="tarjeta-ayuda">
        <h3>¿Primera vez?</h3>
        <p>El manual te muestra cada paso con imágenes de la página.</p>
        <a className="boton boton-tintado" href={CONFIG.enlaceManual}
           target="_blank" rel="noopener noreferrer">Ver manual (PDF)</a>
      </div>
      <div className="tarjeta-ayuda">
        <h3>Tus archivos son privados</h3>
        <p>No se suben a internet desde esta página. Solo tú envías el paquete final a Gestión Humana.</p>
      </div>
      <div className="tarjeta-ayuda">
        <h3>Formatos</h3>
        <p>La foto 3×4 va como imagen (JPG o PNG). Todo lo demás, en PDF.</p>
      </div>
    </aside>
  );
}

/** Barra de navegación translúcida con el paso actual y la barra de avance en forma de caña. */
function Encabezado({ paso, completos, total }) {
  return (
    <header className="barra-nav">
      <div className="barra-nav-interna">
        <div className="nav-fila">
          <img className="logo logo-nav" src={LOGO} alt="Supertiendas Cañaveral" />
          {paso && <p className="nav-paso">Paso {paso} de 4</p>}
        </div>
        {total > 0 && (
          <>
            <div className="cana" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={completos}
                 aria-label="Avance de documentos">
              {Array.from({ length: total }, (_, i) => (
                <div key={i} className={`nudo ${i < completos ? 'lleno' : ''}`} />
              ))}
            </div>
            <div className="cana-texto">
              <span>{completos} de {plural(total, 'documento', 'documentos')}</span>
              <span>{completos === total ? 'Completo' : `Faltan ${total - completos}`}</span>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------------------
   5.2 PANTALLAS 1 A 4
   Inicio → Datos → Documentos (con una TarjetaDocumento por documento) → Envío.
   --------------------------------------------------------------------------- */

/** Pantalla 1: bienvenida, ¿dispositivo propio? y autorización de datos. */
function PantallaInicio({ alComenzar, guardadoDisponible, avisoInicial }) {
  const [primerEmpleo, setPrimerEmpleo] = useState(null); // 'si' | 'no'
  const [dispositivo, setDispositivo] = useState(null); // 'propio' | 'prestado'
  const [autoriza, setAutoriza] = useState(false);
  const puedeGuardar = guardadoDisponible && dispositivo === 'propio';

  // Las dos opciones del dispositivo, como filas con palomita (igual que en Ajustes del iPhone)
  const opciones = [
    {
      valor: 'propio',
      titulo: 'Sí, es mío',
      detalle: guardadoDisponible
        ? `Guardamos tu avance aquí por ${CONFIG.diasConservacion} días para que termines después.`
        : 'Este navegador no permite guardar tu avance.',
    },
    {
      valor: 'prestado',
      titulo: 'No, es prestado o público',
      detalle: `Ten todos tus documentos listos antes de empezar: no guardamos nada y si la dejas ${CONFIG.minutosInactividad} minutos sin usar, se borra sola.`,
    },
  ];

  return (
    <>
      <main className="contenido">
        {avisoInicial && <div className="aviso aviso-alerta" role="status">{avisoInicial}</div>}
        <AvisoNavegadorApp />

        {/* Portada con la identidad de Cañaveral */}
        <div className="portada">
          <img className="logo logo-blanco" src={LOGO} alt="Supertiendas Cañaveral" />
          <h1>Documentos de ingreso</h1>
          <p>
            Sube tus documentos y al final te entregamos un solo archivo listo para enviar.
            Puedes hacerlo por partes.
          </p>
        </div>

        <AyudaMovil />

        {/* Primera pregunta: si es su primer empleo no se le pide el certificado de pensión */}
        <section className="grupo">
          <h2 className="grupo-titulo">¿Es tu primer empleo?</h2>
          <div className="lista" role="radiogroup">
            {[{ valor: 'si', titulo: 'Sí, es mi primer empleo' }, { valor: 'no', titulo: 'No, ya he trabajado antes' }].map((op) => (
              <label key={op.valor} className="fila fila-tocable">
                <input className="oculto" type="radio" name="primerEmpleo" checked={primerEmpleo === op.valor}
                       onChange={() => setPrimerEmpleo(op.valor)} />
                <div className="fila-cuerpo fila-titulo">{op.titulo}</div>
                {primerEmpleo === op.valor && <span className="marca-check"><Palomita /></span>}
              </label>
            ))}
          </div>
        </section>

        <section className="grupo">
          <h2 className="grupo-titulo">Ten a mano (la foto como imagen y lo demás en PDF)</h2>
          <div className="lista">
            {CONFIG.documentos
              .filter((doc) => !(doc.omitirSiPrimerEmpleo && primerEmpleo === 'si'))
              .filter((doc) => !(doc.soloSiPrimerEmpleo && primerEmpleo !== 'si'))
              .map((doc) => (
              <div className="fila" key={doc.id}>
                <div className="fila-cuerpo">
                  <div className="fila-titulo">{doc.nombre}</div>
                  {doc.requerido === 'segunCargo' && <div className="fila-sub">Solo si tu cargo lo pide</div>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grupo">
          <h2 className="grupo-titulo">¿Este celular o computador es tuyo?</h2>
          <div className="lista" role="radiogroup">
            {opciones.map((op) => (
              <label key={op.valor} className="fila fila-tocable">
                <input className="oculto" type="radio" name="dispositivo" checked={dispositivo === op.valor}
                       onChange={() => setDispositivo(op.valor)} />
                <div className="fila-cuerpo">
                  <div className="fila-titulo">{op.titulo}</div>
                  <div className="fila-sub">{op.detalle}</div>
                </div>
                {dispositivo === op.valor && <span className="marca-check"><Palomita /></span>}
              </label>
            ))}
          </div>
          {!guardadoDisponible && (
            <p className="grupo-pie">En modo incógnito no se puede guardar el avance: tendrás que subir todo de una vez.</p>
          )}
        </section>

        <section className="grupo">
          <h2 className="grupo-titulo">Tratamiento de datos</h2>
          <div className="lista">
            <label className="fila fila-tocable">
              <div className="fila-cuerpo fila-titulo">Acepto la autorización</div>
              <input className="interruptor" type="checkbox" role="switch" checked={autoriza}
                     onChange={(e) => setAutoriza(e.target.checked)} />
            </label>
          </div>
          <p className="grupo-pie">
            {CONFIG.textoAutorizacion}{' '}
            {CONFIG.enlacePoliticaDatos && (
              <a href={CONFIG.enlacePoliticaDatos} target="_blank" rel="noopener noreferrer">Leer la política</a>
            )}
          </p>
        </section>
      </main>

      <div className="barra-accion">
        <div className="barra-accion-interna">
          <button className="boton boton-principal" disabled={!primerEmpleo || !dispositivo || !autoriza}
                  onClick={() => alComenzar(puedeGuardar, primerEmpleo === 'si')}>
            Comenzar
          </button>
          {(!primerEmpleo || !dispositivo || !autoriza) && (
            <p className="nota">Responde las dos preguntas y acepta la autorización para continuar.</p>
          )}
        </div>
      </div>
    </>
  );
}

/** Pantalla 2: nombre, cédula, cargo (buscador) y sección. */
function PantallaDatos({ datosIniciales, primerEmpleoInicial, alGuardar }) {
  const [nombre, setNombre] = useState(datosIniciales?.nombre || '');
  const [cedula, setCedula] = useState(datosIniciales?.cedula || '');
  // Si hay datos guardados de antes, solo se reutilizan el cargo y la sección que SIGAN
  // existiendo en la lista actual (la lista puede cambiar; si no, el candidato quedaría trabado).
  const cargoGuardadoValido = CARGOS_UNICOS.includes(datosIniciales?.cargo) ? datosIniciales.cargo : '';
  const seccionGuardadaValida = buscarPuesto(cargoGuardadoValido, datosIniciales?.seccion) ? datosIniciales.seccion : '';
  const [cargo, setCargo] = useState(cargoGuardadoValido);                   // cargo elegido de la lista
  const [textoCargo, setTextoCargo] = useState(datosIniciales?.cargo || ''); // lo que el candidato escribe
  const [seccion, setSeccion] = useState(seccionGuardadaValida);
  const [primerEmpleo, setPrimerEmpleo] = useState(!!primerEmpleoInicial); // se puede corregir aquí
  const [sugerenciasAbiertas, setSugerenciasAbiertas] = useState(false);
  const [errores, setErrores] = useState({});

  const sugerencias = useMemo(() => buscarCargos(textoCargo), [textoCargo]);
  const secciones = cargo ? seccionesDelCargo(cargo) : [];
  const mostrarSugerencias = sugerenciasAbiertas && !cargo && textoCargo.trim().length > 0;

  /** El candidato escribe: se borra el cargo elegido y se muestran coincidencias. */
  function escribirCargo(valor) {
    setTextoCargo(valor);
    setCargo('');
    setSeccion('');
    setSugerenciasAbiertas(true);
  }

  /** El candidato toca una sugerencia. Si el cargo existe en una sola sección, se elige sola. */
  function elegirCargo(nombreCargo) {
    const opciones = seccionesDelCargo(nombreCargo);
    setCargo(nombreCargo);
    setTextoCargo(nombreCargo);
    setSeccion(opciones.length === 1 ? opciones[0] : '');
    setSugerenciasAbiertas(false);
    setErrores((e) => ({ ...e, cargo: undefined }));
  }

  /** Revisa los datos y, si están bien, los entrega limpios. */
  function guardar(evento) {
    evento.preventDefault();
    const nombreLimpio = nombre.trim().replace(/\s+/g, ' ');
    const cedulaLimpia = cedula.replace(/\D/g, ''); // solo números (quita puntos y espacios)
    const nuevosErrores = {};
    if (nombreLimpio.length < 3) nuevosErrores.nombre = 'Escribe tu nombre completo, como aparece en tu cédula.';
    if (cedulaLimpia.length < 5 || cedulaLimpia.length > 12) nuevosErrores.cedula = 'Escribe tu número de documento, solo números.';
    // Si escribió el cargo completo pero no tocó la sugerencia, se acepta igual.
    let cargoFinal = cargo;
    let seccionFinal = seccion;
    if (!cargoFinal) {
      const exacto = CARGOS_UNICOS.find((c) => normalizar(c) === normalizar(textoCargo));
      if (exacto) {
        const opciones = seccionesDelCargo(exacto);
        cargoFinal = exacto;
        seccionFinal = opciones.length === 1 ? opciones[0] : '';
        setCargo(exacto);
        setTextoCargo(exacto);
        setSeccion(seccionFinal);
      }
    }
    if (!cargoFinal) nuevosErrores.cargo = 'Escribe tu cargo y tócalo en la lista de sugerencias.';
    else if (!buscarPuesto(cargoFinal, seccionFinal)) nuevosErrores.seccion = 'Elige la sección a la que vas a entrar.';
    setErrores(nuevosErrores);
    if (Object.values(nuevosErrores).every((v) => !v)) {
      alGuardar({ nombre: nombreLimpio, cedula: cedulaLimpia, cargo: cargoFinal, seccion: seccionFinal, primerEmpleo });
    } else {
      // Lleva la vista al primer mensaje de error para que el candidato sepa qué falta.
      setTimeout(() => {
        const primerError = document.querySelector('.grupo-pie.error, .con-error');
        if (primerError) primerError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }

  const listaErrores = Object.values(errores).filter(Boolean);

  return (
    // Sin <form> a propósito: algunas vistas previas bloquean el envío de formularios y el botón
    // quedaba sin hacer nada. Se usa un clic normal.
    <div style={{ display: 'contents' }}>
      <main className="contenido">
        <h1>Tus datos</h1>
        <p className="bajada">Con tu número de documento identificamos tu carpeta en Gestión Humana.</p>

        <section className="grupo">
          <div className="lista">
            <label className={`fila fila-campo ${errores.nombre ? 'con-error' : ''}`}>
              <span className="etiqueta">Nombre completo</span>
              <input type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next"
                     placeholder="Como aparece en tu cédula"
                     value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={120} />
            </label>
            <label className={`fila fila-campo ${errores.cedula ? 'con-error' : ''}`}>
              <span className="etiqueta">Número de documento</span>
              <input type="text" inputMode="numeric" autoComplete="off" enterKeyHint="next"
                     placeholder="Solo números"
                     value={cedula} onChange={(e) => setCedula(e.target.value)} maxLength={20} />
            </label>
          </div>
        </section>

        {/* Respuesta de la primera pantalla; se deja corregir por si la tocó mal */}
        <section className="grupo">
          <div className="lista">
            <label className="fila fila-tocable">
              <div className="fila-cuerpo fila-titulo">Es mi primer empleo</div>
              <input className="interruptor" type="checkbox" role="switch" checked={primerEmpleo}
                     onChange={(e) => setPrimerEmpleo(e.target.checked)} />
            </label>
          </div>
          <p className="grupo-pie">Si es tu primer empleo, no te pedimos certificado de pensión ni referencia laboral: en cambio te pedimos referencias personales.</p>
        </section>

        <section className="grupo">
          <h2 className="grupo-titulo">Cargo y sección</h2>
          <div className="lista">
            {/* Buscador de cargos: se escribe una parte del nombre y se toca la sugerencia */}
            <label className={`fila fila-campo ${errores.cargo ? 'con-error' : ''}`}>
              <span className="etiqueta">Cargo al que te postulaste</span>
              <input type="search" role="combobox" aria-expanded={mostrarSugerencias} aria-controls="lista-cargos"
                     aria-autocomplete="list" autoComplete="off" autoCorrect="off" autoCapitalize="none"
                     spellCheck={false} enterKeyHint="search"
                     placeholder="Escribe tu cargo, por ejemplo: auxiliar"
                     value={textoCargo}
                     onChange={(e) => escribirCargo(e.target.value)}
                     onFocus={() => setSugerenciasAbiertas(true)}
                     onBlur={() => setTimeout(() => setSugerenciasAbiertas(false), 200)} />
            </label>

            {mostrarSugerencias && (
              <div id="lista-cargos" role="listbox" aria-label="Cargos sugeridos">
                {sugerencias.map((nombreCargo) => (
                  <div key={nombreCargo} role="option" aria-selected="false" className="fila fila-tocable sugerencia"
                       onPointerDown={(e) => e.preventDefault() /* evita que el campo pierda el foco antes del toque */}
                       onClick={() => elegirCargo(nombreCargo)}>
                    <div className="fila-cuerpo">
                      <div className="fila-titulo">{nombreCargo}</div>
                      <div className="fila-sub">{plural(seccionesDelCargo(nombreCargo).length, 'sección', 'secciones')}</div>
                    </div>
                  </div>
                ))}
                {sugerencias.length === 0 && (
                  <div className="fila"><div className="fila-sub">No encontramos ese cargo. Prueba con otra palabra.</div></div>
                )}
              </div>
            )}

            {/* Sección: solo aparece cuando ya se eligió el cargo */}
            {cargo && secciones.length === 1 && (
              <div className="fila fila-campo">
                <span className="etiqueta">Sección</span>
                <div className="fila-titulo">{secciones[0]}</div>
              </div>
            )}
            {cargo && secciones.length > 1 && (
              <label className={`fila fila-campo ${errores.seccion ? 'con-error' : ''}`}>
                <span className="etiqueta">Sección</span>
                <span className="selector-con-flecha" style={{ display: 'block' }}>
                  <select value={seccion} onChange={(e) => setSeccion(e.target.value)}>
                    <option value="">Selecciona la sección</option>
                    {secciones.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </span>
              </label>
            )}
          </div>
          {listaErrores.map((texto) => <p key={texto} className="grupo-pie error" role="alert">{texto}</p>)}
        </section>
      </main>

      <div className="barra-accion">
        <div className="barra-accion-interna">
          <button type="button" className="boton boton-principal" onClick={guardar}>Guardar y seguir</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Fila de un documento: subir, ver, cambiar o quitar su archivo.
 *   - Documentos normales: solo PDF que el candidato ya tenga listo.
 *   - La foto 3×4 (tipo 'imagen'): se sube como imagen JPG/PNG, no como PDF.
 */
function TarjetaDocumento({ doc, posicion, ayuda, archivos, cedula, todosLosArchivos, alAgregar, alQuitar }) {
  const selectorPdf = useRef(null);    // elige el PDF (o la imagen, en la foto 3×4)
  const [error, setError] = useState(null);
  const [revisando, setRevisando] = useState(false);
  const tieneArchivos = archivos.length > 0;
  const esImagen = doc.tipo === 'imagen';
  const [tutorialAbierto, setTutorialAbierto] = useState(false); // hoja "¿Cómo lo saco?" abierta
  const [comoComprimir, setComoComprimir] = useState(false);     // hoja "Cómo comprimir un PDF" abierta

  /** Revisa cada archivo elegido y agrega los que pasan. */
  async function procesar(elegidos) {
    if (elegidos.length === 0) return;
    setRevisando(true);
    setError(null);
    const validos = [];
    // Si el documento admite un solo archivo, el que se va a reemplazar no cuenta como repetido.
    const actuales = doc.variosArchivos ? { ...todosLosArchivos } : { ...todosLosArchivos, [doc.id]: [] };
    try {
      for (const archivo of elegidos) {
        const resultado = esImagen
          ? await revisarImagen(archivo, doc, actuales)
          : await revisarArchivo(archivo, doc, cedula, actuales);
        if (resultado.error) { setError({ texto: `${archivo.name}: ${resultado.error}`, comprimir: !!resultado.comprimir }); continue; }
        validos.push(resultado.item);
        // Para que dos archivos iguales elegidos a la vez también se detecten
        actuales[doc.id] = [...(actuales[doc.id] || []), resultado.item];
      }
    } catch {
      // Error inesperado leyendo el archivo (ej. se movió o borró mientras se revisaba)
      setError({ texto: 'No pudimos leer el archivo. Vuelve a elegirlo.' });
    } finally {
      setRevisando(false); // el botón nunca se queda en "Revisando…"
    }
    if (validos.length) alAgregar(doc.id, validos, !doc.variosArchivos);
  }

  /** Lee los archivos del selector y lo limpia (para poder volver a elegir el mismo). */
  function alElegir(evento) {
    const elegidos = Array.from(evento.target.files || []);
    evento.target.value = '';
    procesar(elegidos);
  }

  /** Marca que se muestra al lado de cada archivo para que el candidato sepa cómo quedó. */
  function marcaDelArchivo(item) {
    if (item.protegido) return 'con contraseña, lo revisará Gestión Humana';
    if (item.claveEsCedula) return 'abierto con tu cédula';
    if (item.revisado === false && !esImagen) return 'escaneado, lo revisará Gestión Humana';
    return null;
  }

  const textoBotonPrincipal = esImagen
    ? (tieneArchivos ? 'Cambiar foto' : 'Subir foto')
    : (tieneArchivos ? 'Agregar otro PDF' : 'Subir PDF');

  return (
    <div className="fila fila-con-icono">
      <div className={`circulo ${tieneArchivos ? 'hecho' : ''}`} aria-hidden="true">
        {tieneArchivos ? <Palomita tamano={16} /> : posicion}
      </div>
      <div className="fila-cuerpo">
        <div className="fila-titulo fuerte">{doc.nombre}</div>
        <div className="fila-sub">
          {ayuda}{' '}
          {doc.enlaceAyuda && (
            <a href={doc.enlaceAyuda.url} target="_blank" rel="noopener noreferrer">{doc.enlaceAyuda.texto}</a>
          )}
          {doc.tutorial && (
            <button type="button" className="boton-como" onClick={() => setTutorialAbierto(true)}>
              ¿Cómo lo saco?
            </button>
          )}
          {doc.revision?.ejemploNombre && (
            <div>Si es escaneado, el nombre del archivo debe decir qué es, por ejemplo: <strong>{doc.revision.ejemploNombre}</strong></div>
          )}
        </div>

        {archivos.map((item, i) => {
          const marca = marcaDelArchivo(item);
          return (
            <div className="archivo" key={`${item.nombre}-${item.fecha}-${i}`}>
              <span className="archivo-nombre">
                {item.nombre} <span className="archivo-peso">· {pesoLegible(item.tamano)}</span>
                {marca && <span className="archivo-peso"> · {marca}</span>}
              </span>
              <span className="archivo-acciones">
                <button type="button" className="boton-texto" onClick={() => verArchivo(item.blob)}>Ver</button>
                <button type="button" className="boton-texto peligro" onClick={() => alQuitar(doc.id, i)}>Quitar</button>
              </span>
            </div>
          );
        })}

        {error && (
          <div role="alert">
            <p className="doc-error">{error.texto}</p>
            {error.comprimir && (
              <div className="error-acciones">
                <a className="boton boton-tintado boton-chico" href={CONFIG.enlaceComprimir}
                   target="_blank" rel="noopener noreferrer">Comprimir gratis</a>
                <button type="button" className="boton-como" onClick={() => setComoComprimir(true)}>¿Cómo lo hago?</button>
              </div>
            )}
          </div>
        )}
        {tutorialAbierto && <HojaTutorial doc={doc} alCerrar={() => setTutorialAbierto(false)} />}
        {comoComprimir && (
          <HojaTutorial doc={{ ...doc, tutorial: TUTORIAL_COMPRIMIR }} alCerrar={() => setComoComprimir(false)} />
        )}

        <div className="doc-acciones">
          {/* Selectores de archivo ocultos: los abren los botones de abajo */}
          <input ref={selectorPdf} className="oculto" type="file" tabIndex={-1} aria-hidden="true"
                 accept={esImagen ? 'image/jpeg,image/png' : 'application/pdf,.pdf'}
                 multiple={!!doc.variosArchivos && !esImagen} onChange={alElegir} />

          {revisando ? (
            <span className="fila-sub">Revisando…</span>
          ) : (
            <>
              {(!tieneArchivos || doc.variosArchivos || esImagen) && (
                <button type="button" className="boton boton-tintado boton-chico" onClick={() => selectorPdf.current.click()}>
                  {textoBotonPrincipal}
                </button>
              )}
              {tieneArchivos && !doc.variosArchivos && !esImagen && (
                <button type="button" className="boton-texto" style={{ fontSize: 15 }} onClick={() => selectorPdf.current.click()}>
                  Cambiar archivo
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Pantalla 3: lista de documentos. */
function PantallaDocumentos({ sesion, alAgregar, alQuitar, alEditarDatos, alContinuar, alBorrarTodo }) {
  const docs = documentosQueAplican(sesion.datos);
  const faltan = docs.filter((d) => !(sesion.archivos[d.id] || []).length).length;

  return (
    <>
      <main className="contenido">
        <h1>Tus documentos</h1>
        <p className="bajada">Sube cada uno en PDF (la foto como imagen). Puedes saltar alguno y volver después.</p>
        <AyudaMovil />

        <section className="grupo">
          <div className="lista">
            <div className="fila">
              <div className="fila-cuerpo">
                <div className="fila-titulo fuerte fila-nombre">{sesion.datos.nombre}</div>
                <div className="fila-sub">
                  Documento {sesion.datos.cedula} · {sesion.datos.cargo} · {sesion.datos.seccion}
                  {sesion.datos.primerEmpleo ? ' · Primer empleo' : ''}
                </div>
              </div>
              <button type="button" className="boton-texto" onClick={alEditarDatos}>Editar</button>
            </div>
          </div>
          <p className="grupo-pie">
            {sesion.dispositivoPersonal
              ? `Tu avance se guarda en este dispositivo hasta el ${fechaLegible(sesion.expira)}. Vuelve desde este mismo navegador para continuar.`
              : 'No guardamos nada en este dispositivo: si cierras la página, tendrás que empezar de nuevo.'}
          </p>
        </section>

        <section className="grupo">
          <h2 className="grupo-titulo">Documentos</h2>
          <div className="lista">
            {docs.map((doc, i) => (
              <TarjetaDocumento key={doc.id} doc={doc} posicion={i + 1}
                                ayuda={ayudaDelDocumento(doc, sesion.datos)}
                                archivos={sesion.archivos[doc.id] || []}
                                cedula={sesion.datos.cedula} todosLosArchivos={sesion.archivos}
                                alAgregar={alAgregar} alQuitar={alQuitar} />
            ))}
          </div>
        </section>

        <div className="boton-centrado">
          <button type="button" className="boton-texto peligro" onClick={alBorrarTodo}>
            Borrar todo y empezar de nuevo
          </button>
        </div>
      </main>

      <div className="barra-accion">
        <div className="barra-accion-interna">
          <button type="button" className="boton boton-principal" disabled={faltan > 0} onClick={alContinuar}>
            Revisar y enviar
          </button>
          {faltan > 0 && <p className="nota">Te {faltan === 1 ? 'falta' : 'faltan'} {plural(faltan, 'documento', 'documentos')} para poder enviar.</p>}
        </div>
      </div>
    </>
  );
}

/** Pantalla 4: descargar el ZIP y enviarlo. */
function PantallaEnvio({ sesion, alVolver, alTerminar }) {
  const [zip, setZip] = useState(null);            // archivo ZIP ya armado
  const [armando, setArmando] = useState(false);
  const [error, setError] = useState(null);
  const [abrioEnvio, setAbrioEnvio] = useState(false);
  const nombreZip = nombreDelZip(sesion.datos);
  const hayLink = !!CONFIG.linkSubida; // link de "Solicitar archivos" de OneDrive

  /** Arma el ZIP y lo descarga. */
  async function descargar() {
    setArmando(true);
    setError(null);
    try {
      const blob = zip || await armarZip(sesion);
      setZip(blob);
      descargarArchivo(blob, nombreZip);
    } catch (e) {
      setError('No pudimos armar el archivo. Intenta de nuevo; si sigue fallando, prueba desde otro navegador.');
    }
    setArmando(false);
  }

  /** Evita usar el paso 2 antes de descargar; si ya descargó, lo marca como hecho. */
  const alAbrirEnvio = (e) => { if (!zip || !hayLink) e.preventDefault(); else setAbrioEnvio(true); };

  return (
    <>
      <main className="contenido">
        <h1>Revisa y envía</h1>
        <p className="bajada">Tienes todos los documentos. Solo faltan dos pasos.</p>
        <AvisoNavegadorApp />
        <AyudaMovil />

        {error && <div className="aviso aviso-error" role="alert">{error}</div>}

        <section className="grupo">
          <div className="lista">
            {/* Paso 1: descargar */}
            <div className="fila fila-con-icono">
              <div className={`circulo ${zip ? 'hecho' : 'activo'}`} aria-hidden="true">
                {zip ? <Palomita tamano={16} /> : 1}
              </div>
              <div className="fila-cuerpo">
                <div className="fila-titulo fuerte">Descarga tu paquete</div>
                <div className="fila-sub">Se guarda en tu carpeta de Descargas con este nombre:</div>
                <div className="archivo"><span className="archivo-nombre">{nombreZip}</span></div>
                <div className="doc-acciones">
                  <button type="button" className="boton boton-tintado boton-chico" onClick={descargar} disabled={armando}>
                    {armando ? 'Armando el paquete…' : zip ? 'Descargar otra vez' : 'Descargar paquete'}
                  </button>
                </div>
              </div>
            </div>

            {/* Paso 2: subir el ZIP a la carpeta de OneDrive de Gestión Humana */}
            <div className="fila fila-con-icono" style={{ opacity: zip ? 1 : 0.5 }}>
              <div className={`circulo ${abrioEnvio ? 'hecho' : zip ? 'activo' : ''}`} aria-hidden="true">
                {abrioEnvio ? <Palomita tamano={16} /> : 2}
              </div>
              <div className="fila-cuerpo">
                <div className="fila-titulo fuerte">Sube el paquete</div>
                <div className="fila-sub">
                  Se abre la página de Cañaveral para recibir archivos. Toca para elegir archivos,
                  selecciona el ZIP que acabas de descargar (está en Descargas) y escribe tu nombre
                  y apellido cuando te lo pida.
                </div>
                <div className="doc-acciones">
                  <a className="boton boton-tintado boton-chico" href={zip && hayLink ? CONFIG.linkSubida : undefined}
                     target="_blank" rel="noopener noreferrer" aria-disabled={!zip || !hayLink} onClick={alAbrirEnvio}>
                    Abrir página de subida
                  </a>
                </div>
                {!hayLink && (
                  <p className="doc-error">Falta configurar el link de subida (Gestión Humana: campo linkSubida).</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="boton-centrado">
          <button type="button" className="boton-texto" onClick={alVolver}>Volver a mis documentos</button>
        </div>
      </main>

      <div className="barra-accion">
        <div className="barra-accion-interna">
          <button type="button" className="boton boton-principal" disabled={!abrioEnvio}
                  onClick={alTerminar}>
            Ya lo subí, borrar mis datos
          </button>
          {!abrioEnvio && <p className="nota">Completa los dos pasos para terminar.</p>}
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------------
   5.3 TUTORIALES ("¿Cómo lo saco?") Y VENTANAS EMERGENTES
   ----------------------------------------------------------------------------
   Hoja que sale desde abajo con el paso a paso para sacar un certificado.
   El contenido (pasos, enlaces) está en la CONFIGURACIÓN, campo "tutorial"
   de cada documento. Aquí solo están las ilustraciones y la ventana.
   Las ilustraciones son dibujos genéricos (no copias de las páginas reales),
   para que no queden viejos si esas páginas cambian de diseño.
   ============================================================================ */

/** Marco de celular pequeño donde se dibuja cada ilustración. */
function MarcoCelular({ children }) {
  return (
    <svg className="ilustracion" viewBox="0 0 120 150" role="img" aria-hidden="true">
      <rect x="10" y="4" width="100" height="142" rx="14" fill="var(--tinta-ilus)" />
      <rect x="15" y="12" width="90" height="126" rx="8" fill="var(--celda)" />
      {children}
    </svg>
  );
}

/** Formulario: tipo de documento, número, código de seguridad y botón Consultar. */
function IlustracionFormulario() {
  return (
    <MarcoCelular>
      <rect x="22" y="22" width="76" height="14" rx="3" fill="var(--relleno)" />
      <text x="26" y="32" fontSize="7" fill="var(--texto-2)">Tipo: CC</text>
      <rect x="22" y="42" width="76" height="14" rx="3" fill="var(--relleno)" />
      <text x="26" y="52" fontSize="7" fill="var(--texto-2)">Número</text>
      <rect x="22" y="64" width="44" height="18" rx="3" fill="var(--relleno)" />
      <path d="M26 76 q6 -9 12 0 t12 0 t12 0" stroke="var(--texto-2)" strokeWidth="1.4" fill="none" />
      <rect x="70" y="64" width="28" height="18" rx="3" fill="none" stroke="var(--separador)" />
      <rect x="22" y="92" width="76" height="16" rx="8" fill="var(--tinte)" />
      <text x="60" y="103" fontSize="7.5" fill="var(--texto-sobre-tinte)" textAnchor="middle" fontWeight="700">Consultar</text>
    </MarcoCelular>
  );
}

/** Menú del navegador: Imprimir → Guardar como PDF. */
function IlustracionImprimir() {
  return (
    <MarcoCelular>
      <rect x="22" y="22" width="76" height="60" rx="4" fill="var(--relleno)" />
      <rect x="54" y="30" width="40" height="44" rx="4" fill="var(--celda)" stroke="var(--separador)" />
      <text x="58" y="42" fontSize="6.5" fill="var(--texto-2)">Compartir</text>
      <rect x="56" y="48" width="36" height="10" rx="2" fill="var(--tinte-suave)" />
      <text x="58" y="55" fontSize="6.5" fill="var(--tinte)" fontWeight="700">Imprimir</text>
      <text x="58" y="67" fontSize="6.5" fill="var(--texto-2)">Copiar</text>
      <rect x="22" y="92" width="76" height="16" rx="8" fill="var(--tinte)" />
      <text x="60" y="103" fontSize="7" fill="var(--texto-sobre-tinte)" textAnchor="middle" fontWeight="700">Guardar como PDF</text>
    </MarcoCelular>
  );
}

/** Resultado de una consulta con la línea del fondo de pensión resaltada. */
function IlustracionResultado() {
  return (
    <MarcoCelular>
      <text x="22" y="30" fontSize="7.5" fill="var(--texto)" fontWeight="700">Tus afiliaciones</text>
      <rect x="22" y="38" width="76" height="14" rx="3" fill="var(--relleno)" />
      <text x="26" y="48" fontSize="6.5" fill="var(--texto-2)">Salud: tu EPS</text>
      <rect x="22" y="56" width="76" height="14" rx="3" fill="var(--tinte-suave)" stroke="var(--tinte)" />
      <text x="26" y="66" fontSize="6.5" fill="var(--tinte)" fontWeight="700">Pensión: tu fondo</text>
      <rect x="22" y="74" width="76" height="14" rx="3" fill="var(--relleno)" />
      <text x="26" y="84" fontSize="6.5" fill="var(--texto-2)">Riesgos laborales</text>
    </MarcoCelular>
  );
}

/** Página del fondo: entrar con usuario y clave y buscar "Certificados". */
function IlustracionFondo() {
  return (
    <MarcoCelular>
      <rect x="22" y="22" width="76" height="14" rx="3" fill="var(--relleno)" />
      <text x="26" y="32" fontSize="7" fill="var(--texto-2)">Usuario (cédula)</text>
      <rect x="22" y="42" width="76" height="14" rx="3" fill="var(--relleno)" />
      <text x="26" y="52" fontSize="7" fill="var(--texto-2)">Clave •••••</text>
      <rect x="22" y="64" width="76" height="14" rx="7" fill="var(--tinte)" />
      <text x="60" y="73.5" fontSize="7" fill="var(--texto-sobre-tinte)" textAnchor="middle" fontWeight="700">Ingresar</text>
      <rect x="22" y="88" width="76" height="20" rx="4" fill="var(--tinte-suave)" stroke="var(--tinte)" />
      <text x="60" y="101" fontSize="7" fill="var(--tinte)" textAnchor="middle" fontWeight="700">Certificados</text>
    </MarcoCelular>
  );
}

/** Archivo PDF con el nombre que pide la app. */
function IlustracionRenombrar({ nombre }) {
  return (
    <MarcoCelular>
      <path d="M44 26 h24 l12 12 v40 h-36 z" fill="var(--relleno)" stroke="var(--separador)" />
      <path d="M68 26 v12 h12" fill="none" stroke="var(--separador)" />
      <rect x="49" y="58" width="26" height="11" rx="2" fill="var(--rojo)" />
      <text x="62" y="66" fontSize="7" fill="#FFFFFF" textAnchor="middle" fontWeight="700">PDF</text>
      <rect x="18" y="88" width="84" height="16" rx="4" fill="var(--tinte-suave)" stroke="var(--tinte)" />
      <text x="60" y="99" fontSize="6.4" fill="var(--tinte)" textAnchor="middle" fontWeight="700">{nombre}</text>
    </MarcoCelular>
  );
}

/** PDF con candado: certificados que llegan con clave. */
function IlustracionCandado() {
  return (
    <MarcoCelular>
      <path d="M40 30 h28 l12 12 v50 h-40 z" fill="var(--relleno)" stroke="var(--separador)" />
      <rect x="50" y="62" width="20" height="16" rx="3" fill="var(--tinte)" />
      <path d="M54 62 v-5 a6 6 0 0 1 12 0 v5" fill="none" stroke="var(--tinte)" strokeWidth="2.4" />
      <text x="60" y="108" fontSize="7" fill="var(--texto-2)" textAnchor="middle">Clave: tu cédula</text>
    </MarcoCelular>
  );
}

/** Une el nombre de cada ilustración (usado en la configuración) con su dibujo. */
const ILUSTRACIONES = {
  formulario: IlustracionFormulario,
  imprimir: IlustracionImprimir,
  resultado: IlustracionResultado,
  fondo: IlustracionFondo,
  renombrar: IlustracionRenombrar,
  candado: IlustracionCandado,
};

/**
 * Hoja del tutorial: título, pasos numerados con su ilustración y enlaces.
 * Se cierra tocando fuera, con "Entendido" o con la tecla Escape.
 */
/** Paso a paso para comprimir un PDF que pesa mucho (se abre desde el error de tamaño). */
const TUTORIAL_COMPRIMIR = {
  titulo: 'Cómo comprimir tu PDF',
  intro: 'Es gratis, no necesitas crear usuario y toma 1 minuto. Funciona en celular y en computador.',
  pasos: [
    { texto: 'Abre la página para comprimir PDF y toca "Seleccionar archivo PDF". Elige el archivo que pesa mucho.',
      enlace: { texto: 'Abrir página para comprimir', url: CONFIG.enlaceComprimir } },
    { texto: 'Deja marcada la opción "Compresión recomendada" y toca "Comprimir PDF". Espera unos segundos.' },
    { texto: 'Toca "Descargar PDF comprimido". El archivo nuevo queda en tu carpeta de Descargas.' },
    { ilustracion: 'renombrar',
      texto: 'Vuelve a esta página y sube el archivo comprimido en el mismo documento.' },
  ],
  nota: 'Es una página externa y gratuita (no es de Cañaveral). Si prefieres no usarla, escanea el documento otra vez en menor calidad o en blanco y negro.',
};

/**
 * Ventana con un paso a paso (sale desde abajo, como en el iPhone).
 * doc: documento cuyo campo "tutorial" tiene { titulo, intro, pasos, enlaces, nota }.
 * Se usa para "¿Cómo lo saco?" (ADRES, pensión) y para "Cómo comprimir tu PDF".
 */
function HojaTutorial({ doc, alCerrar }) {
  const tutorial = doc.tutorial;
  const hoja = useRef(null);

  // Al abrir: lleva el foco a la hoja (lectores de pantalla) y permite cerrar con Escape
  useEffect(() => {
    if (hoja.current) hoja.current.focus();
    const alTeclear = (e) => { if (e.key === 'Escape') alCerrar(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, []);

  return (
    <div className="hoja-fondo" onClick={alCerrar}>
      <div className="hoja tutorial" role="dialog" aria-modal="true" aria-label={tutorial.titulo}
           ref={hoja} tabIndex={-1} onClick={(e) => e.stopPropagation() /* tocar dentro no cierra */}>
        <div className="tutorial-agarre" aria-hidden="true" />
        <div className="tutorial-cabecera">
          <h2 className="tutorial-titulo">{tutorial.titulo}</h2>
          <button type="button" className="tutorial-cerrar" aria-label="Cerrar" onClick={alCerrar}>✕</button>
        </div>
        <div className="tutorial-cuerpo">
          {tutorial.intro && <p className="tutorial-intro">{tutorial.intro}</p>}

          <ol className="tutorial-pasos">
            {tutorial.pasos.map((paso, i) => {
              const Dibujo = ILUSTRACIONES[paso.ilustracion];
              return (
                <li key={i} className="tutorial-paso">
                  {Dibujo && <Dibujo nombre={doc.revision?.ejemploNombre} />}
                  <div className="tutorial-paso-texto">
                    <span className="tutorial-numero">Paso {i + 1}</span>
                    <p>{paso.texto}</p>
                    {paso.enlace && (
                      <a className="boton boton-tintado boton-chico" href={paso.enlace.url}
                         target="_blank" rel="noopener noreferrer">{paso.enlace.texto}</a>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {tutorial.enlaces && (
            <>
              <h3 className="tutorial-subtitulo">{tutorial.tituloEnlaces}</h3>
              <div className="tutorial-enlaces">
                {tutorial.enlaces.map((e) => (
                  <a key={e.url} className="boton boton-tintado boton-chico" href={e.url}
                     target="_blank" rel="noopener noreferrer">{e.texto}</a>
                ))}
              </div>
            </>
          )}

          {tutorial.nota && <p className="tutorial-nota">{tutorial.nota}</p>}
        </div>
        <div className="tutorial-pie">
          <button type="button" className="boton boton-principal" onClick={alCerrar}>Entendido</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Ventana de confirmación estilo iPhone (hoja que sale desde abajo).
 * Reemplaza confirm()/alert() del navegador, que algunas vistas previas bloquean.
 */
function HojaConfirmacion({ mensaje, textoAccion, peligro, soloAviso, alConfirmar, alCerrar }) {
  return (
    <div className="hoja-fondo" onClick={alCerrar}>
      <div className="hoja" role="alertdialog" aria-modal="true" aria-label={mensaje}
           onClick={(e) => e.stopPropagation() /* tocar dentro no cierra */}>
        <div className="hoja-grupo">
          <p className="hoja-mensaje">{mensaje}</p>
          <button type="button" className={`hoja-boton ${peligro ? 'peligro' : ''}`}
                  onClick={() => { alCerrar(); alConfirmar(); }}>
            {textoAccion}
          </button>
        </div>
        {!soloAviso && (
          <button type="button" className="hoja-boton hoja-cancelar" onClick={alCerrar}>Cancelar</button>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   5.4 PANTALLA FINAL
   --------------------------------------------------------------------------- */

/** Pantalla 5: cierre. Ya se borraron los datos; solo recuerda borrar el ZIP si el equipo no es suyo. */
function PantallaFinal({ nombreZip, alReiniciar }) {
  return (
    <main className="contenido final">
      <div className="final-icono"><Palomita tamano={44} /></div>
      <h1>¡Listo!</h1>
      <p className="bajada">
        Borramos tus documentos de esta página. Gestión Humana revisará tu paquete y te contactará
        por teléfono o WhatsApp.
      </p>
      <div className="aviso aviso-alerta">
        El archivo <strong style={{ overflowWrap: 'anywhere' }}>{nombreZip}</strong> sigue en tu carpeta de
        Descargas. Si este dispositivo no es tuyo, bórralo.
      </div>
      <button type="button" className="boton-texto" onClick={alReiniciar}>Enviar documentos de otra persona</button>
    </main>
  );
}

/* ============================================================================
   6. APP PRINCIPAL: decide qué pantalla mostrar y guarda los cambios
   ============================================================================ */

/**
 * Componente principal. Aquí vive TODO el estado de la app:
 *   pantalla      Qué pantalla se ve: 'inicio' | 'datos' | 'documentos' | 'envio' | 'final'.
 *   sesion        El avance del candidato (datos y archivos). Cada vez que cambia se guarda
 *                 en el navegador si el dispositivo es propio (ver el efecto "Cada cambio se guarda").
 *   confirmacion  Ventana de "¿Seguro?" abierta, o null.
 * Las pantallas reciben funciones como comenzar, guardarDatos, agregarArchivos... y las
 * llaman cuando el candidato hace algo. Solo esas funciones cambian la sesión.
 */
function App() {
  const [cargando, setCargando] = useState(true);
  const [sesion, setSesion] = useState(null);
  const [pantalla, setPantalla] = useState('inicio'); // inicio | datos | documentos | envio | final
  const [guardadoDisponible, setGuardadoDisponible] = useState(true);
  const [avisoInicial, setAvisoInicial] = useState(null);
  const [zipFinal, setZipFinal] = useState('');
  const [modoPrueba, setModoPrueba] = useState('normal');
  const [confirmacion, setConfirmacion] = useState(null); // ventana de confirmación abierta (o null)

  // --- Al abrir: recupera el avance guardado (si existe y no ha vencido) ---
  useEffect(() => {
    (async () => {
      try {
        const guardada = await BD.leer();
        if (guardada) {
          if (Date.now() > guardada.expira) {
            await BD.borrar();
            setAvisoInicial(`Tu avance anterior se borró porque pasaron más de ${CONFIG.diasConservacion} días. Empieza de nuevo.`);
          } else {
            setSesion(guardada);
            // Si el cargo o la sección guardados ya no existen en la lista, se pide elegirlos de nuevo
            const datosValidos = guardada.datos && buscarPuesto(guardada.datos.cargo, guardada.datos.seccion);
            setPantalla(datosValidos ? 'documentos' : 'datos');
          }
        }
      } catch {
        setGuardadoDisponible(false); // incógnito o navegador sin IndexedDB
      }
      setCargando(false);
    })();
  }, []);

  // --- Cada cambio se guarda en el dispositivo (solo si es propio y no es prueba) ---
  useEffect(() => {
    if (!sesion || !sesion.dispositivoPersonal || sesion.esPrueba) return;
    BD.guardar(sesion).catch(() => {
      // Si falla (ej. memoria del celular llena), se sigue sin guardar para no repetir el error.
      setGuardadoDisponible(false);
      setSesion((s) => (s ? { ...s, dispositivoPersonal: false } : s));
      setConfirmacion({
        mensaje: 'No pudimos guardar tu avance en este dispositivo. Puedes seguir, pero termina antes de cerrar la página.',
        textoAccion: 'Entendido',
        alConfirmar: () => {},
        soloAviso: true,
      });
    });
  }, [sesion]);

  /** Borra todo: memoria y dispositivo. */
  async function borrarTodo() {
    try { await BD.borrar(); } catch { /* si no hay base de datos, no hay nada que borrar */ }
    setSesion(null);
  }

  // --- Limpieza automática en dispositivos prestados ---
  const segundosRestantes = useInactividad(
    !!sesion && !sesion.dispositivoPersonal && !sesion.esPrueba && pantalla !== 'final',
    CONFIG.minutosInactividad,
    async () => {
      await borrarTodo();
      setPantalla('inicio');
      setAvisoInicial('Borramos tus documentos porque la página estuvo sin uso. Empieza de nuevo cuando quieras.');
    }
  );

  // --- Acciones que usan las pantallas ---
  /** Botón "Comenzar": crea la sesión con las respuestas de la primera pantalla. */
  function comenzar(dispositivoPersonal, primerEmpleo) {
    setAvisoInicial(null);
    setSesion(sesionNueva(dispositivoPersonal, primerEmpleo));
    setPantalla('datos');
  }

  /** Guarda nombre, cédula, cargo, sección y primer empleo, y pasa a los documentos. */
  function guardarDatos(datos) {
    // Si cambió el cargo o "primer empleo", los documentos que ya no aplican se descartan
    // (no van en el ZIP y así no aparecen avisos de "archivo repetido" con documentos ocultos).
    // Si eso borra archivos ya subidos, antes se le pregunta al candidato.
    const aplican = new Set(documentosQueAplican(datos).map((d) => d.id));
    const archivosActuales = (sesion && sesion.archivos) || {};
    const seQuitan = CONFIG.documentos.filter((d) => !aplican.has(d.id) && (archivosActuales[d.id] || []).length);
    const aplicar = () => {
      setSesion((s) => {
        const archivos = {};
        Object.keys(s.archivos || {}).forEach((id) => { if (aplican.has(id)) archivos[id] = s.archivos[id]; });
        return { ...s, datos, archivos };
      });
      setPantalla('documentos');
    };
    if (seQuitan.length === 0) { aplicar(); return; }
    setConfirmacion({
      mensaje: `Con este cambio ya no se te pide: ${seQuitan.map((d) => d.nombre).join(', ')}. ` +
               'Vamos a quitar los archivos que subiste ahí. ¿Quieres seguir?',
      textoAccion: 'Sí, guardar el cambio',
      peligro: true,
      alConfirmar: aplicar,
    });
  }

  /** Agrega archivos a un documento. Si el documento admite uno solo, reemplaza el anterior. */
  function agregarArchivos(idDoc, nuevos, reemplazar) {
    setSesion((s) => ({
      ...s,
      archivos: { ...s.archivos, [idDoc]: reemplazar ? nuevos.slice(-1) : [...(s.archivos[idDoc] || []), ...nuevos] },
    }));
  }

  /** Quita un archivo de un documento (por su posición en la lista). */
  function quitarArchivo(idDoc, indice) {
    setSesion((s) => ({
      ...s,
      archivos: { ...s.archivos, [idDoc]: (s.archivos[idDoc] || []).filter((_, i) => i !== indice) },
    }));
  }

  /** Botón "Borrar todo y empezar de nuevo": pide confirmación y borra la sesión. */
  function confirmarBorrado() {
    setConfirmacion({
      mensaje: '¿Borrar todos tus datos y documentos de este dispositivo?',
      textoAccion: 'Borrar todo',
      peligro: true,
      alConfirmar: async () => { await borrarTodo(); setPantalla('inicio'); },
    });
  }

  /** Botón "Ya lo subí": pide confirmación, borra los datos y muestra la pantalla final. */
  function terminar() {
    setConfirmacion({
      mensaje: '¿Ya subiste el paquete? Vamos a borrar tus documentos de este dispositivo.',
      textoAccion: 'Sí, ya lo subí',
      alConfirmar: async () => {
        setZipFinal(nombreDelZip(sesion.datos));
        await borrarTodo();
        setPantalla('final');
      },
    });
  }

  /** Solo modo prueba: cambia entre datos normales y casos difíciles. */
  function cambiarModoPrueba(modo) {
    setModoPrueba(modo);
    if (modo === 'normal') { setSesion(null); setPantalla('inicio'); return; }
    setSesion(sesionDePrueba(modo));
    setPantalla('documentos');
  }

  // --- Avance para la barra de caña ---
  const docsAplicables = sesion?.datos ? documentosQueAplican(sesion.datos) : [];
  const completos = docsAplicables.filter((d) => (sesion.archivos[d.id] || []).length).length;
  const mostrarAvance = ['documentos', 'envio'].includes(pantalla);

  if (cargando) return null;

  return (
    <div className="app">
      <Encabezado paso={{ inicio: 1, datos: 2, documentos: 3, envio: 4 }[pantalla]}
                  completos={completos} total={mostrarAvance ? docsAplicables.length : 0} />

      <div className="escritorio">
      <PanelPasos paso={{ inicio: 1, datos: 2, documentos: 3, envio: 4 }[pantalla]} />
      <div className="columna-central">
      {pantalla === 'inicio' && (
        <PantallaInicio alComenzar={comenzar} guardadoDisponible={guardadoDisponible} avisoInicial={avisoInicial} />
      )}
      {pantalla === 'datos' && sesion && (
        <PantallaDatos datosIniciales={sesion.datos}
                       primerEmpleoInicial={sesion.datos ? sesion.datos.primerEmpleo : sesion.primerEmpleo}
                       alGuardar={guardarDatos} />
      )}
      {pantalla === 'documentos' && sesion?.datos && (
        <PantallaDocumentos sesion={sesion} alAgregar={agregarArchivos} alQuitar={quitarArchivo}
                            alEditarDatos={() => setPantalla('datos')} alContinuar={() => setPantalla('envio')}
                            alBorrarTodo={confirmarBorrado} />
      )}
      {pantalla === 'envio' && sesion?.datos && (
        <PantallaEnvio sesion={sesion} alVolver={() => setPantalla('documentos')} alTerminar={terminar} />
      )}
      {pantalla === 'final' && (
        <PantallaFinal nombreZip={zipFinal} alReiniciar={() => { setAvisoInicial(null); setPantalla('inicio'); }} />
      )}
      </div>
      <PanelAyuda />
      </div>

      {confirmacion && (
        <HojaConfirmacion {...confirmacion}
                          alCerrar={() => setConfirmacion(null)} />
      )}

      {segundosRestantes !== null && (
        <div className="aviso-flotante" role="alert">
          <p>Por seguridad, borraremos todo en {segundosRestantes} s si no usas la página.</p>
          <button type="button" className="boton boton-tintado boton-chico">Sigo aquí</button>
        </div>
      )}

      {MODO_PRUEBA && (
        <div className="selector-prueba" aria-label="Datos de prueba">
          {[['normal', 'Normal'], ['extremo', 'Caso extremo'], ['vacio', 'Vacío']].map(([valor, texto]) => (
            <button key={valor} type="button" className={modoPrueba === valor ? 'activo' : ''}
                    onClick={() => cambiarModoPrueba(valor)}>{texto}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Si algo falla al dibujar la app, en vez de una página en blanco se muestra un mensaje.
 * El avance guardado no se pierde: está en el navegador y vuelve al recargar.
 */
class PantallaDeError extends React.Component {
  constructor(props) { super(props); this.state = { fallo: false }; }
  static getDerivedStateFromError() { return { fallo: true }; }
  render() {
    if (!this.state.fallo) return this.props.children;
    return (
      <div className="carga-inicial" role="alert">
        <img className="carga-logo" src={LOGO} alt="Supertiendas Cañaveral" />
        <p className="carga-texto">Algo salió mal</p>
        <p className="carga-detalle">Recarga la página. Si tu avance se estaba guardando, no lo pierdes.</p>
        <button type="button" className="boton boton-principal carga-boton" onClick={() => location.reload()}>Recargar</button>
      </div>
    );
  }
}

if (!window.NAVEGADOR_ANTIGUO) {
  ReactDOM.createRoot(document.getElementById('raiz')).render(<PantallaDeError><App /></PantallaDeError>);
}
