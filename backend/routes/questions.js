router.post('/random-questions', async (req, res) => {
  try {
    const { examType, count, excludeImages, userId } = req.body;
    
    // Validar los parámetros
    if (!examType || !count || !userId) {
      return res.status(400).json({ 
        message: 'Faltan parámetros requeridos' 
      });
    }

    // Obtener preguntas
    const questions = await Question.aggregate([
      { $match: excludeImages ? { image: { $exists: false } } : {} },
      { $sample: { size: count } }
    ]);

    if (!questions || questions.length === 0) {
      return res.status(404).json({ 
        message: 'No se encontraron preguntas' 
      });
    }

    res.json(questions);
  } catch (error) {
    console.error('Error en random-questions:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: error.message 
    });
  }
}); 