# 02 — Veri Modeli ve Örnek Veri (Aşama 1)

## Bu aşamada öğrenilen kavramlar

### Entity
Veritabanında bir tabloya, serviste bir OData entity set'ine dönüşen tanım.
Projede: `entity Rentals : cuid, managed { ... }` → PostgreSQL'de `rentacar_rentals` tablosu.
Tablo adı `<namespace>_<Entity>` biçimindedir. PostgreSQL tırnaksız adları küçük harfe çevirdiği için `\dt`
çıktısında `rentacar_rentals` görünür.

### Aspect ve `@sap/cds/common`
Aspect, entity'lere eklenebilen hazır alan paketidir.
- `cuid` → `key ID : UUID` (yeni kayıtta CAP otomatik UUID üretir)
- `managed` → `createdAt`, `createdBy`, `modifiedAt`, `modifiedBy` (servis üzerinden yazılınca CAP doldurur)
- `Currency` → `Association to sap.common.Currencies` (tabloda `currency_code` sütunu)

### Association ve Composition
- **Association (ilişki):** Bağımsız bir kayda başvuru. `vehicle : Association to Vehicles` → tabloda yabancı
  anahtar (foreign key) sütunu `vehicle_ID`. Kiralama silinse de araç yaşar.
- **Composition (bileşim):** Parça-bütün ilişkisi. `extras : Composition of many RentalExtras on extras.rental = $self`.
  Ek hizmet satırları kiralamayla birlikte oluşturulur, kaydedilir, silinir (deep insert/update/delete). Tabloda
  ek sütun oluşmaz; bağı alt kalemdeki `rental_ID` kurar.

### CodeList ve `localized`
`sap.common.CodeList` aspect'i `name` ve `descr` alanlarını `localized` olarak ekler. Her `localized` alan için:
- `<Entity>_texts` tablosu (sütunlar: `locale`, `code`, `name`, `descr`) → çeviriler `*_texts.csv` dosyalarında
- `localized_<Entity>` view'ı → `coalesce(çeviri, varsayılan)` ile kullanıcının dilindeki metni döner. PostgreSQL'de
  dil, oturum değişkeni `cap.locale` ile seçilir. CAP bunu her istekte kullanıcının diline göre ayarlar.

### Hesaplanan alan (calculated element)
`fullName : String = firstName || ' ' || lastName;` Tabloda sütun yoktur; okuma (read) sırasında SQL ifadesi olarak
hesaplanır. Hem PostgreSQL hem HANA'da çalışır.

