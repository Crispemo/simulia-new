import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Genera un PDF del contenedor indicado, con encabezado, marca de agua y numeración de páginas
export async function generateExamPdf({
  containerSelector = '#exam-root',
  title = 'SIMULIA',
  subtitle = '', // tipo de examen
  watermarkText = 'SIMULIA',
  logoPath = '/Logo_oscuro.png',
  fileName = 'examen-simulia.pdf',
}) {
  const container = document.querySelector(containerSelector);
  if (!container) {
    throw new Error(`No se encontró el contenedor ${containerSelector}`);
  }

  // NO modificar el DOM original - solo clonar
  const originalBg = container.style.backgroundColor;
  const originalColor = container.style.color;
  // NO modificar el contenedor original

  // Clonar el nodo y adjuntarlo temporalmente al DOM para que html2canvas
  // pueda resolver estilos y tamaños correctamente (evita errores de iframe)
  const wrapper = document.createElement('div');
  Object.assign(wrapper.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: container.offsetWidth ? `${container.offsetWidth}px` : '1024px',
    background: '#ffffff',
    zIndex: '-1',
  });
  const clone = container.cloneNode(true);
  // Aplicar estilos al clon, no al original
  clone.style.backgroundColor = '#ffffff';
  clone.style.color = '#000000';
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  // Normalizar opciones como A, B, C, D si vienen en texto libre
  normalizeOptionsLabels(clone);

  // Insertar marca de agua como elemento CSS
  applyWatermark(clone, watermarkText);

  // Renderizar a canvas por partes si es muy alto
  const A4_WIDTH_PT = 595.28; // 72 dpi
  const A4_HEIGHT_PT = 841.89;
  const DOC_DPI = 144; // mayor dpi para nitidez
  const pxPerPt = window.devicePixelRatio || 1;

  // Capturar el ancho de la página en px para ajustar escala
  const pageWidthPx = Math.floor((A4_WIDTH_PT * DOC_DPI) / 72);

  // Ajustes de html2canvas
  const canvas = await html2canvas(clone, {
    scale: Math.max(2, window.devicePixelRatio || 2),
    backgroundColor: '#ffffff',
    useCORS: true,
    imageTimeout: 15000,
    logging: false,
    // No forzamos width/windowWidth para evitar referencias a un nodo no adjunto
    // html2canvas tomará el tamaño calculado del clon dentro del wrapper
  });

  const imgWidth = A4_WIDTH_PT;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF('p', 'pt', 'a4');

  // Encabezado con logo y títulos en cada página
  const headerHeight = 56;
  const marginX = 40;
  const contentTop = headerHeight + 16;

  // Convertir canvas completo en imagen y luego trocear por páginas
  const pageCanvas = document.createElement('canvas');
  const pageCtx = pageCanvas.getContext('2d');
  const pageHeightPt = A4_HEIGHT_PT - contentTop - 40; // dejando margen inferior
  const pageHeightPx = Math.floor((pageHeightPt / imgHeight) * canvas.height);

  let positionPx = 0;
  let pageNumber = 1;

  while (positionPx < canvas.height) {
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - positionPx);
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeightPx;
    pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
    pageCtx.drawImage(
      canvas,
      0,
      positionPx,
      canvas.width,
      sliceHeightPx,
      0,
      0,
      pageCanvas.width,
      sliceHeightPx
    );

    const imgData = pageCanvas.toDataURL('image JPEG', 0.95);

    if (pageNumber > 1) {
      pdf.addPage();
    }

    // Dibujar encabezado
    await drawHeader(pdf, { marginX, headerHeight, title, subtitle, logoPath });

    // Dibujar contenido de la página
    const contentWidthPt = A4_WIDTH_PT - marginX * 2;
    const contentImgHeightPt = (sliceHeightPx / canvas.width) * contentWidthPt;
    pdf.addImage(
      imgData,
      'JPEG',
      marginX,
      contentTop,
      contentWidthPt,
      contentImgHeightPt,
      undefined,
      'FAST'
    );

    // Numeración de páginas
    const pageLabel = `${pageNumber}`;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(pageLabel, A4_WIDTH_PT - marginX, A4_HEIGHT_PT - 20, { align: 'right' });

    positionPx += sliceHeightPx;
    pageNumber += 1;
  }

  // Limpiar el DOM temporal (no restaurar estilos porque no los modificamos)
  if (wrapper && wrapper.parentNode) {
    wrapper.parentNode.removeChild(wrapper);
  }

  pdf.save(fileName);
}

// ============ NUEVO: Generación basada en datos con maquetación A4 limpia ============
export async function generateExamPdfFromData({
  questions = [],
  title = 'SIMULIA',
  subtitle = '',
  logoUrl = '/Logo_oscuro.png',
  examId = '',
  date = '',
  durationMin = null,
  showAnswerKey = false,
  showBubbleSheet = false,
  showWatermark = false,
  fileName = 'examen-simulia.pdf',
}) {
  // Usar la función nativa que es más confiable
  return generateExamPdfNative({
    title,
    subtitle,
    logoUrl,
    examId,
    date,
    durationMin,
    questions,
    showAnswerKey,
    fileName
  });
}

