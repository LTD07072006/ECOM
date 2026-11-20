# Sprint 3 — Wave 2

Wave 2 dùng mã tỉnh `VN_ADMIN_2025_07` và các bảng theo 34 tỉnh trong phụ lục niên giám. [Niên giám thống kê 2025](https://www.nso.gov.vn/default/2026/07/nien-giam-thong-ke-2025/).

| Chỉ tiêu năm 2025 | Bảng nguồn | Đơn vị | Tỉnh có giá trị |
| --- | --- | --- | ---: |
| GRDP bình quân | `PL.V03.02` | triệu đồng/người | 34 |
| Tăng trưởng GRDP | `PL.V03.01` | % so với năm trước | 34 |
| Bán lẻ và doanh thu dịch vụ tiêu dùng | `PL.V08.01` | tỷ đồng, giá hiện hành | 34 |
| Vốn đăng ký FDI trong năm | `PL.V04.02` | triệu USD | 31 |
| Doanh nghiệp đăng ký mới | `PL.V05.01` | doanh nghiệp | 34 |
| Lực lượng lao động từ 15 tuổi | `PL.V02.24` | nghìn người | 34 |
| Tỷ lệ lao động từ 15 tuổi đã qua đào tạo | `PL.V02.27` | % | 34 |

`PL.V03.01` công bố chỉ số với năm trước bằng 100. Import trừ 100 để biểu diễn tốc độ tăng trưởng. FDI giữ nguyên số âm được công bố và giữ `null` ở ba tỉnh không có số liệu. Nhãn ước tính hoặc sơ bộ được giữ theo PX-Web.

Nguồn tăng trưởng thứ hai gồm bốn giá trị nêu rõ cho Hà Nội, Quảng Ninh, Hải Phòng và TP.HCM. UI hiển thị chênh lệch theo điểm phần trăm khi cả hai nguồn có giá trị cho tỉnh được chọn. [Thông cáo tăng trưởng GRDP](https://www.nso.gov.vn/du-lieu-va-so-lieu-thong-ke/2026/01/thong-cao-bao-chi-ve-ket-qua-tang-truong-tong-san-pham-tren-dia-ban-grdp-cua-34-tinh-thanh-pho-nam-2025/).

Lớp hạ tầng gồm 22 sân bay dân dụng được ghi nhận có chuyến bay theo lịch trong snapshot OurAirports thu thập ngày 20/11/2026. `ST_Covers` gắn mỗi POI với đúng một tỉnh theo COD-AB v02. POI dùng để tham khảo vị trí. [Dữ liệu mở OurAirports](https://ourairports.com/data/).

## Import và công bố

Dataset nền Sprint 1 cần được công bố trước Wave 2.

```powershell
bun run db:migrate
bun run db:import:wave2 --validate
bun run db:import:wave2 --stage
bun run db:import:wave2 --publish
```

`--validate` kiểm checksum, mã tỉnh, phạm vi, kỳ và kiểu giá trị. `--stage` xác thực quan hệ và POI trong giao dịch. `--publish` công bố đồng thời các nguồn. Import lại cùng snapshot giữ nguyên bản ghi và thời điểm công bố. `data/sprint3/manifest.json` lưu URL, hash, phiên bản, mốc dữ liệu và hạn rà soát của từng nguồn.

Để tái lập snapshot, xuất JSON-stat của các bảng PX-Web với tất cả địa phương và kỳ, rồi tải `airports.csv` từ OurAirports. Đặt tên cho tệp `.raw` và `.url` theo các khóa `grdp`, `growth`, `retail`, `fdi`, `business`, `workforce` và `talent`. Tệp `.url` chứa URL iframe ở dòng đầu và URL trang NSO ở dòng hai.

```powershell
python scripts/prepare-sprint3-data.py <thu-muc-export> data/sprint3
```

## Bản đồ và đối chiếu

`/api/map/layers` trả các chuỗi tỉnh và POI từ dataset đã công bố. Trên MapLibre, chọn chỉ tiêu để tô màu tỉnh và bật sân bay độc lập. Chú giải chia miền giá trị của chuỗi đang xem thành bốn khoảng đều, với màu riêng cho dữ liệu thiếu.

Đối chiếu nguồn hiển thị nhà cung cấp, phiên bản, đơn vị, địa giới, độ phủ, giấy phép, kỳ và phương pháp. UI chỉ tính chênh lệch khi khớp chỉ tiêu, định nghĩa, đơn vị, kỳ, phạm vi và phiên bản địa giới, đồng thời có đủ hai giá trị. Hồ sơ tỉnh ưu tiên kỳ mới nhất, rồi ưu tiên nguồn có độ phủ rộng hơn khi cùng kỳ.
