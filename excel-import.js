'use strict';
/* The existing live.js supplies products, save, render, check, money and helpers. This module loads after it. */
const XLSX_STORE = 'pazaryeri-trendyol-catalog-v1';
let trendyolCatalog = [];
try { const saved = JSON.parse(localStorage.getItem(XLSX_STORE) || '[]'); if (Array.isArray(saved)) trendyolCatalog = saved.slice(0, 20000); } catch { /* invalid browser cache */ }
let catalogPage = 0;
let productPage = 0;
const PAGE_SIZE = 60;
const normalize = v => String(v ?? '').trim().toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').replace(/ü/g, 'u').replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]/g, '');
const barcodeText = v => { if (v == null || v === '') return ''; if (typeof v === 'number') return Number.isSafeInteger(v) ? String(v) : ''; return String(v).trim().replace(/\.0$/, ''); };
function excelNumber(v) { if (v == null || String(v).trim() === '') return null; return number(v); }
function workbookRows(data) {
  if (typeof XLSX === 'undefined') throw Error('Excel okuyucu yüklenemedi. İnternet bağlantısını kontrol edip sayfayı yenileyin.');
  const workbook = XLSX.read(data, {type:'array', cellDates:false, dense:true});
  for (const sheetName of workbook.SheetNames) {
    const lines = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {header:1, defval:'', raw:true, blankrows:false});
    if (lines.some(row => row.some(cell => normalize(cell) === 'barkod'))) return lines;
  }
  throw Error('Barkod sütununu içeren sayfa bulunamadı.');
}
function headings(rows, required) {
  const at = rows.findIndex(row => row.some(c => normalize(c) === 'barkod') && required.every(k => row.some(c => normalize(c) === k)));
  if (at < 0) throw Error('Bu dosyanın başlıkları beklenen raporla eşleşmiyor.');
  const head = rows[at].map(normalize);
  return {data:rows.slice(at+1), pick:(row, names) => { const index = names.map(n=>head.indexOf(normalize(n))).find(n=>n>=0); return index === undefined ? '' : (row[index] ?? ''); }, has:names=>names.some(n=>head.includes(normalize(n)))};
}
function saveCatalog() { try { localStorage.setItem(XLSX_STORE, JSON.stringify(trendyolCatalog)); } catch { setState('Trendyol listesi tarayıcı depolamasına sığmadı. Daha küçük bir dosya deneyin.', true); } }
function upsertIdeFix(rows) {
  const {data,pick,has} = headings(rows,['barkod','urunadi']);
  const current = new Map(products.map(p => [p.barcode,p]));
  const incoming = new Map(); let rejected = 0;
  for (const line of data) {
    const barcode=barcodeText(pick(line,['Barkod'])), name=String(pick(line,['Ürün Adı','Ürün İsmi'])||'').trim();
    if (!barcode || !name) {rejected++;continue;}
    const old=incoming.get(barcode) || current.get(barcode);
    const price=excelNumber(pick(line,['idefix fiyat','Satış Fiyatı','Satış Fiyat','Fiyat']));
    const own = price == null ? (old?.own ?? null) : price;
    const item={barcode,name,own,url:old?.url||'',price:old?.price??null,checkedAt:old?.checkedAt??null,error:old?.error||'',history:Array.isArray(old?.history)?old.history:[],brand:String(pick(line,['Marka'])||''),group:String(pick(line,['Varyant Grup Id'])||''),idefixPoolId:String(pick(line,['Havuz Ürün ID'])||''),trendyolBarcode:old?.trendyolBarcode||'',matchConfirmed:!!old?.matchConfirmed};
    incoming.set(barcode,item);
  }
  for (const [barcode,item] of incoming) current.set(barcode,item);
  products = [...current.values()];
  save();render();renderCatalog();
  setState(`idefix: ${data.length} satırdan ${incoming.size} benzersiz barkod işlendi; ${rejected} eksik satır atlandı. ${has(['Satış Fiyatı','idefix fiyat','Fiyat'])?'Fiyat sütunu okundu.':'Bu raporda fiyat yok; fiyat alanları boş bırakıldı.'}`);
}
function upsertTrendyol(rows) {
  const {data,pick,has} = headings(rows,['barkod','urunadi']);
  const unique = new Map(); let rejected=0;
  for (const line of data) {
    const barcode=barcodeText(pick(line,['Barkod'])), name=String(pick(line,['Ürün Adı'])||'').trim();
    if (!barcode || !name) {rejected++;continue;}
    const url=safeUrl(String(pick(line,['Trendyol.com Linki','Trendyol URL','Trendyol Linki'])||'').trim());
    const price=excelNumber(pick(line,['Satış Fiyatı','Trendyol Fiyatı','Rakip Fiyat']));
    unique.set(barcode,{barcode,name,url,brand:String(pick(line,['Marka'])||''),model:String(pick(line,['Model Kodu'])||''),stock:String(pick(line,['Ürün Stok Adedi'])||''),price});
  }
  const previous=new Map(trendyolCatalog.map(p=>[p.barcode,p]));
  for(const [k,v] of unique)previous.set(k,v);
  trendyolCatalog=[...previous.values()];saveCatalog();
  let auto=0;const map=new Map(products.map(p=>[p.barcode,p]));
  for(const t of unique.values()){
    const p=map.get(t.barcode);
    if(p&&t.url){if(p.url!==t.url){p.url=t.url;p.price=null;p.checkedAt=null;p.history=[];p.error='Excel bağlantısı bulundu; varyantı doğrulayıp sorgula.';}p.trendyolBarcode=t.barcode;p.matchConfirmed=true;auto++;}
  }
  save();render();renderCatalog();
  setState(`Trendyol: ${unique.size} benzersiz ürün yüklendi; ${auto} kesin barkod eşleşmesi; ${rejected} satır atlandı. ${has(['Satış Fiyatı','Trendyol Fiyatı','Rakip Fiyat'])?'Dosyada fiyat sütunu bulundu.':'Bu dosyada fiyat yok; ürün bağlantıları yüklendi.'}`);
}
function renderCatalog(){
  document.getElementById('idefixCount').textContent=products.length;
  document.getElementById('trendyolCount').textContent=trendyolCatalog.length;
  document.getElementById('linkedCount').textContent=products.filter(p=>p.url).length;
  const search=normalize(document.getElementById('catalogSearch').value);
  const filtered=trendyolCatalog.filter(p=>normalize(p.name+' '+p.barcode+' '+p.model+' '+p.brand).includes(search));
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));catalogPage=Math.min(catalogPage,pages-1);
  document.getElementById('catalogPage').textContent=`${catalogPage+1} / ${pages} · ${filtered.length} sonuç`;
  document.getElementById('catalogRows').innerHTML=filtered.slice(catalogPage*PAGE_SIZE,(catalogPage+1)*PAGE_SIZE).map(t=>`<tr><td><b>${escapeHtml(t.name)}</b><br><small>${escapeHtml(t.brand)} · ${escapeHtml(t.model)}<br>Barkod: ${escapeHtml(t.barcode)}</small></td><td>${t.url?`<a href="${escapeHtml(t.url)}" target="_blank" rel="noopener noreferrer">Ürüne git ↗</a>`:'Bağlantı yok'}</td><td>${money(t.price)}</td><td><button class="secondary" data-match="${escapeHtml(t.barcode)}">idefix ürünüyle eşleştir</button></td></tr>`).join('')||'<tr><td colspan="4">Ürün bulunamadı.</td></tr>';
}
const existingRender=render;
render=function(){
  const q=normalize(document.getElementById('idefixSearch')?.value||'');
  const visible=products.map((p,i)=>({p,i})).filter(({p})=>normalize(p.name+' '+p.barcode+' '+(p.brand||'')).includes(q));
  const pages=Math.max(1,Math.ceil(visible.length/PAGE_SIZE));productPage=Math.min(productPage,pages-1);
  if(document.getElementById('idefixPage'))document.getElementById('idefixPage').textContent=`${productPage+1} / ${pages} · ${visible.length} sonuç`;
  const compared=products.filter(p=>p.own!=null&&p.price!=null),higher=compared.filter(p=>p.own>p.price);
  $('total').textContent=products.length;$('priced').textContent=compared.length;$('high').textContent=higher.length;$('failed').textContent=products.filter(p=>p.error).length;
  $('rows').innerHTML=visible.slice(productPage*PAGE_SIZE,(productPage+1)*PAGE_SIZE).map(({p,i})=>{
    const delta=p.price==null||p.own==null?null:p.own-p.price,pct=delta!=null&&p.price>0?100*delta/p.price:null;
    const diff=delta==null?'—':`${delta>0?'+':''}${money(delta)} / ${pct==null?'—':pct.toFixed(1)+'%'}`;
    const status=p.own==null?'idefix fiyatı dosyada yok. ':'';
    return `<tr><td><strong>${escapeHtml(p.name)}</strong><br><small>${escapeHtml(p.barcode)} · ${escapeHtml(p.brand||'')}</small></td><td>${money(p.own)}</td><td>${money(p.price)}</td><td class="${delta!=null&&delta>0?'bad':'good'}">${diff}</td><td><input aria-label="Trendyol URL ${escapeHtml(p.barcode)}" data-url="${i}" value="${escapeHtml(p.url||'')}" placeholder="https://www.trendyol.com/..."></td><td>${p.checkedAt?new Date(p.checkedAt).toLocaleString('tr-TR'):'—'}</td><td class="${p.error?'bad':'muted'}">${escapeHtml(status+(p.error|| (p.checkedAt?'Fiyat kaydedildi':'Kontrol edilmedi')))}</td><td><button data-check="${i}">Sorgula</button> <button class="secondary" data-history="${i}">Geçmiş</button></td></tr>`;
  }).join('')||'<tr><td colspan="8">Ürün bulunamadı. Excel dosyasını yükle.</td></tr>';
};
const originalCheck=check;
check=async function(p){
  if(p.matchConfirmed && p.trendyolBarcode && p.trendyolBarcode!==p.barcode){
    const idefixBarcode=p.barcode;
    try {p.barcode=p.trendyolBarcode;return await originalCheck(p);}
    finally {p.barcode=idefixBarcode;save();render();}
  }
  return originalCheck(p);
};
const panel=document.createElement('section');
panel.innerHTML=`<h2>Toplu Excel yükleme · Orijinal raporlar</h2><p>idefix “Havuz Ürün Bilgileri Raporu” ve Trendyol “tüm ürünler detaylı” dosyalarını <b>.xlsx olarak doğrudan yükle</b>. Başlıklar otomatik bulunur. İki dosya da tarayıcında işlenir; sunucuya yüklenmez.</p><div class="flex"><label>1 · idefix Excel (.xlsx) <input id="idefixExcel" type="file" accept=".xlsx,.xls,.csv"></label><label>2 · Trendyol Excel (.xlsx) <input id="trendyolExcel" type="file" accept=".xlsx,.xls,.csv"></label></div><p class="muted">Ürünler barkoda göre güncellenir, tekrarlayan barkodlar tek kayıt olur. Farklı barkodlar otomatik eşleştirilmez. Dosyalarında fiyat sütunu bulunmadığından fiyatlar uydurulmaz. Mevcut kayıtların üstüne yeniden yükleme mümkündür.</p><div class="grid"><div class="stat">idefix ürünleri<b id="idefixCount">0</b></div><div class="stat">Trendyol ürünleri<b id="trendyolCount">0</b></div><div class="stat">Bağlantılı idefix ürünü<b id="linkedCount">0</b></div><div class="stat">Yükleme<b style="font-size:13px" id="excelStatus">Hazır</b></div></div><h3>Trendyol ürün kataloğu · Eşleştirme</h3><div class="flex"><input id="catalogSearch" placeholder="Trendyol ürün adı, marka, model, barkod ara"><button id="catalogPrev" class="secondary">← Önceki</button><span id="catalogPage">1 / 1</span><button id="catalogNext" class="secondary">Sonraki →</button></div><div class="scroll"><table><thead><tr><th>Ürün / model / barkod</th><th>Trendyol bağlantısı</th><th>Dosyadaki fiyat</th><th>Eşleştirme</th></tr></thead><tbody id="catalogRows"></tbody></table></div>`;
document.querySelector('main section').before(panel);
const searchBar=document.createElement('div');searchBar.className='flex';searchBar.innerHTML='<input id="idefixSearch" placeholder="idefix ürün adı, barkod veya marka ara"><button id="idefixPrev" class="secondary">← Önceki</button><span id="idefixPage">1 / 1</span><button id="idefixNext" class="secondary">Sonraki →</button>';
$('rows').closest('section').querySelector('h2').after(searchBar);
for(const [inputId,kind] of [['idefixExcel','idefix'],['trendyolExcel','trendyol']]){
  document.getElementById(inputId).addEventListener('change',async event=>{
    const input=event.currentTarget,file=input.files?.[0];if(!file)return;
    try{
      if(file.size>25_000_000)throw Error('Dosya 25 MB sınırını aşıyor.');
      document.getElementById('excelStatus').textContent='Okunuyor…';
      let rows;
      if(/\.csv$/i.test(file.name))rows=parseCSV(await file.text());
      else rows=workbookRows(await file.arrayBuffer());
      if(kind==='idefix')upsertIdeFix(rows);else upsertTrendyol(rows);
      document.getElementById('excelStatus').textContent='İşlem tamamlandı';
    }catch(err){document.getElementById('excelStatus').textContent='Hata';setState('Excel yükleme hatası: '+err.message,true);}finally{input.value='';}
  });
}
document.getElementById('catalogSearch').addEventListener('input',()=>{catalogPage=0;renderCatalog();});
document.getElementById('catalogPrev').addEventListener('click',()=>{catalogPage=Math.max(0,catalogPage-1);renderCatalog();});
document.getElementById('catalogNext').addEventListener('click',()=>{catalogPage++;renderCatalog();});
document.getElementById('idefixSearch').addEventListener('input',()=>{productPage=0;render();});
document.getElementById('idefixPrev').addEventListener('click',()=>{productPage=Math.max(0,productPage-1);render();});
document.getElementById('idefixNext').addEventListener('click',()=>{productPage++;render();});
document.getElementById('catalogRows').addEventListener('click',e=>{
  const button=e.target.closest('button[data-match]');if(!button)return;
  const t=trendyolCatalog.find(p=>p.barcode===button.dataset.match);if(!t||!t.url)return setState('Bu Trendyol ürününde URL bulunamadı.',true);
  const input=prompt(`Trendyol: ${t.name}\n\nEşleştirilecek idefix ürününün barkodunu yaz:`);if(input===null)return;
  const p=products.find(p=>p.barcode===input.trim());if(!p)return setState('idefix barkodu bulunamadı.',true);
  if(!confirm(`Ürünleri ve varyantlarını kontrol edin.\n\nidefix: ${p.name} (${p.barcode})\nTrendyol: ${t.name} (${t.barcode})\n\nAynı ürün olduklarını onaylıyor musunuz?`))return;
  if(p.url!==t.url){p.price=null;p.checkedAt=null;p.history=[];}
  p.url=t.url;p.trendyolBarcode=t.barcode;p.matchConfirmed=true;p.error='Eşleşme kullanıcı tarafından onaylandı; fiyat henüz sorgulanmadı.';save();render();renderCatalog();setState('Ürünler eşleştirildi. idefix tablosundan Sorgula düğmesine basabilirsin.');
});
render();renderCatalog();
