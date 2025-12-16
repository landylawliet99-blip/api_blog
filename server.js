// server.js - VERSIÓN COMPLETA CON MIDDLEWARE DE ERRORES JSON
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');

const app = express();

// ==================== MIDDLEWARES DE SEGURIDAD Y PERFORMANCE ====================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.supabase.co"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(cors({
  origin: ['http://localhost:3000', 'https://blog-laptops-gaming.onrender.com'],
  credentials: true
}));
app.use(express.json());

// MIDDLEWARE PARA CAPTURAR ERRORES DE JSON MALFORMADO
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Error de sintaxis JSON:', err.message);
    return res.status(400).json({
      success: false,
      message: 'JSON malformado en la solicitud',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  next();
});

// Middleware personalizado para headers de seguridad y cache
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  } else {
    res.setHeader('Cache-Control', 'no-cache');
  }
  
  next();
});

// ==================== CONEXIÓN SUPABASE ====================
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ==================== IMPORTAR RUTAS MVC ====================
const articleRoutes = require('./routes/articleRoutes');
const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');
const publicRoutes = require('./routes/publicRoutes');
const sitemapRoutes = require('./routes/sitemapRoutes');
const scrapeRoutes = require('./routes/scrapeRoutes');

// ==================== USAR RUTAS MVC ====================
app.use('/api', articleRoutes);
app.use('/api', productRoutes);
app.use('/api', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api', sitemapRoutes);
app.use('/api', scrapeRoutes);

// ==================== RUTAS DE PRUEBA Y HEALTH CHECK ====================
app.get('/', (req, res) => {
  res.json({
    message: '🚀 API del Blog de Laptops Gaming',
    version: '1.2.0',
    features: ['MVC', 'SEO', 'Scraping', 'Afiliados', 'Autenticación'],
    endpoints: {
      articles: '/api/articles',
      products: '/api/products',
      auth: '/api/auth',
      public: '/api/public',
      seo: ['/api/sitemap.xml', '/api/robots.txt'],
      scraping: '/api/scrape'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'connected',
    seo_enabled: true,
    scraping_enabled: true
  });
});

// ==================== RUTAS DE SEO DIRECTAS ====================
app.get('/sitemap.xml', (req, res) => {
  res.redirect('/api/sitemap.xml');
});

app.get('/robots.txt', (req, res) => {
  res.redirect('/api/robots.txt');
});

app.get('/manifest.json', (req, res) => {
  res.redirect('/api/manifest.json');
});

// ==================== MANEJO DE ERRORES ====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

app.use((err, req, res, next) => {
  console.error('Error del servidor:', err.message);
  
  if (err.message.includes('Tienda no soportada') || err.message.includes('scraping')) {
    return res.status(400).json({
      success: false,
      message: 'Error en scraping: ' + err.message
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

// ==================== INICIAR SERVIDOR ====================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});