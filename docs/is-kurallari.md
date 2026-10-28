# İş Kuralları

Tüm kurallar sunucuda, [`srv/rental-service.js`](../srv/rental-service.js) içinde uygulanır. Arayüzdeki buton
durumları ve anlık fiyat güncellemesi ([`srv/field-control.cds`](../srv/field-control.cds)) yalnızca kullanıcı
deneyimi içindir; güvenliği sunucudaki kontroller sağlar. Hata mesajları `_i18n/messages*.properties`
dosyalarındaki anahtarlarla verilir ve isteğin diline (TR/EN) göre çevrilir.

## Kurallar

| No | Kural | Ne zaman çalışır | Kodda | Mesaj anahtarı |
|---|---|---|---|---|
| K1 | `returnDate > pickupDate`; yeni kiralamada `pickupDate` bugünden önce olamaz | Kaydet (SAVE) | `srv/rental-service.js:63` `checkDates` | `RENTAL_DATE_ORDER`, `RENTAL_PICKUP_IN_PAST` |
| K2 | Aynı araç için O/A statüsünde, tarih aralığı kesişen başka kiralama varsa engellenir; çakışan kiralama numarası mesajda yazar | Kaydet | `srv/rental-service.js:75` `checkAvailability` | `RENTAL_VEHICLE_NOT_AVAILABLE` |
| K3 | MT (bakımda) veya RT (hizmet dışı) araç kiralanamaz | Kaydet | `srv/rental-service.js:96` `checkVehicleStatus` | `RENTAL_VEHICLE_BLOCKED` |
| K4 | Teslim tarihindeki yaş ≥ kategori `minDriverAge`, ehliyet süresi ≥ `minLicenseYears` | Kaydet | `srv/rental-service.js:104` `checkDriverEligibility` | `RENTAL_DRIVER_TOO_YOUNG`, `RENTAL_LICENSE_TOO_NEW`, `RENTAL_CUSTOMER_DATA_MISSING` |
| K5 | Fiyat: gün, temel ücret, ek hizmet, farklı şubeye iade (750 TL), uzun süre indirimi (7–13 gün %10, 14+ gün %15), toplam | Taslakta her ilgili alan değişikliğinde + Kaydet | `srv/rental-service.js:35` `calculatePrice` (saf fonksiyon), `:170` `recalculateDraft`, `:209` PATCH işleyicisi | — |
| K6 | Ek hizmetin günlük ücreti kopyalanır; aynı ek hizmet iki kez eklenemez; adet 1–3 | Satır eklenince/değişince (kopyalama), Kaydet (kontrol) | `srv/rental-service.js:125` `copyExtraPrice`, `:134` `checkExtras` | `RENTAL_EXTRA_DUPLICATE`, `RENTAL_EXTRA_QUANTITY` |
| K7 | Sadece O (Açık) kiralamalar düzenlenebilir | "Düzenle" (EDIT) | `srv/rental-service.js:235`; buton: `srv/field-control.cds:9` `@UI.UpdateHidden` | `RENTAL_NOT_EDITABLE` |
| K8 | Yeni kayıtta `rentalID = max + 1` (ilk numara 1000) | Kaydet (sadece yeni kayıt) | `srv/rental-service.js:152` `nextRentalID`; güvence: `db/schema.cds:18` `@assert.unique` | — |

Birden fazla kural aynı anda ihlal edilirse (ör. K1 + K3 + K4) hepsi tek yanıtta döner, çünkü kontroller
`req.error` ile hata biriktirir; işlem en sonda durdurulur.

## Action'lar

