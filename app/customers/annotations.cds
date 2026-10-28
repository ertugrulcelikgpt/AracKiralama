// Müşteriler (RentalAgent için List Report + Object Page) ve "S/4HANA'dan Getir" arayüz anotasyonları
using RentalService as service from '../../srv/rental-service';
using from '../common';

annotate service.Customers with @(
  // Silme yetkisi yok (srv/auth.cds); butonu da gizliyoruz
  UI.DeleteHidden       : true,

  UI.HeaderInfo         : {
    TypeName      : '{i18n>Customer}',
    TypeNamePlural: '{i18n>Customers}',
    Title         : {Value: fullName},
    Description   : {Value: email}
  },

  UI.SelectionFields    : [
    city,
    source,
    businessPartnerID
  ],

  UI.PresentationVariant: {
    SortOrder     : [{Property: lastName}],
    Visualizations: ['@UI.LineItem']
  },

  UI.LineItem           : [
    // Bağımsız (unbound) action tablo araç çubuğunda buton olur; parametre penceresi value help ile açılır
    {
      $Type : 'UI.DataFieldForAction',
      Action: 'RentalService.EntityContainer/importFromS4',
      Label : '{i18n>ImportFromS4}'
    },
    {
      Value            : firstName,
      ![@UI.Importance]: #High
    },
    {
      Value            : lastName,
      ![@UI.Importance]: #High
    },
    {
      Value            : email,
      ![@UI.Importance]: #Medium
    },
    {
      Value            : phone,
      ![@UI.Importance]: #Medium
    },
    {
      Value            : city,
      ![@UI.Importance]: #High
    },
    {
      Value            : source,
      ![@UI.Importance]: #High
    },
    {
      Value            : businessPartnerID,
      ![@UI.Importance]: #Medium
    }
  ],

  UI.Facets             : [
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'General',
      Label : '{i18n>GeneralInformation}',
      Target: '@UI.FieldGroup#General'
    },
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'License',
      Label : '{i18n>DriverLicense}',
      Target: '@UI.FieldGroup#License'
    },
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'Integration',
      Label : '{i18n>S4Integration}',
      Target: '@UI.FieldGroup#Integration'
    },
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'Admin',
      Label : '{i18n>AdministrativeData}',
      Target: '@UI.FieldGroup#Admin'
    }
  ],

  UI.FieldGroup #General    : {Data: [
    {Value: firstName},
    {Value: lastName},
    {Value: birthDate},
    {Value: email},
    {Value: phone},
    {Value: city}
  ]},

  UI.FieldGroup #License    : {Data: [
    {Value: licenseNumber},
    {Value: licenseIssueDate}
  ]},

  UI.FieldGroup #Integration: {Data: [
    {Value: source},
    {Value: businessPartnerID}
  ]},

  UI.FieldGroup #Admin      : {Data: [
    {Value: createdBy},
    {Value: createdAt},
    {Value: modifiedBy},
    {Value: modifiedAt}
  ]}
);

annotate service.S4BusinessPartners with @(
  UI.HeaderInfo: {
    TypeName      : '{i18n>S4BusinessPartner}',
    TypeNamePlural: '{i18n>S4BusinessPartners}'
  },
  UI.LineItem  : [
    {Value: ID},
    {Value: fullName},
    {Value: birthDate}
  ]
) {
  ID        @title: '{i18n>BusinessPartnerID}';
  firstName @title: '{i18n>FirstName}';
  lastName  @title: '{i18n>LastName}';
  fullName  @title: '{i18n>FullName}';
  birthDate @title: '{i18n>BirthDate}';
};

// Action parametresi: S/4'teki kişileri listeleyen value help (arama S/4'e $filter olarak gider)
annotate service.importFromS4 with (
  businessPartnerID @(
    title                   : '{i18n>BusinessPartnerID}',
    Common.ValueList        : {
      CollectionPath: 'S4BusinessPartners',
      Parameters    : [
        {
          $Type            : 'Common.ValueListParameterOut',
          LocalDataProperty: businessPartnerID,
          ValueListProperty: 'ID'
        },
        {
          $Type            : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'fullName'
        },
        {
          $Type            : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'birthDate'
        }
      ]
    }
  )
);

// Bağımsız action hangi kaydı değiştirdiğini bilmez; listeyi yenilemek için tüm Customers kümesini hedefliyoruz
annotate service.importFromS4 with @Common.SideEffects: {TargetEntities: ['/RentalService.EntityContainer/Customers']};
