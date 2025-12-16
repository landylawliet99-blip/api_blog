// backend/controllers/scrapeController.js - VERSIÓN COMPLETA Y MEJORADA
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
          message: `Tienda no soportada. Soporta: Amazon, Walmart, BestBuy, Newegg, Mercado Libre, eBay`
        });
      }

      console.log(`🌐 ${requestId}: Iniciando scraping para ${store}...`);
      let productData;
      
      try {
        // Usar la función genérica primero, luego específica si es necesario
        productData = await genericScraper(url, requestId, store);
        
        // Si el scraper genérico no capturó suficientes datos, usar el específico
        if (store === 'amazon' && (!productData.specs || Object.keys(productData.specs).length < 3)) {
          console.log(`⚠️ ${requestId}: Scraper genérico capturó pocos datos, usando scraper específico de Amazon`);
          productData = await scrapeAmazonProduct(url, requestId);
        }
        
      } catch (scrapeError) {
        console.log(`❌ ${requestId}: Error en scraping - ${scrapeError.message}`);
        throw scrapeError;
      }

      // Validar datos mínimos
      if (!productData || !productData.name) {
        console.log(`⚠️ ${requestId}: Scraping completado pero datos incompletos`);
        productData = productData || {};
        productData.name = productData.name || 'Producto sin nombre';
      }

      console.log(`✅ ${requestId}: Scraping exitoso`);
      console.log(`📦 ${requestId}: Producto - ${productData.name.substring(0, 60)}...`);
      console.log(`🏷️ ${requestId}: Marca - ${productData.brand || 'No detectada'}`);
      console.log(`💰 ${requestId}: Precio - $${productData.price?.current || 'No detectado'}`);
      
      if (productData.specs) {
        console.log(`⚙️ ${requestId}: Especificaciones capturadas: ${Object.keys(productData.specs).length}`);
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
      },
      supportedStores: ['amazon', 'walmart', 'bestbuy', 'newegg', 'mercadolibre', 'ebay']
    });
  }
};

// ==================== FUNCIONES AUXILIARES GENÉRICAS ====================

function detectStore(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('amazon.')) return 'amazon';
    if (hostname.includes('walmart.')) return 'walmart';
    if (hostname.includes('bestbuy.')) return 'bestbuy';
    if (hostname.includes('newegg.')) return 'newegg';
    if (hostname.includes('mercadolibre') || hostname.includes('mercadolibre')) return 'mercadolibre';
    if (hostname.includes('ebay.')) return 'ebay';
    return 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

function normalizeText(text) {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\t/g, ' ')
    .trim();
}

function extractPrice(text) {
  if (!text) return null;
  const match = text.match(/[\d,]+\.?\d*/);
  return match ? parseFloat(match[0].replace(/,/g, '')) : null;
}

function extractSpecFromText(text, keywords) {
  if (!text) return null;
  const lowerText = text.toLowerCase();
  for (const keyword of keywords) {
    if (lowerText.includes(keyword)) {
      return text;
    }
  }
  return null;
}

function cleanSpecValue(value) {
  if (!value) return '';
  const cleaned = normalizeText(value);
  // Eliminar valores incorrectos comunes
  if (cleaned.length > 150 || 
      cleaned.includes('RAM y almacenamiento') ||
      cleaned.includes('Esta computadora viene con') ||
      cleaned.includes('Click here for')) {
    return '';
  }
  return cleaned;
}

