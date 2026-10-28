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
