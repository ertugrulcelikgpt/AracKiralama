// Yetkilendirme (srv/auth.cds): aynı istek, farklı kullanıcı
import { expect } from 'chai'
import { setup, RENTAL } from './helpers.js'

const t = setup()
const status = async promise => { try { return (await promise).status } catch (e) { return e.status } }

describe('Yetkilendirme', () => {

  beforeEach(() => t.test.data.reset())

  it('giriş yapılmamışsa 401', async () => {
    expect(await status(t.GET('/rental/Rentals'))).to.equal(401)
    expect(await status(t.GET('/admin/Vehicles'))).to.equal(401)
  })

  it('yanlış şifre 401', async () => {
    expect(await status(t.GET('/rental/Rentals', { auth: { username: 'agent', password: 'yanlis' } }))).to.equal(401)
  })

  describe('RentalService', () => {

    for (const user of ['agent', 'manager']) it(`${user} kiralamaları okuyabilir`, async () => {
      expect(await status(t.GET('/rental/Rentals', t.as(user)))).to.equal(200)
    })

    it('admin RentalService\'e erişemez (403)', async () => {
      expect(await status(t.GET('/rental/Rentals', t.as('admin')))).to.equal(403)
    })

    for (const action of ['approve', 'reject', 'applyDiscount']) it(`agent ${action} çağıramaz (403)`, async () => {
      const params = { reject: { reason: 'x' }, applyDiscount: { percent: 5 } }[action] ?? {}
      const res = await t.failure(t.action(RENTAL[1007], action, params, 'agent'))
      expect(res.status).to.equal(403)
    })

    it('403 mesajı Türkçe çevrilir', async () => {
      const res = await t.failure(t.POST(`${t.activeKey(RENTAL[1007])}/RentalService.approve`, {}, t.as('agent', { 'Accept-Language': 'tr' })))
      expect(res.error.message).to.equal('Bu işlem için yetkiniz yok.')
    })

    it('manager onaylayabilir (200)', async () => {
      expect(await status(t.action(RENTAL[1007], 'approve', {}, 'manager'))).to.equal(200)
    })

    it('agent tamamlayabilir ve iptal edebilir', async () => {
      expect(await status(t.action(RENTAL[1004], 'complete', { returnKm: 23000 }, 'agent'))).to.equal(200)
      expect(await status(t.action(RENTAL[1007], 'cancel', {}, 'agent'))).to.equal(200)
    })

    it('kaydedilmiş kiralama silinemez (403), iptal kullanılır', async () => {
      expect(await status(t.DELETE(t.activeKey(RENTAL[1000]), t.as('agent')))).to.equal(403)
      expect(await status(t.DELETE(t.activeKey(RENTAL[1000]), t.as('manager')))).to.equal(403)
    })

    it('agent müşteri ekleyebilir', async () => {
      const res = await t.POST('/rental/Customers', { firstName: 'Yeni', lastName: 'Müşteri' }, t.as('agent'))
      expect(res.status).to.equal(201)
    })

    it('ana veriler RentalService\'te salt okunur (405)', async () => {
      expect(await status(t.PATCH('/rental/Branches(\'IST-AIR\')', { name: 'x' }, t.as('manager')))).to.equal(405)
    })

    it('canManage arayüz alanı role göre dolar', async () => {
      const q = `${t.activeKey(RENTAL[1007])}?$select=canManage`
      expect((await t.GET(q, t.as('manager'))).data.canManage).to.equal(true)
      expect((await t.GET(q, t.as('agent'))).data.canManage).to.equal(false)
    })
  })

  describe('AdminService', () => {

    for (const user of ['agent', 'manager']) it(`${user} AdminService'e erişemez (403)`, async () => {
      expect(await status(t.GET('/admin/Vehicles', t.as(user)))).to.equal(403)
    })

    it('admin şube ekleyip silebilir', async () => {
      expect(await status(t.POST('/admin/Branches', { code: 'TST-01', name: 'Test', city: 'Bursa' }, t.as('admin')))).to.equal(201)
      expect(await status(t.DELETE('/admin/Branches(\'TST-01\')', t.as('admin')))).to.equal(204)
    })
  })
})
