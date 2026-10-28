using {RentalService} from './rental-service';
using {AdminService} from './admin-service';
using {AnalyticsService} from './analytics-service';

// Roller:
//   RentalAgent   – şube çalışanı: kiralama oluşturur/düzenler, müşteri ekler, tamamlar ve iptal eder
//   RentalManager – yönetici: onaylar, reddeder, indirim uygular (kullanıcıya RentalAgent ile birlikte verilir)
//   FleetAdmin    – filo yöneticisi: sadece AdminService
// Yetkiler sadece burada, CDS'te tanımlıdır; servis kodunda rol kontrolü yoktur.

annotate RentalService with @(requires: 'RentalAgent');

annotate RentalService.Rentals with @(restrict: [
  {
    grant: ['READ', 'CREATE', 'UPDATE', 'complete', 'cancel'],
    to   : 'RentalAgent'
  },
  {
    grant: ['approve', 'reject', 'applyDiscount'],
    to   : 'RentalManager'
  }
]);

annotate RentalService.Customers with @(restrict: [{
  grant: ['READ', 'CREATE', 'UPDATE'],
  to   : 'RentalAgent'
}]);

annotate AdminService with @(requires: 'FleetAdmin');

// Analizler sadece yöneticiye açık (ciro bilgisi)
annotate AnalyticsService with @(requires: 'RentalManager');
