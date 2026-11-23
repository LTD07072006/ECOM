# Vietnam Market Intelligence · ECOM

ECOM là hệ thống tra cứu bối cảnh đầu tư theo địa bàn tại Việt Nam. Người dùng có thể xem bản đồ, kiểm tra nguồn số liệu, lưu và so sánh địa bàn, rồi gửi yêu cầu hỗ trợ đầu tư. Steward xử lý inquiry và lưu báo cáo theo kỳ. Reviewer và steward phụ trách duyệt và công bố các bộ dữ liệu.

## Mục lục

- [Chạy lần đầu](#chạy-lần-đầu)
- [Chạy lại và dừng ứng dụng](#chạy-lại-và-dừng-ứng-dụng)
- [Cấu hình và bảo mật](#cấu-hình-và-bảo-mật)
- [Ngôn ngữ giao diện](#ngôn-ngữ-giao-diện)
- [Thử các luồng trên giao diện](#thử-các-luồng-trên-giao-diện)
- [Kiểm thử](#kiểm-thử)
- [Migration và phát hành dữ liệu](#migration-và-phát-hành-dữ-liệu)
- [Xử lý lỗi thường gặp](#xử-lý-lỗi-thường-gặp)
- [Cấu trúc dự án](#cấu-trúc-dự-án)

## Chạy lần đầu

### 1. Chuẩn bị công cụ

- Cài [Git](https://git-scm.com/install/) để tải mã nguồn.
- Cài [Bun](https://bun.sh/docs/installation). Phiên bản dự án ghim là `1.4.5`.
- Trên Windows hoặc macOS, mở [Docker Desktop](https://docs.docker.com/desktop/) và chờ Docker Engine chạy. Trên Linux, bật Docker Engine và cài Docker Compose plugin. Dự án dùng image Linux `postgis/postgis:16-3.4`.

Mở terminal mới rồi kiểm tra. Trên Windows, dùng PowerShell.

~~~sh
git --version
bun --version
docker compose version
docker info --format "{{.OSType}}"
~~~

Lệnh cuối cần trả về `linux`. Lần đầu cần kết nối mạng để tải dependencies và image PostGIS nếu máy chưa có.

### 2. Clone repository

~~~sh
git clone https://github.com/LTD07072006/ECOM.git
cd ECOM
~~~

Chạy các lệnh tiếp theo từ thư mục có `package.json`, `docker-compose.yml` và `bun.lock`.

### 3. Khởi tạo và mở ứng dụng

~~~sh
bun run setup:local
~~~

Lệnh thực hiện lần lượt các bước sau.

1. Kiểm tra Docker Engine và cài dependencies theo `bun.lock`.
2. Tạo `.env` trên máy nếu chưa có. Script sinh mật khẩu PostgreSQL, reviewer token và steward token riêng cho bản cài.
3. Khởi động PostGIS bằng Docker Compose và chờ dịch vụ sẵn sàng.
4. Áp dụng các migration trong `drizzle/`.
5. Kiểm tra và nạp manifest hành chính, ranh giới và dữ liệu Wave 2 đi cùng repository.
6. Kiểm tra catalog đã công bố rồi chạy Next.js.

### 4. Xác nhận hệ thống sẵn sàng

1. Giữ terminal chạy web. Mở URL Next.js in ra, thường là [http://127.0.0.1:3000](http://127.0.0.1:3000). Dùng cổng Next.js thông báo nếu máy đang bận cổng mặc định.
2. Thấy tiêu đề **Vietnam Market Intelligence**, tìm **Hà Nội** để thử tải hồ sơ và xem bản đồ.
3. Mở [http://127.0.0.1:3000/api/health](http://127.0.0.1:3000/api/health). Kết quả sẵn sàng có các trường sau.

   ~~~json
   {
     "status": "ok",
     "database": "ready",
     "mode": "database",
     "publicationStatus": "published"
   }
   ~~~

4. Để kiểm tra database từ terminal thứ hai, vào lại thư mục `ECOM` và chạy hai lệnh sau.

   ~~~sh
   docker compose ps db
   bun run db:check
   ~~~

   Container nên hiện `healthy`. Lệnh `db:check` hiển thị phiên bản PostGIS, phiên bản địa giới và số bản ghi đang phục vụ.

## Chạy lại và dừng ứng dụng

| Tình huống | Lệnh |
| --- | --- |
| Chạy lại sau khi khởi động máy hoặc sau khi pull thay đổi | `bun run setup:local` |
| Chuẩn bị database, chạy migration và nạp dữ liệu trước | `bun run setup:local --setup-only` |
| Chỉ chạy web khi database đã sẵn sàng | `bun run dev --hostname 127.0.0.1` |
| Kiểm tra database riêng | `bun run db:check` |
| Dừng PostgreSQL và giữ dữ liệu trong volume | `docker compose stop db` |

Để dừng web, nhấn **Ctrl+C** ở terminal đang chạy Next.js. Khi đã có `.env`, setup dùng lại các credential trong file này và làm việc với volume hiện có.

## Cấu hình và bảo mật

| Biến | Công dụng |
| --- | --- |
| `POSTGRES_PASSWORD` | Mật khẩu dùng khi khởi tạo PostgreSQL. Với volume cũ, giá trị phải khớp mật khẩu hiện hành của role. |
| `DATABASE_URL` | Kết nối server-side. Mặc định user và database là `market_entry`, địa chỉ `127.0.0.1:55432`. |
| `RELEASE_REVIEWER_TOKEN` | Mở dashboard phát hành với quyền reviewer để duyệt dataset. |
| `RELEASE_STEWARD_TOKEN` | Xử lý inquiry và báo cáo nội bộ, công bố hoặc ngừng công bố release theo quyền steward. |
| `REQUIRE_RELEASE_APPROVAL` | Setup local tạo giá trị `0`. Đặt `1` cho trình import ở staging và production để yêu cầu quy trình duyệt release. |
| `INQUIRY_PRIVACY_CONTROLLER`, `INQUIRY_PRIVACY_EMAIL` | Tên đơn vị phụ trách và địa chỉ nhận yêu cầu về dữ liệu. Bắt buộc để nhận inquiry trong bản chạy production. |
| `ECOM_TRUSTED_PROXY_TOKEN` | Secret riêng của reverse proxy và ứng dụng. Cấu hình khi mở dịch vụ ra Internet để áp dụng hạn mức theo client. Chế độ local dùng một hạn mức chung. |
| `ECOM_ALLOW_DIRECT_INGRESS` | Chỉ đặt `1` cho preview loopback/CI không qua reverse proxy; không bao giờ bật trên production công khai (mặc định production fail-closed trả `503` khi thiếu proxy token). |
| `ECOM_DATABASE_ALLOW_INSECURE` | Chỉ đặt `1` trên mạng nội bộ Docker/local khi `NODE_ENV=production` dùng PostgreSQL không có `sslmode=require\|verify-ca\|verify-full`. |
| `ECOM_OPERATORS` | JSON lưu trong secret manager, chứa danh sách operator với `id`, `role`, `token` riêng và `expiresAt` (ISO-8601) tùy chọn. Không ghi giá trị thật vào Git. |
| `ECOM_REQUIRE_NAMED_OPERATORS` | Đặt `1` trong staging và production để yêu cầu operator định danh. |
| `ECOM_SESSION_SECRET` | Secret tùy chọn (>=32 ký tự) trộn vào khóa ký HMAC của cookie phiên operator (`ecom_operator_session`). |
| `ECOM_MAIL_TRANSPORT` | Transport gửi mail: `log`, `resend` hoặc `disabled` (mặc định production là `disabled`; dùng `resend` cần pháp chế duyệt notice và chuyển dữ liệu). |
| `ECOM_MAIL_FROM`, `RESEND_API_KEY`, `ECOM_STEWARD_NOTIFY_EMAIL` | Địa chỉ gửi, API key Resend (chỉ dùng khi `ECOM_MAIL_TRANSPORT=resend`) và email steward nhận cảnh báo inquiry mới. |

- Git theo dõi [`.env.example`](.env.example) với các giá trị trống. Cất secret thật trong `.env` cục bộ hoặc secret manager. Khi gửi ảnh chụp hay log lỗi, che mật khẩu, token và toàn bộ chuỗi kết nối.
- Web local và cổng PostgreSQL mặc định đều bind vào loopback. Token steward dùng chung ghi nhận vai trò steward trong audit. Quy trình cấp quyền cho pilot và production nằm trong [release runbook](docs/sprint4-release-runbook.md).
- Nếu chạy hai bản checkout trên cùng máy, chọn bộ giá trị riêng cho `COMPOSE_PROJECT_NAME`, `ECOM_DB_CONTAINER`, `ECOM_DB_PORT` và cổng web `PORT`. Giữ cùng bộ giá trị khi chạy lại bản checkout đó.

Trong môi trường dùng chung, cấp cho mỗi người một token ngẫu nhiên riêng và đặt `ECOM_OPERATORS` từ secret manager. Danh sách JSON có dạng `[{"id":"operator-id","role":"steward","token":"<token-rieng>","expiresAt":"2026-12-31T23:59:59Z"}]` (`expiresAt` tùy chọn theo ISO-8601). Vai trò hỗ trợ `steward` và `reviewer`. ID và token phải duy nhất, token phải là chuỗi base64url ngẫu nhiên dài 43–128 ký tự. Thu hồi hoặc xoay vòng bằng cách xóa operator, đổi token hoặc hạ `expiresAt` trong secret manager và cập nhật cấu hình ứng dụng. Chế độ production yêu cầu operator định danh. Token chung chỉ được hỗ trợ ở chế độ phát triển local.

Tài liệu kỹ thuật chuẩn: [OpenAPI 3.1](docs/openapi.yaml) · [Ma trận nghiệm thu F01–F07 / T01–T06](docs/acceptance-matrix.md) · [Từ điển dữ liệu](docs/data-dictionary.md) · [Ma trận thực thể & quy ước migration/lint](docs/entity-feature-matrix.md) · [Báo cáo chồng lấn ranh giới](docs/boundary-overlap-audit.md).

## Ngôn ngữ giao diện

Giao diện có hai ngôn ngữ, tiếng Việt và tiếng Anh. Nút chuyển **VI / EN** nằm ở góc dưới bên phải của mọi trang.

- Trang công khai mặc định tiếng Anh cho nhà đầu tư nước ngoài.
- Khu vực nội bộ `/internal/...` mặc định tiếng Việt cho steward và reviewer.
- Lựa chọn được lưu trong cookie `ecom_locale` trong một năm. Thêm `?lang=vi` hoặc `?lang=en` vào URL để đặt ngôn ngữ và lưu lựa chọn đó.
- Thẻ `<html lang>` đi theo ngôn ngữ đang dùng; số và ngày định dạng theo `vi-VN` hoặc `en-US`.

Nhãn chỉ tiêu, đơn vị, trạng thái chất lượng, cấp địa giới và lý do so sánh được dịch ở lớp hiển thị. Định nghĩa, phương pháp, giới hạn và lý do thiếu dữ liệu vẫn giữ nguyên như nguồn công bố, không dịch. Thông báo lỗi trả về từ API cũng giữ tiếng Anh.

Chuỗi giao diện nằm trong [`src/lib/i18n/en.ts`](src/lib/i18n/en.ts) và [`src/lib/i18n/vi.ts`](src/lib/i18n/vi.ts). Bản tiếng Việt được khai báo kiểu `Record<MessageKey, string>` nên thiếu một khoá là lỗi biên dịch. [`tests/features/i18n.test.ts`](tests/features/i18n.test.ts) kiểm tra thêm các phần giữ chỗ `{...}` phải khớp giữa hai ngôn ngữ.

## Thử các luồng trên giao diện

### 1. Tìm, so sánh và export địa bàn

1. Vào trang chính và tìm **Hà Nội** theo tên hoặc mã hành chính.
2. Mở hồ sơ. Kiểm tra chỉ tiêu, kỳ số liệu, tên nguồn và mục **Source and limitations**.
3. Dùng bộ điều khiển lớp bản đồ để xem chỉ tiêu cấp tỉnh và lớp sân bay.
4. Lưu thêm một hoặc hai địa bàn cùng cấp. Bấm **Compare** trong danh sách **Saved places**.
5. Chọn **Download JSON** hoặc **Download CSV** để tải dữ liệu kèm nguồn. So sánh cần 2–3 địa bàn tương thích về địa giới, kỳ, đơn vị và phạm vi chỉ tiêu. Giá trị thiếu được biểu diễn bằng `null` hoặc **Unavailable**.

Danh sách địa bàn, ranh giới và chỉ tiêu là dữ liệu bối cảnh. Đọc kỳ, nguồn và phương pháp trước khi diễn giải. [Nguồn hành chính và ranh giới](docs/sprint1-data-foundation.md) · [Chỉ tiêu Wave 2](docs/sprint3-wave2.md)

### Khảo sát ngành bán lẻ

Chọn **Explore a retail scenario** trên trang chính, chọn ngành **Retail**, rồi nhập ngưỡng doanh thu bán lẻ hoặc lực lượng lao động nếu cần. Chọn hai hoặc ba tỉnh để xem số liệu, kỳ, chất lượng và nguồn. Phần đánh giá cho nhập trọng số tổng 100% và nêu các điều kiện còn thiếu. Dữ liệu hiện tại chưa có khảo sát nhu cầu khách hàng theo phân khúc và địa bàn, đồng thời các chỉ tiêu hiện tại chưa được phê duyệt cho scoring, nên hệ thống chưa trả điểm. Checklist giúp theo dõi các việc cần xác minh với cơ quan có thẩm quyền và chuyên gia.

Với từng chỉ tiêu và cấp địa bàn, hồ sơ chọn một tập số liệu công bố theo kỳ kết thúc mới nhất, tiếp theo là độ phủ và thời điểm công bố. Bản đồ mặc định dùng cùng thứ tự. Nếu tập được chọn thiếu một địa bàn, địa bàn đó hiển thị thiếu dữ liệu. Bộ điều khiển bản đồ cho phép chọn rõ một nguồn khác và xem chất lượng, kỳ, phương pháp và giấy phép của giá trị tại tỉnh đã chọn. So sánh giữ các chỉ tiêu tương thích và giải thích lý do từng chỉ tiêu còn lại không so sánh được.

### 2. Gửi inquiry và xử lý bằng quyền steward

1. Trong hồ sơ địa bàn, chọn **Request investment support**. Từ shortlist, chọn **Request support for these places**.
2. Nhập email và nội dung. Khi thử local, dùng dữ liệu giả như `pilot@example.test` và `Tôi muốn tìm hiểu hạ tầng logistics tại Hà Nội.`
3. Mở **inquiry privacy notice**, đọc thông báo và chọn ô đồng ý. Bấm **Send inquiry** rồi ghi lại mã `INQ-…`.
4. Mở `/internal/inquiries` trên cùng máy chủ. Nhập `RELEASE_STEWARD_TOKEN` lấy từ `.env` vào **Steward token**, rồi bấm **Load inquiries**.
5. Tìm inquiry vừa gửi, mở chi tiết và kiểm tra địa bàn, trạng thái và nhật ký. Dùng bộ lọc để thu hẹp danh sách theo trạng thái, quốc gia, lĩnh vực, ngày hoặc địa bàn.
6. Chọn trạng thái hoặc nhập ghi chú, rồi bấm **Save update**. Khi chọn **Closed**, chọn thêm lý do đóng. Mở nhật ký để đối chiếu thao tác vừa lưu.

### 3. Lưu, tải và so sánh báo cáo

1. Trong dashboard steward, mở tab **Báo cáo**. Chọn ngày **From** và **To** theo giờ Việt Nam. Để trống cả hai ngày để dùng 7 ngày lịch gồm hôm nay.
2. Chọn bộ lọc chung. Nếu lọc theo địa bàn, nhập tên trong ô tìm kiếm, bấm **Find geography** và chọn kết quả.
3. Bấm **Xem trước**. Đối chiếu kỳ, bộ lọc và tổng inquiry. Xem trước lại sau khi đổi điều kiện.
4. Bấm **Lưu báo cáo** để lưu snapshot. Trong **Lịch sử theo kỳ**, mở một kỳ để xem số liệu đã lưu, phiên bản công thức và nhật ký.
5. Bấm **Export stored snapshot** để tải CSV tổng hợp của bản đã lưu. Snapshot lưu tổng và phân nhóm theo địa bàn, trạng thái, lý do đóng và tuần. Giá trị quốc gia, lĩnh vực và mã inquiry dùng để lọc được ẩn trong lịch sử. Phân nhóm quốc gia và lĩnh vực dạng văn bản tự khai chỉ xuất hiện ở báo cáo trực tiếp có quyền steward.
6. Trong chi tiết, chọn **So sánh với báo cáo** và bấm **So sánh**. Bảng hiển thị số liệu của từng kỳ và chênh lệch theo trạng thái. Giao diện chỉ rõ điều kiện khác nhau nếu hai báo cáo dùng bộ lọc, múi giờ hoặc công thức khác.
7. Khi cần sửa báo cáo, chọn **Tạo bản đính chính**, kiểm tra kỳ và bộ lọc, rồi xem trước và lưu. Lịch sử liên kết bản mới với bản được đính chính.

File CSV tải về dùng UTF-8 có BOM để Excel mở được tiếng Việt. Trình đọc CSV tự động cần hỗ trợ dấu BOM ở đầu file.

## Kiểm thử

### Kiểm tra mã, test mặc định và build

~~~sh
bun run lint
bun run test
bun run build
~~~

Chạy `bun run build` trong cùng thư mục dự án. Với một bản đã build và có cấu hình database phù hợp, `bun run start` khởi động Next.js ở chế độ production. Dashboard nội bộ ở chế độ này yêu cầu `ECOM_OPERATORS` như phần cấu hình ở trên; khi chạy thử trên loopback không có reverse proxy đặt `ECOM_TRUSTED_PROXY_TOKEN`, cần bật `ECOM_ALLOW_DIRECT_INGRESS=1` (chỉ dùng cho loopback/CI). Dùng hướng dẫn triển khai trong [release runbook](docs/sprint4-release-runbook.md) khi đưa lên staging hoặc production.

### Test với PostgreSQL thật

Chạy setup trước và giữ PostgreSQL hoạt động. Trong PowerShell, bật nhóm test PostGIS rồi dọn biến của phiên hiện tại.

~~~powershell
$env:RUN_DB_TESTS = '1'
bun run test:db
Remove-Item Env:RUN_DB_TESTS
~~~

Trên Bash, dùng `RUN_DB_TESTS=1 bun run test:db`. Các bài test inquiry và phát hành có thay đổi trạng thái dữ liệu dùng database thử nghiệm riêng và cờ opt-in. Xem [quy trình kiểm thử release](docs/sprint4-release-runbook.md#dataset-release-workflow) và [bài test tích hợp inquiry](tests/db/inquiry.integration.test.ts) để biết tên database được chấp nhận.

### Test trình duyệt

1. Dùng một bản chạy local với database thử nghiệm, vì các kịch bản inquiry tạo và cập nhật bản ghi thử.
2. Trong terminal thứ nhất, chạy web và đợi `/api/health` có `publicationStatus=published`.
3. Trong terminal thứ hai, cài Chromium cho Playwright và chạy suite.

   ~~~sh
   bunx playwright install chromium
   bun run test:e2e
   ~~~

4. Nếu web dùng cổng khác, đặt `E2E_BASE_URL` trỏ tới URL đang chạy. Để bật test có xác thực, dùng token từ chính bản thử nghiệm. Ví dụ trong PowerShell:

   ~~~powershell
   $env:E2E_BASE_URL = 'http://127.0.0.1:3000'
   $env:E2E_RELEASE_STEWARD_TOKEN = bun --env-file=.env -e 'process.stdout.write(process.env.RELEASE_STEWARD_TOKEN ?? "")'
   $env:E2E_RELEASE_REVIEWER_TOKEN = bun --env-file=.env -e 'process.stdout.write(process.env.RELEASE_REVIEWER_TOKEN ?? "")'
   bun run test:e2e
   Remove-Item Env:E2E_BASE_URL,Env:E2E_RELEASE_STEWARD_TOKEN,Env:E2E_RELEASE_REVIEWER_TOKEN
   ~~~

Các bài test có xác thực được bỏ qua khi chưa cấu hình token tương ứng. Có thể đặt `E2E_CHROMIUM_PATH` để dùng Chromium tương thích đã cài. Khi phối hợp với người tham gia pilot, dùng [biểu mẫu UAT](docs/sprint4-pilot-uat.md).

### Kiểm thử bắt buộc trước khi phát hành

Workflow **Release checks** chạy khi mở PR và khi cập nhật `main`. Nó tạo PostGIS riêng, áp dụng migration từ đầu, nạp dữ liệu công bố, kiểm thử steward và reviewer, build bản production rồi chạy Chromium. Các lệnh bên dưới trả lỗi nếu nhóm test bắt buộc bị bỏ qua.

| Lệnh | Môi trường thử cần chuẩn bị |
| --- | --- |
| `bun run test:release db` | Database tại `127.0.0.1` có tên bắt đầu bằng `ecom_inquiry_it_`. Chạy migration, import foundation và Wave 2 với `--publish`, dùng hai token thử riêng theo vai trò. |
| `bun run test:release workflow` | Database mới tại `127.0.0.1` có tên bắt đầu bằng `ecom_sprint4_workflow_`. Chạy migration rồi `bun run db:import --stage` với `REQUIRE_RELEASE_APPROVAL=1`. |
| `bun run test:release e2e` | Chromium và bản production local dùng database thử. Đặt `E2E_BASE_URL` tại `http://127.0.0.1:<port>`, hai biến `E2E_RELEASE_…_TOKEN` và cấu hình privacy thử tương ứng của server. |

Sau khi job **Required release checks** xuất hiện trên GitHub, repo admin có thể đặt nó làm check bắt buộc trước khi merge vào `main`. [Workflow kiểm thử](.github/workflows/release-checks.yml) · [GitHub branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)

## Migration và phát hành dữ liệu

### Cập nhật schema local

Nguồn sự thật cho schema runtime là [`src/db/schema.ts`](src/db/schema.ts) và thư mục [`drizzle/`](drizzle/) (không chạy trực tiếp SQL tham chiếu trong `database/market-entry/` lên môi trường runtime; xem đối chiếu chi tiết tại [docs/entity-feature-matrix.md](docs/entity-feature-matrix.md)).

Chạy các migration đã có sau khi pull thay đổi schema.

~~~sh
bun run db:migrate
bun run db:check
~~~

Khi phát triển một thay đổi schema mới, cập nhật [`src/db/schema.ts`](src/db/schema.ts), tạo migration bằng `bun run db:generate --name <ten-thay-doi>` (hoặc `bun --bun drizzle-kit generate --custom --name <ten>` cho DDL PostgreSQL đặc thù như extension/GIN index), rồi kiểm tra bằng `bun --bun drizzle-kit check` trước khi áp dụng. Commit SQL và metadata migration cùng thay đổi schema.

### Giới hạn đã biết (Known Limitations)

- Bộ ranh giới 34 tỉnh hiện tại còn 57 cặp tỉnh chồng lấn nhỏ (~8,92 km²), đã kiểm toán và ghi nhận trong [docs/boundary-overlap-audit.md](docs/boundary-overlap-audit.md) để chờ chủ nguồn rà soát.
- Phân hệ khảo sát nhu cầu khách hàng (`survey_studies` / `survey_aggregates`) đã sẵn sàng ở DB, API và UI nhưng chưa nạp khảo sát thực địa thật nên màn hình `/decision` hiển thị rõ trạng thái chưa có bằng chứng và từ chối chấm điểm chính thức.
- Checklist pháp lý theo ngành chỉ mang tính chất tham khảo chuẩn bị hồ sơ, không thay thế tư vấn pháp lý hoặc quyết định chấp thuận của cơ quan có thẩm quyền.

### Validate, stage và duyệt theo vai trò

1. Chạy `bun run db:import --validate` hoặc `bun run db:import:wave2 --validate` tương ứng với manifest. Có thể truyền đường dẫn manifest sau cờ.
2. Sau khi kiểm tra, dùng `--stage` với lệnh import tương ứng.
3. Reviewer mở `/internal/releases` bằng reviewer token, đối chiếu nguồn, checksum, kỳ và độ phủ rồi duyệt batch.
4. Steward mở cùng trang bằng steward token, kiểm tra batch đã duyệt và công bố. Công bố foundation trước khi stage Wave 2. Kiểm tra lại `/api/health`, bản đồ, hồ sơ và export sau khi công bố.

`--publish` trực tiếp phục vụ khởi tạo local và được script setup gọi tự động. Dùng [runbook phát hành](docs/sprint4-release-runbook.md) cho backup, restore, rollback và giám sát trên môi trường dùng chung.

### Chạy bằng Docker Production Image & Cold-Start Smoke

`Dockerfile` dùng multi-stage build (`oven/bun:1.4.5`, stage `prod-dependencies` tách riêng production dependencies cho `maintenance`, `next build` với `output: "standalone"`), chạy bằng user không có quyền root (`USER bun`), có sẵn `HEALTHCHECK` kiểm tra `/api/health` và không đóng gói file `.env` hay token vào image. Với Compose chạy loopback không có reverse proxy đặt `ECOM_TRUSTED_PROXY_TOKEN`, hãy đặt `ECOM_ALLOW_DIRECT_INGRESS=1` trong `.env`.

```bash
# 1. Khởi chạy PostGIS + ứng dụng production container (không dùng next dev)
docker compose --profile app up -d --build

# 2. Áp dụng migration & kiểm tra dữ liệu
bun run db:migrate
bun run db:check

# 3. Cold-start smoke check trên container đang chạy
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS -I http://127.0.0.1:3000/
docker compose --profile app ps
```

Để phát triển với hot-reload trong Docker, tách riêng profile `dev`: `docker compose --profile dev up`.

### Retention

`bun run db:cleanup:inquiries` và `bun run db:cleanup:reports` gọi cùng một CLI kiểm tra inquiry và snapshot đến hạn. Chạy trước ở chế độ xem số lượng. Khi người phụ trách dữ liệu đã duyệt và có bản sao lưu, truyền `--apply`. Lệnh xóa dữ liệu nhận diện và nội dung ghi chú đã hết hạn, giữ sự kiện xử lý và phiên bản thông báo đã xác nhận. Snapshot tổng hợp hết hạn được dọn cùng nhật ký. Bản gốc của đính chính còn hiệu lực được giữ đến khi cả chuỗi hết hạn.

Để bật tác vụ tự động cho database Docker local sau khi đã chạy migration, dùng `docker compose --profile retention up -d --build retention`. Tác vụ chạy ngay khi khởi động, lặp lại sau 24 giờ và thử lại sau một giờ khi gặp lỗi. Kiểm tra `docker compose --profile retention ps` và `bun run db:retention:monitor`. Lệnh monitor trả mã `0` khi lần `succeeded` gần nhất kết thúc trong vòng 30 giờ, không có lần `failed` nào bắt đầu sau đó, và không có lần `running` nào bắt đầu quá 15 phút trước (một job đang `running` hợp lệ dưới 15 phút vẫn healthy); ngược lại trả mã lỗi. Kết quả và số bản ghi đã xử lý được ghi vào bảng `market_entry.inquiry_retention_runs`. Khi triển khai trên môi trường khác, chạy cùng scheduler như một dịch vụ riêng và giám sát mã thoát của lệnh monitor.

Báo cáo mới dùng công thức `inquiry-funnel-v4`. Tỷ lệ và thời gian liên hệ hoặc đủ điều kiện dựa trên lần đầu xuất hiện sự kiện chuyển sang trạng thái tương ứng. Tuần được tính theo lịch Việt Nam. Snapshot đã lưu giữ phiên bản và số liệu tại thời điểm tạo, các bản dùng công thức khác nhau được đánh dấu không tương thích khi so sánh.

## Xử lý lỗi thường gặp

| Triệu chứng | Cách xử lý |
| --- | --- |
| PowerShell báo `bun` không tồn tại | Mở terminal mới sau khi cài. Nếu Bun cài ở thư mục mặc định trên Windows, chạy `$env:Path = "$env:USERPROFILE\.bun\bin;$env:Path"` để bổ sung PATH cho phiên hiện tại, rồi kiểm tra `bun --version`. |
| Docker báo lỗi kết nối daemon hoặc `dockerDesktopLinuxEngine` | Mở Docker Desktop, chờ Engine chạy ở chế độ Linux và kiểm tra `docker info --format "{{.OSType}}"`. |
| Chạy lệnh nhưng không tìm thấy Compose hoặc `.env` | Chạy lệnh từ thư mục `ECOM` chứa `docker-compose.yml` và `package.json`. Lần đầu, dùng `bun run setup:local` để sinh `.env`. |
| PostgreSQL báo `28P01` hoặc `password authentication failed` | Dùng mật khẩu đã khởi tạo role trong volume hiện có cho cả `POSTGRES_PASSWORD` và `DATABASE_URL`. Giữ volume. Nếu có ký tự đặc biệt, mã hóa phần mật khẩu trong URL. |
| Bun dùng nhầm database khi chạy lệnh thủ công | Kiểm tra đích kết nối trong `.env` tại máy. Một biến `DATABASE_URL` cũ trong terminal có thể được ưu tiên. Trong PowerShell, có thể xóa biến phiên hiện tại bằng `Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue` rồi thử lại từ thư mục gốc. |
| Cổng PostgreSQL hoặc tên container đã được dùng | Nếu đó là PostGIS của dự án hiện tại, dùng lại đúng Compose project và `.env`. Với checkout riêng, dùng một bộ tên project, tên container và cổng riêng. |
| Bản đồ hoặc kết quả tìm kiếm trống | Kiểm tra `/api/health` và `bun run db:check`. Catalog local cần có `publicationStatus=published`. Nếu thiếu nguồn dữ liệu từ lần setup đầu, chạy lại `bun run setup:local`. |
| Dashboard trả `401` | Lấy token đúng vai trò từ `.env` của bản app đang chạy. Với Playwright, kiểm tra token E2E và `E2E_BASE_URL` thuộc cùng bản chạy. |
| Không mở được cổng 3000 | Đọc dòng **Local** trong terminal Next.js để biết cổng thực tế. Dùng cùng cổng khi mở dashboard, health và chạy E2E. |

## Cấu trúc dự án

| Đường dẫn | Nội dung |
| --- | --- |
| [`src/app/`](src/app/) | Trang Next.js và Route Handlers cho API. |
| [`src/features/`](src/features/) | Bản đồ, tìm kiếm, hồ sơ, shortlist, inquiry, báo cáo và quản trị release. |
| [`src/lib/i18n/`](src/lib/i18n/) | Từ điển tiếng Việt/tiếng Anh, chọn ngôn ngữ theo cookie và định dạng số, ngày. |
| [`src/db/`](src/db/) và [`drizzle/`](drizzle/) | Schema Drizzle, kết nối PostgreSQL, migration và CLI import. |
| [`data/sprint1/`](data/sprint1/) và [`data/sprint3/`](data/sprint3/) | Manifest và dữ liệu nguồn đi kèm cho setup local. |
| [`database/market-entry/`](database/market-entry/) | SQL tham chiếu, sơ đồ schema và tài liệu database. |
| [`tests/`](tests/) | Unit, API, integration và E2E. |
| [`docs/`](docs/) | Nguồn dữ liệu, runbook và checklist pilot. |
