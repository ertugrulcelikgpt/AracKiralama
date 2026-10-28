# 03 — Servisler (Aşama 2)

## Bu aşamada öğrenilen kavramlar

### Servis ve projeksiyon (projection)
Servis, veri modelinin dışarıya açılan yüzüdür. CAP her servisi bir OData V4 uç noktası (endpoint) olarak yayınlar.

```cds
service RentalService @(path: '/rental') {
  @odata.draft.enabled
  entity Rentals as projection on db.Rentals;
  @readonly entity Vehicles as projection on db.Vehicles;
}
```

- `as projection on` → modelin bir görünümü. Veritabanında `rentalservice_rentals` adlı bir **view** oluşur.
  Yazma istekleri CAP tarafından alttaki tabloya yönlendirilir.
- `@path` → URL yolu (`/rental`). Verilmezse servis adından türetilir (`/odata/v4/rental`).
- `@readonly` → POST, PATCH ve DELETE `405 ENTITY_IS_READ_ONLY` döner.
- Projeksiyondaki ilişkiler (ör. `vehicle`) otomatik olarak aynı servisteki `Vehicles` entity'sine yönlendirilir
  (auto-redirect). Servise açıkça eklenmemiş kod listeleri `@cds.autoexpose` sayesinde salt okunur olarak
  kendiliğinden yayınlanır (ör. `Currencies`).
- Aynı tablo iki serviste farklı kurallarla yayınlanabilir: `Vehicles` RentalService'te salt okunur,
  AdminService'te draft ile düzenlenebilir.

### OData V4 sorgu seçenekleri
| Seçenek | Örnek | Ne yapar |
|---|---|---|
| `$select` | `$select=rentalID,totalPrice` | Sadece istenen alanlar |
| `$filter` | `$filter=status_code eq 'O'` | Satır filtresi (`eq`, `ne`, `gt`, `lt`, `and`, `or`, `contains(...)`) |
| `$expand` | `$expand=customer($select=fullName)` | İlişkili kaydı aynı yanıtta getirir (iç içe `$select` olabilir) |
| `$orderby` | `$orderby=pickupDate desc` | Sıralama |
| `$top` / `$skip` | `$top=5&$skip=5` | Sayfalama |
| `$count` | `$count=true` veya `/Rentals/$count` | Toplam kayıt sayısı |
| `$search` | `$search=Yılmaz` | Serbest metin araması (metin alanlarında) |
| lambda | `extras/any(e:e/extra_code eq 'GPS')` | Alt kalemlere göre filtre |
| `sap-locale` | `sap-locale=tr` | `localized` alanların dili (tarayıcıda `Accept-Language`) |

`$metadata` servis tanımını EDMX (XML) olarak döner. Fiori Elements ekranı bu meta veriden ve içindeki
anotasyonlardan çizer.

### Draft (taslak) teknik olarak ne yapar?
`@odata.draft.enabled` ile:
1. Her draft entity için bir **taslak tablosu** oluşur: `rentalservice_rentals_drafts`. Composition'daki alt
   kalemlerin de taslağı tutulur: `rentalservice_rentalextras_drafts`.
2. Anahtara `IsActiveEntity` eklenir. Bir kayıt ya aktiftir (`true`, ana tablo) ya da taslaktır (`false`,
   taslak tablosu): `Rentals(ID=...,IsActiveEntity=false)`.
3. Ek alanlar:
   - `HasActiveEntity`: bu taslağın aktif bir kaydı var mı (düzenleme mi, yeni kayıt mı)?
   - `HasDraftEntity`: aktif kaydın şu an açık bir taslağı var mı?
   - `DraftAdministrativeData`: kim oluşturdu, kim düzenliyor (`InProcessByUser`), ne zaman değişti.
     Tüm draft'lar için ortak tablo: `draft_draftadministrativedata`.
4. Akış:

