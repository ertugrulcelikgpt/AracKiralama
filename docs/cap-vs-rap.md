# CAP ve ABAP RAP Karşılaştırması

> Tablo her aşamada, o aşamada kurulan yapılarla doldurulur. Proje sonunda (Aşama 7) tamamlanmış olacak.

| Konu | Bu projede (CAP) | ABAP RAP karşılığı |
|---|---|---|
| Geliştirme ortamı | VS Code / BAS + Node.js, `cds watch` | ADT (Eclipse) + ABAP sistemi (BTP ABAP Environment veya S/4HANA) |
| Proje / paket | npm projesi (`package.json`), git deposu | ABAP paketi (`Z...`), transport request, abapGit |
| Veritabanı | Profil ile seçilir: PostgreSQL, SQLite, HANA | Her zaman ABAP sisteminin kendi veritabanı (SAP HANA) |
| Ortam ayarları | `package.json` → `cds` bölümü, profiller, `.env` | Sistem/client ayarları; ayrı "profil" kavramı yok |
| Veri modeli | `db/schema.cds` entity | Veritabanı tablosu + CDS view entity (`define root view entity`) |
| Ana/alt belge | `Composition of many` | `composition [0..*] of` / `association to parent` |
| İlişki | `Association to Vehicles` (FK `vehicle_ID`) | `association [1..1] to ZI_RENT_Vehicle` |
| Ortak alanlar | Aspect: `cuid`, `managed` | Tabloya elle eklenen alanlar + `@Semantics.user.createdBy` vb. |
| Kod listeleri / çeviri | `CodeList` + `localized` → `_texts` tablosu | Domain sabit değerleri veya text tablosu + `@ObjectModel.text.association` |
| Hesaplanan alan | `fullName : String = firstName \|\| ' ' \|\| lastName` | CDS view'da `concat_with_space(...) as FullName` |
| Benzersizlik | `@assert.unique` | Tabloda ikincil benzersiz indeks veya validation |
| Örnek veri | `db/data/*.csv` + `cds deploy` | Veri üreten bir ABAP sınıfı (`if_oo_adt_classrun`) |
| Servis | `service ... { entity ... as projection on }` | Projection view + Service Definition + Service Binding |
| Protokol / yol | Varsayılan OData V4, `@path: '/rental'` | Service Binding (OData V4 – UI / Web API) |
| Salt okunur yayın | `@readonly` | Behavior Definition'da `create/update/delete` olmaması veya `read-only` alanlar |
| Draft | `@odata.draft.enabled` + `_drafts` tablosu | `with draft;` + `draft table zrent_d_rental` |
| Taslak aksiyonları | `draftEdit`, `draftActivate`, taslağı DELETE | `draft action Edit / Activate / Discard / Resume` |
| Kilit | `DraftAdministrativeData.InProcessByUser` | `lock master` + taslak kilidi (exclusive lock) |
