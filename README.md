# RentACar — SAP CAP ile Araç Kiralama

Birden fazla şubesi olan bir araç kiralama firması için SAP Cloud Application Programming Model (CAP, Node.js)
ile geliştirilen uygulama. Şube çalışanları kiralama kaydı oluşturur, yöneticiler onaylar veya reddeder,
araç geri geldiğinde kiralama tamamlanır.

Mimari, SAP'nin resmi örneği [SAP-samples/cap-sflight](https://github.com/SAP-samples/cap-sflight)'tan esinlenmiştir.

> Ekran görüntüleri Aşama 5'te (Fiori arayüzü) eklenecek.

## Gereksinimler

- Node.js 22 veya üzeri (LTS)
- Docker Desktop (lokal PostgreSQL için)

## Kurulum (PowerShell)

```powershell
npm ci                              # bağımlılıkları kur
Copy-Item .env.example .env         # lokal bağlantı ayarları (gerekirse düzenle)
npm run db:up                       # PostgreSQL container'ını başlat
npm run db:deploy                   # şemayı ve örnek verileri yükle
npm run watch                       # http://localhost:4004
```

Veritabanını sıfırlamak için: `npm run db:reset`. Durdurmak için: `npm run db:down`.

## Veritabanı profilleri

| Profil | Veritabanı | Ne zaman |
|---|---|---|
| `development` (varsayılan) | PostgreSQL 16 (Docker) | `cds watch`, `cds deploy` |
| `test` | SQLite, bellek içi | `npm test` |
| `production` | SAP HANA Cloud | BTP deploy (Aşama 10) |

## Proje yapısı

| Klasör / Dosya | Amaç |
|---|---|
| `db/` | Veri modeli: `schema.cds` (kiralama), `master-data.cds` (ana veriler), `labels.cds` (etiketler), `data/*.csv` |
| `srv/` | Servis tanımları ve iş mantığı (JavaScript) |
| `app/` | Fiori Elements arayüzleri ve UI anotasyonları |
| `_i18n/` | Arayüz metinleri (`i18n*.properties`) ve hata mesajları (`messages*.properties`) |
| `docs/` | Mimari, iş kuralları, CAP–RAP karşılaştırması, sözlük, öğrenme notları |
| `docker-compose.yml` | Lokal PostgreSQL |
| `.env.example` | Lokal ortam değişkenleri şablonu (`.env` commit edilmez) |

## Test kullanıcıları

Aşama 4'te (yetkilendirme) eklenecek: `agent`, `manager`, `admin`.

## Kullanılan teknolojiler

| Paket | Sürüm |
|---|---|
| `@sap/cds` | 10.2.1 |
| `@sap/cds-dk` | 10.2.0 |
| `@cap-js/postgres` | 3.1.2 |
| `@cap-js/sqlite` | 3.1.2 |
| PostgreSQL | 16 |

## Yol haritası

| Aşama | Konu | Durum |
|---|---|---|
| 0 | Ortam ve iskelet (CAP, PostgreSQL, profiller) | ✅ |
| 1 | Veri modeli ve örnek veri | ✅ |
| 2 | Servisler | ⏳ |
| 3 | İş mantığı (K1–K8, action'lar) | |
| 4 | Yetkilendirme | |
| 5 | Fiori Elements arayüzü | |
| 6 | Testler | |
| 7 | Dokümantasyon ve gözden geçirme | |
| 8 | S/4HANA Business Partner entegrasyonu | |
| 9 | (Opsiyonel) Analitik | |
| 10 | BTP deploy hazırlığı (SAP HANA Cloud) | |

Dokümanlar: [mimari](docs/mimari.md) · [iş kuralları](docs/is-kurallari.md) · [CAP vs RAP](docs/cap-vs-rap.md) ·
[sözlük](docs/sozluk.md) · [öğrenme notları](docs/ogrenme-notlari/)
