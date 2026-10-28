// Testlerde ortak kullanılan yardımcılar: kullanıcılar, tarih üretimi, draft akışı ve hata yakalama
import path from 'node:path'
import cds from '@sap/cds'

const DAY_MS = 24 * 60 * 60 * 1000
const PROJECT = path.join(import.meta.dirname, '..')

// Örnek verideki sabit kayıtlar (db/data/*.csv)
export const CUSTOMER = { ahmet: 'c1000000-0000-4000-8000-000000000001' }
export const VEHICLE = {
  qashqai: 'a1000000-0000-4000-8000-000000000013', // SUV, 3.100 TL, örnek veride kiralaması yok
  i20: 'a1000000-0000-4000-8000-000000000003', // ECO, 1.400 TL, kiralaması yok
  golf: 'a1000000-0000-4000-8000-000000000009', // CMP, 2.100 TL, kiralaması yok
  corsa: 'a1000000-0000-4000-8000-000000000006' // ECO, bakımda (MT)
}
export const RENTAL = { // rentalID → ID
  1000: 'b1000000-0000-4000-8000-000000000001', // C
  1004: 'b1000000-0000-4000-8000-000000000005', // A, Hyundai Tucson (22.180 km)
  1007: 'b1000000-0000-4000-8000-000000000008', // O, 2 gün, 4.000 TL, Honda Civic (26.700 km)
  1008: 'b1000000-0000-4000-8000-000000000009', // O, 14 gün
  1009: 'b1000000-0000-4000-8000-000000000010' // O
}

// Bugünden n gün sonrası (YYYY-MM-DD); testler tarihten bağımsız çalışsın diye
export const day = n => new Date(Date.now() + n * DAY_MS).toISOString().slice(0, 10)
// Verilen tarihten tam `years` yıl ve `days` gün önce
export function yearsBefore(date, years, days = 0) {
  const d = new Date(date)
  d.setUTCFullYear(d.getUTCFullYear() - years)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

// Mocha tüm test dosyalarını tek süreçte çalıştırır; CAP sunucusu bir kez başlatılıp paylaşılır
let shared
export const setup = () => (shared ??= create())

function create() {
  // --with-mocks: credentials'ı olmayan uzak servisler (API_BUSINESS_PARTNER) srv/external/data ile taklit edilir
  const test = cds.test('serve', 'all', '--with-mocks', '--in-memory?').in(PROJECT)
  const { GET, POST, PATCH, DELETE } = test
  const as = (user, headers = {}) => ({ auth: { username: user, password: user }, headers })
  const draftKey = ID => `/rental/Rentals(ID=${ID},IsActiveEntity=false)`
  const activeKey = ID => `/rental/Rentals(ID=${ID},IsActiveEntity=true)`

  // Yeni taslak oluşturur, alanları ve ek hizmetleri yazar; Kaydet'e basmaz
  async function draft(data = {}, extras = [], user = 'agent') {
    const { data: { ID } } = await POST('/rental/Rentals', {}, as(user))
    if (Object.keys(data).length) await PATCH(draftKey(ID), data, as(user))
    for (const extra of extras) await POST(`${draftKey(ID)}/extras`, extra, as(user))
    return ID
  }
  const activate = (ID, user = 'agent', headers) =>
    POST(`${draftKey(ID)}/RentalService.draftActivate`, {}, as(user, headers)).then(r => r.data)
  const createRental = async (data, extras, user = 'agent') => activate(await draft(data, extras, user), user)
  const action = (ID, name, params = {}, user = 'manager') =>
    POST(`${activeKey(ID)}/RentalService.${name}`, params, as(user))
  const read = (ID, query = '') => GET(`${activeKey(ID)}${query}`, as('manager')).then(r => r.data)

  // İstek başarısız olmalı: durum kodu ve hata kodlarını döndürür
  async function failure(promise) {
    try { await promise } catch (e) {
      const error = e.response?.data?.error ?? {}
      const details = error.details ?? [error]
      return { status: e.status ?? e.response?.status, error, codes: details.map(d => d.code), details }
    }
    throw new Error('İstek başarısız olmalıydı ama başarılı oldu')
  }

  // Geçerli bir kiralama için temel veriler (Ahmet + Nissan Qashqai, aynı şube)
  const valid = (overrides = {}) => ({
    customer_ID: CUSTOMER.ahmet, vehicle_ID: VEHICLE.qashqai,
    pickupBranch_code: 'IST-AIR', returnBranch_code: 'IST-AIR',
    pickupDate: day(30), returnDate: day(33), ...overrides
  })

  return { test, GET, POST, PATCH, DELETE, as, draftKey, activeKey, draft, activate, createRental, action, read, failure, valid }
}
