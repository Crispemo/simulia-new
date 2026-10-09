// Correcciones del banco de preguntas de Simulia — 9 oct 2026
// Ejecutar en mongosh (Atlas > Connect > Shell, o la pestaña ">_ MONGOSH" de Compass)
// conectado al cluster SimuLIA. Hace copia de seguridad antes de tocar nada.

const db2 = db.getSiblingDB('CSV');
const backup = db2.getCollection('backup_correcciones_2026_10_09');

function del(coll, filter, label) {
  const c = db2.getCollection(coll);
  const docs = c.find(filter).toArray();
  if (docs.length !== 1) {
    print(`⚠️  ${label}: encontrados ${docs.length} documentos (se esperaba 1). NO se borra.`);
    return;
  }
  backup.insertOne({ coll, label, original: docs[0], deleted: true, savedAt: new Date() });
  const r = c.deleteOne({ _id: docs[0]._id });
  print(`🗑️  ${label}: borrados ${r.deletedCount}`);
}

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

// ---------- examen_completos: preguntas sin opciones recuperables → se borran (copia en backup) ----------
del('examen_completos', { question: /modelo de activos para la salud, ¿cuál de estas afirmaciones es INCORRECTA/ }, 'Activos para la salud (sin opciones)');
del('examen_completos', { question: /DSM-5-TR\), ¿cuál de los siguientes diagnósticos NO ESTÁ INCLUIDO como Trastorno de la Conducta Alimentaria/ }, 'DSM-5-TR TCA (sin opciones)');
del('examen_completos', { question: /^Según Ajzen, ¿cuál de las siguientes es una teoría psicológica/ }, 'Ajzen (opciones desplazadas)');

// ---------- examen_completos: lactancia — aclarar la trampa fuerte/débil ----------
fix('examen_completos', { question: /Señale la afirmación INCORRECTA acerca de las recomendaciones sobre lactancia materna/ }, { $set: {
  long_answer: "La afirmación incorrecta es la del chupete, y lo que la hace incorrecta no es el contenido sino la fuerza de la recomendación. La Guía de Práctica Clínica sobre lactancia materna del SNS de 2017 sugiere evitar, siempre que sea posible, el chupete durante el primer mes para facilitar el inicio de la lactancia, pero como recomendación débil ('se sugiere'), no fuerte, porque la evidencia es limitada. Las otras afirmaciones reproducen bien la guía: sugiere el colecho en el hogar, en la cama o en cuna sidecar, como opción que ayuda a mantener la lactancia, con recomendación débil; y recomienda con fuerza informar del peligro de que el lactante quede solo en la cama de un adulto, un sofá o un sillón, y evitar suplementos sin indicación médica."
}}, 'Lactancia (justificación aclarada)');

// ---------- examen_fotos: preguntas con imagen equivocada o inexistente → se borran (copia en backup) ----------
del('examen_fotos', { question: /^¿Dónde se fundó la primera Escuela de Enfermería en España/ }, 'Escuela de Enfermería (foto equivocada)');
del('examen_fotos', { question: /^En los factores combinados con mayor relación/ }, 'Teorías de enfermería (foto equivocada)');
del('examen_fotos', { image: 'IMG1_2019.png' }, 'ECG frecuencia cardiaca (imagen inexistente)');

