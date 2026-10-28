# 07 — Testler (Aşama 6)

## Komutlar

```powershell
npm test            # 92 test, bellek içi SQLite (~6 sn), Docker gerekmez
npm run test:pg     # aynı 92 test, PostgreSQL (rentacar_test veritabanı, ~13 sn), önce: npm run db:up
```

## Bu aşamada öğrenilen kavramlar

### `cds.test` ve entegrasyon testi
`@cap-js/cds-test` paketi CAP sunucusunu test içinde başlatır, veritabanını kurar, CSV'leri yükler ve gerçek HTTP
istekleri atmamızı sağlar:

```js
const { GET, POST, expect } = cds.test(projeKlasoru)
const { data } = await GET('/rental/Rentals', { auth: { username: 'agent', password: 'agent' } })
```

- **Birim testi (unit test):** tek bir fonksiyonu izole test eder. `test/pricing.test.js` → `calculatePrice`.
  Sunucu yok, milisaniyeler sürer.
- **Entegrasyon testi:** OData → servis → handler → veritabanı zincirinin tamamını test eder. Diğer test
  dosyaları böyle. Yetki, draft, i18n mesajları dahil gerçek davranışı doğrular.

### Test yapısı

| Dosya | Ne test eder | Test sayısı |
|---|---|---|
| `test/pricing.test.js` | K5 fiyat fonksiyonu (1, 6, 7, 13, 14 gün; farklı şube; ek hizmet; %30 sınırı; yuvarlama; eksik girdi) | 11 |
| `test/rental-rules.test.js` | Draft akışı, K1–K8 (başarılı ve hatalı), taslakta anlık fiyat, çoklu hata, TR/EN mesaj | 37 |
| `test/rental-actions.test.js` | 5 action'ın ön koşulu ve sonucu, indirim kırpma + `sap-messages`, taslak kilidi | 20 |
| `test/auth.test.js` | 401/403, rol bazlı action yetkisi, silme yasağı, salt okunur ana veri, `canManage` | 18 |
| `test/admin.test.js` | Kullanımdaki araç/şube/ek hizmetin silinememesi (Aşama 7'de eklendi) | 6 |
| `test/helpers.js` | Ortak yardımcılar: `draft()`, `activate()`, `createRental()`, `action()`, `failure()` | — |

### Testleri tarihten bağımsız yazmak
Örnek verideki tarihler (Kasım 2026) birkaç ay sonra geçmişte kalacak. Testler buna bağlı olsaydı K1 ("teslim
geçmişte olamaz") yüzünden zamanla kırılırdı. Bu yüzden:
- Kiralama tarihleri `day(30)` = "bugünden 30 gün sonra" ile üretiliyor.
- K4 için müşteriler test içinde, teslim gününe göre tam istenen yaşta oluşturuluyor:
  `yearsBefore(pickupDate, 21)` → teslim günü 21. doğum günü.
- Action testleri tarihe bakmayan örnek kiralamaları kullanıyor (1004, 1007...).

### Test izolasyonu: `data.reset()`
Her testten önce `beforeEach(() => t.test.data.reset())` tüm tabloları boşaltıp CSV'leri yeniden yükler. Testler
birbirini etkilemez, hangi sırayla çalıştıkları önemsizdir.

### Karşılaşılan tuzaklar (ve çözümleri)
1. **Testler yanlış veritabanında çalıştı.** CAP profili `NODE_ENV`'den belirler. Jest bunu `test` yapar, Mocha
   yapmaz. İlk denemede testler development profiliyle **PostgreSQL geliştirme veritabanında** çalıştı.
   Çözüm: `test/setup.cjs` (Mocha `--require`) `NODE_ENV=test` ayarlar.
2. **SQLite bellek içi olmadı, tablolar yoktu.** `development` profili test sırasında da aktif kaldığı için `.env`'deki
   `CDS_REQUIRES_DB_CREDENTIALS_DATABASE=rentacar` test profiline sızdı. CAP, `database` değeri `:memory:` olmadığı
   için şemayı kurmadı. Çözüm: `setup.cjs` bu değişkeni `:memory:` olarak sabitler (CAP mevcut ortam
   değişkenlerini `.env` ile ezmez).
3. **Testler takıldı.** Mocha tüm dosyaları tek süreçte çalıştırır. Her dosyanın kendi `cds.test()` çağrısı aynı
   süreçte birden fazla sunucu başlattı. Çözüm: `helpers.js` sunucuyu bir kez başlatıp paylaşır.
4. **Geliştirme verisini koruma.** `test:pg` ayrı bir veritabanı (`rentacar_test`) kullanır. Yoksa
   `setup-pg.cjs` oluşturur ve şemayı deploy eder. İlk testlerden biri hangi veritabanında çalışıldığını doğrular:
   PostgreSQL ise adı `rentacar_test` olmalıdır.

## SQLite ve PostgreSQL farkları (ölçülen)

Aynı sorgular, aynı verilerle iki veritabanına gönderildi:

| Konu | SQLite (`npm test`) | PostgreSQL (`npm run test:pg`) | Bu projeye etkisi |
|---|---|---|---|
| `$search=istanbul` (veri: "İstanbul") | **0 sonuç**: `lower()` sadece ASCII harfleri küçültür, "İ" değişmez | 5 sonuç | Türkçe aramayı SQLite'ta test etme; `test:pg` ile doğrula |
| `$orderby=lastName` | Bayt sırası: `... Yıldız Yılmaz Özdemir Öztürk Şahin` (Ö, Ş en sonda) | Dil kuralı (collation): `... Kurt Özdemir Öztürk Polat Şahin Yıldız` | Sıralama testleri Türkçe karakterli veriyle DB'ye bağımlı olur |
| `contains(lastName,'yılmaz')` | 0 (büyük/küçük harfe duyarlı) | 0 (duyarlı) | Aynı |
| Ondalık (`Decimal`) JSON'da | `"13020.00"` (metin) | `"13020.00"` (metin) | Aynı; testlerde `Number()` ile karşılaştırılıyor |
| `cast(rentalID as String(10))` | `"1000"` | `"1000"` | Aynı |
| Tarih karşılaştırması (`pickupDate ge 2026-11-10`, K2) | Doğru (tarih ISO metni) | Doğru (`DATE` tipi) | Aynı; CQL ile yazıldığı için |
| `max(rentalID)` (K8) | Doğru | Doğru | Aynı |
| Test süresi (86 test, Aşama 6) | ~6 sn | ~13 sn | Günlük geliştirmede SQLite, CI'da ikisi |
| Eşzamanlılık | Tek yazıcı (dosya kilidi) | Gerçek eşzamanlı işlemler | K8 yarış durumu sadece PostgreSQL/HANA'da gerçekçi test edilir |

Neden iş kurallarında tarih hesabını (yaş, gün farkı) SQL'de değil JavaScript'te yaptık: tarih fonksiyonları her
veritabanında farklıdır. Gün farkı PostgreSQL'de `date2 - date1`, SQLite'ta `julianday(date2) - julianday(date1)`,
HANA'da `DAYS_BETWEEN(date1, date2)` ile alınır. CQL ve JavaScript ile üçünde de aynı sonucu alıyoruz.

## cap-sflight'taki karşılığı
cap-sflight da `cds.test` ile entegrasyon testleri yazar (`test/` klasörü). Draft akışını (NEW → PATCH → draftActivate),
action'ları ve hesaplanan `TotalPrice`'ı test eder. Bizim yapımız aynı. Farkımız: tarihten bağımsız test verisi
ve PostgreSQL'e karşı ikinci bir koşu.

## ABAP RAP'teki karşılığı
RAP'te testler **ABAP Unit** ile yazılır (test sınıfı `FOR TESTING`). İş nesnesi gerçek veritabanına dokunmadan
**test double**'larla test edilir:
- `cl_botd_txbufdbl_bo_test_env`: EML çağrılarını taklit eden işlem tamponu (transactional buffer double)
- `cl_osql_test_environment`: ABAP SQL tablolarını test verisiyle değiştirir
- `cl_cds_test_environment`: CDS view'ları test verisiyle değiştirir

```abap
" Örnek amaçlı, derlenmemiş kod
CLASS ltcl_rental DEFINITION FINAL FOR TESTING DURATION SHORT RISK LEVEL HARMLESS.
  PRIVATE SECTION.
    CLASS-DATA sql_env TYPE REF TO if_osql_test_environment.
    CLASS-METHODS class_setup.
    METHODS approve_sets_status_a FOR TESTING.
ENDCLASS.

CLASS ltcl_rental IMPLEMENTATION.
  METHOD class_setup.
    sql_env = cl_osql_test_environment=>create( i_dependency_list = VALUE #( ( 'ZRENT_A_RENTAL' ) ) ).
  ENDMETHOD.

  METHOD approve_sets_status_a.
    sql_env->insert_test_data( VALUE ztt_rental( ( rental_uuid = '1' status = 'O' ) ) ).
    MODIFY ENTITIES OF zr_rent_rental ENTITY Rental
      EXECUTE approve FROM VALUE #( ( RentalUUID = '1' ) ) RESULT DATA(result).
    cl_abap_unit_assert=>assert_equals( exp = 'A' act = result[ 1 ]-%param-Status ).
  ENDMETHOD.
ENDCLASS.
```

## Sık yapılan hatalar
- Testleri örnek verinin tarihlerine bağlamak: bugün geçen test birkaç ay sonra kırılır.
- Testlerin hangi veritabanında çalıştığını kontrol etmemek. Yanlış profil geliştirme verisini silebilir; bu
  projede bir koruma testi var.
- Testlerin birbirine bağımlı olması (bir testin oluşturduğu kayda diğerinin güvenmesi). `data.reset()` ile her
  test temiz başlar.
- Mocha'da her dosyada ayrı `cds.test()` çağırmak (Jest'te sorun değil, Mocha'da çakışır).
- Hata yanıtında sadece durum kodunu kontrol etmek. Hata **kodunu** da (`RENTAL_VEHICLE_NOT_AVAILABLE`) ve gerekiyorsa
  **hedefini** (`in/returnDate`) kontrol et; aksi halde yanlış sebeple dönen 400 de testi geçirir.

## Alıştırmalar
1. Aşama 3'teki K9 alıştırmasını ("müşteri başına en fazla 2 açık kiralama") yaptıysan, önce testini yaz (kırmızı),
   sonra kuralı uygula (yeşil). Buna test-driven development (TDD) denir.
2. `$search` farkını gösteren bir test yaz: "istanbul" araması SQLite'ta 0, PostgreSQL'de 5 sonuç döner. Testi
   sadece PostgreSQL'de çalıştırmak için `cds.db.kind`'e göre `this.skip()` kullan.
3. `npm test -- --grep K4` ile sadece K4 testlerini çalıştır. `--grep` neye göre filtreliyor?
