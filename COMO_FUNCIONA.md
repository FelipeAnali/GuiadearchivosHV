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
| `src/app.jsx` | **Fuente** del código de la app (React con JSX). Se edita aquí. |
| `herramientas/compilar.js` | Compila `src/app.jsx` con Babel y lo pone dentro de `index.html` (`npm run compilar`). |
| `manual/` | Manual del candidato (PDF). |
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

`App()` (sección 6 de `src/app.jsx`) guarda el estado: `pantalla` y `sesion`. Las pantallas (sección 5) solo
muestran y avisan con funciones `al...` (`alGuardar`, `alAgregar`...).

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
- Antes de enviar el link a candidatos, seguir [PRUEBAS.md](PRUEBAS.md) en un Android y un iPhone reales.
