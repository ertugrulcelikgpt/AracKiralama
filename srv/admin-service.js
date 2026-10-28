import cds from '@sap/cds'

// Kullanımdaki ana veri silinirse kiralamalar sahipsiz kalır (araç/şube/ek hizmet bilgisi kaybolur ve action'lar
// hata verir). Bu yüzden silme engellenir; araç için doğru yol durumunu "Hizmet dışı" (RT) yapmaktır.
export default class AdminService extends cds.ApplicationService {
  init() {
    const { Vehicles, Branches, Extras } = this.entities
    const db = cds.entities('rentacar')
    const keyOf = (req, name) => {
      const key = req.params.at(-1)
      return typeof key === 'object' ? key[name] : key
    }

    this.before('DELETE', Vehicles, async req => {
      const ID = keyOf(req, 'ID')
      const used = await SELECT.one.from(db.Rentals).columns('ID').where({ vehicle_ID: ID })
      if (!used) return
      const { plate } = await SELECT.one.from(db.Vehicles, ID).columns('plate')
      req.reject(409, 'VEHICLE_IN_USE', [plate])
    })

    this.before('DELETE', Branches, async req => {
      const code = keyOf(req, 'code')
      const used =
        await SELECT.one.from(db.Rentals).columns('ID').where`pickupBranch_code = ${code} or returnBranch_code = ${code}` ||
        await SELECT.one.from(db.Vehicles).columns('ID').where({ homeBranch_code: code })
      if (used) req.reject(409, 'BRANCH_IN_USE', [code])
    })

    this.before('DELETE', Extras, async req => {
      const code = keyOf(req, 'code')
      const used = await SELECT.one.from(db.RentalExtras).columns('ID').where({ extra_code: code })
      if (used) req.reject(409, 'EXTRA_IN_USE', [code])
    })

    return super.init()
  }
}
