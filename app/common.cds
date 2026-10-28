// Tüm uygulamalarda ortak anotasyonlar: para birimi/birim, kod yerine metin gösterimi ve value help'ler.
// Veri modeli (rentacar.*) üzerine yazıldığı için her iki servise (RentalService, AdminService) de yansır.
using {rentacar} from '../db/schema';

// ---------------------------------------------------------------------------------------------------------------
// Kiralamalar
// ---------------------------------------------------------------------------------------------------------------
annotate rentacar.Rentals with {
  rentalID        @Common.Text: rentalNo  @Common.TextArrangement: #TextOnly;
  basePrice       @Measures.ISOCurrency: currency_code;
  extrasPrice     @Measures.ISOCurrency: currency_code;
  oneWayFee       @Measures.ISOCurrency: currency_code;
  discountAmount  @Measures.ISOCurrency: currency_code;
  totalPrice      @Measures.ISOCurrency: currency_code;
  discountPercent @Measures.Unit       : '%';
  pickupKm        @Measures.Unit       : 'km';
  returnKm        @Measures.Unit       : 'km';
  notes           @UI.MultiLineText;
  rejectionReason @UI.MultiLineText;

  // Müşteri: ekranda UUID yerine ad soyad, seçimde müşteri listesi
  customer        @Common: {
    Text           : customer.fullName,
    TextArrangement: #TextOnly,
    ValueList      : {
      CollectionPath: 'Customers',
      Parameters    : [
        {
          $Type            : 'Common.ValueListParameterInOut',
          LocalDataProperty: customer_ID,
          ValueListProperty: 'ID'
        },
        {
          $Type            : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'fullName'
        },
        {
          $Type            : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'email'
        },
        {
          $Type            : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'city'
        },
        {
          $Type            : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'birthDate'
        }
      ]
    }
  };

  // Araç: sadece müsait (AV) araçlar listelenir; kategori, yakıt, vites ve ücret görünür
  vehicle         @Common: {
    Text           : vehicle.displayName,
    TextArrangement: #TextOnly,
    ValueList      : {
      CollectionPath: 'Vehicles',
      Parameters    : [
        {
          $Type            : 'Common.ValueListParameterInOut',
          LocalDataProperty: vehicle_ID,
          ValueListProperty: 'ID'
        },
        {
          $Type            : 'Common.ValueListParameterConstant',
          ValueListProperty: 'status_code',
          Constant         : 'AV'
        },
        {
          $Type            : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'plate'
        },
        {
          $Type            : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'brand'
        },
        {
          $Type            : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'model'
        },
        {
          $Type            : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'category_code'
        },
        {
          $Type            : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'fuelType_code'
        },
        {
          $Type            : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'transmission_code'
        },
        {
          $Type            : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'dailyRate'
        }
      ]
    }
  };

  pickupBranch    @Common: {
    Text                    : pickupBranch.name,
    TextArrangement         : #TextOnly,
    ValueListWithFixedValues: true,
    ValueList               : {
      CollectionPath: 'Branches',
      Parameters    : [{
        $Type            : 'Common.ValueListParameterInOut',
        LocalDataProperty: pickupBranch_code,
        ValueListProperty: 'code'
      }]
    }
  };

  returnBranch    @Common: {
    Text                    : returnBranch.name,
    TextArrangement         : #TextOnly,
    ValueListWithFixedValues: true,
    ValueList               : {
      CollectionPath: 'Branches',
      Parameters    : [{
        $Type            : 'Common.ValueListParameterInOut',
        LocalDataProperty: returnBranch_code,
        ValueListProperty: 'code'
      }]
    }
  };

  status          @Common: {
    Text                    : status.name,
    TextArrangement         : #TextOnly,
    ValueListWithFixedValues: true,
    ValueList               : {
      CollectionPath: 'RentalStatus',
      Parameters    : [{
        $Type            : 'Common.ValueListParameterInOut',
        LocalDataProperty: status_code,
        ValueListProperty: 'code'
      }]
    }
  };
}

