# Bàn giao: rà soát bảo mật, chất lượng và hiệu năng ECOM

Tài liệu này dành cho người hoặc agent tiếp tục đánh giá dự án sau commit `fc367d6`. Mục tiêu là đối chiếu báo cáo issues ban đầu với mã hiện tại, kiểm thử bảo mật có kiểm soát, sau đó đánh giá kiến trúc, chất lượng mã và hiệu năng. Không mặc định rằng mọi issue đã được sửa hoặc mọi chức năng đã được nghiệm thu.

## 1. Tài liệu đầu vào và chuẩn bị

- Mã nguồn: `D:\TMDT`; repository: https://github.com/LTD07072006/ECOM.
- File issues gốc trên máy hiện tại: `D:\TMDT\.project-inputs\4tzhxjx.zip`. File gốc được cung cấp từ `D:\ITK_SNAP\data\4tzhxjx.zip`.
- `.project-inputs` bị Git bỏ qua, nên người clone repository **không nhận được ZIP**. Đề nghị chủ dự án cung cấp ZIP qua kênh phù hợp; không tự đưa ZIP lên repository khi chưa kiểm tra nội dung và quyền chia sẻ.
- Đọc `README.md`, `docs/acceptance-matrix.md`, `docs/sprint4-release-runbook.md`, `docs/openapi.yaml` và `.github/workflows/release-checks.yml` để nắm cách chạy, dữ liệu và các giới hạn đã ghi nhận.
- Trước khi sửa: xem `git status`, nhánh hiện tại và lịch sử liên quan; giữ lại các thay đổi chưa commit của người khác. Thiết lập database và token riêng cho môi trường kiểm thử theo README. Không ghi mật khẩu, token, dữ liệu cá nhân hay nội dung `.env` vào báo cáo, commit hoặc log.
- Nếu dùng Claude Opus hoặc agent khác, giao toàn bộ nội dung phần 2–5 dưới đây và yêu cầu dẫn chứng bằng đường dẫn file, dòng và kết quả kiểm thử. Người thực hiện cần xác nhận đã đọc ZIP; nếu chưa có ZIP thì đánh dấu phần đối chiếu là **chưa thực hiện**.

## 2. Quét lại toàn bộ issues trong ZIP

1. Liệt kê file trong ZIP, đọc tất cả báo cáo có liên quan và tạo danh sách từng issue; giữ ID gốc nếu báo cáo có ID. Không giả định số lượng hoặc mức độ nghiêm trọng chỉ dựa vào tài liệu bàn giao này.
2. Với từng issue, đối chiếu mã, cấu hình, migration và test hiện tại. Chạy kiểm thử tái hiện khi có thể, sử dụng dữ liệu giả. Kiểm tra cả các sửa đổi sau báo cáo ban đầu để tìm hồi quy.
3. Lập bảng gồm: ID, nội dung, mức độ, trạng thái **đã xác minh sửa / còn lỗi / sửa một phần / chưa xác minh / không còn áp dụng**, bằng chứng, cách tái hiện, ảnh hưởng, đề xuất và test cần bổ sung. Ghi rõ phiên bản commit và môi trường kiểm tra.
4. Phân biệt kết quả đọc mã, kết quả kiểm thử và giả định. Nếu không tái hiện được, ghi điều kiện còn thiếu thay vì đánh dấu đã sửa.

## 3. Kiểm thử tấn công và an toàn

Chỉ kiểm thử trên môi trường local hoặc staging được chủ sở hữu cho phép, dùng database riêng và tài khoản kiểm thử. Không quét hoặc gây tải lên dịch vụ bên thứ ba, production, hạ tầng GitHub hoặc hệ thống nguồn dữ liệu. Tránh truy cập hoặc xuất dữ liệu thật. Sao lưu và kiểm tra tác động trước migration hoặc tác vụ retention: migration `0007_inquiry_safety.sql` thay đổi dữ liệu snapshot lịch sử.

Kiểm tra và ghi bằng chứng tối thiểu:

- Xác thực và phân quyền: public inquiry, operator được định danh, reviewer/steward, token thiếu/sai/hết quyền, shared token trên production, các API nội bộ và thao tác release.
- Kiểm tra truy cập trực tiếp và sai đối tượng đối với inquiry, note, audit, snapshot, export, compare và các mã tham chiếu; xác nhận dữ liệu nội bộ không xuất hiện trong phản hồi public, CSV, URL hoặc log.
- Input và injection: JSON sai cấu trúc, kích thước lớn hoặc streaming, Unicode, SQL injection, XSS, CSV formula injection, URL nguồn không an toàn, dữ liệu thiếu và giá trị biên. Kiểm tra headers, cache và CORS theo cấu hình triển khai.
- Chống spam và rate limit: honeypot, email, quota, `429`/`Retry-After`, giả mạo proxy header trong cấu hình proxy tin cậy, giới hạn và cơ chế phục hồi; dùng tải nhỏ có kiểm soát.
- Bảo vệ dữ liệu: đồng ý xử lý, thời gian lưu, xóa/ẩn danh, ghi audit theo operator, snapshot sau khi inquiry thay đổi và sau retention. Chỉ chạy tác vụ có ghi/xóa trên database kiểm thử độc lập.
- Quét dependencies, Docker image, cấu hình triển khai, secret trong thay đổi chuẩn bị công bố và lịch sử nếu có quyền và công cụ phù hợp. Không ghi giá trị secret vào báo cáo; nếu nghi lộ secret, báo chủ sở hữu qua kênh an toàn để xử lý.
- Ghi lại payload đã vô hiệu hóa thông tin nhạy cảm, điều kiện, kết quả mong đợi/thực tế và rủi ro. Không khẳng định hệ thống an toàn tuyệt đối chỉ vì không tìm thấy lỗi.

