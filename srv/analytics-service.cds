using {rentacar as db} from '../db/schema';

// Yönetim analizleri: şube bazında ciro, kategori bazında kiralama sayısı, aylık trend.
// Sadece kesinleşmiş iş sayılır: onaylanmış (A) veya tamamlanmış (C) kiralamalar. Açık, reddedilen ve
// iptal edilen kiralamalar ciroya girmez.
service AnalyticsService @(path: '/analytics') {

  // Ölçüler (measure) toplanır, boyutlar (dimension) gruplanır. OData $apply ile:
  //   /analytics/RentalAnalytics?$apply=groupby((branch),aggregate(revenue))
  // @Aggregation.default, "aggregate(revenue)" isteğinde hangi toplama fonksiyonunun kullanılacağını söyler.
  @readonly
  @Aggregation.ApplySupported: {
    Transformations       : [
      'aggregate',
      'topcount',
      'bottomcount',
      'identity',
      'concat',
      'groupby',
      'filter',
      'orderby'
    ],
    Rollup                : #None,
    PropertyRestrictions  : true,
    // Metin alanları da gruplanabilir olmalı: Fiori kodun yanında metnini de gruplayarak okur
    GroupableProperties   : [
      branch,
      branchName,
      category,
      categoryName,
      pickupYear,
      pickupMonth,
      status,
      statusName,
      currency
    ],
    AggregatableProperties: [
      {Property: revenue},
      {Property: rentalCount},
      {Property: rentalDays}
    ]
  }
  @Aggregation.CustomAggregate #revenue    : 'Edm.Decimal'
  @Aggregation.CustomAggregate #rentalCount: 'Edm.Int32'
  @Aggregation.CustomAggregate #rentalDays : 'Edm.Int32'
  // Ciro para birimine bağlı (@Measures.ISOCurrency); UI5 toplamın para birimini de ister
  @Aggregation.CustomAggregate #currency   : 'Edm.String'
  @Capabilities.SearchRestrictions.Searchable: false
  entity RentalAnalytics as projection on db.Rentals {
    key ID,
        rentalNo,
        @Analytics.Dimension
        pickupBranch.code     as branch      : String(10),
        pickupBranch.name     as branchName,
        @Analytics.Dimension
        vehicle.category.code as category    : String(10),
        vehicle.category.name as categoryName,
        // Tarih fonksiyonları veritabanına göre çevrilir; metin YYYY-AA olarak tutulur ki sıralama doğru olsun.
        // substring OData kuralıyla 0'dan sayar.
        @Analytics.Dimension
        substring(cast(pickupDate as String(10)), 0, 4) as pickupYear  : String(4),
        @Analytics.Dimension
        substring(cast(pickupDate as String(10)), 0, 7) as pickupMonth : String(7),
        @Analytics.Dimension
        status.code           as status      : String(1),
        status.name           as statusName,
        // Para birimleri karışıksa CAP toplamı null döndürür (farklı para birimleri toplanamaz)
        @Analytics.Measure
        @Aggregation.default: #SUM
        @Semantics.amount.currencyCode: 'currency'
        totalPrice            as revenue,
        // Her satır bir kiralama; toplamı kiralama sayısını verir (countdistinct'e gerek kalmaz)
        @Analytics.Measure
        @Aggregation.default: #SUM
        1                     as rentalCount : Integer,
        @Analytics.Measure
        @Aggregation.default: #SUM
        rentalDays,
        @Semantics.currencyCode
        currency.code         as currency    : String(3)
  }
  where
    status.code in (
      'A', 'C'
    );

  // Filtre çubuğundaki value help'ler için
  @readonly
  entity Branches          as projection on db.Branches;

  @readonly
  entity VehicleCategories as projection on db.VehicleCategories;

  @readonly
  entity RentalStatus      as projection on db.RentalStatus;
}
