# Öğrenme Notları

Her aşamanın sonunda yazılan notlar. Her notta aynı bölümler var: öğrenilen kavramlar (tanım + projedeki örneği),
cap-sflight'taki karşılığı, ABAP RAP'teki karşılığı (derlenmemiş örnek kod), sık yapılan hatalar ve
çözümleri verilmeyen alıştırmalar.

| Not | Aşama | Ana konular |
|---|---|---|
| [01 — Ortam ve iskelet](01-kurulum.md) | 0 | CAP proje yapısı, `cds watch`, profiller, `.env`, HANA mı PostgreSQL mi |
| [02 — Veri modeli](02-veri-modeli.md) | 1 | Entity, aspect, association ve composition, CodeList, `localized`, hesaplanan alan, `cds deploy` |
| [03 — Servisler](03-servisler.md) | 2 | Projection, OData V4 sorgu seçenekleri, draft'ın teknik yapısı |
| [04 — İş mantığı](04-is-mantigi.md) | 3 | Handler fazları, draft olayları, `req.error`/`req.reject`, CQL, SideEffects, OperationAvailable |
| [05 — Yetkilendirme](05-yetkilendirme.md) | 4 | 401/403, `@requires`/`@restrict`, mocked auth, `xs-security.json` |
| [06 — Fiori arayüzü](06-fiori-arayuz.md) | 5 | Floorplan'lar, anotasyon → ekran tablosu, value help, launchpad sandbox |
| [07 — Testler](07-testler.md) | 6 | `cds.test`, Mocha, test izolasyonu, SQLite ve PostgreSQL farkları |
| [08 — S/4HANA entegrasyonu](08-s4-entegrasyonu.md) | 8 | `cds import`, uzak servis, mock/sandbox/destination, V2 → V4, hata yönetimi, gizli anahtar |
| [09 — Analitik](09-analitik.md) | 9 | Boyut ve ölçü, OData `$apply`, `@Aggregation`, `@Semantics` para birimi, Analytical List Page |

Takıldığında: "çözümü verme, ipucu ver" diye sorabilirsin.
