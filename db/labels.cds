// Alan etiketleri: tüm servis ve arayüzlerde ortak kullanılır. Metinler _i18n/i18n*.properties dosyalarındadır.
using {rentacar} from './schema';

annotate rentacar.Rentals with @title: '{i18n>Rental}' {
  ID              @title: '{i18n>RentalUUID}'  @UI.Hidden;
  rentalID        @title: '{i18n>RentalID}';
  rentalNo        @title: '{i18n>RentalID}';
  customer        @title: '{i18n>Customer}';
  vehicle         @title: '{i18n>Vehicle}';
  pickupBranch    @title: '{i18n>PickupBranch}';
  returnBranch    @title: '{i18n>ReturnBranch}';
  pickupDate      @title: '{i18n>PickupDate}';
  returnDate      @title: '{i18n>ReturnDate}';
  rentalDays      @title: '{i18n>RentalDays}';
  basePrice       @title: '{i18n>BasePrice}';
  extrasPrice     @title: '{i18n>ExtrasPrice}';
  oneWayFee       @title: '{i18n>OneWayFee}';
  discountPercent @title: '{i18n>DiscountPercent}';
  discountAmount  @title: '{i18n>DiscountAmount}';
  totalPrice      @title: '{i18n>TotalPrice}';
  status          @title: '{i18n>RentalStatus}';
  rejectionReason @title: '{i18n>RejectionReason}';
  pickupKm        @title: '{i18n>PickupKm}';
  returnKm        @title: '{i18n>ReturnKm}';
  notes           @title: '{i18n>Notes}';
  extras          @title: '{i18n>RentalExtras}';
}

annotate rentacar.RentalExtras with @title: '{i18n>RentalExtra}' {
  ID         @UI.Hidden;
  rental     @title: '{i18n>Rental}';
  extra      @title: '{i18n>Extra}';
  quantity   @title: '{i18n>Quantity}';
  dailyPrice @title: '{i18n>DailyPrice}';
  amount     @title: '{i18n>Amount}';
}

annotate rentacar.Vehicles with @title: '{i18n>Vehicle}' {
  ID           @UI.Hidden;
  plate        @title: '{i18n>Plate}';
  brand        @title: '{i18n>Brand}';
  model        @title: '{i18n>Model}';
  displayName  @title: '{i18n>Vehicle}';
  modelYear    @title: '{i18n>ModelYear}';
  category     @title: '{i18n>VehicleCategory}';
  fuelType     @title: '{i18n>FuelType}';
  transmission @title: '{i18n>Transmission}';
  seats        @title: '{i18n>Seats}';
  dailyRate    @title: '{i18n>DailyRate}';
  homeBranch   @title: '{i18n>HomeBranch}';
  status       @title: '{i18n>VehicleStatus}';
  mileage      @title: '{i18n>Mileage}';
  imageUrl     @title: '{i18n>ImageUrl}';
}

annotate rentacar.Customers with @title: '{i18n>Customer}' {
  ID               @UI.Hidden;
  firstName        @title: '{i18n>FirstName}';
  lastName         @title: '{i18n>LastName}';
  fullName         @title: '{i18n>FullName}';
  email            @title: '{i18n>Email}';
  phone            @title: '{i18n>Phone}';
  birthDate        @title: '{i18n>BirthDate}';
  licenseNumber    @title: '{i18n>LicenseNumber}';
  licenseIssueDate @title: '{i18n>LicenseIssueDate}';
  city             @title: '{i18n>City}';
  businessPartnerID @title: '{i18n>BusinessPartnerID}';
  source           @title: '{i18n>CustomerSource}';
}

annotate rentacar.Branches with @title: '{i18n>Branch}' {
  code    @title: '{i18n>BranchCode}';
  name    @title: '{i18n>BranchName}';
  city    @title: '{i18n>City}';
  address @title: '{i18n>Address}';
  phone   @title: '{i18n>Phone}';
}

annotate rentacar.Extras with @title: '{i18n>Extra}' {
  code       @title: '{i18n>ExtraCode}';
  name       @title: '{i18n>ExtraName}';
  dailyPrice @title: '{i18n>DailyPrice}';
}

annotate rentacar.VehicleCategories with @title: '{i18n>VehicleCategory}' {
  code            @title: '{i18n>Code}';
  minDriverAge    @title: '{i18n>MinDriverAge}';
  minLicenseYears @title: '{i18n>MinLicenseYears}';
}

annotate rentacar.FuelTypes with @title: '{i18n>FuelType}' {
  code @title: '{i18n>Code}';
}

annotate rentacar.TransmissionTypes with @title: '{i18n>Transmission}' {
  code @title: '{i18n>Code}';
}

annotate rentacar.VehicleStatus with @title: '{i18n>VehicleStatus}' {
  code @title: '{i18n>Code}';
}

annotate rentacar.RentalStatus with @title: '{i18n>RentalStatus}' {
  code        @title: '{i18n>Code}';
  criticality @title: '{i18n>Criticality}';
}
