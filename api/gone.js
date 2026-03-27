export default function handler(req, res) {
  res.statusCode = 410;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.end('Esta URL ya no existe. Ve a https://www.simulia.es');
}

