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

Busca `cargosTexto`. La lista se pega directo desde Excel, con 3 columnas: **CARGO | SECCIÓN | MANIPULACIÓN**.

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
