# 05 — Yetkilendirme (Aşama 4)

## Bu aşamada öğrenilen kavramlar

### Kimlik doğrulama ve yetkilendirme
- **Kimlik doğrulama (authentication):** Kullanıcı kim? Başarısızsa **401 Unauthorized**.
- **Yetkilendirme (authorization):** Bu kullanıcı bu işlemi yapabilir mi? Başarısızsa **403 Forbidden**.

CAP ikisini ayırır. Kimlik doğrulama yöntemi (`cds.requires.auth.kind`) ortama göre değişir. Yetki kuralları ise
her zaman CDS'te aynı kalır.

| Ortam | `auth.kind` | Kullanıcı nereden gelir |
|---|---|---|
| development / test | `mocked` | `package.json` → `cds.requires.auth.users` (Basic Auth: kullanıcı/şifre) |
| production (BTP) | `jwt` / `xsuaa` | XSUAA'nın verdiği JWT token; roller rol koleksiyonlarından gelir |

### Mock kullanıcılar
```json
"auth": { "[development]": { "kind": "mocked", "users": {
  "agent":   { "password": "agent",   "roles": ["RentalAgent"] },
  "manager": { "password": "manager", "roles": ["RentalAgent", "RentalManager"] },
  "admin":   { "password": "admin",   "roles": ["FleetAdmin"] }
}}}
```
`manager`'a iki rol birden verildi: yönetici, çalışanın yaptığı her şeyi de yapabilir. Rolleri iç içe
tanımlamak yerine kullanıcıya birden fazla rol vermek CAP ve BTP'deki standart yaklaşımdır.