annotate rentacar.RentalExtras with {
  dailyPrice @Measures.ISOCurrency: rental.currency_code;
  amount     @Measures.ISOCurrency: rental.currency_code;
  extra      @Common: {
    Text                    : extra.name,
    TextArrangement         : #TextOnly,
    ValueListWithFixedValues: true,
    ValueList               : {
      CollectionPath: 'Extras',
      Parameters    : [{
        $Type            : 'Common.ValueListParameterInOut',
        LocalDataProperty: extra_code,
        ValueListProperty: 'code'
      }]
    }
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Ana veriler
// ---------------------------------------------------------------------------------------------------------------
annotate rentacar.Vehicles with {
  dailyRate    @Measures.ISOCurrency: currency_code;
  mileage      @Measures.Unit       : 'km';
  imageUrl     @UI.IsImageURL;

  category     @Common: {
    Text                    : category.name,
    TextArrangement         : #TextOnly,
    ValueListWithFixedValues: true,
    ValueList               : {
      CollectionPath: 'VehicleCategories',
      Parameters    : [{
        $Type            : 'Common.ValueListParameterInOut',
        LocalDataProperty: category_code,
        ValueListProperty: 'code'
      }]
    }
  };
  fuelType     @Common: {
    Text                    : fuelType.name,
    TextArrangement         : #TextOnly,
    ValueListWithFixedValues: true,
    ValueList               : {
      CollectionPath: 'FuelTypes',
      Parameters    : [{
        $Type            : 'Common.ValueListParameterInOut',
        LocalDataProperty: fuelType_code,
        ValueListProperty: 'code'
      }]
    }
  };
  transmission @Common: {
    Text                    : transmission.name,
    TextArrangement         : #TextOnly,
    ValueListWithFixedValues: true,
    ValueList               : {
      CollectionPath: 'TransmissionTypes',
      Parameters    : [{
        $Type            : 'Common.ValueListParameterInOut',
        LocalDataProperty: transmission_code,
        ValueListProperty: 'code'
      }]
    }
  };
  status       @Common: {
    Text                    : status.name,
    TextArrangement         : #TextOnly,
    ValueListWithFixedValues: true,
    ValueList               : {
      CollectionPath: 'VehicleStatus',
      Parameters    : [{
        $Type            : 'Common.ValueListParameterInOut',
        LocalDataProperty: status_code,
        ValueListProperty: 'code'
      }]
    }
  };
  homeBranch   @Common: {
    Text                    : homeBranch.name,
    TextArrangement         : #TextOnly,
    ValueListWithFixedValues: true,
    ValueList               : {
      CollectionPath: 'Branches',
      Parameters    : [{
        $Type            : 'Common.ValueListParameterInOut',
        LocalDataProperty: homeBranch_code,
        ValueListProperty: 'code'
      }]
    }
  };
}

annotate rentacar.Extras with {
  code       @Common: {
    Text           : name,
    TextArrangement: #TextOnly
  };
  dailyPrice @Measures.ISOCurrency: currency_code;
}

annotate rentacar.Branches with {
  code @Common: {
    Text           : name,
    TextArrangement: #TextOnly
  };
}

annotate rentacar.Customers with {
  ID @Common: {
    Text           : fullName,
    TextArrangement: #TextOnly
  };
}

annotate rentacar.Vehicles with {
  ID @Common: {
    Text           : displayName,
    TextArrangement: #TextOnly
  };
}

// Kod listeleri: açılır listelerde kod yerine adı göster
annotate rentacar.VehicleCategories with {
  code @Common: {
    Text           : name,
    TextArrangement: #TextOnly
  };
}

annotate rentacar.FuelTypes with {
  code @Common: {
    Text           : name,
    TextArrangement: #TextOnly
  };
}

annotate rentacar.TransmissionTypes with {
  code @Common: {
    Text           : name,
    TextArrangement: #TextOnly
  };
}

annotate rentacar.VehicleStatus with {
  code @Common: {
    Text           : name,
    TextArrangement: #TextOnly
  };
}

annotate rentacar.RentalStatus with {
  code @Common: {
    Text           : name,
    TextArrangement: #TextOnly
  };
}
