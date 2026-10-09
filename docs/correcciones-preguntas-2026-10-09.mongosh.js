// Correcciones del banco de preguntas de Simulia — 9 oct 2026
// Ejecutar en mongosh (Atlas > Connect > Shell, o la pestaña ">_ MONGOSH" de Compass)
// conectado al cluster SimuLIA. Hace copia de seguridad antes de tocar nada.

const db2 = db.getSiblingDB('CSV');
const backup = db2.getCollection('backup_correcciones_2026_10_09');

function fix(coll, filter, update, label) {
  const c = db2.getCollection(coll);
  const docs = c.find(filter).toArray();
  if (docs.length !== 1) {
    print(`⚠️  ${label}: encontrados ${docs.length} documentos (se esperaba 1). NO se modifica.`);
    return;
  }
  backup.insertOne({ coll, label, original: docs[0], savedAt: new Date() });
  const r = c.updateOne({ _id: docs[0]._id }, update);
  print(`✅ ${label}: modificados ${r.modifiedCount}`);
}

// ---------- examen_completos: opciones duplicadas o mal escritas ----------
fix('examen_completos', { question: /antagonista de los receptores tipo 3 de serotonina/ }, { $set: {
  option_1: 'Ondansetrón.',
  option_3: 'Haloperidol.',
  long_answer: "El ondansetrón es el prototipo de los antagonistas de los receptores 5-HT3 de serotonina ('setrones', junto con granisetrón o palonosetrón). Bloquea estos receptores en la zona gatillo quimiorreceptora y en las aferencias vagales del tubo digestivo, y está indicado en la prevención y el tratamiento de las náuseas y vómitos postoperatorios y los inducidos por quimioterapia, tanto en adultos como en niños. La metoclopramida y la domperidona actúan principalmente como antagonistas de los receptores dopaminérgicos D2 y son procinéticos, y el haloperidol es un neuroléptico que también bloquea receptores D2; ninguno pertenece al grupo de los antagonistas 5-HT3."
}}, 'Ondansetrón (opción repetida)');

fix('examen_completos', { question: /miomas del cuerpo uterino que se mantienen en el espesor/ }, { $set: {
  option_4: 'Cervicales.',
  long_answer: 'Los miomas se clasifican según su relación con las capas del útero. Los intramurales crecen dentro del espesor del miometrio y son los más frecuentes; pueden aumentar el tamaño uterino y provocar sangrado abundante. Los subserosos crecen hacia la superficie externa, bajo la serosa peritoneal, y suelen dar clínica por compresión de órganos vecinos. Los submucosos protruyen hacia la cavidad endometrial, bajo el endometrio, y son los que más se asocian a menorragia e infertilidad aunque sean pequeños. Los cervicales se localizan en el cuello uterino, no en el cuerpo.'
}}, 'Miomas (opción repetida)');

fix('examen_completos', { question: /^¿Cuáles son los tres tipos de células óseas\?/ }, { $set: {
  option_4: 'Osteoblastos, osteocitos y trabéculas.'
}}, 'Células óseas (opción repetida)');

fix('examen_completos', { question: /células tiroideas secretoras de calcitonina/ }, { $set: {
  option_2: 'Células tiroglobulares.',
  option_4: 'Células oxífilas.',
  long_answer: 'La calcitonina la producen las células parafoliculares o células C del tiroides, situadas entre los folículos y derivadas de la cresta neural. Es una hormona hipocalcemiante que inhibe la actividad de los osteoclastos y la resorción ósea, con efecto contrario a la parathormona. Los tirocitos o células foliculares son las que sintetizan tiroxina y triyodotironina a partir de la tiroglobulina, por lo que no secretan calcitonina. Las células oxífilas pertenecen a las glándulas paratiroides y tampoco producen calcitonina. Células tiroglobulares y tiroclastos no son denominaciones reales de ningún tipo celular tiroideo (conviene no confundir tiroclastos con osteoclastos, que son las células óseas sobre las que actúa la calcitonina).'
}}, 'Calcitonina (opción repetida)');

fix('examen_completos', { question: /resultado del Riesgo Relativo \(RR\) indica que no hay asociación/ }, { $set: {
  option_4: 'RR = 0.'
}}, 'Riesgo relativo (errata)');

