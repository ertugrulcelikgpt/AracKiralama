// S/4HANA Business Partner entegrasyonu (mock modu): internet ve API anahtarı gerektirmez.
// Testte API_BUSINESS_PARTNER için credentials yok; CAP servisi srv/external/data/*.csv ile yerelde taklit eder.
import { expect } from 'chai'
import { setup } from './helpers.js'
import { classifyS4Error } from '../srv/rental-service.js'

const t = setup()
const agent = t.as('agent')
const tr = t.as('agent', { 'Accept-Language': 'tr' })
const importBP = (businessPartnerID, opts = agent) => t.POST('/rental/importFromS4', { businessPartnerID }, opts)

describe('S/4HANA Business Partner (mock)', () => {

  beforeEach(() => t.test.data.reset())

  describe('S4BusinessPartners', () => {

    it('sadece kişiler listelenir (10 kişi, 2 kurum hariç)', async () => {
      const { data } = await t.GET('/rental/S4BusinessPartners?$count=true', agent)
      expect(data['@odata.count']).to.equal(10)
      expect(data.value.every(bp => bp.category === '1')).to.equal(true)
    })

    it('sayfalama: $top/$skip uzak servise iletilir', async () => {
      const { data } = await t.GET('/rental/S4BusinessPartners?$orderby=ID&$top=3&$skip=3&$count=true', agent)
      expect(data.value.map(bp => bp.ID)).to.deep.equal(['1000104', '1000105', '1000106'])
      expect(data['@odata.count']).to.equal(10)
    })

    it('$search ad/soyad üzerinde filtreye çevrilir', async () => {
      const { data } = await t.GET('/rental/S4BusinessPartners?$search=Korkmaz', agent)
      expect(data.value).to.have.length(1)
      expect(data.value[0]).to.include({ ID: '1000102', fullName: 'Seda Korkmaz' })
    })

    it('kurum tekil okumada da görünmez (404)', async () => {
      const { status } = await t.failure(t.GET('/rental/S4BusinessPartners(\'1000201\')', agent))
      expect(status).to.equal(404)
    })

    it('salt okunur: yazma 405', async () => {
      const { status } = await t.failure(t.POST('/rental/S4BusinessPartners', { ID: '1' }, agent))
      expect(status).to.equal(405)
    })
  })

  describe('importFromS4(businessPartnerID)', () => {

    it('kişiyi adres, e-posta ve telefonuyla müşteri olarak kaydeder', async () => {
      const { data } = await importBP('1000102')
      expect(data).to.include({
        businessPartnerID: '1000102', source: 'S4', firstName: 'Seda', lastName: 'Korkmaz',
        city: 'Ankara', email: 's4.ornek2@example.com', phone: '+90 555 000 20 02'
      })
    })

    it('ikinci içe aktarma mevcut müşteriyi günceller, yeni kayıt açmaz', async () => {
      const first = (await importBP('1000102')).data
      const second = (await importBP('1000102')).data
      expect(second.ID).to.equal(first.ID)
      const { data } = await t.GET('/rental/Customers?$filter=businessPartnerID eq \'1000102\'&$count=true', agent)
      expect(data['@odata.count']).to.equal(1)
    })

    it('içe aktarılan müşteri kiralamada kullanılabilir', async () => {
      const { data: customer } = await importBP('1000105')
      const { data } = await t.GET(`/rental/Customers(${customer.ID})?$select=fullName,source`, agent)
      expect(data).to.include({ fullName: 'Tolga Aksoy', source: 'S4' })
    })

    it('olmayan iş ortağı 404 S4_BP_NOT_FOUND', async () => {
      const { status, codes, error } = await t.failure(importBP('9999999', tr))
      expect(status).to.equal(404)
      expect(codes).to.deep.equal(['S4_BP_NOT_FOUND'])
      expect(error.message).to.contain('9999999')
    })

    it('kurum aktarılamaz: 400 S4_BP_NOT_PERSON', async () => {
      const { status, codes } = await t.failure(importBP('1000201'))
      expect(status).to.equal(400)
      expect(codes).to.deep.equal(['S4_BP_NOT_PERSON'])
    })

    it('businessPartnerID zorunlu', async () => {
      const { status } = await t.failure(importBP(''))
      expect(status).to.equal(400)
    })

    it('müşteri yetkisi olmayan admin çağıramaz (403)', async () => {
      const { status } = await t.failure(importBP('1000102', t.as('admin')))
      expect(status).to.equal(403)
    })
  })

  describe('classifyS4Error – uzak hata sınıflandırma', () => {
    const remote = (status, message = 'Error during request to remote service') =>
      Object.assign(new Error(message), { statusCode: 502, reason: { message, response: { status } } })

    it('401/403 → S4_UNAUTHORIZED', () => {
      expect(classifyS4Error(remote(401)).message).to.equal('S4_UNAUTHORIZED')
      expect(classifyS4Error(remote(403)).message).to.equal('S4_UNAUTHORIZED')
    })

    it('zaman aşımı → 504 S4_UNREACHABLE', () => {
      const err = Object.assign(new Error('Error during request'), { reason: { message: 'timeout of 3000ms exceeded' } })
      expect(classifyS4Error(err)).to.deep.equal({ status: 504, message: 'S4_UNREACHABLE' })
    })

    it('kod sadece mesaj metnindeyse de ağ hatası tanınır (ENOTFOUND)', () => {
      const err = new Error('Error during request to remote service: fetch failed Caused by: getaddrinfo ENOTFOUND sandbox.api.sap.com')
      expect(classifyS4Error(err).message).to.equal('S4_UNREACHABLE')
    })

    it('ECONNREFUSED kodu → S4_UNREACHABLE', () => {
      const err = Object.assign(new Error('x'), { reason: { message: 'x', cause: { code: 'ECONNREFUSED' } } })
      expect(classifyS4Error(err).message).to.equal('S4_UNREACHABLE')
    })

    it('diğer hatalar durum koduyla S4_ERROR', () => {
      expect(classifyS4Error(remote(500))).to.deep.equal({ status: 502, message: 'S4_ERROR', args: [500] })
    })
  })
})
