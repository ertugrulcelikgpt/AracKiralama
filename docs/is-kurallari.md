# İş Kuralları

> Kurallar Aşama 3'te uygulanacak. Her kuralın kodda nerede uygulandığı (dosya:satır) o aşamada eklenecek.

| No | Kural | Kodda |
|---|---|---|
| K1 | Tarih kontrolü: `returnDate > pickupDate`; yeni kiralamada `pickupDate` geçmişte olamaz | — |
| K2 | Araç müsaitliği: aynı araç için O/A statüsünde çakışan kiralama varsa engellenir | — |
| K3 | Araç durumu: MT veya RT statüsündeki araç kiralanamaz | — |
| K4 | Sürücü uygunluğu: yaş ve ehliyet süresi kategori sınırlarını sağlamalı | — |
| K5 | Fiyat hesaplama (gün, ek hizmet, farklı şubeye iade, uzun süre indirimi) | — |
| K6 | Ek hizmet: fiyat kopyalanır, tekrar eklenemez, adet 1–3 | — |
| K7 | Düzenleme kilidi: sadece Open (O) kiralamalar düzenlenebilir | — |
| K8 | Numara üretimi: `rentalID = max + 1` | — |

## Action'lar

| Action | Kim | Ön koşul | Etki |
|---|---|---|---|
| `approve()` | Manager | status = O | status → A |
| `reject(reason)` | Manager | status = O, reason zorunlu | status → R |
| `complete(returnKm)` | Agent, Manager | status = A, returnKm ≥ mileage | status → C, aracın km'si güncellenir |
| `cancel()` | Agent, Manager | status ∈ {O, A} | status → X |
| `applyDiscount(percent)` | Manager | status = O, 1 ≤ percent ≤ 30 | ek indirim, toplam yeniden hesaplanır |