// ==================== SCRAPER GENÉRICO ====================
async function genericScraper(url, requestId, store) {
  console.log(`🌐 ${requestId}: Usando scraper genérico para ${store}`);
  
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    };

    const response = await axios.get(url, { 
      headers, 
      timeout: 25000,
      maxRedirects: 5
    });
    
    const $ = cheerio.load(response.data);
    
    // Extraer nombre - múltiples selectores genéricos
    let name = '';
    const nameSelectors = [
      'h1', 
      '.product-title', 
      '.product-name', 
      '[itemprop="name"]',
      '.title',
      '#productTitle',
      '#title'
    ];
    
    for (const selector of nameSelectors) {
      const element = $(selector).first();
      if (element.length) {
        name = normalizeText(element.text());
        if (name && name.length > 3) {
          console.log(`📝 ${requestId}: Nombre encontrado con selector "${selector}"`);
          break;
        }
      }
    }
    
    // Extraer precio - múltiples selectores genéricos
    let price = null;
    const priceSelectors = [
      '.price', 
      '.product-price', 
      '[itemprop="price"]',
      '.a-price-whole',
      '.a-price .a-offscreen',
      '.current-price',
      '.sale-price'
    ];
    
    for (const selector of priceSelectors) {
      const element = $(selector).first();
      if (element.length) {
        const priceText = normalizeText(element.text());
        price = extractPrice(priceText);
        if (price) {
          console.log(`💰 ${requestId}: Precio encontrado con selector "${selector}": $${price}`);
          break;
        }
      }
    }
    
    // Extraer imagen
    let image_url = '';
    const imageSelectors = [
      'img[itemprop="image"]',
      '.product-image img',
      '.main-image img',
      '#landingImage',
      '.a-dynamic-image'
    ];
    
    for (const selector of imageSelectors) {
      const element = $(selector).first();
      if (element.length && element.attr('src')) {
        image_url = element.attr('src');
        console.log(`🖼️ ${requestId}: Imagen encontrada con selector "${selector}"`);
        break;
      }
    }
    
    // Extraer especificaciones genéricas
    const specs = {};
    
    // Buscar en todas las tablas
    $('table').each((i, table) => {
      $(table).find('tr').each((j, row) => {
        const key = normalizeText($(row).find('th, td:first-child').text()).toLowerCase();
        const value = normalizeText($(row).find('td:last-child').text());
        
        if (key && value && key.length < 50 && value.length < 100) {
          // Asignar según palabras clave
          if (key.includes('ram') || key.includes('memory') || key.includes('memoria')) {
            specs.ram = cleanSpecValue(value);
          } else if (key.includes('gpu') || key.includes('graphics') || key.includes('video')) {
            specs.gpu = cleanSpecValue(value);
          } else if (key.includes('cpu') || key.includes('processor') || key.includes('procesador')) {
            specs.cpu = cleanSpecValue(value);
          } else if (key.includes('ssd') || key.includes('hdd') || key.includes('storage') || key.includes('almacenamiento')) {
            specs.storage = cleanSpecValue(value);
          } else if (key.includes('display') || key.includes('screen') || key.includes('pantalla')) {
            specs.display = cleanSpecValue(value);
          } else if (key.includes('os') || key.includes('operating') || key.includes('windows')) {
            specs.os = cleanSpecValue(value);
          }
        }
      });
    });
    
    // Buscar en listas
    $('ul, ol').each((i, list) => {
      $(list).find('li').each((j, item) => {
        const text = normalizeText($(item).text());
        if (text.length > 10 && text.length < 150) {
          // Extraer RAM
          if (!specs.ram && (text.toLowerCase().includes('ram') || text.toLowerCase().includes('gb memory'))) {
            const ramMatch = text.match(/\d+\s*GB\s*(?:DDR\d*)?/i);
            if (ramMatch) {
              specs.ram = ramMatch[0] + ' RAM';
            }
          }
          
          // Extraer GPU
          if (!specs.gpu && text.toLowerCase().includes('nvidia')) {
            const gpuMatch = text.match(/(RTX|GTX|GeForce)\s*\d+/i);
            if (gpuMatch) {
              specs.gpu = gpuMatch[0];
            }
          }
          
          // Extraer CPU
          if (!specs.cpu && text.toLowerCase().includes('intel')) {
            const cpuMatch = text.match(/Intel\s*(?:Core\s*)?i\d+/i);
            if (cpuMatch) {
              specs.cpu = cpuMatch[0];
            }
          }
        }
      });
    });
    
    // Extraer marca del nombre o título
    let brand = '';
    const commonBrands = ['HP', 'DELL', 'LENOVO', 'ASUS', 'ACER', 'MSI', 'RAZER', 'ALIENWARE', 'APPLE', 'SAMSUNG'];
    
    if (name) {
      const nameUpper = name.toUpperCase();
      for (const b of commonBrands) {
        if (nameUpper.includes(b)) {
          brand = b;
          break;
        }
      }
    }
    
    // Si no se encontró marca, buscar en metadatos
    if (!brand) {
      const brandMeta = $('meta[property="og:brand"]').attr('content') || 
                       $('meta[itemprop="brand"]').attr('content');
      if (brandMeta) {
        brand = normalizeText(brandMeta);
      }
    }
    
    // Generar URL de afiliado si es Amazon
    let affiliate_url = url;
    if (store === 'amazon') {
      try {
        const urlObj = new URL(url);
        urlObj.searchParams.set('tag', 'laptopsgaming-20');
        affiliate_url = urlObj.toString();
      } catch (error) {
        console.log(`⚠️ ${requestId}: No se pudo generar URL de afiliado`);
      }
    }
    
    return {
      name: name || `Producto ${store}`,
      brand: brand || '',
      price: { current: price },
      image_url: image_url || '',
      specs: {
        gpu: specs.gpu || '',
        cpu: specs.cpu || '',
        ram: specs.ram || '',
        storage: specs.storage || '',
        display: specs.display || '',
        os: specs.os || '',
        battery_life: specs.battery_life || '',
        weight: specs.weight || '',
        ports: specs.ports || '',
        wifi: specs.wifi || ''
      },
      store: store,
      original_url: url,
      affiliate_url: affiliate_url,
      extracted_at: new Date().toISOString()
    };
    
  } catch (error) {
    console.log(`❌ ${requestId}: Error en scraper genérico - ${error.message}`);
    throw error;
  }
}

