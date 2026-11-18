# Cómo funciona por dentro

Documento para programadores o personas de sistemas que necesiten entender, revisar o cambiar la página.
Para cambios de configuración (links, cargos, textos) ver [GUIA.md](GUIA.md).

## Resumen

- Es **una sola página web estática** (`index.html`) publicada en GitHub Pages. **No hay servidor ni base de datos.**
- Los documentos del candidato **nunca salen de su navegador** hasta que él mismo sube el ZIP a OneDrive
  (link de "Solicitar archivos" de Gestión Humana).
- Está hecha con **React 18**. Lee los PDF con **pdf.js** (Mozilla) y arma el ZIP con **JSZip**.
  Las tres librerías se cargan desde cdnjs, con respaldo automático en jsDelivr.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | La página publicada: estilos, **CONFIGURACIÓN**, logo, pantalla de carga, librerías y el código de la app **ya compilado**. |
| `documentos.js` | **Lista de documentos** que se piden (con sus reglas de revisión). La usan la app y el panel. |
| `carnets.html` | **App de reposición de carnet** del colaborador (ver "Carnets" abajo). |
| `examen.js` | **Examen médico**: recomendaciones y cargos con coprológico (tarjeta de la citación y mensaje del panel). |
| `cargos.js` | **Lista de cargos** (CARGO;SECCIÓN;MANIPULACIÓN), en `window.CARGOS_TEXTO`. La usan la app y el panel. |
| `src/app.jsx` | **Fuente** del código de la app (React con JSX). Se edita aquí. |
| `herramientas/compilar.js` | Compila `src/app.jsx` con Babel y lo pone dentro de `index.html` (`npm run compilar`). |
| `manual/` | Manuales en PDF: general (`enlaceManual`) y de aprendices (`enlaceManualAprendiz`, si existe). |
| `panel-gh.html` | Panel de Gestión Humana: procesa los ZIP, revisa documentos y pide correcciones. |
| `GUIA.md`, `PRUEBAS.md` | Guía de cambios comunes y lista de pruebas en celulares. |

¿Por qué compilar? Antes la página traducía el JSX en el celular del candidato con Babel (~3 MB en cada visita).
Ahora se traduce una sola vez, aquí. Navegadores mínimos: iOS 14 y Chrome 76 (2019); a los más antiguos se les
muestra un mensaje.

## Recorrido del candidato

```
Inicio ──► Datos ──► Documentos ──► Envío ──► Final
 │           │           │            │         └ borra todo del navegador
 │           │           │            └ arma el ZIP, lo descarga y abre el link de OneDrive
 │           │           └ una tarjeta por documento: revisa cada archivo al subirlo
 │           └ nombre, cédula, cargo y sección (define qué documentos se piden)
 └ ¿primer empleo?, ¿dispositivo propio?, autorización de datos
```

En "Datos" se piden también el **celular** (obligatorio: 10 números que empiezan por 3) y el **correo** (opcional).
Van en `datos_candidato.json` como `celular` y `correo`: Gestión Humana los usa para mandar las correcciones.
Si alguien tenía un avance guardado de antes, sin celular, la página lo devuelve a "Datos" para completarlo.

`App()` (sección 6 de `src/app.jsx`) guarda el estado: `pantalla` y `sesion`. Las pantallas (sección 5) solo
muestran y avisan con funciones `al...` (`alGuardar`, `alAgregar`...).

## Modo corrección (`?c=...`)

Gestión Humana rechaza documentos en su panel y le manda al candidato un link a esta misma página con `?c=<código>`.
Con ese link la página **no** hace el envío normal:

```
Lo que debes corregir ──► Verifica tu documento ──► Corrige tus documentos ──► Envío ──► Final
 (¿dispositivo propio?)    (huella de la cédula)     (solo lo pedido, con motivo)
```

