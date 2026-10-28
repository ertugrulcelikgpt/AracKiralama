// İş kuralları K1–K8 ve draft akışı: RentalService üzerinden gerçek OData istekleriyle entegrasyon testleri
import { expect } from 'chai'
import cds from '@sap/cds'
import { setup, day, yearsBefore, VEHICLE, RENTAL } from './helpers.js'

const t = setup()
const num = v => (v === null ? null : Number(v))

describe('İş kuralları (RentalService)', () => {

  beforeEach(() => t.test.data.reset())

  it('test veritabanı: bellek içi SQLite veya rentacar_test (geliştirme verisine dokunulmaz)', () => {
    const { kind, credentials } = cds.db.options
    if (kind === 'sqlite') expect(credentials.url ?? credentials.database).to.equal(':memory:')
    else expect(credentials.database).to.equal('rentacar_test')
  })

  describe('Draft akışı', () => {

    it('taslak → alan güncelle → aktive et: kayıt oluşur, taslak silinir', async () => {
      const ID = await t.draft(t.valid())
      const { data: list } = await t.GET(`/rental/Rentals?$filter=ID eq ${ID}`, t.as('agent'))
      expect(list.value).to.have.length(0) // aktif kayıt henüz yok
      const saved = await t.activate(ID)
      expect(saved).to.include({ ID, IsActiveEntity: true, status_code: 'O', createdBy: 'agent' })
      const draftGone = await t.failure(t.GET(t.draftKey(ID), t.as('agent')))
      expect(draftGone.status).to.equal(404)
    })

    it('Vazgeç: taslak silinir, aktif kayıt oluşmaz', async () => {
      const ID = await t.draft(t.valid())
      await t.DELETE(t.draftKey(ID), t.as('agent'))
      expect((await t.failure(t.GET(t.activeKey(ID), t.as('agent')))).status).to.equal(404)
    })

    it('zorunlu alanlar boşsa Kaydet reddedilir', async () => {
      const ID = await t.draft()
      const { status, codes } = await t.failure(t.activate(ID))
      expect(status).to.equal(400)
      expect(codes).to.include('ASSERT_MANDATORY')
    })
  })

  describe('K1 – Tarih kontrolü', () => {

    it('iade tarihi teslim tarihinden önce olamaz', async () => {
      const { codes, details } = await t.failure(t.createRental(t.valid({ pickupDate: day(30), returnDate: day(29) })))
      expect(codes).to.deep.equal(['RENTAL_DATE_ORDER'])
      expect(details[0].target).to.equal('in/returnDate')
    })

    it('aynı gün teslim ve iade olamaz', async () => {
      const { codes } = await t.failure(t.createRental(t.valid({ pickupDate: day(30), returnDate: day(30) })))
      expect(codes).to.deep.equal(['RENTAL_DATE_ORDER'])
    })

    it('yeni kiralamada teslim tarihi geçmişte olamaz', async () => {
      const { codes } = await t.failure(t.createRental(t.valid({ pickupDate: day(-3), returnDate: day(2) })))
      expect(codes).to.deep.equal(['RENTAL_PICKUP_IN_PAST'])
    })

    it('geçerli tarihler kabul edilir', async () => {
      const r = await t.createRental(t.valid())
      expect(r.status_code).to.equal('O')
    })
  })

  describe('K2 – Araç müsaitliği', () => {

    it('aynı araç için çakışan tarih reddedilir, mesajda çakışan kiralama numarası yazar', async () => {
      const first = await t.createRental(t.valid({ pickupDate: day(40), returnDate: day(45) }))
      const { status, codes, error } = await t.failure(t.createRental(t.valid({ pickupDate: day(43), returnDate: day(47) })))
      expect(status).to.equal(409)
      expect(codes).to.deep.equal(['RENTAL_VEHICLE_NOT_AVAILABLE'])
      expect(error.message).to.contain(String(first.rentalID))
    })

    it('iade günü yeni kiralamanın teslim günü olabilir', async () => {
      await t.createRental(t.valid({ pickupDate: day(40), returnDate: day(45) }))
      const second = await t.createRental(t.valid({ pickupDate: day(45), returnDate: day(48) }))
      expect(second.status_code).to.equal('O')
    })

    it('iptal edilmiş kiralama aracı bloke etmez', async () => {
      const first = await t.createRental(t.valid({ pickupDate: day(40), returnDate: day(45) }))
      await t.action(first.ID, 'cancel')
      const second = await t.createRental(t.valid({ pickupDate: day(41), returnDate: day(44) }))
      expect(second.status_code).to.equal('O')
    })

    it('kendi kaydını düzenlerken kendisiyle çakışmaz', async () => {
      const r = await t.createRental(t.valid({ pickupDate: day(40), returnDate: day(45) }))
      await t.action(r.ID, 'draftEdit', { PreserveChanges: true }, 'agent')
      await t.PATCH(t.draftKey(r.ID), { returnDate: day(46) }, t.as('agent'))
      const saved = await t.activate(r.ID)
      expect(saved.returnDate).to.equal(day(46))
    })
  })

  describe('K3 – Araç durumu', () => {

    it('bakımdaki (MT) araç kiralanamaz', async () => {
      const { codes } = await t.failure(t.createRental(t.valid({ vehicle_ID: VEHICLE.corsa })))
      expect(codes).to.deep.equal(['RENTAL_VEHICLE_BLOCKED'])
    })

    it('hizmet dışı (RT) araç kiralanamaz', async () => {
      // AdminService'te araçlar draft'lı; durumu draft akışıyla RT yap
      await t.POST(`/admin/Vehicles(ID=${VEHICLE.golf},IsActiveEntity=true)/AdminService.draftEdit`, { PreserveChanges: true }, t.as('admin'))
      await t.PATCH(`/admin/Vehicles(ID=${VEHICLE.golf},IsActiveEntity=false)`, { status_code: 'RT' }, t.as('admin'))
      await t.POST(`/admin/Vehicles(ID=${VEHICLE.golf},IsActiveEntity=false)/AdminService.draftActivate`, {}, t.as('admin'))
      const { codes } = await t.failure(t.createRental(t.valid({ vehicle_ID: VEHICLE.golf })))
      expect(codes).to.deep.equal(['RENTAL_VEHICLE_BLOCKED'])
    })
  })

  describe('K4 – Sürücü uygunluğu', () => {

    const pickupDate = day(60)
    const customer = async (birthDate, licenseIssueDate) => (await t.POST('/rental/Customers',
      { firstName: 'Test', lastName: 'Sürücü', birthDate, licenseIssueDate }, t.as('agent'))).data.ID

    it('ECO için 20 yaşındaki sürücü reddedilir (min 21)', async () => {
      const c = await customer(yearsBefore(pickupDate, 21, -1), yearsBefore(pickupDate, 2))
      const { codes, details } = await t.failure(t.createRental(t.valid({
        customer_ID: c, vehicle_ID: VEHICLE.i20, pickupDate, returnDate: day(62) })))
      expect(codes).to.deep.equal(['RENTAL_DRIVER_TOO_YOUNG'])
      expect(details[0].target).to.equal('in/customer_ID')
    })

    it('teslim günü 21 yaşına basan sürücü ECO kiralayabilir', async () => {
      const c = await customer(yearsBefore(pickupDate, 21), yearsBefore(pickupDate, 2))
      const r = await t.createRental(t.valid({ customer_ID: c, vehicle_ID: VEHICLE.i20, pickupDate, returnDate: day(62) }))
      expect(r.status_code).to.equal('O')
    })

    it('SUV için 1 yıllık ehliyet yetmez (min 2)', async () => {
      const c = await customer(yearsBefore(pickupDate, 30), yearsBefore(pickupDate, 1, 30))
      const { codes } = await t.failure(t.createRental(t.valid({ customer_ID: c, pickupDate, returnDate: day(62) })))
      expect(codes).to.deep.equal(['RENTAL_LICENSE_TOO_NEW'])
    })

    it('doğum veya ehliyet tarihi eksikse reddedilir', async () => {
      const c = await customer(null, null)
      const { codes } = await t.failure(t.createRental(t.valid({ customer_ID: c })))
      expect(codes).to.deep.equal(['RENTAL_CUSTOMER_DATA_MISSING'])
    })
  })

  describe('K5 – Fiyat hesaplama (kaydedilen değerler)', () => {

    const price = r => ({
      rentalDays: r.rentalDays, basePrice: num(r.basePrice), extrasPrice: num(r.extrasPrice),
      oneWayFee: num(r.oneWayFee), discountAmount: num(r.discountAmount), totalPrice: num(r.totalPrice)
    })

    it('1 gün', async () => {
      const r = await t.createRental(t.valid({ pickupDate: day(30), returnDate: day(31) }))
      expect(price(r)).to.deep.equal({ rentalDays: 1, basePrice: 3100, extrasPrice: 0, oneWayFee: 0, discountAmount: 0, totalPrice: 3100 })
    })

    it('7 gün: %10 indirim', async () => {
      const r = await t.createRental(t.valid({ pickupDate: day(30), returnDate: day(37) }))
      expect(price(r)).to.include({ rentalDays: 7, basePrice: 21700, discountAmount: 2170, totalPrice: 19530 })
    })

    it('14 gün: %15 indirim', async () => {
      const r = await t.createRental(t.valid({ pickupDate: day(30), returnDate: day(44) }))
      expect(price(r)).to.include({ rentalDays: 14, basePrice: 43400, discountAmount: 6510, totalPrice: 36890 })
    })

    it('farklı şubeye iade: +750 TL', async () => {
      const r = await t.createRental(t.valid({ returnBranch_code: 'ANK-CEN' }))
      expect(price(r)).to.include({ rentalDays: 3, oneWayFee: 750, totalPrice: 9300 + 750 })
    })

    it('ek hizmetli: GPS × 2 + bebek koltuğu, 7 gün', async () => {
      const r = await t.createRental(t.valid({ pickupDate: day(30), returnDate: day(37) }),
        [{ extra_code: 'GPS', quantity: 2 }, { extra_code: 'BABY' }])
      expect(price(r)).to.include({ extrasPrice: 2 * 150 * 7 + 100 * 7, totalPrice: 21700 + 2800 - 2170 })
      const { data } = await t.GET(`${t.activeKey(r.ID)}/extras?$orderby=extra_code`, t.as('agent'))
      expect(data.value.map(e => [e.extra_code, num(e.dailyPrice), num(e.amount)])).to.deep.equal([['BABY', 100, 700], ['GPS', 150, 2100]])
    })

    it('istemcinin gönderdiği fiyat yok sayılır (@readonly)', async () => {
      const r = await t.createRental({ ...t.valid(), totalPrice: 1 })
      expect(num(r.totalPrice)).to.equal(9300)
    })
  })

  describe('K5 – Taslakta anlık hesaplama', () => {

    it('tarih değişince PATCH yanıtında yeni fiyat döner', async () => {
      const ID = await t.draft(t.valid())
      const { data } = await t.PATCH(t.draftKey(ID), { returnDate: day(37) }, t.as('agent'))
      expect(data.rentalDays).to.equal(7)
      expect(num(data.totalPrice)).to.equal(19530)
    })

    it('ek hizmet eklenince/silinince taslak toplamı güncellenir', async () => {
      const ID = await t.draft(t.valid())
      const { data: extra } = await t.POST(`${t.draftKey(ID)}/extras`, { extra_code: 'FULLINS' }, t.as('agent'))
      let { data } = await t.GET(t.draftKey(ID), t.as('agent'))
      expect(num(data.extrasPrice)).to.equal(350 * 3)
      expect(num(data.totalPrice)).to.equal(9300 + 1050)
      await t.PATCH(`/rental/RentalExtras(ID=${extra.ID},IsActiveEntity=false)`, { quantity: 2 }, t.as('agent'))
      ;({ data } = await t.GET(t.draftKey(ID), t.as('agent')))
      expect(num(data.extrasPrice)).to.equal(2100)
      await t.DELETE(`/rental/RentalExtras(ID=${extra.ID},IsActiveEntity=false)`, t.as('agent'))
      ;({ data } = await t.GET(t.draftKey(ID), t.as('agent')))
      expect(num(data.extrasPrice)).to.equal(0)
      expect(num(data.totalPrice)).to.equal(9300)
    })
  })

  describe('K6 – Ek hizmetler', () => {

    it('günlük ücret seçilen ek hizmetten kopyalanır', async () => {
      const ID = await t.draft(t.valid())
      const { data } = await t.POST(`${t.draftKey(ID)}/extras`, { extra_code: 'DRIVER', dailyPrice: 1 }, t.as('agent'))
      expect(num(data.dailyPrice)).to.equal(200)
    })

    it('aynı ek hizmet iki kez eklenemez', async () => {
      const { codes, details } = await t.failure(t.createRental(t.valid(), [{ extra_code: 'GPS' }, { extra_code: 'GPS' }]))
      expect(codes).to.deep.equal(['RENTAL_EXTRA_DUPLICATE'])
      expect(details[0].target).to.match(/^in\/extras\(ID=.+,IsActiveEntity=false\)\/extra_code$/)
    })

    for (const quantity of [0, 4]) it(`adet ${quantity} reddedilir (1–3)`, async () => {
      const { codes } = await t.failure(t.createRental(t.valid(), [{ extra_code: 'GPS', quantity }]))
      expect(codes).to.deep.equal(['RENTAL_EXTRA_QUANTITY'])
    })

    it('adet 3 kabul edilir', async () => {
      const r = await t.createRental(t.valid(), [{ extra_code: 'GPS', quantity: 3 }])
      expect(num(r.extrasPrice)).to.equal(3 * 150 * 3)
    })
  })

  describe('K7 – Düzenleme kilidi', () => {

    it('onaylanmış kiralama düzenlemeye açılamaz', async () => {
      const { status, codes } = await t.failure(t.action(RENTAL[1004], 'draftEdit', { PreserveChanges: true }, 'agent'))
      expect(status).to.equal(409)
      expect(codes).to.deep.equal(['RENTAL_NOT_EDITABLE'])
    })

    it('açık kiralama düzenlemeye açılabilir', async () => {
      const { data } = await t.action(RENTAL[1007], 'draftEdit', { PreserveChanges: true }, 'agent')
      expect(data.IsActiveEntity).to.equal(false)
    })
  })

  describe('K8 – Numara üretimi', () => {

    it('yeni kiralamalar max + 1 numarası alır', async () => {
      const a = await t.createRental(t.valid({ pickupDate: day(30), returnDate: day(32) }))
      const b = await t.createRental(t.valid({ pickupDate: day(40), returnDate: day(42) }))
      expect([a.rentalID, b.rentalID]).to.deep.equal([1012, 1013])
    })

    it('düzenleme numarayı değiştirmez', async () => {
      await t.action(RENTAL[1007], 'draftEdit', { PreserveChanges: true }, 'agent')
      const saved = await t.activate(RENTAL[1007])
      expect(saved.rentalID).to.equal(1007)
    })
  })

  describe('Birden fazla hata ve dil', () => {

    it('birden fazla kural ihlali tek yanıtta döner', async () => {
      const { codes } = await t.failure(t.createRental(t.valid({ vehicle_ID: VEHICLE.corsa, pickupDate: day(-3), returnDate: day(-5) })))
      expect(codes).to.have.members(['RENTAL_DATE_ORDER', 'RENTAL_PICKUP_IN_PAST', 'RENTAL_VEHICLE_BLOCKED'])
    })

    it('hata mesajı isteğin dilinde döner (tr / en)', async () => {
      const ID = await t.draft(t.valid({ vehicle_ID: VEHICLE.corsa }))
      const tr = await t.failure(t.activate(ID, 'agent', { 'Accept-Language': 'tr' }))
      const en = await t.failure(t.activate(ID, 'agent', { 'Accept-Language': 'en' }))
      expect(tr.error.message).to.contain('bakımda veya hizmet dışı')
      expect(en.error.message).to.contain('maintenance or retired')
    })
  })
})
