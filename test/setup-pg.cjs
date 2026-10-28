// npm run test:pg: aynı testleri PostgreSQL'e karşı çalıştırır.
// Geliştirme veritabanını (rentacar) korumak için ayrı bir veritabanı kullanılır: rentacar_test.
// Ortam değişkeni .env'den önce ayarlandığı için .env'deki veritabanı adını ezer (CAP mevcut değişkenleri değiştirmez).
process.env.CDS_REQUIRES_DB_CREDENTIALS_DATABASE = 'rentacar_test'

const fs = require('node:fs')
const path = require('node:path')

// Bağlantı bilgileri .env'den (yoksa docker-compose varsayılanları)
function credentials() {
  const env = {}
  const file = path.join(__dirname, '..', '.env')
  if (fs.existsSync(file)) for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (m) env[m[1]] = m[2]
  }
  const get = key => process.env[`CDS_REQUIRES_DB_CREDENTIALS_${key}`] ?? env[`CDS_REQUIRES_DB_CREDENTIALS_${key}`]
  return { host: get('HOST') ?? 'localhost', port: Number(get('PORT') ?? 5432),
    user: get('USER') ?? 'postgres', password: get('PASSWORD') ?? 'postgres' }
}

exports.mochaGlobalSetup = async function () {
  const { Client } = require('pg')
  const client = new Client({ ...credentials(), database: 'postgres' })
  await client.connect()
  const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = 'rentacar_test'")
  if (!rowCount) await client.query('CREATE DATABASE rentacar_test')
  await client.end()

  // Şema ve örnek veriler test veritabanına yüklenir (cds deploy ile aynı)
  const cds = require('@sap/cds')
  const db = await cds.connect.to('db')
  await cds.deploy('*').to(db)
  await db.disconnect?.()
}
