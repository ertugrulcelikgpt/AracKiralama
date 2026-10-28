# CAP ve ABAP RAP Karşılaştırması

Bu proje SAP CAP (Node.js) ile yazıldı. Aynı uygulama ABAP dünyasında **RAP (RESTful ABAP Programming Model)**
ile yazılırdı. cap-sflight da RAP'in "Flight Reference Scenario"sunun (`/DMO/FLIGHT`) CAP karşılığıdır.
Aşağıdaki tablo bu projedeki her yapının RAP karşılığını verir. RAP kod örnekleri öğrenme notlarında
(`docs/ogrenme-notlari/`) bulunur; ABAP kodu çalıştırılamadığı için derlenmemiş, örnek amaçlıdır.

## Karşılaştırma tablosu

### Ortam ve proje
| Konu | Bu projede (CAP) | ABAP RAP karşılığı |
|---|---|---|
| Geliştirme ortamı | VS Code / BAS + Node.js, `cds watch` | ADT (Eclipse) + ABAP sistemi (BTP ABAP Environment veya S/4HANA) |
| Proje / paket | npm projesi (`package.json`), git deposu | ABAP paketi (`Z...`), transport request, abapGit |
| Veritabanı | Profil ile seçilir: PostgreSQL, SQLite, HANA | Her zaman ABAP sisteminin kendi veritabanı (SAP HANA) |
| Ortam ayarları | `package.json` → `cds` bölümü, profiller, `.env` | Sistem/client ayarları; ayrı "profil" kavramı yok |

### Veri modeli
| Konu | Bu projede (CAP) | ABAP RAP karşılığı |
|---|---|---|
| Veri modeli | `db/schema.cds` entity | Veritabanı tablosu + CDS view entity (`define root view entity`) |
| Ana/alt belge | `Composition of many` | `composition [0..*] of` / `association to parent` |
| İlişki | `Association to Vehicles` (FK `vehicle_ID`) | `association [1..1] to ZI_RENT_Vehicle` |
| Ortak alanlar | Aspect: `cuid`, `managed` | Tabloya elle eklenen alanlar + `@Semantics.user.createdBy` vb. |
| Kod listeleri / çeviri | `CodeList` + `localized` → `_texts` tablosu | Domain sabit değerleri veya text tablosu + `@ObjectModel.text.association` |
| Hesaplanan alan | `fullName : String = firstName \|\| ' ' \|\| lastName` | CDS view'da `concat_with_space(...) as FullName` |
| Benzersizlik | `@assert.unique` | Tabloda ikincil benzersiz indeks veya validation |
| Örnek veri | `db/data/*.csv` + `cds deploy` | Veri üreten bir ABAP sınıfı (`if_oo_adt_classrun`) |

### Servis ve draft
| Konu | Bu projede (CAP) | ABAP RAP karşılığı |
|---|---|---|
| Servis | `service ... { entity ... as projection on }` | Projection view + Service Definition + Service Binding |
| Protokol / yol | Varsayılan OData V4, `@path: '/rental'` | Service Binding (OData V4 – UI / Web API) |
| Salt okunur yayın | `@readonly` | Behavior Definition'da `create/update/delete` olmaması veya `read-only` alanlar |
| Draft | `@odata.draft.enabled` + `_drafts` tablosu | `with draft;` + `draft table zrent_d_rental` |
| Taslak aksiyonları | `draftEdit`, `draftActivate`, taslağı DELETE | `draft action Edit / Activate / Discard / Resume` |
| Kilit | `DraftAdministrativeData.InProcessByUser` | `lock master` + taslak kilidi (exclusive lock) |

