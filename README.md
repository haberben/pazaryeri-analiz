# Pazaryeri Analiz — idefix → Trendyol

Türkçe, API gerektirmeyen **yerel prototip**: idefix ürünlerini CSV ile içeri aktarır, doğruladığınız Trendyol eşleşmeleri için elle/CSV ile sağlanan rakip fiyatlarını karşılaştırır, fiyat farkı, geçmişi ve raporu gösterir.

> **Dürüst durum:** Bu depo henüz canlı Trendyol fiyatlarını aramaz veya çekmez; 4 saatlik otomatik güncelleme ve bildirim servisleri yoktur. Çok kullanıcılı SaaS, oturum açma, bulut veritabanı veya gerçek Excel `.xlsx` yükleme henüz uygulanmadı. Rakip fiyatı için izinli ve güvenilir veri kaynağı doğrulanmadan otomatik çekim eklenmeyecek.

## Çalıştırma

`index.html` dosyasını tarayıcıda açın veya statik HTTP sunucusu ile servis edin. Derleme veya Node bağımlılığı yoktur.

## Vercel yayınlama

1. Vercel hesabınızda **Add New → Project** seçeneğiyle `haberben/pazaryeri-analiz` GitHub deposunu içeri alın.
2. Framework Preset: **Other**; Root Directory: `./`. Build Command ve Output Directory alanlarını boş bırakın (statik dosya kök dizinde).
3. Deploy'e basın. Yayımlama işlemi kullanıcı tarafından Vercel'de tamamlanmalıdır; bu depoya dosyaların gönderilmesi otomatik olarak sitenin yayınlandığını göstermez.

**Uyarı:** Henüz oturum açma ve sunucu depolaması bulunmadığından bunu üretim amaçlı gizli satıcı verisiyle kullanmayın. Prototipi herkese açık dağıtırsanız kullanıcıların ürün verisi tarayıcılarının `localStorage` alanında tutulur; başka cihazlar arasında senkronize edilmez.

## Ürün CSV biçimi

CSV UTF-8 dosyasının ilk satırında şu sütunlar bulunmalıdır:

```csv
barkod;urun_adi;idefix_fiyat;maliyet;trendyol_url
8690000000000;Örnek ürün;1499;1000;
```

`barkod`, `urun_adi`, `idefix_fiyat` zorunludur. Ürünler barkoda göre eklenir/güncellenir. `maliyet` ve `trendyol_url` isteğe bağlıdır. Excel'de **Farklı Kaydet → CSV UTF-8** seçin; doğrudan `.xlsx` desteklenmez. Arayüzden örnek şablon indirebilirsiniz.

Ürün kartında **Düzenle** ile Trendyol ürün linkini girin, barkod/model/varyantı elle doğrulayın ve **Ben doğruladım** seçeneğini işaretleyin. Fiyat dosyası yalnızca bu eşleşmesi onaylı ürünleri günceller.

## Rakip fiyat CSV biçimi

```csv
barkod;rakip_fiyat;satici
8690000000000;1399;Örnek rakip
```

Buradaki rakip fiyatları sizin sağladığınız verilerdir; uygulama otomatik arama/sorgu yapmaz. Rakip fiyat değiştiğinde tarayıcıda bir tarihsel kayıt oluşur. En son veri zamanı da görüntülenir. İhracat dosyası analiz sonuçlarını içerir; geçmişin tam yedeği değildir.

## Hesaplar

- Fark (TL) = idefix fiyatı − Trendyol fiyatı.
- Fark (%) = fark / Trendyol fiyatı × 100; rakip fiyatı sıfır ise yüzde gösterilmez.
- Tahmini kâr = idefix fiyatı − girdiğiniz ürün maliyeti. **Komisyon, kargo, vergi, iadeler dahil değildir.**
- Yalnızca doğrulanmış eşleşmelere ait fiyatlar analiz toplamlarına girer.

## Güvenlik ve veriler

- Girdiğiniz URL'ler HTTPS ve `trendyol.com` alan adı ile sınırlandırılır.
- Görüntülenen ürün metinleri HTML'e karşı kaçışlanır.
- Yerel veriler sadece geçerli tarayıcının `localStorage` alanında kalır. Tarayıcı verileri silinirse kaybolabilir; düzenli CSV indirin.
- Gizli API anahtarı, oturum bilgisi veya canlı ürün veri akışı yoktur. Gelecekteki anahtarlar yalnızca sunucu ortam değişkenleriyle tutulmalı, GitHub'a eklenmemelidir.

## Sonraki geliştirme aşamaları

1. Yetkili/lisanslı Trendyol veri kaynağıyla erişim ve fiyat doğruluğu testi; kullanım koşullarının hukuk incelemesi.
2. Sunucu tarafı ürün eşleştirme ve veri doğrulama, manuel onay akışı.
3. Gerçek oturum açma, kullanıcı/mağaza izolasyonu ve kalıcı bulut veritabanı.
4. Sağlayıcı izin veriyorsa Vercel Cron veya uygun worker üzerinden **4 saatte bir** sorgu, hata izleme, limit yönetimi ve son başarılı kontrol zamanı.
5. Sunucu tabanlı alarmlar, ücretlendirme ve Hepsiburada entegrasyonu.

Bu prototip otomatik scraping, CAPTCHA/proxy aşma veya yetkisiz veri çekimi içermez.
