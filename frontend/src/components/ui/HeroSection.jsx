const HeroSection = () => {
    return (
      <section className="container mx-auto py-12 md:py-24 flex flex-col md:flex-row items-center">
        <div className="md:w-1/2 mb-8 md:mb-0" data-aos="fade-right">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">CONSIGUE TU PLAZA</h2>
          <p className="text-lg text-gray-600">
            Da el primer paso hacia tu futuro. Todo lo que necesitas para llegar preparado y con confianza a tu plaza.
          </p>
        </div>
        <div className="md:w-1/2" data-aos="fade-left">
          <video className="w-full rounded-lg shadow-xl" controls>
            <source src="ruta_del_video.mp4" type="video/mp4" />
            Tu navegador no soporta el video.
          </video>
        </div>
      </section>
    )
  }
  
  export default HeroSection
  
  