// Kiralama Yönetimi (List Report + Object Page) arayüz anotasyonları
using RentalService as service from '../../srv/rental-service';
using from '../common';

annotate service.Rentals with @(
  // Liste ve nesne sayfasının başlığı: "Kiralama" / "Kiralamalar", nesne sayfasında kiralama no + müşteri adı
  UI.HeaderInfo                        : {
    TypeName      : '{i18n>Rental}',
    TypeNamePlural: '{i18n>Rentals}',
    Title         : {Value: rentalID},
    Description   : {Value: customer.fullName}
  },

  // Filtre çubuğundaki alanlar (araç kategorisi ilişki üzerinden filtrelenir)
  UI.SelectionFields                   : [
    status_code,
    pickupBranch_code,
    customer_ID,
    pickupDate,
    vehicle.category_code
  ],

  // Teslim tarihi filtresi tek değer yerine tarih aralığı seçtirir
  Capabilities.FilterRestrictions      : {FilterExpressionRestrictions: [{
    Property          : pickupDate,
    AllowedExpressions: 'SingleRange'
  }]},

  // Listenin varsayılan sıralaması: en yeni kiralama en üstte
  UI.PresentationVariant               : {
    SortOrder     : [{
      Property  : rentalID,
      Descending: true
    }],
    Visualizations: ['@UI.LineItem']
  },

  // Liste sütunları; statü sütunu criticality ile renkli (sarı/yeşil/kırmızı/mavi/gri)
  // Importance: dar ekranda/sığmadığında hangi sütunların mutlaka görüneceği (High asla gizlenmez)
  UI.LineItem                          : [
    {
      Value            : rentalID,
      ![@UI.Importance]: #High
    },
    {
      Value            : customer_ID,
      ![@UI.Importance]: #High
    },
    {
      Value            : vehicle_ID,
      ![@UI.Importance]: #High
    },
    {
      Value            : pickupBranch_code,
      ![@UI.Importance]: #Medium
    },
    {
      Value            : pickupDate,
      ![@UI.Importance]: #High
    },
    {
      Value            : returnDate,
      ![@UI.Importance]: #High
    },
    {
      Value            : totalPrice,
      ![@UI.Importance]: #High
    },
    {
      Value            : status_code,
      Criticality      : status.criticality,
      ![@UI.Importance]: #High
    }
  ],

  // Nesne sayfası başlığındaki büyük göstergeler (data point): statü ve toplam tutar
  UI.DataPoint #Status                 : {
    Value      : status_code,
    Title      : '{i18n>RentalStatus}',
    Criticality: status.criticality
  },
  UI.DataPoint #TotalPrice             : {
    Value: totalPrice,
    Title: '{i18n>TotalPrice}'
  },
  UI.HeaderFacets                      : [
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.DataPoint#Status'
    },
    {
      $Type : 'UI.ReferenceFacet',
      Target: '@UI.DataPoint#TotalPrice'
    }
  ],

  // Nesne sayfasının üst sağındaki action butonları; aktif/pasif durumu srv/field-control.cds'te
  UI.Identification                    : [
    {
      $Type : 'UI.DataFieldForAction',
      Action: 'RentalService.approve',
      Label : '{i18n>Approve}'
    },
    {
      $Type : 'UI.DataFieldForAction',
      Action: 'RentalService.reject',
      Label : '{i18n>Reject}'
    },
    {
      $Type : 'UI.DataFieldForAction',
      Action: 'RentalService.applyDiscount',
      Label : '{i18n>ApplyDiscount}'
    },
    {
      $Type : 'UI.DataFieldForAction',
      Action: 'RentalService.complete',
      Label : '{i18n>Complete}'
    },
    {
      $Type : 'UI.DataFieldForAction',
      Action: 'RentalService.cancel',
      Label : '{i18n>CancelRental}'
    }
  ],

  // Nesne sayfasının bölümleri (facet), her biri bir alan grubu veya tablo
  UI.Facets                            : [
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'General',
      Label : '{i18n>GeneralInformation}',
      Target: '@UI.FieldGroup#General'
    },
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'VehicleAndBranches',
      Label : '{i18n>VehicleAndBranches}',
      Target: '@UI.FieldGroup#VehicleAndBranches'
    },
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'PriceDetails',
      Label : '{i18n>PriceDetails}',
      Target: '@UI.FieldGroup#PriceDetails'
    },
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'Extras',
      Label : '{i18n>RentalExtras}',
      Target: 'extras/@UI.LineItem'
    },
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'Handover',
      Label : '{i18n>HandoverInformation}',
      Target: '@UI.FieldGroup#Handover'
    },
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'Admin',
      Label : '{i18n>AdministrativeData}',
      Target: '@UI.FieldGroup#Admin'
    }
  ],

  UI.FieldGroup #General               : {Data: [
    {Value: customer_ID},
    {
      Value      : status_code,
      Criticality: status.criticality
    },
    {Value: rejectionReason},
    {Value: notes}
  ]},

  UI.FieldGroup #VehicleAndBranches    : {Data: [
    {Value: vehicle_ID},
    {Value: pickupBranch_code},
    {Value: returnBranch_code},
    {Value: pickupDate},
    {Value: returnDate}
  ]},

  UI.FieldGroup #PriceDetails          : {Data: [
    {Value: rentalDays},
    {Value: basePrice},
    {Value: extrasPrice},
    {Value: oneWayFee},
    {Value: discountPercent},
    {Value: discountAmount},
    {Value: totalPrice}
  ]},

  UI.FieldGroup #Handover              : {Data: [
    {Value: pickupKm},
    {Value: returnKm}
  ]},

  UI.FieldGroup #Admin                 : {Data: [
    {Value: createdBy},
    {Value: createdAt},
    {Value: modifiedBy},
    {Value: modifiedAt}
  ]}
) {
  canManage @UI.Hidden;
};

// Action parametreleri: açılan pencerede (popup) alan etiketleri
annotate service.Rentals actions {
  reject        (reason   @title: '{i18n>RejectionReason}'  @UI.MultiLineText);
  complete      (returnKm @title: '{i18n>ReturnKm}');
  applyDiscount (percent  @title: '{i18n>DiscountPercentParam}');
};

// "Ek Hizmetler" bölümündeki tablo
annotate service.RentalExtras with @(
  UI.HeaderInfo: {
    TypeName      : '{i18n>RentalExtra}',
    TypeNamePlural: '{i18n>RentalExtras}',
    Title         : {Value: extra_code}
  },
  UI.LineItem  : [
    {Value: extra_code},
    {Value: quantity},
    {Value: dailyPrice},
    {Value: amount}
  ]
);
