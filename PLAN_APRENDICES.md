# Plan: aprendices SENA

Documento para revisar **antes** de construir. Las dos apps (la del candidato y el panel de Gestión Humana) cambian.

## La idea en una frase
Gestión Humana **inscribe al aprendiz en el panel** con sus datos y fechas, el panel le arma **un link** y el aprendiz
**solo sube los documentos** que se le piden. La **manipulación de alimentos** se pide solo si su sección la necesita y
**cuando falten 30 días o menos para que entre a prácticas**; si falta más, el panel avisa cuándo pedirla.

## Cómo funciona

### 1. Inscribir (panel)
Botón **"Inscribir aprendiz"**. Gestión Humana llena:

| Dato | Detalle |
|---|---|
| Tipo y número de documento | Igual que en la app (CC, CE, PPT, Pasaporte) |
| Nombre completo | |
| Celular con WhatsApp y correo | Para mandarle el link y los avisos |
| Cargo y sección | Se eligen de la lista de cargos (la misma de la app: archivo compartido `cargos.js`) |
| Sede | Se elige de una lista que se edita en **Ajustes** |
| Fecha del contrato | Solo como dato (ej. 15 de enero) |
| Fecha de ingreso a prácticas | **La que cuenta** para los 30 días (ej. 15 de junio) |

El panel crea su carpeta en `Candidatos` (marcada como **aprendiz**) y con la fecha de prácticas muestra solo si está
**"En etapa lectiva"** (patrocinado, todavía estudia) o **"En prácticas"**.

### 2. Primer link (documentos)
Al inscribirlo, el panel arma el link y el mensaje (Copiar / WhatsApp / correo), igual que "Pedir correcciones":

| Situación | Qué pide el link |
|---|---|
| Su sección **no** pide manipulación | Los documentos de aprendiz |
| Su sección **sí** la pide y faltan **más de 30 días** | Los documentos de aprendiz, **sin** manipulación |
| Su sección **sí** la pide y faltan **30 días o menos** | Los documentos de aprendiz **con** manipulación |

### 3. Vista "Aprendices" (panel)
Lista ordenada por **días que faltan para prácticas**, con el estado de la manipulación de cada uno:
- *No aplica* (su sección no la pide)
- *Se pide a 30 días — faltan 120*
- **Pedir ya** (llegó a 30 días y no se ha pedido) → botón **"Pedir manipulación"**: segundo link solo con eso
- *Pedida* / *Recibida*

Arriba sale un aviso: *"2 aprendices ya están a 30 días: pide la manipulación"*.
Como el panel no tiene servidor, **no manda mensajes solo**: el aviso aparece al abrir el panel y GH toca el botón.

### 4. Lo que hace el aprendiz (app)
El link abre la app en modo **aprendiz** (igual que el modo corrección, que ya existe):
1. *"Hola Laura, sube tus documentos de aprendiz"* y la lista de lo que se le pide.
2. ¿El dispositivo es suyo o prestado? (misma regla de guardado y borrado).
3. **Acepta la autorización de datos** (solo en el primer link; en el de manipulación ya la aceptó).
4. **Verifica su número de documento y confirma su celular con WhatsApp y su correo actuales** (doble verificación:
   si son distintos a los que registró GH, el panel actualiza la ficha y lo anota en la bitácora).
5. Sube solo lo pedido, con las mismas revisiones de siempre.
6. Descarga el ZIP (`<documento>_APRENDIZ_<n>.zip`) y lo sube con el mismo link de OneDrive.

### 5. Recibir (panel)
La **Bandeja** procesa el ZIP del aprendiz como una corrección: los documentos quedan "pendiente" para revisar, se
marca la solicitud como recibida y queda en la bitácora. Después todo sigue igual: aprobar, rechazar, **pedir
correcciones**, checklist de GH, Listos y Papelera.

## Documentos de aprendiz
- Foto 3×4
- Documento de identidad
- Certificado de EPS (ADRES)
- Certificado de estudios (diploma o acta de bachiller)
- **Constancia del SENA** (nuevo: matrícula o etapa en la que va)
- **Manipulación de alimentos**: solo si su sección la pide, y con la regla de los 30 días

Se marcan en `documentos.js`, así se pueden cambiar sin tocar código.

## Checklist de Gestión Humana
El **mismo** de los empleados. Lo único que cambia es que, para aprendices, "Contrato de trabajo" se muestra como
**"Contrato de aprendizaje SENA"**.

## Al terminar
Igual que los demás: **Completo → Listos** (con la etiqueta "Aprendiz"). Si no sigue → **Papelera** (7 días).

## Seguridad (3 filtros)
1. **En la app:** el aprendiz debe escribir **su número de documento**; si no coincide con el inscrito, no sigue.
   El link no muestra la cédula (solo el nombre de pila).
2. **En el panel:** solo procesa ZIP de **aprendices inscritos**, con **solo lo pedido** y de **una solicitud enviada**.
3. **Código único por link:** cada link lleva un código aleatorio que solo queda en el expediente; la app lo mete en el
   ZIP y el panel revisa que coincida (si no, "no viene del link enviado" y no se procesa).
   Este filtro también se agrega a las **correcciones**.

## Nuevo en Ajustes (panel)
| Ajuste | Por defecto |
|---|---|
| Días antes de prácticas para pedir manipulación | 30 |
| Secciones de aprendices que piden manipulación | CAJAS Y SERVICIO AL CLIENTE, SURTIDO, BODEGA, BODEGA LA DOLORES, LOGISTICA, LOGISTICA LA DOLORES, PANADERIA Y RESTAURANTE, RECIBO, SGA |
| Sedes | (vacía: la llenan ustedes) |
| Nombre del contrato para aprendices | Contrato de aprendizaje SENA |

## Construcción por partes
1. **Bases compartidas:** `cargos.js` (lista de cargos para las dos apps), documentos de aprendiz y constancia del SENA
   en `documentos.js`, ajustes nuevos.
2. **Panel:** inscribir aprendiz, vista Aprendices con los días, link y mensaje del primer envío y de la manipulación.
3. **App del candidato:** modo aprendiz (autorización, verificación del documento, solo lo pedido, ZIP).
4. **Panel:** procesar los ZIP de aprendiz y el código único (también en correcciones).
5. **Pruebas de punta a punta** (celular y computador) y guías actualizadas (GUIA, COMO_FUNCIONA, PRUEBAS).

Los links de corrección que ya se enviaron siguen sirviendo.
