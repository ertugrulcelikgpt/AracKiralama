import cds from '@sap/cds'

const ONE_WAY_FEE = 750
const MAX_TOTAL_DISCOUNT_PERCENT = 30
const MANAGER_DISCOUNT_RANGE = { min: 1, max: 30 }
const EXTRA_QUANTITY_RANGE = { min: 1, max: 3 }
const BLOCKED_VEHICLE_STATUS = ['MT', 'RT']
const BOOKED_RENTAL_STATUS = ['O', 'A']
const PRICE_SOURCE_FIELDS = ['pickupDate', 'returnDate', 'vehicle_ID', 'pickupBranch_code', 'returnBranch_code']
const FIRST_RENTAL_ID = 1000

const DAY_MS = 24 * 60 * 60 * 1000
const round2 = n => Math.round(n * 100) / 100
const today = () => new Date().toISOString().slice(0, 10)
const daysBetween = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS)

// Doğum günü / ehliyet yıldönümü henüz gelmediyse o yıl sayılmaz
function fullYearsBetween(from, at) {
  const f = new Date(from), a = new Date(at)
  let years = a.getUTCFullYear() - f.getUTCFullYear()
  const beforeAnniversary = a.getUTCMonth() < f.getUTCMonth() ||
    (a.getUTCMonth() === f.getUTCMonth() && a.getUTCDate() < f.getUTCDate())
  return beforeAnniversary ? years - 1 : years
}

// ---------------------------------------------------------------------------------------------------------------
// K5 – Fiyat hesaplama (saf fonksiyon: veritabanına dokunmaz, eksik girdide ilgili alanları null bırakır)
// ---------------------------------------------------------------------------------------------------------------
export function longTermDiscountPercent(rentalDays) {
  if (rentalDays >= 14) return 15
  if (rentalDays >= 7) return 10
  return 0
}

export function calculatePrice({ pickupDate, returnDate, dailyRate, pickupBranch_code, returnBranch_code,
  discountPercent = 0, extras = [] }) {
  const rentalDays = pickupDate && returnDate ? Math.max(1, daysBetween(pickupDate, returnDate)) : null
  const basePrice = rentalDays !== null && dailyRate != null ? round2(rentalDays * Number(dailyRate)) : null
  const extraAmounts = extras.map(e => rentalDays !== null && e.dailyPrice != null
    ? round2((e.quantity ?? 1) * Number(e.dailyPrice) * rentalDays)
    : null)
  const extrasPrice = rentalDays !== null ? round2(extraAmounts.reduce((sum, a) => sum + (a ?? 0), 0)) : null
  const oneWayFee = pickupBranch_code && returnBranch_code
    ? (pickupBranch_code === returnBranch_code ? 0 : ONE_WAY_FEE)
    : null
  const discountPercentTotal = Math.min(MAX_TOTAL_DISCOUNT_PERCENT,
    longTermDiscountPercent(rentalDays ?? 0) + (discountPercent ?? 0))
  const discountAmount = basePrice !== null ? round2(basePrice * discountPercentTotal / 100) : null
  const totalPrice = basePrice !== null
    ? round2(basePrice + (extrasPrice ?? 0) + (oneWayFee ?? 0) - discountAmount)
    : null
  return { rentalDays, basePrice, extrasPrice, oneWayFee, discountAmount, totalPrice, extraAmounts }
}