// ---------- examen_completos: opciones que faltaban ----------
fix('examen_completos', { question: /onda del electrocardiograma coincide la descarga eléctrica en una cardioversión/ }, { $set: {
  option_4: 'Con la onda Q.',
  option_5: 'Con la onda R.',
  long_answer: 'En la cardioversión eléctrica la descarga se sincroniza con la onda R del complejo QRS, como recoge el manual de Cardiovascular, para no liberarla durante la onda T, que es el periodo vulnerable de la repolarización en el que un choque puede desencadenar una fibrilación ventricular. Por eso no es indiferente y nunca debe coincidir con la onda T ni con la onda P; la onda Q no es el punto de referencia de la sincronización. En la desfibrilación, en cambio, la descarga no se sincroniza con ninguna onda.'
}}, 'Cardioversión (faltaban opciones 4 y 5)');

fix('examen_completos', { question: /desarrollo psicomotor y el área del lenguaje y la sociabilidad en un niño\/a de cuatro años/ }, { $set: {
  option_5: 'Todos son signos de alarma.',
  long_answer: 'A los 4 años se consideran signos de alarma del desarrollo la detención brusca en la adquisición de habilidades o la pérdida de otras ya adquiridas (regresión), la hiperactividad marcada con incapacidad para entretenerse solo, la sociabilidad excesiva e indiscriminada, que refleja falta de vínculo selectivo, y la ecolalia, es decir, repetir las preguntas en lugar de responderlas. Todos estos hallazgos obligan a una valoración más profunda del desarrollo, ya que pueden asociarse a trastornos del neurodesarrollo como el trastorno del espectro autista, por lo que la respuesta correcta es que todos son signos de alarma.'
}}, 'Desarrollo 4 años (faltaba opción 5)');

// ---------- examen_completos: preguntas sin opciones recuperables → se ocultan (no se borran) ----------
fix('examen_completos', { question: /modelo de activos para la salud, ¿cuál de estas afirmaciones es INCORRECTA/ }, { $set: { isDelete: true, motivoOculta: 'Sin opciones de respuesta' } }, 'Activos para la salud (sin opciones)');
fix('examen_completos', { question: /DSM-5-TR\), ¿cuál de los siguientes diagnósticos NO ESTÁ INCLUIDO como Trastorno de la Conducta Alimentaria/ }, { $set: { isDelete: true, motivoOculta: 'Sin opciones de respuesta' } }, 'DSM-5-TR TCA (sin opciones)');
fix('examen_completos', { question: /^Según Ajzen, ¿cuál de las siguientes es una teoría psicológica/ }, { $set: { isDelete: true, motivoOculta: 'Opciones de otra pregunta y sin respuesta' } }, 'Ajzen (opciones desplazadas)');

// ---------- examen_completos: lactancia — aclarar la trampa fuerte/débil ----------
fix('examen_completos', { question: /Señale la afirmación INCORRECTA acerca de las recomendaciones sobre lactancia materna/ }, { $set: {
  long_answer: "La afirmación incorrecta es la del chupete, y lo que la hace incorrecta no es el contenido sino la fuerza de la recomendación. La Guía de Práctica Clínica sobre lactancia materna del SNS de 2017 sugiere evitar, siempre que sea posible, el chupete durante el primer mes para facilitar el inicio de la lactancia, pero como recomendación débil ('se sugiere'), no fuerte, porque la evidencia es limitada. Las otras afirmaciones reproducen bien la guía: sugiere el colecho en el hogar, en la cama o en cuna sidecar, como opción que ayuda a mantener la lactancia, con recomendación débil; y recomienda con fuerza informar del peligro de que el lactante quede solo en la cama de un adulto, un sofá o un sillón, y evitar suplementos sin indicación médica."
}}, 'Lactancia (justificación aclarada)');

// ---------- examen_fotos: preguntas con imagen equivocada o inexistente → se ocultan ----------
fix('examen_fotos', { question: /^¿Dónde se fundó la primera Escuela de Enfermería en España/ }, { $set: { isDelete: true, motivoOculta: 'No es pregunta de imagen; tenía la foto de otra pregunta (IMG11_2021)' } }, 'Escuela de Enfermería (foto equivocada)');
fix('examen_fotos', { question: /^En los factores combinados con mayor relación/ }, { $set: { isDelete: true, motivoOculta: 'No es pregunta de imagen; tenía la foto de otra pregunta (IMG12_2021)' } }, 'Teorías de enfermería (foto equivocada)');
fix('examen_fotos', { image: 'IMG1_2019.png' }, { $set: { isDelete: true, motivoOculta: 'Falta el archivo IMG1_2019.png' } }, 'ECG frecuencia cardiaca (imagen inexistente)');

print('\nHecho. Copias de los originales en CSV.backup_correcciones_2026_10_09');