// ==================== SCRAPER ESPECÍFICO PARA AMAZON ====================
async function scrapeAmazonProduct(url, requestId) {
  console.log(`🛒 ${requestId}: Usando scraper específico de Amazon`);
  
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };

    const response = await axios.get(url, { 
      headers, 
      timeout: 30000,
      maxRedirects: 5
    });
    
    const $ = cheerio.load(response.data);
    
    // Extraer nombre
    let name = normalizeText($('#productTitle').text());
    if (!name) name = normalizeText($('#title').text());
    if (!name) name = normalizeText($('h1').first().text());
    
    // Extraer precio
    let price = null;
    const priceSelectors = [
      '.a-price-whole',
      '.a-price .a-offscreen',
      '.priceToPay span.a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice'
    ];
    
    for (const selector of priceSelectors) {
      const priceText = $(selector).first().text();
      if (priceText) {
        price = extractPrice(priceText);
        if (price) break;
      }
    }
    
    // Extraer imagen
    const image_url = $('#landingImage').attr('src') || 
                     $('.a-dynamic-image').first().attr('src');
    
    // Extraer especificaciones INTELIGENTEMENTE
    const specs = {};
    const allText = $('body').text().toLowerCase();
    
    // Buscar RAM con múltiples métodos
    const ramPatterns = [
      /(\d+)\s*gb\s*(?:ddr\d*)?\s*ram/i,
      /ram:\s*(\d+)\s*gb/i,
      /memory:\s*(\d+)\s*gb/i,
      /(\d+)\s*gb\s*(?:de\s+)?memoria/i
    ];
    
    for (const pattern of ramPatterns) {
      const match = allText.match(pattern);
      if (match) {
        specs.ram = match[1] + ' GB RAM';
        break;
      }
    }
    
    // Buscar GPU
    const gpuPatterns = [
      /(rtx\s*\d+)/i,
      /(geforce\s*\w+\s*rtx\s*\d+)/i,
      /(nvidia\s*geforce\s*rtx\s*\d+)/i,
      /(radeon\s*\w+\s*\d+)/i
    ];
    
    for (const pattern of gpuPatterns) {
      const match = allText.match(pattern);
      if (match) {
        specs.gpu = match[0].toUpperCase();
        break;
      }
    }
    
    // Buscar CPU
    const cpuPatterns = [
      /(intel\s*core\s*i\d+\s*\w*)/i,
      /(amd\s*ryzen\s*\d+\s*\w*)/i,
      /(processor:\s*.+)/i
    ];
    
    for (const pattern of cpuPatterns) {
      const match = allText.match(pattern);
      if (match) {
        specs.cpu = match[0];
        break;
      }
    }
    
    // Buscar en las características principales
    $('#feature-bullets ul.a-unordered-list li span.a-list-item').each((i, elem) => {
      const text = normalizeText($(elem).text());
      const lowerText = text.toLowerCase();
      
      if (lowerText.includes('ssd') && !specs.storage) {
        specs.storage = text;
      }
      
      if ((lowerText.includes('display') || lowerText.includes('screen') || lowerText.includes('pantalla')) && !specs.display) {
        specs.display = text;
      }
      
      if (lowerText.includes('windows') && !specs.os) {
        specs.os = text;
      }
    });
    
    // Extraer marca
    let brand = normalizeText($('a#bylineInfo').text().replace(/Visit the|Store|Marca:|Brand:/gi, ''));
    if (!brand || brand.length < 2) {
      const titleUpper = name.toUpperCase();
      const commonBrands = ['HP', 'DELL', 'LENOVO', 'ASUS', 'ACER', 'MSI', 'RAZER', 'ALIENWARE'];
      for (const b of commonBrands) {
        if (titleUpper.includes(b)) {
          brand = b;
          break;
        }
      }
    }
    
    // Generar URL de afiliado
    let affiliate_url = url;
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set('tag', 'laptopsgaming-20');
      affiliate_url = urlObj.toString();
    } catch (error) {
      console.log(`⚠️ ${requestId}: No se pudo generar URL de afiliado`);
    }
    
    return {
      name: name || 'Producto Amazon',
      brand: brand || '',
      price: { current: price },
      image_url: image_url || '',
      specs: {
        gpu: specs.gpu || '',
        cpu: specs.cpu || '',
        ram: specs.ram || '',
        storage: specs.storage || '',
        display: specs.display || '',
        os: specs.os || '',
        battery_life: specs.battery_life || '',
        weight: specs.weight || '',
        ports: specs.ports || '',
        wifi: specs.wifi || ''
      },
      store: 'amazon',
      original_url: url,
      affiliate_url: affiliate_url,
      extracted_at: new Date().toISOString()
    };
    
  } catch (error) {
    console.log(`❌ ${requestId}: Error en scraper específico de Amazon - ${error.message}`);
    throw error;
  }
}

