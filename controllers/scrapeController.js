// backend/controllers/scrapeController.js - VERSIÓN CON LOGGING DETALLADO
const axios = require('axios');
const cheerio = require('cheerio');

const scrapeController = {
  async scrapeProduct(req, res) {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    
    console.log(`\n=== 🛍️  SCRAPING REQUEST ${requestId} ===`);
    console.log(`📥 URL recibida: ${req.body?.url}`);
    console.log(`⏰ Hora: ${new Date().toISOString()}`);

    try {
      const { url } = req.body;
      
      if (!url) {
        console.log(`❌ ${requestId}: No se proporcionó URL`);
        return res.status(400).json({
          success: false,
          message: 'URL es requerida'
        });
      }

      // Validar URL básica
      try {
        new URL(url);
      } catch (urlError) {
        console.log(`❌ ${requestId}: URL inválida - ${urlError.message}`);
        return res.status(400).json({
          success: false,
          message: 'URL inválida'
        });
      }

      console.log(`🔍 ${requestId}: Detectando tienda...`);
      const store = detectStore(url);
      console.log(`🏪 ${requestId}: Tienda detectada: ${store}`);

      if (store === 'unknown') {
        console.log(`❌ ${requestId}: Tienda no soportada - ${url}`);
        return res.status(400).json({
          success: false,
          message: `Tienda no soportada. Soporta: Amazon, Walmart, BestBuy, Newegg`
        });
      }

      console.log(`🌐 ${requestId}: Iniciando scraping para ${store}...`);
      let productData;
      
      try {
        switch (store) {
          case 'amazon':
            productData = await scrapeAmazonProduct(url, requestId);
            break;
          case 'walmart':
            productData = await scrapeWalmartProduct(url, requestId);
            break;
          case 'bestbuy':
            productData = await scrapeBestBuyProduct(url, requestId);
            break;
          case 'newegg':
            productData = await scrapeNeweggProduct(url, requestId);
            break;
          default:
            throw new Error(`Función de scraping no implementada para: ${store}`);
        }
      } catch (scrapeError) {
        console.log(`❌ ${requestId}: Error en scraping específico - ${scrapeError.message}`);
        throw scrapeError;
      }

      if (!productData || !productData.name) {
        console.log(`⚠️ ${requestId}: Scraping completado pero datos incompletos`);
      } else {
        console.log(`✅ ${requestId}: Scraping exitoso`);
        console.log(`📦 ${requestId}: Producto - ${productData.name.substring(0, 60)}...`);
        console.log(`🏷️ ${requestId}: Marca - ${productData.brand || 'No detectada'}`);
        console.log(`💰 ${requestId}: Precio - $${productData.price?.current || 'No detectado'}`);
      }

      const elapsedTime = Date.now() - startTime;
      console.log(`⏱️ ${requestId}: Tiempo total - ${elapsedTime}ms`);
      console.log(`=== ✅ FIN REQUEST ${requestId} ===\n`);

      res.json({
        success: true,
        data: productData,
        metadata: {
          store,
          requestId,
          processingTime: `${elapsedTime}ms`
        }
      });

    } catch (error) {
      const elapsedTime = Date.now() - startTime;
      console.log(`❌ ${requestId}: ERROR CRÍTICO - ${error.message}`);
      console.log(`🔧 ${requestId}: Stack trace - ${error.stack}`);
      console.log(`⏱️ ${requestId}: Tiempo antes del error - ${elapsedTime}ms`);
      console.log(`=== ❌ ERROR REQUEST ${requestId} ===\n`);

      // Determinar código de estado apropiado
      let statusCode = 500;
      let userMessage = 'Error interno del servidor';
      
      if (error.message.includes('Tienda no soportada')) {
        statusCode = 400;
        userMessage = error.message;
      } else if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
        statusCode = 408;
        userMessage = 'La tienda no respondió a tiempo. Intenta con otra URL.';
      } else if (error.message.includes('ENOTFOUND')) {
        statusCode = 400;
        userMessage = 'No se pudo conectar a la tienda. Verifica la URL.';
      }

      res.status(statusCode).json({
        success: false,
        message: userMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        metadata: {
          requestId,
          processingTime: `${elapsedTime}ms`
        }
      });
    }
  },

  async testScraping(req, res) {
    res.json({
      success: true,
      message: '🚀 Scraping Controller funcionando',
      timestamp: new Date().toISOString(),
      endpoints: {
        scrapeProduct: 'POST /api/scrape/product',
        test: 'GET /api/scrape/test'
      }
    });
  }
};

// ==================== FUNCIONES AUXILIARES ====================

function detectStore(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('amazon.')) return 'amazon';
    if (hostname.includes('walmart.')) return 'walmart';
    if (hostname.includes('bestbuy.')) return 'bestbuy';
    if (hostname.includes('newegg.')) return 'newegg';
    return 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

