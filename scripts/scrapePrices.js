// api_blog/scripts/scrapePrices.js - VERSIÓN SIMPLIFICADA
const axios = require('axios');
const cheerio = require('cheerio');

console.log('✅ scrapePrices.js cargado (versión básica)');

/**
 * FUNCIÓN GENÉRICA para obtener precio de cualquier URL
 * - Simple
 * - Genérica (no específica de Amazon)
 * - Base para expandir después
 */
async function getProductPrice(url) {
  console.log(`🔍 Buscando precio en: ${url.substring(0, 60)}...`);
  
  try {
    // Configuración mínima
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(data);
    
    // ESTRATEGIAS DE BÚSQUEDA GENÉRICAS (funcionan en muchas tiendas)
    
    // 1. Buscar en meta tags (muchas tiendas usan esto)
    const metaPrice = $('meta[property="product:price:amount"], meta[property="og:price:amount"]').attr('content');
    if (metaPrice) {
      const price = parseFloat(metaPrice);
      if (!isNaN(price)) {
        console.log(`💰 Precio encontrado en META TAG: $${price.toFixed(2)}`);
        return price;
      }
    }
    
    // 2. Buscar elementos con clase que contenga "price"
    const priceElements = $('[class*="price"], [class*="Price"], [id*="price"], [id*="Price"]');
    
    for (let i = 0; i < Math.min(priceElements.length, 20); i++) {
      const element = $(priceElements[i]);
      const text = element.text().trim();
      
      // Buscar formato $99.99 o 99,99
      const priceMatch = text.match(/\$?\s*(\d+[,.]?\d{0,2})/);
      if (priceMatch) {
        const priceStr = priceMatch[1].replace(',', '.');
        const price = parseFloat(priceStr);
        
        // Validar que sea un precio razonable (no 0, no millones)
        if (!isNaN(price) && price > 1 && price < 100000) {
          console.log(`💰 Precio encontrado: $${price.toFixed(2)}`);
          return price;
        }
      }
    }
    
    // 3. Último recurso: buscar en todo el texto de la página
    const bodyText = $('body').text();
    const allPrices = bodyText.match(/\$\s*(\d+[,.]?\d{0,2})/g);
    
    if (allPrices && allPrices.length > 0) {
      const firstPrice = allPrices[0].match(/\$?\s*(\d+[,.]?\d{0,2})/);
      if (firstPrice) {
        const priceStr = firstPrice[1].replace(',', '.');
        const price = parseFloat(priceStr);
        
        if (!isNaN(price) && price > 1 && price < 100000) {
          console.log(`💰 Precio encontrado (búsqueda general): $${price.toFixed(2)}`);
          return price;
        }
      }
    }
    
    console.log('⚠️  No se encontró precio en la página');
    return null;
    
  } catch (error) {
    console.error('❌ Error en getProductPrice:', error.message);
    
    // Mensajes útiles según el tipo de error
    if (error.code === 'ECONNABORTED') {
      console.log('⏰ La tienda tardó demasiado en responder');
    } else if (error.response) {
      console.log(`📄 Código HTTP: ${error.response.status}`);
    }
    
    return null;
  }
}

/**
 * FUNCIÓN DE PRUEBA BÁSICA
 */
async function testBasicScraping(url = '') {
  console.log('🧪 Prueba básica de scraping');
  
  // Si no se proporciona URL, usa un ejemplo genérico
  const testUrl = url || 'https://example.com/product';
  
  if (!url) {
    console.log('📝 Ejemplos de URLs para probar después:');
    console.log('  - Cualquier tienda de laptops que conozcas');
    console.log('  - Cuando decidas con qué tiendas trabajar, podremos mejorarlo');
    console.log('  - Por ahora es una función base genérica');
  }
  
  const price = await getProductPrice(testUrl);
  
  if (price) {
    console.log(`🎉 ¡Funciona! Precio obtenido: $${price.toFixed(2)}`);
    return price;
  } else {
    console.log('💡 Esta es solo una base. Cuando elijas tus tiendas, la mejoraremos.');
    return null;
  }
}

// Exportar funciones básicas
module.exports = {
  getProductPrice,
  testBasicScraping
};

// Si se ejecuta directamente, mostrar información
if (require.main === module) {
  console.log('\n🛠️  HERRAMIENTA BASE DE SCRAPING');
  console.log('===============================');
  console.log('Esta es una versión BASE genérica.');
  console.log('Funcionará mejor cuando decidas:');
  console.log('1. Con qué tiendas específicas trabajarás');
  console.log('2. Qué selectores usar para cada tienda');
  console.log('3. Cómo integrarlo con tus productos');
  console.log('\n📋 Para probar:');
  console.log('   En tu código, usa: testBasicScraping("URL-de-tienda")');
  console.log('===============================\n');
  
  testBasicScraping();
}