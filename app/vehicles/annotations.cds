// Filo Yönetimi (FleetAdmin için List Report + Object Page) arayüz anotasyonları
using AdminService as service from '../../srv/admin-service';
using from '../common';

annotate service.Vehicles with @(
  // Başlık: plaka + marka model, görsel varsa avatar olarak
  UI.HeaderInfo         : {
    TypeName      : '{i18n>Vehicle}',
    TypeNamePlural: '{i18n>Vehicles}',
    Title         : {Value: plate},
    Description   : {Value: displayName},
    ImageUrl      : imageUrl
  },

  UI.SelectionFields    : [
    category_code,
    status_code,
    homeBranch_code,
    fuelType_code
  ],

  UI.PresentationVariant: {
    SortOrder     : [{Property: plate}],
    Visualizations: ['@UI.LineItem']
  },

  // Importance High sütunlar dar ekranda da görünür; diğerleri satır altına (popin) iner
  UI.LineItem           : [
    {
      Value            : plate,
      ![@UI.Importance]: #High
    },
    {
      Value            : brand,
      ![@UI.Importance]: #High
    },
    {
      Value            : model,
      ![@UI.Importance]: #High
    },
    {
      Value            : category_code,
      ![@UI.Importance]: #High
    },
    {
      Value            : fuelType_code,
      ![@UI.Importance]: #Medium
    },
    {
      Value            : transmission_code,
      ![@UI.Importance]: #Medium
    },
    {
      Value            : dailyRate,
      ![@UI.Importance]: #High
    },
    {
      Value            : homeBranch_code,
      ![@UI.Importance]: #Medium
    },
    {
      Value            : status_code,
      ![@UI.Importance]: #High
    },
    {
      Value            : mileage,
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
      ID    : 'Technical',
      Label : '{i18n>TechnicalData}',
      Target: '@UI.FieldGroup#Technical'
    },
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'Operations',
      Label : '{i18n>Operations}',
      Target: '@UI.FieldGroup#Operations'
    },
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'Admin',
      Label : '{i18n>AdministrativeData}',
      Target: '@UI.FieldGroup#Admin'
    }
  ],

  UI.FieldGroup #General   : {Data: [
    {Value: plate},
    {Value: brand},
    {Value: model},
    {Value: modelYear},
    {Value: imageUrl}
  ]},

  UI.FieldGroup #Technical : {Data: [
    {Value: category_code},
    {Value: fuelType_code},
    {Value: transmission_code},
    {Value: seats},
    {Value: mileage}
  ]},

  UI.FieldGroup #Operations: {Data: [
    {Value: dailyRate},
    {Value: homeBranch_code},
    {Value: status_code}
  ]},

  UI.FieldGroup #Admin     : {Data: [
    {Value: createdBy},
    {Value: createdAt},
    {Value: modifiedBy},
    {Value: modifiedAt}
  ]}
);
