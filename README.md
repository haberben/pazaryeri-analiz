# Pazaryeri Analiz — idefix → Trendyol

## Ne çalışıyor?

Ana sayfa (`/`, `live.html`) idefix ürün CSV dosyasını içeri alır; kullanıcı aynı ürünün **doğruladığı Trendyol ürün URL'sini** girer; sunucu tarafında `POST /api/price` ürün sayfasındaki JSON-LD veya ürün-fiyat meta etiketinden fiyat okumayı dener. Başarılıysa rakip fiyatı, TL/% farkını, sorgu saati ve bu tarayıcıdaki fiyat geçmişini kaydeder. Başarısızsa hata gösterir ve eski fiyatı güncelmiş gibi değiştirmez. URL yalnızca Trendyol HTTPS alan adı olabilir; yönlendirmeler takip edilmez. Engellenen 403/429 isteğinde toplu sorgulama durur. İstekler sırayla 3 saniye arayla yapılır.

**Bu bir pilot sürümdür, eksiksiz SaaS değildir.** Gerçek Trendyol fiyatı ağdan doğrulanamadı; HTML şeması değişmiş veya veri erişimi reddedilmiş olabilir. Yazılım **otomatik ürün arama / barkoddan eşleştirme yapmaz** ve **bütün rakip satıcı tekliflerini değil, ürün sayfasının işaretlediği tek fiyatı** okur. Kullanıcının verdiği URL'nin ürünün aynı varyantına ait olduğunu kontrol etmek gerekir. Sadece JSON-LD içindeki SKU barkod ile dolu olup uyuşmazsa fiyat kayıt edilmez; SKU bilgisi olmayan sayfada sistem eşleşmeyi garanti etmez.

Dört saatte bir yeniden sorgu seçeneği **yalnızca sayfa açık olduğu sürece** çalışır. Arka planda sunucu cron'u, kalıcı DB, kimlik doğrulama, abonelik ve bildirim sistemi henüz yoktur. Veriler yalnızca yerel tarayıcı localStorage alanındadır, tarayıcı verileri silinirse kaybolabilir. Kişisel satıcı verilerini herkese açık ortak bilgisayarda kullanmayın.

## Vercel kurulumu

1. Vercel → New Project → GitHub `haberben/pazaryeri-analiz` reposunu import edin; framework Other, kök dizin `./` ve build komutunu boş bırakın. `vercel.json` ana URL'yi `/live.html` sayfasına yönlendirir; `/api/price` bir Vercel serverless fonksiyonudur.
2. **Önce Vercel Deployment Protection / erişim korumasını etkinleştirin**. API endpoint'i henüz uygulama düzeyinde kimlik doğrulaması veya kota içermez; koruma olmadan internete açık yayımlayıp scraping yetkisini etkinleştirmeyin.
3. Site sahibinden alınmış uygun veri toplama yetkiniz ve koşullara uyumunuz doğrulandıysa Vercel Project → Settings → Environment Variables menüsünde `TRENDYOL_SCRAPING_AUTHORIZED` adında değeri `true` olan değişkeni ayarlayın; ardından redeploy edin. Yoksa endpoint güvenli şekilde HTTP 503 verir. Bu bayrağın ayarlanması kendi başına hukuki izin vermez.
4. Ana sayfadan CSV yükleyin; Trendyol'da doğru ürün/varyant URL'sini doğrulayın ve **Sorgula** ya da **Bağlantılı ürünleri şimdi kontrol et** düğmesini kullanın.
5. Hata durumunda ürün satırındaki mesajı inceleyin. HTML'de yapılandırılmış ürün fiyatı yoksa okuyucu bilinmeyen değeri tahmin etmez.

**Test durumu:** GitHub'a kaynak kodu gönderildi; Vercel yayını, Trendyol'a gerçek ağ sorgusu ve uçtan uca canlı test henüz doğrulanmadı. Üretim ortamına uygun olduğu iddia edilmemektedir. Gizli bilgi veya API anahtarı GitHub'a yüklemeyin.

## CSV formatı

Excel → Farklı Kaydet → CSV UTF-8; `.xlsx` doğrudan desteklenmez. Noktalı virgül veya virgül ayırıcı kabul edilir. Her satırda barkod, ürün adı, idefix fiyatı zorunlu; Trendyol URL isteğe bağlıdır.

```csv
barkod;urun_adi;idefix_fiyat;trendyol_url
8690000000000;Örnek ürün;1499;
```

URL sütununu CSV'de veya ürün satırındaki bağlantı alanında doldurun. Yüklenen kayıtlar barkoda göre birleştirilir. URL değiştiğinde eski fiyat ve geçmiş silinir; yanlış ürünle karşılaştırma devam etmez. Fark = idefix fiyatı − Trendyol fiyatı. Fark yüzdesi = fark / Trendyol fiyatı × 100. CSV raporu aktarılır; fiyat geçmişinin tam yedeği değildir.

Önceki yalnızca manuel fiyat girişli sürüm `/index.html` sayfasında korunmuştur.

## Güvenlik / sınırlamalar

- Trendyol'un sözleşmesindeki otomatik veri toplama şartlarını doğrulayın. Kullanıcı beyanı tek başına platformdan yazılı izin alındığının kanıtı değildir.
- Sunucu yalnızca HTTPS Trendyol ürün URL'lerine gider; yönlendirmeleri izlemez; 8,5 saniye zaman aşımı uygular. Proxy rotasyonu, CAPTCHA aşma veya giriş engeli aşma yoktur.
- API anonim kullanıma açık olduğundan erişim koruması ve sunucu tarafı kullanıcı kimlik doğrulaması olmadan scraping bayrağını açmayın.
- HTML yapılandırılmış fiyatı satış kampanyası, sepet indirimi, kargo, satıcı seçenekleri veya bölgeye göre görünen son fiyatla farklı olabilir. Fiyatı satın alma kararında insan kontrolünden geçirin.
- Canlı ticari sürüm için veritabanı, oturum açma, erişim yetkileri, maliyet kontrolü, sunucu cron'u, eşleştirme servisi, otomatik testler ve veri kullanım sözleşmesi gerekir.
