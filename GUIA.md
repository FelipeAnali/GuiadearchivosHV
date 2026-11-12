# Guía para hacer cambios

Esta guía es para cualquier persona de Gestión Humana o de sistemas que necesite cambiar algo de la página
**sin saber programar**. Casi todo se cambia en un solo lugar: el bloque **CONFIGURACIÓN** dentro de `index.html`.

> Página publicada: https://felipeanali.github.io/GuiadearchivosHV/
> Repositorio: https://github.com/FelipeAnali/GuiadearchivosHV

---

## Antes de empezar: cómo editar y guardar un cambio en GitHub

Solo pueden editar el dueño del repositorio y las personas que él agregue
(en GitHub: **Settings → Collaborators → Add people**).

1. Entra al repositorio y abre el archivo **`index.html`**.
2. Toca el **lápiz** ✏️ (arriba a la derecha del archivo, "Edit this file").
3. Usa **Ctrl + F** para buscar lo que vas a cambiar (por ejemplo `linkSubida`).
4. Haz el cambio. Respeta estas reglas:
   - Los textos van entre comillas simples: `'así'`.
   - Cada elemento de una lista termina en coma `,`.
   - Si un texto lleva comilla simple (ej. O'Neill), escríbela así: `\'`.
   - Las líneas que empiezan con `//` son explicaciones: no hacen nada.
5. Toca **Commit changes…**, escribe en una línea qué cambiaste (ej. "Nuevo link de OneDrive") y toca **Commit changes**.
6. Espera **2 a 5 minutos** y abre la página con `?prueba=1` al final:
   `https://felipeanali.github.io/GuiadearchivosHV/?prueba=1`
   (usa **Ctrl + F5** para no ver la versión vieja).

**Si después del cambio la página sale en blanco o dice "No se pudo abrir la página"**, casi siempre falta
una coma o una comilla en lo último que cambiaste. Vuelve a abrir el archivo y revisa esa parte.
Para volver a la versión anterior: en `index.html` toca **History** (reloj 🕘), abre la versión de antes,
toca **Raw**, copia todo y pégalo en el editor del paso 2.

---

## 1. Cambiar el link de OneDrive donde llegan los ZIP

Busca `linkSubida` y reemplaza lo que está entre las comillas por el nuevo link de **"Solicitar archivos"**
de OneDrive (en OneDrive: clic derecho en la carpeta → **Solicitar archivos** → copiar el vínculo).

```js
linkSubida: 'https://...nuevo link...',
```

## 2. Agregar, quitar o cambiar cargos y secciones

Los cargos están en el archivo **`cargos.js`** (no en `index.html`). Ábrelo en GitHub con el lápiz ✏️, igual que `index.html`.
La lista se pega directo desde Excel, con 3 columnas: **CARGO | SECCIÓN | MANIPULACIÓN**.

- `NO`: no se pide certificado de manipulación de alimentos.
- `GENERAL`: se pide el certificado normal (mínimo 10 horas).
- `DECRETO1500`: se pide el certificado bajo el Decreto 1500 de 2007 (proteínas).

Para cambiar toda la lista: en Excel selecciona las 3 columnas **sin el encabezado**, copia, y pega entre las dos
comillas invertidas `` ` `` reemplazando todo lo que haya. Para agregar un solo cargo, agrega una línea nueva
con las 3 columnas separadas por **;** (ej. `CAJERO;CAJAS Y SERVICIO AL CLIENTE;NO`).

## 3. Cambiar el texto o la ayuda de un documento

Los documentos están en el archivo **`documentos.js`** (no en `index.html`). Ese archivo lo usan **las dos apps**:
la del candidato y el panel de Gestión Humana, así que un cambio ahí sirve para las dos. Se edita igual que `index.html`
(abrir el archivo en GitHub → lápiz → cambiar → Commit changes). Cada documento tiene:

| Campo | Para qué sirve |
|---|---|
| `nombre` | Lo que ve el candidato (ej. "Cédula ampliada al 150 %"). |
| `nombreCorto` | Cómo lo muestra el panel de Gestión Humana (ej. "Cédula"). |
| `ayuda` | La explicación corta debajo del nombre. |
| `enlaceAyuda` | Un link opcional (ej. "Consultar en ADRES"). |
| `tutorial` | El paso a paso de "¿Cómo lo saco?". |

Cambia solo el texto entre comillas. **No cambies `id` ni `codigo`**: son los que dan el nombre a los archivos del ZIP.

## 4. Agregar un documento nuevo

En **`documentos.js`**, copia un documento parecido completo (desde `{ id:` hasta su `} },`), pégalo debajo y cambia:
- `id`: una palabra nueva, sin espacios ni tildes (ej. `'antecedentes'`).
- `codigo`: el siguiente número libre (ej. `'08'`).
- `nombre`, `nombreCorto` (para el panel), `ayuda`.
- `revision`: las reglas para reconocerlo (ver el punto 5). Si no sabes qué poner, deja solo
  `paginasMax` y `palabras` con 2 o 3 palabras que siempre traiga el documento, en MAYÚSCULA y sin tildes.

Para que solo se pida a algunos: `requerido: 'segunCargo'` (según la columna MANIPULACIÓN),
`omitirSiPrimerEmpleo: true` o `soloSiPrimerEmpleo: true`.

## 5. Ajustar cómo se reconoce cada documento

En **`documentos.js`**, dentro de `revision` de cada documento (todo en MAYÚSCULA y sin tildes):

| Campo | Qué hace |
|---|---|
| `paginasMax` | Máximo de páginas. Si el PDF tiene más, se rechaza. |
| `palabras` | El PDF debe traer **al menos una**. Si no, "no parece ser este documento". |
| `distintivas` | Palabras que **solo** trae este documento. Sirven para decir "esto parece ser otro documento". |
| `traeCedula` | `true` si el documento siempre trae el número de cédula. Si no lo trae, queda marcado en el resumen del ZIP. |
| `nombreArchivo` | Solo para PDF escaneados: el nombre del archivo debe tener una de estas palabras. |
| `ejemploNombre` | El ejemplo de nombre que se le muestra al candidato. |

**Si la página rechaza documentos buenos**: agrega a `palabras` y a `distintivas` las palabras que sí trae ese
documento. **Si acepta documentos que no son**: quita palabras muy comunes de `palabras` (ej. `CERTIFICA`).

## 6. Otros ajustes

| Busca | Qué cambia |
|---|---|
| `enlacePoliticaDatos` | Link de "Leer la política" de tratamiento de datos. |
| `textoAutorizacion` | Texto de la autorización de datos (debe validarlo Jurídica). |
| `diasConservacion` | Días que se guarda el avance en el celular del candidato. |
| `minutosInactividad` | Minutos sin uso para borrar todo en celulares prestados. |
| `tamanoMaximoMB` | Peso máximo de cada PDF. |
| `enlaceComprimir` | Página que se recomienda para comprimir PDF pesados. |
| `foto` | Tamaño mínimo de la foto y qué tan claro debe ser el fondo. |

## 7. Cambiar el manual del candidato

Reemplaza el archivo `manual/Manual_candidato_Documentos_de_ingreso.pdf` con **el mismo nombre**
(en GitHub: abre la carpeta `manual` → **Add file → Upload files** → arrastra el PDF nuevo → **Commit changes**).
Si usas otro nombre, cambia también `enlaceManual` en la CONFIGURACIÓN.

**Manual de aprendices SENA.** Los aprendices ven su propio manual (solo cuando abren su link de aprendiz):
1. Sube el PDF a la carpeta `manual` con el nombre `Manual_aprendiz_Documentos_de_ingreso.pdf`.
2. En `index.html` busca `enlaceManualAprendiz` y pon: `enlaceManualAprendiz: 'manual/Manual_aprendiz_Documentos_de_ingreso.pdf',`
3. Mientras `enlaceManualAprendiz` esté vacío (`''`), los aprendices ven el manual general.

Hoy ya está conectado. Para cambiarlo, reemplaza el PDF con el mismo nombre. Lo ven los aprendices en su link
y también cuando Gestión Humana le pide una corrección a un aprendiz.

## 7B. Aprendices SENA

Los aprendices **no** usan el link normal. Gestión Humana los inscribe en el panel (**Aprendices → Inscribir**:
nombre, documento, sede, sección, fecha de contrato y fecha de prácticas) y les manda un link personal por WhatsApp.
Con ese link el aprendiz verifica su número de documento, escribe su celular y correo y sube solo los documentos de
aprendiz (los que tienen `paraAprendiz` o `soloAprendiz` en `documentos.js`, por ejemplo la constancia del SENA).

| Qué quieres cambiar | Dónde |
|---|---|
| Agregar o quitar una **sede** | Panel → **Ajustes** → Sedes (nombre, sector y ciudad; botón para agregar), o `sedes` en `CONFIG_PANEL` de `panel-gh.html`. |
| Días antes de prácticas para pedir manipulación de alimentos (hoy 30) | Panel → **Ajustes**, o `diasManipulacionAprendiz`. |
| Secciones que necesitan manipulación | Panel → **Ajustes**, o `seccionesManipulacionAprendiz`. |
| Nombre del contrato que sale en el checklist | `nombreContratoAprendiz` en `panel-gh.html`. |
| Qué documentos se piden a aprendices | `paraAprendiz: true` (también a aprendices) o `soloAprendiz: true` (solo a ellos) en `documentos.js`. |

**¿Qué pasa cuando el aprendiz envía sus documentos?**
1. El ZIP llega a **Bandeja** con la etiqueta "aprendiz, solicitud N". Toca **Procesar aprendiz**.
2. Los documentos entran a la ficha de ese aprendiz (no se crea otro candidato) y queda **En revisión**.
3. En **Aprendices** sale arriba "1 aprendiz mandó documentos que falta revisar" y en su fila el botón
   **Revisar documentos**, que abre la ficha para aprobar o rechazar. El número verde del menú también los cuenta.

Cada aprendiz muestra a la derecha **cuándo entra a prácticas** (fecha grande, cuántos días faltan y la fecha del
contrato): en amarillo si faltan 30 días o menos y en rojo si faltan 7 o menos. Al lado, **cuántos días lleva en
proceso** desde que se inscribió (en rojo si pasa de los días de alerta de Ajustes), igual que en Candidatos.

En **Aprendices** puedes buscar (nombre, documento, sección o sede) y filtrar: en proceso, llegaron documentos,
algo por enviar, esperando que suba, completos y contratados, no contratados, o por sede.
En **Candidatos** y **Listos** salen candidatos y aprendices juntos (los aprendices con la etiqueta "Aprendiz");
el filtro de tipo deja ver **Solo candidatos** o **Solo aprendices**.

**Corregir o eliminar un aprendiz:** abre su ficha y toca **Editar datos o eliminar**.
- Puedes corregir nombre, celular, correo, cargo, sección, sede y fechas. Lo cambiado queda en la bitácora.
- El **número de documento** solo se puede cambiar si todavía no se le ha enviado ningún link (el link va atado a ese
  número). Si ya se envió y está mal: elimínalo e inscríbelo otra vez.
- **Eliminar aprendiz** lo pasa a la **Papelera** por los días de Ajustes: ahí lo puedes **Recuperar**. Los links que
  ya tenía dejan de funcionar.

Seguridad: cada link de aprendiz lleva un **código único**. Si alguien cambia el link o sube un ZIP que no
corresponde, el panel lo rechaza. Y el número de documento debe coincidir con el que escribió Gestión Humana.

## 7D. Citación al examen médico (link con fecha límite)

En el panel, menú **Citación**:
1. Elige la **ciudad y centro médico**, la **fecha y hora del examen** y la **fecha límite** para enviar documentos.
2. Revisa el mensaje y toca **Copiar mensaje**, **Abrir WhatsApp** o **Abrir correo**. Es un mensaje **genérico**:
   el mismo sirve para todo el grupo citado ese día (no hay que llenar datos de cada persona).
3. El link del mensaje abre la página de documentos con una tarjeta azul **"Tu examen médico"** (fecha, hora,
   centro, dirección con mapa y recomendaciones; si el cargo pide coprológico, se lo dice).
4. Después de la fecha límite el link **deja de funcionar**: el candidato ve "¡Gracias por tu interés! Este link ya no
   funciona…". Si necesita más tiempo, en **Citaciones enviadas** toca **Reenviar con nueva fecha**.
5. El link general (sin fecha) sigue funcionando como respaldo.

Cuando llega un paquete de una citación, la bandeja avisa si el link **no está registrado**, si la fecha fue
**alterada** o si **llegó después del plazo**, y la ficha muestra la fecha del examen.

| Qué quieres cambiar | Dónde |
|---|---|
| Centros médicos (ciudad, nombre, dirección) | Panel → **Ajustes** → Centros médicos. |
| Texto del mensaje | Panel → **Ajustes** → Mensaje de la citación (lo que va entre llaves lo llena el panel). |
| Hora límite que se propone | Panel → **Ajustes**. |
| Recomendaciones del examen y cargos con coprológico | Archivo **`examen.js`** (se edita igual que `documentos.js`). En `cargosCoprologico` cada línea es un cargo, o `CARGO \| SECCIÓN` para pedirlo solo en esa sección (ej. `ASESOR DE EXPERIENCIA \| POLLO CAÑAVERAL`). |
| Contacto de GH en la pantalla de link vencido | `contactoGestionHumana` en la CONFIGURACIÓN de `index.html`. |

## 7C. El panel no muestra un cambio nuevo

El panel suele quedar abierto todo el día y el navegador sigue usando la versión con la que se abrió.
Cuando se publica una nueva, sale arriba **"Hay una versión nueva del panel"**: toca **Recargar**
(o presiona **Ctrl + F5**). La versión que estás usando aparece abajo a la izquierda ("Versión …").

**Programadores:** cada vez que cambies `panel-gh.html`, sube también el número de `VERSION_PANEL`
(arriba de `function App()`), o el aviso no saldrá.

## 8. Cambiar cómo funciona la página (programadores)

El código de la app **no se edita en `index.html`** (ahí está compilado). Se edita `src/app.jsx` y luego:

```bash
npm install
```

```bash
npm run compilar
```

Se suben los dos archivos (`src/app.jsx` e `index.html`). Antes de subir, prueba con `?prueba=1` y sigue
[PRUEBAS.md](PRUEBAS.md). Para entender el código, lee [COMO_FUNCIONA.md](COMO_FUNCIONA.md).
