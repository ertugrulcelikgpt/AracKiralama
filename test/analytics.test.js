// AnalyticsService: OData $apply ile şube bazında ciro, kategori bazında kiralama sayısı, aylık trend
import { expect } from 'chai'
import { setup, RENTAL } from './helpers.js'

const t = setup()
const manager = t.as('manager')
const apply = async (expr, user = manager) =>
  (await t.GET(`/analytics/RentalAnalytics?$apply=${encodeURIComponent(expr)}`, user)).data.value
const sum = (rows, key, value) => rows.reduce((acc, r) => ({ ...acc, [r[key]]: (acc[r[key]] ?? 0) + Number(r[value]) }), {})
const round = obj => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, Math.round(v * 100) / 100]))

describe('AnalyticsService', () => {

  beforeEach(() => t.test.data.reset())

  // Karşılaştırma için kesinleşmiş kiralamaları satır satır okuyup JavaScript'te topluyoruz
  const rows = async () => (await t.GET('/analytics/RentalAnalytics?$select=branch,category,pickupMonth,revenue,status&$top=1000', manager)).data.value

  it('sadece yönetici erişebilir (agent ve admin 403)', async () => {
    for (const user of ['agent', 'admin']) {
      const { status } = await t.failure(t.GET('/analytics/RentalAnalytics', t.as(user)))
      expect(status, user).to.equal(403)
    }
  })

  it('sadece onaylanmış (A) ve tamamlanmış (C) kiralamalar sayılır', async () => {
    const statuses = new Set((await rows()).map(r => r.status))
    expect([...statuses].sort()).to.deep.equal(['A', 'C'])
    const { data } = await t.GET('/rental/Rentals?$filter=status_code eq \'A\' or status_code eq \'C\'&$count=true&$top=0', manager)
    const [total] = await apply('aggregate(rentalCount)')
    expect(total.rentalCount).to.equal(data['@odata.count'])
  })

  it('şube bazında ciro = satırların şubeye göre toplamı', async () => {
    const result = await apply('groupby((branch),aggregate(revenue))')
    const expected = round(sum(await rows(), 'branch', 'revenue'))
    expect(round(Object.fromEntries(result.map(r => [r.branch, Number(r.revenue)])))).to.deep.equal(expected)
  })

  it('kategori bazında kiralama sayısı, kategori adı dile göre', async () => {
    const result = await apply('groupby((category,categoryName),aggregate(rentalCount))', t.as('manager', { 'Accept-Language': 'tr' }))
    const counts = Object.fromEntries((await rows()).reduce((m, r) => m.set(r.category, (m.get(r.category) ?? 0) + 1), new Map()))
    expect(Object.fromEntries(result.map(r => [r.category, r.rentalCount]))).to.deep.equal(counts)
    expect(result.find(r => r.category === 'LUX').categoryName).to.equal('Lüks')
  })

  it('aylık trend: aylar YYYY-AA biçiminde ve sıralı döner', async () => {
    const months = (await apply('groupby((pickupMonth),aggregate(revenue,rentalCount))')).map(r => r.pickupMonth)
    expect(months.every(m => /^\d{4}-\d{2}$/.test(m))).to.equal(true)
    expect(months).to.deep.equal([...months].sort())
    expect(months[0]).to.equal('2026-04')
  })

  it('para birimi tek olduğunda toplamla birlikte döner', async () => {
    const [total] = await apply('aggregate(revenue,currency)')
    expect(total.currency).to.equal('TRY')
  })

  it('onaylanan kiralama analize girer', async () => {
    const [before] = await apply('aggregate(revenue,rentalCount)')
    await t.action(RENTAL[1007], 'approve') // Açık, 4.000 TL
    const [after] = await apply('aggregate(revenue,rentalCount)')
    expect(after.rentalCount).to.equal(before.rentalCount + 1)
    expect(Number(after.revenue)).to.equal(Number(before.revenue) + 4000)
  })
})
