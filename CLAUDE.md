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

- Veritabanı: development → PostgreSQL (`@cap-js/postgres`, Docker), test → SQLite in-memory, production → SAP HANA Cloud (Aşama 10).
- Bağlantı bilgileri `.env` içinde (`CDS_REQUIRES_DB_CREDENTIALS_*`), commit edilmez; şablon `.env.example`.
- Kullanıcının ortamı Windows 11 + PowerShell; ona verilen komutlar PowerShell uyumlu olmalı.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run db:up` | PostgreSQL container'ını başlatır (sağlıklı olana kadar bekler) |
| `npm run db:deploy` | Şemayı ve CSV verilerini PostgreSQL'e yükler (`cds deploy`) |
| `npm run db:reset` | Volume'u silip veritabanını sıfırdan kurar ve yükler |
| `npm run db:down` | Container'ı durdurur |
| `npm run watch` | Geliştirme sunucusu (`cds watch`, http://localhost:4004) |
| `npm test` | Tüm testler, bellek içi SQLite (Mocha, `test/setup.cjs`) |
| `npm run test:pg` | Aynı testler PostgreSQL `rentacar_test` veritabanında (`test/setup-pg.cjs` oluşturur) |
| `npm run lint` | ESLint |

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

## Yetki

- Roller `srv/auth.cds`'te (`@requires`, `@restrict`); JS'te rol kontrolü yazma.
- Mock kullanıcılar (`package.json`, development + test): agent/agent, manager/manager, admin/admin.
- `xs-security.json` elle düzenlendi (açıklamalar, role-collections); rol eklenirse güncelle.

## Arayüz

- Fiori Elements uygulamaları `app/rentals`, `app/vehicles`; UI5 `https://ui5.sap.com/1.153.0/` CDN'inden.
- Anotasyonlar: `app/common.cds` (ortak), `app/<uygulama>/annotations.cds`, dinamik davranış `srv/field-control.cds`.
- Model değişince `npm run db:deploy`; `db:reset` sonrası `cds watch` yeniden başlatılmalı.
- Bulut oturumunda ui5.sap.com ağ politikasıyla engelli olabilir. Ekran testi için UI5 Tooling (`ui5 serve`, SAPUI5
  npm'den) + Playwright'ta `ui5.sap.com/1.153.0/**` isteklerini yerel sunucuya yönlendirmek işe yarar.

## Testler

- Mocha tek süreçte çalışır: CAP sunucusu `test/helpers.js`'te bir kez başlatılıp paylaşılır (her dosyada `setup()`).
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
