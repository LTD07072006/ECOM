# Sprint 1 — Data foundation

## Rà soát workspace

- `docs/market-entry-intelligence-build-spec.md`, tài liệu Word nguồn và các kế hoạch trong `docs/plans/` mô tả đặc tả B-Lite và nền ứng dụng Next.js/Bun.
- `database/market-entry/` chứa bộ SQL độc lập 36 bảng, hai bộ kiểm thử và ERD. Database ứng dụng dùng migration trong `drizzle/` và định nghĩa trong `src/db/schema.ts`. Sprint 1 triển khai trên database của ứng dụng.
- Khi bắt đầu, Docker có PostGIS và sáu bảng Drizzle. `demo-context-v1` là danh mục mẫu, có điểm hiển thị bằng CSS và quan sát dân số để trống. Tìm kiếm và API hồ sơ đã đọc PostgreSQL, kèm fallback demo khi mất kết nối. Fixture kiểm thử tiếp tục dùng dữ liệu mẫu để kiểm tra trường hợp thiếu dữ liệu.

## Nguồn và độ phủ

| Dataset | Phạm vi | Nguồn |
| --- | --- | --- |
| `VN_ADMIN_2025_07` | 1 quốc gia, 34 tỉnh/thành, 3.321 đơn vị cấp xã tại ngày 01/07/2025 | [Quyết định 19/2025/QĐ-TTg](https://vanban.chinhphu.vn/?classid=1&docid=214409&pageid=27160), [Danh mục Cục Thống kê](https://danhmuchanhchinh.nso.gov.vn/Doi_Chieu_Moi.aspx) |
| COD-AB v02 | 34 ranh giới ADM1 trong WGS 84 | [Cục Thống kê / OCHA HDX](https://data.humdata.org/dataset/3cb544a9-9d04-4f54-94e2-93230efd8ceb), [CC BY 3.0 IGO](https://creativecommons.org/licenses/by/3.0/igo/) |
| `PL.V02.01-2025` | Dân số trung bình năm 2025 cho cả nước và 34 tỉnh/thành | [Phụ lục 34 tỉnh của Cục Thống kê](https://www.nso.gov.vn/px-web-2/?pxid=PLV0201&theme=PLV02D%C3%A2n+s%E1%BB%91+v%C3%A0+lao+%C4%91%E1%BB%99ng) |

Danh mục tại mốc lịch sử 01/07/2025 gồm 2.621 xã, 687 phường và 13 đặc khu. Ranh giới tỉnh được đối chiếu theo mã, giản lược với dung sai `0.0008°` và chuẩn hóa hướng vòng. Vòng tự giao của An Giang (`91`) được sửa bằng GEOS trước khi giản lược. PostGIS xác thực lại toàn bộ hình học. [Đối chiếu số đơn vị với Bộ Tài chính](https://www.mof.gov.vn/bo-tai-chinh/dua-nghi-quyet-cua-dang-vao-cuoc-song/qua-trinh-hoan-thien-the-che-chinh-sach-ve-chinh-quyen-dia-phuong-2-cap-duoc-trien-khai-dong-bo-toan-dien).

`POP_AVG` là ước tính dân số trung bình, quy đổi từ nghìn người sang người và làm tròn đến đơn vị. Sáu dòng tổng hợp vùng trong nguồn được bỏ qua. Cấp xã có tìm kiếm và hồ sơ từ danh mục hành chính. Phạm vi dữ liệu ranh giới và dân số theo địa phương dừng ở cấp tỉnh.

## Import và xuất bản

```powershell
bun run db:migrate
bun run db:import --validate
bun run db:import --stage
bun run db:import --publish
bun run db:check
```

`--validate` kiểm SHA-256, mã và cấp hành chính, quan hệ cha–con, độ phủ theo mã, cấu trúc vòng GeoJSON và kỳ dân số mà không ghi database. `--stage` nạp trong một giao dịch và kiểm tra topo, SRID và kiểu hình học bằng PostGIS. `--publish` kích hoạt danh mục và công bố các dataset trong cùng giao dịch. API công khai yêu cầu danh mục hiệu lực, phiên bản đã công bố và nguồn công khai đang hoạt động. `/api/map/provinces` đọc ranh giới từ PostGIS và gửi GeoJSON cho MapLibre.

Chạy lại cùng manifest giữ nguyên bản ghi và thời điểm công bố. Dùng phiên bản mới cho nội dung mới. Catalog demo được chuyển sang `retired` để giữ lịch sử. `owner_name` ghi vai trò phụ trách trong dự án, mặc định là `Market Intelligence Data Steward`. `data_as_of` ghi mốc dữ liệu, `reviewed_at` ghi ngày kiểm tra và `review_due_at` ghi hạn kiểm tra lại. Sprint dùng lịch rà soát 90 ngày cho danh mục và ranh giới, 365 ngày cho dân số năm. API báo `review_due` khi đến hạn.

## Tái lập snapshot

1. Từ danh mục Cục Thống kê, chọn cấp xã, ngày gốc `01/07/2025`, ngày đối chiếu `30/11/2025` rồi xuất Excel.
2. Tải gói GeoJSON COD-AB v02 từ HDX, trong đó có `vnm_admin1.geojson`.
3. Trong PX-Web, chọn toàn bộ địa phương, năm `2025`, ba chỉ tiêu rồi xuất `JSON-stat file (json)`.
4. Dùng Python với `xlrd` và Shapely 2.1 trở lên để chuẩn hóa. Đối chiếu hash với `data/sprint1/manifest.json`.

```powershell
python scripts/prepare-sprint1-data.py admin.xls boundaries.zip population.json data/sprint1
```

| Bản nguồn dùng trong Sprint 1 | SHA-256 |
| --- | --- |
| Excel đối chiếu hành chính | `1949b5d80303d8f59c79333a63a8339defc215bb68f62d660f3ef10882308b39` |
| ZIP COD-AB | `0a74e8ee18eb84b21f980fa4bd2a3135d2bc42fbd6e31450472368ff48abe41b` |
| JSON-stat PX-Web | `c485955249f6dd005516e1f0c5ddde06cc240e6a9eda32b1b279ea953a6ab18c` |
