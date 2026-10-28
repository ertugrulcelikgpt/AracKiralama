# CLAUDE.md

Bu dosya, projeyi devralan bir Claude oturumu için özet, komutlar ve kurallardır.

## Git kuralları

- Tüm commit'ler şu kimlikle atılmalıdır:
  - `git config user.name "Ertugrul Celik"`
  - `git config user.email "ertugrulcelikgpt@gmail.com"`
  - Commit atmadan önce kimliği kontrol et; farklıysa yukarıdaki komutlarla düzelt.
- Commit mesajlarına `Co-Authored-By: Claude ...` satırı, `Claude-Session:` linki veya başka herhangi bir Claude/Anthropic atıf satırı **ekleme**.
- PR açıklamalarına "Generated with Claude Code" veya benzeri atıf satırı **ekleme**.
- Amaç: GitHub Contributors listesinde yalnızca repo sahibi görünmeli.
- Geliştirme dalı: `tryfirst`. Her aşama sonunda anlamlı bir commit (ör. `feat(db): add rental domain model`).
- Her aşama sonunda `tryfirst`'i push'la ve `main`'e birleştir (`git merge --ff-only`), sonra `main`'i push'la.
  PR açılmaz; repo tek kişilik.

## Proje özeti

RentACar: SAP CAP (Node.js) ile çok şubeli bir araç kiralama uygulaması. Mimari SAP-samples/cap-sflight'tan
esinlenir. Kullanıcı CAP öğreniyor: her aşamada kavramları Türkçe anlat, ABAP RAP karşılığını ver.

