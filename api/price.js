// Vercel serverless endpoint. Only use after the site owner has granted the required permission.
// No authentication bypass, proxy rotation, CAPTCHA solving or internal/private endpoints.
const ALLOWED = new Set(['www.trendyol.com', 'trendyol.com']);
const MAX_BYTES = 2_000_000;
function valid(input) {
  try { const u = new URL(input); if (u.protocol !== 'https:' || !ALLOWED.has(u.hostname) || u.username || u.password || u.port) return null; return u; } catch { return null; }
}
function decode(s) { return String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'); }
function number(value) {
  if (value === null || value === undefined || value === '') return null;
  let v = String(value).replace(/\s|₺|TRY|TL/gi, '');
  if (v.includes(',') && v.includes('.')) v = v.lastIndexOf(',') > v.lastIndexOf('.') ? v.replace(/\./g, '').replace(',', '.') : v.replace(/,/g, '');
  else if (v.includes(',')) v = v.replace(',', '.');
  let n = Number(v); return Number.isFinite(n) && n > 0 && n < 100000000 ? n : null;
}
function flatten(obj, found = []) {
  if (!obj || typeof obj !== 'object' || found.length > 100) return found;
  if (Array.isArray(obj)) { for (const el of obj) flatten(el, found); return found; }
  const type = obj['@type'];
  if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) found.push(obj);
  for (const [key, val] of Object.entries(obj)) if (key === '@graph' || key === 'mainEntity' || key === 'itemListElement') flatten(val, found);
  return found;
}
function extract(html) {
  const scripts = [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of scripts) {
    let data; try { data = JSON.parse(decode(m[1]).trim()); } catch { continue; }
    for (const p of flatten(data)) {
      const offers = Array.isArray(p.offers) ? p.offers : (p.offers ? [p.offers] : []);
      for (const offer of offers) {
        const price = number(offer.price ?? offer.lowPrice ?? offer.priceSpecification?.price);
        const currency = offer.priceCurrency || offer.priceSpecification?.priceCurrency || 'TRY';
        if (price && currency === 'TRY') return { price, name: String(p.name || '').slice(0, 300), sku: String(p.sku || p.gtin13 || p.gtin || '').slice(0, 100), source: 'json-ld' };
      }
    }
  }
  // A product-price meta tag is accepted only if the page also declares itself a product.
  const productPage = /property=["']og:type["']\s+content=["']product["']/i.test(html) || /["']@type["']\s*:\s*["']Product["']/.test(html);
  if (productPage) {
    let m = html.match(/<meta\b[^>]*(?:property|name)=["'](?:product:price:amount|og:price:amount)["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    if (!m) m = html.match(/<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:product:price:amount|og:price:amount)["'][^>]*>/i);
    const price = m ? number(m[1]) : null;
    if (price) return { price, name: '', sku: '', source: 'product-price-meta' };
  }
  return null;
}
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Yalnızca POST desteklenir.' });
  if (process.env.TRENDYOL_SCRAPING_AUTHORIZED !== 'true') return res.status(503).json({ error: 'Veri toplama izni yapılandırılmadı. TRENDYOL_SCRAPING_AUTHORIZED=true ayarlanmalı.' });
  const url = valid(req.body?.url);
  if (!url) return res.status(400).json({ error: 'Geçerli bir Trendyol HTTPS ürün bağlantısı gerekli.' });
  try {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 8500);
    let response;
    try { response = await fetch(url, { signal: controller.signal, redirect: 'manual', headers: { 'Accept': 'text/html,application/xhtml+xml', 'User-Agent': 'PazaryeriAnaliz/1.0 authorized-product-monitor (respectful fetch)' } }); }
    finally { clearTimeout(timeout); }
    if (response.status >= 300 && response.status < 400) return res.status(422).json({ error: 'Yönlendirme algılandı; doğrulanmış nihai ürün adresini girin.' });
    if (response.status === 403 || response.status === 429) return res.status(502).json({ error: 'Trendyol isteği engelledi veya hız limiti uyguladı. Tekrar tekrar deneyerek engeli aşmayın.', status: response.status });
    if (!response.ok) return res.status(502).json({ error: 'Kaynak sayfa yanıt vermedi.', status: response.status });
    if (!(response.headers.get('content-type') || '').toLowerCase().includes('text/html')) return res.status(422).json({ error: 'Ürün HTML sayfası alınamadı.' });
    const body = await response.text();
    if (body.length > MAX_BYTES) return res.status(413).json({ error: 'Kaynak sayfa fazla büyük.' });
    const parsed = extract(body);
    if (!parsed) return res.status(422).json({ error: 'Sayfadan doğrulanabilir ürün fiyatı okunamadı. HTML yapısı değişmiş veya erişim kısıtlı olabilir.' });
    return res.status(200).json({ ...parsed, url: url.toString(), checkedAt: new Date().toISOString(), live: true });
  } catch (err) { return res.status(502).json({ error: err.name === 'AbortError' ? 'Ürün sayfası zaman aşımına uğradı.' : 'Ürün sayfasına erişilemedi.' }); }
};
module.exports._test = { valid, number, extract };
