# RentACar — SAP CAP ile Araç Kiralama

SAP Cloud Application Programming Model (CAP, Node.js) ile geliştirilen bir araç kiralama uygulaması.
Mimari, SAP'nin resmi örneği [SAP-samples/cap-sflight](https://github.com/SAP-samples/cap-sflight)'tan esinlenmiştir.

## Gereksinimler

- Node.js 22 veya üzeri (LTS)
- npm

## Kurulum ve çalıştırma (PowerShell)

```powershell
npm install
npm run watch      # cds watch: dosya değiştikçe sunucuyu yeniden başlatır
```

Sunucu varsayılan olarak <http://localhost:4004> adresinde açılır.

## Proje yapısı

| Klasör / Dosya | Amaç |
|---|---|
| `db/` | Veri modeli (CDS entity'leri) ve örnek veriler (CSV) |
| `srv/` | Servis tanımları ve iş mantığı (JavaScript) |
| `app/` | Fiori Elements arayüzleri ve UI annotation'ları |
| `_i18n/` | Arayüz metinleri (`i18n*.properties`) ve hata mesajları (`messages*.properties`) |
| `docs/` | Proje dokümantasyonu |

## Kullanılan sürümler

| Paket | Sürüm |
|---|---|
| `@sap/cds` | 10.2.1 |
| `@sap/cds-dk` | 10.2.0 |
| `@cap-js/sqlite` | 3.1.2 |
