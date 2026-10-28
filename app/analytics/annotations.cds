// Kiralama Analizi (RentalManager için Analytical List Page): grafik + analitik tablo
using AnalyticsService as service from '../../srv/analytics-service';

annotate service.RentalAnalytics with @(
  UI.HeaderInfo         : {
    TypeName      : '{i18n>Rental}',
    TypeNamePlural: '{i18n>Rentals}'
  },

  UI.SelectionFields    : [
    branch,
    category,
    pickupYear,
    pickupMonth,
    status
  ],

  // Varsayılan grafik: şube bazında ciro. Kullanıcı grafik araç çubuğundan boyutu (kategori, ay) ve ölçüyü
  // (kiralama sayısı, gün) değiştirebilir ve görünümü varyant olarak kaydedebilir.
  UI.Chart              : {
    $Type              : 'UI.ChartDefinitionType',
    Title              : '{i18n>RevenueAnalysis}',
    ChartType          : #Column,
    Dimensions         : [branch],
    DimensionAttributes: [{
      Dimension: branch,
      Role     : #Category
    }],
    Measures           : [revenue],
    MeasureAttributes  : [{
      Measure: revenue,
      Role   : #Axis1
    }]
  },

  // SortOrder bilerek yok: grafik de bu sıralamayı kullanır ve aylık trend ciroya göre karışır
  UI.PresentationVariant: {Visualizations: [
    '@UI.Chart',
    '@UI.LineItem'
  ]},

  UI.LineItem           : [
    {Value: branch},
    {Value: category},
    {Value: pickupMonth},
    {Value: status},
    {Value: rentalCount},
    {Value: rentalDays},
    {Value: revenue}
  ]
) {
  branch       @title: '{i18n>PickupBranch}'  @Common: {
    Text                    : branchName,
    TextArrangement         : #TextOnly,
    ValueListWithFixedValues: true,
    ValueList               : {
      CollectionPath: 'Branches',
      Parameters    : [
        {
          $Type            : 'Common.ValueListParameterInOut',
          LocalDataProperty: branch,
          ValueListProperty: 'code'
        },
        {
          $Type            : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name'
        }
      ]
    }
  };
  // Metin alanları kodun yanında gösterilir; tablo sütun seçiminde ayrı sütun olarak çıkmasın.
  // Grafiğin "Görüntüleme ölçütü" listesi yine de tüm gruplanabilir alanları gösterir, bu yüzden etiketleri ayırt edici.
  branchName   @title: '{i18n>BranchName}'  @UI.Hidden;
  category     @title: '{i18n>VehicleCategory}'  @Common: {
    Text                    : categoryName,
    TextArrangement         : #TextOnly,
    ValueListWithFixedValues: true,
    ValueList               : {
      CollectionPath: 'VehicleCategories',
      Parameters    : [
        {
          $Type            : 'Common.ValueListParameterInOut',
          LocalDataProperty: category,
          ValueListProperty: 'code'
        },
        {
          $Type            : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name'
        }
      ]
    }
  };
  categoryName @title: '{i18n>CategoryName}'  @UI.Hidden;
  pickupYear   @title: '{i18n>PickupYear}';
  pickupMonth  @title: '{i18n>PickupMonth}';
  status       @title: '{i18n>RentalStatus}'  @Common: {
    Text                    : statusName,
    TextArrangement         : #TextOnly,
    ValueListWithFixedValues: true,
    ValueList               : {
      CollectionPath: 'RentalStatus',
      Parameters    : [
        {
          $Type            : 'Common.ValueListParameterInOut',
          LocalDataProperty: status,
          ValueListProperty: 'code'
        },
        {
          $Type            : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name'
        }
      ]
    }
  };
  statusName   @title: '{i18n>StatusName}'  @UI.Hidden;
  revenue      @title: '{i18n>Revenue}'  @Measures.ISOCurrency: currency;
  rentalCount  @title: '{i18n>RentalCount}';
  rentalDays   @title: '{i18n>RentalDays}';
  currency     @title: '{i18n>Currency}'  @UI.Hidden;
  rentalNo     @title: '{i18n>RentalID}';
};
