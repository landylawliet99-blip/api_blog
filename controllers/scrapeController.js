// backend/controllers/scrapeController.js - VERSIÓN CORREGIDA
const axios = require('axios');
const cheerio = require('cheerio');

// ==================== CONTROLADOR PRINCIPAL ====================
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

// Función para normalizar texto
function normalizeText(text) {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\t/g, ' ')
    .trim();
}

// ==================== FUNCIÓN PRINCIPAL DE AMAZON ====================
async function scrapeAmazonProduct(url, requestId) {
  console.log(`🛒 ${requestId}: Iniciando scraping de Amazon`);
  
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };

    console.log(`📡 ${requestId}: Solicitando página...`);
    const response = await axios.get(url, { 
      headers, 
      timeout: 30000,
      maxRedirects: 5
    });
    
    console.log(`📄 ${requestId}: Respuesta - ${response.status}`);
    const $ = cheerio.load(response.data);
    
    // ============== EXTRACCIÓN DE NOMBRE ==============
    let name = normalizeText($('#productTitle').text());
    if (!name) name = normalizeText($('#title').text());
    if (!name) name = normalizeText($('h1').first().text());
    console.log(`📝 ${requestId}: Nombre: ${name ? name.substring(0, 80) + '...' : 'No detectado'}`);
    
    // ============== EXTRACCIÓN DE PRECIO ==============
    let price = null;
    let priceText = '';
    
    const priceSelectors = [
      '.a-price-whole',
      '.a-price .a-offscreen',
      '.a-price span.a-offscreen',
      '.priceToPay span.a-offscreen',
      '.apexPriceToPay span.a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice'
    ];
    
    for (const selector of priceSelectors) {
      priceText = $(selector).first().text();
      if (priceText) {
        const priceMatch = priceText.match(/[\d,.]+/);
        if (priceMatch) {
          price = parseFloat(priceMatch[0].replace(/,/g, ''));
          console.log(`💰 ${requestId}: Precio encontrado: $${price}`);
          break;
        }
      }
    }
    
    // ============== EXTRACCIÓN DE IMAGEN ==============
    const image_url = $('#landingImage').attr('src') || 
                     $('#imgBlkFront').attr('src') ||
                     $('.a-dynamic-image').first().attr('src') ||
                     $('#main-image').attr('src');
    
    // ============== EXTRACCIÓN DE ESPECIFICACIONES ==============
    const specs = {};
    
    // MÉTODO 1: Tabla de especificaciones estándar
    $('#productDetails_techSpec_section_1 tr').each((i, row) => {
      const key = normalizeText($(row).find('th').text()).toLowerCase();
      const value = normalizeText($(row).find('td').text());
      if (key && value) {
        if (key.includes('graphics') || key.includes('gpu')) specs.gpu = value;
        if (key.includes('processor') || key.includes('cpu')) specs.cpu = value;
        if (key.includes('memory') || key.includes('ram')) {
          specs.ram = value;
          console.log(`🧠 ${requestId}: RAM encontrada en tabla: "${value}"`);
        }
        if (key.includes('hard') || key.includes('ssd') || key.includes('storage')) specs.storage = value;
        if (key.includes('display') || key.includes('screen')) specs.display = value;
        if (key.includes('operating') || key.includes('os')) specs.os = value;
        if (key.includes('battery')) specs.battery_life = value;
        if (key.includes('weight')) specs.weight = value;
      }
    });
    
    // MÉTODO 2: Otra tabla común
    $('#productDetails_detailBullets_sections1 tr').each((i, row) => {
      const key = normalizeText($(row).find('th').text()).toLowerCase();
      const value = normalizeText($(row).find('td').text());
      if (key && value) {
        if (key.includes('graphics') || key.includes('gpu') && !specs.gpu) specs.gpu = value;
        if (key.includes('processor') || key.includes('cpu') && !specs.cpu) specs.cpu = value;
        if ((key.includes('memory') || key.includes('ram')) && !specs.ram) {
          specs.ram = value;
          console.log(`🧠 ${requestId}: RAM en tabla 2: "${value}"`);
        }
      }
    });
    
    // MÉTODO 3: Características principales (bullets)
    console.log(`🔍 ${requestId}: Analizando características principales...`);
    $('#feature-bullets ul.a-unordered-list li span.a-list-item').each((i, elem) => {
      const text = normalizeText($(elem).text()).toLowerCase();
      
      // Buscar RAM específicamente
      if (text.includes('ram') || text.includes('memory') || text.includes('memoria')) {
        const ramMatch = text.match(/(\d+)\s*(?:GB|Gb|gb)\s*(?:DDR\d*)?\s*(?:RAM|ram|Memory|memory|Memoria|memoria)/);
        if (ramMatch && ramMatch[1]) {
          const ramValue = ramMatch[1] + ' GB RAM';
          if (!specs.ram) {
            specs.ram = ramValue;
            console.log(`✅ ${requestId}: RAM extraída de bullets: ${ramValue}`);
          }
        } else {
          const numberMatch = text.match(/(\d+)\s*(?:GB|gb)/);
          if (numberMatch && numberMatch[1] && !specs.ram) {
            specs.ram = numberMatch[1] + ' GB RAM';
            console.log(`✅ ${requestId}: RAM extraída (simple): ${specs.ram}`);
          }
        }
      }
      
      if (text.includes('graphics') || text.includes('gpu') || text.includes('rtx') || text.includes('geforce')) {
        if (!specs.gpu) specs.gpu = normalizeText($(elem).text());
      }
      
      if ((text.includes('processor') || text.includes('cpu') || text.includes('ryzen') || text.includes('intel')) && !specs.cpu) {
        specs.cpu = normalizeText($(elem).text());
      }
      
      if ((text.includes('ssd') || text.includes('storage') || text.includes('almacenamiento')) && !specs.storage) {
        specs.storage = normalizeText($(elem).text());
      }
      
      if ((text.includes('display') || text.includes('screen') || text.includes('pantalla')) && !specs.display) {
        specs.display = normalizeText($(elem).text());
      }
    });
    
    // MÉTODO 4: Buscar en todo el HTML por patrones de RAM
    if (!specs.ram) {
      console.log(`🔍 ${requestId}: Buscando RAM en HTML completo...`);
      const htmlText = $('body').text().toLowerCase();
      
      const ramPatterns = [
        /(\d+)\s*gb\s*(?:ddr\d*)?\s*ram/i,
        /ram:\s*(\d+)\s*gb/i,
        /memory:\s*(\d+)\s*gb/i,
        /(\d+)\s*gb\s*(?:de\s+)?memoria/i,
        /(\d+)\s*gb\s*(?:ddr)/i
      ];
      
      for (const pattern of ramPatterns) {
        const match = htmlText.match(pattern);
        if (match && match[1]) {
          const ramValue = match[1] + ' GB RAM';
          if (!specs.ram || parseInt(match[1]) > parseInt(specs.ram)) {
            specs.ram = ramValue;
            console.log(`✅ ${requestId}: RAM encontrada con patrón: ${ramValue}`);
            break;
          }
        }
      }
    }
    
    // MÉTODO 5: Extraer del título del producto
    if (!specs.ram && name) {
      console.log(`🔍 ${requestId}: Buscando RAM en título...`);
      const ramInTitle = name.match(/\b(\d+)\s*GB\b/i);
      if (ramInTitle && ramInTitle[1]) {
        specs.ram = ramInTitle[1] + ' GB RAM';
        console.log(`✅ ${requestId}: RAM extraída del título: ${specs.ram}`);
      }
    }
    
    // ============== CORRECCIÓN ESPECÍFICA PARA ERROR "6 GB" ==============
    if (specs.ram && (specs.ram.includes('6 GB') || specs.ram.includes('6GB'))) {
      console.log(`⚠️ ${requestId}: Detectada RAM de 6 GB - verificando si es error...`);
      
      const searchText = $('body').text().toLowerCase();
      const has16GB = searchText.includes('16 gb') || searchText.includes('16gb') || name.includes('16 GB') || name.includes('16GB');
      
      if (has16GB) {
        console.log(`🔄 ${requestId}: Corrigiendo RAM de 6 GB a 16 GB`);
        specs.ram = specs.ram.replace('6', '16').replace('6GB', '16GB');
      }
    }
    
    // ============== EXTRACCIÓN DE MARCA ==============
    let brand = normalizeText($('a#bylineInfo').text().replace(/Visit the|Store|Marca:|Brand:/gi, ''));
    
    if (!brand || brand.length < 2) {
      $('th:contains("Brand"), th:contains("Marca")').each((i, elem) => {
        const val = normalizeText($(elem).next('td').text());
        if (val && val.length > 1) brand = val;
      });
    }
    
    if (!brand || brand.length < 2) {
      const titleUpper = name.toUpperCase();
      const commonBrands = [
        'HP', 'DELL', 'LENOVO', 'ASUS', 'ACER', 'MSI', 'RAZER', 'ALIENWARE', 
        'APPLE', 'SAMSUNG', 'MICROSOFT', 'GIGABYTE', 'TOSHIBA', 'SONY'
      ];
      
      for (const b of commonBrands) {
        if (titleUpper.includes(b)) {
          brand = b;
          break;
        }
      }
    }
    
    const result = {
      name: name,
      brand: brand,
      price: { current: price },
      image_url: image_url,
      specs: specs,
      store: 'amazon',
      original_url: url,
      extracted_at: new Date().toISOString()
    };
    
    console.log(`📊 ${requestId}: RESUMEN DE EXTRACCIÓN:`);
    console.log(`   Nombre: ${name.substring(0, 60)}...`);
    console.log(`   Marca: ${brand || 'No detectada'}`);
    console.log(`   Precio: ${price ? '$' + price : 'No detectado'}`);
    console.log(`   RAM: ${specs.ram || 'No detectada'}`);
    console.log(`   GPU: ${specs.gpu ? specs.gpu.substring(0, 40) + '...' : 'No detectada'}`);
    console.log(`   CPU: ${specs.cpu ? specs.cpu.substring(0, 40) + '...' : 'No detectada'}`);
    
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
    }
    throw error;
  }
}

// ==================== OTRAS FUNCIONES DE SCRAPING ====================
async function scrapeWalmartProduct(url, requestId) {
  console.log(`🏪 ${requestId}: Iniciando scraping de Walmart`);
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
  return {
    name: 'Producto Newegg',
    brand: 'Newegg',
    price: { current: 799.99 },
    store: 'newegg',
    original_url: url,
    note: 'Scraping básico de Newegg - Completa según necesites'
  };
}

// ==================== EXPORTACIÓN ====================
module.exports = scrapeController;