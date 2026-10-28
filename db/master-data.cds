namespace rentacar;

using {
  cuid,
  managed,
  Currency,
  sap.common.CodeList
} from '@sap/cds/common';

entity Branches {
  key code    : String(10);
      name    : String(100) @mandatory;
      city    : String(40);
      address : String(255);
      phone   : String(30);
}

// Plaka iş anahtarıdır; teknik anahtar cuid olduğu için plaka değişse bile kiralamalardaki bağlar bozulmaz.
@assert.unique: {plate: [plate]}
entity Vehicles : cuid, managed {
  plate        : String(15) @mandatory;
  brand        : String(40) @mandatory;
  model        : String(40) @mandatory;
  modelYear    : Integer;
  category     : Association to VehicleCategories @mandatory;
  fuelType     : Association to FuelTypes;
  transmission : Association to TransmissionTypes;
  seats        : Integer;
  dailyRate    : Decimal(10, 2) @mandatory;
  currency     : Currency default 'TRY';
  homeBranch   : Association to Branches;
  status       : Association to VehicleStatus default 'AV';
  mileage      : Integer default 0;
  imageUrl     : String(255);
}

entity Customers : cuid, managed {
  firstName        : String(40) @mandatory;
  lastName         : String(40) @mandatory;
  fullName         : String = firstName || ' ' || lastName;
  email            : String(100);
  phone            : String(30);
  birthDate        : Date;
  licenseNumber    : String(20);
  licenseIssueDate : Date;
  city             : String(40);
}

entity Extras {
  key code       : String(10);
      name       : localized String(100) @mandatory;
      dailyPrice : Decimal(10, 2) @mandatory;
      currency   : Currency default 'TRY';
}

// Kod listeleri: name/descr alanları CodeList'ten gelir ve localized'dır (çeviriler *_texts tablolarında).

entity VehicleCategories : CodeList {
  key code            : String(3);
      minDriverAge    : Integer;
      minLicenseYears : Integer;
}

entity FuelTypes : CodeList {
  key code : String(1);
}

entity TransmissionTypes : CodeList {
  key code : String(1);
}

entity VehicleStatus : CodeList {
  key code : String(2);
}

entity RentalStatus : CodeList {
  key code        : String(1);
      // Fiori renk kodu: 0 nötr, 1 kırmızı, 2 sarı, 3 yeşil, 5 mavi
      criticality : Integer;
}
