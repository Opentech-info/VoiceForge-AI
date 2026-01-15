# VoiceForge AI - Production Deployment

## Netlify Deployment

This project is configured for one-click Netlify deployment.

### Features

✅ Advanced SEO optimization with meta tags
✅ Open Graph and Twitter Card support
✅ robots.txt for search engine crawling
✅ sitemap.xml for better indexing
✅ PWA manifest for installability
✅ Security headers configured
✅ Asset caching optimization
✅ Automatic compression (Brotli/Gzip)

### Deploy to Netlify

1. **Connect Repository:**

   - Go to [Netlify](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub account
   - Select `VoiceForge-AI` repository

2. **Build Settings:**

   - Build command: _Leave empty_ (static site)
   - Publish directory: `src`
   - Click "Deploy site"

3. **Custom Domain (Optional):**
   - Go to Site settings → Domain management
   - Add your custom domain
   - Update canonical URLs in `src/index.html` and `src/sitemap.xml`

### Configuration Files

- **netlify.toml** - Netlify build configuration, headers, redirects
- **src/robots.txt** - Search engine crawling rules
- **src/sitemap.xml** - URL sitemap for SEO
- **src/manifest.json** - PWA manifest
- **src/index.html** - Enhanced with SEO meta tags

### Post-Deployment

After deployment, update these URLs to your actual domain:

1. `src/index.html` - canonical URL, og:url, twitter:url
2. `src/sitemap.xml` - all `<loc>` URLs
3. `src/robots.txt` - Sitemap URL

### Environment Variables

No environment variables required - everything works offline!

### Performance

- **Lighthouse Score Target:** 95+
- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3.0s
- **SEO Score:** 100

---

Ready to deploy! Just connect to Netlify and click publish.
