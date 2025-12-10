// server.js - VERSIÓN CORREGIDA CON MVC INTEGRADO
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// ==================== CONEXIÓN SUPABASE (para rutas de prueba) ====================
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
const publicRoutes = require('./routes/publicRoutes'); // NUEVO: Rutas públicas para visitantes

// ==================== USAR RUTAS MVC ====================
app.use('/api', articleRoutes);
app.use('/api', productRoutes);
app.use('/api', authRoutes);
app.use('/api/public', publicRoutes); // NUEVO: Rutas públicas accesibles en /api/public

// ==================== RUTAS DE PRUEBA Y HEALTH CHECK ====================
app.get('/', (req, res) => {
  res.json({
    message: '🚀 API del Blog de Laptops Gaming funcionando con MVC',
    version: '1.0.0',
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
      public: { // NUEVA SECCIÓN: Rutas públicas para visitantes
        getArticle: 'GET /api/public/articles/:slug'
      }
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// ==================== MANEJO DE ERRORES ====================
// Para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// ==================== INICIAR SERVIDOR ====================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
===========================================
🚀 SERVIDOR MVC INICIADO CORRECTAMENTE
📡 URL: http://localhost:${PORT}
📊 Health check: http://localhost:${PORT}/api/health
📚 Documentación: http://localhost:${PORT}
===========================================
  `);
  console.log('📖 Rutas públicas disponibles en: http://localhost:3001/api/public/articles/:slug');
});