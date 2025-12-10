// routes/publicRoutes.js - VERSIÓN COMPLETA CON AMBAS RUTAS
const express = require('express');
const router = express.Router();
const Article = require('../models/articleModel');

/**
 * 🔓 RUTAS PÚBLICAS - Sin autenticación
 * Para usuarios que visitan el blog
 */

// GET /api/public/articles - Lista de artículos publicados
router.get('/articles', async (req, res) => {
  try {
    console.log('[Public Routes] Obteniendo lista de artículos publicados...');
    
    const articles = await Article.getPublished();
    
    console.log(`[Public Routes] Encontrados ${articles.length} artículos publicados`);
    
    res.json({
      success: true,
      count: articles.length,
      data: articles
    });
    
  } catch (error) {
    console.error('[Public Routes] Error en GET /articles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener artículos públicos',
      error: error.message
    });
  }
});

// GET /api/public/articles/:slug - Artículo individual con productos y enlaces
router.get('/articles/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    console.log(`[Public Routes] Buscando artículo con slug: ${slug}`);
    
    const article = await Article.getWithProducts(slug);
    
    console.log(`[Public Routes] Artículo encontrado: ${article.title}`);
    
    res.json({
      success: true,
      data: article
    });
    
  } catch (error) {
    console.error('[Public Routes] Error en GET /articles/:slug:', error);
    
    // Manejar diferentes tipos de errores
    if (error.message.includes('no encontrado') || error.message.includes('no está publicado')) {
      return res.status(404).json({
        success: false,
        message: 'Artículo no encontrado o no está publicado'
      });
    }
    
    // Error de base de datos u otro error
    res.status(500).json({
      success: false,
      message: 'Error al obtener el artículo',
      error: error.message
    });
  }
});

module.exports = router;