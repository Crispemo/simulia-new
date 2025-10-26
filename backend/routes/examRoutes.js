router.get('/exam-review/:examId', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId)
      .populate('questions')
      .exec();

    if (!exam) {
      return res.status(404).json({ error: 'Examen no encontrado' });
    }

    // Asegurarse de que tenemos toda la información necesaria
    const examData = {
      exam: {
        type: exam.type,
        date: exam.date,
        correct: exam.correct,
        incorrect: exam.incorrect,
        totalQuestions: exam.totalQuestions,
        timeUsed: exam.timeUsed,
        score: exam.score,
        userAnswers: exam.userAnswers
      },
      questions: exam.questions.map(q => ({
        _id: q._id,
        question: q.question,
        option_1: q.option_1,
        option_2: q.option_2,
        option_3: q.option_3,
        option_4: q.option_4,
        option_5: q.option_5,
        answer: q.answer,
        image: q.image,
        long_answer: q.long_answer,
        subject: q.subject
      }))
    };

    res.json(examData);
  } catch (error) {
    console.error('Error al obtener revisión del examen:', error);
    res.status(500).json({ error: 'Error al obtener la revisión del examen' });
  }
}); 