function buildA4PlainHtml({ questions, title, subtitle, logoUrl, examId, date, durationMin, showAnswerKey, showBubbleSheet }) {
  const qItems = (questions || []).map((q, i) => `
    <div class="question-item">
      <div class="question-number">${i + 1}.</div>
      <div class="question-content">
        <div class="question-text">${escapeHtml(q.question || q.text || '')}</div>
        ${renderPlainMedia(q)}
        <div class="options">
          ${renderPlainOptions(q)}
        </div>
      </div>
    </div>
  `).join('');

  const answerKey = (showAnswerKey ? questions : []).map((q, i) => `<tr><td>${i + 1}</td><td>${formatAnswerKey(q)}</td></tr>`).join('');
  const bubble = (showBubbleSheet ? questions : []).map((q, i) => `
    <div class="bubble-row">
      <span class="bubble-number">${i + 1}</span>
      <div class="bubble-options">
        <div class="bubble-option">A</div>
        <div class="bubble-option">B</div>
        <div class="bubble-option">C</div>
        <div class="bubble-option">D</div>
      </div>
    </div>
  `).join('');

  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title || 'SIMULIA')} - ${escapeHtml(subtitle || 'Examen')}</title>
    <style>
      @page {
        size: A4;
        margin: 20mm 15mm 20mm 15mm;
      }
      
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      body {
        font-family: 'Arial', 'Helvetica', sans-serif;
        font-size: 11pt;
        line-height: 1.4;
        color: #000;
        background: #fff;
        max-width: 210mm;
        margin: 0 auto;
        padding: 0;
      }
      
      .header {
        border-bottom: 2px solid #7da0a7;
        padding-bottom: 8mm;
        margin-bottom: 8mm;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .header-left {
        display: flex;
        align-items: center;
        gap: 8mm;
      }
      
      .logo {
        width: 25mm;
        height: auto;
        max-height: 15mm;
      }
      
      .header-title {
        font-size: 16pt;
        font-weight: bold;
        color: #3f5056;
        margin: 0;
      }
      
      .header-subtitle {
        font-size: 12pt;
        color: #7da0a7;
        margin: 2mm 0 0 0;
      }
      
      .header-meta {
        text-align: right;
        font-size: 9pt;
        color: #55616a;
      }
      
      .meta-row {
        margin: 1mm 0;
      }
      
      .instructions {
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        padding: 6mm;
        margin-bottom: 8mm;
        page-break-after: always;
      }
      
      .instructions-title {
        font-size: 14pt;
        font-weight: bold;
        color: #3f5056;
        text-transform: uppercase;
        margin-bottom: 4mm;
        text-align: center;
      }
      
      .instructions-list {
        list-style: decimal;
        padding-left: 6mm;
      }
      
      .instructions-list li {
        margin: 2mm 0;
        font-size: 10pt;
      }
      
      .questions-section {
        margin-top: 8mm;
        column-count: 2;
        column-gap: 12mm;
      }
      
      .question-item {
        margin-bottom: 8mm;
        page-break-inside: avoid;
        break-inside: avoid;
        display: flex;
        gap: 4mm;
      }
      
      .question-number {
        font-weight: bold;
        font-size: 12pt;
        color: #7da0a7;
        min-width: 8mm;
        flex-shrink: 0;
      }
      
      .question-content {
        flex: 1;
      }
      
      .question-text {
        font-size: 11pt;
        margin-bottom: 3mm;
        text-align: justify;
      }
      
      .question-image {
        margin: 3mm 0;
        text-align: center;
        page-break-inside: avoid;
      }
      
      .question-image img {
        max-width: 100%;
        max-height: 60mm;
        border: 1px solid #ddd;
        border-radius: 3px;
      }
      
      .image-caption {
        font-size: 9pt;
        color: #666;
        margin-top: 2mm;
        font-style: italic;
      }
      
      .options {
        margin-top: 3mm;
      }
      
      .option {
        margin: 2mm 0;
        padding-left: 4mm;
        font-size: 10pt;
      }
      
      .option-letter {
        font-weight: bold;
        color: #3f5056;
      }
      
      .solutions-section {
        margin-top: 15mm;
        page-break-before: always;
      }
      
      .solutions-title {
        font-size: 14pt;
        font-weight: bold;
        color: #3f5056;
        margin-bottom: 6mm;
        text-align: center;
      }
      
      .solutions-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 10pt;
      }
      
      .solutions-table th,
      .solutions-table td {
        border: 1px solid #ddd;
        padding: 2mm;
        text-align: center;
      }
      
      .solutions-table th {
        background-color: #f8f9fa;
        font-weight: bold;
      }
      
      .bubble-sheet {
        margin-top: 15mm;
        page-break-before: always;
      }
      
      .bubble-sheet-title {
        font-size: 14pt;
        font-weight: bold;
        color: #3f5056;
        margin-bottom: 6mm;
        text-align: center;
      }
      
      .bubble-row {
        display: flex;
        align-items: center;
        margin: 2mm 0;
        padding: 2mm;
        border: 1px solid #ddd;
        border-radius: 3px;
      }
      
      .bubble-number {
        font-weight: bold;
        margin-right: 4mm;
        min-width: 8mm;
      }
      
      .bubble-options {
        display: flex;
        gap: 4mm;
      }
      
      .bubble-option {
        width: 6mm;
        height: 6mm;
        border: 1px solid #7da0a7;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 9pt;
        font-weight: bold;
        color: #3f5056;
      }
      
      .footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 15mm;
        background: #f8f9fa;
        border-top: 1px solid #dee2e6;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 15mm;
        font-size: 9pt;
        color: #666;
      }
      
      .page-number {
        font-weight: bold;
      }
      
      .watermark {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 48pt;
        color: rgba(63, 80, 86, 0.08);
        font-weight: bold;
        pointer-events: none;
        z-index: -1;
      }
      
      @media print {
        .watermark {
          display: block;
        }
        .footer {
          position: fixed;
        }
      }
    </style>
  </head>
  <body>
    <div class="watermark">SIMULIA</div>
    
    <div class="header">
      <div class="header-left">
        <img src="${logoUrl}" alt="SIMULIA" class="logo" crossorigin="anonymous" onerror="this.style.display='none'">
        <div>
          <h1 class="header-title">${escapeHtml(title || 'SIMULIA')}</h1>
          <p class="header-subtitle">${escapeHtml(subtitle || 'Examen')}</p>
        </div>
      </div>
      <div class="header-meta">
        <div class="meta-row">ID: ${escapeHtml(examId || '—')}</div>
        <div class="meta-row">Fecha: ${escapeHtml(date || '—')}</div>
        <div class="meta-row">Duración: ${durationMin ? `${durationMin} min` : '—'}</div>
        <div class="meta-row">Preguntas: ${(questions||[]).length}</div>
      </div>
    </div>

    <div class="instructions">
      <h2 class="instructions-title">Advertencia importante</h2>
      <ol class="instructions-list">
        <li>Compruebe que el cuadernillo incluye todas las páginas y no presenta defectos de impresión.</li>
        <li>El ejercicio consta de <strong>${(questions||[]).length} preguntas</strong>. Cada pregunta tiene 4 opciones y solo una correcta.</li>
        <li>Marque sus respuestas únicamente en la <strong>Hoja de Respuestas</strong> si así se indica.</li>
        <li>Tiempo máximo: <strong>${durationMin ? `${durationMin} minutos` : '—'}</strong>. Los dispositivos electrónicos estarán apagados.</li>
        <li>Si una pregunta incluye imagen, verifique el pie de figura antes de responder.</li>
      </ol>
    </div>

    <div class="questions-section">
      ${qItems}
    </div>

    ${showAnswerKey ? `
    <div class="solutions-section">
      <h2 class="solutions-title">Plantilla de soluciones</h2>
      <table class="solutions-table">
        <thead>
          <tr>
            <th>Pregunta</th>
            <th>Respuesta</th>
          </tr>
        </thead>
        <tbody>
          ${answerKey}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${showBubbleSheet ? `
    <div class="bubble-sheet">
      <h2 class="bubble-sheet-title">Hoja de respuestas</h2>
      <div class="bubble-rows">
        ${bubble}
      </div>
    </div>
    ` : ''}

    <div class="footer">
      <div>SIMULIA - ${escapeHtml(subtitle || 'Examen')}</div>
      <div class="page-number">Página <span class="current-page"></span> de <span class="total-pages"></span></div>
    </div>

    <script>
      // Script para numeración de páginas
      document.addEventListener('DOMContentLoaded', function() {
        const totalPages = Math.ceil(document.body.scrollHeight / window.innerHeight);
        document.querySelector('.total-pages').textContent = totalPages;
        
        // Actualizar página actual al imprimir
        window.addEventListener('beforeprint', function() {
          document.querySelector('.current-page').textContent = '1';
        });
      });
    </script>
  </body>
  </html>`;
}