## 4. Kiến trúc, code và hiệu năng

Đánh giá dựa trên bằng chứng, không refactor hàng loạt chỉ để thay đổi hình thức:

- **Kiến trúc:** ranh giới UI/API/domain/repository, quyền truy cập DB, tính nhất quán cách chọn bản phát hành, transaction, xử lý lỗi và phụ thuộc giữa các module. Kiểm tra tính nhất quán dữ liệu khi so sánh hoặc tổng hợp vùng nhiều tỉnh.
- **Khả năng bảo trì:** component quá lớn, logic trùng lặp, kiểu dữ liệu và validation, test mong manh, cấu trúc i18n, accessibility, tài liệu, migration và các phụ thuộc. Xác định phần nên tách kèm lợi ích và rủi ro hồi quy.
- **Hiệu năng:** đo trước khi tối ưu: thời gian tải trang và bản đồ, payload ranh giới, profile/search/compare/export, vùng nhiều tỉnh, truy vấn SQL/PostGIS, số request, độ trễ p50/p95 và tải đồng thời phù hợp. Ghi môi trường, cỡ dữ liệu, số lượt đo và so sánh trước/sau; xem kế hoạch truy vấn khi cần. Không lấy kết quả máy local làm cam kết production.
- **Chất lượng tự động:** `bun run lint` kiểm tra TypeScript toàn dự án nhưng Biome chỉ áp dụng cho nhóm file được chỉ định; `bun run format:check` cũng chỉ kiểm tra một nhóm nhỏ. Đánh giá mở rộng dần, chỉ rõ lỗi/cảnh báo tồn tại và tác động CI.
- **Vận hành:** image production, quản lý operator/secret, backup/restore, log và cảnh báo, health check, retention scheduler, quota, rollback và quy trình triển khai. Xác minh cấu hình thật của môi trường thay vì coi tài liệu là bằng chứng đã triển khai.

Chạy các lệnh phù hợp trong README và CI: `bun run lint`, `bun run format:check`, `bun run test`, `bun run build`, `bun run test:e2e` và các bài DB/release/pilot khi đã chuẩn bị môi trường cô lập. Kiểm tra điều kiện và biến môi trường của từng lệnh; không giả định tất cả test DB tự động chạy khi thiếu cấu hình. Ghi rõ test pass, fail hoặc bị bỏ qua và nguyên nhân.

## 5. Những điểm đã biết cần xác minh lại

- Ma trận nghiệm thu ghi bộ ranh giới hiện dùng có 57 cặp tỉnh chồng lấn, tổng khoảng 8,92 km²; cần chủ nguồn đánh giá. Xác minh với dữ liệu và phiên bản hiện tại trước khi kết luận.
- T04 chưa có nghiên cứu nhu cầu khách hàng thật được tích hợp. T05 đã kiểm thử công thức với dữ liệu thử nhưng dữ liệu bán lẻ hiện tại chưa đủ điều kiện chấm điểm. Xem `docs/acceptance-matrix.md`.
- Giao diện vùng tự chọn hiện dùng cấp tỉnh, chưa có ranh giới hoặc chỉ số cấp quận. Lực lượng lao động không đồng nghĩa số người có việc làm. Cần kiểm thử chọn trực tiếp trên bản đồ, bàn phím, màn hình nhỏ, trường hợp thiếu dữ liệu, khác nguồn/kỳ và việc cộng tổng.
- Hướng dẫn Invest Vietnam là liên kết tham khảo; ngày cập nhật và hiệu lực quy định phải được xác minh với cơ quan có thẩm quyền. Chưa có dataset khu công nghiệp địa phương được xác minh trong hồ sơ.
- Kiểm thử E2E luồng bán lẻ đã từng gặp lỗi timing trên môi trường xem thử; cần chạy lại và điều tra, không mặc định đã ổn. Các kết quả kiểm thử cũ phản ánh đúng môi trường và phiên bản lúc chạy.
- Thu thập log và cảnh báo ngoài hệ thống cần được xác nhận ở môi trường triển khai; health check và structured log trong code không chứng minh cảnh báo đang hoạt động.

## 6. Kết quả bàn giao mong đợi

Giao một báo cáo có bảng issues gốc và phát hiện mới, xếp ưu tiên theo ảnh hưởng và khả năng khai thác. Mỗi phát hiện cần có bằng chứng, bước tái hiện an toàn, phạm vi ảnh hưởng, đề xuất sửa và bài kiểm thử xác nhận. Kèm bảng kết quả test, những gì chưa thể kiểm tra, nguyên nhân, và kế hoạch cải tiến kiến trúc/hiệu năng chia theo mức ưu tiên. Nếu sửa code, trình bày diff, kết quả trước/sau và các rủi ro còn lại; không tự tuyên bố nghiệm thu thay chủ dự án.