- Veritabanı: development → PostgreSQL (`@cap-js/postgres`, Docker), test → SQLite in-memory, production → SAP HANA Cloud (HDI, `docs/deploy.md`).
- Bağlantı bilgileri `.env` içinde (`CDS_REQUIRES_DB_CREDENTIALS_*`), commit edilmez; şablon `.env.example`.
- Kullanıcının ortamı Windows 11 + PowerShell; ona verilen komutlar PowerShell uyumlu olmalı.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run db:up` | PostgreSQL container'ını başlatır (sağlıklı olana kadar bekler) |
| `npm run db:deploy` | Şemayı ve CSV verilerini PostgreSQL'e yükler (`cds deploy --with-mocks`, S/4 mock tabloları dahil) |
| `npm run db:reset` | Volume'u silip veritabanını sıfırdan kurar ve yükler |
| `npm run db:down` | Container'ı durdurur |
| `npm run watch` | Geliştirme sunucusu (`cds watch`, http://localhost:4004), S/4 mock modunda |
| `npm run sandbox` | S/4 olarak SAP sandbox'ı (`cds serve all --profile sandbox`); `.env`'de `BP_API_KEY` gerekir |
| `npm test` | Tüm testler, bellek içi SQLite (Mocha, `test/setup.cjs`) |
| `npm run test:pg` | Aynı testler PostgreSQL `rentacar_test` veritabanında (`test/setup-pg.cjs` oluşturur) |
| `npm run lint` | ESLint |
| `npm run build:ui` | Fiori uygulamalarını `.deploy/app-router/resources`'a kopyalar (`mbt build` bunu kendisi çağırır) |
| `mbt build` | BTP paketi `mta_archives/rentacar_1.0.0.mtar` (`npm i -g mbt`; GNU Make gerekir). Deploy kullanıcının işi |

## Kod kuralları

- Tanımlayıcılar İngilizce, dokümantasyon ve yorumlar Türkçe; yorum sadece "neden" gerektiğinde.
- Arayüz metinleri `_i18n/i18n*.properties`, hata mesajları `_i18n/messages*.properties` (anahtar ile `req.error`).
- Servis kodu `cds.ApplicationService` sınıfı, sorgular CQL; model iki veritabanında da derlenebilmeli
  (`cds compile db --to sql --dialect postgres` ve `cds compile db --to hana`).
- Örnek verilerdeki kişi bilgileri tamamen uydurma.
- API anahtarlarını (ör. `BP_API_KEY`) asla koda, loga veya commit'e koyma.

## İş mantığı notları

- Kurallar `srv/rental-service.js`'te, her biri ayrı fonksiyon (K1–K8); `docs/is-kurallari.md`'deki dosya:satır
  referanslarını kod değişince güncelle.
- Doğrulama `before('SAVE')`'de (hedefler `in/...`), fiyat hesaplama taslak `PATCH`'inde. Action'lar sadece aktif kayıtta.
- `reject` action adı `ApplicationService.reject` ile çakıştığı için CAP başlangıçta uyarı verir; isim prompt
  gereği bilinçli olarak korunuyor, action çalışıyor.
- `sap-messages` bilgi mesajları `cds.i18n.messages.at(key, req.locale, args)` ile çevrilir.
- `srv/admin-service.js`: kiralamalarda kullanılan araç/şube/ek hizmet silinemez (409 `*_IN_USE`).

## S/4HANA entegrasyonu (Aşama 8)

- Uzak servis `API_BUSINESS_PARTNER` (OData V2): model `srv/external/`, mock verisi `srv/external/data/*.csv`.
  Ayrıntı: `docs/s4-entegrasyonu.md`.
- Mod credentials'a göre seçilir: yoksa mock (`--with-mocks`; `cds watch`, `db:deploy` ve `test/helpers.js` bunu
  verir), `[sandbox]` profilinde URL + `APIKey` başlığı, production'da Destination `API_BUSINESS_PARTNER` (BTP cockpit'te, `URL.headers.APIKey`).
- `BP_API_KEY` sadece `process.env`'den okunur (CAP `.env`'i development profilinde yükler). Koda, loga,
  `.env.example`'a yazma. Doğrulamak gerekirse değeri değil uzunluğunu yazdır.
- Sandbox için `cds watch` değil `cds serve` kullan: `cds watch` yerel bağlantı kaydından (`~/.cds-services.json`)
  başka bir sunucunun mock'una bağlanabiliyor.
- Hatalar `classifyS4Error` ile `S4_UNAUTHORIZED` / `S4_UNREACHABLE` / `S4_ERROR`'a çevrilir.
- Projeksiyon `where`'i ve `$search` uzak servise gitmez; ikisi de `on('READ')` handler'ında çevrilir.
- Bulut oturumunda sandbox.api.sap.com engelli olabilir. Sandbox davranışı sahte bir OData V2 sunucusu ve
  `CDS_CONFIG='{"requires":{"API_BUSINESS_PARTNER":{"credentials":{"url":"http://localhost:<port>/..."}}}}'` ile
  denenebilir (büyük harfli servis adı `CDS_REQUIRES_...` ortam değişkeniyle ezilemez).

## Analitik (Aşama 9)

- `srv/analytics-service.cds`: `RentalAnalytics` sadece A/C kiralamalar; ölçüler `@Aggregation.default: #SUM` +
  `@Aggregation.CustomAggregate`, ciro `@Semantics.amount.currencyCode`. Metin alanları (`branchName`...)
  `GroupableProperties`'te kalmalı.
- `srv/analytics-service.js`: sıralamasız gruplu sorguya gruplama alanlarına göre `orderBy` ekler (aylık trend).
- `substring` 0'dan sayar. Örnek veride 1012–1040 tamamlanmış geçmiş kiralamalar (Nisan–Ekim) analitik içindir;
  yeni kiralama numarası 1041'den başlar.

## BTP / production (Aşama 10)

- Deploy etme; kullanıcı `docs/deploy.md`'deki adımları kendisi uygular. Doğrulama: `cds build --production`,
  `cds compile db --to hana`, `mbt build`.
- `[production]`: `db.kind: hana` açıkça yazılı (yoksa `@cap-js/postgres` seçiliyor), `auth: xsuaa`,
  S/4 `destination: API_BUSINESS_PARTNER`. Kontrol: `npx cds env requires.db --profile production`.
- `cds add ...` dosyaları ezebilir: `xs-security.json` elle yazılmıştır (scope'ları ikiler), `mta.yaml`'a PostgreSQL
  eklememeli. Her `cds add` sonrası `git diff`.
- Arayüzü approuter sunar (`.deploy/app-router/xs-app.json` `localDir` rotaları); yeni Fiori uygulaması eklenirse
  `scripts/copy-ui.mjs` ve `xs-app.json` rotasını güncelle.
- S/4 hataları `$sanitize: false` ile production'da da görünür; yeni kullanıcıya yönelik 5xx hatalarında da gerekir.
- Production profilini yerelde denemek: `NODE_ENV=production` + `CDS_CONFIG` ile db'yi sqlite `:memory:`, auth'u
  mocked yap (`cds serve all --in-memory`).

## Yetki

- Roller `srv/auth.cds`'te (`@requires`, `@restrict`); JS'te rol kontrolü yazma.
- Mock kullanıcılar (`package.json`, development + test): agent/agent, manager/manager, admin/admin.
- `xs-security.json` elle düzenlendi (açıklamalar, role-collections); rol eklenirse güncelle.

## Arayüz

- Fiori Elements uygulamaları `app/rentals`, `app/vehicles`, `app/customers` (salt okunur liste + S/4'ten Getir),
  `app/analytics` (Analytical List Page, sadece manager);
  UI5 `https://ui5.sap.com/1.153.0/` CDN'inden.
- Anotasyonlar: `app/common.cds` (ortak), `app/<uygulama>/annotations.cds`, dinamik davranış `srv/field-control.cds`.
- Model değişince `npm run db:deploy`; `db:reset` sonrası `cds watch` yeniden başlatılmalı.
- Bulut oturumunda ui5.sap.com ağ politikasıyla engelli olabilir. Ekran testi için UI5 Tooling (`ui5 serve`, SAPUI5
  npm'den) + Playwright'ta `ui5.sap.com/1.153.0/**` isteklerini yerel sunucuya yönlendirmek işe yarar.

## Testler

- Mocha tek süreçte çalışır: CAP sunucusu `test/helpers.js`'te bir kez başlatılıp paylaşılır (her dosyada `setup()`).
  Sunucu `--with-mocks` ile başlar; S/4 testleri internet ve anahtar gerektirmez.
- `test/setup.cjs` `NODE_ENV=test` ve `CDS_REQUIRES_DB_CREDENTIALS_DATABASE=:memory:` ayarlar; yoksa testler
  development profiliyle PostgreSQL geliştirme veritabanında çalışır.
- Test tarihleri `day(n)` ile bugüne göre üretilir; K4 müşterileri test içinde oluşturulur. Örnek veri tarihlerine bağlama.
- Yeni kural/action eklenince test ekle; `npm test` ve `npm run test:pg` ikisi de yeşil olmalı.

## Dokümantasyon

`docs/` altındaki dosyalar her aşamada güncellenir: `mimari.md`, `is-kurallari.md`, `cap-vs-rap.md`, `sozluk.md`
(alfabetik), `ogrenme-notlari/NN-*.md` (+ dizin `ogrenme-notlari/README.md`). Yol haritası: README.md → "Yol haritası".

- Kod satırları kayınca `docs/is-kurallari.md`'deki `dosya:satır` referanslarını gerçek satırlara göre güncelle.
- Mermaid diyagramlarını değiştirince ayrıştırılabildiğini kontrol et (mermaid npm paketi + Playwright ile render).
- Her öğrenme notu aynı bölümleri içerir: kavramlar, cap-sflight karşılığı, ABAP RAP karşılığı (derlenmemiş örnek
  kod), sık yapılan hatalar, çözümsüz alıştırmalar.