- No vuelve a pedir primer empleo, datos, cargo ni autorización.
- La cédula se verifica sin que viaje en el link: se compara la huella SHA-256 que escribe el candidato con la del link.
- Usa la misma `TarjetaDocumento` (todas las revisiones de archivos) y la misma pantalla de envío.
- El avance se guarda con la clave `correccion_<huella>_<n>`: **no toca** el avance de un envío normal.
- Si el link está dañado o es de otra versión, solo se muestra "Este enlace de corrección está incompleto".

**Contrato con el panel** (no cambiarlo sin cambiar también `panel-gh.html`):

| | Formato |
|---|---|
| Link | `<app>?c=<código>`; código = JSON → UTF-8 → base64url sin `=` |
| JSON del link | `{ "v": 1, "n": 1, "h": "<16 hex de SHA-256 de la cédula>", "d": [ { "id": "adres", "m": "No se lee bien" } ] }` |
| ZIP | `<cedula>_CORRECCION_<n>.zip`, archivos con el nombre de siempre |
| `datos_candidato.json` | `{ "version": 1, "tipo": "correccion", "correccion": n, "cedula", "generado", "archivos": [...] }` |

El detalle está en `src/app.jsx` (sección 7) y en `panel-gh.html` (sección 6B).

### Versión 2 del link (correcciones nuevas y aprendices)

```json
{ "v": 2, "t": "correccion" | "aprendiz", "n": 1, "h": "<16 hex>", "k": "<código único>",
  "a": true, "p": "<primer nombre>", "d": [ { "id": "adres", "m": "..." } ] }
```

- `h` = 16 primeros hex de SHA-256 del número de documento en mayúscula y solo letras/números (para cédulas = solo números).
- `k` = código único que el panel guarda en `expediente.json`. El ZIP lo devuelve en `codigo` y el panel **rechaza**
  el ZIP si no coincide (link alterado o de otra persona). Correcciones viejas sin código se siguen aceptando.
- `a` = pedir la autorización de datos (aprendices). `p` = nombre para saludar.
- `m: "aprendiz"` (opcional, en correcciones) = el candidato es aprendiz: la app le muestra el manual de aprendiz.
- Los links `v: 1` siguen funcionando.

## Citación (`?cita=...`)

El panel (menú Citación, sección 6D) arma un mensaje genérico con un link a esta página:

```json
{ "v": 1, "k": "<código único>", "e": "AAAA-MM-DDTHH:MM", "l": "AAAA-MM-DDTHH:MM",
  "ci": "<ciudad>", "cn": "<centro médico>", "cd": "<dirección>" }
```

- `e` = examen, `l` = fecha límite (horas de Colombia). Antes de `l` la app funciona como el envío normal y muestra
  la tarjeta del examen (`TarjetaExamen`, recomendaciones de `examen.js`) y el plazo; después de `l` solo muestra
  `PantallaCitaVencida` (también si vence mientras el candidato está en la página: se revisa cada 30 s y al descargar).
- El ZIP lleva `citacion: { codigo, examen, limite, ciudad, centro }`. El panel guarda cada citación en
  `citaciones.json` y al analizar el ZIP avisa si el código no existe, si la fecha no coincide o si llegó tarde.
- La fecha límite se revisa en el celular del candidato (no hay servidor): por eso la revisión del panel.
- `?cita=` dañado → "Este enlace está incompleto". El link general (sin `?cita`) sigue igual.

## Modo aprendiz (`?c=...` con `t: "aprendiz"`)

```
Panel: Inscribir ──► link por WhatsApp ──► App: verifica documento + celular + correo + autorización
     ──► sube documentos de aprendiz ──► <doc>_APRENDIZ_<n>.zip ──► OneDrive ──► Panel lo procesa
```

- `datos_candidato.json`: `{ version, tipo: "aprendiz", solicitud: n, codigo, cedula, celular, correo, autorizacionDatos, generado, archivos }`.
- El panel compara celular y correo con lo inscrito y anota los cambios en la bitácora (doble verificación).
- `expediente.json` del aprendiz: `tipoCandidato: "aprendiz"`, `aprendiz: { sede, fechaContrato, fechaPracticas }`,
  `solicitudes: [ { n, tipo: "documentos" | "manipulacion", codigo, fecha, por, documentos, recibida } ]`.
