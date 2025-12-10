// api_blog/scripts/scrapePrices.js
const axios = require('axios');
const cheerio = require('cheerio');

console.log('✅ scrapePrices.js cargado');

// Función simple de prueba
async function testScraping() {
  console.log('🧪 Probando scraping básico...');
  
  try {
    // URL de prueba (producto de Amazon)
    const testUrl = 'https://www.amazon.com/dp/B0CCHWW8Z9';
    
    console.log(`📡 Intentando conectar a: ${testUrl.substring(0, 50)}...`);
    
    const { data } = await axios.get(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    console.log('✅ Página descargada correctamente');
    
    const $ = cheerio.load(data);
    
    // Buscar precio
    const priceText = $('#priceblock_ourprice').text() || 
                      $('.a-price-whole').first().text();
    
    if (priceText) {
      const price = priceText.replace(/[^0-9.]/g, '');
      console.log(`💰 Precio encontrado: $${price}`);
      return parseFloat(price);
    } else {
      console.log('⚠️  No se encontró precio en la página');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error en testScraping:', error.message);
    return null;
  }
}

// Exportar para usar en otros archivos
module.exports = { testScraping };

// Si se ejecuta directamente
if (require.main === module) {
  testScraping().then(price => {
    if (price) {
      console.log(`🎉 Test exitoso: $${price}`);
      process.exit(0);
    } else {
      console.log('💥 Test fallido');
      process.exit(1);
    }
  });
}