// backend/controllers/sitemapController.js 
const supabase = require('../config/supabaseClient');
const { create } = require('xmlbuilder2');

// Configuración del dominio - PARA DESARROLLO LOCAL
const DOMAIN = 'https://blog-laptops-gaming.onrender.com';


const sitemapController = {
  async generateSitemap(req, res) {
    try {
      const { data: articles, error } = await supabase
        .from('articles')
        .select('slug, updated_at')
        .eq('status', 'published')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const root = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('urlset', { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' });

      // URL principal (home)
      root.ele('url')
        .ele('loc').txt(`${DOMAIN}/`).up()
        .ele('lastmod').txt(new Date().toISOString().split('T')[0]).up()
        .ele('changefreq').txt('daily').up()
        .ele('priority').txt('1.0').up();

      // URLs de artículos
      articles.forEach(article => {
        root.ele('url')
          .ele('loc').txt(`${DOMAIN}/blog/${article.slug}`).up()
          .ele('lastmod').txt(new Date(article.updated_at).toISOString().split('T')[0]).up()
          .ele('changefreq').txt('weekly').up()
          .ele('priority').txt('0.8').up();
      });

      // URLs de productos (opcional)
      const { data: products } = await supabase
        .from('products')
        .select('id, updated_at');

      if (products) {
        products.forEach(product => {
          root.ele('url')
            .ele('loc').txt(`${DOMAIN}/product/${product.id}`).up()
            .ele('lastmod').txt(new Date(product.updated_at).toISOString().split('T')[0]).up()
            .ele('changefreq').txt('monthly').up()
            .ele('priority').txt('0.6').up();
        });
      }

      const xml = root.end({ prettyPrint: true });

      res.set('Content-Type', 'application/xml');
      res.send(xml);

    } catch (error) {
      console.error('[Sitemap Controller] Error:', error);
      res.status(500).send('Error al generar sitemap');
    }
  },

  generateRobots(req, res) {
    const robots = `User-agent: *
Allow: /
Allow: /blog/
Disallow: /admin/
Disallow: /login/
Disallow: /api/

Sitemap: ${DOMAIN === 'http://localhost:3000' ? 'http://localhost:3001' : DOMAIN}/api/sitemap.xml

User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: CCBot
Disallow: /`;

    res.set('Content-Type', 'text/plain');
    res.send(robots);
  },

  generateManifest(req, res) {
    const manifest = {
      "name": "Laptops Gaming Blog",
      "short_name": "LaptopsGaming",
      "description": "Reviews y análisis de laptops gaming",
      "start_url": `${DOMAIN}/`,
      "display": "standalone",
      "background_color": "#1a1a1a",
      "theme_color": "#ff6b00",
      "icons": [
        {
          "src": `${DOMAIN}/icon-192x192.png`,
          "sizes": "192x192",
          "type": "image/png"
        },
        {
          "src": `${DOMAIN}/icon-512x512.png`,
          "sizes": "512x512",
          "type": "image/png"
        }
      ]
    };

    res.json(manifest);
  }
};

module.exports = sitemapController;