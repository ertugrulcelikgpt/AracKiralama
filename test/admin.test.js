// AdminService: kullanımdaki ana verinin silinmesi engellenir (kiralamalar sahipsiz kalmasın)
import { expect } from 'chai'
import { setup, VEHICLE } from './helpers.js'

const t = setup()
const admin = t.as('admin')
const vehicleKey = (ID, active = true) => `/admin/Vehicles(ID=${ID},IsActiveEntity=${active})`

describe('AdminService – silme koruması', () => {

  beforeEach(() => t.test.data.reset())

  it('kiralamada kullanılan araç silinemez (409), mesaj hizmet dışı bırakmayı önerir', async () => {
    const civic = 'a1000000-0000-4000-8000-000000000008'
    const { status, codes, error } = await t.failure(t.DELETE(vehicleKey(civic), t.as('admin', { 'Accept-Language': 'tr' })))
    expect(status).to.equal(409)
    expect(codes).to.deep.equal(['VEHICLE_IN_USE'])
    expect(error.message).to.contain('35 RAC 202')
  })

  it('hiç kiralanmamış araç silinebilir', async () => {
    expect((await t.DELETE(vehicleKey(VEHICLE.qashqai), admin)).status).to.equal(204)
  })

  it('kiralamada veya araçta kullanılan şube silinemez (409)', async () => {
    const { status, codes } = await t.failure(t.DELETE("/admin/Branches('IZM-CEN')", admin))
    expect(status).to.equal(409)
    expect(codes).to.deep.equal(['BRANCH_IN_USE'])
  })

  it('kullanılmayan şube silinebilir', async () => {
    await t.POST('/admin/Branches', { code: 'BRS-CEN', name: 'Bursa Merkez', city: 'Bursa' }, admin)
    expect((await t.DELETE("/admin/Branches('BRS-CEN')", admin)).status).to.equal(204)
  })

  it('kiralamada kullanılan ek hizmet silinemez (409)', async () => {
    const { codes } = await t.failure(t.DELETE("/admin/Extras('GPS')", admin))
    expect(codes).to.deep.equal(['EXTRA_IN_USE'])
  })

  it('taslağı atmak (Vazgeç) korumaya takılmaz', async () => {
    const civic = 'a1000000-0000-4000-8000-000000000008'
    await t.POST(`${vehicleKey(civic)}/AdminService.draftEdit`, { PreserveChanges: true }, admin)
    expect((await t.DELETE(vehicleKey(civic, false), admin)).status).to.equal(204)
  })
})