function renderPlainMedia(q) {
  const src = q.image || (q.media && q.media.src);
  if (!src) return '';
  const cap = q.media && q.media.caption ? q.media.caption : '';
  return `
    <div class="question-image">
      <img src="${escapeHtml(src)}" alt="Imagen" crossorigin="anonymous" onerror="this.style.display='none'"/>
      ${cap ? `<div class="image-caption">${escapeHtml(cap)}</div>` : ''}
    </div>`;
}

function renderPlainOptions(q) {
  const opts = q.options && q.options.length ? q.options : [q.option_1, q.option_2, q.option_3, q.option_4, q.option_5].filter(Boolean);
  return (opts || []).slice(0,4).map((o, i) => `
    <div class="option">
      <span class="option-letter">${String.fromCharCode(65 + i)}.</span> ${escapeHtml(o || '')}
    </div>
  `).join('');
}

function formatAnswerKey(q) {
  const answer = q.answer || q.correct || q.correct_answer;
  return answer ? String(answer).toUpperCase() : '—';
}

export async function downloadExamPdfFromData(options) {
  return generateExamPdfSimulia(options);
}

// Utilidad básica para escapar HTML
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Función para formatear fecha a formato español (dd/mm/yyyy)
function formatDateToSpanish(dateString) {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Si no es una fecha válida, devolver el string original
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.warn('Error al formatear fecha:', error);
    return dateString; // Si hay error, devolver el string original
  }
}

