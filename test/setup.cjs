// npm test: CAP profili NODE_ENV'den okunur. Mocha (Jest'in aksine) bunu ayarlamaz; [test] profili
// (SQLite, bellek içi) devreye girsin diye burada ayarlıyoruz.
process.env.NODE_ENV = 'test'

// development profili de aktif kaldığı için .env'deki PostgreSQL veritabanı adı test profiline sızar ve
// SQLite'ı bellek içi olmaktan çıkarır. CAP mevcut ortam değişkenlerini .env ile ezmediği için burada sabitliyoruz.
process.env.CDS_REQUIRES_DB_CREDENTIALS_DATABASE = ':memory:'
