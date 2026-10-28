# 08 — S/4HANA entegrasyonu (Aşama 8)

Ayrıntılı mimari, modlar ve sandbox kurulumu: [`docs/s4-entegrasyonu.md`](../s4-entegrasyonu.md).

## Komutlar

```powershell
npm run watch       # mock modu: S/4 yerine srv/external/data/*.csv (internet gerekmez)
npm run sandbox     # SAP sandbox'ı; önce .env'e BP_API_KEY=... ekle
npm test            # 109 test, S/4 testleri mock modunda
```

## Bu aşamada öğrenilen kavramlar

### Uzak servis (remote service) ve `cds import`
Başka bir sistemin API'sini CAP'te kullanmak için önce onun **metadata**'sı (EDMX) içe aktarılır:

```powershell
npx cds import srv\external\API_BUSINESS_PARTNER.edmx
```

Bu komut `srv/external/API_BUSINESS_PARTNER.csn` (CDS modeli) üretir ve `package.json`'a bir `cds.requires`
kaydı ekler (`kind: "odata-v2"`). Artık uzak entity'ler (`A_BusinessPartner` ...) kendi entity'lerimiz gibi
`using` ile kullanılabilir. Bağlanmak için:

```js
const bupa = await cds.connect.to('API_BUSINESS_PARTNER')
const partner = await bupa.run(SELECT.one.from(bupa.entities.A_BusinessPartner, '1000102'))
```

Sorgu yine CQL ile yazılır; CAP onu veritabanına SQL olarak değil, uzak sisteme **OData isteği** olarak gönderir.

### Mock: aynı kod, sahte veri
Credentials tanımlı değilse ve sunucu `--with-mocks` ile başladıysa (`cds watch` bunu kendisi yapar), CAP uzak
servisi **yerelde taklit eder**: entity'ler için tablo kurar ve `srv/external/data/<servis>-<entity>.csv`
dosyalarını yükler. Handler kodu farkı bilmez. Bu sayede:
- İnternet ve API anahtarı olmadan geliştirme yapılır.
- Testler hızlı ve tekrarlanabilir olur (S/4'teki veri değişse de testler kırılmaz).

### Profil ile mod seçimi
`package.json`'da `"[sandbox]": { "credentials": { "url": ... } }` yazıldı. `--profile sandbox` ile başlatılınca
credentials dolar ve CAP gerçekten HTTP isteği atar. Production'da (Aşama 10) `credentials.destination`
kullanılacak. **Kod hiç değişmez**, sadece yapılandırma değişir.

### Uzak entity'yi kendi servisinde yayınlamak
```cds
@readonly entity S4BusinessPartners as projection on bp.A_BusinessPartner { key BusinessPartner as ID, ... };
```
Veritabanında böyle bir tablo yoktur. `on('READ')` handler'ı sorguyu uzak servise devreder:
`bupa.run(req.query)`. CAP alan adlarını (`ID` → `BusinessPartner`) ve protokolü (V4 → V2) çevirir.
`$top`, `$skip`, `$filter`, `$orderby`, `$count` iletilir; V2'de karşılığı olmayan `$search`'i biz `contains`
filtresine çeviriyoruz.

### Dayanıklılık (resilience)
Uzak sistem her an yavaş, kapalı veya yetkisiz olabilir. `requestTimeout` ile beklemeye sınır konur;
`classifyS4Error` hatayı anlaşılır bir mesaja çevirir (401/403 → `S4_UNAUTHORIZED`, zaman aşımı/ağ →
`S4_UNREACHABLE`). Sunucu çökmez, sadece o istek hata döner.

### Bağımsız (unbound) action, parametre value help'i ve SideEffects
`importFromS4` bir entity'ye bağlı değildir (`POST /rental/importFromS4`). Fiori'de tablo araç çubuğunda
`UI.DataFieldForAction` ile `Action: 'RentalService.EntityContainer/importFromS4'` olarak gösterilir.
Parametresine `Common.ValueList` verildiği için popup'ta iş ortağı listesi açılır. Action bittikten sonra Fiori
hangi kaydın değiştiğini bilemez; `@Common.SideEffects` ile tüm `Customers` listesinin yenilenmesini istedik.

### Gizli bilgi (secret) yönetimi
API anahtarı kodda, `package.json`'da veya `.env.example`'da durmaz. Sadece `.env`'de (commit'lenmez) veya
BTP'de Destination servisinde durur. CAP günlükte anahtarı maskeler (`APIKey: '...'`).