| Fiori'de | OData isteği | Ne olur |
|---|---|---|
| "Oluştur" | `POST /Rentals` | Taslak tablosunda yeni satır |
| Alan değiştirmek | `PATCH /Rentals(...,IsActiveEntity=false)` | Sadece taslak güncellenir, doğrulama yok |
| "Düzenle" | `POST .../draftEdit` | Aktif kayıt taslağa kopyalanır ve kilitlenir |
| "Kaydet" | `POST .../draftActivate` | Doğrulamalar (ör. `@mandatory`) çalışır, taslak ana tabloya yazılır ve silinir |
| "Vazgeç" | `DELETE /Rentals(...,IsActiveEntity=false)` | Taslak silinir, aktif kayıt değişmez |

Bu aşamada denendi: başka bir kullanıcı (`bob`), `alice`'in düzenlediği kaydı açmaya çalışınca
`DRAFT_ALREADY_EXISTS` hatası alır. Bu, draft'ın getirdiği **kilit** mekanizmasıdır.

## cap-sflight'taki karşılığı
cap-sflight'ta `TravelService` içinde `Travel` entity'si `@odata.draft.enabled`'dır. `Booking` ve
`BookingSupplement` composition olduğu için taslağa birlikte girer. Bizdeki `RentalService.Rentals` +
`RentalExtras` bunun birebir karşılığı. Ana veriler (`Airport`, `Carrier` ...) orada da salt okunur value help
kaynağıdır.

## ABAP RAP'teki karşılığı
RAP'te servis üç nesneden oluşur:
1. **Projection view** (`define root view entity ... provider contract transactional_query as projection on`)
2. **Service Definition** (hangi entity'lerin yayınlanacağı)
3. **Service Binding** (protokol: OData V4 UI veya OData V4 Web API). CAP'te bunun karşılığı `@path` ve
   varsayılan OData V4 protokolüdür.

Draft, Behavior Definition'da `with draft;` ile açılır. Taslak için ayrı bir **draft tablosu** tanımlanır.

```abap
" Örnek amaçlı, derlenmemiş kod
define root view entity ZC_RENT_Rental
  provider contract transactional_query
  as projection on ZR_RENT_Rental
{
  key RentalUUID,
      RentalID,
      PickupDate,
      ReturnDate,
      TotalPrice,
      _Extras : redirected to composition child ZC_RENT_RentalExtra
}

define service ZUI_RENT_RENTAL_O4 {
  expose ZC_RENT_Rental      as Rentals;
  expose ZC_RENT_RentalExtra as RentalExtras;
}

managed implementation in class zbp_r_rent_rental unique;
strict ( 2 );
with draft;

define behavior for ZR_RENT_Rental alias Rental
persistent table zrent_a_rental
draft table zrent_d_rental
lock master total etag LastChangedAt
authorization master ( instance )
{
  create; update; delete;
  draft action Edit; draft action Activate optimized; draft action Discard; draft action Resume;
  draft determine action Prepare;
  association _Extras { create; with draft; }
}
```

## Sık yapılan hatalar
- Draft entity'ye `IsActiveEntity` vermeden erişmek. Doğrusu `Rentals(ID=...,IsActiveEntity=true)`.
- Aktif kaydı doğrudan PATCH'lemek. Draft açık entity'lerde değişiklik `draftEdit` → PATCH → `draftActivate`
  sırasıyla yapılır.
- `$filter` değerini tırnaksız yazmak (`status_code eq O`). String değerler tek tırnak içinde yazılır.
- curl'de `--data-urlencode` kullanmak: boşlukları `+` yapar ve CAP bunu reddeder. `%20` kullan veya REST Client'ı
  tercih et.
- Draft tablolarını görmek için `cds deploy`'u unutmak. Servis eklenince şema değişir, `npm run db:deploy` gerekir.

## Alıştırmalar
1. RentalService'e sadece açık kiralamaları gösteren bir projeksiyon ekle:
   `entity OpenRentals as projection on db.Rentals where status_code = 'O';` `$metadata`'da ve `/rental/OpenRentals`
   isteğinde neyin değiştiğini incele.
2. `test/requests.http`'deki draft akışını çalıştır. `f) draftEdit` adımından sonra `psql` ile
   `rentalservice_rentals_drafts` tablosuna bak. Hangi alanlar dolu, `hasactiveentity` değeri ne?
3. `$expand=extras($expand=extra)&$filter=rentalDays ge 7` ile 7 gün ve üzeri kiralamaları ek hizmetleriyle listele.
