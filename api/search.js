'use strict';
// Experimental public-page reader. Use ONLY when the site owner has authorized the intended collection.
// Does not bypass CAPTCHA, access controls, throttling, or private endpoints.
const DOMAIN = new Set(['trendyol.com','www.trendyol.com']);
function safe(href) { try { const u = new URL(href, 'https://www.trendyol.com'); return u.protocol === 'https:' && DOMAIN.has(u.hostname) && !u.username && !u.password && !u.port && /-p-\d+(?:\?|$|\/)/i.test(u.pathname + u.search) ? u.toString() : null; } catch { return null; } }
function entities(s) { return String(s || '').replace(/&quot;|&#34;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
function findLinks(html) {
  const found = new Map(); const matches = html.matchAll(/<a\b([^>]{0,3000})>/gi);
  for (const match of matches) {
    const attrs = match[1], href = attrs.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
    const url = href && safe(entities(href)); if (!url || found.has(url)) continue;
    const title = attrs.match(/\b(?:title|aria-label)\s*=\s*(["'])(.*?)\1/i)?.[2] || '';
    found.set(url, { url, title: entities(title).slice(0, 260) });
    if (found.size >= 35) break;
  }
  return [...found.values()];
}
module.exports = async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if (req.method !== 'GET') return res.status(405).json({error:'Yalnızca GET desteklenir.'});
  if (process.env.TRENDYOL_SCRAPING_AUTHORIZED !== 'true') return res.status(503).json({error:'Yetkili veri toplama etkin değil.'});
  const query = String(req.query?.q || '').trim();
  if (query.length < 3 || query.length > 120) return res.status(400).json({error:'Arama metni 3–120 karakter olmalı.'});
  const target = new URL('https://www.trendyol.com/sr'); target.searchParams.set('q',query);
  const abort = new AbortController(), timer = setTimeout(()=>abort.abort(),9000);
  try {
    const response = await fetch(target,{signal:abort.signal,redirect:'manual',headers:{'Accept':'text/html','User-Agent':'PazaryeriAnaliz/1.0 authorized-product-monitor'}});
    if ([403,429].includes(response.status)) return res.status(502).json({error:'Trendyol erişimi reddetti / hız sınırı uyguladı.',blocked:true,status:response.status});
    if (!response.ok) return res.status(502).json({error:'Arama sayfası okunamadı.',status:response.status});
    if (!(response.headers.get('content-type')||'').includes('text/html')) return res.status(422).json({error:'HTML arama sonucu alınamadı.'});
    const text = await response.text();if (text.length > 2_000_000) return res.status(413).json({error:'Arama sayfası çok büyük.'});
    const candidates=findLinks(text);
    return res.status(200).json({query,candidates,checkedAt:new Date().toISOString(),note:candidates.length?'Ürün bağlantıları adaydır; ürün kimliğini doğrulamadan eşleştirmeyin.':'Arama HTML sayfasında ürün bağlantısı bulunamadı; sayfa dinamik olabilir.'});
  } catch(e) {return res.status(502).json({error:e.name==='AbortError'?'Arama zaman aşımı.':'Arama sayfasına erişilemedi.'});}
  finally {clearTimeout(timer);}
};
module.exports._test={safe,findLinks};
