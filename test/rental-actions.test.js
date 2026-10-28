// Action'lar: approve, reject, complete, cancel, applyDiscount — ön koşullar ve sonuçlar
import { expect } from 'chai'
import { setup, RENTAL } from './helpers.js'

const t = setup()
const num = v => Number(v)

describe('Action\'lar (RentalService)', () => {

  beforeEach(() => t.test.data.reset())

  describe('approve()', () => {

    it('Açık → Onaylandı, pickupKm aracın km\'si olur', async () => {
      const { data } = await t.action(RENTAL[1007], 'approve')
      expect(data).to.include({ status_code: 'A', pickupKm: 26700 })
    })

    it('Açık olmayan kiralama onaylanamaz', async () => {
      const { status, codes } = await t.failure(t.action(RENTAL[1004], 'approve'))
      expect(status).to.equal(409)
      expect(codes).to.deep.equal(['APPROVE_NOT_OPEN'])
    })
  })

  describe('reject(reason)', () => {

    it('sebep zorunlu', async () => {
      const { status } = await t.failure(t.action(RENTAL[1009], 'reject', { reason: '' }))
      expect(status).to.equal(400)
    })

    it('Açık → Reddedildi, sebep kaydedilir', async () => {
      const { data } = await t.action(RENTAL[1009], 'reject', { reason: 'Belge eksik' })
      expect(data).to.include({ status_code: 'R', rejectionReason: 'Belge eksik' })
    })

    it('Onaylanmış kiralama reddedilemez', async () => {
      const { codes } = await t.failure(t.action(RENTAL[1004], 'reject', { reason: 'x' }))
      expect(codes).to.deep.equal(['REJECT_NOT_OPEN'])
    })
  })

  describe('complete(returnKm)', () => {

    it('Açık kiralama tamamlanamaz (önce onay gerekir)', async () => {
      const { codes } = await t.failure(t.action(RENTAL[1007], 'complete', { returnKm: 30000 }, 'agent'))
      expect(codes).to.deep.equal(['COMPLETE_NOT_APPROVED'])
    })

    it('iade km\'si aracın km\'sinden düşük olamaz', async () => {
      const { status, codes, details } = await t.failure(t.action(RENTAL[1004], 'complete', { returnKm: 1000 }, 'agent'))
      expect(status).to.equal(400)
      expect(codes).to.deep.equal(['COMPLETE_KM_INVALID'])
      expect(details[0].target).to.equal('returnKm')
    })

    it('Onaylandı → Tamamlandı, aracın km\'si güncellenir', async () => {
      const { data } = await t.action(RENTAL[1004], 'complete', { returnKm: 23000 }, 'agent')
      expect(data).to.include({ status_code: 'C', returnKm: 23000 })
      const { data: vehicle } = await t.GET(`/rental/Vehicles(${data.vehicle_ID})`, t.as('agent'))
      expect(vehicle.mileage).to.equal(23000)
    })

    it('onay ile başlayan akış: approve → complete', async () => {
      await t.action(RENTAL[1007], 'approve')
      const { data } = await t.action(RENTAL[1007], 'complete', { returnKm: 26950 }, 'agent')
      expect(data).to.include({ status_code: 'C', pickupKm: 26700, returnKm: 26950 })
    })
  })

  describe('cancel()', () => {

    it('Açık → İptal', async () => {
      const { data } = await t.action(RENTAL[1007], 'cancel', {}, 'agent')
      expect(data.status_code).to.equal('X')
    })

    it('Onaylandı → İptal', async () => {
      const { data } = await t.action(RENTAL[1004], 'cancel', {}, 'agent')
      expect(data.status_code).to.equal('X')
    })

    it('Tamamlanmış kiralama iptal edilemez', async () => {
      const { codes } = await t.failure(t.action(RENTAL[1000], 'cancel', {}, 'agent'))
      expect(codes).to.deep.equal(['CANCEL_NOT_ALLOWED'])
    })
  })

  describe('applyDiscount(percent)', () => {

    for (const percent of [0, 31]) it(`%${percent} reddedilir (1–30)`, async () => {
      const { status, codes } = await t.failure(t.action(RENTAL[1007], 'applyDiscount', { percent }))
      expect(status).to.equal(400)
      expect(codes).to.deep.equal(['DISCOUNT_PERCENT_INVALID'])
    })

    it('sadece Açık kiralamaya uygulanır', async () => {
      const { codes } = await t.failure(t.action(RENTAL[1004], 'applyDiscount', { percent: 5 }))
      expect(codes).to.deep.equal(['DISCOUNT_NOT_OPEN'])
    })

    it('indirim saklanır ve toplam yeniden hesaplanır (2 gün, %20)', async () => {
      const { data } = await t.action(RENTAL[1007], 'applyDiscount', { percent: 20 })
      expect(data.discountPercent).to.equal(20)
      expect(num(data.discountAmount)).to.equal(800)
      expect(num(data.totalPrice)).to.equal(3200)
    })

    it('uzun süre indirimiyle toplam %30\'u aşarsa kırpılır ve bilgi mesajı döner', async () => {
      // 1008: 14 gün → %15 uzun süre indirimi; %20 istenir → %15 uygulanır
      const res = await t.action(RENTAL[1008], 'applyDiscount', { percent: 20 })
      expect(res.data.discountPercent).to.equal(15)
      expect(num(res.data.discountAmount)).to.equal(49000 * 0.3)
      const messages = JSON.parse(res.headers['sap-messages'])
      expect(messages[0].code).to.equal('DISCOUNT_CAPPED')
    })

    it('indirim sonradan yapılan düzenlemede korunur', async () => {
      await t.action(RENTAL[1007], 'applyDiscount', { percent: 10 })
      await t.action(RENTAL[1007], 'draftEdit', { PreserveChanges: true }, 'agent')
      const saved = await t.activate(RENTAL[1007])
      expect(saved.discountPercent).to.equal(10)
      expect(num(saved.totalPrice)).to.equal(3600)
    })
  })

  describe('Taslak üzerinde action', () => {

    it('kaydedilmemiş taslakta action çalışmaz', async () => {
      const ID = await t.draft(t.valid(), [], 'manager')
      const { status, codes } = await t.failure(
        t.POST(`${t.draftKey(ID)}/RentalService.approve`, {}, t.as('manager')))
      expect(status).to.equal(400)
      expect(codes).to.deep.equal(['ACTION_ONLY_ACTIVE'])
    })

    it('başka kullanıcının taslağına erişilemez (taslak kilidi, 403)', async () => {
      const ID = await t.draft(t.valid(), [], 'agent')
      const { status } = await t.failure(t.POST(`${t.draftKey(ID)}/RentalService.approve`, {}, t.as('manager')))
      expect(status).to.equal(403)
    })
  })
})
