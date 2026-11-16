// Corrección pregunta "desigualdades evitables... injustas" (impugnación de Sonia, 16 nov 2026)
// La respuesta correcta es "Inequidad en salud", no "Equidad en salud".
// Ejecutar en mongosh (pestaña ">_ MONGOSH" de Compass o Atlas > Connect > Shell) conectado al cluster SimuLIA.
// Busca la pregunta en todas las colecciones de preguntas, hace copia de seguridad y solo modifica si encuentra exactamente 1.

const db2 = db.getSiblingDB('CSV');
const backup = db2.getCollection('backup_correcciones_2026_11_16');
const colecciones = ['examen_completos', 'examen_protocolos', 'examen_fotos', 'preguntas_escalas'];
const filtro = { question: /desigualdades evitables, consideradas injustas en el acceso a los servicios de salud/i };

const nuevaJustificacion = 'El enunciado describe la inequidad en salud: diferencias sistemáticas en salud o en el acceso a los servicios entre grupos o regiones que son evitables y se consideran injustas (definición clásica de Whitehead, recogida por la OMS y en el manual de Familiar y Comunitaria). No toda desigualdad es una inequidad: la desigualdad en salud es un término descriptivo que recoge cualquier diferencia, sea o no evitable o injusta, y solo cuando esa diferencia es evitable e injusta se habla de inequidad. La equidad en salud es el concepto opuesto, el principio o el objetivo de eliminar esas diferencias injustas para que todas las personas tengan las mismas oportunidades de alcanzar su máximo potencial de salud, por lo que no se corresponde con la definición del enunciado. Los determinantes sociales son las condiciones en las que las personas nacen, crecen, viven, trabajan y envejecen, que explican el origen de las inequidades pero no son las desigualdades en sí, y la pobreza es uno de esos determinantes.';

let encontrados = [];
colecciones.forEach(coll => {
  db2.getCollection(coll).find(filtro).forEach(doc => encontrados.push({ coll, doc }));
});

if (encontrados.length !== 1) {
  print(`⚠️  Encontrados ${encontrados.length} documentos (se esperaba 1). NO se modifica nada.`);
  encontrados.forEach(({ coll, doc }) => print(`   - ${coll} ${doc._id} | exam_name: ${doc.exam_name} | answer: ${doc.answer}`));
} else {
  const { coll, doc } = encontrados[0];
  // Localiza la opción "Inequidad en salud" por su texto (no por posición)
  const idx = [1, 2, 3, 4, 5].find(i => /^\s*inequidad en salud/i.test(String(doc['option_' + i] || '')));
  if (!idx) {
    print('⚠️  No encuentro la opción "Inequidad en salud". NO se modifica.');
  } else {
    // Mantiene el mismo formato que tenga ya el campo answer (número, número en texto o texto de la opción)
    let nuevaRespuesta;
    if (typeof doc.answer === 'number') nuevaRespuesta = idx;
    else if (/^\s*\d+\s*$/.test(String(doc.answer))) nuevaRespuesta = String(idx);
    else nuevaRespuesta = doc['option_' + idx];

    print(`📄 ${coll} ${doc._id} | exam_name: ${doc.exam_name}`);
    print(`   answer: ${JSON.stringify(doc.answer)} → ${JSON.stringify(nuevaRespuesta)} (option_${idx})`);
    backup.insertOne({ coll, label: 'Inequidad en salud (impugnación Sonia)', original: doc, savedAt: new Date() });
    const r = db2.getCollection(coll).updateOne({ _id: doc._id }, { $set: { answer: nuevaRespuesta, long_answer: nuevaJustificacion } });
    print(`✅ Modificados ${r.modifiedCount}`);
  }
}
