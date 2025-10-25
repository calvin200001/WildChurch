import { SitemapStream, streamToPromise } from 'sitemap';
import { createWriteStream } from 'fs';
import { resolve } from 'path';

const hostname = 'https://wildchurch.netlify.app'; // Replace with your actual domain

const staticRoutes = [
  '/',
  '/messages',
  '/gatherings',
  '/proposals',
  '/safety-review',
];

async function generateSitemap() {
  const sitemapStream = new SitemapStream({ hostname });

  // Add static routes
  staticRoutes.forEach(route => {
    sitemapStream.write({ url: route, changefreq: 'daily', priority: 0.7 });
  });

  // End the stream
  sitemapStream.end();

  // Write sitemap to file
  streamToPromise(sitemapStream).then(data => {
    createWriteStream(resolve('./public/sitemap.xml')).write(data.toString());
    console.log('Sitemap generated successfully!');
  }).catch(error => {
    console.error('Error generating sitemap:', error);
  });
}

generateSitemap();