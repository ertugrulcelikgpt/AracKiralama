# 10 — BTP deploy hazırlığı (Aşama 10)

Adım adım deploy rehberi: [`docs/deploy.md`](../deploy.md). Bu aşamada **deploy yapılmadı**; proje deploy edilebilir
hale getirildi ve şunlarla doğrulandı:

```powershell
npx cds build --production        # gen/srv + gen/db (HANA artifact'ları), hatasız
npx cds compile db --to hana      # hatasız
mbt build                         # mta_archives/rentacar_1.0.0.mtar (~25 MB)
```

## Ne yapıldı

| Komut / dosya | Etkisi |
|---|---|
| `cds add hana` | `@cap-js/hana` bağımlılığı. `[production]` için `db.kind: hana` **elle** eklendi (aşağıda neden) |
| `cds add xsuaa` | `@sap/xssec`, `[production].auth.kind: xsuaa`. `xs-security.json` elle yazılmış haliyle korundu |
| `cds add approuter` | `.deploy/app-router` (`@sap/approuter`). `xs-app.json` rotaları elle yazıldı |
| `cds add destination` | `cds.requires.destinations: true`; MTA'da Destination servisi |
| `cds add mta` | `mta.yaml`: srv, HDI deployer, approuter modülleri; XSUAA, HDI container, Destination kaynakları |
| `package.json` | `API_BUSINESS_PARTNER` için `[production]`: `destination: API_BUSINESS_PARTNER` |
| `scripts/copy-ui.mjs` | Fiori uygulamalarını approuter'ın statik klasörüne kopyalar (`npm run build:ui`, `mbt build` içinde) |
| `srv/rental-service.js` | S/4 hata mesajları production'da da görünür (`$sanitize: false`); destination yoksa `S4_NOT_CONFIGURED` |

## Bu aşamada öğrenilen kavramlar