> Bu aşamada yaşanan gerçek bir olay: anahtar GitHub web arayüzünden `.env` ve `.env.example` olarak açık repoya
> yüklendi. `.gitignore` sadece yerel `git add`'i engeller; web arayüzünü engellemez. Commit'ler `main`'den
> çıkarıldı (force-push), ama açık repoya bir kez giren anahtar **ele geçmiş sayılır**: tek kesin çözüm
> anahtarı yenilemektir.

## cap-sflight'taki karşılığı
cap-sflight uzak bir sisteme bağlanmaz; tüm veri kendi veritabanındadır. Aynı desenin SAP'nin resmi örnekleri
şunlardır:
- **SAP-samples/cloud-cap-risk-management**: Risk uygulaması tedarikçileri (`A_BusinessPartner`) S/4HANA'dan okur.
  Bu projedeki EDMX oradan alındı.
- **CAP dokümantasyonu, "Consuming Services"**: `cds import`, mock, `cds.connect.to`, destination.

## ABAP RAP'teki karşılığı
RAP'te uzak OData servisi **Service Consumption Model** ile tüketilir. ADT'de EDMX dosyasından bir proxy (ABAP
sınıfları ve tipleri) üretilir. Uzak veriyi kendi servisinde yayınlamak için veritabanı tablosu olmayan bir
**custom entity** tanımlanır ve okuma bir **query provider** sınıfında yazılır. Bu, bizim `S4BusinessPartners` +
`on('READ')` ikilisinin karşılığıdır. Bağlantı bilgisi koda değil **Communication Arrangement**'a yazılır; bu
da Destination'ın karşılığıdır.

```abap
" Örnek amaçlı, derlenmemiş kod
@EndUserText.label: 'S/4 iş ortakları (uzak)'
@ObjectModel.query.implementedBy: 'ABAP:ZCL_RENT_BP_QUERY'
define custom entity ZCE_RENT_S4_BP {
  key BusinessPartner : abap.char(10);
      FirstName       : abap.char(40);
      LastName        : abap.char(40);
}

CLASS zcl_rent_bp_query DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    INTERFACES if_rap_query_provider.
ENDCLASS.

CLASS zcl_rent_bp_query IMPLEMENTATION.
  METHOD if_rap_query_provider~select.
    " Bağlantı: Communication Arrangement (BTP'deki Destination'ın karşılığı)
    DATA(destination) = cl_http_destination_provider=>create_by_comm_arrangement(
        comm_scenario = 'ZRENT_BP_SCENARIO' service_id = 'ZRENT_BP_OUTBOUND_REST' ).
    DATA(http_client) = cl_web_http_client_manager=>create_by_http_destination( destination ).

    " Service Consumption Model'in ürettiği V2 proxy'si (CAP'te cds import + cds.connect.to)
    DATA(proxy) = /iwbep/cl_cp_factory_remote=>create_v2_remote_proxy(
        is_proxy_model_key       = VALUE #( repository_id = 'DEFAULT' proxy_model_id = 'ZRENT_SCM_BP'
                                            proxy_model_version = '0001' )
        io_http_client           = http_client
        iv_relative_service_root = '/sap/opu/odata/sap/API_BUSINESS_PARTNER' ).

    DATA(request) = proxy->create_resource_for_entity_set( 'A_BUSINESSPARTNER' )->create_request_for_read( ).
    " Sayfalama Fiori'den gelir ve uzak sisteme iletilir ($top/$skip)
    request->set_top( io_request->get_paging( )->get_page_size( ) ).
    request->set_skip( io_request->get_paging( )->get_offset( ) ).

    DATA partners TYPE STANDARD TABLE OF zrent_scm_bp=>tys_a_business_partner_type.
    TRY.
        request->execute( )->get_business_data( IMPORTING et_business_data = partners ).
      CATCH /iwbep/cx_gateway INTO DATA(error).
        " CAP'teki classifyS4Error + req.reject karşılığı
        RAISE EXCEPTION TYPE zcx_rent_s4_error EXPORTING previous = error.
    ENDTRY.

    io_response->set_data( CORRESPONDING #( partners ) ).
    IF io_request->is_total_numb_of_rec_requested( ).
      io_response->set_total_number_of_records( lines( partners ) ).
    ENDIF.
  ENDMETHOD.
ENDCLASS.
```

