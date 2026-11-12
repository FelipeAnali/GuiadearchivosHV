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

  // Coprológico: solo para estos cargos. Deben escribirse COMO ESTÁN EN cargos.js (con o sin tildes da igual);
  // si un nombre no existe allá, a nadie le saldrá el aviso. [REVISAR con GH] El anexo PDF decía
  // "Auxiliar de Panadería y Restaurante" y "Auxiliar Pollo Cañaveral", que no existen tal cual en cargos.js:
  // se puso "Auxiliar de restaurante"; falta confirmar cuál es el cargo de Pollo Cañaveral.
  cargosCoprologico: [
    'AUXILIAR DE FRUVER',
    'AUXILIAR DE PROTEINAS JUNIOR',
    'AUXILIAR DE PUNTO GOURMET',
    'AUXILIAR DE RESTAURANTE',
    'AUXILIAR DE CINEMA',
    'PANADERO',
    'AUXILIAR DE SELECCIÓN DE GRANOS',
  ],
  textoCoprologico: 'Toma la muestra de coprológico en la mañana del MISMO DÍA del examen (compra el recipiente en una farmacia). Si en la mañana no pudiste tomarla, sigue las indicaciones del personal del centro médico.',

  // Notas finales de la tarjeta
  notas: [
    'El examen no tiene ningún costo para ti.',
    'Cuando termines en el centro médico puedes irte: los resultados le llegan directamente a la empresa.',
    'Mantente atento a tu celular: te contactaremos por teléfono o WhatsApp con el resultado del proceso.',
  ],
};