async function scrapeAmazonProduct(url, requestId) {
  console.log(`🛒 ${requestId}: Iniciando scraping de Amazon`);
  
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    };

    console.log(`📡 ${requestId}: Solicitando página de Amazon...`);
    const response = await axios.get(url, { 
      headers, 
      timeout: 15000,
      maxRedirects: 5
    });
    
    console.log(`📄 ${requestId}: Respuesta recibida - Status: ${response.status}`);
    
    const $ = cheerio.load(response.data);
    
    // Extraer nombre
    const name = $('#productTitle').text().trim();
    console.log(`📝 ${requestId}: Nombre extraído - ${name ? '✅' : '❌'}`);
    
    // Extraer precio
    const priceText = $('.a-price-whole').first().text().trim();
    const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : null;
    console.log(`💰 ${requestId}: Precio extraído - ${price ? '$' + price : '❌'}`);
    
    // Extraer imagen
    const image_url = $('#landingImage').attr('src') || $('.a-dynamic-image').first().attr('src');
    console.log(`🖼️ ${requestId}: Imagen extraída - ${image_url ? '✅' : '❌'}`);
    
    // Extraer marca
    let brand = $('a#bylineInfo').text().replace('Visit the', '').replace('Store', '').trim();
    if (!brand || brand.length < 2) {
      const titleUpper = name.toUpperCase();
      const commonBrands = ['ASUS', 'MSI', 'LENOVO', 'ACER', 'DELL', 'HP', 'RAZER', 'ALIENWARE', 'SAMSUNG'];
      for (const b of commonBrands) {
        if (titleUpper.includes(b)) {
          brand = b;
          break;
        }
      }
    }
    console.log(`🏷️ ${requestId}: Marca extraída - ${brand || '❌'}`);
    
    // Extraer especificaciones básicas
    const specs = {};
    $('#productDetails_techSpec_section_1 tr').each((i, row) => {
      const key = $(row).find('th').text().trim().toLowerCase();
      const value = $(row).find('td').text().trim();
      if (key && value) {
        if (key.includes('graphics') || key.includes('gpu')) specs.gpu = value;
        if (key.includes('processor') || key.includes('cpu')) specs.cpu = value;
        if (key.includes('memory') || key.includes('ram')) specs.ram = value;
        if (key.includes('hard') || key.includes('ssd') || key.includes('storage')) specs.storage = value;
        if (key.includes('display') || key.includes('screen')) specs.display = value;
      }
    });
    
    console.log(`⚙️ ${requestId}: Especificaciones extraídas - ${Object.keys(specs).length} campos`);
    
    const result = {
      name,
      brand,
      price: { current: price },
      image_url,
      specs,
      store: 'amazon',
      original_url: url
    };
    
    // Añadir tag de afiliado
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set('tag', 'laptopsgaming-20');
      result.affiliate_url = urlObj.toString();
      console.log(`🔗 ${requestId}: URL de afiliado generada`);
    } catch (error) {
      console.log(`⚠️ ${requestId}: No se pudo generar URL de afiliado`);
      result.affiliate_url = url;
    }
    
    return result;
    
  } catch (error) {
    console.log(`❌ ${requestId}: Error en scrapeAmazonProduct - ${error.message}`);
    if (error.response) {
      console.log(`📊 ${requestId}: Status code - ${error.response.status}`);
      console.log(`📄 ${requestId}: Headers - ${JSON.stringify(error.response.headers)}`);
    }
    throw error;
  }
}

async function scrapeWalmartProduct(url, requestId) {
  console.log(`🏪 ${requestId}: Iniciando scraping de Walmart`);
  // Implementación simplificada similar a Amazon
  try {
    const response = await axios.get(url, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    return {
      name: $('h1').first().text().trim() || 'Producto Walmart',
      brand: 'Walmart',
      price: { current: 999.99 },
      image_url: null,
      specs: {},
      store: 'walmart',
      original_url: url,
      note: 'Scraping básico de Walmart - Completa según necesites'
    };
  } catch (error) {
    console.log(`❌ ${requestId}: Error en scrapeWalmartProduct - ${error.message}`);
    throw error;
  }
}

async function scrapeBestBuyProduct(url, requestId) {
  console.log(`🔵 ${requestId}: Iniciando scraping de BestBuy`);
  // Implementación simplificada
  return {
    name: 'Producto BestBuy',
    brand: 'BestBuy',
    price: { current: 899.99 },
    store: 'bestbuy',
    original_url: url,
    note: 'Scraping básico de BestBuy - Completa según necesites'
  };
}

async function scrapeNeweggProduct(url, requestId) {
  console.log(`🥚 ${requestId}: Iniciando scraping de Newegg`);
  // Implementación simplificada
  return {
    name: 'Producto Newegg',
    brand: 'Newegg',
    price: { current: 799.99 },
    store: 'newegg',
    original_url: url,
    note: 'Scraping básico de Newegg - Completa según necesites'
  };
}

module.exports = scrapeController;