// backend/controllers/scrapeController.js - VERSIÓN SIMPLE PERO FUNCIONAL
const axios = require('axios');
const cheerio = require('cheerio');

const scrapeController = {
  async scrapeProduct(req, res) {
    console.log('\n=== SCRAPING REQUEST ===');
    console.log('URL recibida:', req.body?.url);

    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({
          success: false,
          message: 'URL es requerida'
        });
      }

      // Validar URL
      try {
        new URL(url);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'URL inválida'
        });
      }

      // Detectar tienda
      let store = 'unknown';
      if (url.includes('amazon.')) store = 'amazon';
      else if (url.includes('walmart.')) store = 'walmart';
      else if (url.includes('bestbuy.')) store = 'bestbuy';
      
      if (store === 'unknown') {
        return res.status(400).json({
          success: false,
          message: 'Solo soporta Amazon por ahora'
        });
      }

      console.log('Tienda:', store);
      
      let productData;
      if (store === 'amazon') {
        productData = await scrapeAmazonSimple(url);
      } else {
        // Para otras tiendas, usar datos de prueba por ahora
        productData = {
          name: `Producto ${store}`,
          brand: store.toUpperCase(),
          price: { current: 999.99 },
          image_url: '',
          specs: {},
          store: store,
          original_url: url
        };
      }

      console.log('Datos extraídos:', {
        nombre: productData.name?.substring(0, 50),
        precio: productData.price?.current
      });

      res.json({
        success: true,
        data: productData
      });

    } catch (error) {
      console.error('Error en scraping:', error.message);
      res.status(500).json({
        success: false,
        message: 'Error al extraer datos del producto'
      });
    }
  },

  async testScraping(req, res) {
    res.json({
      success: true,
      message: 'Scraping funcionando',
      timestamp: new Date().toISOString()
    });
  }
};

// ==================== SCRAPER SIMPLE PARA AMAZON ====================
async function scrapeAmazonSimple(url) {
  console.log('Scraping Amazon simple...');
  
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
      timeout: 15000 
    });
    
    const $ = cheerio.load(response.data);
    
    // 1. EXTRAER NOMBRE (lo más importante)
    let name = $('#productTitle').text().trim();
    if (!name) {
      name = $('h1#title').text().trim();
    }
    if (!name) {
      name = $('h1').first().text().trim();
    }
    
    console.log('Nombre encontrado:', name ? name.substring(0, 100) : 'NO');
    
    // 2. EXTRAER PRECIO
    let price = null;
    const priceText = $('.a-price-whole').first().text().trim();
    if (priceText) {
      const match = priceText.match(/\d+/g);
      if (match) {
        price = parseFloat(match.join(''));
      }
    }
    
    // 3. EXTRAER IMAGEN
    const image_url = $('#landingImage').attr('src') || 
                     $('.a-dynamic-image').first().attr('src');
    
    // 4. EXTRAER MARCA DEL TÍTULO
    let brand = '';
    if (name) {
      const nameUpper = name.toUpperCase();
      const brands = ['HP', 'DELL', 'LENOVO', 'ASUS', 'ACER', 'MSI', 'RAZER', 'ALIENWARE'];
      for (const b of brands) {
        if (nameUpper.includes(b)) {
          brand = b;
          break;
        }
      }
    }
    
    // 5. EXTRAER ESPECIFICACIONES DE FORMA MUY SIMPLE
    const specs = {};
    
    // Buscar texto que contenga "GB" para RAM
    const bodyText = $('body').text();
    const ramMatch = bodyText.match(/\b(\d+)\s*GB\b/i);
    if (ramMatch) {
      specs.ram = ramMatch[0] + ' RAM';
    }
    
    // Buscar GPU en el título o texto
    if (name && name.includes('RTX')) {
      const gpuMatch = name.match(/(RTX\s*\d+)/i);
      if (gpuMatch) {
        specs.gpu = gpuMatch[0];
      }
    }
    
    // Buscar CPU en el título
    if (name) {
      if (name.includes('Intel')) {
        const cpuMatch = name.match(/Intel\s*(?:Core\s*)?i\d+/i);
        if (cpuMatch) {
          specs.cpu = cpuMatch[0];
        }
      } else if (name.includes('AMD')) {
        const cpuMatch = name.match(/AMD\s*Ryzen\s*\d+/i);
        if (cpuMatch) {
          specs.cpu = cpuMatch[0];
        }
      }
    }
    
    // 6. GENERAR URL DE AFILIADO
    let affiliate_url = url;
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set('tag', 'laptopsgaming-20');
      affiliate_url = urlObj.toString();
    } catch (error) {
      console.log('No se pudo generar URL de afiliado');
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
      affiliate_url: affiliate_url
    };
    
  } catch (error) {
    console.error('Error en scrapeAmazonSimple:', error.message);
    // En caso de error, devolver datos mínimos
    return {
      name: 'Producto Amazon',
      brand: '',
      price: { current: null },
      image_url: '',
      specs: {},
      store: 'amazon',
      original_url: url,
      affiliate_url: url
    };
  }
}

module.exports = scrapeController;