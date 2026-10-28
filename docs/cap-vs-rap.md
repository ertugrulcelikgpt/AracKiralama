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
| İş mantığı | `srv/rental-service.js` (`cds.ApplicationService` sınıfı, handler'lar) | Behavior Definition (BDEF) + Behavior Implementation sınıfı |
| Validasyon (K1–K4, K6) | `before('SAVE')` + `req.error({ target: 'in/...' })` | `validation ... on save` + `failed` / `reported` |
| Hesaplama (K5) | `after('PATCH')` handler + `@Common.SideEffects` | `determination ... on modify` + `side effects` |
| Action'lar | `action approve() returns Rentals` + `this.on('approve')` | `action approve result [1] $self;` + action metodu |
| Dinamik buton | `@Core.OperationAvailable` (`$edmJson` ifadesi) | `features : instance` (`get_instance_features`) |
| Düzenleme kilidi (K7) | `@UI.UpdateHidden` + `before('EDIT')` | `%update` instance feature (`fc-o-disabled`) |
| Numara üretimi (K8) | Kaydet'te `max + 1` + `@assert.unique` | `early` / `late numbering` veya number range object |
| Veri erişimi | CQL (`SELECT.from(...)`, `UPDATE(...)`) | EML (`READ ENTITIES`, `MODIFY ENTITIES`) |
| Hata mesajları | `_i18n/messages*.properties` + `req.error('KEY')` | Mesaj sınıfı (SE91 / ADT) + `new_message( id number )` |
| Transaction | Her istek otomatik bir transaction | RAP LUW: interaction phase + save sequence |
| Yetki (rol) | `@requires: 'RentalAgent'` | Yetki nesnesi + PFCG rolü |
| Yetki (işlem bazında) | `@restrict: [{ grant: ['approve'], to: 'RentalManager' }]` | `authorization master` + `get_global/instance_authorizations` |
| Okuma yetkisi / satır filtresi | `@restrict` + `where` | DCL (`define role ... grant select ... where`) |
| Lokal test kullanıcıları | `mocked` auth, `package.json` kullanıcıları | Sistemde test kullanıcısı + PFCG rolü |
| Bulut yetki yapılandırması | `xs-security.json` (XSUAA scope, role-template, role-collection) | IAM App + Business Catalog + Business Role (BTP ABAP Environment) |
| UI | `@UI` anotasyonları (`app/*/annotations.cds`) | Metadata Extension (`annotate view ... with`, `@UI.lineItem` ...) |
| Value help | `@Common.ValueList` / `@Common.ValueListWithFixedValues` | `@Consumption.valueHelpDefinition` |
| Kod yerine metin | `@Common.Text` + `TextArrangement` | `@ObjectModel.text.element` / `text.association` |
| Uygulama iskeleti | `webapp/manifest.json` + `Component.js` + `index.html` (elle) | Service Binding önizleme veya Fiori Tools generator |
| Launchpad | `app/index.html` sandbox + `fioriSandboxAppConfig.json` | FLP: Business Catalog + Space/Page + Launchpad App Descriptor Item |
| Test | `cds.test` + Mocha: gerçek OData istekleriyle entegrasyon testi, bellek içi SQLite | ABAP Unit (`FOR TESTING`) + test double'lar (`cl_botd_txbufdbl_bo_test_env`, `cl_osql_test_environment`) |
