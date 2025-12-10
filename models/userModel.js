// models/userModel.js
const supabase = require('../config/supabaseClient');
const bcrypt = require('bcryptjs');

const User = {
  /**
   * Crear nuevo usuario
   */
  async create(userData) {
    const { email, username, password } = userData;
    
    // Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const { data, error } = await supabase
      .from('users')
      .insert([{
        email,
        username,
        password_hash,
        role: 'admin'
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Error creando usuario: ${error.message}`);
    }
    return data;
  },

  /**
   * Encontrar usuario por email
   */
  async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      throw new Error(`Usuario no encontrado: ${error.message}`);
    }
    return data;
  },

  /**
   * Verificar contraseña
   */
  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
};

module.exports = User;