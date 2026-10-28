# Sözlük

> Terimler projede ilk kullanıldıkları aşamada eklenir.

| Terim | Açıklama |
|---|---|
| CAP (Cloud Application Programming Model) | SAP'nin iş uygulaması geliştirme çatısı (framework). Node.js veya Java ile çalışır; model (CDS) + servis + UI anotasyonlarından oluşur. |
| CDS (Core Data Services) | Veri modelini ve servisleri tanımladığımız dil. CAP'te `.cds` dosyaları; ABAP'ta da aynı isimde (ama farklı sözdizimli) bir dil var. |
| `cds watch` | Geliştirme sunucusu: modeli derler, servisleri yayınlar, dosya değişince yeniden başlar. |
| Profil (profile) | Ortama göre ayar seçme mekanizması (`[development]`, `[test]`, `[production]`). Kodu değiştirmeden veritabanı vb. değiştirilir. |
| `cds deploy` | Modeli veritabanı tablolarına çevirip oluşturur ve `db/data` CSV'lerini yükler. |
| Adaptör (database service) | CAP'in belirli bir veritabanıyla konuşan paketi: `@cap-js/postgres`, `@cap-js/sqlite`, `@cap-js/hana`. |
| SAP HANA | SAP'nin bellek içi (in-memory), kolon bazlı veritabanı. S/4HANA'nın kendi veritabanıdır. |
| BTP (Business Technology Platform) | SAP'nin bulut platformu; CAP uygulamaları genelde buraya deploy edilir. |
| ABAP | SAP'nin kendi programlama dili; S/4HANA'nın büyük kısmı ABAP ile yazılmıştır. |
| RAP (RESTful ABAP Programming Model) | ABAP dünyasında CAP'in karşılığı olan modern uygulama geliştirme modeli. |
| ADT (ABAP Development Tools) | ABAP geliştirmek için kullanılan Eclipse eklentisi. |
| Entity | Veritabanında tabloya, serviste OData entity set'ine dönüşen veri tanımı. |
| Aspect | Entity'lere eklenebilen hazır alan grubu (`cuid`, `managed`). |
| Association (ilişki) | Bağımsız bir kayda başvuru; tabloda yabancı anahtar sütunu oluşturur. |
| Composition (bileşim) | Parça-bütün ilişkisi; alt kalemler ana kayıtla birlikte yaşar ve silinir. |
| CodeList (kod listesi) | `code` + çok dilli `name`/`descr` alanlı küçük referans tablosu (statü, kategori vb.). |
| Localized | Çevirisi tutulan alan; `_texts` tablosu ve `localized_` view'ı ile çalışır. |
| Annotation (anotasyon) | `@` ile başlayan ek bilgi (`@title`, `@mandatory`, `@UI...`); modele davranış veya görünüm bilgisi ekler. |
| Calculated element | Tabloda saklanmayan, okuma anında hesaplanan alan (`fullName`). |
| CSN (Core Schema Notation) | CDS modelinin derlenmiş JSON hali; CAP çalışma zamanında bunu kullanır. |
| OData | REST tabanlı, standart sorgu dili olan (`$filter`, `$expand`...) veri protokolü. CAP varsayılan olarak V4 yayınlar. |
| `$metadata` / EDMX | Bir OData servisinin XML biçimindeki tanımı (entity'ler, alanlar, anotasyonlar). |
| Projection (projeksiyon) | Bir entity'nin servis içinde yayınlanan görünümü (`as projection on`). |
| Draft (taslak) | Kaydetmeden önce değişikliklerin ayrı bir tabloda tutulduğu düzenleme modeli. |
| IsActiveEntity | Draft entity'lerde anahtarın parçası: `true` aktif kayıt, `false` taslak. |
| DraftAdministrativeData | Taslağın kimin tarafından ne zaman oluşturulduğu ve kimde kilitli olduğu bilgisi. |
| Service Definition / Binding | RAP'te hangi entity'lerin yayınlandığı (definition) ve hangi protokolle (binding). |
| Event handler (olay işleyici) | `before` / `on` / `after` fazlarında bir olaya (`SAVE`, `PATCH`, `approve`...) bağlanan fonksiyon. |
| CQL (CDS Query Language) | CAP'in veritabanından bağımsız sorgu dili: `SELECT.from(...)`, `UPDATE(...)`, `INSERT.into(...)`. |
| Bound action | Bir entity kaydına bağlı işlem: `Rentals(...)/RentalService.approve`. |
| Side Effects | Fiori'ye "şu alan değişince şu alanları yeniden oku" diyen anotasyon (`@Common.SideEffects`). |
| `@Core.OperationAvailable` | Bir action butonunun hangi koşulda aktif olacağını tanımlayan anotasyon. |
| `req.error` / `req.reject` | Hata biriktirme / işlemi hemen durdurma. |
| BDEF (Behavior Definition) | RAP'te bir iş nesnesinin davranışını (CRUD, action, validation, determination) bildiren nesne. |
| EML (Entity Manipulation Language) | RAP'te iş nesnesini okuma/değiştirme dili: `READ ENTITIES`, `MODIFY ENTITIES`. |
| Authentication / Authorization | Kimlik doğrulama (kimsin? → 401) / yetkilendirme (izin var mı? → 403). |
| `@requires` / `@restrict` | Servis/entity için gereken rol / işlem bazında izinler. |
| Mocked auth | Lokal geliştirmede `package.json`'daki kullanıcılarla Basic Auth girişi. |
| XSUAA | BTP'nin kimlik ve yetki servisi; JWT token üretir. Yapılandırması `xs-security.json`. |
| Scope / Role template / Role collection | XSUAA'da teknik yetki / scope grubu şablonu / kullanıcıya atanan rol paketi. |
| JWT (JSON Web Token) | Kullanıcı kimliğini ve rollerini taşıyan imzalı token. |
| DCL (Data Control Language) | RAP'te CDS view'lar için okuma yetkisi tanımlama dili (`define role`). |
| Fiori Elements | Ekranı anotasyonlardan otomatik üreten SAP UI çatısı (OData V4 için `sap.fe`). |
| SAPUI5 / UI5 | SAP'nin JavaScript UI kütüphanesi; Fiori Elements bunun üzerinde çalışır. |
| Floorplan | Hazır sayfa düzeni: List Report, Object Page, Analytical List Page... |
| List Report / Object Page | Filtre + tablo ekranı / tek kaydın başlık + bölümlerden oluşan detay ekranı. |
| Facet | Object Page'deki bölüm (sekme). |
| Value Help | Alan için seçim penceresi veya açılır liste (`@Common.ValueList`). |
| Criticality | Değerin rengi/simgesi: 0 nötr, 1 kırmızı, 2 sarı, 3 yeşil, 5 mavi. |
| manifest.json | UI5 uygulamasının tanım dosyası (servis, sayfalar, yönlendirme, launchpad bilgisi). |
| Fiori Launchpad (FLP) | Uygulamaların kutucuk (tile) olarak sunulduğu giriş sayfası. Lokalde "sandbox". |
| Semantic object / action | Launchpad'de bir uygulamayı adresleyen çift: `Rentals-manage`. |
| Metadata Extension | RAP'te UI anotasyonlarının yazıldığı ayrı CDS nesnesi. |
| `cds.test` | CAP'in test aracı: sunucuyu test içinde başlatır, HTTP istekleri atmayı sağlar (`@cap-js/cds-test`). |
| Birim / entegrasyon testi | Tek fonksiyonu izole test etmek / tüm katmanları (OData → handler → veritabanı) birlikte test etmek. |
| Mocha / Jest | JavaScript test koşucuları (test runner). Bu projede ESM desteği için Mocha. |
| ABAP Unit | ABAP'ın birim test çatısı; RAP'te test double'larla birlikte kullanılır. |
| Test double | Testte gerçek bağımlılık (veritabanı, iş nesnesi) yerine kullanılan sahte nesne. |
| Collation | Bir veritabanının metinleri karşılaştırma/sıralama kuralı (ör. "Ö" nereye sıralanır). |
