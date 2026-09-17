'use strict';
/* Loaded after live.js + excel-import.js. All data stays in the browser; no fabricated prices. */
(() => {
  const state = { running:false, stop:false, candidates:new Map(), searched:new Set(), lastError:'' };
  const clean = s => String(s ?? '').toLocaleLowerCase('tr-TR').replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  const terms = s => new Set(clean(s).split(' ').filter(w => w.length > 1));
  const identifiers = s => clean(s).match(/\d+[a-z]*|[a-z]*\d+[a-z\d]*/g) || [];
  function similarity(a,b) {
    const x=terms(a),y=terms(b);if(!x.size||!y.size)return 0;
    const shared=[...x].filter(t=>y.has(t)).length;
    const aIds=identifiers(a).filter(t=>/\d/.test(t)),bIds=identifiers(b).filter(t=>/\d/.test(t));
    if(aIds.length && bIds.length && !aIds.every(v=>bIds.includes(v)))return 0;
    return 2*shared/(x.size+y.size);
  }
  const get = id=>document.getElementById(id);
  const ui = document.createElement('section');
  ui.id='smartAnalysis';
  ui.innerHTML='<h2>3 · Tek tıkla toplu analiz</h2><p>Önce idefix Excel dosyanı yükle. İstersen Trendyol Excel dosyanı da yükle: dosyadaki ürün linkleri aramada önceliklidir. <b>Analiz Yap</b> önce barkodları kesin eşleştirir, sonra isim benzerliklerini inceler ve eksik ürünleri izinli Trendyol arama sayfasında sırayla aramayı dener. Farklı barkodlu veya belirsiz eşleşmeler onayına sunulur; doğru linki bulunan ürünlerin gerçek fiyatları sorgulanır. Görsel benzerliğine göre otomatik eşleştirme henüz yoktur.</p><div class="flex"><button id="startAnalysis">▶ Analiz Yap</button><button id="stopAnalysis" class="secondary" disabled>Analizi durdur</button><button id="resetSearch" class="secondary">Arama kuyruğunu sıfırla</button><span id="analysisStatus" role="status">Hazır</span></div><p class="muted" id="analysisProgress">Henüz analiz başlatılmadı.</p><h3>Onay bekleyen eşleşmeler</h3><p class="muted">Yanlış ürün / renk / ölçü / paket fiyatı karşılaştırılmasın diye farklı barkodlu adaylar otomatik onaylanmaz.</p><div class="scroll"><table><thead><tr><th>idefix ürünü</th><th>Trendyol adayı</th><th>Benzerlik</th><th>İşlem</th></tr></thead><tbody id="matchSuggestions"><tr><td colspan="4">Henüz aday yok.</td></tr></tbody></table></div>';
  const excel = get('idefixExcel');
  if (!excel) return;
  excel.closest('section').after(ui);
  const status=(text,bad=false)=>{get('analysisStatus').textContent=text;get('analysisStatus').className=bad?'bad':'good';};
  const progress=(text)=>get('analysisProgress').textContent=text;
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function setProduct(p,t,method){
    if(!t.url)return false;
    if(p.url!==t.url){p.price=null;p.checkedAt=null;p.history=[];p.error='Yeni ürün bağlantısı eşleştirildi; henüz fiyat sorgulanmadı.';}
    p.url=t.url;p.trendyolBarcode=t.barcode||'';p.matchConfirmed=true;p.matchMethod=method;
    state.candidates.delete(p.barcode);save();return true;
  }
  function candidate(p,t,score,source){
    if(!t.url || !safeUrl(t.url))return;
    const list=state.candidates.get(p.barcode)||[];
    if(list.some(i=>i.url===t.url))return;
    list.push({url:t.url,name:t.name||t.title||'',barcode:t.barcode||'',score,source});
    list.sort((a,b)=>b.score-a.score);state.candidates.set(p.barcode,list.slice(0,3));
  }
  function renderCandidates(){
    const items=[];
    for(const [barcode,list] of state.candidates){
      const p=products.find(x=>x.barcode===barcode);if(!p||p.matchConfirmed)continue;
      for(const t of list){items.push({p,t});if(items.length>=120)break;}if(items.length>=120)break;
    }
    get('matchSuggestions').innerHTML=items.map(({p,t})=>`<tr><td>${escapeHtml(p.name)}<br><small>${escapeHtml(p.barcode)}</small></td><td>${escapeHtml(t.name||'İsim okunamadı')}<br><small>${escapeHtml(t.barcode||'Barkod belirsiz')} · ${escapeHtml(t.source)}</small><br><a href="${escapeHtml(t.url)}" rel="noopener noreferrer" target="_blank">Ürünü incele ↗</a></td><td>${Math.round(t.score*100)}%</td><td><button data-confirm="${escapeHtml(p.barcode)}" data-url="${escapeHtml(t.url)}">Aynı ürün, eşleştir</button></td></tr>`).join('')||'<tr><td colspan="4">Onay bekleyen aday yok.</td></tr>';
    const count=[...state.candidates.keys()].filter(b=>products.some(p=>p.barcode===b&&!p.matchConfirmed)).length;
    progress(`${products.length} idefix ürününden ${products.filter(p=>p.matchConfirmed&&p.url).length} bağlantı doğrulandı · ${count} ürün için onay bekleniyor · ${products.filter(p=>p.price!=null).length} fiyat kaydı.`);
  }
  get('matchSuggestions').addEventListener('click',e=>{
    const b=e.target.closest('button[data-confirm]');if(!b)return;
    const p=products.find(x=>x.barcode===b.dataset.confirm),t=(state.candidates.get(b.dataset.confirm)||[]).find(x=>x.url===b.dataset.url);
    if(!p||!t)return;
    if(!confirm('Aynı ürün, marka, model, ölçü, renk ve paket miktarı olduğunu doğruladın mı?\n\n'+p.name+'\n→ '+t.name))return;
    setProduct(p,t,'manual-approved');render();renderCatalog();renderCandidates();status('Eşleşme onaylandı. Analiz Yap ile fiyatı sorgulayabilirsin.');
  });
  const byBarcode=()=>new Map(trendyolCatalog.filter(x=>x.barcode&&x.url).map(x=>[x.barcode,x]));
  const byName=()=>{const map=new Map();for(const t of trendyolCatalog){if(!t.url)continue;let k=clean(t.name);if(!k)continue;const v=map.get(k)||[];v.push(t);map.set(k,v)}return map;};
  function findLocal(p,barcodeIndex,nameIndex){
    if(p.matchConfirmed&&p.url)return 'linked';
    const exact=barcodeIndex.get(p.barcode);
    if(exact?.url){setProduct(p,exact,'exact-barcode');return 'matched';}
    const named=nameIndex.get(clean(p.name))||[];
    for(const t of named.slice(0,5)){
      if(p.brand&&t.brand&&clean(p.brand)!==clean(t.brand))continue;
      candidate(p,t,1,'Excel: ürün adı birebir');
    }
    if(!named.length){
      const x=clean(p.name);if(x.length<12)return 'missing';
      // Limit full-catalog fuzzy matching to a short normalized prefix to avoid quadratic processing.
      const prefix=x.slice(0,12);let seen=0;
      for(const t of trendyolCatalog){if(!t.url||seen>4)break;
        if(clean(t.name).slice(0,12)!==prefix)continue;
        const score=similarity(p.name,t.name);
        if(score>=0.85){candidate(p,t,score,'Excel: benzer isim');seen++;}
      }
    }
    return state.candidates.has(p.barcode)?'candidate':'missing';
  }
  async function remoteSearch(p){
    const qs=[p.barcode,p.name.slice(0,105)].filter(Boolean);
    for(let i=0;i<qs.length;i++){
      const result=await fetch('/api/search?q='+encodeURIComponent(qs[i]),{headers:{'Accept':'application/json'}});
      const data=await result.json().catch(()=>({error:'Sunucu arama yanıtı okunamadı.'}));
      if(!result.ok){if(data.blocked||data.status===403||data.status===429){const error=Error(data.error||'Erişim reddedildi.');error.blocked=true;throw error;}throw Error(data.error||'Trendyol araması başarısız.');}
      for(const row of data.candidates||[]){
        const score=similarity(p.name,row.title);
        if(score>=0.72)candidate(p,{url:row.url,name:row.title},score,'Trendyol arama sayfası');
      }
      if(state.candidates.has(p.barcode))break;
      if(i+1<qs.length)await wait(1800);
    }
  }
  async function priceCheck(p){
    if(!p.url||!p.matchConfirmed)return 'unconfirmed';
    try{
      const response=await fetch('/api/price',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:p.url})});
      const data=await response.json().catch(()=>({error:'Fiyat servisi geçersiz yanıt verdi.'}));
      if(!response.ok){p.error=data.error||'Fiyat okunamadı.';return [403,429].includes(data.status)?'blocked':'error';}
      if(!Number.isFinite(data.price)||data.price<=0){p.error='Geçersiz fiyat.';return 'error';}
      const sku=String(data.sku||'');
      if(/^\d{13,14}$/.test(sku)&&sku!==p.barcode&&sku!==(p.trendyolBarcode||'')){
        // Different barcodes are accepted only after an explicit, manually approved match.
        if(p.matchMethod!=='manual-approved'){p.error='Ürün barkodu uyuşmuyor: '+sku+'. Fiyat kaydedilmedi.';return 'error';}
      }
      const previous=p.price;
      p.price=data.price;p.checkedAt=data.checkedAt||new Date().toISOString();p.error='';
      p.history=Array.isArray(p.history)?p.history:[];
      if(previous!==data.price)p.history.push({price:data.price,at:p.checkedAt,source:data.source||'Trendyol ürün sayfası',name:data.name||''});
      p.history=p.history.slice(-200);return 'ok';
    }catch(e){p.error=e.message||'Fiyat sorgusu başarısız.';return 'error';}
    finally{save();render();}
  }
  // Use verified-match behavior for the existing individual and bulk price buttons as well.
  check=priceCheck;
  async function analyze(){
    if(state.running)return;
    if(!products.length){status('Önce idefix Excel yükle.',true);return;}
    state.running=true;state.stop=false;get('startAnalysis').disabled=true;get('stopAnalysis').disabled=false;
    let matched=0,priced=0,errors=0,blocked=false;
    try{
      const barcodeIndex=byBarcode(),nameIndex=byName();
      for(let i=0;i<products.length;i++){
        if(state.stop)break;
        const p=products[i];
        if(!p.matchConfirmed||!p.url){const found=findLocal(p,barcodeIndex,nameIndex);if(found==='matched')matched++;}
        progress(`Eşleştirme ${i+1}/${products.length} · ${matched} kesin barkod bağlantısı · ${state.candidates.size} aday`);
        if((i+1)%50===0)await wait(0);
      }
      save();render();renderCandidates();
      const unlinked=products.filter(p=>!p.matchConfirmed&&!p.url&&!state.searched.has(p.barcode));
      // Search in small batches: browser session + provider limits make 2,000 remote queries unsafe.
      const batch=unlinked.slice(0,20);
      for(let i=0;i<batch.length;i++){
        if(state.stop)break;
        const p=batch[i];state.searched.add(p.barcode);
        status(`Trendyol'da aranıyor: ${i+1}/${batch.length}`);
        try{await remoteSearch(p)}catch(e){errors++;p.error=e.message||'Arama başarısız.';if(e.blocked){blocked=true;break;}}
        renderCandidates();if(i+1<batch.length)await wait(2200);
      }
      if(!blocked&&!state.stop){
        const targets=products.filter(p=>p.matchConfirmed&&p.url&&(!p.checkedAt||Date.now()-Date.parse(p.checkedAt)>4*60*60*1000));
        for(let i=0;i<targets.length;i++){
          if(state.stop)break;
          status(`Gerçek fiyat kontrolü ${i+1}/${targets.length}`);
          const result=await priceCheck(targets[i]);if(result==='ok')priced++;else{errors++;if(result==='blocked'){blocked=true;break;}}
          if(i+1<targets.length)await wait(3000);
        }
      }
      renderCandidates();render();renderCatalog();
      status(blocked?'Kaynak erişimi reddetti; işlemler durduruldu.':state.stop?'Analiz kullanıcı tarafından durduruldu.':`Tamamlandı: ${matched} yeni kesin eşleşme, ${priced} fiyat, ${errors} hata.`,blocked||errors>0);
      const remaining=products.filter(p=>!p.url&&!state.searched.has(p.barcode)).length;
      progress(`${products.length} idefix ürünü · ${priced} yeni fiyat · ${remaining} henüz web'de aranmadı · ${state.candidates.size} aday. Arama, her basışta sıradaki en fazla 20 ürünü işler. Fiyatı olmayan ürünlerde fark hesaplanmaz.`);
    }finally{state.running=false;get('startAnalysis').disabled=false;get('stopAnalysis').disabled=true;save();}
  }
  get('startAnalysis').addEventListener('click',analyze);
  get('stopAnalysis').addEventListener('click',()=>{state.stop=true;status('Mevcut sorgu tamamlanınca durdurulacak.');});
  get('resetSearch').addEventListener('click',()=>{state.searched.clear();status('Arama kuyruğu sıfırlandı.');});
  // Old 'check all' uses check() and existing UI, but only confirmed matches can be queried now.
  const oldButton=get('checkAll');if(oldButton)oldButton.textContent='Eşleşmiş ürünlerin fiyatlarını kontrol et';
  renderCandidates();
})();