- **Manipulación de alimentos:** si la sección está en `seccionesManipulacionAprendiz` y faltan menos de
  `diasManipulacionAprendiz` días para `fechaPracticas`, el panel avisa para pedir el certificado con otro link.
  No hay servidor: el aviso sale cuando alguien abre el panel.
- Avance guardado con clave `aprendiz_<huella>_<n>`. Manual: `manualDelCandidato()` usa `enlaceManualAprendiz` si existe.

## Carnets (reposición de carnet)

La app del colaborador es **`carnets.html`** (misma familia que `index.html`, pero con Babel en el navegador).
El colaborador llena sus datos (con RH, celular, correo y sede), elige el motivo y sube los documentos:

| Motivo | Documentos (id, código) |
|---|---|
| `deterioro` | `foto_carnet` (01) |
| `robo` | `denuncia` (02) + `descuento` (03) |
| `perdida` | `descuento` (03) |

El ZIP se sube con el **mismo link** de "Solicitar archivos" y llega a `Recibidos`.

**Contrato del ZIP** (no cambiar sin cambiar `carnets.html` → `armarZip` y `panel-gh.html` → sección 6E):
`<cedula>_CARNET_<MOTIVO>_<AAAA-MM-DD>.zip` con un PDF por documento (`<cedula>_CARNET_<codigo>_<ID>.pdf`) y
`datos_carnet.json` = `{ version, tipo: "carnet", cedula, nombre, rh, celular, correo, sede, motivo, nombreMotivo,
descripcion, autorizacionDatos, generado, archivos: [{ documento, archivo, origen, paginas, ... }] }`.
En `foto_carnet` el archivo trae además `pareceCarnet` (true / false / null).

**¿Es de verdad un carnet de Cañaveral?** (`pareceCarnetCanaveral` en `carnets.html`, `CONFIG.revisarCarnet`):
- Busca el verde de la marca. El verde debe estar en las puntas del carnet (franja de arriba y de abajo; también si la
  foto está girada), con un cuerpo claro en el medio.
- Se calibró con fotos del carnet real: acepta el carnet completo, recortado, girado, roto o con poca luz, y rechaza
  fotos de personas, fondos de otro color y carnets de otros colores.
- No bloquea: si no lo parece, le avisa al colaborador ("No reconocemos el carnet de Cañaveral…"). La bandeja y la
  ficha del panel lo muestran marcado para revisarlo bien.
- No es infalible: una hoja impresa con esos colores pasaría. La revisión de la gestora es la que decide.

**En el panel** (secciones 6E, 6F y 6G de `panel-gh.html`):
- La bandeja lo reconoce por `datos_carnet.json` (o `_CARNET_` en el nombre) y valida tipo, cédula, nombre, RH
  (8 grupos), correo, motivo, que vengan los documentos del motivo y que cada archivo exista en el ZIP.
- Procesar crea `Carnets/Solicitudes/<AAAA-MM-DD>_<cedula>_<MOTIVO>/` con los PDF y **`solicitud.json`**
  (`id, estado, rev, datos, documentos {estado, motivoRechazo, archivo}, fechas, rechazo, envio, correos, bitacora`)
  y mueve el ZIP a `Recibidos/Procesados`. Mismo control de choques (`rev`) y marca `en_uso.json` que los candidatos.
- Si la cédula ya tiene una solicitud **abierta** (recibida o aprobada), la bandeja deja elegir **Unir a la abierta**
  (lo reemplazado va a `_anteriores/<fecha>`) o **Crear nueva**. "Procesar todos" se salta esos.
- Estados: `recibida` → `aprobada` → `enviada` (cerrada); `recibida` → `rechazada` (cerrada). Aprobar exige todos
  los documentos aprobados.
