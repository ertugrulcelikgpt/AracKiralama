# 06 — Fiori Elements Arayüzü (Aşama 5)

## Bu aşamada öğrenilen kavramlar

### Fiori Elements ve floorplan'lar
Fiori Elements, ekranı JavaScript veya XML yazmadan **servisin `$metadata`'sındaki anotasyonlardan** üreten
SAP çatısıdır. Hazır sayfa düzenlerine **floorplan** denir:
- **List Report:** filtre çubuğu + tablo (`app/rentals` ilk ekran)
- **Object Page:** başlık + bölümler (facet), düzenleme (draft) ve action butonları

Uygulamanın kendisi sadece üç dosyadır:

| Dosya | Görevi |
|---|---|
| `webapp/manifest.json` | Kimlik kartı: hangi OData servisi (`/rental/`), hangi sayfalar (`sap.fe.templates.ListReport` / `ObjectPage`), aralarındaki yönlendirme (routing), launchpad için `crossNavigation` (semantic object + action) |
| `webapp/Component.js` | `sap/fe/core/AppComponent`'ten türeyen boş sınıf; tüm iş manifest'te |
| `webapp/index.html` | UI5'i `https://ui5.sap.com/1.153.0/` CDN'inden yükler ve bileşeni sayfaya yerleştirir |

`cds watch`, `app/` klasörünü statik olarak sunar: `http://localhost:4004/rentals/webapp/index.html`.
`app/index.html` + `app/fioriSandboxAppConfig.json` ise Fiori Launchpad sandbox'ıdır (kutucuklar).

### Anotasyon dosyaları
| Dosya | İçerik |
|---|---|
| `db/labels.cds` | Alan etiketleri (`@title: '{i18n>...}'`); her yerde ortak |
| `app/common.cds` | Kod yerine metin (`@Common.Text`), value help (`@Common.ValueList`), para birimi (`@Measures.ISOCurrency`) |
| `app/rentals/annotations.cds` | Kiralama ekranlarının düzeni (`@UI.*`) |
| `app/vehicles/annotations.cds` | Filo ekranlarının düzeni |
| `srv/field-control.cds` | Dinamik davranış: buton aktif/pasif, SideEffects, Düzenle/Sil gizleme |

### Hangi anotasyon ekranda ne üretir?

