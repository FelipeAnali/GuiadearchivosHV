/* ============================================================================
   EXAMEN MÉDICO DE INGRESO — información que ve el candidato
   ----------------------------------------------------------------------------
   Lo usan las dos apps:
     - La app del candidato (index.html) muestra la tarjeta "Tu examen médico" cuando
       el candidato abre un link de citación (el que arma el panel en "Citación").
     - El panel (panel-gh.html) toma de aquí las recomendaciones para el mensaje.

   La FECHA, la HORA y el CENTRO MÉDICO no van aquí: los elige Gestión Humana en el
   panel cada vez que arma una citación (los centros se editan en Ajustes del panel).

   Cómo editar (igual que documentos.js): abrir este archivo en GitHub → lápiz ✏️ →
   cambiar el texto entre comillas → Commit changes. Cada línea de una lista termina en coma.
   ============================================================================ */
window.EXAMEN = {
  // Título de la tarjeta en la app
  titulo: 'Tu examen médico de ingreso',

  // Recomendaciones para presentarse al examen (se muestran en la app, en este orden)
  recomendaciones: [
    'Llega puntual a la hora de tu cita.',
    'Lleva tu documento de identidad original.',
    'En la recepción di que estás en un proceso de selección con Supertiendas Cañaveral.',
    'Ve en ayunas: tu última comida debe ser el día anterior hasta las 7:00 p. m.',
    'Después de esa hora no tomes agua, café, té ni ningún otro alimento.',
    'La noche anterior no comas lácteos, granos, comidas rápidas ni comida con mucha grasa.',
    'No lleves las uñas maquilladas.',
  ],

  // Coprológico: a quién se le pide. Cada línea es un CARGO, o un CARGO | SECCIÓN (ese cargo solo en esa sección),
  // escritos como en cargos.js (con o sin tildes da igual). Así quedó lo que decía el anexo PDF:
  //   Auxiliar de Panadería y Restaurante → Auxiliar de restaurante y Asesor de experiencia en PANADERIA Y RESTAURANTE
  //   Auxiliar Pollo Cañaveral            → Asesor de experiencia en POLLO CAÑAVERAL
  cargosCoprologico: [
    'AUXILIAR DE FRUVER | FRUVER',
    'AUXILIAR DE PROTEINAS JUNIOR',
    'AUXILIAR DE PUNTO GOURMET | PUNTO GOURMET',
    'AUXILIAR DE RESTAURANTE | PANADERIA Y RESTAURANTE',
    'ASESOR DE EXPERIENCIA | PANADERIA Y RESTAURANTE',
    'ASESOR DE EXPERIENCIA | POLLO CAÑAVERAL',
    'AUXILIAR DE CINEMA | OPERACION CINEMAS',
    'PANADERO | PANADERIA Y RESTAURANTE',
    'AUXILIAR DE SELECCIÓN DE GRANOS | PRODUCCION GRANOS',
  ],
  textoCoprologico: 'Toma la muestra de coprológico en la mañana del MISMO DÍA del examen (compra el recipiente en una farmacia). Si en la mañana no pudiste tomarla, sigue las indicaciones del personal del centro médico.',

  // Notas finales de la tarjeta
  notas: [
    'El examen no tiene ningún costo para ti.',
    'Cuando termines en el centro médico puedes irte: los resultados le llegan directamente a la empresa.',
    'Mantente atento a tu celular: te contactaremos por teléfono o WhatsApp con el resultado del proceso.',
  ],
};

/** ¿Al cargo (en esa sección) se le pide coprológico? Lo usan la app y el panel. */
window.EXAMEN.pideCoprologico = function (cargo, seccion) {
  const n = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  return window.EXAMEN.cargosCoprologico.some((linea) => {
    const [c, s] = linea.split('|').map(n);
    return c === n(cargo) && (!s || s === n(seccion));
  });
};

/** "Asesor de experiencia (Pollo Cañaveral)" para mostrar la lista. */
window.EXAMEN.textoCargosCoprologico = function () {
  const bonito = (t) => t.charAt(0) + t.slice(1).toLowerCase();
  return window.EXAMEN.cargosCoprologico.map((linea) => {
    const [c, s] = linea.split('|').map((x) => x.trim());
    // La sección solo se muestra si no está ya en el nombre del cargo ("Auxiliar de fruver", no "Auxiliar de fruver (Fruver)")
    return s && !c.toUpperCase().includes(s.toUpperCase()) ? `${bonito(c)} (${bonito(s)})` : bonito(c);
  }).join(', ');
};
