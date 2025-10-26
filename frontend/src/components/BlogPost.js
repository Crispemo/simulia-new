import React, { useEffect, useRef } from 'react';
import './BlogPost.css';
import { Helmet } from "react-helmet";
import { Link, useParams, useNavigate } from 'react-router-dom';
import { blogPosts } from './blogData';

const BlogPost = () => {
  const { postId } = useParams();
  const post = blogPosts.find(p => p.slug === postId);
  const contentRef = useRef(null);
  const navigate = useNavigate();

  // Generar índice de contenidos a partir de los h2
  const headings = post?.content.filter(block => block.type === 'h2');

  // Scroll suave al hacer clic en el índice
  useEffect(() => {
    const handleClick = (e, idx) => {
      e.preventDefault();
      const el = document.getElementById(`section-${idx}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    // Limpiar listeners si fuera necesario
    return () => {};
  }, []);

  if (!post) {
    return <div className="blog-post-container"><h1>Artículo no encontrado</h1></div>;
  }

  let h2Count = 0;

  // CTA handler
  const handleCtaClick = (e) => {
    e.preventDefault();
    navigate('/');
    // Dar tiempo a que la navegación se complete antes de hacer scroll
    setTimeout(() => {
      const pricingSection = document.querySelector('.pricing-section');
      if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <div className="blog-post-container">
      <Helmet>
        <title>{post.title} | Blog Simulia EIR</title>
        <meta name="description" content={post.excerpt} />
      </Helmet>

      {/* Flecha volver atrás */}
      <div className="blog-back-link">
        <Link to="/blog"><span className="arrow-left">←</span> Volver al blog</Link>
      </div>

      {/* Imagen de portada */}
      <div className="blog-post-cover">
        <img src={post.image} alt={post.title} />
      </div>

      {/* Título y meta info */}
      <div className="blog-post-header">
        <h1>{post.title}</h1>
        <div className="blog-post-meta">
          <span className="blog-post-date">{post.date}</span>
          <span className="blog-post-reading-time">{post.readingTime} min de lectura</span>
        </div>
        <span className="blog-post-category">{post.category}</span>
      </div>

      {/* Índice de contenidos */}
      {headings && headings.length > 1 && (
        <nav className="blog-post-toc">
          <strong>Índice</strong>
          <ul>
            {headings.map((h, idx) => (
              <li key={idx}>
                <a href={`#section-${idx}`} onClick={e => {
                  e.preventDefault();
                  const el = document.getElementById(`section-${idx}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}>{h.text}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Contenido */}
      <div className="blog-post-content" ref={contentRef}>
        {post.content.map((block, idx) => {
          // Media object para imágenes específicas
          if (block.type === 'img' && (block.src.includes('Que_es_eir_1.png') || block.src.includes('Ques_es_eir_2.png'))) {
            // Mostrar la imagen a la izquierda y el texto a la derecha (media object)
            // El texto asociado es el siguiente bloque tipo 'p' o 'ul'
            const nextBlock = post.content[idx + 1];
            return (
              <div className="blog-img-block media-object" key={idx}>
                <img src={block.src} alt={block.alt || ''} />
                <div className="media-text">
                  {nextBlock && nextBlock.type === 'p' && <p>{nextBlock.text}</p>}
                  {nextBlock && nextBlock.type === 'ul' && <ul>{nextBlock.items.map((item, i) => <li key={i}>{item}</li>)}</ul>}
                </div>
              </div>
            );
          }
          // Evitar renderizar el texto duplicado si ya se mostró junto a la imagen
          if ((post.content[idx - 1] && post.content[idx - 1].type === 'img' && (post.content[idx - 1].src.includes('Que_es_eir_1.png') || post.content[idx - 1].src.includes('Ques_es_eir_2.png'))) && (block.type === 'p' || block.type === 'ul')) {
            return null;
          }
          if (block.type === 'h1') return <h1 key={idx}>{block.text}</h1>;
          if (block.type === 'h2') {
            const sectionId = `section-${h2Count}`;
            h2Count++;
            return <h2 id={sectionId} key={idx}>{block.text}</h2>;
          }
          if (block.type === 'h3') return <h3 key={idx}>{block.text}</h3>;
          if (block.type === 'p') return <p key={idx} dangerouslySetInnerHTML={{__html: block.text}}></p>;
          if (block.type === 'ul') return <ul key={idx}>{block.items.map((item, i) => <li key={i}>{item}</li>)}</ul>;
          if (block.type === 'ol') return <ol key={idx}>{block.items.map((item, i) => <li key={i}>{item}</li>)}</ol>;
          if (block.type === 'img') return (
            <div className="blog-img-block" key={idx}>
              <img src={block.src} alt={block.alt || ''} />
            </div>
          );
          if (block.type === 'table') return (
            <div className="blog-table-block" key={idx}>
              <table>
                <thead>
                  <tr>
                    {block.headers.map((header, i) => <th key={i}>{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => <td key={j}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          if (block.type === 'blockquote') return (
            <blockquote className="blog-blockquote" key={idx}>{block.text}</blockquote>
          );
          return null;
        })}
      </div>

      {/* CTA final */}
      <div className="blog-final-cta">
        <h2>¿Quieres preparar el EIR de forma inteligente?</h2>
        <p>Simulia te permite practicar con simulacros reales, analizar tu progreso y mejorar justo donde lo necesitas. ¡Empieza hoy mismo!</p>
        <button className="cta-button" onClick={handleCtaClick}>
          Probar Simulia y ver planes
        </button>
      </div>
    </div>
  );
};

export default BlogPost; 