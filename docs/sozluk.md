# Sözlük

Projede geçen SAP ve CAP terimleri, alfabetik sırayla. Aşama numarası verilen terimler o aşamada kullanılmaya başlar.

| Terim | Açıklama |
|---|---|
| ABAP | SAP'nin kendi programlama dili; S/4HANA'nın büyük kısmı ABAP ile yazılmıştır. |
| ABAP Unit | ABAP'ın birim test çatısı; RAP'te test double'larla birlikte kullanılır. |
| Adaptör (database service) | CAP'in belirli bir veritabanıyla konuşan paketi: `@cap-js/postgres`, `@cap-js/sqlite`, `@cap-js/hana`. |
| ADT (ABAP Development Tools) | ABAP geliştirmek için kullanılan Eclipse eklentisi. |
| Annotation (anotasyon) | `@` ile başlayan ek bilgi (`@title`, `@mandatory`, `@UI...`); modele davranış veya görünüm bilgisi ekler. |
| Aspect | Entity'lere eklenebilen hazır alan grubu (`cuid`, `managed`). |
| Association (ilişki) | Bağımsız bir kayda başvuru; tabloda yabancı anahtar sütunu oluşturur. |
| Authentication / Authorization | Kimlik doğrulama (kimsin? → 401) / yetkilendirme (izin var mı? → 403). |
| BDEF (Behavior Definition) | RAP'te bir iş nesnesinin davranışını (CRUD, action, validation, determination) bildiren nesne. |
| Birim / entegrasyon testi | Tek fonksiyonu izole test etmek / tüm katmanları (OData → handler → veritabanı) birlikte test etmek. |
| Bound action | Bir entity kaydına bağlı işlem: `Rentals(...)/RentalService.approve`. |
| BTP (Business Technology Platform) | SAP'nin bulut platformu; CAP uygulamaları genelde buraya deploy edilir. |
| Business Partner | S/4HANA'da müşteri, tedarikçi gibi tüm iş ortaklarının ortak ana veri nesnesi (`API_BUSINESS_PARTNER`, Aşama 8). |
| Calculated element | Tabloda saklanmayan, okuma anında hesaplanan alan (`fullName`). |
| CAP (Cloud Application Programming Model) | SAP'nin iş uygulaması geliştirme çatısı (framework). Node.js veya Java ile çalışır; model (CDS) + servis + UI anotasyonlarından oluşur. |
| CDS (Core Data Services) | Veri modelini ve servisleri tanımladığımız dil. CAP'te `.cds` dosyaları; ABAP'ta da aynı isimde (ama farklı sözdizimli) bir dil var. |
| `cds deploy` | Modeli veritabanı tablolarına çevirip oluşturur ve `db/data` CSV'lerini yükler. |
| `cds watch` | Geliştirme sunucusu: modeli derler, servisleri yayınlar, dosya değişince yeniden başlar. |
| `cds.test` | CAP'in test aracı: sunucuyu test içinde başlatır, HTTP istekleri atmayı sağlar (`@cap-js/cds-test`). |
| Cloud Connector | Şirket içindeki (on-premise) sistemleri BTP'ye güvenli tünelle bağlayan SAP yazılımı. |
| CodeList (kod listesi) | `code` + çok dilli `name`/`descr` alanlı küçük referans tablosu (statü, kategori vb.). |
| Collation | Bir veritabanının metinleri karşılaştırma/sıralama kuralı (ör. "Ö" nereye sıralanır). |
| Composition (bileşim) | Parça-bütün ilişkisi; alt kalemler ana kayıtla birlikte yaşar ve silinir. |
| `@Core.OperationAvailable` | Bir action butonunun hangi koşulda aktif olacağını tanımlayan anotasyon. |
| CQL (CDS Query Language) | CAP'in veritabanından bağımsız sorgu dili: `SELECT.from(...)`, `UPDATE(...)`, `INSERT.into(...)`. |
| Criticality | Değerin rengi/simgesi: 0 nötr, 1 kırmızı, 2 sarı, 3 yeşil, 5 mavi. |
| CSN (Core Schema Notation) | CDS modelinin derlenmiş JSON hali; CAP çalışma zamanında bunu kullanır. |
| DCL (Data Control Language) | RAP'te CDS view'lar için okuma yetkisi tanımlama dili (`define role`). |
| Destination | BTP'de uzak bir sistemin adresini ve kimlik bilgisini koddan ayrı tutan bağlantı tanımı (Aşama 8, 10). |
| Draft (taslak) | Kaydetmeden önce değişikliklerin ayrı bir tabloda tutulduğu düzenleme modeli. |
| DraftAdministrativeData | Taslağın kimin tarafından ne zaman oluşturulduğu ve kimde kilitli olduğu bilgisi. |
| EML (Entity Manipulation Language) | RAP'te iş nesnesini okuma/değiştirme dili: `READ ENTITIES`, `MODIFY ENTITIES`. |
| Entity | Veritabanında tabloya, serviste OData entity set'ine dönüşen veri tanımı. |
| Event handler (olay işleyici) | `before` / `on` / `after` fazlarında bir olaya (`SAVE`, `PATCH`, `approve`...) bağlanan fonksiyon. |
| Facet | Object Page'deki bölüm (sekme). |
| Fiori Elements | Ekranı anotasyonlardan otomatik üreten SAP UI çatısı (OData V4 için `sap.fe`). |
| Fiori Launchpad (FLP) | Uygulamaların kutucuk (tile) olarak sunulduğu giriş sayfası. Lokalde "sandbox". |
| Floorplan | Hazır sayfa düzeni: List Report, Object Page, Analytical List Page... |
| HDI (HANA Deployment Infrastructure) | HANA'da her uygulamaya ayrı, izole bir şema (HDI container) veren deploy mekanizması; tablolar `.hdbtable`, view'lar `.hdbview` dosyalarıyla oluşur (Aşama 10). |
| IsActiveEntity | Draft entity'lerde anahtarın parçası: `true` aktif kayıt, `false` taslak. |
| JWT (JSON Web Token) | Kullanıcı kimliğini ve rollerini taşıyan imzalı token. |
| List Report / Object Page | Filtre + tablo ekranı / tek kaydın başlık + bölümlerden oluşan detay ekranı. |
| Localized | Çevirisi tutulan alan; `_texts` tablosu ve `localized_` view'ı ile çalışır. |
| manifest.json | UI5 uygulamasının tanım dosyası (servis, sayfalar, yönlendirme, launchpad bilgisi). |
| Metadata Extension | RAP'te UI anotasyonlarının yazıldığı ayrı CDS nesnesi. |
| `$metadata` / EDMX | Bir OData servisinin XML biçimindeki tanımı (entity'ler, alanlar, anotasyonlar). |
| Mocha / Jest | JavaScript test koşucuları (test runner). Bu projede ESM desteği için Mocha. |
| Mocked auth | Lokal geliştirmede `package.json`'daki kullanıcılarla Basic Auth girişi. |
| MTA (Multi-Target Application) | BTP'ye birden fazla modülü (servis, veritabanı, arayüz, approuter) tek paket (`.mtar`) halinde deploy etme biçimi; tanımı `mta.yaml` (Aşama 10). |
| OData | REST tabanlı, standart sorgu dili olan (`$filter`, `$expand`...) veri protokolü. CAP varsayılan olarak V4 yayınlar. |
| Profil (profile) | Ortama göre ayar seçme mekanizması (`[development]`, `[test]`, `[production]`). Kodu değiştirmeden veritabanı vb. değiştirilir. |
| Projection (projeksiyon) | Bir entity'nin servis içinde yayınlanan görünümü (`as projection on`). |
| RAP (RESTful ABAP Programming Model) | ABAP dünyasında CAP'in karşılığı olan modern uygulama geliştirme modeli. |
| `req.error` / `req.reject` | Hata biriktirme / işlemi hemen durdurma. |
| `@requires` / `@restrict` | Servis/entity için gereken rol / işlem bazında izinler. |
| S/4HANA | SAP'nin HANA üzerinde çalışan ERP sistemi; büyük kısmı ABAP ile yazılmıştır. |
| SAP HANA | SAP'nin bellek içi (in-memory), kolon bazlı veritabanı. S/4HANA'nın kendi veritabanıdır. |
| SAPUI5 / UI5 | SAP'nin JavaScript UI kütüphanesi; Fiori Elements bunun üzerinde çalışır. |
| Scope / Role template / Role collection | XSUAA'da teknik yetki / scope grubu şablonu / kullanıcıya atanan rol paketi. |
| Semantic object / action | Launchpad'de bir uygulamayı adresleyen çift: `Rentals-manage`. |
| Service Consumption Model | RAP'te uzak bir OData servisinin EDMX'inden ABAP proxy'si üreten nesne (CAP'te `cds import`). |
| Service Definition / Binding | RAP'te hangi entity'lerin yayınlandığı (definition) ve hangi protokolle (binding). |
| Side Effects | Fiori'ye "şu alan değişince şu alanları yeniden oku" diyen anotasyon (`@Common.SideEffects`). |
| Side-by-side extension | S/4HANA'yı içinden değiştirmeden, yanında (BTP'de) çalışan ve ona API ile bağlanan uzantı uygulaması. Bu proje böyledir. |
| Test double | Testte gerçek bağımlılık (veritabanı, iş nesnesi) yerine kullanılan sahte nesne. |
| Value Help | Alan için seçim penceresi veya açılır liste (`@Common.ValueList`). |
| XSUAA | BTP'nin kimlik ve yetki servisi; JWT token üretir. Yapılandırması `xs-security.json`. |