async function drawHeader(pdf, { marginX, headerHeight, title, subtitle, logoPath }) {
  // fondo encabezado
  pdf.setFillColor(248, 249, 251);
  pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), headerHeight, 'F');
  
  // logo en la parte superior izquierda
  if (logoPath) {
    try {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      
      // Asegurar que la URL sea absoluta si es relativa
      let logoImageUrl = logoPath;
      if (logoImageUrl.startsWith('/')) {
        logoImageUrl = window.location.origin + logoImageUrl;
      } else if (!logoImageUrl.startsWith('http')) {
        // Si no es una URL absoluta ni relativa, asumir que es relativa
        logoImageUrl = window.location.origin + '/' + logoImageUrl;
      }
      
      img.src = logoImageUrl;
      
      await new Promise((res, rej) => {
        const timeout = setTimeout(() => {
          rej(new Error('Timeout cargando logo'));
        }, 5000);
        
        img.onload = () => {
          clearTimeout(timeout);
          res();
        };
        img.onerror = (err) => {
          clearTimeout(timeout);
          rej(err);
        };
      });
      
      // Añadir logo en la parte superior izquierda (marginX, 20)
      pdf.addImage(img, "PNG", marginX, 20, 60, 30);
    } catch (error) {
      console.warn('Error al cargar logo en encabezado:', error);
      // Si falla el logo, continuar sin él
    }
  }
  
  pdf.setTextColor(20, 20, 20);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  // Ajustar posición del título si hay logo
  const titleX = logoPath ? marginX + 70 : marginX;
  pdf.text(title, titleX, 26);
  if (subtitle) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text(subtitle, titleX, 44);
  }
}

function applyWatermark(root, text) {
  if (!text) return;
  const wm = document.createElement('div');
  wm.textContent = text;
  Object.assign(wm.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    opacity: '0.08',
    color: '#0a0a0a',
    fontSize: '72px',
    fontWeight: '700',
    transform: 'rotate(-30deg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '0'
  });
  root.style.position = root.style.position || 'relative';
  root.appendChild(wm);
}

function normalizeOptionsLabels(root) {
  try {
    const optionButtons = root.querySelectorAll('button');
    let questionIndex = 0;
    root.querySelectorAll('h3').forEach((h3) => {
      // Prefijar numeración de pregunta si no existe
      if (!/^\d+\./.test(h3.textContent.trim())) {
        questionIndex += 1;
        h3.textContent = `${questionIndex}. ${h3.textContent}`;
      }
    });

    // A-B-C-D etiquetado: si las opciones no empiezan con letra, añadirla
    root.querySelectorAll('div').forEach((div) => {
      if (div.className && /optionsContainer|questionBox/.test(div.className)) {
        const buttons = div.querySelectorAll('button');
        buttons.forEach((btn, idx) => {
          const labels = ['A', 'B', 'C', 'D', 'E'];
          const leading = `${labels[idx] || String.fromCharCode(65 + idx)}.`;
          const text = btn.textContent.trim();
          if (!/^([A-E])\./i.test(text)) {
            btn.textContent = `${leading} ${text}`;
          }
        });
      }
    });
  } catch (e) {
    // Silencio intencional
  }
}

// Helper para exportar un selector rápido por defecto
export async function downloadCurrentExamPdf(options = {}) {
  return generateExamPdf({
    containerSelector: options.containerSelector || '#exam-root',
    title: options.title || 'SIMULIA',
    subtitle: options.subtitle || '',
    watermarkText: options.watermarkText || 'SIMULIA',
    logoPath: options.logoPath || '/Logo_oscuro.png',
    fileName: options.fileName || 'examen-simulia.pdf',
  });
}

