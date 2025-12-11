const mongoose = require('mongoose');

const preguntaSchema = new mongoose.Schema({
  question: String,
  option_1: String,
  option_2: String,
  option_3: String,
  option_4: String,
  option_5: String,
  answer: String,
  exam_name: String,
  subject: String,
  image: String,
  long_answer: String,
}, { 
  collection: 'examen_completos',
  strict: false // Permitir campos adicionales
});

const preguntaFotosSchema = new mongoose.Schema({
  question: String,
  image: String,  // CRÍTICO: En la BD real el campo es 'image', no 'imagen'
  imagen: String, // Mantener para compatibilidad
  option_1: String,
  option_2: String,
  option_3: String,
  option_4: String,
  option_5: String, // Añadir option_5 por si acaso
  answer: Number,
  exam_name: String,
  subject: String,
  long_answer: String,
}, { collection: 'examen_fotos', strict: false }); // strict: false para permitir campos adicionales

const protocoloSchema = new mongoose.Schema({
  question: String,
  option_1: String,
  option_2: String,
  option_3: String,
  option_4: String,
  option_5: String,
  answer: Number,
  exam_name: String,
  subject: String,
  long_answer: String,
}, { collection: 'examen_protocolos' });

const ExamenCompleto = mongoose.model('ExamenCompleto', preguntaSchema);
const ExamenFotos = mongoose.model('ExamenFotos', preguntaFotosSchema, 'examen_fotos');
const ExamenProtocolos = mongoose.model('ExamenProtocolos', protocoloSchema, 'examen_protocolos');

module.exports = { ExamenCompleto, ExamenFotos, ExamenProtocolos };









