import cds from '@sap/cds'

export default class AnalyticsService extends cds.ApplicationService {
  init() {
    const { RentalAnalytics } = this.entities

    // Sıralama verilmemiş gruplu sorguda veritabanı grupları rastgele sırada döndürebilir (PostgreSQL hash
    // aggregate). Aylık trend grafiği aylar sıralı çizilsin ve sonuç her veritabanında aynı olsun diye
    // gruplama alanlarına göre sıralıyoruz.
    this.before('READ', RentalAnalytics, req => {
      const { groupBy, orderBy } = req.query.SELECT
      if (groupBy?.length && !orderBy?.length) req.query.orderBy(groupBy.filter(g => g.ref).map(g => g.ref.join('.')))
    })

    return super.init()
  }
}
