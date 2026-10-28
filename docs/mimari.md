# Mimari

> Bu doküman her aşamada güncellenir. İstek akışı diyagramı Aşama 2–3'te eklenecek.

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
