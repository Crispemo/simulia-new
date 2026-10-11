// Inserta la pregunta oficial 1 de imágenes de 2019 (ECG). EJECUTAR SOLO cuando exista
// frontend/public/examen_fotos/IMG1_2019.png en la web (si no, la pregunta saldría sin imagen).
// Restauración de preguntas OFICIALES del EIR (examen_completos y examen_fotos) — 11 oct 2026
// Parte 1 de 1. Ejecutar en mongosh (pestaña ">_ MONGOSH" de Compass) conectado al cluster SimuLIA.
// Pone enunciado, opciones y respuesta EXACTOS del cuadernillo oficial (versión 0) y de la plantilla
// definitiva del Ministerio, y añade/actualiza la justificación. Guarda copia de cada documento antes de tocarlo
// en CSV.backup_oficial_2026_10_11. Se puede ejecutar dos veces sin problema.

const db2 = db.getSiblingDB('CSV');
const backup = db2.getCollection('backup_oficial_2026_10_11');
let ok = 0, warn = 0;

function oficial(coll, filter, set, label, reinsert) {
  const c = db2.getCollection(coll);
  let docs = c.find(filter).toArray();
  if (docs.length === 0 && reinsert) {
    for (const n of ['backup_correcciones_2026_10_09', 'backup_correcciones_2026_10_10']) {
      const b = db2.getCollection(n).findOne({ coll: coll, deleted: true, 'original.question': (filter.question && filter.question.$in) ? { $in: filter.question.$in } : filter.question });
      if (b) {
        if (!c.findOne({ _id: b.original._id })) c.insertOne(b.original);
        docs = c.find({ _id: b.original._id }).toArray();
        print(`↩️  ${label}: reinsertada desde ${n}`);
        break;
      }
    }
  }
  if (docs.length !== 1) { warn++; print(`⚠️  ${label}: encontrados ${docs.length} documentos (se esperaba 1). NO se toca.`); return; }
  backup.insertOne({ coll, label, original: docs[0], savedAt: new Date() });
  c.updateOne({ _id: docs[0]._id }, { $set: set });
  ok++;
}

function nueva(coll, doc, label) {
  const c = db2.getCollection(coll);
  if (c.findOne({ image: doc.image, question: doc.question })) { print(`ℹ️  ${label}: ya existía`); return; }
  c.insertOne(doc); ok++; print(`➕ ${label}: insertada`);
}

nueva('examen_fotos', {"question": "Teniendo en cuenta la imagen, indique la frecuencia cardiaca del paciente:", "image": "IMG1_2019.png", "option_1": "50 latidos por minuto.", "option_2": "65 latidos por minuto.", "option_3": "80 latidos por minuto.", "option_4": "100 latidos por minuto.", "answer": 3, "subject": "CARDIOLOGÍA", "long_answer": "Para calcular la frecuencia cardiaca en un electrocardiograma registrado a la velocidad estándar de 25 mm/s se utiliza la cuadrícula del papel: cada cuadrado pequeño (1 mm) equivale a 0,04 s y cada cuadrado grande (5 mm) a 0,20 s. En ritmos regulares, la frecuencia se obtiene dividiendo 300 entre el número de cuadrados grandes que separan dos ondas R consecutivas, o 1500 entre el número de cuadrados pequeños; en ritmos irregulares se cuentan los complejos QRS en una tira de 6 segundos (30 cuadrados grandes) y se multiplica por 10. En el trazado de la pregunta la frecuencia es de 80 latidos por minuto, que corresponde a un intervalo R-R de unos 3,75 cuadrados grandes (unos 19 cuadrados pequeños): 300/3,75 = 80, o bien 8 complejos QRS en 6 segundos. Un intervalo de 6 cuadrados grandes correspondería a 50 lpm, uno de unos 4,6 a 65 lpm y uno de 3 cuadrados grandes a 100 lpm.", "exam_name": 2019, "isDelete": false}, 'foto nueva 2019 IMG1_2019.png');
