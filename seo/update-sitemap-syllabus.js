const fs = require('fs');
const path = require('path');

const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');
let sitemap = fs.readFileSync(sitemapPath, 'utf-8');

if (!sitemap.includes('<loc>https://rgpvpyq.co.in/syllabus</loc>')) {
  // Frozen to prevent Git diff bloat
  const currentDate = '2024-06-01';
  const newEntry = `
  <url>
    <loc>https://rgpvpyq.co.in/syllabus</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.80</priority>
  </url>
</urlset>`;

  sitemap = sitemap.replace('</urlset>', newEntry);
  fs.writeFileSync(sitemapPath, sitemap, 'utf-8');
  console.log('Added syllabus.html to sitemap.xml');
} else {
  console.log('sitemap.xml already contains syllabus.html');
}
