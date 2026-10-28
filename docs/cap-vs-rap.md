# CAP ve ABAP RAP Karşılaştırması

> Tablo her aşamada, o aşamada kurulan yapılarla doldurulur. Proje sonunda (Aşama 7) tamamlanmış olacak.

| Konu | Bu projede (CAP) | ABAP RAP karşılığı |
|---|---|---|
| Geliştirme ortamı | VS Code / BAS + Node.js, `cds watch` | ADT (Eclipse) + ABAP sistemi (BTP ABAP Environment veya S/4HANA) |
| Proje / paket | npm projesi (`package.json`), git deposu | ABAP paketi (`Z...`), transport request, abapGit |
| Veritabanı | Profil ile seçilir: PostgreSQL, SQLite, HANA | Her zaman ABAP sisteminin kendi veritabanı (SAP HANA) |
| Ortam ayarları | `package.json` → `cds` bölümü, profiller, `.env` | Sistem/client ayarları; ayrı "profil" kavramı yok |
