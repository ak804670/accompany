import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = 'https://accompanyapp.in';
const blogsPath = path.resolve(__dirname, '../src/data/blogs.json');
const sitemapPath = path.resolve(__dirname, '../public/sitemap.xml');

const blogsRaw = fs.readFileSync(blogsPath, 'utf8');
const blogs = JSON.parse(blogsRaw);

const today = new Date().toISOString().split('T')[0];

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <!-- Core Pages -->
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <url>
    <loc>${SITE_URL}/blogs</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

  <url>
    <loc>${SITE_URL}/contact</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <url>
    <loc>${SITE_URL}/terms</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>

  <!-- Blog Posts -->
`;

blogs.forEach((blog) => {
  const lastmod = blog.dateModifiedISO ? blog.dateModifiedISO.split('T')[0] : today;
  xml += `  <url>
    <loc>${SITE_URL}/blogs/${blog.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>${blog.coverImage}</image:loc>
      <image:title>${blog.title.replace(/&/g, '&amp;')}</image:title>
    </image:image>
  </url>
`;
});

xml += `</urlset>\n`;

fs.writeFileSync(sitemapPath, xml, 'utf8');
console.log(`Successfully generated sitemap with ${blogs.length} blog posts at ${sitemapPath}`);
