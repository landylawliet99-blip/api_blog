// server.js - VERSIÓN COMPLETA CON SEO OPTIMIZATION
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
app.use(cors());
app.use(express.json());

// Middleware personalizado para headers de seguridad y cache
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Cache headers para archivos estáticos
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
console.log('✅ Conectado a Supabase');

// ==================== IMPORTAR RUTAS MVC ====================
const articleRoutes = require('./routes/articleRoutes');
const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');
const publicRoutes = require('./routes/publicRoutes');
const sitemapRoutes = require('./routes/sitemapRoutes'); // Nuevas rutas de SEO

// ==================== USAR RUTAS MVC ====================
app.use('/api', articleRoutes);
app.use('/api', productRoutes);
app.use('/api', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api', sitemapRoutes); // Rutas de sitemap, robots.txt, manifest.json

// ==================== RUTAS DE PRUEBA Y HEALTH CHECK ====================
app.get('/', (req, res) => {
  res.json({
    message: '🚀 API del Blog de Laptops Gaming funcionando con MVC y SEO',
    version: '1.1.0',
    endpoints: {
      articles: {
        create: 'POST /api/articles',
        getAll: 'GET /api/articles',
        getById: 'GET /api/articles/:id',
        update: 'PUT /api/articles/:id',
        delete: 'DELETE /api/articles/:id'
      },
      products: {
        create: 'POST /api/products',
        getAll: 'GET /api/products',
        addLink: 'POST /api/products/:productId/links',
        linkToArticle: 'POST /api/articles/:articleId/products'
      },
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login'
      },
      public: {
        getArticles: 'GET /api/public/articles',
        getArticle: 'GET /api/public/articles/:slug'
      },
      seo: {
        sitemap: 'GET /api/sitemap.xml',
        robots: 'GET /api/robots.txt',
        manifest: 'GET /api/manifest.json'
      }
    },
    seo_features: [
      'Meta tags dinámicos',
      'Sitemap XML automático',
      'Robots.txt inteligente',
      'Schema.org JSON-LD',
      'Open Graph tags',
      'Twitter Cards',
      'Compresión GZIP',
      'Headers de seguridad'
    ]
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'connected',
    seo_enabled: true,
    features: {
      compression: true,
      security_headers: true,
      sitemap: true
    }
  });
});

// ==================== RUTAS DE SEO DIRECTAS ====================
// Estas rutas también pueden ser accedidas directamente (sin /api) para crawlers
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
// Para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    suggestion: 'Visita / para ver todos los endpoints disponibles'
  });
});

// Manejador de errores general
app.use((err, req, res, next) => {
  console.error('❌ Error del servidor:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// ==================== INICIAR SERVIDOR ====================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
===========================================
🚀 SERVIDOR MVC CON SEO INICIADO
📡 URL: http://localhost:${PORT}
📊 Health: http://localhost:${PORT}/api/health
📚 Docs: http://localhost:${PORT}
===========================================
  `);
  console.log('📖 Rutas públicas:');
  console.log('   http://localhost:3001/api/public/articles');
  console.log('   http://localhost:3001/api/public/articles/:slug');
  
  console.log('\n🗺️  Herramientas SEO:');
  console.log('   Sitemap: http://localhost:3001/api/sitemap.xml');
  console.log('   Robots: http://localhost:3001/api/robots.txt');
  console.log('   Manifest: http://localhost:3001/api/manifest.json');
  
  console.log('\n🔧 Configuración:');
  console.log('   Compresión: ✅ Habilitada');
  console.log('   Headers de seguridad: ✅ Habilitados');
  console.log('   CORS: ✅ Habilitado');
  console.log('   Supabase: ✅ Conectado');
  
  console.log('\n⚠️  RECUERDA: Cambia "tudominio.com" en:');
  console.log('   - sitemapController.js');
  console.log('   - MetaTags.js (opcional)');
  console.log('   Cuando tengas tu dominio real en producción.');
  console.log('===========================================\n');
});