using {rentacar as db} from '../db/schema';
using {API_BUSINESS_PARTNER as bp} from './external/API_BUSINESS_PARTNER';

// Şube çalışanlarının ve yöneticilerin kullandığı servis: kiralama kayıtları + value help için ana veriler.
service RentalService @(path: '/rental') {

  // canManage: kullanıcı RentalManager mı? Arayüzde yönetici butonlarını agent için pasif yapmak için (srv/rental-service.js)
  @odata.draft.enabled
  entity Rentals           as projection on db.Rentals {
    *,
    virtual null as canManage : Boolean
  }
    actions {
      action approve()                              returns Rentals;
      action reject(reason : String(255) @mandatory) returns Rentals;
      action complete(returnKm : Integer @mandatory) returns Rentals;
      action cancel()                               returns Rentals;
      action applyDiscount(percent : Integer @mandatory) returns Rentals;
    };

  entity RentalExtras      as projection on db.RentalExtras;
  entity Customers         as projection on db.Customers;

  @readonly
  entity Vehicles          as projection on db.Vehicles;

  @readonly
  entity Branches          as projection on db.Branches;

  @readonly
  entity Extras            as projection on db.Extras;

  @readonly
  entity VehicleCategories as projection on db.VehicleCategories;

  @readonly
  entity FuelTypes         as projection on db.FuelTypes;

  @readonly
  entity TransmissionTypes as projection on db.TransmissionTypes;

  @readonly
  entity VehicleStatus     as projection on db.VehicleStatus;

  @readonly
  entity RentalStatus      as projection on db.RentalStatus;

  // S/4HANA Business Partner'ların sadeleştirilmiş görünümü. Veri bizde tutulmaz: okumalar srv/rental-service.js'te
  // uzak servise (veya mock'a) yönlendirilir. Sadece kişiler (category = '1') listelenir; bu filtre handler'da
  // uygulanır, çünkü projeksiyondaki `where` uzak servise iletilmez.
  @readonly
  entity S4BusinessPartners as projection on bp.A_BusinessPartner {
    key BusinessPartner         as ID,
        FirstName               as firstName,
        LastName                as lastName,
        BusinessPartnerFullName as fullName,
        BirthDate               as birthDate,
        @UI.Hidden
        BusinessPartnerCategory as category
  };

  // Business Partner'ı S/4'ten okuyup müşteri olarak kaydeder (varsa günceller)
  action importFromS4(businessPartnerID : String(10) @mandatory) returns Customers;
}
