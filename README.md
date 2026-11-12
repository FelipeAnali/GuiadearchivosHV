# Guía de archivos HV — Documentos de ingreso

Página para que los candidatos de **Supertiendas Cañaveral S.A.S.** preparen y envíen sus documentos de ingreso desde el celular o el computador.

## Contenido

| Archivo | Qué es |
|---|---|
| [`index.html`](index.html) | La página de documentos de ingreso (todo en un solo archivo). |
| [`documentos.js`](documentos.js) | Lista de documentos que se piden. La usan **las dos** apps: se cambia en un solo lugar. |
| [`examen.js`](examen.js) | Recomendaciones del examen médico de ingreso (las muestra la app con el link de citación). |
| [`cargos.js`](cargos.js) | Lista de cargos y secciones (se pega desde Excel). La usan **las dos** apps. |
| [`panel-gh.html`](panel-gh.html) | **Panel de Gestión Humana**: recibe los ZIP de los candidatos desde la carpeta de OneDrive, los revisa y lleva el avance de cada uno. Se abre en Chrome o Edge de computador: https://felipeanali.github.io/GuiadearchivosHV/panel-gh.html |
| [`manual/Manual_candidato_Documentos_de_ingreso.pdf`](manual/Manual_candidato_Documentos_de_ingreso.pdf) | Manual del candidato, paso a paso con imágenes. Los aprendices pueden tener el suyo (`enlaceManualAprendiz`, ver [GUIA.md](GUIA.md) punto 7). |
| [`src/app.jsx`](src/app.jsx) | Código fuente de la app (se compila dentro de `index.html`). |
| [`herramientas/compilar.js`](herramientas/compilar.js) | Compila `src/app.jsx` y lo pone en `index.html`. |
| [`GUIA.md`](GUIA.md) | **Cómo hacer los cambios más comunes**, paso a paso y sin programar. |
| [`COMO_FUNCIONA.md`](COMO_FUNCIONA.md) | Cómo funciona por dentro (para programadores). |
| [`PRUEBAS.md`](PRUEBAS.md) | Lista para probar la página en celulares reales antes de enviarla. |

## Cómo funciona

1. El candidato responde las preguntas iniciales y acepta el tratamiento de datos.
2. Escribe su nombre, cédula y cargo.
3. Sube cada documento (en PDF; solo la foto 3×4 va como imagen). La página revisa cada archivo.
4. La página arma un ZIP con nombres estándar, lo descarga y lleva al candidato a subirlo a la carpeta de Gestión Humana en OneDrive.

## Privacidad

La página **no tiene servidor**: los archivos nunca se suben a GitHub ni a ningún otro lado, solo viven en el navegador del candidato hasta que él mismo sube el ZIP a OneDrive.
Si el dispositivo es propio, el avance se guarda unos días en el navegador; si es prestado, no se guarda nada y la página se limpia sola tras unos minutos sin uso.

## Publicar la página (GitHub Pages)

1. En el repositorio, entra a **Settings → Pages**.
2. En **Source** elige **Deploy from a branch**, rama **`main`** y carpeta **`/ (root)`**, y guarda.
3. En un par de minutos la página queda en:
   `https://felipeanali.github.io/GuiadearchivosHV/`
   y el manual en:
   `https://felipeanali.github.io/GuiadearchivosHV/manual/Manual_candidato_Documentos_de_ingreso.pdf`

## Correcciones

Cuando Gestión Humana rechaza un documento en el panel, toca **Pedir correcciones** y le manda al candidato un
link (por WhatsApp, correo o copiado). Ese link abre esta misma página en **modo corrección**: el candidato
verifica su número de documento, sube solo lo que le pidieron y envía un ZIP `CEDULA_CORRECCION_N.zip`, que el
panel procesa sin tocar los demás documentos. Ver [COMO_FUNCIONA.md](COMO_FUNCIONA.md).

## Aprendices SENA

Gestión Humana inscribe al aprendiz en el panel (**Aprendices**) y le manda un link personal. El aprendiz verifica
su número de documento, escribe su celular y correo, y sube solo sus documentos en un ZIP `DOCUMENTO_APRENDIZ_N.zip`.
El panel avisa cuándo pedir el certificado de manipulación de alimentos según la sección y la fecha de prácticas.
Sedes, días y secciones se cambian en **Ajustes** del panel. Ver [GUIA.md](GUIA.md) punto 7B.

## Revisión automática de documentos

- **PDF con texto** (descargados de una página, como ADRES o el fondo de pensión): la página lee el contenido y rechaza el archivo si no corresponde o si se parece más a otro documento. El nombre del archivo no importa.
- **PDF escaneados o con contraseña** (no se puede leer el texto): el nombre del archivo debe decir qué documento es (por ejemplo `cedula.pdf`). Quedan marcados para revisión de Gestión Humana en `datos_candidato.json`.
- **Foto 3×4**: se rechaza si el fondo tiene color o está muy oscuro. Si la pared blanca salió gris o amarillenta por la luz, la página la aclara sola.
- **PDF de más de 5 MB**: se le muestra al candidato un paso a paso para comprimirlo gratis.

## Editar

### Configuración (sin programar)

Solo hace falta tocar el bloque **CONFIGURACIÓN** dentro de `index.html` (cargos en `cargos.js`, documentos en `documentos.js`, textos, link de subida a OneDrive, link de la política de datos y página para comprimir PDF). El resto es el código de la app.

**Modo prueba:** abre la página con `?prueba=1` al final de la dirección para llenarla con datos de prueba (no guarda nada). Con `?prueba=1&app=1` se ve el aviso que sale cuando la página se abre dentro de Instagram o Facebook.

### Código de la app (programadores)
El código de la app está en `src/app.jsx`. No se edita dentro de `index.html`: ahí está ya compilado, para que el
celular del candidato no tenga que descargar Babel (unos 3 MB) cada vez que abre la página.
Después de cambiar `src/app.jsx`:

```bash
npm install
```

```bash
npm run compilar
```

Eso actualiza el bloque "CÓDIGO DE LA APP" dentro de `index.html`. Luego se sube `index.html` junto con `src/app.jsx`.

## Revisión en Gestión Humana
Cada ZIP trae `00_LEEME_REVISION.txt`, con lo que revisó la página en cada archivo y cuáles hay que mirar a mano
(escaneados, con contraseña, o certificados de EPS / pensión / cédula que no traen el número de documento del candidato).

