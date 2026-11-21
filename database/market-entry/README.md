# Prototype schema PostgreSQL `market_entry`

Các tệp SQL trong thư mục này là thiết kế và bộ kiểm thử prototype độc lập. Schema ứng dụng ECOM hiện hành được định nghĩa tại [schema Drizzle](../../src/db/schema.ts) và triển khai bằng [các migration](../../drizzle/). Khởi tạo và nâng cấp database ứng dụng theo [README chính](../../README.md), dùng `bun run db:migrate`.

Schema triển khai mô hình dữ liệu B-Lite dựa trên [đặc tả Market Entry](../../docs/market-entry-intelligence-build-spec.md), đặc biệt là danh mục dữ liệu, từ điển dữ liệu và các luồng nghiên cứu thị trường. Bản mở rộng giữ nguyên dữ liệu trong sáu bảng ban đầu và bổ sung hai migration.

| Tệp | Nội dung |
| --- | --- |
| [`schema.sql`](schema.sql) | Nguồn, phiên bản bộ dữ liệu, địa giới, chỉ tiêu và số liệu quan sát |
| [`002-market-workflows.sql`](002-market-workflows.sql) | Tổ chức, người dùng, ngành, phân khúc, GeoJSON, đối chiếu địa giới, khảo sát, kịch bản, kết quả theo từng lần chấm điểm, xuất báo cáo và nhật ký |
| [`003-investor-workflows.sql`](003-investor-workflows.sql) | Văn bản và checklist, cơ hội và ưu đãi, đầu mối, hồ sơ song ngữ, yêu cầu đầu tư, danh sách lưu và sự kiện chuyển đổi |
| [`test-schema.sql`](test-schema.sql), [`test-workflows.sql`](test-workflows.sql) | Kiểm thử SQL bằng dữ liệu giả lập, rollback sau mỗi bộ kiểm thử |
| [`schema-v2.png`](schema-v2.png) | Sơ đồ quan hệ của bản mở rộng, dựng từ catalog PostgreSQL |

## Áp dụng và kiểm thử

Các lệnh sau dùng PowerShell và PostgreSQL 18.6 đã cài ở `D:\postgreSQL`. Thay `market_entry_dev` bằng tên database đã tạo để thử nghiệm. `psql` sẽ hỏi mật khẩu nếu máy chủ yêu cầu xác thực.

```powershell
Set-Location 'D:\TMDT\database\market-entry'
$psql = 'D:\postgreSQL\bin\psql.exe'
$connection = @('-X', '-h', '127.0.0.1', '-p', '5432', '-U', 'postgres', '-d', 'market_entry_dev', '-v', 'ON_ERROR_STOP=1')

# Database mới
& $psql @connection -f schema.sql -f 002-market-workflows.sql -f 003-investor-workflows.sql

# Database đã có schema 6 bảng thì chạy lệnh này thay cho lệnh trên
# & $psql @connection -f 002-market-workflows.sql -f 003-investor-workflows.sql

# Chạy sau khi áp dụng migration thành công
& $psql @connection -f test-schema.sql -f test-workflows.sql
```

Mỗi migration chạy trong một giao dịch và được áp dụng một lần theo thứ tự. Khi nâng cấp từng phần, chạy tiếp từ tệp chưa được áp dụng.

## Quy ước dữ liệu

- Các tỷ lệ phần trăm trong số liệu, kết quả khảo sát và tỷ lệ phản hồi dùng thang 0–100. Trọng số, độ bao phủ và tỷ lệ phân bổ địa giới dùng thang 0–1.
- Polygon và MultiPolygon được lưu dưới dạng GeoJSON theo WGS 84. SQL kiểm tra cấu trúc cấp cao. Quy trình nhập dữ liệu chịu trách nhiệm kiểm tra tọa độ, vòng polygon và tính hợp lệ topo.
- Dùng `approved_geo_crosswalks` để lấy các bản đối chiếu đã được duyệt. Việc phân bổ và kiểm tra khả năng so sánh thuộc bước phân tích.
- Mỗi `decision_runs` có hai snapshot cho cấu hình và dữ liệu đầu vào. Ứng dụng chịu trách nhiệm điền snapshot đầy đủ, kiểm tra tổng trọng số và tính điểm. Database kiểm tra chỉ tiêu được phép tính điểm, địa bàn thuộc kịch bản và điều kiện để lưu thứ hạng.
- Dữ liệu liên hệ và yêu cầu đầu tư dành cho luồng nội bộ. Phân quyền, lọc nội dung công khai, ghi audit tự động và thực thi workflow thuộc tầng ứng dụng hoặc cấu hình triển khai.
