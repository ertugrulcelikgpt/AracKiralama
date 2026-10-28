# 09 — Analitik (Aşama 9)

| Varsayılan: şube bazında ciro | Grafik ayarından: aylık trend (çizgi) |
|---|---|
| ![Ciro analizi](../img/14-analiz-ciro.png) | ![Aylık trend](../img/15-analiz-aylik-trend.png) |

## Ne yapıldı

- `srv/analytics-service.cds`: `AnalyticsService` (`/analytics`, sadece RentalManager). Tek bir entity var,
  `RentalAnalytics`: onaylanmış (A) ve tamamlanmış (C) kiralamaların düzleştirilmiş görünümü.
- `app/analytics`: **Analytical List Page (ALP)**. Üstte grafik, altta analitik tablo, ikisi aynı filtreleri
  kullanır. Launchpad'de "Kiralama Analizi" kutucuğu.
- Örnek veriye Nisan–Ekim 2026 arası 29 tamamlanmış geçmiş kiralama eklendi (1012–1040); fiyatlar `calculatePrice`
  ile hesaplandı. Aylık trend birkaç kayıtla anlamsız olurdu.

| Soru | OData isteği |
|---|---|
| Şube bazında ciro | `/analytics/RentalAnalytics?$apply=groupby((branch,branchName),aggregate(revenue))` |
| Kategori bazında kiralama sayısı | `...?$apply=groupby((category,categoryName),aggregate(rentalCount))` |
| Aylık trend | `...?$apply=groupby((pickupMonth),aggregate(revenue,rentalCount))` |
| Genel toplam | `...?$apply=aggregate(revenue,rentalCount,rentalDays)` |

Arayüzde: varsayılan grafik şube bazında ciro. **Görüntüleme ölçütü** (View By) grafiği bir alt boyuta indirir
(drill-down; ör. şube → ay). Grafiği tamamen değiştirmek için **⚙ Ayarlar** → Boyutlar'da "Teslim Şubesi" yerine
"Teslim Ayı" veya "Araç Kategorisi", Ölçüler'de "Ciro" yerine "Kiralama Sayısı"; grafik türü düğmesinden
"Çizgi Grafik". Ayarlanan görünüm **varyant** olarak kaydedilebilir ("Standart" yanındaki ok).

## Bu aşamada öğrenilen kavramlar

### Boyut (dimension) ve ölçü (measure)
Analitikte her alan iki türden biridir:
- **Boyut:** Gruplanan, "neye göre?" sorusunun cevabı: şube, kategori, ay, durum. `@Analytics.Dimension`.
- **Ölçü:** Toplanan sayı: ciro, kiralama sayısı, gün. `@Analytics.Measure` + nasıl toplanacağı
  `@Aggregation.default: #SUM`.

Kiralama sayısı için `1 as rentalCount` diye sabit bir alan tanımlandı; toplamı satır sayısını verir. Bu, her
veritabanında çalışan en basit yoldur.

### OData `$apply`
OData V4'ün veri toplama (aggregation) uzantısı. SQL'deki `GROUP BY` + `SUM`'ın URL karşılığı:

```text
$apply=filter(status eq 'C')/groupby((branch),aggregate(revenue))/orderby(revenue desc)/top(3)
→ SELECT branch, sum(revenue) FROM ... WHERE status='C' GROUP BY branch ORDER BY ... LIMIT 3
```

CAP `$apply`'ı kendisi çevirir; handler yazmak gerekmez. `aggregate(revenue)` kısa yazımında hangi fonksiyonun
kullanılacağını `@Aggregation.default` söyler (`aggregate(revenue with sum as total)` açık yazımdır).

### `@Aggregation.ApplySupported` ve `CustomAggregate`
Fiori'ye "bu entity toplanabilir, şu alanlar gruplanabilir, şunlar toplanabilir" bilgisini verir. ALP ve
analitik tablo bu anotasyon olmadan çalışmaz. Her ölçü için `@Aggregation.CustomAggregate#<alan>` da gerekir:
UI5 toplamın tipini buradan öğrenir.

### Para birimi ve tutar (`@Semantics`)
Ciro TL cinsinden. Farklı para birimleri toplanırsa sonuç anlamsız olur (100 TL + 100 EUR ≠ 200). CAP bunu
`@Semantics.amount.currencyCode: 'currency'` ve `@Semantics.currencyCode` ile bilir: grupta tek para birimi varsa
toplamı ve birimi döner, karışıksa toplamı `null` yapar. Bu anotasyonlar ABAP CDS'tekilerle aynı isimdedir.

### Hesaplanan boyut: ay
Ay boyutu `substring(cast(pickupDate as String(10)), 0, 7)` → `2026-07`. CAP bunu her veritabanının diline
çevirir (PostgreSQL ve SQLite'ta `substr(CAST(... AS VARCHAR))`, HANA'da `NVARCHAR`). Metin olarak tutmak,
binlik ayraçsız görünmesini ve doğru sıralanmasını sağlar. Dikkat: CDS'te `substring` OData kuralıyla **0'dan**
sayar; `substring(x, 1, 7)` ilk karakteri atlar.

### Analytical List Page (ALP)
Fiori Elements'in analiz şablonu (`sap.fe.templates.AnalyticalListPage`). `UI.Chart` (grafik tanımı) ve
`UI.LineItem` (tablo), `UI.PresentationVariant.Visualizations` ile birlikte gösterilir. Grafikte bir çubuğa
tıklamak tabloyu filtreler. Tablo `AnalyticalTable` tipindedir: gruplama ve ara toplam yapabilir.
Manifest'te `sap.viz` ve `sap.chart` kütüphaneleri gerekir.

## Karşılaşılan tuzaklar

