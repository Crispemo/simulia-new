import React from 'react';
import './Blog.css';
import { Helmet } from "react-helmet";
import { Link } from 'react-router-dom';
import { blogPosts } from './blogData';

const Blog = () => {
  return (
    <div className="blog-container">
      <Helmet>
        <title>Blog Simulia | Recursos y consejos para el EIR</title>
        <meta name="description" content="Encuentra los mejores consejos, guías y estrategias para preparar tu examen EIR. Artículos actualizados sobre enfermería y preparación de oposiciones." />
        <link rel="canonical" href="https://www.simulia.es/blog" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.simulia.es/blog" />
        <meta property="og:title" content="Blog Simulia | Recursos y consejos para el EIR" />
        <meta property="og:description" content="Encuentra los mejores consejos, guías y estrategias para preparar tu examen EIR. Artículos actualizados sobre enfermería y preparación de oposiciones." />
        <meta property="og:image" content="https://www.simulia.es/blog/Preparar_EIR.png" />
        <meta property="og:site_name" content="Simulia" />
        <meta property="og:locale" content="es_ES" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://www.simulia.es/blog" />
        <meta name="twitter:title" content="Blog Simulia | Recursos y consejos para el EIR" />
        <meta name="twitter:description" content="Encuentra los mejores consejos, guías y estrategias para preparar tu examen EIR. Artículos actualizados sobre enfermería y preparación de oposiciones." />
        <meta name="twitter:image" content="https://www.simulia.es/blog/Preparar_EIR.png" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          "name": "Blog Simulia EIR",
          "url": "https://www.simulia.es/blog",
          "description": "Recursos, guías y estrategias para preparar el examen EIR de enfermería.",
          "publisher": { "@type": "Organization", "name": "Simulia", "url": "https://www.simulia.es" }
        })}</script>
      </Helmet>

      <div className="blog-back-link">
        <Link to="/"><span className="arrow-left">←</span> Volver al inicio</Link>
      </div>

      <header className="blog-header">
        <h1>Blog de preparación EIR</h1>
        <p>Recursos, consejos y estrategias para tu éxito en el EIR</p>
      </header>

      <div className="blog-grid">
        {blogPosts.map(post => (
          <Link key={post.id} to={`/blog/${post.slug}`} className="blog-card">
            <div className="blog-card-image">
              <img src={post.image} alt={post.title} onError={e => { e.target.onerror = null; e.target.src = '/blog/Preparar_EIR.png'; }} />
              <span className="blog-category">{post.category}</span>
            </div>
            <div className="blog-card-content">
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
              <div className="blog-card-meta">
                <span className="blog-date">{post.date}</span>
                <span className="blog-reading-time">{post.readingTime} min de lectura</span>
              </div>
              <span className="read-more">Leer más</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Blog; 