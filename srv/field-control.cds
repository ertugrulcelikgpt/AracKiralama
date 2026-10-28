using {RentalService} from './rental-service';

// Arayüzdeki dinamik davranışlar: butonların aktif/pasif olması (K7, action ön koşulları) ve
// taslakta alan değişince fiyatın yeniden okunması (K5). Kuralların asıl kontrolü sunucudadır (rental-service.js);
// bu anotasyonlar yalnızca kullanıcıya doğru zamanda doğru butonu gösterir.

annotate RentalService.Rentals with @(
  // K7: Sadece Open kiralamalarda "Düzenle" butonu görünür
  UI.UpdateHidden            : {$edmJson: {$Ne: [
    {$Path: 'status_code'},
    'O'
  ]}},

  // K5: Tarih, araç veya şube değişince fiyat alanlarını ve ek hizmet tutarlarını yeniden oku
  Common.SideEffects #Pricing: {
    SourceProperties: [
      pickupDate,
      returnDate,
      vehicle_ID,
      pickupBranch_code,
      returnBranch_code
    ],
    TargetProperties: [
      'rentalDays',
      'basePrice',
      'extrasPrice',
      'oneWayFee',
      'discountAmount',
      'totalPrice'
    ],
    TargetEntities  : [extras]
  },

  // K5: Ek hizmet satırı eklenince/silinince toplamları yeniden oku
  Common.SideEffects #Extras : {
    SourceEntities  : [extras],
    TargetProperties: [
      'extrasPrice',
      'discountAmount',
      'totalPrice'
    ]
  }
) actions {
  approve       @(Core.OperationAvailable: {$edmJson: {$And: [
    {$Path: 'in/IsActiveEntity'},
    {$Eq: [
      {$Path: 'in/status_code'},
      'O'
    ]}
  ]}});
  reject        @(Core.OperationAvailable: {$edmJson: {$And: [
    {$Path: 'in/IsActiveEntity'},
    {$Eq: [
      {$Path: 'in/status_code'},
      'O'
    ]}
  ]}});
  applyDiscount @(Core.OperationAvailable: {$edmJson: {$And: [
    {$Path: 'in/IsActiveEntity'},
    {$Eq: [
      {$Path: 'in/status_code'},
      'O'
    ]}
  ]}});
  complete      @(Core.OperationAvailable: {$edmJson: {$And: [
    {$Path: 'in/IsActiveEntity'},
    {$Eq: [
      {$Path: 'in/status_code'},
      'A'
    ]}
  ]}});
  cancel        @(Core.OperationAvailable: {$edmJson: {$And: [
    {$Path: 'in/IsActiveEntity'},
    {$Or: [
      {$Eq: [
        {$Path: 'in/status_code'},
        'O'
      ]},
      {$Eq: [
        {$Path: 'in/status_code'},
        'A'
      ]}
    ]}
  ]}});
};

// K5/K6: Adet veya ek hizmet değişince satır tutarını ve kiralama toplamlarını yeniden oku
annotate RentalService.RentalExtras with @(Common.SideEffects #Amount: {
  SourceProperties: [
    quantity,
    extra_code
  ],
  TargetProperties: [
    'dailyPrice',
    'amount',
    'rental/extrasPrice',
    'rental/discountAmount',
    'rental/totalPrice'
  ]
});
