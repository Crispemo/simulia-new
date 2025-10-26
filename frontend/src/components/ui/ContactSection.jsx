import { Button } from "./button"

const ContactSection = () => {
  return (
    <section className="bg-white py-12">
      <div className="container mx-auto text-center">
        <h2 className="text-3xl font-bold text-primary mb-4">Contacto</h2>
        <p className="text-gray-600 mb-6">
          ¿Tienes dudas o necesitas ayuda? Estamos aquí para ti. Escríbenos y te responderemos lo antes posible.
        </p>
        <Button variant="outline" asChild>
          <a href="mailto:simuliaproject@simulia.es">simuliaproject@simulia.es</a>
        </Button>
      </div>
    </section>
  )
}

export default ContactSection