- **Excel:** botón "Descargar Excel" (SheetJS 0.18.5, se carga solo al pedirlo, con respaldo en jsDelivr).

### Correos con Power Automate

El panel **no envía correos**: al aprobar, rechazar o enviar deja `Carnets/Correos/Pendientes/<id>.json`
(`id = <idSolicitud>_<tipo>_<n>`):

```json
{ "version": 1, "id": "2026-11-18_1144123456_ROBO_aprobada_1", "solicitud": "2026-11-18_1144123456_ROBO",
  "tipo": "aprobada", "para": "maria.pena@gmail.com", "asunto": "…", "cuerpoHtml": "<p>…</p>",
  "creado": "2026-11-18T18:00:00.000Z", "creadoPor": "Natalia" }
```

- El archivo se escribe **después** de guardar la solicitud (nunca sale un correo de un cambio que no quedó).
- El estado lo da la carpeta: `Pendientes` = esperando, `Enviados` = enviado (Power Automate agrega `estado` y `enviado`),
  `Errores` = falló (agrega `error`). **Reintentar** deja un JSON nuevo (`_n+1`) en `Pendientes`.
- Los textos (asunto y cuerpo de `aprobada`, `rechazada`, `enviada`) se editan en **Ajustes**, con `{nombre}`, `{sede}`,
  `{motivo}`, `{motivoRechazo}`, `{guia}`. El cuerpo se convierte a HTML escapando el texto. **Nunca** llevan el RH ni adjuntos.
- En la carpeta de ejemplo, el panel simula a Power Automate (a los 2,5 s pasa el correo a Enviados; si el correo
  del destinatario contiene "error", a Errores).

**Cómo armar el flujo** (lo puede hacer cualquier persona con Power Automate en su cuenta de Microsoft 365; no hace
falta ser administrador). En https://make.powerautomate.com:

1. **Crear → Flujo de nube automatizado.** Nombre: "Correos de carnets". Disparador:
   **OneDrive para la Empresa → "Cuando se crea un archivo"**. Carpeta: `…/Hojas de vida/Carnets/Correos/Pendientes`
   (la misma carpeta de OneDrive que abre el panel). Si la carpeta es compartida por otra persona, usa el disparador
   **SharePoint → "Cuando se crea un archivo en una carpeta"** sobre la biblioteca donde está.
2. **Obtener contenido de archivo** (OneDrive para la Empresa) con el *Identificador de archivo* del disparador.
3. **Analizar JSON**: Contenido = `json(string(body('Obtener_contenido_de_archivo')))` (en "Expresión") y como
   esquema, toca "Generar a partir de ejemplo" y pega el JSON de arriba.
4. **Office 365 Outlook → "Enviar un correo electrónico (V2)"**: Para = `para`, Asunto = `asunto`,
   Cuerpo = `cuerpoHtml` (en el editor del cuerpo, cámbialo a modo código `</>` y pon la variable). Se envía desde el
   buzón de quien creó el flujo; para enviarlo desde un buzón compartido de Gestión Humana usa
   **"Enviar un correo electrónico desde un buzón compartido (V2)"** (eso sí lo habilita Sistemas).
5. Si salió bien → **Crear archivo** en `…/Carnets/Correos/Enviados`, Nombre = el del disparador, Contenido =
   `setProperty(setProperty(body('Analizar_JSON'), 'estado', 'enviado'), 'enviado', utcNow())` → **Eliminar archivo**
   del disparador.
6. Si falló: agrega otra rama **Crear archivo** en `…/Carnets/Correos/Errores` con Contenido =
   `setProperty(body('Analizar_JSON'), 'error', 'No se pudo enviar el correo')` y **Eliminar archivo**; en los
   tres puntos de "Crear archivo" → **Configurar ejecución después de** → marca solo **"tiene errores"** (y que
   dependa del paso de enviar correo).
7. Guarda y prueba: aprueba una solicitud en el panel; en uno o dos minutos la ficha debe decir "Correo enviado".

## Dónde se guarda el avance

