using {RentalService} from './rental-service';

// Arayüzdeki dinamik davranışlar: butonların aktif/pasif olması (K7, action ön koşulları, yönetici rolü) ve
// taslakta alan değişince fiyatın yeniden okunması (K5). Kuralların asıl kontrolü sunucudadır (rental-service.js);
// bu anotasyonlar yalnızca kullanıcıya doğru zamanda doğru butonu gösterir.

annotate RentalService.Rentals with @(
  // Kaydedilmiş kiralama silinmez (srv/auth.cds'te DELETE yetkisi yok); bunun yerine cancel() kullanılır
  UI.DeleteHidden            : true,

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
    {$And: [
      {$Path: 'in/IsActiveEntity'},
      {$Path: 'in/canManage'}
    ]},
    {$Eq: [
      {$Path: 'in/status_code'},
      'O'
    ]}
  ]}},
                 // Action bitince kiralamanın tamamını (statü metni, fiyat, km) yeniden oku
                 Common.SideEffects      : {TargetEntities: ['in']});
  reject        @(Core.OperationAvailable: {$edmJson: {$And: [
    {$And: [
      {$Path: 'in/IsActiveEntity'},
      {$Path: 'in/canManage'}
    ]},
    {$Eq: [
      {$Path: 'in/status_code'},
      'O'
    ]}
  ]}},
                 // Action bitince kiralamanın tamamını (statü metni, fiyat, km) yeniden oku
                 Common.SideEffects      : {TargetEntities: ['in']});
  applyDiscount @(Core.OperationAvailable: {$edmJson: {$And: [
    {$And: [
      {$Path: 'in/IsActiveEntity'},
      {$Path: 'in/canManage'}
    ]},
    {$Eq: [
      {$Path: 'in/status_code'},
      'O'
    ]}
  ]}},
                 // Action bitince kiralamanın tamamını (statü metni, fiyat, km) yeniden oku
                 Common.SideEffects      : {TargetEntities: ['in']});
  complete      @(Core.OperationAvailable: {$edmJson: {$And: [
    {$Path: 'in/IsActiveEntity'},
    {$Eq: [
      {$Path: 'in/status_code'},
      'A'
    ]}
  ]}},
                 // Action bitince kiralamanın tamamını (statü metni, fiyat, km) yeniden oku
                 Common.SideEffects      : {TargetEntities: ['in']});
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
  ]}},
                 // Action bitince kiralamanın tamamını (statü metni, fiyat, km) yeniden oku
                 Common.SideEffects      : {TargetEntities: ['in']});
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