export default class RentalService extends cds.ApplicationService {
  init() {
    const { Rentals, RentalExtras } = this.entities
    const db = cds.entities('rentacar')

    // -------------------------------------------------------------------------------------------------------------
    // K1 – Tarih kontrolü
    // -------------------------------------------------------------------------------------------------------------
    function checkDates(req, rental, isNew) {
      const { pickupDate, returnDate } = rental
      if (pickupDate && returnDate && returnDate <= pickupDate)
        req.error({ status: 400, message: 'RENTAL_DATE_ORDER', target: 'in/returnDate' })
      if (isNew && pickupDate && pickupDate < today())
        req.error({ status: 400, message: 'RENTAL_PICKUP_IN_PAST', args: [pickupDate], target: 'in/pickupDate' })
    }

    // -------------------------------------------------------------------------------------------------------------
    // K2 – Araç müsaitliği: aynı araç için O/A statüsünde, tarih aralığı kesişen başka kiralama olmamalı.
    // İade günü = sonraki teslim günü çakışma sayılmaz (yarı açık aralık).
    // -------------------------------------------------------------------------------------------------------------
    async function checkAvailability(req, rental, vehicle) {
      const { ID, vehicle_ID, pickupDate, returnDate } = rental
      if (!vehicle || !pickupDate || !returnDate) return
      const conflict = await SELECT.one.from(db.Rentals)
        .columns('rentalID', 'pickupDate', 'returnDate')
        .where({
          vehicle_ID,
          ID: { '!=': ID },
          status_code: { in: BOOKED_RENTAL_STATUS },
          pickupDate: { '<': returnDate },
          returnDate: { '>': pickupDate }
        })
      if (conflict) req.error({
        status: 409, message: 'RENTAL_VEHICLE_NOT_AVAILABLE', target: 'in/vehicle_ID',
        args: [vehicle.plate, conflict.pickupDate, conflict.returnDate, conflict.rentalID]
      })
    }

    // -------------------------------------------------------------------------------------------------------------
    // K3 – Araç durumu: bakımdaki (MT) veya hizmet dışı (RT) araç kiralanamaz
    // -------------------------------------------------------------------------------------------------------------
    function checkVehicleStatus(req, vehicle) {
      if (vehicle && BLOCKED_VEHICLE_STATUS.includes(vehicle.status_code))
        req.error({ status: 400, message: 'RENTAL_VEHICLE_BLOCKED', args: [vehicle.plate], target: 'in/vehicle_ID' })
    }

    // -------------------------------------------------------------------------------------------------------------
    // K4 – Sürücü uygunluğu: yaş ve ehliyet süresi, teslim tarihine göre kategori sınırlarını sağlamalı
    // -------------------------------------------------------------------------------------------------------------
    async function checkDriverEligibility(req, rental, vehicle) {
      if (!vehicle || !rental.customer_ID || !rental.pickupDate) return
      const customer = await SELECT.one.from(db.Customers, rental.customer_ID).columns('birthDate', 'licenseIssueDate')
      if (!customer) return
      if (!customer.birthDate || !customer.licenseIssueDate)
        return req.error({ status: 400, message: 'RENTAL_CUSTOMER_DATA_MISSING', target: 'in/customer_ID' })
      const age = fullYearsBetween(customer.birthDate, rental.pickupDate)
      const licenseYears = fullYearsBetween(customer.licenseIssueDate, rental.pickupDate)
      if (age < vehicle.minDriverAge) req.error({
        status: 400, message: 'RENTAL_DRIVER_TOO_YOUNG', target: 'in/customer_ID',
        args: [vehicle.minDriverAge, vehicle.category_code, age]
      })
      if (licenseYears < vehicle.minLicenseYears) req.error({
        status: 400, message: 'RENTAL_LICENSE_TOO_NEW', target: 'in/customer_ID',
        args: [vehicle.minLicenseYears, vehicle.category_code, licenseYears]
      })
    }

    // -------------------------------------------------------------------------------------------------------------
    // K6 – Ek hizmetler: fiyat seçilen ek hizmetten kopyalanır, aynı ek hizmet iki kez eklenemez, adet 1–3
    // -------------------------------------------------------------------------------------------------------------
    async function copyExtraPrice(extra) {
      if (!extra.extra_code) return
      const source = await SELECT.one.from(db.Extras, extra.extra_code).columns('dailyPrice')
      extra.dailyPrice = source?.dailyPrice ?? null
    }

    // Hata hedefi ilgili satırı gösterir; Fiori mesajı ek hizmet tablosunda o satırın alanına bağlar
    const extraTarget = (extra, field) => `in/extras(ID=${extra.ID},IsActiveEntity=false)/${field}`

    function checkExtras(req, extras = []) {
      const seen = new Set()
      for (const extra of extras) {
        if (extra.extra_code && seen.has(extra.extra_code)) req.error({
          status: 400, message: 'RENTAL_EXTRA_DUPLICATE', args: [extra.extra_code],
          target: extraTarget(extra, 'extra_code')
        })
        seen.add(extra.extra_code)
        const quantity = extra.quantity ?? 1
        if (quantity < EXTRA_QUANTITY_RANGE.min || quantity > EXTRA_QUANTITY_RANGE.max)
          req.error({ status: 400, message: 'RENTAL_EXTRA_QUANTITY', target: extraTarget(extra, 'quantity') })
      }
    }

    // -------------------------------------------------------------------------------------------------------------
    // K8 – Numara üretimi: en büyük rentalID + 1. Eşzamanlı iki kayıtta aynı numara çıkarsa db/schema.cds'teki
    // UNIQUE kısıtı ikinci kaydı reddeder (bkz. docs/is-kurallari.md).
    // -------------------------------------------------------------------------------------------------------------
    async function nextRentalID() {
      const { max } = await SELECT.one.from(db.Rentals).columns('max(rentalID) as max')
      return Math.max(max ?? 0, FIRST_RENTAL_ID - 1) + 1
    }

    // Yardımcılar ---------------------------------------------------------------------------------------------------
    const readVehicle = ID => ID && SELECT.one.from(db.Vehicles, ID).columns(
      'plate', 'dailyRate', 'status_code', 'mileage', 'category_code',
      'category.minDriverAge as minDriverAge', 'category.minLicenseYears as minLicenseYears')

    // K5'i bir kiralamaya ve ek hizmet satırlarına uygular (veriyi yerinde günceller)
    function applyPrice(rental, vehicle, extras) {
      const { extraAmounts, ...price } = calculatePrice({ ...rental, dailyRate: vehicle?.dailyRate, extras })
      extras.forEach((e, i) => { e.amount = extraAmounts[i] })
      return Object.assign(rental, price)
    }

    // Kayıtlı fiyatları yeniden hesaplayıp yazar: taslakta (alan değişince) veya aktif kayıtta (applyDiscount sonrası)
    const DRAFTS = { Rentals: Rentals.drafts, RentalExtras: RentalExtras.drafts }
    const ACTIVES = { Rentals: db.Rentals, RentalExtras: db.RentalExtras }
    async function recalculate(tables, rental) {
      const extras = await SELECT.from(tables.RentalExtras).columns('ID', 'quantity', 'dailyPrice')
        .where({ rental_ID: rental.ID })
      const vehicle = await readVehicle(rental.vehicle_ID)
      const { rentalDays, basePrice, extrasPrice, oneWayFee, discountAmount, totalPrice, discountPercent } =
        applyPrice(rental, vehicle, extras)
      const price = { rentalDays, basePrice, extrasPrice, oneWayFee, discountAmount, totalPrice }
      await UPDATE(tables.Rentals, rental.ID).with({ ...price, discountPercent })
      for (const { ID, amount } of extras) await UPDATE(tables.RentalExtras, ID).with({ amount })
      return price
    }

    async function recalculateDraft(rentalID) {
      const rental = await SELECT.one.from(Rentals.drafts, rentalID)
      return rental && recalculate(DRAFTS, rental)
    }

    async function activeRentalOf(req) {
      const { ID } = req.params[0]
      const rental = await SELECT.one.from(db.Rentals, ID)
      if (!rental) return req.reject(404)
      return rental
    }

    const readResult = ID => this.read(Rentals).where({ ID, IsActiveEntity: true }).then(r => r[0])

    // Arayüz yönetici butonlarını bu alana göre aktif/pasif yapar; asıl yetki kontrolü srv/auth.cds'tedir.
    // Sanal alan veritabanından gelmez; istemci $select ile istediyse (veya tüm alanları okuyorsa) doldurulur.
    this.after('READ', Rentals, (rows, req) => {
      const columns = req.query.SELECT?.columns
      const requested = !columns || columns.some(c => c === '*' || c.ref?.[0] === 'canManage')
      if (!requested) return
      for (const row of [].concat(rows ?? [])) if (row) row.canManage = req.user.is('RentalManager')
    })

    // =============================================================================================================
    // Taslak (draft) olayları: K5 anlık hesaplama, K6 fiyat kopyalama, K7 düzenleme kilidi
    // =============================================================================================================

    this.after('PATCH', Rentals.drafts, async (result, req) => {
      if (!PRICE_SOURCE_FIELDS.some(f => f in req.data)) return
      const price = await recalculateDraft(req.data.ID ?? req.params[0].ID)
      if (result && price) Object.assign(result, price)
    })

    this.before(['NEW', 'PATCH'], RentalExtras.drafts, req => copyExtraPrice(req.data))

    this.after(['NEW', 'PATCH'], RentalExtras.drafts, async (result, req) => {
      const ID = req.data.ID ?? result?.ID
      const extra = await SELECT.one.from(RentalExtras.drafts, ID).columns('rental_ID')
      if (extra) await recalculateDraft(extra.rental_ID)
    })

    // Silinen ek hizmet satırının kiralamasını silmeden önce not al, sonra toplamı yeniden hesapla
    const deletedExtraOf = new WeakMap()
    this.before('CANCEL', RentalExtras.drafts, async req => {
      const extra = await SELECT.one.from(RentalExtras.drafts, req.params.at(-1).ID).columns('rental_ID')
      if (extra) deletedExtraOf.set(req, extra.rental_ID)
    })
    this.after('CANCEL', RentalExtras.drafts, async (_, req) => {
      const rentalID = deletedExtraOf.get(req)
      if (rentalID) await recalculateDraft(rentalID)
    })

    // K7 – Sadece Open kiralamalar düzenlemeye açılabilir
    this.before('EDIT', Rentals, async req => {
      const { ID } = req.params[0]
      const rental = await SELECT.one.from(db.Rentals, ID).columns('status_code')
      if (rental && rental.status_code !== 'O') req.reject(409, 'RENTAL_NOT_EDITABLE')
    })

    // =============================================================================================================
    // Kaydet (draftActivate) ve doğrudan CREATE/UPDATE: K1–K4, K6 doğrulama, K5 hesaplama, K8 numara
    // =============================================================================================================
    this.before('SAVE', Rentals, async req => {
      const rental = req.data
      const isNew = req.event === 'CREATE'
      const extras = rental.extras ?? []
      for (const extra of extras) if (extra.dailyPrice == null) await copyExtraPrice(extra)

      const vehicle = await readVehicle(rental.vehicle_ID)
      checkDates(req, rental, isNew)
      checkVehicleStatus(req, vehicle)
      await checkAvailability(req, rental, vehicle)
      await checkDriverEligibility(req, rental, vehicle)
      checkExtras(req, extras)
      if (req.errors) return

      applyPrice(rental, vehicle, extras)
      if (isNew) rental.rentalID = await nextRentalID()
    })

    // =============================================================================================================
    // Action'lar
    // =============================================================================================================
    const ACTIONS = ['approve', 'reject', 'complete', 'cancel', 'applyDiscount']
    this.on(ACTIONS, Rentals.drafts, req => req.reject(400, 'ACTION_ONLY_ACTIVE'))

    this.on('approve', Rentals, async req => {
      const rental = await activeRentalOf(req)
      if (rental.status_code !== 'O') return req.reject(409, 'APPROVE_NOT_OPEN')
      const vehicle = await readVehicle(rental.vehicle_ID)
      await UPDATE(db.Rentals, rental.ID).with({ status_code: 'A', pickupKm: vehicle.mileage })
      return readResult(rental.ID)
    })

    this.on('reject', Rentals, async req => {
      const rental = await activeRentalOf(req)
      if (rental.status_code !== 'O') return req.reject(409, 'REJECT_NOT_OPEN')
      const reason = req.data.reason?.trim()
      if (!reason) return req.reject({ status: 400, message: 'REJECT_REASON_REQUIRED', target: 'reason' })
      await UPDATE(db.Rentals, rental.ID).with({ status_code: 'R', rejectionReason: reason })
      return readResult(rental.ID)
    })

    this.on('complete', Rentals, async req => {
      const rental = await activeRentalOf(req)
      if (rental.status_code !== 'A') return req.reject(409, 'COMPLETE_NOT_APPROVED')
      const { returnKm } = req.data
      const vehicle = await readVehicle(rental.vehicle_ID)
      const minKm = Math.max(vehicle.mileage ?? 0, rental.pickupKm ?? 0)
      if (!Number.isInteger(returnKm) || returnKm < minKm)
        return req.reject({ status: 400, message: 'COMPLETE_KM_INVALID', args: [returnKm, minKm], target: 'returnKm' })
      await UPDATE(db.Rentals, rental.ID).with({ status_code: 'C', returnKm })
      await UPDATE(db.Vehicles, rental.vehicle_ID).with({ mileage: returnKm })
      return readResult(rental.ID)
    })

    this.on('cancel', Rentals, async req => {
      const rental = await activeRentalOf(req)
      if (!BOOKED_RENTAL_STATUS.includes(rental.status_code)) return req.reject(409, 'CANCEL_NOT_ALLOWED')
      await UPDATE(db.Rentals, rental.ID).with({ status_code: 'X' })
      return readResult(rental.ID)
    })

    this.on('applyDiscount', Rentals, async req => {
      const rental = await activeRentalOf(req)
      if (rental.status_code !== 'O') return req.reject(409, 'DISCOUNT_NOT_OPEN')
      const { percent } = req.data
      if (!Number.isInteger(percent) || percent < MANAGER_DISCOUNT_RANGE.min || percent > MANAGER_DISCOUNT_RANGE.max)
        return req.reject({ status: 400, message: 'DISCOUNT_PERCENT_INVALID', target: 'percent' })
      // Uzun süre indirimiyle birlikte toplam %30'u aşmasın; yönetici indirimi buna göre kırpılır
      const room = MAX_TOTAL_DISCOUNT_PERCENT - longTermDiscountPercent(rental.rentalDays)
      const applied = Math.min(percent, room)
      // sap-messages başlığı varsayılan dilde çevrildiği için bilgi mesajını isteğin dilinde biz çeviriyoruz
      if (applied < percent) req.info({
        code: 'DISCOUNT_CAPPED',
        message: cds.i18n.messages.at('DISCOUNT_CAPPED', req.locale, [applied])
      })
      await recalculate(ACTIVES, { ...rental, discountPercent: applied })
      return readResult(rental.ID)
    })

    return super.init()
  }
}