| Anotasyon | Ekranda ürettiği | Projede |
|---|---|---|
| `@UI.HeaderInfo` | Nesne sayfası başlığı (Title + Description) ve tablo başlığı ("Kiralamalar (41)") | `rentalID` + `customer.fullName` |
| `@UI.SelectionFields` | Liste üstündeki filtre çubuğu alanları | Statü, şube, müşteri, teslim tarihi, araç kategorisi (`vehicle.category_code`: ilişki üzerinden filtre) |
| `@Capabilities.FilterRestrictions` (`SingleRange`) | Tarih filtresinin tek gün yerine **aralık** seçtirmesi | `pickupDate` |
| `@UI.PresentationVariant` | Tablonun varsayılan sıralaması | `rentalID` azalan |
| `@UI.LineItem` | Tablo sütunları; `Criticality` ile renkli ve simgeli statü | 8 sütun |
| `@UI.Importance` | Dar ekranda hangi sütunun asla gizlenmeyeceği (`#High`) | Numara, müşteri, araç, tarihler, tutar, statü |
| `@UI.DataPoint` + `@UI.HeaderFacets` | Nesne sayfası başlığındaki büyük göstergeler | Statü (renkli), Toplam Tutar |
| `@UI.Identification` (`DataFieldForAction`) | Nesne sayfasının sağ üstündeki action butonları | Onayla, Reddet, İndirim Uygula, Tamamla, İptal Et |
| `@UI.Facets` (`ReferenceFacet`) | Nesne sayfasının bölümleri ve sekmeleri | Genel Bilgiler, Araç ve Şubeler, Fiyat Detayı, Ek Hizmetler (tablo), Teslim Bilgileri, Yönetim Bilgileri |
| `@UI.FieldGroup` | Bir bölümün içindeki alan formu | `#General`, `#PriceDetails` ... |
| `@Common.Text` + `@Common.TextArrangement: #TextOnly` | UUID/kod yerine okunur metin | `customer_ID` → "Ahmet Yılmaz", `vehicle_ID` → "Toyota Corolla (34 RAC 201)" |
| `@Common.ValueList` | Alanın yanında value help ikonu ve seçim penceresi | Müşteri, araç (sadece `status_code = 'AV'`, `ValueListParameterConstant` ile) |
| `@Common.ValueListWithFixedValues` | Value help yerine açılır liste (dropdown) | Şubeler, statü, ek hizmet, kategori ... |
| `@Measures.ISOCurrency` / `@Measures.Unit` | Sayının yanında "TRY", "km", "%" | Fiyat alanları, km, indirim |
| `@UI.MultiLineText` | Çok satırlı metin kutusu | Notlar, red sebebi (popup'ta da) |
| Action parametresinde `@title` | Action popup'ındaki alan etiketi | "Red Sebebi", "İade Km", "İndirim (%)" |
| `@UI.UpdateHidden` (dinamik) | "Düzenle" butonunu duruma göre gizler | Sadece Açık kiralamalar (K7) |
| `@UI.DeleteHidden` | "Sil" butonunu gizler | Kiralama silinmez, iptal edilir |
| `@Core.OperationAvailable` | Action butonunu aktif/pasif yapar | Statü + `canManage` (rol) |
| `@Common.SideEffects` | Alan değişince / action bitince hangi verilerin yeniden okunacağı | Tarih → fiyat; action → tüm kayıt |

### Rol farkını arayüzde göstermek: `canManage`
Fiori, kullanıcının rolünü bilmez. Yönetici butonları agent için pasif görünsün diye servise sanal bir alan
eklendi:

```cds
entity Rentals as projection on db.Rentals { *, virtual null as canManage : Boolean } actions { ... }
```

`after('READ')` bu alanı `req.user.is('RentalManager')` ile doldurur, `@Core.OperationAvailable` da
`in/canManage`'e bakar. Sanal alan veritabanından gelmediği için, istemci `$select` ile istediyse doldurulur.
Bu sadece görünümdür; yetkiyi `srv/auth.cds` korur.

### Karşılaşılan pratik sorunlar (ve çözümleri)
- **Sayfa boş görünüyor:** Fiori Elements %100 yükseklik ister. `index.html`'de
  `html, body, body > div, #container, #container-uiarea { height: 100% }` ve `data-height="100%"` gerekir.
- **"1.011" gibi binlik ayraçlı numara:** UI5 tamsayıları gruplayarak gösterir. Kiralama no için metin
  karşılığı (`rentalNo = cast(rentalID as String(10))`) + `@Common.Text`; model yılı için `String(4)` kullanıldı.
- **Sütunlar kayboluyor:** Uzunluğu belirsiz (`String`) veya uzun (`CodeList.name` = 255) alanlar geniş
  sütun üretir. Hesaplanan alanlara uzunluk verildi, kod listesi sütunlarına manifest'te genişlik tanımlandı
  (`controlConfiguration`).
- **Action sonrası statü metni eski kalıyor:** Yanıtta `status_code` güncel ama `status/name` yeniden
  okunmuyor. Action'a `@Common.SideEffects: { TargetEntities: ['in'] }` eklendi.
- **LrepConnector 404:** Kişiselleştirme (variant) için `/sap/bc/lrep` aranıyor. Standalone `index.html`'de
  `data-sap-ui-flexibility-services='[{"connector":"LocalStorageConnector"}]'` ile tarayıcıda saklanıyor.
- **Launchpad:** UI5 1.136'dan beri eski `sandbox.js` kullanımdan kalktı. 1.147+ `SandboxBootTask.js` +
  `fioriSandboxAppConfig.json` kullanılıyor.

## cap-sflight'taki karşılığı
| Bu proje | cap-sflight |
|---|---|
| `app/rentals` (List Report + Object Page) | `app/travel_processor` |
| `app/vehicles` | `app/travel_analytics` (farklı amaç, aynı yapı) |
| `app/common.cds` | `app/common.cds` (value help, text) |
| `srv/field-control.cds` | `app/travel_processor/field-control.cds` |
| `app/index.html` (launchpad) | `app/launchpage.html` |

## ABAP RAP'teki karşılığı
RAP'te UI anotasyonları **Metadata Extension** (`annotate view ... with`) dosyasında yazılır. Anotasyon adları
aynıdır (`@UI.lineItem`, `@UI.facet`, `@UI.identification`), yazım biçimi farklıdır. Uygulama ise ADT'deki
**Service Binding** önizlemesiyle veya BAS'ta Fiori Tools ile üretilir.

```abap
" Örnek amaçlı, derlenmemiş kod
@Metadata.layer: #CORE
@UI.headerInfo: { typeName: 'Kiralama', typeNamePlural: 'Kiralamalar',
                  title: { value: 'RentalID' }, description: { value: 'CustomerName' } }
annotate view ZC_RENT_Rental with
{
  @UI.facet: [ { id: 'General', purpose: #STANDARD, type: #IDENTIFICATION_REFERENCE,
                 label: 'Genel Bilgiler', position: 10 } ]

  @UI.lineItem: [ { position: 10, importance: #HIGH } ]
  @UI.selectionField: [ { position: 10 } ]
  RentalID;

  @UI.lineItem: [ { position: 80, criticality: 'StatusCriticality', importance: #HIGH } ]
  @UI.identification: [ { type: #FOR_ACTION, dataAction: 'approve', label: 'Onayla' } ]
  @Consumption.valueHelpDefinition: [ { entity: { name: 'ZI_RENT_StatusVH', element: 'Status' } } ]
  Status;

  @UI.lineItem: [ { position: 70 } ]
  TotalPrice;
}
```

| CAP | RAP |
|---|---|
| `@Common.ValueList` | `@Consumption.valueHelpDefinition` |
| `@Common.Text` | `@ObjectModel.text.element` |
| `@UI.LineItem: [{ Value: x }]` (entity seviyesinde liste) | Alan başına `@UI.lineItem: [{ position: n }]` |
| `@Core.OperationAvailable` | `features : instance` (BDEF) |

## Sık yapılan hatalar
- Anotasyonu servis entity'si yerine yanlış entity'ye yazmak (ör. `AdminService.Vehicles` yerine
  `RentalService.Vehicles`). Ortak olanları `app/common.cds`'te veri modeline yaz.
- `@Common.ValueList`'te `LocalDataProperty`'ye ilişkiyi (`customer`) yazmak. Doğrusu yabancı anahtar
  (`customer_ID`).
- Model değişince `npm run db:deploy`'u unutmak. PostgreSQL view'ları eski kalır, "column does not exist" hatası
  gelir. `cds watch` PostgreSQL şemasını kendisi güncellemez.
- `npm run db:reset` sonrası `cds watch`'ı yeniden başlatmamak. Havuzdaki bağlantılar koptuğu için sunucu kapanır.
- UI5 i18n `.properties` dosyalarında Türkçe karakteri doğrudan yazmak. UI5 bu dosyaları ISO-8859-1 okuyabilir;
  `ö` gibi kaçış kullanıldı.

## Alıştırmalar
1. Liste sayfasına "Teslim Şubesi" yerine "Ek Hizmet Ücreti" sütununu ekle ve `@UI.Importance: #Low` ver.
   Pencereyi daralttığında ne oluyor?
2. Kiralama nesne sayfasının başlığına üçüncü bir data point ekle: "Gün Sayısı" (`rentalDays`).
3. Müşteri value help'inde ehliyet veriliş tarihini de göster. Value help'te hangi alanlar arama yapılabilir?
   (İpucu: `@Common.ValueListParameterIn` / `DisplayOnly` farkı.)
