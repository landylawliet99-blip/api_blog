// backend/controllers/scrapeController.js - FUNCIÓN SCRAPEAMAZONPRODUCT MEJORADA
async function scrapeAmazonProduct(url, requestId) {
  console.log(`🛒 ${requestId}: Iniciando scraping de Amazon`);
  
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    };

    console.log(`📡 ${requestId}: Solicitando página...`);
    const response = await axios.get(url, { 
      headers, 
      timeout: 30000,
      maxRedirects: 5
    });
    
    console.log(`📄 ${requestId}: Respuesta - ${response.status}`);
    const $ = cheerio.load(response.data);
    
    // ============== DEBUG: Ver estructura de la página ==============
    console.log(`🔍 ${requestId}: === ANALIZANDO ESTRUCTURA ===`);
    console.log(`📊 ${requestId}: Título encontrado: ${$('title').text().substring(0, 80)}...`);
    
    // ============== EXTRACCIÓN DE NOMBRE ==============
    let name = $('#productTitle').text().trim();
    if (!name) name = $('#title').text().trim();
    if (!name) name = $('h1#title').text().trim();
    if (!name) name = $('h1.a-size-large').text().trim();
    if (!name) name = $('h1').first().text().trim();
    
    console.log(`📝 ${requestId}: Nombre extraído: ${name ? name.substring(0, 100) : 'NO ENCONTRADO'}`);
    
    // ============== EXTRACCIÓN DE PRECIO ==============
    let price = null;
    const priceSelectors = [
      '.a-price-whole',
      '.a-price .a-offscreen',
      '.a-price span.a-offscreen',
      '.priceToPay span.a-offscreen',
      '.apexPriceToPay span.a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '#price_inside_buybox',
      '.a-color-price'
    ];
    
    for (const selector of priceSelectors) {
      const priceElement = $(selector).first();
      if (priceElement.length) {
        const priceText = priceElement.text().trim();
        if (priceText) {
          const priceMatch = priceText.match(/[\d,]+\.?\d*/);
          if (priceMatch) {
            price = parseFloat(priceMatch[0].replace(/,/g, ''));
            console.log(`💰 ${requestId}: Precio encontrado con selector "${selector}": $${price}`);
            break;
          }
        }
      }
    }
    
    // ============== EXTRACCIÓN DE IMAGEN ==============
    let image_url = $('#landingImage').attr('src') || 
                   $('#imgBlkFront').attr('src') ||
                   $('.a-dynamic-image').first().attr('src') ||
                   $('#main-image').attr('src') ||
                   $('.a-dynamic-image[data-old-hires]').attr('data-old-hires');
    
    // ============== EXTRACCIÓN DE MARCA ==============
    let brand = '';
    
    // 1. Buscar en el byline de Amazon
    brand = $('a#bylineInfo').text().replace(/Visit the|Store|Marca:|Brand:|Tienda de/gi, '').trim();
    
    // 2. Buscar en la tabla de detalles técnicos
    if (!brand || brand.length < 2) {
      $('th:contains("Brand"), th:contains("Marca"), th:contains("Fabricante")').each((i, elem) => {
        const val = $(elem).next('td').text().trim();
        if (val && val.length > 1) brand = val;
      });
    }
    
    // 3. Buscar en el título
    if (!brand || brand.length < 2) {
      const titleUpper = name.toUpperCase();
      const commonBrands = [
        'MSI', 'HP', 'DELL', 'LENOVO', 'ASUS', 'ACER', 'RAZER', 'ALIENWARE', 
        'APPLE', 'SAMSUNG', 'MICROSOFT', 'GIGABYTE', 'TOSHIBA', 'SONY', 'LG'
      ];
      
      for (const b of commonBrands) {
        if (titleUpper.includes(b)) {
          brand = b;
          break;
        }
      }
    }
    
    // ============== EXTRACCIÓN COMPLETA DE ESPECIFICACIONES ==============
    const specs = {};
    
    console.log(`🔍 ${requestId}: Buscando especificaciones...`);
    
    // MÉTODO 1: Buscar en TODAS las tablas de especificaciones
    $('table').each((tableIndex, table) => {
      $(table).find('tr').each((rowIndex, row) => {
        const key = $(row).find('th, td.label, td:first-child').text().trim().toLowerCase();
        const value = $(row).find('td:last-child, td.value').text().trim();
        
        if (key && value && key.length < 100) { // Evitar keys demasiado largas
          // RAM/Memoria
          if ((key.includes('ram') || key.includes('memory') || key.includes('memoria')) && !specs.ram) {
            specs.ram = value;
            console.log(`🧠 ${requestId}: RAM encontrada en tabla ${tableIndex}: "${value}"`);
          }
          
          // GPU/Graphics
          if ((key.includes('graphics') || key.includes('gpu') || key.includes('tarjeta gráfica')) && !specs.gpu) {
            specs.gpu = value;
            console.log(`🎮 ${requestId}: GPU encontrada: "${value}"`);
          }
          
          // CPU/Processor
          if ((key.includes('processor') || key.includes('cpu') || key.includes('procesador')) && !specs.cpu) {
            specs.cpu = value;
            console.log(`⚡ ${requestId}: CPU encontrada: "${value}"`);
          }
          
          // Storage/Almacenamiento
          if ((key.includes('ssd') || key.includes('hdd') || key.includes('storage') || key.includes('almacenamiento') || key.includes('hard drive')) && !specs.storage) {
            specs.storage = value;
            console.log(`💾 ${requestId}: Almacenamiento encontrado: "${value}"`);
          }
          
          // Display/Pantalla
          if ((key.includes('display') || key.includes('screen') || key.includes('pantalla') || key.includes('monitor')) && !specs.display) {
            specs.display = value;
            console.log(`🖥️ ${requestId}: Pantalla encontrada: "${value}"`);
          }
          
          // OS/Sistema Operativo
          if ((key.includes('os') || key.includes('operating system') || key.includes('sistema operativo') || key.includes('windows')) && !specs.os) {
            specs.os = value;
            console.log(`🪟 ${requestId}: Sistema operativo encontrado: "${value}"`);
          }
          
          // Battery/Batería
          if ((key.includes('battery') || key.includes('batería') || key.includes('bateria')) && !specs.battery_life) {
            specs.battery_life = value;
          }
          
          // Weight/Peso
          if ((key.includes('weight') || key.includes('peso')) && !specs.weight) {
            specs.weight = value;
          }
        }
      });
    });
    
    // MÉTODO 2: Buscar en listas de características (bullet points)
    console.log(`🔍 ${requestId}: Analizando características principales...`);
    $('#feature-bullets ul.a-unordered-list li, .a-unordered-list.a-vertical.a-spacing-mini li').each((i, elem) => {
      const text = $(elem).text().trim();
      const textLower = text.toLowerCase();
      
      // Extraer RAM de los bullets
      if (!specs.ram && (textLower.includes('ram') || textLower.includes('memory') || textLower.includes('memoria'))) {
        const ramMatch = text.match(/(\d+)\s*(?:GB|Gb|gb)\s*(?:DDR\d*)?/i);
        if (ramMatch) {
          specs.ram = ramMatch[0];
          console.log(`✅ ${requestId}: RAM extraída de bullets: "${specs.ram}"`);
        }
      }
      
      // Extraer GPU
      if (!specs.gpu && (textLower.includes('rtx') || textLower.includes('geforce') || textLower.includes('graphics') || textLower.includes('gpu'))) {
        specs.gpu = text;
        console.log(`✅ ${requestId}: GPU extraída de bullets: "${specs.gpu.substring(0, 50)}..."`);
      }
      
      // Extraer CPU
      if (!specs.cpu && (textLower.includes('intel') || textLower.includes('amd') || textLower.includes('ryzen') || textLower.includes('core i'))) {
        specs.cpu = text;
        console.log(`✅ ${requestId}: CPU extraída de bullets: "${specs.cpu.substring(0, 50)}..."`);
      }
      
      // Extraer almacenamiento
      if (!specs.storage && (textLower.includes('ssd') || textLower.includes('tb') || textLower.includes('gb') || textLower.includes('storage'))) {
        const storageMatch = text.match(/(\d+)\s*(?:TB|GB|tb|gb)\s*(?:SSD|HDD|PCIe)/i);
        if (storageMatch) {
          specs.storage = storageMatch[0];
          console.log(`✅ ${requestId}: Almacenamiento extraído: "${specs.storage}"`);
        }
      }
      
      // Extraer pantalla
      if (!specs.display && (textLower.includes('display') || textLower.includes('screen') || textLower.includes('pantalla') || textLower.includes('"') || textLower.includes('pulgadas') || textLower.includes('hz'))) {
        specs.display = text;
        console.log(`✅ ${requestId}: Pantalla extraída: "${specs.display.substring(0, 50)}..."`);
      }
      
      // Extraer sistema operativo
      if (!specs.os && (textLower.includes('windows') || textLower.includes('operating system'))) {
        specs.os = text;
      }
    });
    
    // MÉTODO 3: Buscar en el texto completo del producto
    if (!specs.ram || !specs.gpu || !specs.cpu) {
      const productDescription = $('div#productDescription, #feature-bullets').text().toLowerCase();
      
      // Buscar RAM
      if (!specs.ram) {
        const ramPatterns = [
          /(\d+)\s*gb\s*(?:ddr\d*)?\s*ram/i,
          /ram:\s*(\d+)\s*gb/i,
          /(\d+)\s*gb\s*(?:de\s+)?memoria/i
        ];
        
        for (const pattern of ramPatterns) {
          const match = productDescription.match(pattern);
          if (match && match[1]) {
            specs.ram = match[1] + ' GB RAM';
            console.log(`🔍 ${requestId}: RAM encontrada en descripción: ${specs.ram}`);
            break;
          }
        }
      }
      
      // Buscar GPU
      if (!specs.gpu) {
        const gpuPatterns = [
          /(rtx\s*\d+\s*\w*)/i,
          /(geforce\s*\w*\s*rtx\s*\d+)/i,
          /(nvidia\s*\w*\s*\d+)/i
        ];
        
        for (const pattern of gpuPatterns) {
          const match = productDescription.match(pattern);
          if (match) {
            specs.gpu = match[0].toUpperCase();
            console.log(`🔍 ${requestId}: GPU encontrada en descripción: ${specs.gpu}`);
            break;
          }
        }
      }
    }
    
    // MÉTODO 4: Extraer del título si todo lo demás falla
    if (name) {
      if (!specs.ram) {
        const ramMatch = name.match(/\b(\d+)\s*GB\b/i);
        if (ramMatch) {
          specs.ram = ramMatch[0];
          console.log(`🔍 ${requestId}: RAM extraída del título: ${specs.ram}`);
        }
      }
      
      if (!specs.gpu) {
        const gpuMatch = name.match(/(RTX\s*\d+|GTX\s*\d+|GeForce\s*\w+)/i);
        if (gpuMatch) {
          specs.gpu = gpuMatch[0];
          console.log(`🔍 ${requestId}: GPU extraída del título: ${specs.gpu}`);
        }
      }
      
      if (!specs.cpu) {
        const cpuMatch = name.match(/(Intel\s*Core\s*i\d+|AMD\s*Ryzen\s*\d+)/i);
        if (cpuMatch) {
          specs.cpu = cpuMatch[0];
          console.log(`🔍 ${requestId}: CPU extraída del título: ${specs.cpu}`);
        }
      }
    }
    
    // ============== CORRECCIÓN DE DATOS COMUNES ==============
    // Corregir RAM si es 8GB pero debería ser 16GB
    if (specs.ram && (specs.ram.includes('8 GB') || specs.ram.includes('8GB'))) {
      // Verificar si en el nombre hay referencia a 16GB
      if (name && (name.includes('16GB') || name.includes('16 GB'))) {
        specs.ram = specs.ram.replace('8', '16').replace('8GB', '16GB');
        console.log(`🔄 ${requestId}: RAM corregida de 8GB a 16GB basado en título`);
      }
    }
    
    // ============== CONSTRUIR RESULTADO ==============
    const result = {
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
      extracted_at: new Date().toISOString()
    };
    
    // ============== LOGGING DETALLADO ==============
    console.log(`📊 ${requestId}: === RESUMEN FINAL ===`);
    console.log(`   Nombre: ${result.name.substring(0, 80)}...`);
    console.log(`   Marca: ${result.brand || 'No detectada'}`);
    console.log(`   Precio: ${price ? '$' + price : 'No detectado'}`);
    console.log(`   RAM: ${result.specs.ram || 'No detectada'}`);
    console.log(`   GPU: ${result.specs.gpu || 'No detectada'}`);
    console.log(`   CPU: ${result.specs.cpu || 'No detectada'}`);
    console.log(`   Almacenamiento: ${result.specs.storage || 'No detectado'}`);
    console.log(`   Pantalla: ${result.specs.display || 'No detectada'}`);
    
    // ============== GENERAR URL DE AFILIADO ==============
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