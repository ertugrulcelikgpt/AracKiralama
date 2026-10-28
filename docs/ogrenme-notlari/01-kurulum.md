# 01 — Ortam ve İskelet (Aşama 0)

## Bu aşamada öğrenilen kavramlar

### CAP proje yapısı
CAP "convention over configuration" (yapılandırma yerine gelenek) ilkesiyle çalışır: dosyaları belli klasörlere
koyarsan CAP onları kendiliğinden bulur.

| Klasör | Ne konur | Projedeki örnek (ileride) |
|---|---|---|
| `db/` | Veri modeli (tablolar) ve `db/data/*.csv` örnek verileri | `db/schema.cds` → `Rentals` |
| `srv/` | Servisler: dışarıya açılan API + iş mantığı | `srv/rental-service.cds` + `.js` |
| `app/` | Arayüz ve UI anotasyonları | `app/rentals/` (Fiori Elements) |

### `cds watch`
`cds watch` = `cds serve all --with-mocks --in-memory?` + dosya izleme. `db/`, `srv/`, `app/` altındaki modelleri
derler, servisleri OData olarak yayınlar ve bir dosya kaydedildiğinde sunucuyu yeniden başlatır. Model yoksa
"Waiting for some to arrive..." diyerek bekler (bu aşamadaki durum budur).
`--in-memory?` içindeki `?` "başka bir veritabanı tanımlı değilse bellek içi kullan" demektir. Biz `[development]`
profilinde PostgreSQL tanımladığımız için `cds watch` PostgreSQL'i kullanır.

### `package.json` içindeki `cds` bölümü ve profiller
CAP ayarlarını `package.json` → `cds` altından okur. Köşeli parantezli anahtarlar **profildir**:

```json
"cds": { "requires": { "db": {
  "[development]": { "kind": "postgres" },
  "[test]":        { "kind": "sqlite", "credentials": { "url": ":memory:" } }
}}}
```

- `NODE_ENV` production değilse `development` profili aktiftir. `cds watch` ve `cds deploy` PostgreSQL'e gider.
- `cds test` / `npm test` `test` profilini ekler. Test profili sonradan yazıldığı için baskın gelir ve SQLite kullanılır.
- `--profile <ad>` veya `CDS_ENV=<ad>` ile profil seçilir. `[production]` → `hana` Aşama 10'da eklendi.

**Kod neden hiç değişmiyor?** Servis kodumuz veritabanına doğrudan değil, CAP'in veritabanı servisine
(`cds.connect.to('db')`) CQL sorgusu gönderir. Hangi adaptörün (`@cap-js/postgres`, `@cap-js/sqlite`, `@cap-js/hana`)
yükleneceğine profil karar verir. Adaptör CQL'i o veritabanının SQL lehçesine (dialect) çevirir.

Hangi ayarın aktif olduğunu görmek için: `npx cds env requires.db` ve `npx cds env requires.db --profile test`.

### `.env` ile bağlantı bilgisi
CAP, `development` profilinde proje kökündeki `.env` dosyasını okur. `CDS_` ile başlayan anahtarları ayar yoluna
çevirir: `CDS_REQUIRES_DB_CREDENTIALS_HOST=localhost` → `cds.requires.db.credentials.host`. Böylece şifre
`package.json`'a girmez. `.env` git'e eklenmez (`.gitignore`), depoda sadece şablon `.env.example` durur.
`docker-compose.yml` de aynı değişkenleri okur; şifre tek bir yerde tutulur.

### Neden HANA, ne zaman PostgreSQL?
- **SAP HANA**: bellek içi (in-memory) ve kolon bazlı (columnar) bir veritabanıdır. Büyük veride toplama
  (aggregation) ve analitik sorgular çok hızlıdır. S/4HANA'nın kendi veritabanı olduğu için SAP projelerinde
  varsayılan seçimdir. HDI container'ları, calculation view'lar gibi SAP araçlarıyla entegredir.
- **PostgreSQL**: açık kaynaktır, lokalde ücretsiz ve hafiftir. BTP'de "SAP BTP, PostgreSQL on SAP BTP,
  hyperscaler option" servisi ile de kullanılabilir. HANA lisansı gerektirmeyen, analitik yükü düşük veya
  maliyet odaklı CAP uygulamalarında tercih edilir.

## cap-sflight'taki karşılığı
cap-sflight da aynı `db/`, `srv/`, `app/` düzenini kullanır. Veritabanını `package.json` → `cds.requires` altında
profillerle seçer: geliştirmede hafif bir lokal veritabanı, üretimde SAP HANA. Bizim farkımız, lokalde de gerçek
bir sunucu veritabanı (PostgreSQL) kullanmamız.

## ABAP RAP'teki karşılığı
RAP'te "lokal proje" yoktur. Kod doğrudan bir ABAP sisteminde (BTP ABAP Environment veya S/4HANA) yaşar ve ADT
(Eclipse) ile geliştirilir. Proje klasörünün karşılığı bir **ABAP paketi** (`ZRENTACAR`), git'in karşılığı
transport request veya abapGit'tir. Veritabanı her zaman sistemin kendi HANA'sıdır; profil ile veritabanı
değiştirme kavramı yoktur.

İlk "merhaba dünya" ADT'de bir konsol sınıfıyla yapılır:

```abap
" Örnek amaçlı, derlenmemiş kod
CLASS zcl_rentacar_hello DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    INTERFACES if_oo_adt_classrun.
ENDCLASS.

CLASS zcl_rentacar_hello IMPLEMENTATION.
  METHOD if_oo_adt_classrun~main.
    out->write( |RentACar: { sy-datum DATE = ISO }| ).
  ENDMETHOD.
ENDCLASS.
```

## Sık yapılan hatalar
- `.env` dosyasını commit etmek. `.gitignore`'u kontrol et; `git check-ignore -v .env` ile doğrula.
- `.env` oluşturmayı unutmak. O zaman şifre boş gider ve PostgreSQL "password authentication failed" der.
- Windows'ta 5432 portunu kullanan başka bir PostgreSQL kurulumu varsa container başlamaz. `.env`'de portu
  (ör. 5433) değiştir.
- `npm run db:deploy`'u container sağlıklı (healthy) olmadan çalıştırmak. `db:up` script'i `--wait` ile bunu bekler.
- `NODE_ENV=production` ayarlıyken `.env`'in okunmasını beklemek. `.env` sadece `development` profilinde okunur.

## Alıştırmalar
1. `npx cds env requires.db --profile test` çıktısını incele. Hangi adaptör (`impl`) seçiliyor ve neden?
2. `.env` dosyasında portu 5433 yap. `docker compose up -d` ile container'ı yeniden oluştur ve CAP'in yeni porta
   bağlandığını `npx cds env requires.db.credentials` ile doğrula. Sonra geri al.
3. `docker exec -it rentacar-db psql -U postgres -d rentacar` ile veritabanına bağlan ve `\l` ile veritabanlarını
   listele. `rentacar` veritabanı nereden geldi?