### İş mantığı
| Konu | Bu projede (CAP) | ABAP RAP karşılığı |
|---|---|---|
| İş mantığı | `srv/rental-service.js` (`cds.ApplicationService` sınıfı, handler'lar) | Behavior Definition (BDEF) + Behavior Implementation sınıfı |
| Validasyon (K1–K4, K6) | `before('SAVE')` + `req.error({ target: 'in/...' })` | `validation ... on save` + `failed` / `reported` |
| Hesaplama (K5) | `after('PATCH')` handler + `@Common.SideEffects` | `determination ... on modify` + `side effects` |
| Action'lar | `action approve() returns Rentals` + `this.on('approve')` | `action approve result [1] $self;` + action metodu |
| Dinamik buton | `@Core.OperationAvailable` (`$edmJson` ifadesi) | `features : instance` (`get_instance_features`) |
| Düzenleme kilidi (K7) | `@UI.UpdateHidden` + `before('EDIT')` | `%update` instance feature (`fc-o-disabled`) |
| Numara üretimi (K8) | Kaydet'te `max + 1` + `@assert.unique` | `early` / `late numbering` veya number range object |
| Silme koruması (ana veri) | `srv/admin-service.js` → `before('DELETE')` + `req.reject(409)` | `precheck` on delete veya `features : instance` ile `%delete` |
| Veri erişimi | CQL (`SELECT.from(...)`, `UPDATE(...)`) | EML (`READ ENTITIES`, `MODIFY ENTITIES`) |
| Hata mesajları | `_i18n/messages*.properties` + `req.error('KEY')` | Mesaj sınıfı (SE91 / ADT) + `new_message( id number )` |
| Transaction | Her istek otomatik bir transaction | RAP LUW: interaction phase + save sequence |

### Yetki
| Konu | Bu projede (CAP) | ABAP RAP karşılığı |
|---|---|---|
| Yetki (rol) | `@requires: 'RentalAgent'` | Yetki nesnesi + PFCG rolü |
| Yetki (işlem bazında) | `@restrict: [{ grant: ['approve'], to: 'RentalManager' }]` | `authorization master` + `get_global/instance_authorizations` |
| Okuma yetkisi / satır filtresi | `@restrict` + `where` | DCL (`define role ... grant select ... where`) |
| Lokal test kullanıcıları | `mocked` auth, `package.json` kullanıcıları | Sistemde test kullanıcısı + PFCG rolü |
| Bulut yetki yapılandırması | `xs-security.json` (XSUAA scope, role-template, role-collection) | IAM App + Business Catalog + Business Role (BTP ABAP Environment) |

### Arayüz
| Konu | Bu projede (CAP) | ABAP RAP karşılığı |
|---|---|---|
| UI | `@UI` anotasyonları (`app/*/annotations.cds`) | Metadata Extension (`annotate view ... with`, `@UI.lineItem` ...) |
| Value help | `@Common.ValueList` / `@Common.ValueListWithFixedValues` | `@Consumption.valueHelpDefinition` |
| Kod yerine metin | `@Common.Text` + `TextArrangement` | `@ObjectModel.text.element` / `text.association` |
| Uygulama iskeleti | `webapp/manifest.json` + `Component.js` + `index.html` (elle) | Service Binding önizleme veya Fiori Tools generator |
| Launchpad | `app/index.html` sandbox + `fioriSandboxAppConfig.json` | FLP: Business Catalog + Space/Page + Launchpad App Descriptor Item |

### Analitik
| Konu | Bu projede (CAP) | ABAP RAP karşılığı |
|---|---|---|
| Analitik model | `AnalyticsService.RentalAnalytics` (projeksiyon, boyut + ölçü) | Küp view (`@Analytics.dataCategory: #CUBE`) + analitik sorgu (`provider contract analytical_query`) |
| Ölçünün toplanması | `@Aggregation.default: #SUM` | `@Aggregation.default: #SUM` (aynı anotasyon) |
| Tutar / para birimi | `@Semantics.amount.currencyCode`, `@Semantics.currencyCode` | Aynı anotasyonlar |
| Toplama protokolü | OData `$apply` (CAP kendisi çevirir) | OData `$apply` veya InA protokolü (SAP Analytics Cloud) |
| Analiz ekranı | Analytical List Page (`UI.Chart` + analitik tablo) | ALP veya Multidimensional Report (Fiori) |

### Entegrasyon ve test
| Konu | Bu projede (CAP) | ABAP RAP karşılığı |
|---|---|---|
| Uzak API tüketimi | `cds import` (EDMX → CSN) + `cds.connect.to('API_BUSINESS_PARTNER')` | Service Consumption Model (EDMX → proxy) + `/iwbep/cl_cp_factory_remote` |
| Uzak veriyi yayınlamak | Uzak entity'nin projeksiyonu + `on('READ')` → `bupa.run(req.query)` | Custom entity + query provider (`if_rap_query_provider`) |
| Bağlantı bilgisi | `cds.requires` credentials: mock / sandbox (`APIKey`) / Destination | Communication Scenario + Communication Arrangement |
| Uzak servisi taklit etmek | `--with-mocks` + `srv/external/data/*.csv` | ABAP Unit'te proxy için test double |
| Servis düzeyi işlem | Unbound action `importFromS4` | `static action` |
| Test | `cds.test` + Mocha: gerçek OData istekleriyle entegrasyon testi, bellek içi SQLite | ABAP Unit (`FOR TESTING`) + test double'lar (`cl_botd_txbufdbl_bo_test_env`, `cl_osql_test_environment`) |

## Hangi senaryoda CAP, hangisinde RAP?

**RAP tercih edilir:**
- Uygulama S/4HANA'nın **içinde** çalışacaksa (on-stack extension), örneğin standart tablolara doğrudan erişen,
  aynı transaction'da standart BAPI/EML çağıran bir uzantı.
- Ekip ABAP biliyorsa ve sistem zaten bir ABAP sistemiyse (S/4HANA, BTP ABAP Environment).
- "Clean core" ilkesiyle S/4HANA Cloud'da geliştirme yapılacaksa (ABAP Cloud, released API'ler).
- Number range, yetki nesnesi, transport, mesaj sınıfı gibi ABAP altyapısının hazır gelmesi isteniyorsa.

