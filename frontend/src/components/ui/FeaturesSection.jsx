import { Card, CardContent, CardHeader, CardTitle } from "./card"

const features = [
  {
    icon: "/icono1.png",
    title: "Condiciones de examen reales",
    description:
      "Siente la presión del examen real. Practica con cronómetro y preguntas en condiciones similares, para llegar preparado al gran día.",
  },
  {
    icon: "/icono10.png",
    title: "Tus errores, tus aliados",
    description:
      "Convierte tus errores en aprendizaje. Repasa las preguntas erradas hasta dominarlas, transformándolas en aciertos para el examen.",
  },
  {
    icon: "/icono3.png",
    title: "Practica sin límites",
    description:
      "Practica tanto como desees. Cuanto más te pongas a prueba, más cerca estarás de tu meta. La práctica constante te prepara para el éxito.",
  },
  {
    icon: "/icono4.png",
    title: "Exámenes al instante",
    description: "Elige tu modalidad de examen y empieza al instante, sin esperas.",
  },
  {
    icon: "/icono9.png",
    title: "Quizz!",
    description:
      "¿Poco tiempo? Los quizz de 30 preguntas son la solución perfecta para practicar cuando y donde quieras.",
  },
]

const FeaturesSection = () => {
  return (
    <section className="bg-white py-12 md:py-24">
      <div className="container mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-primary mb-12">
          La preparación que te impulsa sin perder tiempo
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="flex flex-col items-center text-center" data-aos="fade-up">
              <CardHeader>
                <img src={feature.icon || "/placeholder.svg"} alt={feature.title} className="w-16 h-16 mb-4" />
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection

