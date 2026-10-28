# 04 — İş Mantığı (Aşama 3)

## Bu aşamada öğrenilen kavramlar

### Servis sınıfı (`cds.ApplicationService`)
`srv/rental-service.cds` ile aynı adı taşıyan `srv/rental-service.js` dosyası CAP tarafından otomatik bulunur.
Dosya, servisin davranışını tanımlayan bir sınıf dışa aktarır:

```js
export default class RentalService extends cds.ApplicationService {
  init() {
    const { Rentals } = this.entities
    this.before('SAVE', Rentals, async req => { /* doğrulama */ })
    this.on('approve', Rentals, async req => { /* action */ })
    return super.init()
  }
}
```

### Olay işleyici (event handler) yaşam döngüsü
Her istek üç fazdan geçer:

| Faz | Ne için | Projede |
|---|---|---|
| `before` | Doğrulama, veriyi zenginleştirme | `before('SAVE')`: K1–K4, K6 kontrolleri, K5 hesaplama, K8 numara |
| `on` | Asıl işi yapmak (varsayılan CRUD'un yerine geçer) | `on('approve')`, `on('reject')` ... |
| `after` | Sonucu düzenlemek, yan iş | `after('PATCH', Rentals.drafts)`: fiyatı yeniden hesapla |

`before` handler'ında `req.data`'yı değiştirmek, veritabanına yazılacak veriyi değiştirir. K5'te fiyat
alanlarını böyle dolduruyoruz. Bu alanlar `@readonly` olsa da sunucu kodu yazabilir; `@readonly` sadece
istemciyi kısıtlar.

### Taslak olayları
| Olay | Ne zaman | Hedef |
|---|---|---|
| `NEW` | Yeni taslak (veya taslağa yeni alt satır) | `Rentals.drafts`, `RentalExtras.drafts` |
| `PATCH` | Taslakta alan değişti | `Rentals.drafts`, `RentalExtras.drafts` |
| `CANCEL` | Taslak (veya taslak satırı) silindi | `RentalExtras.drafts` |
| `EDIT` | Aktif kayıt düzenlemeye açıldı | `Rentals` |
| `SAVE` | Kaydet: `CREATE` (yeni) veya `UPDATE` (düzenleme) için kısaltma | `Rentals` |

`req.event === 'CREATE'` ile kaydın yeni olduğunu anlıyoruz (K1'in "geçmiş tarih" kontrolü ve K8 sadece yeni
kayıtta çalışır). Kaydet sırasında `req.data` belgenin tamamını içerir (ek hizmet satırları dahil, derin/deep).

### `req` nesnesi
- `req.data`: gelen veri (Kaydet'te tüm belge, action'da parametreler: `req.data.reason`)
- `req.params`: URL'deki anahtarlar → `req.params[0]` = `{ ID, IsActiveEntity }`
- `req.error({ status, message, args, target })`: hatayı **biriktirir**, işlem `before` fazı sonunda durur. Böylece
  birden fazla hata tek yanıtta döner.
- `req.reject(...)`: hemen durdurur (action ön koşulları gibi devam etmenin anlamsız olduğu durumlar).
- `req.info(...)`: başarılı yanıta bilgi mesajı ekler (`sap-messages` başlığı). Fiori bunu toast olarak gösterir.
- `message: 'RENTAL_DATE_ORDER'` → `_i18n/messages_tr.properties`'teki metin; `args` → `{0}`, `{1}` ...
- `target: 'in/returnDate'` → Fiori hatayı o alanın altında gösterir. `in/` Kaydet action'ının bağlama
  parametresidir (binding parameter). Alt satır: `in/extras(ID=...,IsActiveEntity=false)/quantity`.

### CQL (CDS Query Language)
Veritabanından bağımsız sorgu dili. Aynı kod PostgreSQL, SQLite ve HANA'da çalışır:

```js
// K2: çakışan kiralama var mı?
await SELECT.one.from(db.Rentals).columns('rentalID', 'pickupDate', 'returnDate').where({
  vehicle_ID, ID: { '!=': ID }, status_code: { in: ['O', 'A'] },
  pickupDate: { '<': returnDate }, returnDate: { '>': pickupDate }
})
// İlişki üzerinden yol ifadesi (path expression): JOIN'i CAP yazar
SELECT.one.from(db.Vehicles, ID).columns('plate', 'category.minDriverAge as minDriverAge')
await UPDATE(db.Rentals, ID).with({ status_code: 'A' })
```

Tarih aritmetiği (yaş, gün farkı) veritabanları arasında farklı olduğu için SQL'de değil JavaScript'te yapılıyor.
Tarihler `YYYY-MM-DD` metni olarak geldiği için `<` / `>` karşılaştırmaları doğru çalışır.

### Transaction (işlem bütünlüğü)
Bir istek içindeki tüm sorgular aynı transaction'da çalışır. `complete()` hem kiralamayı hem aracın km'sini
günceller; biri hata verirse ikisi de geri alınır (rollback). Bunun için ekstra kod yazmadık; CAP her isteği
otomatik olarak bir transaction'a sarar.

### Dinamik butonlar: `@Core.OperationAvailable` mı, sanal alan mı?
İki yol var:
1. **Sanal alan (virtual element):** `virtual approveEnabled : Boolean` gibi alanlar tanımlanıp `after('READ')`
   içinde doldurulur, anotasyon (`@Core.OperationAvailable: approveEnabled`) bu alana bakar.
2. **`@Core.OperationAvailable` + `$edmJson` ifadesi (seçildi):** Kural doğrudan anotasyonda ifade edilir:
   `in/status_code = 'O' and in/IsActiveEntity`. Fiori bunu tarayıcıda değerlendirir.

İkinciyi seçtik: ek alan veya READ handler'ı gerekmiyor, kural tek yerde ve okunur, her okumada ek hesaplama
yok. Sanal alan ancak kural veritabanından ek veri gerektiriyorsa (ör. "kullanıcının şubesi mi?") tercih edilir.
Önemli: anotasyon sadece görünüm içindir; aynı kontrol sunucuda da var (`APPROVE_NOT_OPEN` vb.).

K7'deki "Düzenle" butonu için `@UI.UpdateHidden` kullandık. Fiori Elements V4'te standart Düzenle butonu
bu anotasyonla gizlenir; sunucuda `before('EDIT')` ile ayrıca engellenir.

### `@Common.SideEffects` (anlık fiyat güncellemesi)
Taslakta kullanıcı bir alanı değiştirdiğinde Fiori yalnızca o alanı PATCH'ler ve ekrandaki diğer alanları
yeniden okumaz. SideEffects, Fiori'ye "şu alan değişince şu alanları yeniden oku" der:

```cds
Common.SideEffects #Pricing: {
  SourceProperties: [pickupDate, returnDate, vehicle_ID, pickupBranch_code, returnBranch_code],
  TargetProperties: ['rentalDays', 'basePrice', 'extrasPrice', 'oneWayFee', 'discountAmount', 'totalPrice'],
  TargetEntities  : [extras]
}
```

Akış: kullanıcı iade tarihini değiştirir → Fiori `PATCH returnDate` gönderir → sunucu `after('PATCH')` içinde
fiyatı hesaplayıp taslağa yazar → Fiori SideEffects sayesinde fiyat alanlarını ve ek hizmet tablosunu `GET` ile
yeniden okur → ekranda yeni toplam görünür. `SourceEntities: [extras]` ile satır eklenip silindiğinde de aynı
şey olur. Hesaplamayı sunucu yapar; anotasyon sadece "ne zaman yeniden oku" bilgisidir. Arayüzde Aşama 5'te
göreceğiz.

## cap-sflight'taki karşılığı
| Bu proje | cap-sflight (`srv/travel-service.js`) |
|---|---|
| `before('SAVE', Rentals)` + `in/...` hedefli `req.error` | `before('SAVE', 'Travel')` içinde `req.error(400, ..., 'in/BeginDate')` |
| `nextRentalID()` (max + 1, Kaydet anında) | `max(TravelID) + 1` (sflight bunu taslak oluşturulurken `NEW`'de yapar; biz Kaydet'te yapıyoruz ki vazgeçilen taslaklar numara harcamasın) |
| `recalculateDraft` (K5) | `TotalPrice` hesaplaması (booking fee + booking + supplement fiyatları) |
| `approve`, `reject`, `applyDiscount` | `acceptTravel`, `rejectTravel`, `deductDiscount` |
| `field-control.cds` | `app/travel_processor/field-control.cds` |

## ABAP RAP'teki karşılığı
RAP'te iş mantığı **Behavior Definition (BDEF)** içinde bildirilir, **Behavior Implementation** sınıfında
yazılır:

| CAP (bu proje) | RAP |
|---|---|
| `before('SAVE')` + `req.error` | `validation validateDates on save { field PickupDate, ReturnDate; }` + `failed`/`reported` |
| `after('PATCH')` fiyat hesaplama | `determination calculatePrice on modify { field PickupDate, ReturnDate; }` |
| `@Common.SideEffects` | BDEF'te `side effects { field ReturnDate affects field TotalPrice; }` |
| `action approve() returns Rentals` | `action approve result [1] $self;` |
| `@Core.OperationAvailable` | `features : instance` + `get_instance_features` metodu |
| `nextRentalID()` | `early numbering` / `late numbering` veya number range object |
| CQL `SELECT`/`UPDATE` | EML: `READ ENTITIES OF ...` / `MODIFY ENTITIES OF ...` |

```abap
" Örnek amaçlı, derlenmemiş kod
" --- Behavior Definition (parça)
define behavior for ZR_RENT_Rental alias Rental
...
{
  field ( readonly ) RentalID, TotalPrice, Status;
  action ( features : instance ) approve result [1] $self;
  action ( features : instance ) reject parameter ZA_RENT_REJECT result [1] $self;
  determination calculatePrice on modify { field PickupDate, ReturnDate, VehicleUUID; }
  validation validateDates on save { create; field PickupDate, ReturnDate; }
  side effects { field ReturnDate affects field TotalPrice; }
}

" --- Behavior Implementation (parça)
METHOD validateDates.
  READ ENTITIES OF zr_rent_rental IN LOCAL MODE
    ENTITY Rental FIELDS ( PickupDate ReturnDate ) WITH CORRESPONDING #( keys )
    RESULT DATA(rentals).
  LOOP AT rentals INTO DATA(rental) WHERE ReturnDate <= rental-PickupDate.
    APPEND VALUE #( %tky = rental-%tky ) TO failed-rental.
    APPEND VALUE #( %tky = rental-%tky
                    %msg = new_message( id = 'ZRENT' number = '001' severity = if_abap_behv_message=>severity-error )
                    %element-ReturnDate = if_abap_behv=>mk-on ) TO reported-rental.
  ENDLOOP.
ENDMETHOD.

METHOD approve.
  MODIFY ENTITIES OF zr_rent_rental IN LOCAL MODE
    ENTITY Rental UPDATE FIELDS ( Status ) WITH VALUE #( FOR key IN keys ( %tky = key-%tky Status = 'A' ) ).
  READ ENTITIES OF zr_rent_rental IN LOCAL MODE
    ENTITY Rental ALL FIELDS WITH CORRESPONDING #( keys ) RESULT DATA(rentals).
  result = VALUE #( FOR r IN rentals ( %tky = r-%tky %param = r ) ).
ENDMETHOD.

METHOD get_instance_features.
  READ ENTITIES OF zr_rent_rental IN LOCAL MODE
    ENTITY Rental FIELDS ( Status ) WITH CORRESPONDING #( keys ) RESULT DATA(rentals).
  result = VALUE #( FOR r IN rentals (
    %tky            = r-%tky
    %action-approve = COND #( WHEN r-Status = 'O' THEN if_abap_behv=>fc-o-enabled
                                                  ELSE if_abap_behv=>fc-o-disabled )
    %update         = COND #( WHEN r-Status = 'O' THEN if_abap_behv=>fc-o-enabled
                                                  ELSE if_abap_behv=>fc-o-disabled ) ) ).
ENDMETHOD.
```

## Sık yapılan hatalar
- Doğrulamayı `PATCH`'e koymak. Taslakta kullanıcı yarım veri girer; her tuş vuruşunda hata göstermek can sıkar.
  Doğrulama `SAVE`'de, hesaplama `PATCH`'te yapılır.
- Sadece anotasyonla kural koymak (`@Core.OperationAvailable`). URL'yi bilen biri action'ı doğrudan çağırabilir;
  sunucu kontrolü şarttır.
- Hata hedefini `in/` öneki olmadan vermek. Mesaj alana bağlanmaz, sadece genel mesaj olarak görünür.
- `req.reject` ile ilk hatada durmak. Kullanıcı hataları tek tek düzeltip tekrar kaydetmek zorunda kalır.
  `req.error` ile hepsini birlikte döndür.
- Action adını temel sınıftaki bir metotla aynı seçmek: `reject` adı `ApplicationService.reject` ile çakışır.
  CAP uyarı verir ama action çalışır; sadece `srv.reject(...)` şeklinde tipli çağrı oluşturulamaz.
- `sap-messages` başlığındaki bilgi mesajlarının otomatik çevrileceğini varsaymak. CAP bunları varsayılan dilde
  çevirir; isteğin dilinde göstermek için `cds.i18n.messages.at(key, req.locale, args)` kullanıldı.

## Alıştırmalar
1. Yeni kural K9: "Bir müşterinin aynı anda en fazla 2 açık (O) kiralaması olabilir." Kuralı ayrı bir fonksiyon
   olarak yaz, `before('SAVE')`'e ekle, mesaj anahtarını EN/TR olarak tanımla ve `test/requests.http` ile dene.
2. `calculatePrice` fonksiyonunu değiştirmeden hafta sonu (Cumartesi–Pazar) teslimlerde temel ücrete %5 ek
   ücret eklemeyi düşün. Bu kural nereye yazılmalı ve SideEffects anotasyonunda bir şey değişir mi?
3. `cancel()` için isteğe bağlı bir `reason` parametresi ekle ve iptal sebebini `notes` alanının sonuna yaz.