### `@requires` ve `@restrict`
```cds
annotate RentalService with @(requires: 'RentalAgent');          // servise giriş kapısı

annotate RentalService.Rentals with @(restrict: [
  { grant: ['READ', 'CREATE', 'UPDATE', 'complete', 'cancel'], to: 'RentalAgent' },
  { grant: ['approve', 'reject', 'applyDiscount'],               to: 'RentalManager' }
]);
```
- `@requires`: servisin (veya entity'nin) tamamı için gereken rol(ler). Burada `RentalAgent` yoksa hiçbir
  istek geçemez (admin → 403).
- `@restrict`: işlem (event) bazında izin. `grant` içine CRUD olayları (`READ`, `CREATE`, `UPDATE`, `DELETE`,
  `WRITE`, `*`) ve bound action adları yazılır.
- Draft olayları CRUD'a eşlenir: taslak oluşturmak (`NEW`) → `CREATE`, düzenlemeye açmak (`EDIT`) ve alan
  değiştirmek (`PATCH`) → `UPDATE`. Kendi taslağını silmek (Vazgeç) ayrıca `DELETE` yetkisi istemez.
  Kaydedilmiş bir kiralamayı silmek ise `DELETE` ister; agent'ta bu yetki yok, iptal için `cancel` var.
- `grant: '*'` action'ları da kapsar. Agent'a `*` verseydik `approve` da açılırdı; bu yüzden olaylar tek tek yazıldı.
- `where` koşulu ile satır bazında kısıt da yazılabilir (ör. `where: 'createdBy = $user'`). Bu projede gerekmedi.

Yetki dosyası ayrı tutuldu: `srv/auth.cds`. Kim neyi yapabilir, tek bakışta görülür.

### `xs-security.json`
BTP'deki XSUAA servisinin yapılandırması. `cds compile srv --to xsuaa` CDS'teki rollerden bunu üretir:
- **scope:** teknik yetki (`$XSAPPNAME.RentalAgent`). CAP `@requires: 'RentalAgent'`'ı bununla karşılaştırır.
- **role-template:** scope'ları gruplayan şablon. BTP cockpit'te bundan rol oluşur.
- **role-collection:** kullanıcılara atanan paket. `RentACar_Manager` = `RentalAgent` + `RentalManager`.

Lokalde kullanılmaz; Aşama 10'da deploy hazırlığında devreye girer.

### Mesajların dili
CAP'in Türkçe mesaj dosyasında 401/403 metinleri çevrilmemiş ("Forbidden"). Projenin
`_i18n/messages_tr.properties` dosyasında `403=Bu işlem için yetkiniz yok.` tanımlandı; proje dosyaları CAP'in
varsayılanlarının önüne geçer.

## cap-sflight'taki karşılığı
cap-sflight'ta `TravelService` için benzer bir tanım vardır (sadeleştirilmiş):
```cds
annotate TravelService.Travel with @(restrict: [
  { grant: 'READ', to: 'authenticated-user' },
  { grant: ['rejectTravel', 'acceptTravel', 'deductDiscount'], to: 'reviewer' },
  { grant: ['*'], to: 'processor' },
  { grant: ['*'], to: 'admin' }
]);
```
Mantık aynı: rol bazında olay ve action izinleri. Bizdeki `RentalAgent`/`RentalManager` onların
`processor`/`reviewer` rollerine karşılık gelir.

## ABAP RAP'teki karşılığı
RAP'te yetki iki katmanlıdır:
1. **Yetki nesnesi (authorization object)** ve PFCG rolleri: "kim hangi aktiviteyi yapabilir" (CAP'teki rol).
2. **Behavior Definition'da `authorization master`** + `get_instance_authorizations` / `get_global_authorizations`:
   işlem bazında kontrol (CAP'teki `@restrict`).
3. **DCL (Data Control Language)**: okuma yetkisi, satır bazında filtre (`define role`; CAP'teki `@restrict` +
   `where`).

```abap
" Örnek amaçlı, derlenmemiş kod
" --- DCL: sadece yetkili kullanıcılar kiralamaları okuyabilir
@MappingRole: true
define role ZR_RENT_RENTAL {
  grant select on ZR_RENT_Rental
    where ( ) = aspect pfcg_auth( ZRENT_AUTH, ACTVT = '03' );
}

" --- Behavior Definition
define behavior for ZR_RENT_Rental alias Rental
authorization master ( global, instance )
{ ... }

" --- Behavior Implementation: onay sadece yöneticiye
METHOD get_global_authorizations.
  IF requested_authorizations-%action-approve = if_abap_behv=>mk-on.
    AUTHORITY-CHECK OBJECT 'ZRENT_AUTH' ID 'ACTVT' FIELD '16'. " 16 = yürüt (execute)
    result-%action-approve = COND #( WHEN sy-subrc = 0 THEN if_abap_behv=>auth-allowed
                                                       ELSE if_abap_behv=>auth-unauthorized ).
  ENDIF.
ENDMETHOD.
```

CAP'te bunun karşılığı tek satır: `{ grant: ['approve'], to: 'RentalManager' }`. RAP'te esneklik daha fazla
ama kod da daha fazla.

## Sık yapılan hatalar
- Rol kontrolünü JavaScript'te yazmak (`if (!req.user.is('RentalManager'))`). Çalışır ama dağınık olur ve
  `$metadata`/xs-security'ye yansımaz. Önce CDS'te çözülebiliyor mu bak.
- `grant: '*'` verip action'ların da açıldığını fark etmemek.
- Yöneticiye sadece `RentalManager` verip `RentalAgent`'ı unutmak. O zaman servise hiç giremez
  (`@requires: 'RentalAgent'`).
- 401 ve 403'ü karıştırmak: 401 "giriş yap", 403 "girdin ama izin yok".
- Arayüzde butonu gizlemenin yetki olduğunu sanmak. Asıl kontrol sunucudadır; URL'yi bilen biri doğrudan çağırabilir.

## Alıştırmalar
1. `agent` kullanıcısının sadece kendi oluşturduğu açık kiralamaları düzenleyebilmesini sağla
   (İpucu: `@restrict` içinde `where: 'createdBy = $user'`). Hangi işlemlerde etkili olur, hangisinde olmaz?
2. Sadece okuma yetkisi olan `auditor` rolü ve kullanıcısı ekle: RentalService'teki her şeyi okuyabilsin ama
   hiçbir şeyi değiştiremesin. `xs-security.json`'u yeniden üret ve farkı incele.
3. `npx cds compile srv --to xsuaa` çıktısını `xs-security.json` ile karşılaştır. Hangi kısımları biz elle ekledik?