### MTA (Multi-Target Application)
Birden fazla parçadan (Node.js servisi, veritabanı deployer'ı, approuter) ve bunların ihtiyaç duyduğu bulut
servislerinden (XSUAA, HDI, Destination) oluşan uygulamanın **tek paket** halinde tanımı: `mta.yaml`.
- **modules:** Kendi kodumuz. Her biri Cloud Foundry'de bir uygulama olur.
- **resources:** Bulut servis instance'ları. `cf deploy` yoksa oluşturur.
- **requires / provides:** Bağlantılar. `rentacar-srv` `rentacar-db`'yi "requires" eder → CF, HDI container'ın
  bağlantı bilgisini (`VCAP_SERVICES`) uygulamaya verir; CAP onu kendisi okur, şifre hiçbir dosyada durmaz.

`mbt build` paketi (`.mtar`) üretir, `cf deploy` (MultiApps eklentisi) hepsini doğru sırada kurar.

### `cds build --production`
Kaynak kodu bulut için derler:
- `gen/srv`: derlenmiş model (`csn.json`), servis kodu, i18n, `package.json`.
- `gen/db`: HANA artifact'ları (`.hdbtable`, `.hdbview`...) ve HDI deployer.
Production profili kullanıldığı için PostgreSQL/SQLite ayarları ve S/4 mock verileri pakete girmez.

### HDI container
HANA içinde uygulamaya ait, izole bir şema. Tablolar bir dosya listesinden (`.hdbtable`...) **bildirimsel
(declarative)** olarak kurulur: "tablo şu halde olmalı" denir, HDI mevcut durumla karşılaştırıp gereken değişikliği
veriyi koruyarak yapar. PostgreSQL ile farkları için: [`deploy.md` → Ek](../deploy.md#ek-hana-hdi-artifactları-ve-postgresql-tabloları).

### XSUAA ve approuter
- **XSUAA** kullanıcıyı doğrular ve rollerini taşıyan bir JWT token üretir. Roller `xs-security.json`'dan gelir:
  `scopes` (teknik yetki) → `role-templates` → `role-collections` (kullanıcıya atanan paket).
- **Approuter** uygulamanın giriş kapısıdır: kullanıcıyı SAP girişine yönlendirir, token'ı oturumda tutar, arayüz
  dosyalarını sunar, OData isteklerini token ekleyerek CAP'e iletir (`forwardAuthToken`). CAP token'daki
  `$XSAPPNAME.RentalManager` kapsamını `RentalManager` rolü olarak görür; `srv/auth.cds` hiç değişmez.

### Destination (Aşama 8'in tamamlanması)
Lokalde URL ve anahtar `.env` + `[sandbox]` profilinden; bulutta BTP Destination servisinden gelir. Kod aynıdır,
değişen sadece `cds.requires.API_BUSINESS_PARTNER.credentials` (url → destination).

## Karşılaşılan tuzaklar

1. **Production'da yanlış veritabanı.** `cds add hana` sonrası `cds env requires.db --profile production` hâlâ
   `postgres` gösterdi: projede `@cap-js/postgres` da bağımlılık olduğu için o seçiliyordu.
   Çözüm: `"db": { "[production]": { "kind": "hana" } }` açıkça yazıldı. **Ders:** `cds add` sonrası
   `cds env ... --profile production` ile kontrol et.
2. **`cds add xsuaa` scope'ları ikiledi.** Elle yazılmış açıklamalı `xs-security.json`'a aynı scope'ları ikinci kez
   ekledi; dosya geri yüklendi. **Ders:** `cds add` sonrası `git diff`'e bak.
3. **`cds add mta` PostgreSQL servisi ekledi.** `@cap-js/postgres`'i görünce BTP PostgreSQL kaynağı ve deployer
   modülü üretti; hedef HANA olduğu için çıkarıldı.
4. **Arayüz pakette yoktu.** `gen/srv` sadece servisi içerir. Approuter'a `localDir` rotaları ve `copy-ui.mjs`
   eklendi; rotalar yerelde approuter çalıştırılarak denendi (`/analytics/webapp/...` statik, `/analytics/$metadata`
   CAP'e).
5. **Production'da hata mesajı "Bad Gateway" oldu.** CAP production'da 5xx hata metinlerini gizler (saldırgana iç
   bilgi vermemek için). Bizim S/4 mesajlarımız kullanıcıya yönelik ve güvenli olduğu için `$sanitize: false`
   verildi. Bu, `NODE_ENV=production` ile yerelde duman testi (smoke test) yaparken görüldü.

## cap-sflight'taki karşılığı
cap-sflight da `mta.yaml` ile HANA Cloud'a deploy edilir: `cds build`, HDI deployer, XSUAA ve **HTML5 Application
Repository** + managed approuter. Fark: cap-sflight arayüzü HTML5 repository'ye yükler (gerçek projelerdeki yol),
biz öğrenme amaçlı olarak approuter'ın kendi klasöründen sunuyoruz (daha az servis, trial'da daha basit).

## ABAP RAP'teki karşılığı
RAP'te "deploy" yoktur: kod zaten ABAP sistemindedir. Geliştirme sisteminde aktive edilen nesneler **transport
request** ile test ve canlı sistemlere taşınır (BTP ABAP Environment'ta **gCTS** veya abapGit). Karşılıklar:

| CAP / BTP Cloud Foundry | ABAP RAP |
|---|---|
| `mta.yaml` + `mbt build` + `cf deploy` | Transport request (SE09 / ADT "Transport Organizer") veya gCTS |
| HDI container + `.hdbtable` | ABAP Dictionary tablosu (`define table`), aktivasyonla oluşur |
| XSUAA + `xs-security.json` (scope, role collection) | Yetki nesnesi + IAM App + Business Catalog + Business Role |
| Approuter + launchpad | SAP Fiori Launchpad (sistemin kendi FLP'si), IAM App ile kutucuk |
| Destination servisi | Communication Arrangement / SM59 RFC destination |

```abap
" Örnek amaçlı, derlenmemiş kod: BTP ABAP Environment'ta yetki kontrolü XSUAA scope'unun karşılığıdır.
" RentalManager rolü, IAM App'e bağlı yetki nesnesi ZRENT_MGR ile verilir.
AUTHORITY-CHECK OBJECT 'ZRENT_MGR'
  ID 'ACTVT' FIELD '16'.          " 16 = çalıştırma (approve action'ı)
IF sy-subrc <> 0.
  APPEND VALUE #( %tky = keys[ 1 ]-%tky ) TO failed-rental.
  APPEND VALUE #( %tky = keys[ 1 ]-%tky
                  %msg = new_message( id = 'ZRENT' number = '010' severity = if_abap_behv_message=>severity-error ) )
         TO reported-rental.
ENDIF.
```

## Sık yapılan hatalar
- Şifreleri veya API anahtarlarını `mta.yaml`'a, `package.json`'a yazmak. Bulutta bağlantı bilgileri servis
  bağlantılarından (`VCAP_SERVICES`) ve Destination'dan gelir.
- `cds add` çıktısını kontrol etmeden commit etmek (yukarıdaki tuzaklar 1–3).
- Trial HANA'nın gece durduğunu bilmeden "uygulama bozuldu" sanmak.
- Rol koleksiyonu atadıktan sonra aynı oturumla denemek: roller token'dadır, yeniden giriş gerekir.
- Lokal mock kullanıcıların (`agent`, `manager`) bulutta da çalışacağını sanmak.

## Alıştırmalar
1. `mta.yaml`'daki `requires` ilişkilerini bir diyagramda çiz. `rentacar-srv` neden `rentacar-auth`'a ihtiyaç duyar?
2. Uygulamayı deploy et, sonra `cf env rentacar-srv` ile `VCAP_SERVICES`'e bak. CAP HANA bağlantı bilgisini nereden
   okuyor? (Çıktıda şifreler var, kimseyle paylaşma.)
3. `RentalAnalytics`'e yeni bir alan ekle ve tekrar deploy et. HDI deployer günlüğünde (`cf logs
   rentacar-db-deployer --recent`) view'ın yeniden oluşturulduğunu, tablonun ise değişmediğini gör.
4. Araştır: Arayüzü HTML5 Application Repository + SAP Build Work Zone ile sunmak için `mta.yaml`'a hangi modül ve
   kaynaklar eklenir? (`cds add html5-repo`, `cds add workzone`)