// ---------- Revisión de las 79 preguntas dudosas: correcciones adicionales ----------
fix('examen_completos', {"question": "En los estudios de investigación cuantitativa, ¿qué test se utilizaría para la comparación de medias entre tres grupos independientes, asumiendo normalidad?"}, { $set: {"option_2": "Test de ANOVA."} }, "Fila 57: Opción 2 con error de transcripción (añoVA)");
fix('examen_completos', {"question": "¿Qué test se utilizaría para la comparación de medias entre tres o más grupos apareados, en los que la distribución de los datos cuantitativos no es normal?:"}, { $set: {"option_2": "Test de ANOVA."} }, "Fila 61: Opción 2 con error de transcripción (añoVA)");
del('examen_completos', {"question": "Según el Triángulo de Evaluación Pediátrica"}, "Fila 149: Enunciado incompleto: no indica qué lados del TEP están alterados, sin respuesta posible");
fix('examen_completos', {"question": "Entre las pautas de actuación en relación con la presencia de residentes en formación en ciencias de la salud en los procesos asistenciales, regulados por la Orden SSI/81/2017, señale la opción INCORRECTA:"}, { $set: {"option_3": "Salvo supuestos especiales consentidos por el paciente y para preservar la intimidad de este, se limitará el número de residentes presentes durante los actos clínicos que se realicen en su presencia.", "long_answer": "La afirmación incorrecta es que el residente no necesite informar de que está en formación siempre que esté supervisado. La Orden SSI/81/2017 establece que el paciente debe ser informado de la presencia de residentes y de su condición de profesionales en formación, con independencia de la supervisión, que es igualmente obligatoria y no sustituye a ese deber de información. Las demás pautas sí recoge la norma: los residentes deben llevar en lugar visible la tarjeta identificativa proporcionada por la dirección del centro, han de devolverla a los servicios de personal al concluir su periodo de formación, y, para preservar la intimidad del paciente, se limita el número de residentes presentes en los actos clínicos que se realizan en su presencia, salvo supuestos especiales en los que el propio paciente lo consienta."} }, "Fila 972: Opción 3 incompleta (falta el verbo/limitación) y justificación alude al enunciado incompleto");
fix('examen_completos', {"question": "En el estudio que está usted realizando sobre el aumento de peso entre lactantes con lactancia materna exclusiva, lactancia mixta y lactancia exclusiva con fórmulas de leche preparada, la báscula que usted utiliza indica siempre un peso de 200 gramos superior al peso real. Esto causaría un error de tipo:"}, { $set: {"option_2": "De selección."} }, "Fila 1310: errata en opción 2");
fix('examen_completos', {"question": "De acuerdo con la estrategia para el abordaje de la Cronicidad en el Sistema Nacional de Salud por el Ministerio de Sanidad, Servicios Sociales e Igualdad en 2012, se consideran todas las condiciones de salud y limitaciones en la actividad de carácter crónico como:"}, { $set: {"option_4": "Enfermedades cardiovasculares, enfermedad renal crónica, cáncer, diabetes y obesidad.", "long_answer": "La Estrategia para el Abordaje de la Cronicidad en el SNS (2012) entiende la cronicidad de forma amplia, como todas las condiciones de salud y limitaciones en la actividad de carácter crónico, y cita como más relevantes las enfermedades cardiovasculares, la enfermedad respiratoria crónica, el cáncer, la diabetes y los problemas de salud mental. La lista que omite la salud mental queda incompleta, ya que esta es uno de los grandes grupos que recoge el documento. La que la limita a problemas de salud mental con minusvalía restringe indebidamente el concepto, que no exige discapacidad asociada. Y la que sustituye la salud mental y la patología respiratoria por la enfermedad renal crónica y la obesidad no corresponde a la enumeración de la estrategia, aunque sean problemas crónicos relevantes."} }, "Fila 1679: opciones 2 y 4 casi idénticas");
fix('examen_completos', {"question": "Señale la respuesta INCORRECTA. Los sistemas de información de enfermería suponen:"}, { $set: {"option_4": "Mejora de la continuidad de los cuidados.", "long_answer": "La afirmación incorrecta es la que dice que los sistemas de información de enfermería disminuyen el tiempo que se pasa con los pacientes. Al agilizar el registro y el acceso a los datos, reducen la carga burocrática y liberan tiempo para la atención directa, que así aumenta. El resto son ventajas reconocidas: reducen los errores por omisión gracias a registros estructurados, recordatorios y alertas; aumentan la satisfacción laboral de la enfermera, al simplificar tareas administrativas y facilitar su trabajo; y mejoran la continuidad de los cuidados, porque la información del paciente queda disponible y compartida entre turnos, profesionales y niveles asistenciales, lo que favorece una atención coordinada y segura."} }, "Fila 1790: opciones 1 y 4 duplicadas");
fix('examen_completos', {"question": "Teniendo en cuenta el Real Decreto 1146/2006, de 6 de octubre, por el que se regula la relación laboral especial de residencia para la formación de especialistas en Ciencias de la Salud, en el contrato de trabajo por el que se formalice la relación laboral especial de residencia:"}, { $set: {"answer": 4, "long_answer": "El Real Decreto 1146/2006 regula la relación laboral especial de residencia, a la que se accede tras superar la prueba selectiva estatal de formación sanitaria especializada. La norma establece expresamente que en el contrato de residencia no podrá pactarse periodo de prueba, ya que la idoneidad del residente queda acreditada con la superación de esa prueba selectiva y su progresión se valora después mediante las evaluaciones anuales previstas en el programa formativo de la especialidad. Por este motivo, ninguna de las alternativas que fijan una duración concreta del periodo de prueba, ya sea de un mes, inferior a tres meses o de seis meses, tiene encaje en esta regulación, y la única opción correcta es la que afirma que no podrá establecerse periodo de prueba."} }, "Fila 2481: Clave incorrecta reconocida por la justificación: el RD 1146/2006 prohíbe el periodo de prueba");
fix('examen_completos', {"question": "Según la Guía Técnica del Instituto de Seguridad y Salud en el Trabajo para la evaluación y prevención de riesgos laborales relativos al uso de equipos con pantallas de visualización de datos, la colocación de la pantalla en ningún caso debe estar a menos de:"}, { $set: {"answer": 3, "long_answer": "La Guía Técnica del INSST para la evaluación y prevención de los riesgos relativos al uso de equipos con pantallas de visualización persigue reducir la fatiga visual y la carga postural del trabajador. Para ello establece que la distancia entre los ojos del usuario y la pantalla no sea excesivamente corta, indicando que en ningún caso debe ser inferior a 400 milímetros, y recomendando distancias mayores, en torno a 500 milímetros o más, cuando se utilizan pantallas de gran tamaño. Las cifras de 300 y 350 milímetros quedan por debajo de ese mínimo y obligarían a un esfuerzo de acomodación visual excesivo, mientras que 500 milímetros es una distancia recomendable, pero no el límite mínimo que fija la guía."} }, "Fila 2497: Clave incorrecta reconocida por la justificación: la guía del INSST fija 400 mm como distancia mínima");

print('\nHecho. Copias de los originales en CSV.backup_correcciones_2026_10_09');
