// K5 – Fiyat hesaplama: saf fonksiyonun birim testleri (sunucu gerekmez)
import { expect } from 'chai'
import { calculatePrice, longTermDiscountPercent } from '../srv/rental-service.js'

const base = { dailyRate: 1000, pickupBranch_code: 'IST-AIR', returnBranch_code: 'IST-AIR' }

describe('K5 – calculatePrice', () => {

  it('1 gün: indirim yok', () => {
    const p = calculatePrice({ ...base, pickupDate: '2030-01-01', returnDate: '2030-01-02' })
    expect(p).to.include({ rentalDays: 1, basePrice: 1000, extrasPrice: 0, oneWayFee: 0, discountAmount: 0, totalPrice: 1000 })
  })

  it('6 gün: henüz uzun süre indirimi yok', () => {
    const p = calculatePrice({ ...base, pickupDate: '2030-01-01', returnDate: '2030-01-07' })
    expect(p).to.include({ rentalDays: 6, discountAmount: 0, totalPrice: 6000 })
  })

  it('7 gün: %10 uzun süre indirimi', () => {
    const p = calculatePrice({ ...base, pickupDate: '2030-01-01', returnDate: '2030-01-08' })
    expect(p).to.include({ rentalDays: 7, basePrice: 7000, discountAmount: 700, totalPrice: 6300 })
  })

  it('13 gün: hâlâ %10', () => {
    expect(longTermDiscountPercent(13)).to.equal(10)
  })

  it('14 gün: %15 uzun süre indirimi', () => {
    const p = calculatePrice({ ...base, pickupDate: '2030-01-01', returnDate: '2030-01-15' })
    expect(p).to.include({ rentalDays: 14, basePrice: 14000, discountAmount: 2100, totalPrice: 11900 })
  })

  it('farklı şubeye iade: 750 TL', () => {
    const p = calculatePrice({ ...base, returnBranch_code: 'ANK-CEN', pickupDate: '2030-01-01', returnDate: '2030-01-03' })
    expect(p).to.include({ oneWayFee: 750, totalPrice: 2750 })
  })

  it('ek hizmetler: adet × günlük ücret × gün; indirim sadece temel ücrete uygulanır', () => {
    const p = calculatePrice({
      ...base, pickupDate: '2030-01-01', returnDate: '2030-01-08',
      extras: [{ quantity: 2, dailyPrice: '100.00' }, { quantity: 1, dailyPrice: 150 }]
    })
    expect(p.extraAmounts).to.deep.equal([1400, 1050])
    expect(p).to.include({ extrasPrice: 2450, discountAmount: 700, totalPrice: 7000 + 2450 - 700 })
  })

  it('yönetici indirimi uzun süre indirimine eklenir', () => {
    const p = calculatePrice({ ...base, pickupDate: '2030-01-01', returnDate: '2030-01-08', discountPercent: 5 })
    expect(p).to.include({ discountAmount: 1050, totalPrice: 5950 })
  })

  it('toplam indirim en fazla %30', () => {
    const p = calculatePrice({ ...base, pickupDate: '2030-01-01', returnDate: '2030-01-15', discountPercent: 25 })
    expect(p).to.include({ discountAmount: 4200, totalPrice: 9800 })
  })

  it('kuruş yuvarlaması 2 hane', () => {
    const p = calculatePrice({ ...base, dailyRate: '333.33', pickupDate: '2030-01-01', returnDate: '2030-01-08' })
    expect(p).to.include({ basePrice: 2333.31, discountAmount: 233.33, totalPrice: 2099.98 })
  })

  it('eksik girdi: hesaplanamayan alanlar null kalır', () => {
    const p = calculatePrice({ pickupDate: '2030-01-01' })
    expect(p).to.include({ rentalDays: null, basePrice: null, oneWayFee: null, totalPrice: null })
  })
})
