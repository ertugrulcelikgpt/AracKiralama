# Mimari

> Bu doküman her aşamada güncellenir.

## Katmanlar

| Katman | Klasör | İçerik |
|---|---|---|
| Arayüz (UI) | `app/` | SAP Fiori Elements (OData V4) uygulamaları |
| Servis | `srv/` | CDS servis tanımları + JavaScript handler'ları (iş kuralları) |
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
    Integer rentalID
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
| `srv/field-control.cds` | `@UI.UpdateHidden` (K7), `@Common.SideEffects` (K5), `@Core.OperationAvailable` (action butonları) |
| `_i18n/messages*.properties` | Hata ve bilgi mesajları (EN/TR) |