### Diğer anotasyonlar
- `@mandatory`: zorunlu alan. Servis üzerinden boş gönderilirse CAP hata döner (UI'da yıldız `*` ile gösterilir).
- `@readonly`: istemci yazamaz; değeri handler'lar (Aşama 3) hesaplar.
- `@assert.unique`: veritabanında `UNIQUE` kısıtı. Plaka teknik anahtar olmadığı halde benzersizdir.
- `default 'O'`: yeni kayıtta varsayılan değer (veritabanında `DEFAULT 'O'`).

### `cds deploy` ve CSV kuralları
`db/data/<namespace>-<Entity>.csv` dosyaları ilgili tabloya yüklenir. İlişkiler yabancı anahtar sütun adlarıyla
yazılır: `customer_ID`, `status_code`. Ayraç `;` veya `,` olabilir.

## PostgreSQL'de oluşan nesneler

| CDS | PostgreSQL |
|---|---|
| `rentacar.Rentals` | tablo `rentacar_rentals` |
| `vehicle : Association to Vehicles` | sütun `vehicle_id` |
| `extras : Composition of many ...` | sütun yok; `rentacar_rentalextras.rental_id` |
| `RentalStatus : CodeList` | `rentacar_rentalstatus` + `rentacar_rentalstatus_texts` + view `localized_rentacar_rentalstatus` |
| `fullName` (hesaplanan) | sütun yok, okuma anında hesaplanır |
| `@assert.unique` | `CONSTRAINT rentacar_Vehicles_plate UNIQUE (plate)` |
| `cds_model`, `cds_outbox_messages` | CAP'in kendi tabloları (deploy edilen modelin kaydı, mesaj kuyruğu) |

**Draft tabloları** (`rentacar_RentalService_Rentals_drafts` gibi) henüz yok. Bunlar bir **servis**
`@odata.draft.enabled` olduğunda oluşur, yani Aşama 2'de görünecek.

## cap-sflight'taki karşılığı
| Bu proje | cap-sflight |
|---|---|
| `Rentals` (ana belge) | `Travel` |
| `RentalExtras` (composition) | `Booking` ve `BookingSupplement` (`Travel` → `to_Booking` composition) |
| `Vehicles`, `Customers`, `Branches` | `Flight`, `Passenger`, `Airport`, `Agency` (master data) |
| `RentalStatus` (CodeList + criticality) | `TravelStatus` |
| `rentalID` (okunabilir numara) | `TravelID` |

## ABAP RAP'teki karşılığı
RAP'te önce veritabanı tablosu tanımlanır, sonra üzerine bir **CDS view entity** yazılır. Ana/alt belge ilişkisi
view entity'lerde `composition` ve `association to parent` ile kurulur:

```abap
" Örnek amaçlı, derlenmemiş kod
@EndUserText.label : 'Rentals'
define table zrent_a_rental {
  key client      : abap.clnt not null;
  key rental_uuid : sysuuid_x16 not null;
  rental_id       : abap.numc(8);
  customer_uuid   : sysuuid_x16;
  vehicle_uuid    : sysuuid_x16;
  pickup_date     : abap.dats;
  return_date     : abap.dats;
  @Semantics.amount.currencyCode : 'zrent_a_rental.currency_code'
  total_price     : abap.curr(10,2);
  currency_code   : abap.cuky;
  status          : abap.char(1);
}

define root view entity ZR_RENT_Rental
  as select from zrent_a_rental
  composition [0..*] of ZR_RENT_RentalExtra as _Extras
  association [1..1] to ZI_RENT_Vehicle as _Vehicle on $projection.VehicleUUID = _Vehicle.VehicleUUID
{
  key rental_uuid   as RentalUUID,
      rental_id     as RentalID,
      vehicle_uuid  as VehicleUUID,
      pickup_date   as PickupDate,
      return_date   as ReturnDate,
      total_price   as TotalPrice,
      currency_code as CurrencyCode,
      status        as Status,
      _Extras,
      _Vehicle
}

define view entity ZR_RENT_RentalExtra
  as select from zrent_a_rent_ext
  association to parent ZR_RENT_Rental as _Rental on $projection.RentalUUID = _Rental.RentalUUID
{
  key extra_uuid  as ExtraUUID,
      rental_uuid as RentalUUID,
      extra_code  as ExtraCode,
      quantity    as Quantity,
      _Rental
}
```

Farklar: RAP'te `client` (mandant) alanı vardır. Tablo ve view ayrı nesnelerdir. Çeviri metinleri için ayrı text
tablosu ve `@ObjectModel.text.association` kullanılır (CAP'teki `localized`'ın karşılığı).

## Sık yapılan hatalar
- CSV'de ilişki sütununu `customer` yazmak. Doğrusu yabancı anahtar adı: `customer_ID`, `status_code`.
- CSV dosya adını yanlış yazmak (`Rentals.csv`). Doğrusu `rentacar-Rentals.csv` (namespace + `-` + entity).
- `localized` çevirileri ana CSV'ye yazmak. Çeviriler `*_texts.csv` içinde `locale` sütunuyla durur.
- Composition'da geri ilişkiyi (`rental : Association to Rentals`) unutmak. `on extras.rental = $self` buna dayanır.
- Hesaplanan alana veri yazmaya çalışmak. `fullName` sadece okunur.

## Alıştırmalar
1. `Vehicles`'a `color : String(20)` alanı ekle, `db/labels.cds`'te etiketini ver (EN + TR) ve CSV'de birkaç araca
   renk yaz. `npm run db:deploy` sonrası `psql` ile sütunun oluştuğunu kontrol et.
2. `Customers`'a hesaplanan bir `age` alanı eklemeyi düşün. Neden veritabanından bağımsız yazmak zor? (İpucu: tarih
   fonksiyonları PostgreSQL, SQLite ve HANA'da farklı.)
3. `psql` içinde `SET cap.locale='tr';` ve `SET cap.locale='en';` ile `localized_rentacar_vehiclecategories`
   view'ını sorgula. Çevirisi olmayan bir dil (`de`) seçince ne döner, neden?