- **Dispositivo propio:** la `sesion` completa, archivos incluidos, se guarda en **IndexedDB** del navegador
  (base `canaveral_documentos_ingreso`, registro `actual`). Vence a los `diasConservacion` días.
- **Dispositivo prestado:** no se guarda nada y se borra solo tras `minutosInactividad` minutos sin uso.
- Cada navegador tiene su propio almacenamiento: lo que se sube en Instagram no aparece en Chrome.

Forma de la sesión (ver `sesionNueva()`):

```js
{
  version: 1, creado, expira, dispositivoPersonal, primerEmpleo,
  autorizacion: { aceptada: true, fecha },
  datos: { nombre, cedula, cargo, seccion, primerEmpleo },
  archivos: { [idDocumento]: [ { nombre, tamano, blob, fecha, huella, paginas,
                                 revisado, protegido, claveEsCedula, mencionaCedula } ] }
}
```

## Revisión de cada archivo

**PDF** (`revisarArchivo()`):
1. Tamaño (`tamanoMaximoMB`) y que sea un PDF real (empieza con `%PDF-`).
2. Que no sea el mismo archivo ya subido en otro documento (huella SHA-256).
3. pdf.js lee el texto de las 3 primeras páginas. Si tiene contraseña, prueba con la cédula.
4. Máximo de páginas (`paginasMax`).
5. **Con texto:** debe traer alguna de `palabras` y no parecerse claramente a otro documento
   (`pareceOtroDocumento()` compara las `distintivas` de todos).
6. **Escaneado o con clave** (no se puede leer): el nombre del archivo debe decir qué documento es.

**Foto** (`revisarImagen()`): JPG o PNG real, tamaño mínimo, vertical, y fondo claro y sin color
(`analizarFondo()`). Si la pared salió gris o amarilla, `aclararFondo()` la deja blanca. Se guarda como JPG de 1.200 px.

La revisión es **por palabras clave**: ayuda mucho, pero no es infalible. Por eso el ZIP lleva un resumen para
que Gestión Humana sepa qué mirar.

## Contenido del ZIP

Nombre: `CEDULA_NOMBRE_CARGO.zip`, por ejemplo `1144123456_MARIA_JOSE_PENA_AUXILIAR_DE_FRUVER.zip`.

| Archivo | Contenido |
|---|---|
| `CEDULA_NN_DOCUMENTO.pdf` | Cada documento renombrado (ej. `1144123456_02_CEDULA.pdf`; si hay varios, `_2`, `_3`). La foto va como `.jpg`. |
| `datos_candidato.json` | Datos del candidato y de cada archivo, para procesarlos con otro programa. |
| `00_LEEME_REVISION.txt` | Resumen para Gestión Humana: qué revisó la página y qué hay que mirar a mano. |

## Cuando la página no abre

`index.html` muestra "Cargando…" antes de abrir la app y cambia el mensaje si:
- las librerías no llegan ni de cdnjs ni de jsDelivr → "No se pudo cargar la página";
- tarda más de 15 segundos → "Está tardando más de lo normal…";
- el navegador es muy antiguo → "Tu navegador es muy antiguo";
- el código falla al abrir (por ejemplo, una coma faltante en la CONFIGURACIÓN) → "No se pudo abrir la página".

Si la app falla ya abierta, `PantallaDeError` muestra "Algo salió mal" con un botón para recargar.

## Probar

- `?prueba=1`: datos de prueba sin guardar nada (botones Normal / Caso extremo / Vacío).
- `?prueba=1&app=1`: muestra el aviso de "Abre esta página en Chrome/Safari".
- `?prueba=1` → botón **Corrección**: abre el modo corrección con un link de ejemplo (cédula `1144098765`, pide EPS y diplomas).
- `?prueba=1` → botón **Aprendiz**: abre el modo aprendiz con un link de ejemplo.
- Antes de enviar el link a candidatos, seguir [PRUEBAS.md](PRUEBAS.md) en un Android y un iPhone reales.
