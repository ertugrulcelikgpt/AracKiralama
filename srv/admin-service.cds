using {rentacar as db} from '../db/schema';

// Filo yöneticisinin ana veri bakımı için kullandığı servis.
service AdminService @(path: '/admin') {

  @odata.draft.enabled
  entity Vehicles          as projection on db.Vehicles;

  entity Branches          as projection on db.Branches;
  entity Extras            as projection on db.Extras;
  entity VehicleCategories as projection on db.VehicleCategories;

  @readonly
  entity FuelTypes         as projection on db.FuelTypes;

  @readonly
  entity TransmissionTypes as projection on db.TransmissionTypes;

  @readonly
  entity VehicleStatus     as projection on db.VehicleStatus;
}
