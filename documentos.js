/* ============================================================================
   DOCUMENTOS QUE SUBE EL CANDIDATO — Supertiendas Cañaveral
   ----------------------------------------------------------------------------
   Esta lista la usan LAS DOS apps:
     - la app del candidato (index.html): qué documentos pide, con sus ayudas,
       tutoriales y reglas de revisión;
     - el panel de Gestión Humana (panel-gh.html): para reconocer cada documento
       de los ZIP (por su "id") y mostrar su nombre corto.
   Así, si se agrega o cambia un documento, se hace UNA sola vez, aquí.

   Reglas para editar sin dañar nada (igual que la CONFIGURACIÓN):
     • Los textos van entre comillas simples: 'así'. Si llevan comilla simple: \'
     • Cada elemento de una lista termina en coma.
     • NO cambies el "id" ni el "codigo" de un documento que ya se está usando:
       con ellos se nombran los archivos y se reconocen en el panel.
     • Después de guardar, abre la app con ?prueba=1 y el panel con la carpeta de
       ejemplo para revisar que los dos abran bien.
   ============================================================================ */
/*
 CAMPOS DE CADA DOCUMENTO (en este orden se le muestran al candidato)
   id         → nombre interno, sin espacios ni tildes. NO cambiarlo después
                de publicar (el panel de GH lo usa para reconocer el archivo).
   codigo     → número que va al inicio del nombre del archivo en el ZIP.
   nombre     → lo que ve el candidato.
   nombreCorto → como lo muestra el panel de Gestión Humana (más corto).
   ayuda      → explicación corta debajo del nombre.
   requerido  → true (siempre) o 'segunCargo' (solo si el cargo lo pide).
   variosArchivos → true si se pueden subir varios PDF (ej. diplomas).
   paraAprendiz → true si también se le pide a los aprendices SENA (ver panel, "Aprendices").
   soloAprendiz → true si se le pide SOLO a los aprendices (no sale en el envío normal).
   cantidad   → (opcional) cuántos PDF exactos se piden (ej. 2 referencias personales).
                Hasta tenerlos todos el documento no queda completo, y no deja subir más.
   omitirSiPrimerEmpleo → true: no se pide si el candidato dice que es su primer empleo.
   soloSiPrimerEmpleo   → true: se pide SOLO si es su primer empleo (ej. referencias personales).
   tipo       → 'imagen' para la foto 3×4 (se sube JPG/PNG, no PDF). Sin tipo = PDF.
   enlaceAyuda    → (opcional) link a una página donde lo pueden sacar.
   tutorial       → (opcional) paso a paso que se abre con el botón "¿Cómo lo saco?".
       titulo, intro, nota → textos de la ventana.
       pasos   → lista de { texto, ilustracion, enlace? }.
                 ilustracion: 'formulario' | 'imprimir' | 'resultado' | 'fondo' | 'renombrar' | 'candado'.
       enlaces → (opcional) botones al final, con su tituloEnlaces.
   revision   → reglas para evitar que suban un documento en el lugar equivocado:
       paginasMax → máximo de páginas que puede tener el PDF.
       palabras   → si el PDF tiene texto, debe contener AL MENOS UNA de estas
                    palabras (sin tildes, en mayúscula). Ej. un certificado de ADRES dice "ADRES".
       distintivas → palabras que SOLO trae este documento. Si un PDF trae más palabras
                    distintivas de OTRO documento que de este, se rechaza ("parece ser X").
       traeCedula → true si el documento siempre trae el número de cédula: si no lo trae,
                    queda marcado en 00_LEEME_REVISION.txt para que GH confirme que sea suyo.
       nombreArchivo → solo para PDF escaneados o con clave (no se puede leer su texto):
                    el NOMBRE del archivo debe decir qué documento es (ej. "acta_bachiller.pdf").
     Si el PDF es escaneado (sin texto) no se pueden buscar palabras: basta con que
     traiga imagen y queda marcado "para revisión" de Gestión Humana.
     Un PDF sin texto y sin imagen (en blanco) siempre se rechaza.
*/
window.DOCUMENTOS = [
    { id: 'foto', codigo: '01', nombre: 'Foto 3×4 fondo blanco', nombreCorto: 'Foto 3×4', paraAprendiz: true,
      ayuda: 'Foto tipo documento, de frente y con fondo blanco. Súbela como imagen (JPG o PNG) desde tu galería o tómala con la cámara.',
      requerido: true, tipo: 'imagen' },

    { id: 'cedula', codigo: '02', nombre: 'Cédula ampliada al 150 %', nombreCorto: 'Cédula', paraAprendiz: true,
      ayuda: 'Por ambas caras, en un solo PDF.', requerido: true,
      revision: {
        nombreArchivo: ['CEDULA', 'CC', 'DOCUMENTO', 'IDENTIDAD', 'IDENTIFICACION'], ejemploNombre: 'cedula.pdf',
        paginasMax: 2, palabras: ['COLOMBIA', 'IDENTIFICACION', 'CEDULA', 'REGISTRADUR', 'NUIP'],
        traeCedula: true,
        distintivas: ['REGISTRADUR', 'NUIP', 'CEDULA DE CIUDADANIA', 'IDENTIFICACION PERSONAL', 'ESTATURA', 'INDICE DERECHO', 'LUGAR DE NACIMIENTO'] } },

    { id: 'diplomas', codigo: '03', nombre: 'Diplomas de estudios', nombreCorto: 'Diplomas', paraAprendiz: true,
      ayuda: 'Bachiller, técnico, tecnólogo, etc. Puedes subir un PDF por cada diploma.',
      requerido: true, variosArchivos: true,
      revision: {
        nombreArchivo: ['DIPLOMA', 'ACTA', 'BACHILLER', 'TITULO', 'GRADO', 'TECNIC', 'TECNOLOG', 'PROFESIONAL', 'ESTUDIO'], ejemploNombre: 'acta_bachiller.pdf',
        paginasMax: 4,
        palabras: ['DIPLOMA', 'BACHILLER', 'TECNIC', 'TECNOLOG', 'PROFESIONAL', 'TITULO', 'GRADO', 'ACTA', 'OTORGA', 'CERTIFICA'],
        distintivas: ['DIPLOMA', 'BACHILLER', 'ACTA DE GRADO', 'TITULO DE', 'OTORGA', 'CONFIERE', 'GRADUAD'] } },

    { id: 'manipulacion', codigo: '04', nombre: 'Certificado de manipulación de alimentos', nombreCorto: 'Manipulación de alimentos', paraAprendiz: true,
      ayuda: 'Vigente y con mínimo 10 horas de formación.',
      ayudaDecreto1500: 'Vigente y bajo el Decreto 1500 de 2007. Es obligatorio para tu cargo.',
      requerido: 'segunCargo',
      revision: {
        nombreArchivo: ['MANIPULA', 'ALIMENTO', 'INOCUIDAD'], ejemploNombre: 'manipulacion_alimentos.pdf',
        paginasMax: 3, palabras: ['MANIPULA', 'ALIMENTO', 'INOCUIDAD'],
        distintivas: ['MANIPULA', 'INOCUIDAD', 'BUENAS PRACTICAS DE MANUFACTURA'] } },

    { id: 'referencia', codigo: '05', nombre: 'Última referencia laboral', nombreCorto: 'Referencia laboral',
      ayuda: 'Con membrete de la empresa y firma.', requerido: true, omitirSiPrimerEmpleo: true,
      revision: {
        nombreArchivo: ['REFERENCIA', 'LABORAL', 'TRABAJO', 'EXPERIENCIA'], ejemploNombre: 'referencia_laboral.pdf',
        paginasMax: 3, palabras: ['CERTIFIC', 'LABOR', 'TRABAJ', 'REFERENCIA', 'CARGO', 'EMPRESA'],
        distintivas: ['LABORO', 'LABORANDO', 'REFERENCIA LABORAL', 'CERTIFICACION LABORAL', 'CONSTANCIA LABORAL', 'DESEMPEN', 'SALARIO', 'CONTRATO',
                      'TRABAJO', 'TRABAJA', 'PRESTO SUS SERVICIOS', 'VINCULAD', 'HACE CONSTAR', 'NUESTRA EMPRESA', 'CON NOSOTROS'] } },

    // Solo para quien dice que es su primer empleo (reemplaza la referencia laboral)
    { id: 'referencia_personal', codigo: '05', nombre: 'Referencias personales', nombreCorto: 'Referencias personales',
      ayuda: 'Necesitas 2 cartas de referencia personal, cada una con el nombre, teléfono y firma de quien te recomienda. Sube un PDF por cada carta.',
      requerido: true, soloSiPrimerEmpleo: true, variosArchivos: true, cantidad: 2,
      revision: {
        nombreArchivo: ['REFERENCIA', 'PERSONAL', 'RECOMENDACION', 'CARTA'], ejemploNombre: 'referencia_personal.pdf',
        paginasMax: 2, palabras: ['REFERENCIA', 'RECOMIENDO', 'RECOMENDACION', 'CONOZCO', 'PERSONAL', 'CERTIFIC'],
        distintivas: ['REFERENCIA PERSONAL', 'RECOMIENDO', 'CONOZCO', 'RECOMENDACION PERSONAL'] } },

    { id: 'adres', codigo: '06', nombre: 'Certificado de afiliación a EPS (ADRES)', nombreCorto: 'Certificado de EPS (ADRES)', paraAprendiz: true,
      ayuda: 'Lo descargas gratis en la página de ADRES con tu número de documento.',
      enlaceAyuda: { texto: 'Consultar en ADRES', url: 'https://www.adres.gov.co/consulte-su-eps' },
      tutorial: {
        titulo: 'Cómo sacar el certificado de EPS',
        intro: 'Es gratis, no necesitas usuario ni clave y toma unos 3 minutos. Ten a mano tu número de documento.',
        pasos: [
          { ilustracion: 'formulario',
            texto: 'Entra a la consulta de ADRES (revisa que la dirección termine en adres.gov.co). Elige tu tipo de documento, escribe tu número sin puntos, resuelve el código de seguridad y toca Consultar.',
            enlace: { texto: 'Abrir ADRES', url: 'https://www.adres.gov.co/consulte-su-eps' } },
          { ilustracion: 'imprimir',
            texto: 'Con el resultado en pantalla, guárdalo en PDF. En el celular: menú del navegador (⋮ o Compartir) → Imprimir → Guardar como PDF. En computador: Ctrl + P → Guardar como PDF.' },
          { ilustracion: 'renombrar',
            texto: 'Ponle al archivo el nombre certificado_eps.pdf, vuelve a esta página y súbelo en este documento.' },
        ],
        nota: 'Si tu avance se está guardando, no pierdes nada al salir a ADRES y volver.',
      },
      requerido: true,
      revision: {
        nombreArchivo: ['ADRES', 'EPS', 'SALUD', 'BDUA', 'AFILIACION'], ejemploNombre: 'certificado_eps.pdf',
        paginasMax: 3, palabras: ['ADRES', 'BDUA', 'AFILIA'],
        traeCedula: true,
        distintivas: ['ADRES', 'BDUA', 'BASE DE DATOS UNICA DE AFILIADOS', 'REGIMEN CONTRIBUTIVO', 'REGIMEN SUBSIDIADO'] } },

    { id: 'pension', codigo: '07', nombre: 'Certificado del fondo de pensión', nombreCorto: 'Certificado de pensión',
      ayuda: 'Si no recuerdas a qué fondo estás afiliado, consúltalo en el RUAF.',
      enlaceAyuda: { texto: 'Consultar en RUAF', url: 'https://ruaf.sispro.gov.co/' },
      tutorial: {
        titulo: 'Cómo sacar el certificado de pensión',
        intro: 'El certificado lo da tu fondo de pensión. Primero averigua cuál es tu fondo y luego descárgalo en su página.',
        pasos: [
          { ilustracion: 'resultado',
            texto: '¿No sabes cuál es tu fondo? Entra al RUAF, elige "Afiliaciones de la persona", escribe tu tipo y número de documento y toca Consultar. En la línea de Pensión aparece tu fondo.',
            enlace: { texto: 'Abrir RUAF', url: 'https://ruaf.sispro.gov.co/' } },
          { ilustracion: 'fondo',
            texto: 'Entra a la página de tu fondo (botones de abajo) y busca la opción Certificados → Certificado de afiliación. La primera vez casi todos piden crear un usuario con tu cédula y una clave.' },
          { ilustracion: 'candado',
            texto: 'Algunos fondos lo envían a tu correo en PDF con clave (normalmente tu cédula). No se la quites: esta página lo acepta así.' },
          { ilustracion: 'renombrar',
            texto: 'Ponle al archivo el nombre certificado_pension.pdf, vuelve a esta página y súbelo en este documento.' },
        ],
        tituloEnlaces: 'Páginas de los fondos',
        enlaces: [
          { texto: 'Colpensiones', url: 'https://www.colpensiones.gov.co/' },
          { texto: 'Porvenir', url: 'https://www.porvenir.com.co/' },
          { texto: 'Protección', url: 'https://www.proteccion.com/' },
          { texto: 'Colfondos', url: 'https://www.colfondos.com.co/' },
          { texto: 'Skandia', url: 'https://www.skandia.com.co/' },
        ],
        nota: 'Si no recuerdas tu clave del fondo, usa la opción "Olvidé mi clave" de su página o llama a su línea de atención.',
      },
      requerido: true, omitirSiPrimerEmpleo: true,
      revision: {
        nombreArchivo: ['PENSION', 'FONDO', 'RUAF', 'COLPENSIONES', 'PORVENIR', 'PROTECCION', 'COLFONDOS', 'SKANDIA'], ejemploNombre: 'certificado_pension.pdf',
        paginasMax: 4,
        palabras: ['PENSION', 'RUAF', 'COLPENSIONES', 'PORVENIR', 'PROTECCION', 'COLFONDOS', 'SKANDIA'],
        traeCedula: true,
        distintivas: ['PENSION', 'COLPENSIONES', 'PORVENIR', 'COLFONDOS', 'SKANDIA', 'CESANTIAS', 'RUAF'] } },

    // Solo para aprendices SENA
    { id: 'constancia_sena', codigo: '08', nombre: 'Constancia del SENA', nombreCorto: 'Constancia del SENA',
      paraAprendiz: true, soloAprendiz: true,
      ayuda: 'Certificado de matrícula o constancia de la etapa en la que vas (lectiva o productiva). La descargas de Sofía Plus o te la da tu centro de formación.',
      requerido: true,
      revision: {
        nombreArchivo: ['SENA', 'CONSTANCIA', 'MATRICULA', 'CERTIFICADO', 'ETAPA', 'FICHA'], ejemploNombre: 'constancia_sena.pdf',
        paginasMax: 3, palabras: ['SENA', 'SERVICIO NACIONAL DE APRENDIZAJE', 'APRENDIZ', 'MATRICULA', 'FICHA'],
        traeCedula: true,
        distintivas: ['SERVICIO NACIONAL DE APRENDIZAJE', 'SENA', 'APRENDIZ', 'FICHA', 'ETAPA LECTIVA', 'ETAPA PRODUCTIVA', 'SOFIA PLUS'] } },
];
