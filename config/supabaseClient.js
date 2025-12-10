
// config/supabaseClient.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Crea el cliente de Supabase usando las variables de tu .env
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Exporta el cliente para usarlo en cualquier otro archivo
module.exports = supabase;