# Guía de archivos HV — Documentos de ingreso

Página para que los candidatos de **Supertiendas Cañaveral S.A.S.** preparen y envíen sus documentos de ingreso desde el celular o el computador.

## Contenido

| Archivo | Qué es |
|---|---|
| [`index.html`](index.html) | La página de documentos de ingreso (todo en un solo archivo). |
| [`manual/Manual_candidato_Documentos_de_ingreso.pdf`](manual/Manual_candidato_Documentos_de_ingreso.pdf) | Manual del candidato, paso a paso con imágenes. |

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

## Editar

Solo hace falta tocar el bloque **CONFIGURACIÓN** dentro de `index.html` (cargos, documentos, textos y link de subida a OneDrive). El resto es el código de la app.

**Modo prueba:** abre la página con `?prueba=1` al final de la dirección para llenarla con datos de prueba (no guarda nada).
