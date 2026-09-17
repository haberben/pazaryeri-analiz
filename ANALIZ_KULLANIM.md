# Toplu Excel → Analiz Yap: kullanım ve gerçek durum

Ana panel `/` → `live.html`.

1. **idefix Excel (.xlsx)** alanından `Havuz Ürün Bilgileri Raporu` yükleyin. Tekil barkodlar ürün kartına gelir. Fiyat sütunu yoksa idefix satış fiyatı boş kalır; uydurulmaz.
2. Varsa **Trendyol Excel (.xlsx)** alanına Trendyol ürün detay raporunu yükleyin. Bu, ürün adı/barkod ve mevcut ürün URL'leri için yerel aday havuzudur. Bu rapordaki ürünler idefix ürünlerine otomatik olarak eklenmez.
3. **Analiz Yap**: önce aynı barkod + URL varsa kesin eşleştirir; farklı barkodlu isim/model benzerliğini kullanıcı onayına sunar. Hâlâ bulunamayan ürünleri, sunucu erişimi izinliyse Trendyol'un herkese açık arama HTML sayfasından barkod ve ürün adıyla sırayla aramayı **dener**. Tek çalıştırmada en fazla 20 aranmamış ürün web'de aranır; yeniden Analiz Yap sonraki grubu işler. Bu sınır sorgu yükünü ve başarısız erişimde gereksiz istekleri azaltır. Arama sayfası bağlantı döndürmezse isim eşleştirme mümkün olmaz; fotoğraftan eşleştirme uygulanmamıştır.
4. **Aynı ürün, eşleştir** ile varyant/renk/paket gibi ayrıntıları inceleyerek adayları onaylayın. Trendyol ürün bağlantısı onaylı olunca `/api/price` ürün sayfasındaki JSON-LD veya ürün-meta fiyatını okumayı dener; erişim/yapı değiştiğinde açık hata gösterilir.
5. **Sonuçları indir** ile karşılaştırma CSV'si alın. **idefix satış fiyatı** yoksa Trendyol fiyatı bulunmuş olsa bile fark hesaplanmaz. Fiyat içeren bir idefix raporu veya manuel fiyat girişi gerekir.

## Gerekli sunucu yapılandırması

Vercel → Project → Settings → Environment Variables: `TRENDYOL_SCRAPING_AUTHORIZED=true` yalnızca hedef site tarafından bu veri toplama kullanımına gereken erişim izni gerçekten verilmişse ayarlayın. Yeniden deploy edin. Bu, üçüncü tarafın yetkisini oluşturmaz; yalnızca kodun erişim denemesini açar. Trendyol'un erişimi reddetmesi, arama sayfasının JS ile oluşturulması veya ürünün JSON-LD fiyatının eksik olması nedeniyle gerçek sorgu başarısız olabilir. CAPTCHA, proxy dönüşümü ve özel dahili API kullanımı yoktur.

## Eksik üretim özellikleri

- Ürünlerin tamamını sınırsız ve garantili otomatik bulma **yok**. Yalnızca aday üretimi ve doğrulanan sayfada fiyat okuma denemesi var.
- Görselle ürün eşleştirme **yok**.
- Tarayıcı kapalıyken 4 saatte bir çalıştırma, sunucu veritabanı, oturum açma ve abonelik **yok**.
- Fiyat geçmişi cihazınızda `localStorage` içindedir ve tarayıcı verileri silinirse kaybolur.
- Mevcut iki raporda idefix fiyatı yoktur ve barkod kesişimi bulunmamıştır; ürünlerin çoğunda manuel eşleşme gerekebilir.

## Test

GitHub Actions `Code checks` işi JavaScript sözdizimini ve sunucu tarafı URL/fiyat ayıklama birim testlerini kontrol etmek üzere eklendi. Gerçek Trendyol, Vercel, Excel uçtan uca testi veya Actions sonucunun başarılı olduğu henüz doğrulanmadı.