| Action | Kim (`srv/auth.cds`) | Ön koşul | Etki | Kodda | Hata anahtarları |
|---|---|---|---|---|---|
| `approve()` | Manager | status = O | status → A, `pickupKm` = aracın km'si | `srv/rental-service.js:268` | `APPROVE_NOT_OPEN` |
| `reject(reason)` | Manager | status = O, sebep zorunlu | status → R, `rejectionReason` dolar | `:276` | `REJECT_NOT_OPEN`, `REJECT_REASON_REQUIRED` |
| `complete(returnKm)` | Agent, Manager | status = A, `returnKm` ≥ aracın km'si | status → C, aracın `mileage` değeri güncellenir | `:285` | `COMPLETE_NOT_APPROVED`, `COMPLETE_KM_INVALID` |
| `cancel()` | Agent, Manager | status ∈ {O, A} | status → X | `:298` | `CANCEL_NOT_ALLOWED` |
| `applyDiscount(percent)` | Manager | status = O, 1 ≤ percent ≤ 30 | `discountPercent` saklanır, fiyat yeniden hesaplanır | `:305` | `DISCOUNT_NOT_OPEN`, `DISCOUNT_PERCENT_INVALID`, bilgi: `DISCOUNT_CAPPED` |

- Action'lar sadece kaydedilmiş kiralamalarda çalışır. Taslak üzerinde çağrılırsa `ACTION_ONLY_ACTIVE`
  döner (`:266`).
- Butonların aktif/pasif durumu `@Core.OperationAvailable` ile verilir (`srv/field-control.cds:43–85`).

## K8 – Eşzamanlı numara üretimi

`max + 1` yöntemi basittir ama iki kullanıcı aynı anda kaydederse ikisi de aynı `max` değerini okuyup aynı
numarayı alabilir. Bu projede alınan ve alınabilecek önlemler:

1. **UNIQUE kısıtı (uygulandı):** `@assert.unique: { rentalID: [rentalID] }` veritabanında
   `rentacar_rentals_rentalid` kısıtını oluşturur. Çakışma olursa ikinci kayıt reddedilir; çift numara asla
   oluşmaz. Kullanıcı hata alır ve tekrar kaydeder.
2. **Yeniden deneme (retry):** UNIQUE hatası yakalanıp numara yeniden üretilerek işlem bir kez daha denenebilir.
   Kullanıcı hatayı hiç görmez.
3. **Veritabanı dizisi (sequence):** PostgreSQL `SEQUENCE` ve HANA `SEQUENCE` atomik numara üretir; boşluk
   oluşabilir ama çakışma olmaz. Dezavantajı veritabanına özgü SQL gerektirmesi; CAP'te `.hdbsequence` veya
   ham SQL ile kurulur.
4. **Sayaç tablosu + kilit:** Ayrı bir `NumberRanges` tablosunda `SELECT ... FOR UPDATE` ile kilitlenip artırılır.
   CQL'de `SELECT.one.from(...).forUpdate()` vardır. ABAP'taki number range object'in karşılığıdır.

Küçük ve orta yoğunluktaki bir şube uygulaması için (1) + gerektiğinde (2) yeterlidir. Yüksek yoğunlukta (3)
tercih edilir.

## Kararlar

Prompttaki belirsiz noktalar için alınan kararlar:

| Konu | Karar |
|---|---|
| İndirimlerin birleşmesi | `discountAmount = basePrice × (uzun süre % + discountPercent) / 100`. Toplam oran en fazla %30. Yöneticinin oranı `discountPercent` alanında saklanır; `applyDiscount` tekrar çağrılırsa eskisinin yerine geçer. Uzun süre indirimiyle birlikte %30'u aşarsa yönetici oranı kırpılır ve bilgi mesajı (`DISCOUNT_CAPPED`) döner. Kiralama süresi sonradan uzarsa toplam yine %30 ile sınırlanır. |
| Aynı gün teslim (K2) | İade günü = sonraki teslim günü çakışma sayılmaz. Çakışma: `yeni.pickupDate < mevcut.returnDate AND yeni.returnDate > mevcut.pickupDate`. |
| `pickupKm` | `approve()` sırasında aracın o anki `mileage` değeri yazılır. `complete()` `returnKm ≥ max(aracın km'si, pickupKm)` kontrol eder. |
| İade şubesi | Araç farklı şubeye iade edilse de `homeBranch` değişmez. |
| "Bugün" (K1) | Sunucunun UTC tarihine göre hesaplanır. |
| Kural ne zaman kontrol edilir | Taslakta (PATCH) kullanıcı yarım veri girebildiği için doğrulama yapılmaz; K1–K4 ve K6 "Kaydet" anında çalışır. Fiyat (K5) ise taslakta da anlık hesaplanır. |
