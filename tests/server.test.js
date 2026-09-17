'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const price=require('../api/price.js')._test;
const search=require('../api/search.js')._test;
test('reject SSRF and off-site product links',()=>{
  assert.equal(price.valid('http://www.trendyol.com/p'),null);
  assert.equal(price.valid('https://www.trendyol.com.evil.org/p'),null);
  assert.equal(price.valid('https://localhost/p'),null);
  assert.equal(price.valid('https://user:pass@www.trendyol.com/p'),null);
  assert.ok(price.valid('https://www.trendyol.com/marka/urun-p-12345'));
});
test('read structured product price, without guessing when price absent',()=>{
  const html='<script type="application/ld+json">'+JSON.stringify({'@type':'Product',name:'Örnek Telefon 128GB',gtin13:'8690000000000',offers:{'@type':'Offer',price:'1.499,90',priceCurrency:'TRY'}})+'</script>';
  assert.deepEqual(price.extract(html),{price:1499.90,name:'Örnek Telefon 128GB',sku:'8690000000000',source:'json-ld'});
  assert.equal(price.extract('<html><body>Ürün 1499 TL</body></html>'),null);
});
test('product search returns only trendyol product URLs',()=>{
  const html='<a href="/marka/telefon-p-45678" title="Telefon 128 GB">Ürün</a><a href="https://evil.example/marka/telefon-p-999">Dış site</a><a href="/sr?q=telefon">Arama</a>';
  assert.deepEqual(search.findLinks(html),[{url:'https://www.trendyol.com/marka/telefon-p-45678',title:'Telefon 128 GB'}]);
  assert.equal(search.safe('https://evil.example/x-p-111'),null);
});