| CAP (bu proje) | ABAP RAP |
|---|---|
| `cds import` (EDMX → CSN) | Service Consumption Model (EDMX → proxy sınıfları) |
| `cds.connect.to('API_BUSINESS_PARTNER')` | `/iwbep/cl_cp_factory_remote=>create_v2_remote_proxy` |
| `package.json` credentials / Destination | Communication Scenario + Communication Arrangement |
| Projeksiyon + `on('READ')` | Custom entity + `if_rap_query_provider` |
| Mock (`--with-mocks` + CSV) | Test double ile proxy taklidi (ABAP Unit'te) |
| `importFromS4` action | Statik action (`static action importFromS4 parameter ...`) |

## Sık yapılan hatalar
- API anahtarını `package.json`'a, `.env.example`'a veya koda yazmak; `.env`'i GitHub web arayüzüyle yüklemek.
- Projeksiyondaki `where`'in uzak servise de uygulanacağını sanmak (uygulanmaz; filtreyi handler'da ekle).
- `$search`'in V2 servisinde çalışacağını varsaymak.
- Uzak çağrıyı `try/catch` olmadan yapmak: kullanıcı "502 Bad Gateway" gibi anlamsız bir hata görür.
- `requestTimeout` vermemek: S/4 yanıt vermezse istek uzun süre asılı kalır.
- Testleri gerçek sandbox'a bağlamak: internet veya anahtar olmayınca testler kırılır, sonuçlar veri değiştikçe
  değişir. Testler mock'la çalışmalı.
- Uzak veriyi her okumada değil, bir kez kopyalayıp yerelde tutmak gerektiğini düşünmemek: kiralama, müşteri
  verisine her an erişmeli; S/4 kapalıyken de çalışmalı. Bu yüzden içe aktarma (kopya) seçildi.

## Alıştırmalar
1. `Customers` üzerinde bağlı (bound) bir `refreshFromS4()` action'ı ekle: sadece `source = 'S4'` olan müşteride
   aktif olsun (`@Core.OperationAvailable`) ve bilgileri S/4'ten yeniden çeksin. Testini de yaz.
2. Müşteriler uygulamasında "Oluştur" ve "Düzenle" butonları yok, çünkü `Customers` draft'sız. `RentalService`'te
   `Customers`'ı draft'lı yap. Hangi testler kırılır, neden? (İpucu: `POST /rental/Customers` artık taslak üretir.)
3. Mock verisine kendi uydurma iş ortağını ekle (4 CSV dosyasına da). Uygulamayı yeniden başlatmadan görünür mü?
   `npm run db:deploy` neden gerekir?
4. Value help'te sadece adı değil, şehri de göster. Şehir `A_BusinessPartnerAddress`'te olduğu için ne yapman
   gerekir? Bunun S/4'e kaç istek göndereceğini düşün.
