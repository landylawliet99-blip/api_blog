// backend/routes/scrapeRoutes.js
const express = require('express');
const router = express.Router();
const scrapeController = require('../controllers/scrapeController');

/**
 * 🛍️ RUTAS DE SCRAPING - Para importar productos automáticamente
 * 
 * Estas rutas permiten extraer información de productos desde
 * tiendas como Amazon, Walmart, BestBuy, etc.
 */

// 🔍 POST /api/scrape/product - Extraer datos de producto desde URL
router.post('/scrape/product', async (req, res, next) => {
  try {
    // Pasar directamente al controlador
    await scrapeController.scrapeProduct(req, res);
  } catch (error) {
    next(error);
  }
});

// 🧪 GET /api/scrape/test - Endpoint de prueba
router.get('/scrape/test', async (req, res, next) => {
  try {
    await scrapeController.testScraping(req, res);
  } catch (error) {
    next(error);
  }
});

// 📦 POST /api/scrape/bulk - Importación masiva (futuro)
router.post('/scrape/bulk', (req, res) => {
  res.json({
    success: true,
    message: '🚧 Importación masiva - En desarrollo',
    note: 'Esta función permitirá importar múltiples productos a la vez'
  });
});

// 🏪 GET /api/scrape/supported-stores - Tiendas soportadas
router.get('/scrape/supported-stores', (req, res) => {
  res.json({
    success: true,
    stores: [
      {
        name: 'Amazon',
        domain: 'amazon.com',
        features: ['extracción completa', 'precios', 'especificaciones', 'imágenes'],
        affiliate: 'Sí (Amazon Associates)',
        status: '✅ Activo'
      },
      {
        name: 'Walmart',
        domain: 'walmart.com',
        features: ['extracción básica', 'precios', 'nombre', 'imagen'],
        affiliate: 'Sí (Walmart Affiliates)',
        status: '✅ Activo'
      },
      {
        name: 'Best Buy',
        domain: 'bestbuy.com',
        features: ['extracción básica', 'precios', 'nombre', 'imagen'],
        affiliate: 'Sí (BestBuy Affiliate)',
        status: '✅ Activo'
      },
      {
        name: 'Newegg',
        domain: 'newegg.com',
        features: ['extracción básica', 'precios', 'nombre'],
        affiliate: 'Sí (Newegg Partner)',
        status: '✅ Activo'
      },
      {
        name: 'Micro Center',
        domain: 'microcenter.com',
        features: ['extracción básica'],
        affiliate: 'Sí (Micro Center Affiliate)',
        status: '🔜 Próximamente'
      }
    ],
    usage: {
      endpoint: 'POST /api/scrape/product',
      body: '{ "url": "https://www.amazon.com/dp/B0XXXXX" }',
      response: 'Producto extraído con todos los campos'
    }
  });
});

// 📊 GET /api/scrape/status - Estado del servicio de scraping
router.get('/scrape/status', (req, res) => {
  const now = new Date();
  res.json({
    success: true,
    service: 'Product Scraping Service',
    status: '🟢 Operativo',
    version: '1.0.0',
    last_updated: now.toISOString(),
    uptime: process.uptime(),
    features: [
      'Detección automática de tienda',
      'Extracción completa de especificaciones',
      'Mapeo inteligente de campos',
      'Limpieza y normalización de datos',
      'Soporte para múltiples tiendas',
      'Generación automática de enlaces de afiliado'
    ],
    limits: {
      max_response_time: '10 segundos',
      rate_limit: '10 peticiones/minuto (por IP)',
      supported_formats: ['JSON']
    },
    next_features: [
      'Importación masiva desde CSV',
      'API de Amazon Associates',
      'Sistema de caché para reducir peticiones',
      'Monitorización de cambios de precio'
    ]
  });
});

module.exports = router;