// models/articleModel.js - VERSIÓN COMPLETA CON MÉTODO getPublished()
const supabase = require('../config/supabaseClient');

const Article = {
  /**
   * CREAR - Inserta un nuevo artículo en la base de datos.
   * @param {Object} articleData - Datos del artículo {title, slug, content, ...}
   * @returns {Promise<Object>} El artículo creado
   */
  async create(articleData) {
    const { data, error } = await supabase
      .from('articles')
      .insert([{
        ...articleData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('[Article Model] Error en create:', error);
      throw new Error(`No se pudo crear el artículo: ${error.message}`);
    }
    return data;
  },

  /**
   * LEER TODOS - Obtiene todos los artículos, útiles para el listado del panel admin.
   * @param {Object} options - Opciones para filtrar y paginar (futuro)
   * @returns {Promise<Array>} Lista de artículos
   */
  async getAll(options = {}) {
    let query = supabase
      .from('articles')
      .select('*');

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('[Article Model] Error en getAll:', error);
      throw new Error(`No se pudieron obtener los artículos: ${error.message}`);
    }
    return data;
  },

  /**
   * LEER POR ID - Obtiene un artículo específico por su ID.
   * @param {string} id - UUID del artículo
   * @returns {Promise<Object>} El artículo encontrado
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[Article Model] Error en getById:', error);
      if (error.code === 'PGRST116') {
        throw new Error(`Artículo con ID "${id}" no encontrado.`);
      }
      throw new Error(`Error al obtener el artículo: ${error.message}`);
    }
    return data;
  },

  /**
   * LEER POR SLUG - Obtiene un artículo por su slug (para la URL pública del blog).
   * @param {string} slug - Slug del artículo (ej: 'mejores-laptops-2024')
   * @returns {Promise<Object>} El artículo encontrado
   */
  async getBySlug(slug) {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('[Article Model] Error en getBySlug:', error);
      if (error.code === 'PGRST116') {
        throw new Error(`Artículo con slug "${slug}" no encontrado.`);
      }
      throw new Error(`Error al obtener el artículo: ${error.message}`);
    }
    return data;
  },

  /**
   * OBTENER ARTÍCULOS PUBLICADOS (para la página principal pública)
   * @returns {Promise<Array>} Lista de artículos con estado 'published'
   */
  async getPublished() {
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, slug, excerpt, cover_image_url, created_at, updated_at, status')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Article Model] Error en getPublished:', error);
      throw new Error(`No se pudieron obtener artículos publicados: ${error.message}`);
    }
    return data;
  },

  /**
   * ACTUALIZAR - Modifica un artículo existente.
   * @param {string} id - UUID del artículo a actualizar
   * @param {Object} updates - Campos a modificar {title, content, status, ...}
   * @returns {Promise<Object>} El artículo actualizado
   */
  async update(id, updates) {
    const dataToUpdate = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('articles')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Article Model] Error en update:', error);
      throw new Error(`No se pudo actualizar el artículo: ${error.message}`);
    }
    return data;
  },

  /**
   * ELIMINAR - Borra un artículo de la base de datos.
   * @param {string} id - UUID del artículo a eliminar
   * @returns {Promise<boolean>} True si se eliminó correctamente
   */
  async delete(id) {
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Article Model] Error en delete:', error);
      throw new Error(`No se pudo eliminar el artículo: ${error.message}`);
    }
    return true;
  },

  /**
   * CAMBIAR ESTADO - Función específica para publicar o despublicar un artículo.
   * @param {string} id - UUID del artículo
   * @param {string} status - Nuevo estado ('published' o 'draft')
   * @returns {Promise<Object>} El artículo actualizado
   */
  async updateStatus(id, status) {
    return this.update(id, { status });
  },

  /**
   * OBTENER ARTÍCULO CON PRODUCTOS Y ENLACES (Para la vista pública)
   * @param {string} slug - Slug del artículo publicado
   * @returns {Promise<Object>} Artículo con sus productos y enlaces de afiliado
   */
  async getWithProducts(slug) {
    const { data, error } = await supabase
      .from('articles')
      .select(`
        *,
        article_products (
          review_notes,
          products (
            id,
            name,
            brand,
            model,
            image_url,
            specs,
            affiliate_links (
              id,
              store,
              url,
              current_price,
              original_price,
              discount_percentage,
              is_active,
              last_updated
            )
          )
        )
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error) {
      console.error('[Article Model] Error en getWithProducts:', error);
      if (error.code === 'PGRST116') {
        throw new Error(`Artículo con slug "${slug}" no encontrado o no está publicado.`);
      }
      throw new Error(`Error al obtener el artículo: ${error.message}`);
    }
    return data;
  }
};

module.exports = Article;