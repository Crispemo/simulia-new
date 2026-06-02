export const dashboardArticles = [
  {
    id: 1,
    title: "Metodología tipo test: todas las claves para dominar el EIR",
    description: "Estrategias y técnicas basadas en evidencia para responder preguntas tipo test: puntuación, eliminación, gestión del tiempo y control mental.",
    image: "/clave.png",
    category: "Estrategia",
    readingTime: 8,
    content: [
      {
        type: 'h1',
        text: "Metodología tipo test: todas las claves para dominar el EIR"
      },
      {
        type: 'p',
        text: "El EIR es un examen de 200 preguntas tipo test con cuatro opciones de respuesta. No basta con saber la materia: necesitas saber cómo responder. La forma en que afrontas cada pregunta —cómo lees, cuándo descartas, cuándo dejas en blanco, cómo gestionas el tiempo— puede marcar la diferencia de varios puntos en el resultado final."
      },
      {
        type: 'p',
        text: "Esta guía recoge la metodología tipo test respaldada por la investigación en psicología cognitiva y las estrategias validadas por opositoras que han superado el EIR. No hay atajos mágicos, pero sí técnicas concretas que puedes entrenar."
      },
      {
        type: 'h2',
        text: "1. Entiende el sistema de puntuación antes de cualquier estrategia"
      },
      {
        type: 'p',
        text: "Toda estrategia tipo test en el EIR parte del mismo punto: conocer el sistema de puntuación oficial. Ignorarlo es el primer error."
      },
      {
        type: 'table',
        headers: ["Respuesta", "Puntuación"],
        rows: [
          ["Correcta", "+3 puntos"],
          ["Incorrecta", "−1 punto"],
          ["En blanco", "0 puntos"]
        ]
      },
      {
        type: 'p',
        text: "Esto tiene una consecuencia directa: no todas las dudas merecen una respuesta. Si tienes menos del 25% de probabilidades de acertar (es decir, no puedes eliminar ninguna opción y no tienes ninguna pista), dejar en blanco es matemáticamente más rentable que responder al azar."
      },
      {
        type: 'p',
        text: "La regla práctica: si puedes eliminar al menos una opción de cuatro, ya tienes más de un 33% de probabilidades. En ese caso, responder suele ser más rentable que dejar en blanco. Si puedes eliminar dos opciones, tienes un 50% de probabilidades: responde siempre."
      },
      {
        type: 'h2',
        text: "2. El orden de resolución: primero lo que sabes"
      },
      {
        type: 'p',
        text: "Uno de los principios más sólidos de la metodología tipo test es no quedarse atascada en una pregunta difícil mientras las fáciles esperan. Las investigaciones sobre gestión del tiempo en exámenes de alta complejidad (como las revisadas por Bridges, 2009, en el contexto de los exámenes NCLEX) demuestran que las personas que hacen una primera pasada rápida obtienen mejores resultados globales."
      },
      {
        type: 'p',
        text: "El método recomendado tiene tres pasadas:"
      },
      {
        type: 'ol',
        items: [
          "Primera pasada — responde todas las preguntas que sabes sin dudar. Máximo 45 segundos por pregunta. Marca las dudosas.",
          "Segunda pasada — vuelve a las preguntas marcadas. Ahora razona con más calma. Aplica técnicas de eliminación.",
          "Tercera pasada (opcional) — en los últimos 20 minutos, revisa respuestas marcadas si te queda tiempo. No cambies sin razón sólida."
        ]
      },
      {
        type: 'p',
        text: "Importante: con 200 preguntas en 4 horas dispones de una media de 1 minuto y 12 segundos por pregunta. Ese ritmo es cómodo si no te bloqueas en las difíciles."
      },
      {
        type: 'h2',
        text: "3. Cómo leer una pregunta tipo test correctamente"
      },
      {
        type: 'p',
        text: "La lectura activa es la técnica con mayor impacto en el rendimiento tipo test. El error más frecuente es leer la pregunta una vez rápido, leer las opciones y elegir la primera que suena bien. Esto genera errores evitables."
      },
      {
        type: 'h3',
        text: "Los 4 pasos de lectura correcta"
      },
      {
        type: 'ol',
        items: [
          "Lee el enunciado completo y subraya mentalmente la palabra clave (diagnóstico, intervención, prioridad, excepción…).",
          "Antes de leer las opciones, formula mentalmente tu respuesta ideal. ¿Qué contestarías sin ver las opciones?",
          "Lee las cuatro opciones completas, sin saltarte ninguna. Una opción mejor que la primera puede aparecer al final.",
          "Elige la opción que más se acerca a tu respuesta mental. Si ninguna encaja, aplica eliminación."
        ]
      },
      {
        type: 'h3',
        text: "Palabras clave que cambian el sentido de la pregunta"
      },
      {
        type: 'p',
        text: "Estas palabras alteran completamente lo que se pide. Detectarlas cambia la respuesta:"
      },
      {
        type: 'ul',
        items: [
          "EXCEPTO / NO / INCORRECTO → la respuesta correcta es la opción FALSA. Lee las cuatro buscando la que no encaja.",
          "PRIMERO / PRIORITARIO / INMEDIATO → jerarquía de actuación, no solo lo correcto.",
          "SIEMPRE / NUNCA / TODOS → estas palabras absolutas suelen indicar opciones incorrectas (pocas cosas en clínica son absolutas).",
          "MEJOR / MÁS IMPORTANTE → puede haber varias opciones válidas, pero solo una es la más adecuada.",
          "EXCEPTO QUE / A MENOS QUE → condiciones de excepción que invierten el criterio habitual."
        ]
      },
      {
        type: 'h2',
        text: "4. La técnica de eliminación: descarta para ganar"
      },
      {
        type: 'p',
        text: "La eliminación progresiva es la estrategia más potente cuando no tienes certeza absoluta. Se basa en un principio simple: es más fácil identificar lo claramente incorrecto que identificar lo claramente correcto."
      },
      {
        type: 'h3',
        text: "Cómo aplicar la eliminación paso a paso"
      },
      {
        type: 'ol',
        items: [
          "Descarta opciones que son clínicamente imposibles o directamente erróneas según tu formación.",
          "Descarta opciones que contradigan principios éticos fundamentales (abandono del paciente, falta de seguridad…).",
          "Descarta opciones con lenguaje absoluto injustificado (\"siempre\", \"nunca\", \"todos los pacientes\").",
          "Entre las opciones restantes, elige la más específica, la más segura para el paciente o la que aplica el proceso enfermero correctamente.",
          "Si aún tienes dos opciones muy similares, busca la diferencia entre ellas: ¿cuál es más amplia? ¿cuál incluye a la otra?"
        ]
      },
      {
        type: 'h3',
        text: "Señales de alerta en las opciones incorrectas"
      },
      {
        type: 'ul',
        items: [
          "Opciones que suenan muy técnicas pero no responden lo que se pregunta.",
          "Opciones que son verdaderas en general pero no en el contexto del caso clínico planteado.",
          "Opciones que dan información al paciente sin haberla valorado primero (acción antes de valoración).",
          "Opciones que delegan en otro profesional sin razón clínica clara.",
          "Opciones que repiten palabras del enunciado para \"parecer\" correctas sin serlo."
        ]
      },
      {
        type: 'h2',
        text: "5. Casos clínicos: la lógica del proceso enfermero"
      },
      {
        type: 'p',
        text: "El EIR tiene un alto porcentaje de preguntas basadas en casos clínicos. Estas preguntas no evalúan solo conocimiento: evalúan razonamiento clínico. Hay una lógica específica para abordarlas."
      },
      {
        type: 'h3',
        text: "El orden del proceso enfermero como guía"
      },
      {
        type: 'p',
        text: "Cuando una pregunta describe un caso y pregunta qué harías, aplica este orden de prioridad:"
      },
      {
        type: 'ol',
        items: [
          "Valorar antes de actuar. Si hay opciones de valoración frente a opciones de intervención, la valoración va primero salvo que sea una emergencia vital.",
          "Seguridad del paciente por encima de todo. Ante la duda, elige la opción más segura.",
          "Jerarquía de necesidades: lo fisiológico antes que lo psicológico; lo urgente antes que lo importante.",
          "Comunicar y educar al paciente cuando no hay urgencia inmediata.",
          "Registrar y documentar siempre al final, no como primera acción."
        ]
      },
      {
        type: 'h3',
        text: "Preguntas de priorización: el modelo ABC"
      },
      {
        type: 'p',
        text: "Cuando te pregunten qué paciente atender primero o qué problema es prioritario, usa el modelo ABC (Airway, Breathing, Circulation): primero vía aérea, luego respiración, luego circulación. Un paciente con problemas respiratorios agudos tiene prioridad sobre uno con dolor moderado, aunque este último parezca más urgente por el enunciado."
      },
      {
        type: 'h2',
        text: "6. Gestión del tiempo durante el examen"
      },
      {
        type: 'p',
        text: "El EIR dura 4 horas para 200 preguntas. La gestión del tiempo no es solo ir rápido: es saber cuándo acelerar y cuándo detenerte."
      },
      {
        type: 'table',
        headers: ["Fase del examen", "Tiempo estimado", "Qué hacer"],
        rows: [
          ["Primera pasada (preguntas directas)", "90-100 min", "Responde todo lo que sabes. Marca las dudosas."],
          ["Segunda pasada (preguntas dudosas)", "60-80 min", "Aplica eliminación. Razona con calma. Decide y responde."],
          ["Revisión final", "20-30 min", "Solo revisa si tienes duda fundada. No cambies respuestas sin razón."],
          ["Transferencia a hoja de respuestas", "Incluida en cada pasada", "Transfiere según avanzas, no al final (reduce errores de transcripción)."]
        ]
      },
      {
        type: 'p',
        text: "Señal de alerta: si llevas más de 2 minutos en una pregunta, márcala y pasa. Nada vale más que dos minutos en un examen de este tipo."
      },
      {
        type: 'h2',
        text: "7. La regla del cambio de respuesta: ¿cuándo cambiar?"
      },
      {
        type: 'p',
        text: "Existe un debate clásico en metodología tipo test: ¿cambiar la respuesta inicial o mantenerla? La evidencia es clara y contraintuitiva para muchas personas."
      },
      {
        type: 'p',
        text: "Según múltiples estudios sobre comportamiento en exámenes tipo test (Benjamin et al., 1984; Kruger et al., 2005), los cambios de respuesta son mayoritariamente de incorrecta a correcta —no al contrario— cuando se hacen con una razón concreta. El instinto de \"me quedo con la primera\" está sesgado por la ansiedad, no por evidencia real."
      },
      {
        type: 'p',
        text: "Regla práctica: cambia tu respuesta si y solo si:"
      },
      {
        type: 'ul',
        items: [
          "Has encontrado en otra pregunta del examen información que contradice tu primera elección.",
          "Al releer el enunciado, has detectado una palabra clave que habías pasado por alto (\"excepto\", \"primero\", etc.).",
          "Puedes articular verbalmente por qué la nueva opción es mejor. Si no puedes explicarlo, no cambies."
        ]
      },
      {
        type: 'p',
        text: "No cambies si: solo \"te entran dudas\", si llevas mucho tiempo mirando la pregunta, o si otra opción simplemente te parece atractiva sin razón concreta."
      },
      {
        type: 'h2',
        text: "8. Tipos especiales de preguntas y cómo abordarlos"
      },
      {
        type: 'h3',
        text: "Preguntas de negación (\"NO es\", \"EXCEPTO\", \"FALSO\")"
      },
      {
        type: 'p',
        text: "Son las más peligrosas porque invierten la lógica habitual. Tu cerebro tiende a buscar lo correcto. Aquí debes buscar lo incorrecto."
      },
      {
        type: 'ul',
        items: [
          "Subraya mentalmente el NO / EXCEPTO / FALSO antes de leer las opciones.",
          "Clasifica cada opción como V (verdadera) o F (falsa) según el contexto.",
          "La opción FALSA es la respuesta correcta.",
          "Si hay tres verdaderas y una falsa, esa falsa es tu respuesta."
        ]
      },
      {
        type: 'h3',
        text: "Preguntas con dos opciones muy similares"
      },
      {
        type: 'p',
        text: "Cuando dos opciones parecen casi idénticas, a menudo una de ellas es la respuesta correcta. Ese \"casi\" tiene importancia. Analiza qué las diferencia:"
      },
      {
        type: 'ul',
        items: [
          "¿Una es más amplia y la otra más específica? Generalmente la más específica al contexto del caso es la correcta.",
          "¿Una incluye valoración y la otra directamente intervención? La que valora primero suele ser correcta.",
          "¿Difieren en el tiempo de la acción (\"inmediatamente\" vs \"en las próximas horas\")? El contexto de urgencia del caso decide."
        ]
      },
      {
        type: 'h3',
        text: "Preguntas de farmacología y dosificación"
      },
      {
        type: 'p',
        text: "Si no recuerdas el dato exacto, aplica eliminación por lógica clínica: descarta dosis extremas (muy altas o muy bajas para el contexto), descarta vías de administración contraindicadas en el caso, descarta fármacos de categorías incorrectas para el diagnóstico presentado."
      },
      {
        type: 'h2',
        text: "9. Control mental y gestión de la ansiedad en el examen"
      },
      {
        type: 'p',
        text: "La ansiedad de evaluación afecta al rendimiento cognitivo de forma demostrada: bloquea el acceso a la memoria de trabajo, genera errores de lectura y provoca cambios de respuesta injustificados (Eysenck et al., 2007, Attentional Control Theory). Manejarla no es opcional."
      },
      {
        type: 'h3',
        text: "Antes del examen"
      },
      {
        type: 'ul',
        items: [
          "La noche anterior: no estudies material nuevo. Solo repasa lo que ya dominas o descansa directamente.",
          "Duerme al menos 7 horas. El sueño consolida la memoria declarativa (la que necesitas para el examen).",
          "Come algo antes: el cerebro consume glucosa. Un estómago vacío aumenta la ansiedad.",
          "Llega con tiempo. La prisa en los últimos minutos dispara el cortisol y bloquea el acceso a lo aprendido."
        ]
      },
      {
        type: 'h3',
        text: "Durante el examen"
      },
      {
        type: 'ul',
        items: [
          "Si te bloqueas en una pregunta: marca, pasa y no mires atrás hasta la segunda pasada.",
          "Si sientes que el pánico sube: tres respiraciones lentas (inhala 4 segundos, exhala 6). Activa el sistema parasimpático y reduce la activación del amígdala.",
          "Frase de rescate: recuérdate que has preparado este examen. Lo que sabes ya está en tu cerebro. La tarea es recuperarlo, no crearlo.",
          "Evita mirar el progreso de otros candidatos. Cada persona va a su ritmo y ese ritmo no predice nada sobre sus resultados."
        ]
      },
      {
        type: 'h3',
        text: "Si una sección del examen te sale mal"
      },
      {
        type: 'p',
        text: "Puede ocurrir que las primeras 30 preguntas sean de un tema que no dominas bien. El error más común es que eso contamine mentalmente el resto del examen. Técnica: compartimentalización cognitiva. Cuando pases a la siguiente pregunta, esa nueva pregunta no sabe que las anteriores fueron difíciles. Cada pregunta es independiente."
      },
      {
        type: 'h2',
        text: "10. Entrenamiento: cómo practicar la metodología tipo test"
      },
      {
        type: 'p',
        text: "La metodología tipo test no se aprende leyendo sobre ella: se entrena. Igual que un deportista no mejora viendo partidos, tú no mejorarás tu rendimiento tipo test sin repetición deliberada."
      },
      {
        type: 'h3',
        text: "Principios del entrenamiento efectivo"
      },
      {
        type: 'ol',
        items: [
          "Practica en condiciones reales: cronometrada, sin interrupciones, con hoja de respuestas. Cuanto más parecido al examen real, mejor la transferencia.",
          "Analiza cada error: no basta con saber que fallaste. Identifica por qué fallaste. ¿Error de conocimiento? ¿Error de lectura? ¿Error de gestión del tiempo? Cada tipo requiere una corrección diferente.",
          "Practica el abandono: entrena conscientemente a pasar de preguntas difíciles. Es una habilidad que se deteriora con los nervios si no la has practicado antes.",
          "Aumenta la dificultad progresivamente: empieza con bloques de 30 preguntas, pasa a 100, después a 200 completas.",
          "Haz al menos 3 simulacros completos de 200 preguntas antes del examen real, idealmente en las mismas horas del día en que se celebrará el EIR."
        ]
      },
      {
        type: 'h3',
        text: "Indicadores de que tu metodología está mejorando"
      },
      {
        type: 'ul',
        items: [
          "Reduces el tiempo por pregunta sin reducir el porcentaje de aciertos.",
          "Los errores por \"no leí bien la pregunta\" disminuyen en sucesivos simulacros.",
          "Sabes identificar, al revisar, por qué fallaste cada pregunta (no solo que fallaste).",
          "En la segunda pasada consigues resolver preguntas que habías marcado como dudosas."
        ]
      },
      {
        type: 'h2',
        text: "Resumen: las 10 claves de la metodología tipo test para el EIR"
      },
      {
        type: 'ol',
        items: [
          "Conoce el sistema de puntuación (+3 / −1 / 0) y decide cuándo dejar en blanco.",
          "Usa tres pasadas: primero lo que sabes, luego las dudas, luego revisión.",
          "Lee el enunciado completo y detecta palabras clave antes de mirar las opciones.",
          "Formula tu respuesta mental antes de leer las cuatro opciones.",
          "Aplica eliminación sistemática para reducir la incertidumbre.",
          "En casos clínicos, sigue la lógica del proceso enfermero (valorar antes de actuar).",
          "Gestiona el tiempo: máximo 2 minutos por pregunta antes de marcar y pasar.",
          "Cambia respuestas solo con razón concreta, no por ansiedad.",
          "Identifica los tipos especiales de preguntas (negación, similares, farmacología) y aplica su estrategia específica.",
          "Entrena la metodología con simulacros cronometrados y analiza cada error."
        ]
      },
      {
        type: 'h2',
        text: "Conclusión"
      },
      {
        type: 'p',
        text: "La metodología tipo test es una competencia técnica que se aprende y se entrena. No sustituye al conocimiento clínico, pero lo multiplica. Dos personas con el mismo nivel de conocimientos pueden obtener resultados muy distintos si una domina la estrategia de examen y la otra no."
      },
      {
        type: 'p',
        text: "El EIR premia a quienes leen bien, razonan con orden y mantienen la cabeza fría bajo presión. Esas tres cosas se pueden entrenar."
      },
    ]
  }
];
