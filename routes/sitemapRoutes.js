// backend/routes/sitemapRoutes.js
const express = require('express');
const router = express.Router();
const sitemapController = require('../controllers/sitemapController');

router.get('/sitemap.xml', sitemapController.generateSitemap);
router.get('/robots.txt', sitemapController.generateRobots);
router.get('/manifest.json', sitemapController.generateManifest);

module.exports = router;