// ============ GENERACIÓN NATIVA CON JSPDF (VECTORIAL) ============
// PDF nativo: texto vectorial, nítido, ligero y 100% predecible
// Genera PDF nativo con texto vectorial, nítido y ligero
export async function generateExamPdfNative({
  title = 'SIMULIA',
  subtitle = 'Simulacro EIR',
  logoUrl = '/Logo_oscuro.png',
  examId = '',
  date = '',
  durationMin = null,
  questions = [],
  showAnswerKey = false,
  fileName = 'simulacro-simulia.pdf'
}) {
  // Validar datos de entrada
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    console.warn('No hay preguntas para generar PDF');
    return;
  }

  console.log('Generando PDF con', questions.length, 'preguntas');
  
  try {
    // Crear documento PDF
    const doc = new jsPDF();
    
    // Configuración básica
    const pageW = doc.internal.pageSize.width;
    const pageH = doc.internal.pageSize.height;
    const marginX = 20;
    const marginY = 20;
    let y = marginY;
    
    // Función helper para dibujar encabezado con logo
    async function drawHeaderWithLogo() {
      if (logoUrl) {
        try {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          
          // Asegurar que la URL sea absoluta si es relativa
          let logoImageUrl = logoUrl;
          if (logoImageUrl.startsWith('/')) {
            logoImageUrl = window.location.origin + logoImageUrl;
          } else if (!logoImageUrl.startsWith('http')) {
            logoImageUrl = window.location.origin + '/' + logoImageUrl;
          }
          
          img.src = logoImageUrl;
          
          await new Promise((res, rej) => {
            const timeout = setTimeout(() => {
              rej(new Error('Timeout cargando logo'));
            }, 5000);
            
            img.onload = () => {
              clearTimeout(timeout);
              res();
            };
            img.onerror = (err) => {
              clearTimeout(timeout);
              rej(err);
            };
          });
          
          // Añadir logo en la parte superior izquierda
          doc.addImage(img, "PNG", marginX, 10, 60, 30);
          console.log('Logo añadido en página');
        } catch (error) {
          console.warn('Error al cargar logo:', error);
        }
      }
    }
    
    // Dibujar encabezado en la primera página
    await drawHeaderWithLogo();
    
    // Título (ajustar posición si hay logo)
    const titleX = logoUrl ? marginX + 70 : marginX;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, titleX, 25);
    console.log('Título añadido en:', titleX, 25);
    y = 35;

    // Subtítulo
    doc.setFontSize(12);
    doc.text(`${subtitle} - ID: ${examId}`, marginX, y);
    console.log('Subtítulo añadido en:', marginX, y);
    y += 10;

    // Fecha y duración
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${date} - Duración: ${durationMin || '—'} min`, marginX, y);
    console.log('Metadata añadida en:', marginX, y);
    y += 20;

    // Preguntas
    console.log('Iniciando preguntas');
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      // Verificar si necesitamos nueva página
      if (y > pageH - 40) {
        console.log('Nueva página en pregunta:', i + 1);
        doc.addPage();
        await drawHeaderWithLogo();
        y = marginY + 20;
      }

      // Número de pregunta
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}.`, marginX, y);
      console.log('Pregunta', i + 1, 'en:', marginX, y);
      
      // Enunciado
      doc.setFont('helvetica', 'normal');
      const questionText = q.question || q.text || '';
      if (questionText.trim()) {
        const splitQuestion = doc.splitTextToSize(questionText, pageW - marginX * 2 - 10);
        doc.text(splitQuestion, marginX + 10, y);
        y += splitQuestion.length * 7;
      }

      // Opciones
      const options = q.options && q.options.length ? q.options : 
                     [q.option_1, q.option_2, q.option_3, q.option_4].filter(Boolean);
      
      console.log('Pregunta', i + 1, 'tiene', options.length, 'opciones');
      options.slice(0, 4).forEach((opt, idx) => {
        const letter = String.fromCharCode(65 + idx); // A,B,C,D
        const optionText = `${letter}) ${opt || ''}`;
        if (optionText.trim()) {
          const splitOption = doc.splitTextToSize(optionText, pageW - marginX * 2 - 20);
          doc.text(splitOption, marginX + 20, y);
          console.log('Opción', letter, 'en:', marginX + 20, y);
          y += splitOption.length * 7;
        }
      });

      y += 10; // Espacio entre preguntas
    }

    // Plantilla de respuestas
    if (showAnswerKey && questions.length > 0) {
      console.log('Añadiendo plantilla de respuestas');
      doc.addPage();
      await drawHeaderWithLogo();
      y = marginY + 20;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const titleX = logoUrl ? marginX + 70 : marginX;
      doc.text('PLANTILLA DE SOLUCIONES', titleX, y);
      y += 20;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const answer = q.answer || q.correct || q.correct_answer;
        const answerText = answer ? String(answer).toUpperCase() : '—';
        doc.text(`${i + 1}. ${answerText}`, marginX, y);
        console.log('Respuesta', i + 1, ':', answerText);
        y += 7;
        
        if (y > pageH - 20) {
          doc.addPage();
          await drawHeaderWithLogo();
          y = marginY + 20;
        }
      }
    }

    // Numeración de páginas
    const pages = doc.internal.getNumberOfPages();
    console.log('Total páginas:', pages);
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Página ${i} de ${pages}`, pageW - marginX, pageH - 10);
    }

    console.log('Guardando PDF:', fileName);
    doc.save(fileName);
  } catch (error) {
    console.error('Error al generar PDF:', error);
    throw error;
  }
}

// ============ GENERADOR PDF ESTILO CUADERNILLO EIR MEJORADO ============
// Generador PDF estilo cuadernillo EIR con logo, watermark e imágenes
export async function generateExamPdfSimulia({
  title = "SIMULIA",
  subtitle = "Simulacro EIR",
  logoUrl = "/Logo_oscuro.png",
  examId,
  date,
  durationMin,
  questions = [],
  fileName = "simulacro-simulia.pdf",
}) {
  console.log('Generando PDF Simulia con', questions.length, 'preguntas');
  
  // Validar datos de entrada
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    console.warn('No hay preguntas para generar PDF');
    return;
  }

  try {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const marginX = 40;
    const marginY = 60;
    const colGap = 20;
    const colWidth = (pageW - marginX * 2 - colGap) / 2;
    const lineHeight = 12;

    let x = marginX;
    let y = marginY + 10; // Inicia el contenido 10pt debajo del margen superior
    let currentPage = 1;

    // === Función para dibujar cabecera ===
    async function drawHeader() {
      console.log('Dibujando cabecera en página', currentPage);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);

      if (logoUrl) {
        try {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          
          // Asegurar que la URL sea absoluta si es relativa
          let logoImageUrl = logoUrl;
          if (logoImageUrl.startsWith('/')) {
            logoImageUrl = window.location.origin + logoImageUrl;
          } else if (!logoImageUrl.startsWith('http')) {
            // Si no es una URL absoluta ni relativa, asumir que es relativa
            logoImageUrl = window.location.origin + '/' + logoImageUrl;
          }
          
          console.log('Logo URL original:', logoUrl);
          console.log('Logo URL procesada:', logoImageUrl);
          console.log('Window origin:', window.location.origin);
          
          img.src = logoImageUrl;
          
          await new Promise((res, rej) => {
            const timeout = setTimeout(() => {
              rej(new Error('Timeout cargando logo'));
            }, 5000);
            
            img.onload = () => {
              clearTimeout(timeout);
              res();
            };
            img.onerror = (err) => {
              clearTimeout(timeout);
              rej(err);
            };
          });
          
          doc.addImage(img, "PNG", marginX, 20, 60, 30);
          console.log('Logo añadido en página', currentPage);
        } catch (error) {
          console.warn('Error al cargar logo:', error);
          // Si falla el logo, continuar sin él
        }
      }

      // Título con colores de marca SIMULIA
      doc.setTextColor(63, 80, 86); // Color principal de SIMULIA (#3f5056)
      doc.text(title, marginX + 70, 35);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(125, 160, 167); // Color secundario de SIMULIA (#7da0a7)
      doc.text(subtitle, marginX + 70, 50);

      // Meta info
      doc.setFontSize(9);
      if (examId) doc.text(`ID: ${examId}`, pageW - marginX, 30, { align: "right" });
      if (date) {
        // Convertir fecha a formato español (dd/mm/yyyy)
        const formattedDate = formatDateToSpanish(date);
        doc.text(`Fecha: ${formattedDate}`, pageW - marginX, 42, { align: "right" });
      }
      if (durationMin) doc.text(`Duración: ${durationMin} min`, pageW - marginX, 54, { align: "right" });
    }

    // === Función para watermark ===
    function drawWatermark() {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(60);
      doc.setTextColor(230, 230, 230);
      doc.text("SIMULIA", pageW / 2, pageH / 2, {
        angle: -45,
        align: "center",
      });
      doc.setTextColor(0, 0, 0);
    }

    // === Función para footer ===
    function drawFooter(pageNum, totalPages) {
      doc.setFontSize(9);
      doc.text(`Página ${pageNum} de ${totalPages}`, pageW - marginX, pageH - 20, { align: "right" });
      doc.text("SIMULACRO EIR · SIMULIA", marginX, pageH - 20);
    }

    // === Cabecera inicial ===
    await drawHeader();
    drawWatermark();

    // === Render preguntas ===
    console.log('Iniciando renderizado de preguntas');
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      // Definir textWidth al inicio del bucle
      const textWidth = colWidth - 20;

      // Calcular espacio necesario para esta pregunta (pregunta + opciones + imagen)
      const questionOptions = q.options && q.options.length ? q.options : 
                     [q.option_1, q.option_2, q.option_3, q.option_4].filter(opt => opt && typeof opt === 'string');
      
      let estimatedHeight = 0;
      
      // Altura del enunciado
      const questionTextForEstimation = q.question || q.text || '';
      if (questionTextForEstimation.trim()) {
        const cleanText = questionTextForEstimation
          .replace(/≥/g, '>=')
          .replace(/≤/g, '<=')
          .replace(/±/g, '+/-')
          .replace(/×/g, 'x')
          .replace(/÷/g, '/')
          .replace(/°C/g, '°C')
          .replace(/°/g, '°')
          .replace(/κ/g, 'k')
          .replace(/α/g, 'a')
          .replace(/β/g, 'b')
          .replace(/γ/g, 'g')
          .replace(/δ/g, 'd')
          .replace(/ε/g, 'e')
          .replace(/ζ/g, 'z')
          .replace(/η/g, 'n')
          .replace(/θ/g, 'th')
          .replace(/ι/g, 'i')
          .replace(/λ/g, 'l')
          .replace(/μ/g, 'u')
          .replace(/ν/g, 'n')
          .replace(/ξ/g, 'x')
          .replace(/ο/g, 'o')
          .replace(/π/g, 'p')
          .replace(/ρ/g, 'r')
          .replace(/σ/g, 's')
          .replace(/τ/g, 't')
          .replace(/υ/g, 'u')
          .replace(/φ/g, 'f')
          .replace(/χ/g, 'ch')
          .replace(/ψ/g, 'ps')
          .replace(/ω/g, 'w');
        const splitText = doc.splitTextToSize(cleanText, textWidth);
        estimatedHeight += splitText.length * lineHeight + 4;
      }
      
      // Altura de la imagen si existe
      if (q.image) {
        estimatedHeight += 126; // 120px + 6px de margen
      }
      
      // Altura de las opciones
      questionOptions.slice(0, 4).forEach((opt) => {
        if (opt && typeof opt === 'string' && opt.trim()) {
          const cleanOptionText = opt
            .replace(/≥/g, '>=')
            .replace(/≤/g, '<=')
            .replace(/±/g, '+/-')
            .replace(/×/g, 'x')
            .replace(/÷/g, '/')
            .replace(/°C/g, '°C')
            .replace(/°/g, '°')
            .replace(/κ/g, 'k')
            .replace(/α/g, 'a')
            .replace(/β/g, 'b')
            .replace(/γ/g, 'g')
            .replace(/δ/g, 'd')
            .replace(/ε/g, 'e')
            .replace(/ζ/g, 'z')
            .replace(/η/g, 'n')
            .replace(/θ/g, 'th')
            .replace(/ι/g, 'i')
            .replace(/λ/g, 'l')
            .replace(/μ/g, 'u')
            .replace(/ν/g, 'n')
            .replace(/ξ/g, 'x')
            .replace(/ο/g, 'o')
            .replace(/π/g, 'p')
            .replace(/ρ/g, 'r')
            .replace(/σ/g, 's')
            .replace(/τ/g, 't')
            .replace(/υ/g, 'u')
            .replace(/φ/g, 'f')
            .replace(/χ/g, 'ch')
            .replace(/ψ/g, 'ps')
            .replace(/ω/g, 'w');
          const splitOpt = doc.splitTextToSize(cleanOptionText, textWidth - 20);
          estimatedHeight += splitOpt.length * lineHeight + 2;
        }
      });
      
      estimatedHeight += 8; // Espacio entre preguntas
      
      // Tope inferior más conservador (120px del pie de página)
      const bottomLimit = pageH - 120;
      
      // Salto de página o columna
      if (y + estimatedHeight > bottomLimit) {
        if (x === marginX) {
          console.log('Cambiando a segunda columna en pregunta', i + 1, 'altura estimada:', estimatedHeight);
          x = marginX + colWidth + colGap;
          y = marginY + 60;
        } else {
          console.log('Nueva página en pregunta', i + 1, 'altura estimada:', estimatedHeight);
          doc.addPage();
          currentPage++;
          await drawHeader();
          drawWatermark();
          x = marginX;
          y = marginY + 60;
        }
      }

      // Número + enunciado
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(125, 160, 167); // Color secundario de SIMULIA para números
      doc.text(`${i + 1}.`, x, y);
      console.log('Pregunta', i + 1, 'en posición', x, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0); // Asegurar color negro
      const questionText = q.question || q.text || '';
      if (questionText.trim()) {
        // Limpiar caracteres especiales que causan problemas de renderizado
        const cleanText = questionText
          .replace(/≥/g, '>=')
          .replace(/≤/g, '<=')
          .replace(/±/g, '+/-')
          .replace(/×/g, 'x')
          .replace(/÷/g, '/')
          .replace(/°C/g, '°C')
          .replace(/°/g, '°')
          .replace(/κ/g, 'k')
          .replace(/α/g, 'a')
          .replace(/β/g, 'b')
          .replace(/γ/g, 'g')
          .replace(/δ/g, 'd')
          .replace(/ε/g, 'e')
          .replace(/ζ/g, 'z')
          .replace(/η/g, 'n')
          .replace(/θ/g, 'th')
          .replace(/ι/g, 'i')
          .replace(/λ/g, 'l')
          .replace(/μ/g, 'u')
          .replace(/ν/g, 'n')
          .replace(/ξ/g, 'x')
          .replace(/ο/g, 'o')
          .replace(/π/g, 'p')
          .replace(/ρ/g, 'r')
          .replace(/σ/g, 's')
          .replace(/τ/g, 't')
          .replace(/υ/g, 'u')
          .replace(/φ/g, 'f')
          .replace(/χ/g, 'ch')
          .replace(/ψ/g, 'ps')
          .replace(/ω/g, 'w');
        
        const splitText = doc.splitTextToSize(cleanText, textWidth);
        doc.text(splitText, x + 20, y);
        y += splitText.length * lineHeight + 4;
      }

      // Imagen asociada
      if (q.image) {
        try {
          console.log('Cargando imagen para pregunta', i + 1, ':', q.image);
          const img = new Image();
          img.crossOrigin = "Anonymous";
          
          // Asegurar que la URL sea absoluta si es relativa
          let imageUrl = q.image;
          if (imageUrl.startsWith('/')) {
            imageUrl = window.location.origin + imageUrl;
          } else if (!imageUrl.startsWith('http')) {
            // Si no es una URL absoluta ni relativa, asumir que es relativa
            imageUrl = window.location.origin + '/' + imageUrl;
          }
          
          img.src = imageUrl;
          
          await new Promise((res, rej) => {
            const timeout = setTimeout(() => {
              rej(new Error('Timeout cargando imagen'));
            }, 10000);
            
            img.onload = () => {
              clearTimeout(timeout);
              res();
            };
            img.onerror = (err) => {
              clearTimeout(timeout);
              rej(err);
            };
          });
          
          // Calcular dimensiones manteniendo proporción
          const maxWidth = colWidth - 20;
          const maxHeight = 120;
          const aspectRatio = img.width / img.height;
          
          let imgW = maxWidth;
          let imgH = maxWidth / aspectRatio;
          
          if (imgH > maxHeight) {
            imgH = maxHeight;
            imgW = maxHeight * aspectRatio;
          }
          
          doc.addImage(img, "JPEG", x + 20, y, imgW, imgH);
          y += imgH + 6;
          console.log('Imagen añadida en pregunta', i + 1, 'dimensiones:', imgW, 'x', imgH);
        } catch (error) {
          console.warn('Error al cargar imagen para pregunta', i + 1, ':', error);
          // Añadir texto indicando que la imagen no se pudo cargar
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text('[Imagen no disponible]', x + 20, y);
          doc.setTextColor(0, 0, 0);
          y += 15;
        }
      }

      // Opciones
      const renderOptions = q.options && q.options.length ? q.options : 
                     [q.option_1, q.option_2, q.option_3, q.option_4].filter(opt => opt && typeof opt === 'string');
      
      console.log('Pregunta', i + 1, 'tiene', renderOptions.length, 'opciones');
      renderOptions.slice(0, 4).forEach((opt, idx) => {
        const letter = String.fromCharCode(65 + idx); // A,B,C,D
        const optionText = `${letter}) ${opt || ''}`;
        if (optionText && typeof optionText === 'string' && optionText.trim()) {
          // Limpiar caracteres especiales en opciones
          const cleanOptionText = optionText
            .replace(/≥/g, '>=')
            .replace(/≤/g, '<=')
            .replace(/±/g, '+/-')
            .replace(/×/g, 'x')
            .replace(/÷/g, '/')
            .replace(/°C/g, '°C')
            .replace(/°/g, '°')
            .replace(/κ/g, 'k')
            .replace(/α/g, 'a')
            .replace(/β/g, 'b')
            .replace(/γ/g, 'g')
            .replace(/δ/g, 'd')
            .replace(/ε/g, 'e')
            .replace(/ζ/g, 'z')
            .replace(/η/g, 'n')
            .replace(/θ/g, 'th')
            .replace(/ι/g, 'i')
            .replace(/λ/g, 'l')
            .replace(/μ/g, 'u')
            .replace(/ν/g, 'n')
            .replace(/ξ/g, 'x')
            .replace(/ο/g, 'o')
            .replace(/π/g, 'p')
            .replace(/ρ/g, 'r')
            .replace(/σ/g, 's')
            .replace(/τ/g, 't')
            .replace(/υ/g, 'u')
            .replace(/φ/g, 'f')
            .replace(/χ/g, 'ch')
            .replace(/ψ/g, 'ps')
            .replace(/ω/g, 'w');
          
          // Asegurar tipografía consistente para opciones
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0); // Asegurar color negro
          const splitOpt = doc.splitTextToSize(cleanOptionText, textWidth - 20);
          doc.text(splitOpt, x + 40, y);
          y += splitOpt.length * lineHeight + 2;
        }
      });

      y += 8;
    }

    // === Paginación final ===
    const totalPages = doc.getNumberOfPages();
    console.log('Total páginas generadas:', totalPages);
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      drawFooter(p, totalPages);
    }

    console.log('Guardando PDF:', fileName);
    doc.save(fileName);
  } catch (error) {
    console.error('Error al generar PDF Simulia:', error);
    throw error;
  }
}


