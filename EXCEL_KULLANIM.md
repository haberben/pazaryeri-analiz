# Orijinal iki Excel raporuyla toplu yükleme

Uygulamanın ana sayfası (`/`, `live.html`) artık **idefix Havuz Ürün Bilgileri Raporu** ile **Trendyol tüm ürünler detaylı** formatlarını doğrudan `.xlsx` olarak okur. Tarayıcıda Excel okuyucu kitaplığı için internet bağlantısı gerekir. Dosyalar sunucuya yüklenmez; bu prototipte yalnızca yüklemeyi yaptığınız tarayıcının depolamasına yazılır.

1. **1 · idefix Excel** alanında `Havuz Ürün Bilgileri Raporu (...).xlsx` dosyanızı seçin. Başlık ilk satırda olmasa da `Barkod` / `Ürün Adı` bulunur. `Havuz Ürün ID`, marka ve varyant grubu saklanır. Aynı barkodun tekrarı tek ürün olarak içe alınır.
2. **2 · Trendyol Excel** alanında `...Trendyol tüm ... detaylı.xlsx` dosyanızı seçin. Barkod, ürün adı, marka, model, stok ve `Trendyol.com Linki` okunur. Katalog ayrı gösterilir; barkodu iki dosyada aynı olanlara ürün linki atanır.
3. Farklı barkodlu aynı ürünler otomatik olarak birleştirilmez. Trendyol kataloğunda isim/model arayın, **idefix ürünüyle eşleştir** düğmesine tıklayın, idefix barkodunu girin ve ürün + varyantın aynı olduğunu onaylayın.
4. idefix ürün tablosundaki **Sorgula** / **Bağlantılı ürünleri şimdi kontrol et** düğmesi yalnızca sunucudaki `/api/price` erişimi izinle etkinleştirilmişse ve ürün sayfasından doğrulanabilir fiyat okunuyorsa sonuç verir.

## Dosyalarda fiyat yok

Gönderdiğiniz idefix raporunda ürünün **satış fiyatı**, Trendyol raporunda da **ürünün fiyatı** sütunu bulunmuyor. Bu nedenle içe aktarma **fiyat uydurmaz**; idefix fiyatı yoksa TL/% farkı hesaplanmaz. Satış fiyatı içeren farklı bir idefix raporu aynı barkodlarla `idefix fiyat` veya `Satış Fiyatı` sütunuyla yüklenebilir. Önceden girilmiş fiyatlar, yeni yüklenen raporda fiyat yoksa korunur.

İki örnek dosyada idefix tarafında **3.647 veri satırı / 1.994 benzersiz barkod**, Trendyol tarafında **2.357 ürün / 2.357 benzersiz barkod** vardı. Barkod kesişimi **0** olduğundan bu özel iki dosya otomatik eşleşmez; kullanıcı onayıyla eşleştirme gerekir.

## Şu anki sınırlar

- Tarayıcıda dosyaların `.xlsx` çözümlemesi ve toplu ekleme kodlandı; Vercel üzerinde kullanıcı testi yapılmadı.
- Tarayıcı kapalıyken dört saatte bir sorgu çalışmaz; çok kullanıcı, hesap ve merkezi veritabanı yoktur.
- Kaynak erişimi reddederse bunun aşılması için CAPTCHA/proxy çözümü yoktur; eski fiyat yeni gibi gösterilmez.
- Bilgileri kaybetmemek için **Sonuçları indir** ile düzenli yedek alın. Tam ürün + fiyat geçmişi yedeği henüz bulunmaz.
