# Mimari

RentACar, SAP CAP (Node.js) üzerinde katmanlı bir uygulamadır: Fiori Elements arayüzü OData V4 ile CAP servislerine
bağlanır; servisler iş kurallarını uygular ve veriyi profil ile seçilen veritabanında tutar.

İçindekiler: [Genel bakış](#genel-bakış) · [Katmanlar](#katmanlar) · [Veritabanı seçimi](#veritabanı-seçimi-profiller) ·
[Veri modeli](#veri-modeli) · [Servisler](#servisler) · [İstek akışı](#istek-akışı) ·
[İş mantığı dosyaları](#iş-mantığı-dosyaları) · [Yetkilendirme](#yetkilendirme) · [Arayüz](#arayüz) · [Testler](#testler)

## Genel bakış

```mermaid
flowchart TB
  subgraph Tarayici["Tarayıcı"]
    FLP["Launchpad sandbox<br/>app/index.html"]
    UIR["Kiralama Yönetimi<br/>app/rentals"]
    UIV["Filo Yönetimi<br/>app/vehicles"]
  end
  subgraph CAP["CAP sunucusu (Node.js)"]
    AUTH["Kimlik / yetki<br/>mocked → XSUAA · srv/auth.cds"]
    RS["RentalService /rental<br/>srv/rental-service.js · K1–K8, action'lar"]
    AS["AdminService /admin<br/>srv/admin-service.js · silme koruması"]
    MODEL["CDS modeli<br/>db/*.cds"]
  end
  subgraph DB["Veritabanı (profil)"]
    PG[("PostgreSQL<br/>development")]
    SQ[("SQLite<br/>test")]
    HA[("SAP HANA Cloud<br/>production")]
  end
  FLP --> UIR & UIV
  UIR -- "OData V4" --> AUTH
  UIV -- "OData V4" --> AUTH
  AUTH --> RS & AS
  RS & AS --> MODEL
  MODEL --> PG & SQ & HA
```

## Katmanlar

| Katman | Klasör | İçerik |
|---|---|---|
| Arayüz (UI) | `app/` | Fiori Elements (OData V4): `app/rentals` (Kiralama Yönetimi), `app/vehicles` (Filo Yönetimi), `app/index.html` (launchpad sandbox) |
| Servis | `srv/` | CDS servis tanımları, yetkiler (`auth.cds`), JavaScript handler'ları (iş kuralları) |
| Veri modeli | `db/` | CDS entity'leri, kod listeleri, örnek CSV verileri |
| Veritabanı | — | PostgreSQL (lokal), SQLite (test), SAP HANA Cloud (production) |

## Veritabanı seçimi (profiller)

```mermaid
flowchart LR
  M[CDS modeli] --> D{Profil}
  D -- development --> PG[(PostgreSQL 16<br/>Docker)]
  D -- test --> SQ[(SQLite<br/>in-memory)]
  D -- production --> HA[(SAP HANA Cloud)]
```

Aynı CDS modeli, profil hangi veritabanını seçerse onun SQL diline (dialect) derlenir. Kod değişmez.

## Veri modeli

`db/schema.cds` işlem verilerini (kiralama), `db/master-data.cds` ana verileri ve kod listelerini, `db/labels.cds`
alan etiketlerini içerir.

```mermaid
erDiagram
  Rentals ||--o{ RentalExtras : "extras (composition)"
  Rentals }o--|| Customers : customer
  Rentals }o--|| Vehicles : vehicle
  Rentals }o--|| Branches : "pickupBranch / returnBranch"
  Rentals }o--|| RentalStatus : status
  RentalExtras }o--|| Extras : extra
  Vehicles }o--|| VehicleCategories : category
  Vehicles }o--|| FuelTypes : fuelType
  Vehicles }o--|| TransmissionTypes : transmission
  Vehicles }o--|| VehicleStatus : status
  Vehicles }o--|| Branches : homeBranch

  Rentals {
    UUID ID PK
    Integer rentalID UK
    UUID customer_ID FK
    UUID vehicle_ID FK
    String pickupBranch_code FK
    String returnBranch_code FK
    Date pickupDate
    Date returnDate
    Integer rentalDays
    Decimal totalPrice
    String status_code FK
  }
  RentalExtras {
    UUID ID PK
    UUID rental_ID FK
    String extra_code FK
    Integer quantity
    Decimal amount
  }
  Vehicles {
    UUID ID PK
    String plate UK
    String category_code FK
    String homeBranch_code FK
    String status_code FK
    Decimal dailyRate
    Integer mileage
  }
  Customers {
    UUID ID PK
    String firstName
    String lastName
    Date birthDate
    Date licenseIssueDate
  }
  Branches {
    String code PK
    String name
    String city
  }
  Extras {
    String code PK
    String name
    Decimal dailyPrice
  }
  VehicleCategories {
    String code PK
    Integer minDriverAge
    Integer minLicenseYears
  }
  RentalStatus {
    String code PK
    Integer criticality
  }
```

Kod listeleri (`VehicleCategories`, `FuelTypes`, `TransmissionTypes`, `VehicleStatus`, `RentalStatus`) ve `Extras`
çok dillidir: her biri için bir `_texts` tablosu ve bir `localized_` view'ı oluşur.

## Servisler

| Servis | Yol | Entity'ler | Not |
|---|---|---|---|
| `RentalService` | `/rental` | `Rentals` (draft), `RentalExtras`, `Customers`; salt okunur: `Vehicles`, `Branches`, `Extras`, kod listeleri | Şube çalışanı ve yönetici |
| `AdminService` | `/admin` | `Vehicles` (draft), `Branches`, `Extras`, `VehicleCategories`; salt okunur: diğer kod listeleri | Filo yöneticisi |

## İstek akışı

Fiori'de bir kiralamayı düzenleyip kaydetmek (draft akışı):

```mermaid
sequenceDiagram
  actor U as Kullanıcı
  participant F as Fiori Elements
  participant S as CAP RentalService
  participant D as PostgreSQL
  U->>F: "Düzenle"
  F->>S: POST Rentals(...,IsActiveEntity=true)/draftEdit
  S->>D: aktif satırı rentalservice_rentals_drafts'a kopyala + kilit (DraftAdministrativeData)
  U->>F: alan değiştir
  F->>S: PATCH Rentals(...,IsActiveEntity=false)
  S->>D: sadece taslak satırı güncelle
  S->>D: after('PATCH'): K5 fiyatı yeniden hesapla, taslağa yaz
  F->>S: GET fiyat alanları (@Common.SideEffects)
  U->>F: "Kaydet"
  F->>S: POST Rentals(...,IsActiveEntity=false)/draftActivate
  S->>S: before('SAVE'): K1–K4, K6 doğrulama, K5 fiyat, K8 numara
  S->>D: rentacar_rentals'a yaz, taslağı sil
  S-->>F: aktif kayıt (IsActiveEntity=true)
```

## İş mantığı dosyaları

| Dosya | İçerik |
|---|---|
| `srv/rental-service.js` | K1–K8 kuralları ve 5 action (her kural ayrı fonksiyon); `calculatePrice` saf fonksiyon olarak dışa aktarılır |
| `srv/admin-service.js` | Kiralamalarda kullanılan araç, şube veya ek hizmetin silinmesini engeller (409 `*_IN_USE`) |
| `srv/field-control.cds` | `@UI.UpdateHidden` (K7), `@UI.DeleteHidden`, `@Common.SideEffects` (K5, action'lar), `@Core.OperationAvailable` (action butonları + `canManage`) |
| `_i18n/messages*.properties` | Hata ve bilgi mesajları (EN/TR) |

## Yetkilendirme

`srv/auth.cds`:

| İşlem | RentalAgent | RentalManager (+ Agent) | FleetAdmin |
|---|---|---|---|
| RentalService okuma | ✅ | ✅ | ❌ 403 |
| Kiralama oluşturma / düzenleme (draft) | ✅ | ✅ | ❌ |
| Kaydedilmiş kiralamayı silme | ❌ 403 | ❌ 403 | ❌ |
| `complete`, `cancel` | ✅ | ✅ | ❌ |
| `approve`, `reject`, `applyDiscount` | ❌ 403 | ✅ | ❌ |
| Müşteri ekleme / düzenleme | ✅ | ✅ | ❌ |
| AdminService (araç, şube, ek hizmet) | ❌ 403 | ❌ 403 | ✅ |
| Giriş yapılmamış | 401 | 401 | 401 |

## Arayüz

```mermaid
flowchart LR
  FLP["app/index.html<br/>Launchpad sandbox"] -->|Rentals-manage| R["app/rentals<br/>List Report + Object Page"]
  FLP -->|Vehicles-manage| V["app/vehicles<br/>List Report + Object Page"]
  R -->|OData V4 /rental| RS[RentalService]
  V -->|OData V4 /admin| AS[AdminService]
  UI5[(ui5.sap.com<br/>SAPUI5 1.153.0)] -.-> FLP & R & V
```

| Uygulama | Kullanıcı | Servis | Anotasyonlar |
|---|---|---|---|
| Kiralama Yönetimi | agent, manager | `/rental` | `app/rentals/annotations.cds`, `app/common.cds`, `srv/field-control.cds` |
| Filo Yönetimi | admin | `/admin` | `app/vehicles/annotations.cds`, `app/common.cds` |

## Testler

```mermaid
flowchart LR
  T["Mocha<br/>test/*.test.js"] --> CT["cds.test<br/>(tek sunucu, test/helpers.js)"]
  CT -- "npm test" --> SQ[("SQLite :memory:")]
  CT -- "npm run test:pg" --> PG[("PostgreSQL<br/>rentacar_test")]
```

| Test dosyası | Kapsam |
|---|---|
| `test/pricing.test.js` | K5 formülü (birim testi) |
| `test/rental-rules.test.js` | Draft akışı, K1–K8, taslakta anlık fiyat |
| `test/rental-actions.test.js` | 5 action |
| `test/auth.test.js` | 401/403, rol bazlı izinler |
| `test/admin.test.js` | Ana veri silme koruması |

