// controllers/productController.js - VERSIÓN COMPLETA Y FUNCIONAL
const Product = require('../models/productModel');

const productController = {
  /**
   * CREAR UN NUEVO PRODUCTO (Laptop)
   * POST /api/products
   */
  async create(req, res) {
    try {
      const { name, brand, model, image_url, specs } = req.body;
      
      // Validación básica
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'El nombre del producto es obligatorio'
        });
      }

      const productData = {
        name,
        brand: brand || null,
        model: model || null,
        image_url: image_url || null,
        specs: specs || {} // JSON con especificaciones
      };

      const newProduct = await Product.create(productData);

      res.status(201).json({
        success: true,
        message: '🖥️ Producto creado exitosamente',
        data: newProduct
      });
    } catch (error) {
      console.error('[Product Controller] Error en create:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear el producto',
        error: error.message
      });
    }
  },

  /**
   * OBTENER TODOS LOS PRODUCTOS CON SUS ENLACES
   * GET /api/products
   */
  async getAllWithLinks(req, res) {
    try {
      const products = await Product.getAllWithLinks();
      
      res.json({
        success: true,
        count: products.length,
        data: products
      });
    } catch (error) {
      console.error('[Product Controller] Error en getAllWithLinks:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos',
        error: error.message
      });
    }
  },

  /**
   * OBTENER UN PRODUCTO POR SU ID
   * GET /api/products/:id
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const product = await Product.getById(id);

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('[Product Controller] Error en getById:', error);
      
      // Si el error es porque no encontró el producto, devolver 404
      if (error.message.includes('no encontrado')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error al obtener el producto',
        error: error.message
      });
    }
  },

  /**
   * ACTUALIZAR UN PRODUCTO
   * PUT /api/products/:id
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

      const updatedProduct = await Product.update(id, updates);

      res.json({
        success: true,
        message: '✅ Producto actualizado',
        data: updatedProduct
      });
    } catch (error) {
      console.error('[Product Controller] Error en update:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el producto',
        error: error.message
      });
    }
  },

  /**
   * ELIMINAR UN PRODUCTO
   * DELETE /api/products/:id
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      await Product.delete(id);

      res.json({
        success: true,
        message: '🗑️ Producto eliminado correctamente'
      });
    } catch (error) {
      console.error('[Product Controller] Error en delete:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar el producto',
        error: error.message
      });
    }
  },

  /**
   * AÑADIR ENLACE DE AFILIADO A UN PRODUCTO
   * POST /api/products/:productId/links
   */
  async addAffiliateLink(req, res) {
    try {
      const { productId } = req.params;
      const { store, url, base_price } = req.body;

      // Validación
      if (!store || !url) {
        return res.status(400).json({
          success: false,
          message: 'Store (tienda) y URL son obligatorios'
        });
      }

      // Validar que la tienda sea una de las permitidas
      const allowedStores = ['amazon', 'walmart', 'bestbuy', 'newegg'];
      if (!allowedStores.includes(store.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Store no válida. Usa: ${allowedStores.join(', ')}`
        });
      }

      const linkData = {
        store: store.toLowerCase(),
        url,
        base_price: base_price ? parseFloat(base_price) : null
      };

      const newLink = await Product.addAffiliateLink(productId, linkData);

      res.status(201).json({
        success: true,
        message: `🔗 Enlace de afiliado para ${store} añadido exitosamente`,
        data: newLink
      });
    } catch (error) {
      console.error('[Product Controller] Error en addAffiliateLink:', error);
      res.status(500).json({
        success: false,
        message: 'Error al añadir el enlace de afiliado',
        error: error.message
      });
    }
  },

  /**
   * ACTUALIZAR UN ENLACE DE AFILIADO
   * PUT /api/products/:productId/links/:linkId
   */
  async updateAffiliateLink(req, res) {
    try {
      const { productId, linkId } = req.params;
      const updates = req.body;

      // Validar que vengan datos para actualizar
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se enviaron datos para actualizar'
        });
      }

      // Solo permitir ciertos campos para actualizar
      const allowedUpdates = ['is_active', 'current_price', 'original_price', 'discount_percentage', 'notes'];
      const filteredUpdates = {};
      
      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          filteredUpdates[key] = updates[key];
        }
      });

      if (Object.keys(filteredUpdates).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay campos válidos para actualizar. Campos permitidos: ' + allowedUpdates.join(', ')
        });
      }

      const updatedLink = await Product.updateAffiliateLink(linkId, filteredUpdates);

      res.json({
        success: true,
        message: '✅ Enlace de afiliado actualizado',
        data: updatedLink
      });
    } catch (error) {
      console.error('[Product Controller] Error en updateAffiliateLink:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el enlace de afiliado',
        error: error.message
      });
    }
  },

  /**
   * ELIMINAR UN ENLACE DE AFILIADO
   * DELETE /api/products/:productId/links/:linkId
   */
  async deleteAffiliateLink(req, res) {
    try {
      const { productId, linkId } = req.params;
      await Product.deleteAffiliateLink(linkId);

      res.json({
        success: true,
        message: '🗑️ Enlace de afiliado eliminado correctamente'
      });
    } catch (error) {
      console.error('[Product Controller] Error en deleteAffiliateLink:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar el enlace de afiliado',
        error: error.message
      });
    }
  },

  /**
   * RELACIONAR UN PRODUCTO CON UN ARTÍCULO
   * POST /api/articles/:articleId/products
   * Para artículos tipo "Top 10" donde mencionas varias laptops
   */
  async linkToArticle(req, res) {
    try {
      const { articleId } = req.params;
      const { productId, reviewNotes } = req.body;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'El ID del producto es obligatorio'
        });
      }

      const relation = await Product.linkToArticle(articleId, productId, reviewNotes);

      res.status(201).json({
        success: true,
        message: '✅ Producto relacionado con el artículo exitosamente',
        data: relation
      });
    } catch (error) {
      console.error('[Product Controller] Error en linkToArticle:', error);
      res.status(500).json({
        success: false,
        message: 'Error al relacionar producto con artículo',
        error: error.message
      });
    }
  }
};

module.exports = productController;