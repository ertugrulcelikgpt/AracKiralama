using {rentacar as db} from '../db/schema';

// Şube çalışanlarının ve yöneticilerin kullandığı servis: kiralama kayıtları + value help için ana veriler.
service RentalService @(path: '/rental') {

  @odata.draft.enabled
  entity Rentals           as projection on db.Rentals
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
}
