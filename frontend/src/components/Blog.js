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
      </Helmet>

      <header className="blog-header">
        <h1>Blog de preparación EIR</h1>
        <p>Recursos, consejos y estrategias para tu éxito en el EIR</p>
      </header>

      <div className="blog-grid">
        {blogPosts.map(post => (
          <article key={post.id} className="blog-card">
            <div className="blog-card-image">
              <img src={post.image} alt={post.title} />
              <span className="blog-category">{post.category}</span>
            </div>
            <div className="blog-card-content">
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
              <div className="blog-card-meta">
                <span className="blog-date">{post.date}</span>
                <span className="blog-reading-time">{post.readingTime} min de lectura</span>
              </div>
              <Link to={`/blog/${post.slug}`} className="read-more">Leer más</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default Blog; 