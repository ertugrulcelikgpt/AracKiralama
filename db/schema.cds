namespace rentacar;

using {
  cuid,
  managed,
  Currency
} from '@sap/cds/common';
using {
  rentacar.Customers,
  rentacar.Vehicles,
  rentacar.Branches,
  rentacar.Extras,
  rentacar.RentalStatus
} from './master-data';

// Fiyat alanları ve rentalID istemciden yazılamaz (@readonly); değerlerini srv/rental-service.js hesaplar.
// UNIQUE kısıtı K8'deki numara üretiminin son güvencesidir: eşzamanlı iki kayıt aynı numarayı alamaz.
@assert.unique: {rentalID: [rentalID]}
entity Rentals : cuid, managed {
  rentalID        : Integer @readonly;
  // Arayüzde numarayı binlik ayracı olmadan göstermek için metin karşılığı (app/common.cds → @Common.Text)
  rentalNo        : String(10) = cast(rentalID as String(10));
  customer        : Association to Customers @mandatory;
  vehicle         : Association to Vehicles @mandatory;
  pickupBranch    : Association to Branches @mandatory;
  returnBranch    : Association to Branches @mandatory;
  pickupDate      : Date @mandatory;
  returnDate      : Date @mandatory;
  rentalDays      : Integer @readonly;
  basePrice       : Decimal(10, 2) @readonly;
  extrasPrice     : Decimal(10, 2) @readonly;
  oneWayFee       : Decimal(10, 2) @readonly;
  // Yöneticinin applyDiscount ile verdiği ek indirim oranı; fiyat yeniden hesaplanınca kaybolmasın diye saklanır.
  discountPercent : Integer @readonly default 0;
  discountAmount  : Decimal(10, 2) @readonly;
  totalPrice      : Decimal(10, 2) @readonly;
  currency        : Currency default 'TRY';
  status          : Association to RentalStatus @readonly default 'O';
  rejectionReason : String(255) @readonly;
  pickupKm        : Integer @readonly;
  returnKm        : Integer @readonly;
  notes           : LargeString;
  extras          : Composition of many RentalExtras
                      on extras.rental = $self;
}

entity RentalExtras : cuid {
  rental     : Association to Rentals;
  extra      : Association to Extras @mandatory;
  quantity   : Integer default 1;
  dailyPrice : Decimal(10, 2) @readonly;
  amount     : Decimal(10, 2) @readonly;
}
