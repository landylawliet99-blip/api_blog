// models/productModel.js - VERSIÓN COMPLETA CON GESTIÓN DE ENLACES
const supabase = require('../config/supabaseClient');

const Product = {
  /**
   * CREAR - Inserta un nuevo producto (laptop) en la base de datos.
   * @param {Object} productData - {name, brand, model, image_url, specs}
   * @returns {Promise<Object>} El producto creado
   */
  async create(productData) {
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();

    if (error) {
      console.error('[Product Model] Error en create:', error);
      throw new Error(`No se pudo crear el producto: ${error.message}`);
    }
    return data;
  },

  /**
   * LEER TODOS - Obtiene todos los productos, con sus enlaces de afiliado.
   * Útil para el panel de administración.
   * @returns {Promise<Array>} Lista de productos
   */
  async getAllWithLinks() {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        affiliate_links (id, store, url, base_price, current_price, original_price, discount_percentage, is_active, last_updated)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Product Model] Error en getAllWithLinks:', error);
      throw new Error(`No se pudieron obtener los productos: ${error.message}`);
    }
    return data;
  },

  /**
   * LEER POR ID - Obtiene un producto específico por su ID con sus enlaces.
   * @param {string} id - UUID del producto
   * @returns {Promise<Object>} El producto encontrado con sus enlaces
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        affiliate_links (id, store, url, base_price, current_price, original_price, discount_percentage, is_active, last_updated)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[Product Model] Error en getById:', error);
      if (error.code === 'PGRST116') { // No encontrado
        throw new Error(`Producto con ID "${id}" no encontrado.`);
      }
      throw new Error(`Error al obtener el producto: ${error.message}`);
    }
    return data;
  },

  /**
   * ACTUALIZAR - Modifica un producto existente.
   * @param {string} id - UUID del producto a actualizar
   * @param {Object} updates - Campos a modificar
   * @returns {Promise<Object>} El producto actualizado
   */
  async update(id, updates) {
    // Añade la fecha de actualización automáticamente
    const dataToUpdate = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('products')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Product Model] Error en update:', error);
      throw new Error(`No se pudo actualizar el producto: ${error.message}`);
    }
    return data;
  },

  /**
   * ELIMINAR - Borra un producto y sus enlaces de afiliado.
   * IMPORTANTE: Primero elimina los enlaces por la relación FOREIGN KEY
   * @param {string} id - UUID del producto a eliminar
   * @returns {Promise<boolean>} True si se eliminó correctamente
   */
  async delete(id) {
    // Primero eliminar los enlaces de afiliado relacionados
    const { error: linksError } = await supabase
      .from('affiliate_links')
      .delete()
      .eq('product_id', id);

    if (linksError) {
      console.error('[Product Model] Error eliminando enlaces:', linksError);
      throw new Error(`No se pudieron eliminar los enlaces del producto: ${linksError.message}`);
    }

    // Luego eliminar el producto
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Product Model] Error en delete:', error);
      throw new Error(`No se pudo eliminar el producto: ${error.message}`);
    }
    return true;
  },

  /**
   * AÑADIR ENLACE DE AFILIADO - Vincula un enlace (Amazon, etc.) a un producto.
   * @param {string} productId - UUID del producto
   * @param {Object} linkData - {store, url, base_price}
   * @returns {Promise<Object>} El enlace creado
   */
  async addAffiliateLink(productId, linkData) {
    const { data, error } = await supabase
      .from('affiliate_links')
      .insert([{
        product_id: productId,
        ...linkData,
        is_active: true,
        last_updated: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('[Product Model] Error en addAffiliateLink:', error);
      throw new Error(`No se pudo añadir el enlace: ${error.message}`);
    }
    return data;
  },

  /**
   * ACTUALIZAR ENLACE DE AFILIADO
   * @param {string} id - UUID del enlace
   * @param {Object} updates - Campos a modificar {is_active, current_price, etc.}
   * @returns {Promise<Object>} El enlace actualizado
   */
  async updateAffiliateLink(id, updates) {
    const { data, error } = await supabase
      .from('affiliate_links')
      .update({
        ...updates,
        last_updated: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Product Model] Error en updateAffiliateLink:', error);
      throw new Error(`No se pudo actualizar el enlace: ${error.message}`);
    }
    return data;
  },

  /**
   * ELIMINAR ENLACE DE AFILIADO
   * @param {string} id - UUID del enlace
   * @returns {Promise<boolean>} True si se eliminó correctamente
   */
  async deleteAffiliateLink(id) {
    const { error } = await supabase
      .from('affiliate_links')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Product Model] Error en deleteAffiliateLink:', error);
      throw new Error(`No se pudo eliminar el enlace: ${error.message}`);
    }
    return true;
  },

  /**
   * RELACIONAR PRODUCTO CON ARTÍCULO - Para artículos "Top 10".
   * @param {string} articleId - UUID del artículo
   * @param {string} productId - UUID del producto
   * @param {string} reviewNotes - Notas específicas sobre este producto en el artículo
   * @returns {Promise<Object>} La relación creado
   */
  async linkToArticle(articleId, productId, reviewNotes = '') {
    const { data, error } = await supabase
      .from('article_products')
      .insert([{
        article_id: articleId,
        product_id: productId,
        review_notes: reviewNotes
      }])
      .select()
      .single();

    if (error) {
      console.error('[Product Model] Error en linkToArticle:', error);
      throw new Error(`No se pudo relacionar el producto con el artículo: ${error.message}`);
    }
    return data;
  }
};

// Exporta el objeto Product para usarlo en los controladores
module.exports = Product;