1. **"Result type for custom aggregation of property currency not found":** Tutar alanı para birimine bağlıysa UI5
   birimin de toplanmasını ister. `@Aggregation.CustomAggregate#currency: 'Edm.String'` + `@Semantics.currencyCode`
   eklendi.
2. **Metin alanlarını gruplanabilir listeden çıkarmak:** `branchName` listeden çıkarılınca tablo "invalid segment:
   branchName" verdi. Fiori metni kodla birlikte gruplayarak okur; metin alanları gruplanabilir kalmalı. Grafikteki
   seçim listesinde iki kez "Araç Kategorisi" görünmesin diye metin alanlarına ayrı etiket verildi ("Kategori Adı").
3. **Aylık trend karışık sırada çizildi.** Önce `SortOrder: revenue desc` grafiğe de uygulandı (aylar ciroya göre
   dizildi). Kaldırılınca PostgreSQL grupları rastgele döndürdü (hash aggregate). Çözüm
   (`srv/analytics-service.js`): sıralama istenmemiş gruplu sorgu gruplama alanlarına göre sıralanır.
4. **Grafik başlığı sabittir.** Kullanıcı boyutu değiştirse de `UI.Chart.Title` değişmez; bu yüzden başlık genel
   ("Ciro Analizi").

## cap-sflight'taki karşılığı
cap-sflight'ta `app/analytics` uygulaması aynı yapıdadır: `AnalyticsService` içinde `Bookings` entity'si,
`@Aggregation.ApplySupported`, `@Analytics.AggregatedProperty`, ALP ve analitik tablo. Fark: cap-sflight ölçüleri
`AggregatedProperty` (dinamik ölçü) ile tanımlar; biz `CustomAggregate` + `@Aggregation.default` kullandık. Bu hem
grafik hem tablo için tek tanım yeterli olsun diye seçildi.

## ABAP RAP'teki karşılığı
ABAP'ta analitik, **analitik sorgu** (analytical query) ile yapılır: bir CDS view'u küp (cube) olarak işaretlenir,
üzerine `@Analytics.query: true` olan bir sorgu view'u yazılır. Ölçüler `@Aggregation.default: #SUM` ile, para
birimi `@Semantics.amount.currencyCode` ile işaretlenir; anotasyon isimleri CAP'tekilerle aynıdır.

```abap
" Örnek amaçlı, derlenmemiş kod
@AccessControl.authorizationCheck: #CHECK
@EndUserText.label: 'Kiralama küpü'
@Analytics.dataCategory: #CUBE
define view entity ZI_RENT_RentalCube as select from zrent_a_rental as Rental
  association [1..1] to ZI_RENT_Branch as _Branch on $projection.PickupBranch = _Branch.BranchCode
{
  key Rental.rental_uuid                     as RentalUUID,
      @ObjectModel.foreignKey.association: '_Branch'
      Rental.pickup_branch                    as PickupBranch,
      cast( left( cast( Rental.pickup_date as abap.char(8) ), 6 ) as abap.numc(6) ) as PickupMonth,
      @Semantics.amount.currencyCode: 'Currency'
      @Aggregation.default: #SUM
      Rental.total_price                      as Revenue,
      @Aggregation.default: #SUM
      cast( 1 as abap.int4 )                  as RentalCount,
      Rental.currency                         as Currency,
      _Branch
}
where Rental.status = 'A' or Rental.status = 'C'

@EndUserText.label: 'Şube bazında ciro'
@Analytics.query: true
define transient view entity ZC_RENT_RevenueByBranch
  provider contract analytical_query
  as projection on ZI_RENT_RentalCube
{
  @AnalyticsDetails.query.axis: #ROWS
  PickupBranch,
  @AnalyticsDetails.query.axis: #COLUMNS
  Revenue,
  RentalCount,
  Currency
}
```

Sorgu, Fiori'de **Multidimensional Report** veya **Analytical List Page** ile; SAP Analytics Cloud'da doğrudan
açılır. OData tarafında RAP aynı `$apply` standardını kullanır.

## Sık yapılan hatalar
- Ölçüyü `@Aggregation.default` olmadan tanımlamak: `aggregate(revenue)` "Default aggregation not found" verir.
- Farklı para birimlerini toplamak (`@Semantics` olmadan sonuç sessizce yanlış olur).
- İptal ve reddedilen kiralamaları ciroya katmak: önce "ciro"nun iş tanımını yapın.
- Tarih fonksiyonlarını tek veritabanına göre yazmak (`date_part`, `strftime`); CDS'in taşınabilir fonksiyonlarını
  kullanın ve iki veritabanında da derleyin.
- Analitik testleri sabit sayılara bağlamak: testlerimiz beklenen değeri satırları JavaScript'te toplayarak
  hesaplıyor, örnek veri değişse de geçerli kalıyor.

## Alıştırmalar
1. `RentalAnalytics`'e "uzun süreli mi?" (7 gün ve üzeri) boyutunu ekle. Hangi CDS ifadesi üç veritabanında da
   çalışır? (`case when ... then ... end`)
2. Ortalama kiralama süresini gösteren bir ölçü ekle. `#AVG` ile `sum(rentalDays) / sum(rentalCount)` arasındaki
   fark nedir? Gruplar arasında hangisi doğru sonuç verir?
3. Kategori bazında kiralama sayısını gösteren bir **varyant** kaydet. Varyant nerede saklanıyor? (İpucu:
   `index.html`'deki `data-sap-ui-flexibility-services`.)
4. ALP'nin filtre çubuğuna "görsel filtre" (visual filter: küçük grafikli filtre) eklemek için hangi anotasyonlar
   gerekir? Fiori Elements dokümantasyonunda "Visual Filters" bölümünü bul.