// ==================== SCRAPERS PARA OTRAS TIENDAS ====================

async function scrapeWalmartProduct(url, requestId) {
  console.log(`🏪 ${requestId}: Scraping Walmart`);
  try {
    // Primero intentar con scraper genérico
    const genericData = await genericScraper(url, requestId, 'walmart');
    
    // Si el scraper genérico no capturó suficiente, usar datos por defecto
    if (!genericData.price.current || !genericData.image_url) {
      return {
        ...genericData,
        price: { current: 999.99 },
        note: 'Datos básicos de Walmart - Puede requerir configuración adicional'
      };
    }
    
    return genericData;
  } catch (error) {
    console.log(`❌ ${requestId}: Error en scrapeWalmartProduct - ${error.message}`);
    throw error;
  }
}

async function scrapeBestBuyProduct(url, requestId) {
  console.log(`🔵 ${requestId}: Scraping BestBuy`);
  try {
    const genericData = await genericScraper(url, requestId, 'bestbuy');
    return genericData;
  } catch (error) {
    console.log(`❌ ${requestId}: Error en scrapeBestBuyProduct - ${error.message}`);
    throw error;
  }
}

async function scrapeNeweggProduct(url, requestId) {
  console.log(`🥚 ${requestId}: Scraping Newegg`);
  try {
    const genericData = await genericScraper(url, requestId, 'newegg');
    return genericData;
  } catch (error) {
    console.log(`❌ ${requestId}: Error en scrapeNeweggProduct - ${error.message}`);
    throw error;
  }
}

async function scrapeMercadoLibreProduct(url, requestId) {
  console.log(`🛒 ${requestId}: Scraping Mercado Libre`);
  try {
    const genericData = await genericScraper(url, requestId, 'mercadolibre');
    return genericData;
  } catch (error) {
    console.log(`❌ ${requestId}: Error en scrapeMercadoLibreProduct - ${error.message}`);
    throw error;
  }
}

async function scrapeEbayProduct(url, requestId) {
  console.log(`💰 ${requestId}: Scraping eBay`);
  try {
    const genericData = await genericScraper(url, requestId, 'ebay');
    return genericData;
  } catch (error) {
    console.log(`❌ ${requestId}: Error en scrapeEbayProduct - ${error.message}`);
    throw error;
  }
}

// ==================== EXPORTACIÓN ====================
module.exports = scrapeController;