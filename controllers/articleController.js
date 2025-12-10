// controllers/articleController.js
const Article = require('../models/articleModel');

const articleController = {
  /**
   * Crear un nuevo artículo (POST /api/articles)
   */
  async create(req, res) {
    try {
      // 1. Extraer datos del cuerpo de la solicitud
      const { title, slug, excerpt, content, cover_image_url } = req.body;

      // 2. Validación BÁSICA
      if (!title || !slug || !content) {
        return res.status(400).json({
          success: false,
          message: 'Faltan campos obligatorios: título, slug o contenido'
        });
      }

      // 3. Preparar objeto para la base de datos
      const articleData = {
        title,
        slug,
        excerpt: excerpt || '', // Si no viene, usa string vacío
        content,
        cover_image_url: cover_image_url || null,
        status: 'draft' // Por defecto, lo creamos como borrador
      };

      // 4. Llamar al MODELO para guardar
      const newArticle = await Article.create(articleData);

      // 5. Responder con ÉXITO
      res.status(201).json({
        success: true,
        message: '✅ Artículo creado exitosamente',
        data: newArticle
      });

    } catch (error) {
      // 6. Manejar cualquier error
      console.error('[Article Controller] Error en create:', error);
      res.status(500).json({
        success: false,
        message: '❌ Error interno del servidor al crear el artículo',
        error: error.message // Esto es solo para desarrollo
      });
    }
  },

  /**
   * Obtener TODOS los artículos (GET /api/articles)
   * Útil para el listado del panel de admin
   */
  async getAll(req, res) {
    try {
      const articles = await Article.getAll();
      
      res.json({
        success: true,
        count: articles.length,
        data: articles
      });
    } catch (error) {
      console.error('[Article Controller] Error en getAll:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los artículos',
        error: error.message
      });
    }
  },

  /**
   * Obtener un artículo por su ID (GET /api/articles/:id)
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const article = await Article.getById(id);

      res.json({
        success: true,
        data: article
      });
    } catch (error) {
      console.error('[Article Controller] Error en getById:', error);
      // Si el error es porque no encontró el artículo, devolver 404
      if (error.message.includes('no encontrado')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error al obtener el artículo',
        error: error.message
      });
    }
  },

  /**
   * Actualizar un artículo (PUT /api/articles/:id)
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Validar que vengan datos para actualizar
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se enviaron datos para actualizar'
        });
      }

      const updatedArticle = await Article.update(id, updates);

      res.json({
        success: true,
        message: '✅ Artículo actualizado',
        data: updatedArticle
      });
    } catch (error) {
      console.error('[Article Controller] Error en update:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el artículo',
        error: error.message
      });
    }
  },

  /**
   * Eliminar un artículo (DELETE /api/articles/:id)
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      await Article.delete(id);

      res.json({
        success: true,
        message: '🗑️ Artículo eliminado correctamente'
      });
    } catch (error) {
      console.error('[Article Controller] Error en delete:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar el artículo',
        error: error.message
      });
    }
  }
};

// Exportar TODAS las funciones del controlador
module.exports = articleController;