**CAP tercih edilir:**
- Uygulama S/4HANA'nın **yanında** çalışacaksa (side-by-side extension, Aşama 8): kendi veritabanı, kendi yaşam
  döngüsü, S/4'e API ile bağlantı.
- Ekip JavaScript/TypeScript veya Java biliyorsa.
- Birden fazla sistemi (S/4, SuccessFactors, üçüncü parti API'ler) birleştiren, bulut yerlisi (cloud-native) bir
  uygulama gerekiyorsa.
- Veritabanı seçiminde esneklik isteniyorsa (HANA, PostgreSQL), lokalde hızlı geliştirme ve test önemliyse.
- Çok kiracılı (multitenant) SaaS uygulaması geliştirilecekse.

**Bu proje için:** Araç kiralama, S/4HANA'nın standart süreçlerinden bağımsız, kendi verisi olan bir uygulama;
müşteri verisini S/4'ten içe aktarıyor (Aşama 8, [`s4-entegrasyonu.md`](s4-entegrasyonu.md)). Bu, CAP için tipik
bir side-by-side senaryodur. Kiralama doğrudan S/4HANA'daki bir standart belgeye (ör. satış siparişi) bağlansaydı
RAP daha doğal olurdu.

## RAP'i ücretsiz denemek

| Seçenek | Ne sunar | Not |
|---|---|---|
| **SAP BTP ABAP Environment (trial)** | Bulutta bir ABAP sistemi; ADT ile bağlanılır, RAP ve ABAP Cloud ile geliştirilir | SAP BTP trial hesabından "ABAP environment" kurulur; deneme süresi sınırlıdır |
| **ABAP Cloud Developer Trial** | Kendi bilgisayarında (Docker) çalışan tam bir ABAP sistemi | Yüksek bellek ve disk ister (onlarca GB); Windows'ta Docker Desktop + WSL2 ile çalışır |

Her ikisinde de SAP'nin hazır örneği **`/DMO/FLIGHT`** (Flight Reference Scenario) bulunur veya abapGit ile
kurulabilir. cap-sflight'ın birebir RAP karşılığı budur; bu projeyi RAP'e çevirirken en iyi şablondur.

## RAP öğrenmek için önerilen resmi kaynaklar

- **learning.sap.com:** "ABAP RESTful Application Programming Model" ve "ABAP Cloud" öğrenme yolları (ücretsiz).
- **SAP Help Portal:** "ABAP RESTful Application Programming Model" dokümantasyonu (BDEF, EML, draft, numbering).
- **GitHub SAP-samples:** `abap-platform-refscen-flight` (`/DMO/FLIGHT` kaynak kodu, abapGit ile kurulur).
- **cap-sflight** (`SAP-samples/cap-sflight`): aynı senaryonun CAP hali; iki yaklaşımı yan yana okumak için.
- **Bu projenin öğrenme notları:** her aşamanın sonunda "ABAP RAP'teki karşılığı" bölümü ve örnek kod.

Öneri: Bu projenin küçük bir parçasını (ör. sadece `Vehicles` ve filo yönetimi) BTP ABAP Environment trial'da
RAP ile yeniden yazmak, iki modeli kalıcı olarak öğrenmenin en iyi yoludur.
