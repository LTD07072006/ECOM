# Đặc tả xây dựng hệ thống

## Vietnam Market Intelligence & Market Entry Decision Support System

> Phiên bản: 1.0 — Build Specification / Business & Product Requirements
>
> Nguồn yêu cầu: tài liệu nghiên cứu Market Entry ban đầu.
>
> Phạm vi tài liệu: mô tả toàn bộ những gì cần có để phân tích, thiết kế, xây dựng, nạp dữ liệu, kiểm thử và nghiệm thu hệ thống.

---

## 0. Cách sử dụng tài liệu này

Tài liệu này là bản đặc tả build cho hệ thống **Vietnam Market Intelligence & Market Entry Decision Support System**. Nó chuyển nội dung nghiên cứu trong tài liệu gốc thành các yêu cầu có thể giao cho Product, Business Analyst, UX/UI, Data Engineer, Backend, Frontend, QA, Data Steward và người nghiệm thu.

Tài liệu trả lời các câu hỏi:

- Hệ thống phục vụ ai?
- Người dùng cần thực hiện những nghiệp vụ nào?
- Hệ thống phải có những màn hình, chức năng và quy tắc nào?
- Cần thu thập những nhóm số liệu nào?
- Mỗi số liệu phải lưu nguồn, kỳ, đơn vị, địa giới và trạng thái ra sao?
- Khi nào hệ thống được phép so sánh hoặc xếp hạng?
- Khi nào hệ thống bắt buộc phải từ chối kết luận?
- Cần thiết kế cơ sở dữ liệu và API như thế nào?
- Cần kiểm thử và nghiệm thu ra sao?
- Bản B-Lite cần làm gì trước; những gì để giai đoạn sau?

### 0.1. Nguyên tắc đọc trạng thái yêu cầu

Mỗi yêu cầu được hiểu theo cấp độ sau:

- **MUST**: bắt buộc để được coi là đạt phạm vi cốt lõi.
- **SHOULD**: nên có trong bản thương mại đầu tiên, nhưng có thể lùi sau B-Lite.
- **COULD**: tùy chọn, chỉ làm khi còn thời gian hoặc có nhu cầu thật.
- **MUST NOT**: tuyệt đối không được triển khai theo cách đó vì tạo ra kết luận sai hoặc rủi ro pháp lý.

### 0.2. Tuyên bố phạm vi quan trọng

Hệ thống là công cụ **nghiên cứu thị trường, quản lý thông tin marketing và hỗ trợ sàng lọc quyết định gia nhập thị trường**. Hệ thống không phải là:

- hệ thống bán hàng;
- sàn thương mại điện tử;
- hệ thống thanh toán;
- hệ thống quản lý cửa hàng;
- hệ thống tự động phê duyệt pháp lý;
- công cụ đảm bảo lợi nhuận hoặc ROI;
- công cụ tự động kết luận nhu cầu chỉ từ dân số, mật độ dân số hoặc số lượng POI;
- mô hình dự báo AI/ML trong bản B-Lite.

---

# 1. Tóm tắt sản phẩm

## 1.0. Điều chỉnh định hướng sản phẩm theo yêu cầu mới

Phiên bản này xác định rõ hệ thống không chỉ là công cụ nghiên cứu nội bộ, mà là một **Investor Attraction Platform** — nền tảng bản đồ số giúp nhà đầu tư nước ngoài nhìn thấy cơ hội, hiểu điều kiện đầu tư và chủ động bắt đầu quy trình tìm hiểu Việt Nam.

### Ba yêu cầu nền tảng

1. **Based on Digital Maps**: bản đồ số là giao diện chính, không phải một thành phần phụ. Mọi số liệu quan trọng phải có thể gắn với quốc gia, tỉnh/thành, xã/phường hoặc địa bàn phù hợp.
2. **Data Layers**: xây hệ thống lớp dữ liệu từ cấp quốc gia xuống tỉnh/thành và xã/phường, ưu tiên các lớp có thể triển khai sớm và có nguồn rõ ràng.
3. **Core Functions**: bắt buộc có visualization, search và decision support.

### Mục tiêu kinh doanh mới

Mục tiêu của sản phẩm là khiến nhà đầu tư nước ngoài:

- hiểu nhanh Việt Nam là một thị trường có quy mô, động lực tăng trưởng và nhiều địa bàn/cơ hội khác nhau;
- tìm thấy ngành, tỉnh/thành hoặc khu vực phù hợp với chiến lược của họ;
- nhìn thấy bằng chứng về quy mô thị trường, hạ tầng, nguồn cung, nhân lực, khách hàng và môi trường đầu tư;
- hiểu rõ điều kiện, thủ tục và các bước tiếp theo;
- tin tưởng dữ liệu vì mọi con số đều có nguồn, kỳ đo, phiên bản và cảnh báo giới hạn;
- thực hiện một hành động chuyển đổi: đăng ký, yêu cầu tư vấn, tải investor profile, gửi investment inquiry hoặc kết nối cơ quan xúc tiến đầu tư.

### Nguyên tắc thu hút đầu tư

Hệ thống phải **thuyết phục bằng dữ liệu, hình ảnh và hành trình hành động**, không thuyết phục bằng các claim không thể kiểm chứng. Không được dùng “đảm bảo lợi nhuận”, “địa phương tốt nhất” hoặc “chắc chắn thành công”. Thay vào đó, giao diện cần làm nổi bật:

- quy mô và sức hấp dẫn ở cấp quốc gia;
- lợi thế khác biệt theo từng tỉnh/thành;
- cơ hội theo ngành;
- mức độ sẵn sàng của hạ tầng và nguồn nhân lực;
- các dự án/địa điểm/cụm ngành có thể xem xét;
- yêu cầu pháp lý và rủi ro cần xác minh;
- nút hành động rõ ràng để nhà đầu tư chuyển từ xem thông tin sang liên hệ.

## 1.1. Bài toán cần giải quyết

Nhà đầu tư nước ngoài trước khi vào Việt Nam thường phải tổng hợp thông tin từ nhiều nguồn rời rạc và khó hình dung trên bản đồ:

- dân số và nhân khẩu;
- kinh tế, lao động và bán lẻ;
- doanh nghiệp và ngành;
- đối thủ, nhà cung cấp và điểm bán;
- logistics và khả năng phân phối;
- thương mại điện tử và hành vi số;
- khảo sát nhu cầu khách hàng;
- quy định pháp lý và điều kiện tiếp cận thị trường;
- chất lượng và quyền sử dụng các nguồn dữ liệu.

Thông tin thường khác nhau về tên địa phương, kỳ đo, đơn vị, cấp địa lý, định nghĩa và độ tin cậy. Vì vậy người dùng không chỉ cần một bản đồ, mà cần một môi trường nghiên cứu có thể:

1. tìm đúng dữ liệu;
2. nhìn dữ liệu trên bản đồ;
3. so sánh những địa bàn tương thích;
4. biết giá trị nào có nguồn và giá trị nào chưa được xác minh;
5. phân biệt dữ liệu bối cảnh với bằng chứng nhu cầu;
6. điều chỉnh tiêu chí theo mục tiêu kinh doanh;
7. nhận kết quả có giải thích;
8. biết những giả định và thông tin còn thiếu trước khi ra quyết định;
9. nhìn thấy câu chuyện đầu tư Việt Nam một cách trực quan, hấp dẫn và có thể kiểm chứng;
10. thực hiện được hành động tiếp theo: lưu cơ hội, tải hồ sơ, gửi yêu cầu hoặc đăng ký kết nối đầu tư.

## 1.2. Giá trị sản phẩm

Giá trị cốt lõi của hệ thống không phải chỉ là “có bản đồ Việt Nam”, mà là kết hợp **Investor Attraction + Market Intelligence + Decision Support**:

- **Market Intelligence**: dữ liệu và bằng chứng về thị trường.
- **Marketing Information Management**: quản lý nguồn, định nghĩa, phiên bản, kỳ đo, quyền sử dụng và chất lượng.
- **Digital Map**: thể hiện khác biệt địa lý.
- **Customer Evidence**: quản lý bằng chứng needs/wants theo phân khúc.
- **Decision Support**: giúp sàng lọc có điều kiện và giải thích được.
- **Research Gap**: chỉ ra những gì cần xác minh tiếp.
- **Investor Conversion**: biến sự quan tâm thành hồ sơ, yêu cầu tư vấn và kết nối đầu tư.

## 1.3. Kết quả đầu ra của hệ thống

Một lần sử dụng hệ thống phải tạo được một hoặc nhiều đầu ra:

1. Hồ sơ thị trường của một địa bàn.
2. Bảng so sánh 2–3 hoặc nhiều địa bàn.
3. Bản đồ lớp dữ liệu theo ngành, kỳ và chỉ tiêu.
4. Hồ sơ bằng chứng khách hàng theo phân khúc.
5. Kịch bản đánh giá đa tiêu chí.
6. Bảng điểm tham khảo có giải thích.
7. Danh sách dữ liệu thiếu và giả định cần kiểm chứng.
8. Checklist điều kiện pháp lý cần rà soát.
9. Báo cáo xuất ra PDF/Excel/CSV/JSON.
10. Nhật ký nguồn dữ liệu có thể truy vết.
11. Investor profile theo quốc gia, ngành hoặc tỉnh/thành.
12. Investment opportunity card và investment inquiry gửi tới đầu mối phụ trách.
13. Lead/inquiry dashboard cho cơ quan xúc tiến đầu tư hoặc đơn vị vận hành.

---

# 2. Mục tiêu, chỉ số thành công và giới hạn

## 2.0. Mục tiêu thu hút nhà đầu tư nước ngoài

### Investor funnel

Hệ thống phải thiết kế theo phễu chuyển đổi sau:

```text
Discover Vietnam
    ↓
Explore data layers on map
    ↓
Compare provinces/wards/communes
    ↓
Find sector/opportunity
    ↓
Check investment readiness and legal conditions
    ↓
Save shortlist / download investor profile
    ↓
Submit investment inquiry
    ↓
Connect with investment promotion contact
```

Mỗi bước phải có dữ liệu và CTA tương ứng. Nếu chỉ có bản đồ mà không có hành động tiếp theo, hệ thống mới chỉ là data viewer, chưa phải nền tảng thu hút đầu tư.

### Nhóm thông điệp cần truyền tải

Hệ thống nên tổ chức nội dung theo các câu hỏi mà nhà đầu tư nước ngoài quan tâm:

1. Việt Nam có quy mô và vị trí thị trường như thế nào?
2. Những ngành nào đang có cơ hội?
3. Tỉnh/thành nào phù hợp với ngành đó?
4. Địa phương có dân số, nhân lực, hạ tầng và hệ sinh thái doanh nghiệp ra sao?
5. Chi phí, rào cản và điều kiện gia nhập cần biết là gì?
6. Có những khu công nghiệp, cụm ngành, dự án hoặc địa điểm nào cần xem xét?
7. Tôi phải liên hệ với ai để bắt đầu?

### Chỉ số thành công ở góc độ thu hút đầu tư

Ngoài tính đúng của dữ liệu, cần đo:

- số lượt xem trang Vietnam Overview;
- số lượt xem từng tỉnh/thành;
- số lượt xem từng sector/opportunity;
- số lượt dùng bản đồ và lớp dữ liệu;
- số lượt thêm địa bàn vào shortlist;
- số lượt tải investor profile;
- số lượt xem legal/readiness checklist;
- số investment inquiry gửi thành công;
- tỷ lệ chuyển đổi từ profile view sang inquiry;
- thời gian phản hồi inquiry;
- số inquiry đủ thông tin để chuyển cho đơn vị phụ trách;
- số cuộc kết nối/meeting phát sinh nếu hệ thống có CRM tích hợp.

## 2.1. Mục tiêu nghiệp vụ

### Mục tiêu M01 — Hỗ trợ nghiên cứu toàn quốc

Hệ thống phải cho phép người dùng bắt đầu từ phạm vi toàn Việt Nam, sau đó thu hẹp xuống tỉnh/thành, xã/phường hoặc nhóm địa bàn có cùng điều kiện phân tích.

### Mục tiêu M02 — Chuẩn hóa thông tin marketing

Hệ thống phải lưu được một chỉ tiêu cùng với định nghĩa, đơn vị, kỳ đo, địa giới, nguồn, license, ngày kiểm tra và trạng thái chất lượng.

### Mục tiêu M03 — Không tạo insight giả

Hệ thống không được gọi một proxy là “nhu cầu” nếu chưa có bằng chứng phù hợp. Khi thiếu khảo sát, phải hiển thị rõ “chưa có bằng chứng needs/wants”.

### Mục tiêu M04 — So sánh có điều kiện

Hệ thống chỉ so sánh trực tiếp khi định nghĩa, kỳ, đơn vị, cấp địa lý và phiên bản dữ liệu tương thích.

### Mục tiêu M05 — Decision support minh bạch

Người dùng phải biết tiêu chí, trọng số, dữ liệu đầu vào, công thức, dữ liệu bị loại và lý do của kết quả.

### Mục tiêu M06 — Truy vết được

Từ một giá trị trên bản đồ hoặc báo cáo, người dùng phải truy ngược được đến nguồn và phiên bản dữ liệu đã dùng.

## 2.2. Chỉ số thành công của B-Lite

Bản B-Lite được xem là đạt khi:

- người dùng tạo được một scenario nghiên cứu;
- bản đồ hiển thị được tối thiểu lớp địa giới và 3 nhóm chỉ tiêu;
- tìm được tỉnh và xã/phường theo tên hoặc mã;
- so sánh được tối thiểu 2 địa bàn có dữ liệu tương thích;
- xem được nguồn, kỳ, đơn vị và trạng thái dữ liệu;
- xem được customer evidence hoặc nhãn chưa có bằng chứng;
- tạo được một decision scenario;
- thay đổi trọng số và xem điểm cập nhật;
- hệ thống từ chối tính khi thiếu dữ liệu bắt buộc;
- xuất được market profile hoặc comparison report;
- tất cả kiểm thử T01–T06 ở phần nghiệm thu đều pass.

## 2.3. Những điều không được tuyên bố

Không được tuyên bố rằng hệ thống:

- đã dự báo lợi nhuận;
- đã chứng minh một địa bàn tốt nhất cho mọi ngành;
- đã xác nhận nhu cầu nếu chưa có khảo sát phù hợp;
- đã hoàn tất dữ liệu toàn quốc nếu mới có dữ liệu pilot;
- đã đủ điều kiện pháp lý để đầu tư;
- đã có dữ liệu POI toàn quốc nếu chưa kiểm tra độ phủ;
- đã chứng minh khách hàng sẵn sàng trả tiền;
- đã triển khai đồng bộ tự động nếu thực tế mới nhập file thủ công.

---

# 3. Phạm vi sản phẩm

## 3.1. In scope — bắt buộc

1. Quản lý market entry scenario.
2. Bản đồ Việt Nam theo phiên bản địa giới.
3. Hiển thị các lớp dữ liệu có nguồn.
4. Tìm kiếm tỉnh, xã/phường, mã địa giới và chỉ tiêu.
5. Lọc theo ngành, phân khúc, kỳ, trạng thái dữ liệu.
6. So sánh địa bàn.
7. Quản lý và hiển thị customer evidence.
8. Decision support đa tiêu chí.
9. Quản trị nguồn và chất lượng dữ liệu.
10. Quản lý phiên bản dữ liệu.
11. Checklist pháp lý và điều kiện gia nhập.
12. Xuất hồ sơ, bảng so sánh và danh sách thiếu dữ liệu.
13. Audit log cho các thay đổi quan trọng.
14. Kiểm thử dữ liệu và kiểm thử nghiệp vụ.
15. Trang mở đầu `Invest in Vietnam` hướng tới nhà đầu tư quốc tế.
16. Investor profile theo quốc gia, tỉnh/thành và ngành.
17. Opportunity directory và opportunity detail.
18. Shortlist địa bàn/cơ hội.
19. Investment inquiry/contact form.
20. Lead routing tới đầu mối xúc tiến đầu tư.
21. Nội dung song ngữ Việt-Anh ở các trang public.
22. Analytics phễu thu hút đầu tư.

## 3.2. Out of scope — không làm trong B-Lite

1. Thu tiền hoặc bán hàng.
2. Giỏ hàng và thanh toán.
3. CRM bán hàng.
4. Tự động thu thập dữ liệu vi phạm điều khoản nguồn.
5. Tự động thu thập dữ liệu cá nhân không có căn cứ.
6. Mô hình AI/ML dự báo nhu cầu hoặc doanh thu.
7. Dự báo ROI hoặc thời gian hòa vốn.
8. Tự động tư vấn pháp lý.
9. Tự động kết luận giấy phép đã đủ.
10. Hệ thống GIS chuyên sâu thay thế ArcGIS.
11. Đồng bộ realtime mọi nguồn dữ liệu bên ngoài.
12. Xác nhận thị trường bằng chỉ một chỉ tiêu.
13. CRM đầy đủ thay thế hệ thống quản lý lead chuyên dụng.
14. Tự động cam kết ưu đãi đầu tư nếu chưa có phê duyệt của cơ quan có thẩm quyền.

## 3.3. Roadmap mở rộng

### Giai đoạn 2

- backend và API production;
- phân quyền thật;
- PostgreSQL/PostGIS;
- data pipeline theo lịch;
- quản lý khảo sát sâu hơn;
- nhiều ngành và bộ chỉ tiêu theo ngành;
- bản đồ cấp xã/phường nếu đã có polygon hợp lệ;
- dashboard quản trị dữ liệu;
- import Excel có validation.

### Giai đoạn 3

- tích hợp nguồn dữ liệu được cấp phép;
- scenario collaboration;
- comment và workflow phê duyệt;
- phiên bản báo cáo;
- mô hình forecast có kiểm định;
- API thương mại;
- benchmarking quốc tế;
- financial model riêng cho từng ngành.

---

# 4. Người dùng, vai trò và quyền

## 4.1. Nhóm người dùng

### U01 — Visitor / Người xem demo

Mục đích: xem một phần bản đồ và hiểu sản phẩm.

Quyền:

- xem dữ liệu công khai được đánh dấu public;
- xem bản đồ và mô tả nguồn;
- xem demo scenario;
- không sửa dữ liệu;
- không xem dữ liệu nhạy cảm;
- không xuất báo cáo đầy đủ nếu chưa đăng nhập.

### U02 — Investor / Business User

Mục đích: nghiên cứu ngành, địa bàn và tạo scenario.

Quyền:

- tạo và sửa scenario cá nhân;
- tìm kiếm và lọc dữ liệu;
- so sánh địa bàn;
- điều chỉnh trọng số;
- xem insight đã công bố;
- xuất báo cáo được phép;
- đánh dấu câu hỏi cần nghiên cứu thêm.

### U03 — Analyst / Market Researcher

Mục đích: thực hiện phân tích và quản lý nghiên cứu.

Quyền:

- tạo scenario cho tổ chức;
- nhập aggregate survey;
- tạo segment và question;
- thêm market actor/POI;
- xây bộ tiêu chí;
- ghi chú phương pháp và hạn chế;
- xuất báo cáo phân tích.

### U04 — Data Steward / Data Manager

Mục đích: nạp, chuẩn hóa, kiểm tra và phát hành dữ liệu.

Quyền:

- tạo source registry;
- import dữ liệu;
- mapping mã địa giới;
- kiểm tra đơn vị, kỳ, trùng lặp;
- gắn chất lượng;
- tạo phiên bản;
- đưa dữ liệu về trạng thái draft/review/published/retired.

### U05 — Reviewer / Domain Expert

Mục đích: kiểm tra nội dung và tính hợp lệ.

Quyền:

- review nguồn và chỉ tiêu;
- comment lỗi;
- approve/reject bản ghi;
- xác nhận phương pháp khảo sát;
- review cảnh báo pháp lý.

### U06 — Legal Reviewer

Mục đích: kiểm tra checklist và nguồn pháp lý.

Quyền:

- quản lý văn bản pháp lý;
- gắn ngành/phạm vi áp dụng;
- ghi mức độ cần kiểm tra;
- không được đổi thành “đã đủ điều kiện” nếu không có hồ sơ pháp lý riêng.

### U07 — System Administrator

Mục đích: quản lý cấu hình và an toàn hệ thống.

Quyền:

- quản lý người dùng, tổ chức và role;
- quản lý feature flag;
- xem audit log;
- quản lý cấu hình hệ thống;
- không được sửa trực tiếp giá trị dữ liệu mà bỏ qua workflow review.

## 4.2. Ma trận quyền rút gọn

| Chức năng | Visitor | Investor | Analyst | Data Steward | Reviewer | Admin |
|---|---:|---:|---:|---:|---:|---:|
| Xem bản đồ public | Có | Có | Có | Có | Có | Có |
| Tạo scenario | Không | Có | Có | Có | Có | Có |
| Sửa scenario của người khác | Không | Không | Theo tổ chức | Không mặc định | Không | Có |
| Import dữ liệu | Không | Không | Có thể yêu cầu | Có | Không | Có |
| Duyệt dữ liệu | Không | Không | Không | Không mặc định | Có | Có |
| Sửa source registry | Không | Không | Có thể đề xuất | Có | Review | Có |
| Xuất báo cáo | Demo | Có | Có | Có | Có | Có |
| Xem dữ liệu restricted | Không | Theo quyền | Theo quyền | Có | Có | Có |
| Xem audit log | Không | Không | Hạn chế | Theo phạm vi | Theo phạm vi | Có |

---

# 5. Mô hình nghiệp vụ tổng thể

## 5.1. Các thực thể nghiệp vụ chính

1. **Organization** — tổ chức sử dụng hệ thống.
2. **User** — người dùng.
3. **Market Entry Scenario** — bài toán nghiên cứu cụ thể.
4. **Sector** — ngành hoặc nhóm ngành.
5. **Customer Segment** — phân khúc B2C/B2B.
6. **Geography Version** — phiên bản địa giới.
7. **Geo Unit** — quốc gia/tỉnh/xã/phường/khu vực.
8. **Indicator Definition** — định nghĩa chỉ tiêu.
9. **Observation** — giá trị chỉ tiêu tại địa bàn và kỳ.
10. **Source Registry** — thông tin nguồn.
11. **Dataset Version** — phiên bản bộ dữ liệu.
12. **Survey Study** — nghiên cứu sơ cấp.
13. **Survey Question** — câu hỏi khảo sát.
14. **Survey Aggregate** — kết quả tổng hợp không định danh.
15. **Market Actor / POI** — doanh nghiệp, đối thủ, nhà cung cấp, điểm bán.
16. **Legal Reference** — văn bản pháp lý.
17. **Entry Requirement** — điều kiện cần kiểm tra.
18. **Decision Criterion** — tiêu chí chấm điểm.
19. **Decision Scenario** — cấu hình một lần chấm điểm.
20. **Decision Result** — kết quả tính điểm.
21. **Research Gap** — khoảng trống nghiên cứu.
22. **Export Job** — lần xuất báo cáo.
23. **Audit Event** — nhật ký hành động.
24. **Investor Profile** — hồ sơ tổng quan dành cho nhà đầu tư.
25. **Investment Opportunity** — cơ hội/dự án/địa điểm/ngành được công bố.
26. **Opportunity Sector Tag** — ngành liên quan tới cơ hội.
27. **Investment Incentive** — ưu đãi được công bố kèm nguồn và điều kiện.
28. **Investment Contact** — đầu mối tiếp nhận inquiry.
29. **Investment Inquiry** — yêu cầu quan tâm của nhà đầu tư.
30. **Shortlist** — danh sách địa bàn/cơ hội người dùng lưu.
31. **Conversion Event** — sự kiện trong phễu thu hút đầu tư.

## 5.2. Trạng thái của Market Entry Scenario

```text
DRAFT
  ↓
+RESEARCHING
  ↓
READY_FOR_REVIEW
  ↓
REVIEWED
  ↓
EXPORTED / ARCHIVED
```

Quy tắc:

- scenario mới tạo là `DRAFT`;
- phải có ngành, phân khúc hoặc mục tiêu nghiên cứu mới chuyển sang `RESEARCHING`;
- chỉ được đánh dấu `READY_FOR_REVIEW` khi có ít nhất một nguồn và một bộ tiêu chí hoặc một câu hỏi nghiên cứu;
- `REVIEWED` chỉ dành cho scenario đã được reviewer kiểm tra;
- scenario đã xuất báo cáo vẫn giữ nguyên dữ liệu và cấu hình tại thời điểm xuất.

## 5.3. Trạng thái của dữ liệu

```text
INGESTED → VALIDATING → DRAFT → IN_REVIEW → PUBLISHED → SUPERSEDED
                                                ↘ REJECTED
```

Không xóa cứng dữ liệu đã từng được dùng trong báo cáo. Nếu dữ liệu sai, phải tạo bản sửa hoặc đánh dấu retired/superseded, giữ lịch sử thay đổi.

---

# 6. Các luồng nghiệp vụ chi tiết

## 6.1. Luồng B01 — Tạo bài toán nghiên cứu

### Mục tiêu

Cho phép người dùng xác định mình đang nghiên cứu ngành nào, nhóm khách hàng nào, địa bàn nào và cần hỗ trợ quyết định gì.

### Tác nhân

Investor, Analyst.

### Dữ liệu nhập

- tên scenario;
- ngành;
- nhóm sản phẩm/dịch vụ;
- mô hình B2C/B2B;
- phân khúc khách hàng;
- quốc gia của nhà đầu tư;
- kênh kinh doanh dự kiến;
- địa bàn ban đầu;
- mục tiêu nghiên cứu;
- thời gian dự kiến;
- mức độ ưu tiên;
- câu hỏi cần trả lời.

### Quy trình

1. Người dùng bấm `Create Market Entry Scenario`.
2. Hệ thống hiển thị form bắt buộc.
3. Người dùng chọn ngành hoặc nhập ngành mới ở trạng thái pending.
4. Người dùng chọn B2C, B2B hoặc cả hai.
5. Người dùng chọn địa bàn hoặc để toàn quốc.
6. Người dùng nhập 1–5 câu hỏi quyết định.
7. Hệ thống kiểm tra dữ liệu bắt buộc.
8. Hệ thống tạo scenario ở trạng thái `DRAFT`.
9. Hệ thống ghi audit event.

### Quy tắc

- phải có tên scenario;
- phải có mục tiêu nghiên cứu;
- nếu chưa chọn ngành, vẫn được lưu draft nhưng không được tính decision score;
- nếu ngành mới chưa có bộ chỉ tiêu, hiển thị cảnh báo “chưa có bộ chỉ tiêu chuyên ngành”.

### Đầu ra

- scenario ID;
- dashboard scenario;
- danh sách câu hỏi nghiên cứu;
- trạng thái độ đầy đủ dữ liệu ban đầu.

## 6.2. Luồng B02 — Tra cứu địa bàn

### Mục tiêu

Cho phép tìm địa phương theo tên hoặc mã và xem dữ liệu theo phiên bản địa giới.

### Quy trình

1. Người dùng nhập tên/mã.
2. Hệ thống tìm trong `geo_unit` thuộc geography version đang active.
3. Hệ thống trả kết quả theo cấp địa lý.
4. Người dùng chọn một kết quả.
5. Hệ thống mở market profile.
6. Hệ thống hiển thị độ đầy đủ dữ liệu và các cảnh báo.

### Quy tắc tìm kiếm

- không phân biệt hoa thường;
- hỗ trợ tiếng Việt có dấu và không dấu;
- hỗ trợ mã hành chính;
- nếu trùng tên, hiển thị tỉnh/cấp cha để phân biệt;
- không gộp các bản ghi khác phiên bản địa giới nếu chưa có crosswalk;
- phải hiển thị phiên bản địa giới đang dùng.

## 6.3. Luồng B03 — Xem bản đồ và lớp dữ liệu

### Quy trình

1. Người dùng mở trang Map Workspace.
2. Hệ thống tải geography version active.
3. Hệ thống tải lớp địa giới được cấp phép.
4. Người dùng bật một indicator layer.
5. Hệ thống tải observations tương thích với lớp đó.
6. Hệ thống áp dụng color scale.
7. Người dùng click vào địa bàn.
8. Hệ thống hiển thị popup và provenance.

### Quy tắc

- layer không có polygon hợp lệ không được hiển thị như lớp bản đồ;
- nếu có danh mục nhưng không có hình học, cho phép tra cứu dạng danh sách và báo “chưa sẵn sàng trực quan hóa”;
- lớp `Unavailable` không được tô màu như giá trị 0;
- địa bàn thiếu dữ liệu phải có kiểu hiển thị riêng, ví dụ hatch/gray;
- mỗi popup phải có nguồn và kỳ đo;
- màu phải có legend và đơn vị.

## 6.4. Luồng B04 — Lọc theo chỉ tiêu

Người dùng có thể lọc:

- indicator;
- operator `>`, `>=`, `<`, `<=`, `=` hoặc range;
- period;
- geography level;
- quality status;
- source;
- sector;
- segment;
- coverage status.

Ví dụ:

```text
Tỉnh có tổng bán lẻ 10T/2026 > 500 nghìn tỷ
AND dữ liệu Verified
AND có dân số năm 2025
```

Hệ thống phải hiển thị:

- số địa bàn thỏa điều kiện;
- số địa bàn bị loại vì thiếu dữ liệu;
- số địa bàn bị loại vì không tương thích kỳ/đơn vị;
- bộ lọc đang áp dụng;
- nút xóa toàn bộ bộ lọc.

## 6.5. Luồng B05 — So sánh địa bàn

### Mục tiêu

Cho phép người dùng đặt hai hoặc nhiều địa bàn cạnh nhau bằng các chỉ tiêu có thể so sánh.

### Quy trình

1. Người dùng chọn 2–3 địa bàn.
2. Hệ thống phát hiện chỉ tiêu chung.
3. Hệ thống kiểm tra compatibility.
4. Hệ thống chia chỉ tiêu thành:
   - so sánh được;
   - có cảnh báo;
   - không so sánh được;
   - thiếu dữ liệu.
5. Hệ thống hiển thị bảng và biểu đồ.
6. Người dùng có thể mở provenance của từng ô dữ liệu.
7. Người dùng lưu comparison vào scenario.

### Điều kiện compatibility

Hai observation chỉ được coi là comparable khi:

```text
same indicator_definition
same unit hoặc có conversion hợp lệ
compatible period
same geography level
same geography_version hoặc có crosswalk được phê duyệt
same scope/coverage
quality_status không phải UNAVAILABLE
```

Nếu một điều kiện không đạt, không được âm thầm quy đổi hoặc loại bỏ cảnh báo.

## 6.6. Luồng B06 — Nghiên cứu needs/wants

### Mục tiêu

Quản lý bằng chứng về nhu cầu, mong muốn, hành vi và tiêu chí mua hàng theo phân khúc.

### Quy trình

1. Analyst tạo một `Survey Study`.
2. Chọn ngành, phân khúc, địa bàn và kỳ.
3. Nhập phương pháp nghiên cứu.
4. Tạo câu hỏi có mã duy nhất.
5. Thu thập dữ liệu ngoài hệ thống hoặc nhập aggregate.
6. Nhập cỡ mẫu và kết quả tổng hợp.
7. Reviewer kiểm tra phương pháp.
8. Khi được duyệt, insight chuyển sang `PUBLISHED`.
9. Người dùng xem insight trong Customer Evidence.

### Không lưu mặc định

Bản B-Lite không cần lưu dữ liệu trả lời cá nhân hoặc thông tin định danh. Chỉ lưu aggregate đã tổng hợp, trừ khi có thiết kế bảo vệ dữ liệu riêng.

### Các chỉ tiêu needs/wants

- top unmet needs;
- channel preference;
- willingness-to-pay band;
- purchase frequency;
- B2B supplier criteria;
- purchase occasion;
- delivery expectation;
- quality expectation;
- brand/trust factor;
- online/offline preference.

### Quy tắc công bố

Mỗi aggregate phải có:

- study ID;
- question ID;
- segment ID;
- geography ID;
- `n`;
- estimate;
- unit hoặc percentage;
- recall period nếu có;
- method;
- fieldwork period;
- sampling note;
- confidence/limitation note.

Nếu thiếu một trường bắt buộc, kết quả không được dùng làm customer evidence đã xác minh.

## 6.7. Luồng B07 — Quản lý đối thủ, nhà cung cấp và POI

### Dữ liệu cần nhập

- tên actor;
- loại actor;
- ngành;
- nhóm sản phẩm;
- địa chỉ;
- tọa độ;
- geo ID;
- kênh hoạt động;
- nguồn;
- ngày kiểm tra;
- người kiểm tra;
- trạng thái xác minh;
- ghi chú.

### Trạng thái

```text
UNVERIFIED → CHECKING → VERIFIED
                    ↘ REJECTED
```

POI chưa xác minh chỉ được hiển thị ở lớp tham khảo, không được dùng cho decision score mặc định.

## 6.8. Luồng B08 — Tạo decision scenario

### Quy trình

1. Người dùng chọn các địa bàn ứng viên.
2. Chọn nhóm tiêu chí.
3. Chọn indicator cho từng tiêu chí.
4. Chọn hướng tốt/xấu của từng indicator.
5. Đặt trọng số.
6. Chọn period.
7. Chọn quy tắc missing data.
8. Hệ thống chạy validation.
9. Nếu đạt, hệ thống tính score.
10. Hệ thống hiển thị kết quả, giải thích và cảnh báo.
11. Người dùng lưu scenario.

### Quy tắc trọng số

- tổng trọng số phải bằng 100% hoặc 1.0;
- không cho trọng số âm;
- tiêu chí bị thiếu dữ liệu phải hiển thị trước khi tính;
- người dùng phải biết default weights chỉ là cấu hình minh họa;
- thay đổi tập địa bàn có thể làm thay đổi normalization và phải được thông báo.

## 6.9. Luồng B09 — Checklist pháp lý

### Quy trình

1. Người dùng chọn ngành, quốc tịch nhà đầu tư, hình thức kinh doanh và địa bàn.
2. Hệ thống tìm các legal reference và entry requirement liên quan.
3. Hệ thống tạo checklist.
4. Người dùng hoặc chuyên gia cập nhật trạng thái.
5. Hệ thống hiển thị tài liệu cần xác minh.
6. Hệ thống không tự kết luận đủ điều kiện.

### Trạng thái checklist

- `NOT_REVIEWED` — chưa rà soát.
- `SOURCE_RECORDED` — đã ghi nhận nguồn pháp lý.
- `NEEDS_SECTOR_CHECK` — cần kiểm tra theo ngành.
- `NEEDS_LOCATION_CHECK` — cần kiểm tra theo địa bàn.
- `LEGAL_REVIEW_REQUESTED` — đã yêu cầu chuyên gia.
- `SEPARATE_ADVICE_AVAILABLE` — có ý kiến pháp lý riêng.

## 6.10. Luồng B10 — Xuất hồ sơ

Người dùng chọn:

- loại báo cáo;
- scenario;
- địa bàn;
- period;
- lớp dữ liệu;
- mức độ chi tiết nguồn;
- định dạng.

Hệ thống tạo `Export Job`, lưu cấu hình và phiên bản dữ liệu đã dùng. Báo cáo phải ghi rõ thời điểm xuất và cảnh báo phạm vi.

---

# 7. Yêu cầu chức năng chi tiết

## 6.11. Luồng B11 — Khám phá Việt Nam để thu hút đầu tư

### Mục tiêu

Đưa nhà đầu tư quốc tế từ trang mở đầu tới các lớp dữ liệu và cơ hội cụ thể trong thời gian ngắn nhất.

### Quy trình public

1. Nhà đầu tư mở trang `Invest in Vietnam`.
2. Hệ thống hiển thị bản đồ tổng quan và các chỉ số quốc gia được chọn.
3. Hệ thống hiển thị nhóm ngành/cơ hội nổi bật có nguồn.
4. Nhà đầu tư chọn một ngành hoặc chọn trực tiếp một tỉnh/thành trên bản đồ.
5. Hệ thống mở `Investor Profile` của ngành/địa bàn.
6. Nhà đầu tư xem các lớp dân số, kinh tế, nhân lực, hạ tầng, logistics, doanh nghiệp, khu công nghiệp, thị trường và pháp lý.
7. Nhà đầu tư dùng search/filter để tìm địa bàn phù hợp.
8. Nhà đầu tư so sánh các địa bàn.
9. Nhà đầu tư lưu địa bàn/cơ hội vào shortlist.
10. Nhà đầu tư tải hồ sơ hoặc bấm `Discuss this opportunity`.
11. Nhà đầu tư điền investment inquiry.
12. Hệ thống gửi inquiry tới contact/đơn vị phụ trách và gửi xác nhận cho nhà đầu tư.

### Nguyên tắc nội dung

- trang mở đầu phải có thông điệp rõ ràng, nhưng mỗi claim quan trọng phải liên kết tới nguồn;
- dùng số liệu nổi bật, bản đồ và hình ảnh để tạo động lực khám phá;
- không dùng bảng dày đặc ngay màn hình đầu tiên;
- luôn có CTA tiếp theo;
- hiển thị dữ liệu cập nhật đến ngày nào;
- hiển thị ngôn ngữ và đơn vị tiền tệ rõ ràng;
- đối với nhà đầu tư quốc tế, thuật ngữ tiếng Anh phải nhất quán.

## 6.12. Luồng B12 — Tìm kiếm cơ hội đầu tư

### Bộ lọc

- ngành;
- tỉnh/thành;
- loại cơ hội;
- quy mô dự án;
- diện tích;
- khu công nghiệp/cụm công nghiệp;
- hạ tầng có sẵn;
- nhân lực;
- thời điểm sẵn sàng;
- tình trạng pháp lý của cơ hội;
- ưu đãi có thể áp dụng;
- trạng thái công bố.

### Kết quả

Mỗi opportunity card phải có:

- tên cơ hội;
- tỉnh/thành và địa bàn;
- ngành liên quan;
- loại cơ hội;
- diện tích/quy mô nếu có;
- trạng thái sẵn sàng;
- điểm nổi bật có nguồn;
- ngày cập nhật;
- nút xem chi tiết;
- nút lưu shortlist;
- nút gửi inquiry.

## 6.13. Luồng B13 — Gửi investment inquiry

### Thông tin nhà đầu tư

- họ tên;
- chức danh;
- tên công ty;
- quốc gia;
- email công việc;
- số điện thoại quốc tế tùy chọn;
- website công ty tùy chọn.

### Thông tin nhu cầu

- ngành quan tâm;
- sản phẩm/dịch vụ;
- tỉnh/thành quan tâm;
- opportunity đã xem;
- quy mô đầu tư dự kiến theo khoảng;
- thời gian dự kiến;
- hình thức đầu tư;
- nhu cầu hỗ trợ;
- nội dung câu hỏi.

### Quy trình xử lý

1. Validate form.
2. Hiển thị consent về việc sử dụng thông tin liên hệ.
3. Tạo `investment_inquiry`.
4. Xác định contact routing theo ngành/địa bàn.
5. Gửi email/thông báo tới đầu mối.
6. Gửi email xác nhận tới nhà đầu tư.
7. Ghi conversion event.
8. Theo dõi trạng thái xử lý.

### Trạng thái inquiry

```text
SUBMITTED → ACKNOWLEDGED → ASSIGNED → IN_PROGRESS → CONTACTED → QUALIFIED
                                                       ↘ CLOSED
```

Không tự động gọi một inquiry là “qualified lead” chỉ vì người dùng điền form.

## 6.14. Luồng B14 — Quản trị nội dung thu hút đầu tư

Người vận hành phải quản lý được:

- hero content;
- quốc gia overview;
- sector landing page;
- province landing page;
- opportunity;
- incentive;
- success story/case study;
- FAQ;
- investment contact;
- source/citation;
- bản dịch tiếng Anh/tiếng Việt;
- ngày xuất bản và ngày hết hạn.

Mọi nội dung có tính định lượng hoặc tuyên bố chính sách phải có source hoặc người duyệt nội dung.

## 7.1. Nhóm F01 — Scenario và workspace

| ID | Yêu cầu | Mức |
|---|---|---|
| F01.01 | Tạo scenario với tên và mục tiêu nghiên cứu | MUST |
| F01.02 | Chọn ngành, nhóm sản phẩm và mô hình B2C/B2B | MUST |
| F01.03 | Chọn một hoặc nhiều địa bàn | MUST |
| F01.04 | Lưu câu hỏi cần trả lời | MUST |
| F01.05 | Lưu lịch sử chỉnh sửa scenario | SHOULD |
| F01.06 | Nhân bản scenario để thử trọng số khác | SHOULD |
| F01.07 | Lưu snapshot dữ liệu tại thời điểm xuất báo cáo | MUST |

## 7.2. Nhóm F02 — Bản đồ

| ID | Yêu cầu | Mức |
|---|---|---|
| F02.01 | Hiển thị bản đồ theo geography version | MUST |
| F02.02 | Hiển thị lớp địa giới tỉnh | MUST |
| F02.03 | Hỗ trợ lớp xã/phường nếu polygon hợp lệ | SHOULD |
| F02.04 | Bật/tắt indicator layer | MUST |
| F02.05 | Color scale theo giá trị | MUST |
| F02.06 | Hiển thị legend và unit | MUST |
| F02.07 | Popup địa bàn | MUST |
| F02.08 | Đánh dấu địa bàn thiếu dữ liệu | MUST |
| F02.09 | Không hiển thị polygon chưa được cấp phép/xác minh | MUST NOT |
| F02.10 | Hiển thị nguồn, kỳ, version trong popup | MUST |

## 7.3. Nhóm F03 — Search và filter

| ID | Yêu cầu | Mức |
|---|---|---|
| F03.01 | Tìm theo tên địa bàn | MUST |
| F03.02 | Tìm theo mã địa hành chính | MUST |
| F03.03 | Tìm không dấu | SHOULD |
| F03.04 | Lọc theo indicator | MUST |
| F03.05 | Lọc theo period | MUST |
| F03.06 | Lọc theo quality status | MUST |
| F03.07 | Lọc theo ngành/phân khúc | MUST |
| F03.08 | Hiển thị số lượng thiếu dữ liệu | MUST |
| F03.09 | Lưu bộ lọc vào scenario | SHOULD |

## 7.4. Nhóm F04 — So sánh

| ID | Yêu cầu | Mức |
|---|---|---|
| F04.01 | Chọn 2–3 địa bàn | MUST |
| F04.02 | Tự tìm indicator chung | MUST |
| F04.03 | Kiểm tra compatibility | MUST |
| F04.04 | Hiển thị cảnh báo khác kỳ/định nghĩa | MUST |
| F04.05 | Hiển thị bảng so sánh | MUST |
| F04.06 | Hiển thị biểu đồ | SHOULD |
| F04.07 | Drill-down provenance của từng ô | MUST |
| F04.08 | Lưu comparison | SHOULD |

## 7.5. Nhóm F05 — Customer evidence

| ID | Yêu cầu | Mức |
|---|---|---|
| F05.01 | Tạo survey study | SHOULD |
| F05.02 | Quản lý segment | MUST |
| F05.03 | Quản lý question ID | MUST |
| F05.04 | Nhập aggregate survey | MUST |
| F05.05 | Hiển thị cỡ mẫu và phương pháp | MUST |
| F05.06 | Nhãn “chưa có bằng chứng” | MUST |
| F05.07 | Phân biệt self-reported và observed behavior | SHOULD |
| F05.08 | Không suy diễn từ demographic proxy | MUST NOT |

## 7.6. Nhóm F06 — Data governance

| ID | Yêu cầu | Mức |
|---|---|---|
| F06.01 | Source registry | MUST |
| F06.02 | License và quyền sử dụng | MUST |
| F06.03 | Dataset version | MUST |
| F06.04 | Chất lượng Verified/Supported/Unavailable | MUST |
| F06.05 | Provenance của observation | MUST |
| F06.06 | Workflow review | SHOULD |
| F06.07 | Crosswalk địa giới | MUST |
| F06.08 | Import validation | MUST |
| F06.09 | Audit log | MUST |

## 7.7. Nhóm F07 — Decision support

| ID | Yêu cầu | Mức |
|---|---|---|
| F07.01 | Tạo decision scenario | MUST |
| F07.02 | Chọn criteria và indicator | MUST |
| F07.03 | Chọn polarity | MUST |
| F07.04 | Nhập trọng số | MUST |
| F07.05 | Chuẩn hóa 0–100 | MUST |
| F07.06 | Tính weighted score | MUST |
| F07.07 | Giải thích điểm | MUST |
| F07.08 | Từ chối khi thiếu dữ liệu bắt buộc | MUST |
| F07.09 | Hiển thị sensitivity khi đổi weights | SHOULD |
| F07.10 | Không gọi score là ROI/profitability | MUST NOT |

## 7.8. Nhóm F08 — Pháp lý

| ID | Yêu cầu | Mức |
|---|---|---|
| F08.01 | Quản lý legal reference | MUST |
| F08.02 | Gắn văn bản với ngành/kênh/địa bàn | MUST |
| F08.03 | Tạo checklist entry requirement | MUST |
| F08.04 | Link tới văn bản chính thức | MUST |
| F08.05 | Hiển thị disclaimer không phải tư vấn pháp lý | MUST |
| F08.06 | Không tự kết luận đủ điều kiện | MUST NOT |

## 7.9. Nhóm F09 — Report/export

| ID | Yêu cầu | Mức |
|---|---|---|
| F09.01 | Export market profile | MUST |
| F09.02 | Export comparison | MUST |
| F09.03 | Export decision scenario | MUST |
| F09.04 | Export research gaps | MUST |
| F09.05 | CSV/JSON | MUST |
| F09.06 | Excel | SHOULD |
| F09.07 | PDF | SHOULD |
| F09.08 | Ghi data snapshot và thời điểm xuất | MUST |

## 7.10. Nhóm F10 — Investor attraction public experience

| ID | Yêu cầu | Mức |
|---|---|---|
| F10.01 | Trang `Invest in Vietnam` có bản đồ và chỉ số quốc gia | MUST |
| F10.02 | Hiển thị sector landing pages | MUST |
| F10.03 | Hiển thị province investor profiles | MUST |
| F10.04 | Hiển thị opportunity directory | MUST |
| F10.05 | Lọc cơ hội theo ngành/địa bàn/trạng thái | MUST |
| F10.06 | Lưu shortlist | MUST |
| F10.07 | Tải investor profile | MUST |
| F10.08 | Gửi investment inquiry | MUST |
| F10.09 | Routing inquiry tới contact phù hợp | MUST |
| F10.10 | Hỗ trợ tiếng Anh cho public experience | MUST |
| F10.11 | Hiển thị source và last updated | MUST |
| F10.12 | Analytics funnel | SHOULD |
| F10.13 | Success stories/case studies | SHOULD |
| F10.14 | So sánh cơ hội đầu tư | SHOULD |

## 7.11. Nhóm F11 — Investor content CMS

| ID | Yêu cầu | Mức |
|---|---|---|
| F11.01 | Quản lý country overview | MUST |
| F11.02 | Quản lý sector page | MUST |
| F11.03 | Quản lý province page | MUST |
| F11.04 | Quản lý opportunity | MUST |
| F11.05 | Quản lý investment incentive | MUST |
| F11.06 | Quản lý contact/routing | MUST |
| F11.07 | Quản lý bản dịch Việt-Anh | MUST |
| F11.08 | Workflow draft/review/published/expired | MUST |
| F11.09 | Gắn source cho claim định lượng | MUST |
| F11.10 | Lịch sử thay đổi nội dung | SHOULD |

---

# 8. Bộ dữ liệu phải chuẩn bị

## 8.1. Nguyên tắc dữ liệu

Mỗi dữ liệu khi đưa vào hệ thống phải trả lời được:

1. Đây là chỉ tiêu gì?
2. Định nghĩa chính xác là gì?
3. Giá trị đo bằng đơn vị nào?
4. Đo tại địa bàn nào?
5. Địa giới có hiệu lực khi nào?
6. Đo trong kỳ nào?
7. Nguồn phát hành là ai?
8. URL hoặc tài liệu gốc ở đâu?
9. Có quyền sử dụng không?
10. Ai thu thập và kiểm tra?
11. Độ tin cậy ở mức nào?
12. Có thể dùng để so sánh hoặc chấm điểm không?

## 8.2. Danh mục bộ dữ liệu tối thiểu cho B-Lite

| File/bộ dữ liệu | Nội dung | Bắt buộc |
|---|---|---:|
| `geography_versions` | Phiên bản địa giới | Có |
| `geo_units` | Mã và tên quốc gia/tỉnh/xã | Có |
| `geo_boundaries` | GeoJSON/geometry được phép dùng | Có cho bản đồ |
| `geo_crosswalks` | Đối chiếu địa giới cũ/mới | Có nếu dùng dữ liệu khác version |
| `indicator_definitions` | Từ điển chỉ tiêu | Có |
| `observations` | Giá trị chỉ tiêu | Có |
| `source_registry` | Danh mục nguồn | Có |
| `dataset_versions` | Phiên bản file/bộ dữ liệu | Có |
| `quality_reviews` | Kết quả kiểm tra | Nên có |
| `segments` | Phân khúc B2C/B2B | Có |
| `survey_studies` | Nghiên cứu khảo sát | Có nếu demo evidence |
| `survey_questions` | Bộ câu hỏi | Có nếu demo evidence |
| `survey_aggregates` | Kết quả tổng hợp | Có nếu demo evidence |
| `market_actors` | Đối thủ/nhà cung cấp/POI | Có cho lớp cạnh tranh |
| `legal_references` | Văn bản pháp lý | Có |
| `entry_requirements` | Checklist điều kiện | Có |
| `criterion_definitions` | Bộ tiêu chí score | Có |
| `demo_scenarios` | Kịch bản demo | Có |

## 8.2A. Data layer roadmap — triển khai sớm nhất

Đây là thứ tự ưu tiên thực tế để có thể đưa bản đồ và trải nghiệm cho nhà đầu tư lên nhanh, sau đó mở rộng dần. Không chờ thu thập toàn bộ dữ liệu mới làm sản phẩm.

### Wave 1 — bắt buộc để ra mắt bản đồ quốc gia

#### Layer L01 — Country / Vietnam

Phạm vi:

- biên giới và lãnh thổ Việt Nam;
- tên quốc gia tiếng Việt/tiếng Anh;
- vị trí địa lý;
- các vùng kinh tế nếu đã có định nghĩa được duyệt;
- chỉ số tổng quan quốc gia;
- nguồn và ngày cập nhật.

Mục đích:

- tạo trang `Invest in Vietnam`;
- giúp nhà đầu tư nước ngoài hiểu bối cảnh trước khi xem tỉnh/thành;
- làm lớp nền cho country profile.

#### Layer L02 — Provinces / Municipalities

Phạm vi:

- mã tỉnh/thành;
- tên tiếng Việt và tiếng Anh;
- polygon;
- diện tích;
- dân số;
- dân số thành thị/nông thôn nếu có;
- GRDP hoặc chỉ tiêu kinh tế được duyệt;
- bán lẻ/dịch vụ nếu có;
- số doanh nghiệp;
- khu công nghiệp/cụm công nghiệp nếu có;
- source, period, license và quality.

Mục đích:

- bản đồ tương tác cấp tỉnh/thành;
- province investor profile;
- so sánh địa bàn;
- province shortlist.

#### Layer L03 — Wards / Communes

Trong tài liệu tiếng Việt phải thống nhất cách gọi cấp xã gồm **xã, phường và đơn vị tương đương**. Tên tiếng Anh cần có mapping rõ ràng, ví dụ `commune`, `ward` hoặc `commune-level administrative unit` tùy loại đơn vị trong nguồn chính thức.

Phạm vi:

- mã xã/phường;
- tên tiếng Việt và tên tiếng Anh;
- mã tỉnh/thành cha;
- loại đơn vị: ward/commune/other commune-level unit;
- polygon nếu đã xác minh và được phép sử dụng;
- dân số nếu có nguồn;
- diện tích và mật độ nếu có nguồn;
- trạng thái geometry.

Quy tắc triển khai sớm:

- có thể ra mắt danh mục và search xã/phường trước khi có đủ polygon;
- nếu chưa có polygon hợp lệ, không vẽ ranh giới giả;
- giao diện phải ghi `Available for search, not yet ready for map visualization`;
- không gán số liệu cấp huyện/quận cũ cho xã/phường mới nếu chưa có crosswalk được duyệt.

#### Layer L04 — Population

Phạm vi tối thiểu:

- tổng dân số;
- dân số theo tỉnh/thành;
- dân số theo xã/phường nếu có;
- dân số thành thị/nông thôn;
- mật độ dân số;
- năm/kỳ thống kê;
- nguồn và trạng thái xác minh.

Quy tắc hiển thị:

- dùng cho bối cảnh quy mô thị trường;
- không gắn nhãn “customer demand”;
- không tự suy ra thu nhập, mức chi tiêu hoặc khả năng sinh lời;
- khi dữ liệu cấp xã thiếu, hiển thị coverage map thay vì màu 0.

### Wave 2 — các lớp làm nhà đầu tư thấy cơ hội

#### Layer L05 — Economy and Market Size

- GRDP;
- GRDP bình quân;
- bán lẻ hàng hóa;
- doanh thu dịch vụ;
- tăng trưởng;
- lao động và việc làm;
- chỉ số giá nếu phù hợp;
- FDI context;
- doanh nghiệp đang hoạt động.

#### Layer L06 — Infrastructure and Connectivity

- cảng biển;
- sân bay;
- đường cao tốc/quốc lộ/trục logistics;
- ga đường sắt;
- trung tâm logistics;
- khu công nghiệp/cụm công nghiệp;
- khu kinh tế;
- hạ tầng điện/nước/viễn thông nếu dữ liệu được cấp phép;
- khoảng cách hoặc thời gian tiếp cận.

#### Layer L07 — Workforce and Talent

- lực lượng lao động;
- cơ cấu lao động;
- trường đại học/cao đẳng;
- cơ sở đào tạo nghề;
- nguồn nhân lực theo ngành nếu có;
- tỷ lệ việc làm/thất nghiệp;
- kỹ năng hoặc năng lực ngôn ngữ nếu có nguồn hợp pháp.

#### Layer L08 — Business Ecosystem

- số doanh nghiệp theo ngành;
- doanh nghiệp FDI;
- nhà cung cấp;
- nhà phân phối;
- đối tác tiềm năng;
- cụm ngành;
- đối thủ/POI đã xác minh;
- kênh online/offline.

### Wave 3 — các lớp giúp ra quyết định đầu tư

#### Layer L09 — Investment Opportunities

- dự án mời gọi đầu tư;
- khu đất/cơ sở sẵn sàng;
- khu công nghiệp có diện tích;
- loại dự án;
- ngành;
- quy mô vốn;
- diện tích;
- trạng thái sẵn sàng;
- đầu mối liên hệ;
- hạn công bố;
- nguồn và hồ sơ pháp lý liên quan.

#### Layer L10 — Incentives and Legal Readiness

- ưu đãi theo ngành;
- ưu đãi theo địa bàn;
- điều kiện áp dụng;
- thời hạn;
- văn bản nguồn;
- checklist giấy phép;
- trạng thái đã rà soát/chưa rà soát.

#### Layer L11 — Customer and Demand Evidence

- needs/wants;
- hành vi mua;
- kênh phân phối;
- willingness-to-pay;
- chu kỳ mua B2B;
- tiêu chí chọn nhà cung cấp;
- cỡ mẫu và phương pháp khảo sát.

#### Layer L12 — Sustainability and Risk Context

Chỉ triển khai khi có nguồn phù hợp:

- rủi ro thiên tai;
- môi trường;
- khả năng chống chịu hạ tầng;
- nguồn nước/năng lượng;
- phát thải;
- yêu cầu ESG;
- rủi ro chuỗi cung ứng.

### Thứ tự release đề xuất

```text
Release 1: L01 + L02 + L03 (search/list) + L04
Release 2: L03 (polygon) + L05 + L06 + L07
Release 3: L08 + L09 + L10
Release 4: L11 + L12 + advanced decision support
```

### Điều kiện để một layer được public

Một layer chỉ được đưa lên public khi có đủ:

1. tên và mô tả dễ hiểu;
2. định nghĩa chỉ tiêu;
3. đơn vị;
4. kỳ dữ liệu;
5. địa giới áp dụng;
6. source/citation;
7. quyền sử dụng;
8. ngày cập nhật;
9. quality status;
10. limitation;
11. owner chịu trách nhiệm cập nhật;
12. trạng thái publish đã được duyệt.

Nếu thiếu polygon nhưng vẫn có danh mục hoặc số liệu, layer được public dưới dạng **search/list/profile**, không được public dưới dạng **map boundary**.

## 8.3. Nhóm dữ liệu địa lý/hành chính

### Cần thu thập

- mã quốc gia;
- mã tỉnh/thành;
- tên chính thức;
- tên hiển thị;
- tên không dấu;
- mã xã/phường;
- tên xã/phường;
- cấp địa lý;
- mã đơn vị cha;
- ngày hiệu lực;
- ngày hết hiệu lực nếu có;
- nguồn danh mục;
- nguồn polygon;
- phiên bản geometry;
- trạng thái polygon;
- license.

### Điều kiện nghiệm thu

- mã không trùng trong cùng geography version;
- tên hiển thị đúng nguồn;
- parent-child hợp lệ;
- không có geometry invalid nếu dùng để render;
- geometry có CRS thống nhất;
- dữ liệu có license và ngày kiểm tra;
- không gán dữ liệu huyện/quận cũ vào xã mới nếu chưa có crosswalk.

## 8.4. Nhóm dân số và nhân khẩu

### Chỉ tiêu gợi ý

| Mã | Tên | Đơn vị | Polarity mặc định | Dùng score mặc định |
|---|---|---|---|---|
| `POP_TOTAL` | Dân số | người | cao hơn có thể tốt hơn | Không mặc định |
| `POP_URBAN` | Dân số thành thị | người | trung tính | Không mặc định |
| `POP_URBAN_RATE` | Tỷ lệ thành thị | % | ngành phụ thuộc | Không mặc định |
| `POP_DENSITY` | Mật độ dân số | người/km² | ngành phụ thuộc | Không mặc định |
| `HOUSEHOLD_COUNT` | Số hộ | hộ | phụ thuộc | Không mặc định |
| `AGE_BAND_*` | Cơ cấu độ tuổi | người/% | phụ thuộc | Không mặc định |

### Quy tắc

- không suy ra thu nhập từ dân số;
- không suy ra nhu cầu từ mật độ;
- nếu dữ liệu nhân khẩu là proxy, phải đánh dấu `proxy=true`;
- không được hiển thị label “customer demand” cho chỉ tiêu dân số.

## 8.5. Nhóm kinh tế, bán lẻ và lao động

### Chỉ tiêu gợi ý

| Mã | Tên | Đơn vị |
|---|---|---|
| `GRDP_TOTAL` | GRDP | tỷ đồng |
| `GRDP_PC` | GRDP bình quân | đồng/người |
| `RETAIL_TOTAL` | Tổng mức bán lẻ và dịch vụ | nghìn tỷ đồng |
| `RETAIL_GOODS` | Bán lẻ hàng hóa | nghìn tỷ đồng |
| `SERVICE_REVENUE` | Doanh thu dịch vụ | nghìn tỷ đồng |
| `RETAIL_GROWTH_NOMINAL` | Tăng trưởng theo giá hiện hành | % |
| `RETAIL_GROWTH_REAL` | Tăng trưởng loại trừ yếu tố giá | % |
| `LABOR_FORCE` | Lực lượng lao động | người |
| `EMPLOYMENT` | Số người có việc làm | người |
| `UNEMPLOYMENT_RATE` | Tỷ lệ thất nghiệp | % |
| `CPI` | Chỉ số giá | index/% |
| `ACTIVE_BUSINESS_COUNT` | Số doanh nghiệp hoạt động | doanh nghiệp |

### Quy tắc so sánh

- phải lưu phạm vi “hàng hóa”, “dịch vụ” hoặc “tổng”;
- phải lưu kỳ `Y2025`, `M10_2026`, `Q3_2026`...;
- không so sánh doanh thu tổng với doanh thu bình quân nếu chưa chuẩn hóa;
- doanh thu bán lẻ không được đặt tên là `purchasing_power`;
- nếu chỉ tiêu không cùng địa giới, không cho score.

## 8.6. Nhóm doanh nghiệp, đối thủ và nguồn cung

### Chỉ tiêu/lớp gợi ý

- số doanh nghiệp theo ngành;
- số doanh nghiệp mới thành lập;
- số doanh nghiệp tạm ngừng/giải thể;
- số nhà cung cấp;
- số nhà phân phối;
- số điểm bán;
- số đối thủ đã xác minh;
- mật độ điểm bán;
- phân bố theo kênh;
- cụm ngành;
- khu công nghiệp;
- kho/trung tâm phân phối.

### Cảnh báo

Số lượng POI không phản ánh đầy đủ:

- thị phần;
- chất lượng;
- doanh thu;
- năng lực cung ứng;
- mức cạnh tranh thực tế.

Do đó chỉ tiêu POI cần metadata coverage và checked date.

## 8.7. Nhóm logistics và tiếp cận

### Chỉ tiêu gợi ý

- khoảng cách tới cảng;
- khoảng cách tới sân bay;
- khoảng cách tới trung tâm logistics;
- thời gian giao hàng ước tính;
- mật độ đường;
- khả năng kết nối vùng;
- số trung tâm phân phối;
- chi phí vận chuyển nếu có nguồn hợp lệ;
- tỷ lệ địa bàn phục vụ được.

### Quy tắc

- chỉ tiêu mô hình hóa phải có `method` và `model_version`;
- phải phân biệt quan sát thực tế với ước tính;
- không dùng “có đường giao thông” làm proxy duy nhất cho logistics;
- nếu dữ liệu logistics chưa được kiểm chứng, không đưa vào nhóm bắt buộc của score.

## 8.8. Nhóm TMĐT và hành vi số

### Chỉ tiêu gợi ý

- tỷ lệ tiếp cận Internet;
- tỷ lệ mua online;
- kênh mua phổ biến;
- phương thức thanh toán;
- tần suất mua online;
- thời gian giao hàng kỳ vọng;
- mức độ sử dụng sàn;
- tỷ lệ đơn hàng online/offline;
- khả năng nhận hàng.

### Quy tắc

- dữ liệu quốc gia chỉ mô tả bối cảnh quốc gia;
- không phân bổ doanh thu TMĐT quốc gia xuống xã theo dân số nếu không có phương pháp được phê duyệt;
- dữ liệu hành vi phải có phương pháp và mẫu;
- cần phân biệt hành vi tự khai với giao dịch quan sát được.

## 8.9. Nhóm needs/wants

### Chỉ tiêu tối thiểu

| Mã | Tên | Đơn vị |
|---|---|---|
| `UNMET_NEED_RATE` | Tỷ lệ nêu nhu cầu chưa đáp ứng | % |
| `CHANNEL_PREF_*` | Ưu tiên kênh mua | % |
| `WTP_BAND_*` | Khoảng giá chấp nhận | khoảng giá/% |
| `PURCHASE_FREQ` | Tần suất mua | lần/kỳ |
| `SUPPLIER_CRITERIA_*` | Tiêu chí nhà cung cấp | điểm/% |
| `DELIVERY_EXPECTATION` | Kỳ vọng giao hàng | giờ/ngày |
| `QUALITY_PRIORITY` | Mức ưu tiên chất lượng | điểm |
| `PRICE_PRIORITY` | Mức ưu tiên giá | điểm |
| `TRUST_PRIORITY` | Mức ưu tiên tín nhiệm | điểm |

### Điều kiện bắt buộc

- có question ID;
- có segment;
- có địa bàn hoặc phạm vi nghiên cứu;
- có n;
- có phương pháp;
- có kỳ khảo sát;
- có sampling note;
- có nhãn estimated/self-reported nếu phù hợp.

## 8.10. Nhóm pháp lý

Mỗi văn bản pháp lý cần có:

- mã văn bản;
- tên;
- cơ quan ban hành;
- ngày ban hành;
- ngày hiệu lực;
- trạng thái hiệu lực;
- URL chính thức;
- ngành áp dụng;
- kênh áp dụng;
- loại nhà đầu tư;
- địa bàn áp dụng;
- ghi chú không phải tư vấn pháp lý;
- ngày rà soát gần nhất.

---

# 9. Data dictionary và mô hình dữ liệu

## 9.1. Quy ước chung

- ID dùng UUID hoặc mã ổn định.
- Tất cả timestamp lưu UTC, giao diện hiển thị timezone phù hợp.
- Không dùng tên hiển thị làm khóa liên kết.
- Mỗi bản ghi dữ liệu phải có `source_id` và `dataset_version_id`.
- Giá trị số phải tách khỏi đơn vị; không lưu chuỗi “6.618,9 nghìn tỷ đồng” trong cột value.
- Giá trị thiếu dùng `NULL` kèm `missing_reason`, không dùng 0.
- Percent lưu dạng chuẩn thống nhất, ví dụ `0.386` hoặc `38.6`, nhưng phải chọn một quy ước duy nhất toàn hệ thống.

## 9.2. Bảng `organizations`

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---:|---|
| `organization_id` | UUID | Có | Khóa chính |
| `name` | string | Có | Tên tổ chức |
| `country_code` | string | Không | Quốc gia |
| `status` | enum | Có | active/inactive |
| `created_at` | datetime | Có | Thời điểm tạo |
| `updated_at` | datetime | Có | Thời điểm cập nhật |

## 9.3. Bảng `users`

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---:|---|
| `user_id` | UUID | Có | Khóa chính |
| `organization_id` | UUID | Có | Tổ chức |
| `email` | string | Có | Email đăng nhập |
| `display_name` | string | Có | Tên hiển thị |
| `role` | enum | Có | visitor/investor/analyst/steward/reviewer/admin |
| `status` | enum | Có | active/locked/invited |
| `last_login_at` | datetime | Không | Lần đăng nhập gần nhất |

## 9.4. Bảng `geography_versions`

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---:|---|
| `geography_version_id` | UUID | Có | Khóa chính |
| `code` | string | Có | Ví dụ `VN_ADMIN_2025_07` |
| `name` | string | Có | Tên phiên bản |
| `effective_from` | date | Có | Ngày hiệu lực |
| `effective_to` | date | Không | Ngày kết thúc |
| `authority_source_id` | UUID | Có | Nguồn chính thức |
| `status` | enum | Có | draft/active/retired |
| `notes` | text | Không | Ghi chú |

## 9.5. Bảng `geo_units`

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---:|---|
| `geo_id` | UUID | Có | Khóa hệ thống |
| `geography_version_id` | UUID | Có | Phiên bản địa giới |
| `admin_code` | string | Có | Mã hành chính |
| `name` | string | Có | Tên chính thức |
| `display_name` | string | Có | Tên giao diện |
| `normalized_name` | string | Có | Tên tìm kiếm |
| `level` | enum | Có | country/province/commune |
| `parent_geo_id` | UUID | Không | Địa bàn cha |
| `valid_from` | date | Có | Hiệu lực |
| `valid_to` | date | Không | Hết hiệu lực |
| `geometry_status` | enum | Có | verified/pending/unavailable |
| `geometry_version` | string | Không | Version geometry |

## 9.6. Bảng `geo_boundaries`

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---:|---|
| `boundary_id` | UUID | Có | Khóa chính |
| `geo_id` | UUID | Có | Địa bàn |
| `geometry` | geometry | Có nếu available | Polygon/multipolygon |
| `geometry_format` | enum | Có | geojson/wkb/vector_tile |
| `crs` | string | Có | Hệ tọa độ |
| `source_id` | UUID | Có | Nguồn geometry |
| `license_status` | enum | Có | allowed/restricted/unknown |
| `valid_from` | date | Có | Hiệu lực |
| `checksum` | string | Có | Kiểm tra file |

## 9.7. Bảng `geo_crosswalks`

Dùng để đối chiếu địa giới khác phiên bản.

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---:|---|
| `crosswalk_id` | UUID | Có | Khóa chính |
| `from_geo_version_id` | UUID | Có | Version nguồn |
| `from_geo_id` | UUID | Có | Địa bàn nguồn |
| `to_geo_version_id` | UUID | Có | Version đích |
| `to_geo_id` | UUID | Có | Địa bàn đích |
| `allocation_method` | enum | Có | official/manual/area/population/model |
| `allocation_ratio` | decimal | Không | Tỷ lệ phân bổ nếu có |
| `source_id` | UUID | Có | Nguồn phương pháp |
| `approval_status` | enum | Có | draft/approved/rejected |
| `notes` | text | Không | Hạn chế |

Không được dùng crosswalk chưa approved để tự động so sánh hoặc cộng dồn.

## 9.8. Bảng `indicator_definitions`

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---:|---|
| `indicator_id` | UUID | Có | Khóa chính |
| `code` | string | Có | Mã ổn định |
| `label` | string | Có | Tên hiển thị |
| `description` | text | Có | Định nghĩa |
| `domain` | enum | Có | population/economy/customer/... |
| `value_type` | enum | Có | integer/decimal/percent/text/category |
| `unit` | string | Có | Đơn vị |
| `period_type` | enum | Có | point/month/quarter/year/survey |
| `polarity` | enum | Có | higher/lower/neutral/context_only |
| `is_proxy` | boolean | Có | Có phải proxy không |
| `score_eligible` | boolean | Có | Được dùng score không |
| `required_metadata` | JSON | Có | Metadata bắt buộc |
| `status` | enum | Có | draft/active/retired |

## 9.9. Bảng `observations`

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---:|---|
| `observation_id` | UUID | Có | Khóa chính |
| `geo_id` | UUID | Có | Địa bàn |
| `indicator_id` | UUID | Có | Chỉ tiêu |
| `period_start` | date | Có | Bắt đầu kỳ |
| `period_end` | date | Có | Kết thúc kỳ |
| `period_label` | string | Có | Nhãn kỳ |
| `value_numeric` | decimal | Có nếu số | Giá trị |
| `value_text` | string | Có nếu text | Giá trị text |
| `unit` | string | Có | Đơn vị tại thời điểm ghi |
| `scope` | string | Có | Phạm vi đo |
| `source_id` | UUID | Có | Nguồn |
| `dataset_version_id` | UUID | Có | Version dataset |
| `quality_status` | enum | Có | verified/supported/unavailable |
| `missing_reason` | enum | Không | no_data/not_applicable/not_comparable/restricted |
| `verified_at` | datetime | Không | Ngày kiểm tra |
| `verified_by` | UUID | Không | Người kiểm tra |
| `method_note` | text | Không | Phương pháp |
| `limitations` | text | Không | Hạn chế |

## 9.10. Bảng `source_registry`

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---:|---|
| `source_id` | UUID | Có | Khóa chính |
| `publisher` | string | Có | Đơn vị phát hành |
| `title` | string | Có | Tên tài liệu/bộ dữ liệu |
| `url` | string | Có nếu online | URL |
| `source_type` | enum | Có | official/survey/partner/model/manual |
| `license` | string | Có | Giấy phép/điều kiện |
| `access_right` | enum | Có | public/internal/restricted |
| `collected_at` | datetime | Có | Thời điểm lấy |
| `verified_at` | datetime | Không | Thời điểm kiểm tra |
| `verified_by` | UUID | Không | Người kiểm tra |
| `citation_text` | text | Có | Cách trích dẫn |
| `status` | enum | Có | active/expired/revoked |
| `notes` | text | Không | Hạn chế |

## 9.11. Bảng `survey_studies`

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---:|---|
| `study_id` | UUID | Có | Khóa chính |
| `name` | string | Có | Tên nghiên cứu |
| `sector_id` | UUID | Có | Ngành |
| `study_type` | enum | Có | interview/survey/observation/pilot |
| `target_segment_id` | UUID | Có | Phân khúc |
| `geography_scope` | JSON | Có | Phạm vi địa lý |
| `method` | text | Có | Phương pháp |
| `sampling_method` | text | Có | Cách chọn mẫu |
| `fieldwork_start` | date | Có | Bắt đầu |
| `fieldwork_end` | date | Có | Kết thúc |
| `sample_size` | integer | Có | Cỡ mẫu |
| `response_rate` | decimal | Không | Tỷ lệ phản hồi |
| `representativeness_note` | text | Có | Giới hạn đại diện |
| `status` | enum | Có | draft/reviewed/published/retired |

## 9.12. Bảng `survey_questions`

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---:|---|
| `question_id` | UUID | Có | Khóa hệ thống |
| `study_id` | UUID | Có | Nghiên cứu |
| `question_code` | string | Có | Mã câu hỏi |
| `question_text` | text | Có | Nội dung |
| `question_type` | enum | Có | single/multiple/scale/open/range |
| `construct` | enum | Có | need/want/channel/wtp/frequency/criteria |
| `response_unit` | string | Có | %/score/range |
| `status` | enum | Có | draft/active/retired |

## 9.13. Bảng `survey_aggregates`

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---:|---|
| `aggregate_id` | UUID | Có | Khóa chính |
| `study_id` | UUID | Có | Nghiên cứu |
| `question_id` | UUID | Có | Câu hỏi |
| `segment_id` | UUID | Có | Phân khúc |
| `geo_id` | UUID | Không | Địa bàn nếu có |
| `n` | integer | Có | Cỡ mẫu cho kết quả |
| `estimate_numeric` | decimal | Có | Ước lượng |
| `estimate_unit` | string | Có | %, score, currency... |
| `category` | string | Không | Nhóm trả lời |
| `recall_period` | string | Không | Kỳ nhớ lại |
| `quality_status` | enum | Có | verified/supported/unavailable |
| `publication_note` | text | Có | Hạn chế |

## 9.14. Bảng `market_actors`

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---:|---|
| `actor_id` | UUID | Có | Khóa chính |
| `name` | string | Có | Tên |
| `actor_type` | enum | Có | competitor/supplier/distributor/store/warehouse/other |
| `sector_id` | UUID | Không | Ngành |
| `geo_id` | UUID | Có | Địa bàn |
| `address` | text | Không | Địa chỉ |
| `latitude` | decimal | Không | Vĩ độ |
| `longitude` | decimal | Không | Kinh độ |
| `channel` | enum | Không | online/offline/both |
| `checked_at` | datetime | Không | Ngày kiểm tra |
| `quality_status` | enum | Có | verified/supported/unverified/rejected |
| `source_id` | UUID | Có | Nguồn |
| `notes` | text | Không | Ghi chú |

## 9.15. Bảng `decision_scenarios`

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---:|---|
| `decision_scenario_id` | UUID | Có | Khóa chính |
| `market_scenario_id` | UUID | Có | Scenario cha |
| `name` | string | Có | Tên |
| `sector_id` | UUID | Có | Ngành |
| `geo_ids` | JSON | Có | Danh sách địa bàn |
| `criterion_config` | JSON | Có | Tiêu chí và indicator |
| `weights` | JSON | Có | Trọng số |
| `normalization_config` | JSON | Có | Cách chuẩn hóa |
| `chosen_period` | JSON | Có | Kỳ dùng |
| `missing_data_policy` | enum | Có | reject/partial/qualitative |
| `formula_version` | string | Có | Version công thức |
| `created_at` | datetime | Có | Thời điểm tạo |
| `created_by` | UUID | Có | Người tạo |

## 9.16. Bảng `decision_results`

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---:|---|
| `result_id` | UUID | Có | Khóa chính |
| `decision_scenario_id` | UUID | Có | Scenario |
| `geo_id` | UUID | Có | Địa bàn |
| `criterion_scores` | JSON | Có | Điểm từng tiêu chí |
| `overall_score` | decimal | Không | Điểm tổng |
| `rank` | integer | Không | Thứ hạng nếu đủ điều kiện |
| `eligibility_status` | enum | Có | eligible/ineligible/insufficient |
| `missing_items` | JSON | Có | Dữ liệu thiếu |
| `warnings` | JSON | Có | Cảnh báo |
| `calculated_at` | datetime | Có | Thời điểm tính |
| `dataset_snapshot` | JSON | Có | Version đã dùng |

## 9.17. Bảng `investor_profiles`

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---:|---|
| `investor_profile_id` | UUID | Có | Khóa chính |
| `profile_type` | enum | Có | country/sector/province/opportunity |
| `subject_id` | UUID | Có | Đối tượng được mô tả |
| `language` | enum | Có | vi/en |
| `title` | string | Có | Tiêu đề |
| `summary` | text | Có | Tóm tắt hấp dẫn nhưng có nguồn |
| `hero_metric_ids` | JSON | Không | Chỉ số nổi bật |
| `map_config` | JSON | Không | Lớp bản đồ mở mặc định |
| `cta_config` | JSON | Có | CTA tiếp theo |
| `source_ids` | JSON | Có | Nguồn của nội dung |
| `last_updated_at` | datetime | Có | Cập nhật lần cuối |
| `status` | enum | Có | draft/reviewed/published/expired |

## 9.18. Bảng `investment_opportunities`

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---:|---|
| `opportunity_id` | UUID | Có | Khóa chính |
| `code` | string | Có | Mã cơ hội |
| `title` | string | Có | Tên cơ hội |
| `description` | text | Có | Mô tả |
| `geo_id` | UUID | Có | Địa điểm |
| `sector_ids` | JSON | Có | Ngành liên quan |
| `opportunity_type` | enum | Có | project/site/industrial_park/partnership/other |
| `investment_range_min` | decimal | Không | Khoảng đầu tư tối thiểu |
| `investment_range_max` | decimal | Không | Khoảng đầu tư tối đa |
| `investment_currency` | string | Không | USD/VND/... |
| `area_value` | decimal | Không | Diện tích |
| `area_unit` | string | Không | ha/m2/... |
| `readiness_status` | enum | Có | early_stage/available/under_review/closed |
| `legal_status` | enum | Có | not_reviewed/source_recorded/needs_check/verified_separately |
| `incentive_ids` | JSON | Không | Ưu đãi liên quan |
| `highlight_metric_ids` | JSON | Không | Chỉ số nổi bật có nguồn |
| `contact_id` | UUID | Không | Đầu mối |
| `source_ids` | JSON | Có | Nguồn |
| `published_at` | datetime | Không | Ngày công bố |
| `expires_at` | datetime | Không | Ngày hết hạn |
| `status` | enum | Có | draft/review/published/expired/archived |

## 9.19. Bảng `investment_incentives`

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---:|---|
| `incentive_id` | UUID | Có | Khóa chính |
| `title` | string | Có | Tên ưu đãi |
| `description` | text | Có | Nội dung tóm tắt |
| `sector_scope` | JSON | Có | Ngành áp dụng |
| `geo_scope` | JSON | Có | Phạm vi địa lý |
| `investor_scope` | JSON | Có | Loại nhà đầu tư |
| `eligibility_note` | text | Có | Điều kiện sơ bộ |
| `legal_reference_ids` | JSON | Có | Văn bản nguồn |
| `valid_from` | date | Không | Hiệu lực |
| `valid_to` | date | Không | Hết hiệu lực |
| `status` | enum | Có | draft/review/published/expired |

## 9.20. Bảng `investment_contacts`

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---:|---|
| `contact_id` | UUID | Có | Khóa chính |
| `organization_name` | string | Có | Đơn vị tiếp nhận |
| `contact_name` | string | Không | Người phụ trách |
| `email` | string | Có | Email công việc |
| `phone` | string | Không | Điện thoại |
| `language_codes` | JSON | Có | Ngôn ngữ hỗ trợ |
| `sector_ids` | JSON | Không | Ngành phụ trách |
| `geo_ids` | JSON | Không | Địa bàn phụ trách |
| `routing_priority` | integer | Có | Thứ tự routing |
| `status` | enum | Có | active/inactive |

## 9.21. Bảng `investment_inquiries`

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---:|---|
| `inquiry_id` | UUID | Có | Khóa chính |
| `investor_name` | string | Có | Họ tên |
| `job_title` | string | Không | Chức danh |
| `company_name` | string | Có | Công ty |
| `country_code` | string | Có | Quốc gia |
| `business_email` | string | Có | Email |
| `phone` | string | Không | Điện thoại |
| `sector_ids` | JSON | Có | Ngành quan tâm |
| `geo_ids` | JSON | Không | Địa bàn quan tâm |
| `opportunity_ids` | JSON | Không | Cơ hội đã xem |
| `investment_range` | JSON | Không | Khoảng vốn |
| `expected_timeline` | string | Không | Thời gian dự kiến |
| `investment_type` | enum | Không | greenfield/jv/ma/expansion/other |
| `support_requested` | JSON | Có | Loại hỗ trợ |
| `message` | text | Không | Nội dung |
| `consent_version` | string | Có | Phiên bản consent |
| `consented_at` | datetime | Có | Thời điểm đồng ý |
| `assigned_contact_id` | UUID | Không | Đầu mối |
| `status` | enum | Có | submitted/assigned/in_progress/contacted/qualified/closed |
| `created_at` | datetime | Có | Thời điểm gửi |

## 9.22. Bảng `conversion_events`

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---:|---|
| `event_id` | UUID | Có | Khóa chính |
| `event_type` | enum | Có | profile_view/map_interaction/shortlist/download/inquiry |
| `anonymous_session_id` | string | Không | Session không định danh |
| `user_id` | UUID | Không | Nếu đã đăng nhập |
| `subject_type` | string | Không | profile/opportunity/geo |
| `subject_id` | UUID | Không | Đối tượng |
| `language` | string | Không | Ngôn ngữ |
| `occurred_at` | datetime | Có | Thời điểm |
| `metadata` | JSON | Không | Metadata tối thiểu |

---

# 10. Chuẩn hóa dữ liệu, chất lượng và quản trị

## 10.1. Pipeline dữ liệu

```text
1. Xác định nhu cầu dữ liệu
2. Tìm nguồn
3. Đăng ký source registry
4. Kiểm tra license/quyền dùng
5. Thu thập file/API
6. Lưu raw snapshot
7. Mapping cột
8. Chuẩn hóa địa giới
9. Chuẩn hóa kỳ và đơn vị
10. Kiểm tra phạm vi và trùng lặp
11. Kiểm tra giá trị bất thường
12. Gắn quality status
13. Review
14. Publish dataset version
15. Tạo index/cache bản đồ
16. Theo dõi cập nhật
```

## 10.2. Các bước kiểm tra bắt buộc

### Kiểm tra schema

- đủ cột bắt buộc;
- đúng kiểu dữ liệu;
- đúng format ngày;
- đúng mã địa bàn;
- không có cột ngoài kiểm soát chứa dữ liệu nhạy cảm.

### Kiểm tra phạm vi

- phần trăm nằm trong 0–100 hoặc 0–1 theo quy ước;
- số người không âm;
- doanh thu không âm;
- tọa độ nằm trong phạm vi hợp lý;
- kỳ đo hợp lệ;
- đơn vị nằm trong danh mục.

### Kiểm tra quan hệ

- observation phải tham chiếu indicator tồn tại;
- geo ID phải thuộc geography version;
- source ID phải tồn tại;
- survey aggregate phải tham chiếu study/question/segment;
- child geo phải có parent hợp lệ.

### Kiểm tra trùng lặp

Khóa logic tối thiểu:

```text
(geo_id, indicator_id, period_start, period_end, scope, dataset_version_id)
```

Nếu trùng:

- tự động reject nếu cùng giá trị và cùng nguồn;
- đưa vào review nếu khác giá trị;
- không tự chọn bản ghi có giá trị cao hơn.

### Kiểm tra tính tương thích

- cùng định nghĩa;
- cùng kỳ;
- cùng đơn vị;
- cùng scope;
- cùng geography level;
- cùng hoặc crosswalk version hợp lệ.

## 10.3. Chất lượng dữ liệu

Mỗi dataset và observation có thể có các dimension:

- `completeness` — độ đầy đủ;
- `accuracy` — độ chính xác theo nguồn;
- `timeliness` — độ mới;
- `consistency` — tính nhất quán;
- `lineage` — khả năng truy vết;
- `license_compliance` — quyền sử dụng.

### Nhãn tổng hợp

#### Verified

Nguồn có thẩm quyền, metadata đầy đủ, đã được kiểm tra.

#### Supported/Estimated

Có nguồn hoặc phương pháp nhưng còn giới hạn, mô hình hóa hoặc chưa kiểm tra đầy đủ.

#### Unavailable

Không có dữ liệu, không được phép dùng, không tương thích hoặc chưa đủ metadata.

## 10.4. Freshness policy

Mỗi indicator cần có chính sách tươi dữ liệu:

| Loại dữ liệu | Ngưỡng gợi ý |
|---|---:|
| Dân số năm | 18 tháng |
| Kinh tế tháng/quý | 6 tháng |
| POI/đối thủ | 3–6 tháng |
| Pháp lý | kiểm tra khi có thay đổi |
| Khảo sát | theo từng study |
| Geometry | theo phiên bản địa giới |

Đây là cấu hình ban đầu, cần được Product/Data Owner phê duyệt. Hệ thống phải hiển thị ngày cập nhật, không tự biến dữ liệu cũ thành dữ liệu hiện tại.

## 10.5. Versioning

Version phải áp dụng cho:

- địa giới;
- geometry;
- source snapshot;
- indicator definition;
- dataset;
- formula;
- decision scenario;
- report.

Một báo cáo phải tái hiện được cùng kết quả khi dùng đúng các version đã lưu, trừ khi nguồn ngoài không còn truy cập được; khi đó phải dùng raw snapshot đã lưu hợp pháp.

---

# 11. Logic decision support

## 11.1. Khái niệm

Decision support chỉ trả lời câu hỏi:

> Với các tiêu chí và dữ liệu được chọn, địa bàn nào đáng được nghiên cứu tiếp hơn?

Nó không trả lời:

> Địa bàn nào chắc chắn sinh lời?

## 11.2. Quy trình tính điểm

### Bước 1 — Chọn tập địa bàn

Tập địa bàn phải được lưu trong scenario. Nếu thay đổi tập địa bàn, phải tính lại normalization.

### Bước 2 — Chọn criteria

Ví dụ:

1. `Market Scale` — quy mô thị trường.
2. `Customer Evidence` — bằng chứng nhu cầu.
3. `Competition` — môi trường cạnh tranh.
4. `Accessibility` — khả năng tiếp cận.

### Bước 3 — Chọn indicators

Mỗi criterion có một hoặc nhiều indicator. Indicator phải có `score_eligible=true`.

### Bước 4 — Chuẩn hóa

Với chỉ tiêu càng cao càng tốt:

```text
s_i(g) = 100 × (x_i(g) - min_i) / (max_i - min_i)
```

Với chỉ tiêu càng thấp càng tốt:

```text
s_i(g) = 100 × (max_i - x_i(g)) / (max_i - min_i)
```

Trường hợp `max_i = min_i`:

- không tự gán 100;
- đánh dấu indicator không phân biệt được;
- loại khỏi score hoặc yêu cầu người dùng xác nhận policy.

### Bước 5 — Tính điểm có trọng số

```text
Score(g) = Σ (w_i × s_i(g))
```

Trong đó:

- `w_i` là trọng số đã chuẩn hóa về tổng 1;
- `s_i(g)` là điểm 0–100;
- score chỉ có ý nghĩa trong tập địa bàn và snapshot hiện tại.

## 11.3. Missing data policy

### Policy mặc định: reject required score

Nếu một criterion bắt buộc thiếu dữ liệu:

- `overall_score = NULL`;
- `eligibility_status = INSUFFICIENT`;
- không xếp hạng;
- hiển thị danh sách thiếu.

### Policy partial score

Chỉ cho phép nếu người dùng chủ động chọn và hệ thống:

- hiển thị tỷ lệ criteria có dữ liệu;
- giảm confidence;
- không gọi là ranking đầy đủ;
- không được dùng trong báo cáo chính thức nếu thiếu quá ngưỡng.

### Không được làm

- thay NULL bằng 0;
- thay bằng trung bình;
- thay bằng giá trị tỉnh lân cận;
- thay bằng dân số;
- thay bằng dự đoán chưa công bố phương pháp.

## 11.4. Confidence và coverage

Có thể hiển thị hai thông số phụ:

```text
coverage = số indicator có dữ liệu hợp lệ / số indicator yêu cầu
```

```text
evidence_confidence = hàm(quality, freshness, source completeness, survey method)
```

Ở B-Lite, confidence nên là nhãn giải thích, không nên tạo một công thức phức tạp thiếu cơ sở. Có thể dùng:

- `High` — đủ dữ liệu, Verified, metadata đầy đủ;
- `Medium` — có một phần Supported/Estimated;
- `Low` — nhiều proxy hoặc dữ liệu cũ;
- `Insufficient` — không được xếp hạng.

## 11.5. Ví dụ demo bắt buộc gắn nhãn

Có thể dùng dữ liệu giả định:

| Tiêu chí | Trọng số | Khu vực A | Khu vực B |
|---|---:|---:|---:|
| Quy mô thị trường | 30% | 72 | 66 |
| Bằng chứng nhu cầu | 25% | 68 | 74 |
| Môi trường cạnh tranh | 25% | 55 | 75 |
| Khả năng tiếp cận | 20% | 80 | 60 |
| Điểm tổng | 100% | 68,35 | 69,05 |

Phải ghi rõ:

> Dữ liệu A/B chỉ dùng để kiểm thử công thức và giao diện, không đại diện cho địa phương thật và không phải khuyến nghị đầu tư.

---

# 12. Thiết kế giao diện

## 12.1. IA — Information Architecture

```text
Application
├── Invest in Vietnam
│   ├── Country Overview
│   ├── Explore Map
│   ├── Sectors
│   ├── Provinces
│   ├── Opportunities
│   ├── Incentives
│   ├── Success Stories
│   └── Contact / Investment Inquiry
├── Dashboard
├── Market Entry Scenarios
│   ├── Scenario Overview
│   ├── Research Questions
│   ├── Map Workspace
│   ├── Comparison
│   ├── Customer Evidence
│   ├── Decision Support
│   ├── Legal Readiness
│   ├── Research Gaps
│   └── Reports
├── Data Catalog
│   ├── Indicators
│   ├── Sources
│   ├── Datasets
│   ├── Geography Versions
│   └── Quality Reviews
├── Research Management
│   ├── Segments
│   ├── Survey Studies
│   ├── Questions
│   └── Aggregates
└── Administration
    ├── Users
    ├── Organizations
    ├── Roles
    └── Audit Logs
```

## 12.1A. Màn hình public P01 — Invest in Vietnam

Đây là màn hình quan trọng nhất để đạt mục tiêu thu hút nhà đầu tư nước ngoài.

### Khu vực hero

- thông điệp ngắn về Việt Nam;
- một hoặc hai số liệu nổi bật có nguồn;
- bản đồ nền tối giản;
- CTA `Explore opportunities`;
- CTA `Find your location`;
- CTA `Talk to an investment advisor`;
- lựa chọn ngôn ngữ Việt/Anh.

### Khu vực country proof points

Hiển thị các nhóm:

- market scale;
- economic growth;
- population and workforce;
- trade/connectivity;
- digital economy;
- FDI context;
- strategic location.

Mỗi card phải có:

- value;
- unit;
- period;
- source;
- last updated;
- short explanation of what the value does and does not mean.

### Khu vực Explore by map

- bản đồ toàn quốc;
- chọn tỉnh/thành;
- layer selector;
- search;
- highlight opportunity;
- legend;
- nút mở province profile.

### Khu vực Explore by sector

- manufacturing;
- technology/digital;
- logistics;
- renewable energy;
- agriculture/food;
- healthcare;
- tourism;
- retail/consumer;
- các ngành khác do quản trị viên cấu hình.

Không được mặc định khẳng định ngành nào “hấp dẫn nhất” nếu chưa có tiêu chí và nguồn. Có thể dùng nhãn `Featured sectors` hoặc `Sectors to explore`.

### Khu vực CTA cuối trang

- tải Vietnam Investor Guide;
- xem opportunity directory;
- gửi investment inquiry;
- đăng ký nhận cập nhật;
- xem nguồn dữ liệu và methodology.

## 12.1B. Màn hình public P02 — Sector Landing Page

### Nội dung

- sector overview;
- market context;
- reasons to explore Vietnam, có nguồn;
- bản đồ địa bàn liên quan;
- các chỉ tiêu phù hợp ngành;
- doanh nghiệp/hệ sinh thái;
- hạ tầng và nhân lực;
- opportunities;
- legal/entry considerations;
- success stories nếu đã được duyệt;
- CTA tạo shortlist hoặc inquiry.

## 12.1C. Màn hình public P03 — Province Investor Profile

### Nội dung

- overview tỉnh/thành;
- map location;
- population/workforce;
- economy;
- infrastructure/logistics;
- industrial parks/clusters;
- business ecosystem;
- available opportunities;
- investment incentives với điều kiện và nguồn;
- legal checklist;
- comparison CTA;
- contact CTA.

## 12.1D. Màn hình public P04 — Opportunity Detail

### Nội dung

- tên và mã cơ hội;
- bản đồ vị trí;
- địa bàn;
- ngành;
- quy mô/diện tích;
- hạ tầng;
- readiness status;
- legal status;
- incentive;
- nguồn và ngày cập nhật;
- contact;
- nút `Save to shortlist`;
- nút `Ask about this opportunity`.

## 12.1E. Màn hình public P05 — Investment Inquiry

Form phải ngắn, rõ và tạo cảm giác an toàn:

- thông tin người gửi;
- nhu cầu đầu tư;
- cơ hội/địa bàn đã chọn;
- yêu cầu hỗ trợ;
- consent;
- chính sách dữ liệu;
- thông báo thời gian phản hồi dự kiến.

## 12.1F. Màn hình public P06 — Shortlist

Cho phép nhà đầu tư:

- lưu địa bàn;
- lưu sector;
- lưu opportunity;
- thêm note cá nhân;
- so sánh các mục đã lưu;
- tải shortlist;
- gửi inquiry dựa trên shortlist.

## 12.2. Màn hình S01 — Dashboard

### Thành phần

- danh sách scenario;
- trạng thái scenario;
- số địa bàn đã chọn;
- số nguồn dữ liệu;
- cảnh báo mới;
- lần xuất báo cáo gần nhất;
- nút tạo scenario;
- link data catalog.

### Empty state

Nếu chưa có scenario:

> Bắt đầu bằng cách tạo một bài toán nghiên cứu ngành, phân khúc và địa bàn.

## 12.3. Màn hình S02 — Create Scenario

### Trường bắt buộc

- Scenario name.
- Research objective.
- Sector hoặc “chưa xác định”.
- Business model.
- Target segment.

### Trường tùy chọn

- investor country;
- channel;
- risk preference;
- initial geographies;
- target decision date;
- notes.

## 12.4. Màn hình S03 — Map Workspace

### Layout

- thanh trên: scenario, geography version, period;
- panel trái: search và filter;
- trung tâm: bản đồ;
- panel phải: layers và legend;
- bottom sheet/popup: provenance và warnings.

### Layer control

Mỗi layer hiển thị:

- tên;
- domain;
- period;
- source;
- quality;
- coverage;
- toggle;
- nút xem metadata.

## 12.5. Màn hình S04 — Market Profile

### Tab

1. Overview.
2. Population.
3. Economy.
4. Businesses.
5. Competitors/POI.
6. Logistics.
7. Ecommerce.
8. Customer Evidence.
9. Legal.
10. Data Gaps.

### Thẻ thông tin

Mỗi metric card phải có:

- label;
- value;
- unit;
- period;
- quality badge;
- source link;
- limitation icon nếu có;
- last checked.

## 12.6. Màn hình S05 — Comparison

### Thành phần

- danh sách địa bàn;
- bộ lọc indicator;
- bảng so sánh;
- biểu đồ;
- compatibility banner;
- nút xem nguồn;
- nút tạo decision scenario từ comparison.

## 12.7. Màn hình S06 — Customer Evidence

### Khi có dữ liệu

Hiển thị:

- segment;
- study;
- top unmet needs;
- channel preference;
- willingness-to-pay band;
- frequency;
- B2B criteria;
- sample size;
- method;
- fieldwork period;
- representativeness note.

### Khi chưa có dữ liệu

Hiển thị nổi bật:

> Chưa có bằng chứng needs/wants cho phân khúc và địa bàn này.

Kèm nút:

- tạo research question;
- tạo survey study;
- xem proxy context nhưng phải gắn nhãn “không phải nhu cầu đã xác nhận”.

## 12.8. Màn hình S07 — Decision Support

### Bước wizard

1. Chọn địa bàn.
2. Chọn mục tiêu.
3. Chọn tiêu chí.
4. Chọn indicator.
5. Đặt trọng số.
6. Chọn policy thiếu dữ liệu.
7. Review assumptions.
8. Calculate.
9. View result.

### Result card

- score hoặc “insufficient evidence”;
- criterion breakdown;
- data used;
- data missing;
- warnings;
- confidence;
- source snapshot;
- nút xuất báo cáo.

## 12.9. Màn hình S08 — Data Catalog

### Tìm kiếm

- indicator code/name;
- domain;
- geography level;
- period type;
- score eligibility;
- proxy flag;
- source;
- status.

### Indicator detail

- definition;
- unit;
- formula;
- polarity;
- scope;
- related sources;
- sample values;
- last update;
- use limitations.

## 12.10. Màn hình S09 — Data Import/Review

### Bước import

1. Chọn loại dataset.
2. Upload file.
3. Map columns.
4. Chọn geography version.
5. Chọn source.
6. Chạy validation.
7. Xem lỗi/cảnh báo.
8. Sửa hoặc tải file lỗi.
9. Submit review.
10. Publish khi được duyệt.

---

# 13. API và tích hợp kỹ thuật

## 13.1. Nguyên tắc API

- REST JSON cho B-Lite backend.
- API versioning, ví dụ `/api/v1`.
- pagination cho danh sách lớn.
- filter explicit, không dùng query mơ hồ.
- trả metadata và warnings cùng dữ liệu.
- không trả giá trị thiếu thành 0.
- mọi endpoint thay đổi dữ liệu phải có authorization và audit.

## 13.2. API scenario

```http
POST /api/v1/market-scenarios
GET  /api/v1/market-scenarios
GET  /api/v1/market-scenarios/{id}
PATCH /api/v1/market-scenarios/{id}
POST /api/v1/market-scenarios/{id}/clone
```

## 13.3. API geography

```http
GET /api/v1/geography/versions
GET /api/v1/geography/units?version_id=&level=&q=
GET /api/v1/geography/units/{geo_id}
GET /api/v1/geography/units/{geo_id}/boundary
GET /api/v1/geography/crosswalks?from=&to=
```

## 13.4. API indicators và observations

```http
GET /api/v1/indicators
GET /api/v1/indicators/{indicator_id}
GET /api/v1/observations?geo_id=&indicator_id=&period=&quality=
POST /api/v1/observations/import
GET /api/v1/observations/{id}/provenance
```

## 13.5. API comparison

```http
POST /api/v1/comparisons/validate
POST /api/v1/comparisons/run
GET  /api/v1/comparisons/{id}
```

Response phải có dạng logic tương tự:

```json
{
  "geographies": [],
  "comparable_indicators": [],
  "warnings": [],
  "incompatible_indicators": [],
  "missing_data": [],
  "dataset_snapshot": {}
}
```

## 13.6. API customer evidence

```http
GET /api/v1/segments
GET /api/v1/survey-studies
POST /api/v1/survey-studies
POST /api/v1/survey-studies/{id}/aggregates/import
GET /api/v1/customer-evidence?sector_id=&segment_id=&geo_id=
```

## 13.7. API decision support

```http
POST /api/v1/decision-scenarios/validate
POST /api/v1/decision-scenarios/calculate
GET  /api/v1/decision-scenarios/{id}
GET  /api/v1/decision-scenarios/{id}/explanation
```

## 13.8. API public investor attraction

```http
GET  /api/v1/public/country-profile?language=en
GET  /api/v1/public/sectors?language=en&featured=true
GET  /api/v1/public/sectors/{sector_id}/profile?language=en
GET  /api/v1/public/provinces/{geo_id}/investor-profile?language=en
GET  /api/v1/public/opportunities?sector_id=&geo_id=&status=published
GET  /api/v1/public/opportunities/{opportunity_id}?language=en
GET  /api/v1/public/incentives?sector_id=&geo_id=
GET  /api/v1/public/contacts?sector_id=&geo_id=
POST /api/v1/public/shortlists
POST /api/v1/public/investment-inquiries
GET  /api/v1/public/investment-inquiries/{reference_code}/confirmation
POST /api/v1/public/conversion-events
```

### Quy tắc public API

- chỉ trả nội dung `published`;
- không trả source restricted;
- không trả dữ liệu cá nhân;
- mọi chỉ số public phải có last updated;
- claim định lượng phải có source reference;
- opportunity hết hạn không xuất hiện trong danh sách active;
- inquiry endpoint có rate limit, bot protection và validation;
- không expose email cá nhân của contact nếu không được phép.

## 13.9. API export

```http
POST /api/v1/exports
GET  /api/v1/exports/{id}
GET  /api/v1/exports/{id}/download
```

Export request phải lưu:

- loại report;
- scenario ID;
- địa bàn;
- filter;
- dataset snapshot;
- công thức version;
- user;
- thời điểm.

---

# 14. Kiến trúc kỹ thuật đề xuất

## 14.1. B-Lite static

Phù hợp để chứng minh workflow nhanh.

```text
Public Investor Attraction Website + Static HTML/CSS/JS
        ↓
Leaflet Map
        ↓
GeoJSON + JSON/CSV
        ↓
Client-side search/filter/compare/scoring
        ↓
LocalStorage shortlist + inquiry endpoint/form service hoặc email gateway
```

### Cấu trúc thư mục gợi ý

```text
market-entry-system/
├── index.html
├── src/
│   ├── app.js
│   ├── map.js
│   ├── search.js
│   ├── comparison.js
│   ├── decision-support.js
│   ├── evidence.js
│   ├── provenance.js
│   ├── validation.js
│   ├── investor-attraction.js
│   ├── opportunities.js
│   ├── shortlist.js
│   ├── inquiry.js
│   └── analytics.js
├── data/
│   ├── geography_versions.json
│   ├── geo_units.json
│   ├── admin_provinces.geojson
│   ├── indicator_definitions.json
│   ├── observations.json
│   ├── source_registry.json
│   ├── survey_aggregates.json
│   ├── market_actors.json
│   ├── legal_references.json
│   ├── demo_scenarios.json
│   ├── investor_profiles.json
│   ├── opportunities.json
│   ├── incentives.json
│   ├── investment_contacts.json
│   └── public_content.json
├── styles/
│   └── app.css
├── tests/
│   ├── scoring.test.js
│   ├── compatibility.test.js
│   ├── validation.test.js
│   └── search.test.js
└── docs/
    └── data-dictionary.md
```

## 14.2. Production architecture

```text
Web Client
   ↓
API Gateway / Backend
   ├── Auth & RBAC
   ├── Scenario Service
   ├── Geography Service
   ├── Indicator/Observation Service
   ├── Survey Evidence Service
   ├── Decision Support Service
   ├── Legal Checklist Service
   ├── Export Service
   └── Audit Service
        ↓
PostgreSQL + PostGIS
        ↓
Object Storage: raw files, reports, snapshots
        ↓
ETL/Validation Jobs
        ↓
External licensed sources
```

## 14.3. Technology options

### Option A — Static demo

- Leaflet;
- vanilla JavaScript hoặc React;
- JSON/CSV;
- GeoJSON;
- Chart.js;
- no backend.

Ưu điểm: nhanh, rẻ, dễ demo. Nhược điểm: không phù hợp dữ liệu lớn, multi-user, workflow review thật.

### Option B — Web app production sớm

- React/Vue;
- Node.js/NestJS hoặc Python/FastAPI;
- PostgreSQL/PostGIS;
- object storage;
- REST API;
- background jobs.

Ưu điểm: mở rộng tốt. Nhược điểm: chi phí và thời gian lớn hơn, cần DevOps/security.

### Khuyến nghị

Làm Option A để chốt nghiệp vụ và kiểm tra workflow, nhưng thiết kế schema và data contracts đủ sạch để chuyển sang Option B mà không viết lại logic nghiệp vụ.

---

# 15. Bảo mật, dữ liệu cá nhân và bản quyền

## 15.1. Dữ liệu cá nhân

Ưu tiên chỉ lưu dữ liệu tổng hợp không định danh. Nếu thu thập dữ liệu khảo sát cá nhân:

- phải có mục đích rõ ràng;
- có căn cứ xử lý phù hợp;
- giới hạn quyền truy cập;
- quy định thời hạn lưu;
- mã hóa khi truyền và khi lưu;
- có cơ chế xóa hoặc ẩn danh theo chính sách;
- không đưa raw response vào báo cáo public;
- log việc truy cập dữ liệu nhạy cảm.

## 15.2. Bản đồ và POI

Mỗi nguồn geometry/POI phải có:

- license;
- yêu cầu ghi công;
- quyền lưu trữ;
- quyền biến đổi;
- quyền chia sẻ;
- quyền thương mại hóa;
- hạn chế cache hoặc tile nếu có.

Không sao chép dữ liệu từ dịch vụ bản đồ khác nếu chưa có quyền.

## 15.3. Kiểm soát truy cập

- RBAC theo organization;
- tenant isolation nếu là SaaS;
- restricted source không được public;
- audit mọi export dữ liệu;
- audit thay đổi quality status;
- secret không lưu trong source code;
- backup và restore test định kỳ.

---

# 16. Báo cáo và nội dung phải hiển thị

## 16.1. Market Profile Report

### Nội dung

1. Tên scenario.
2. Địa bàn.
3. Geography version.
4. Tóm tắt bối cảnh.
5. Bảng population.
6. Bảng economy.
7. Businesses/competition.
8. Supply/logistics.
9. Ecommerce.
10. Customer evidence.
11. Legal checklist.
12. Data gaps.
13. Sources.
14. Limitations.

### Disclaimer bắt buộc

> Hồ sơ là tổng hợp thông tin phục vụ nghiên cứu thị trường. Các chỉ tiêu không tự động đại diện cho nhu cầu, sức mua, thị phần, hiệu quả kinh doanh hoặc khả năng sinh lời của một dự án cụ thể.

## 16.2. Comparison Report

Phải có:

- danh sách địa bàn;
- thời điểm tạo;
- period;
- indicator definitions;
- bảng so sánh;
- compatibility warnings;
- nguồn từng chỉ tiêu;
- dữ liệu thiếu;
- không gian suy diễn.

## 16.3. Decision Report

Phải có:

- mục tiêu;
- tập địa bàn;
- tiêu chí;
- trọng số;
- polarity;
- normalization method;
- formula version;
- data snapshot;
- score từng tiêu chí;
- score tổng hoặc lý do không tính;
- confidence/coverage;
- warnings;
- research gaps;
- disclaimer không phải investment advice.

---

# 17. Kiểm thử

## 17.1. Unit test

### Scoring

- tổng trọng số hợp lệ;
- trọng số âm bị từ chối;
- công thức higher-is-better;
- công thức lower-is-better;
- max bằng min;
- thiếu observation;
- dữ liệu `Unavailable`;
- rounding;
- thứ tự xếp hạng chỉ khi eligible.

### Compatibility

- cùng indicator/period/unit;
- khác period;
- khác unit;
- khác geography version;
- crosswalk approved;
- crosswalk chưa approved;
- khác scope.

### Validation

- mã địa bàn không tồn tại;
- value âm;
- phần trăm ngoài range;
- duplicate row;
- thiếu source;
- thiếu license;
- thiếu period.

### Search

- exact name;
- partial name;
- no accent;
- code;
- duplicate names;
- cấp địa lý.

## 17.2. Integration test

1. Import source → dataset → observation → map.
2. Observation → comparison → provenance.
3. Survey study → aggregate → customer evidence.
4. Criteria → calculate → explanation → export.
5. Geography version → crosswalk → compare.
6. User role → permission → audit.

## 17.3. End-to-end test

### E2E-01 — Scenario hoàn chỉnh

1. Tạo scenario.
2. Chọn ngành.
3. Chọn phân khúc.
4. Chọn Hà Nội và TP.HCM.
5. Bật population/economy layer.
6. Xem popup.
7. So sánh.
8. Xem customer evidence chưa có.
9. Tạo decision scenario.
10. Hệ thống từ chối nếu thiếu evidence bắt buộc.
11. Xuất research gap report.

### E2E-02 — Scenario có dữ liệu demo đầy đủ

1. Nạp bộ dữ liệu demo.
2. Tạo criteria.
3. Chọn trọng số.
4. Tính điểm.
5. Kiểm tra breakdown.
6. Thay trọng số.
7. Kiểm tra kết quả thay đổi.
8. Xuất báo cáo có snapshot.

## 17.4. T01–T06 nghiệm thu

### T01 — Map layer

**Hành động:** chọn tỉnh, bật/tắt layer, mở popup.

**Pass:** đúng địa bàn, đơn vị, kỳ, nguồn, geometry version và quality badge.

### T02 — Search

**Hành động:** tìm tỉnh/xã và lọc theo điều kiện số liệu.

**Pass:** trả đúng kết quả; missing có nhãn; không coi missing là zero.

### T03 — Cross-market compare

**Hành động:** chọn 2–3 địa bàn.

**Pass:** so sánh chỉ tiêu tương thích; cảnh báo khác nguồn/kỳ/định nghĩa.

### T04 — Customer insight

**Hành động:** chọn segment có và không có survey.

**Pass:** có mẫu/phương pháp hoặc hiển thị chưa có bằng chứng.

### T05 — Decision score

**Hành động:** đổi trọng số.

**Pass:** tính đúng, giải thích được, không tính khi thiếu bắt buộc.

### T06 — Traceability

**Hành động:** click một giá trị.

**Pass:** xem được source, URL, ngày kiểm tra, license, method và version.

---

# 18. Bộ dữ liệu demo tối thiểu

## 18.1. Phạm vi demo

Để demo workflow, chọn 2–3 địa bàn có dữ liệu tương đồng. Có thể dùng Hà Nội và TP.HCM làm ví dụ thống kê thương mại, nhưng không được dùng ví dụ đó để khẳng định địa phương nào phù hợp hơn cho một ngành cụ thể.

## 18.2. Dữ liệu bắt buộc

### Geography

- 34 tỉnh/thành theo phiên bản đang được phê duyệt;
- tối thiểu polygon hợp lệ cho 2–3 địa bàn demo;
- danh mục xã/phường nếu có;
- source và license;
- geometry status.

### Indicators

Tối thiểu 3 chỉ tiêu có cùng kỳ/định nghĩa cho các địa bàn demo:

1. population hoặc một chỉ tiêu quy mô;
2. retail/services;
3. một chỉ tiêu kinh tế hoặc business;
4. một chỉ tiêu optional về competition/accessibility nếu đã có nguồn.

### Sources

- publisher;
- title;
- URL;
- license;
- collected_at;
- verified_at;
- citation;
- limitations.

### Survey

Nếu chưa có khảo sát thật, dùng file mẫu nhưng bắt buộc gắn:

```text
data_status = DEMO_SYNTHETIC
```

Không được trình bày dữ liệu giả định là insight thật.

### Decision scenario

- trọng số;
- formula version;
- normalization;
- missing data policy;
- expected output;
- test fixture.

## 18.3. Cấu trúc file CSV/JSON gợi ý

### `observations.csv`

```csv
observation_id,geo_code,indicator_code,period_start,period_end,period_label,value_numeric,unit,scope,source_id,dataset_version_id,quality_status,verified_at,limitations
```

### `source_registry.csv`

```csv
source_id,publisher,title,url,source_type,license,access_right,collected_at,verified_at,citation_text,status,notes
```

### `survey_aggregates.csv`

```csv
aggregate_id,study_id,question_code,segment_code,geo_code,n,estimate_numeric,estimate_unit,category,quality_status,publication_note,data_status
```

### `decision_scenarios.json`

```json
{
  "scenario_id": "demo-001",
  "name": "Demo weighted comparison",
  "geographies": ["A", "B"],
  "criteria": [
    {
      "code": "MARKET_SCALE",
      "weight": 0.3,
      "indicators": ["RETAIL_TOTAL"],
      "polarity": "higher_is_better"
    }
  ],
  "missing_data_policy": "reject",
  "formula_version": "mcda-v1"
}
```

---

# 19. Kế hoạch triển khai đề xuất

## Phase 0 — Chốt yêu cầu và data contract

### Công việc

- xác định user persona;
- chốt một ngành demo;
- phỏng vấn tối thiểu 5–15 người dùng mục tiêu;
- chốt 5 câu hỏi Market Entry thật;
- chốt geography version;
- lập source inventory;
- duyệt data dictionary;
- chốt cách gọi “Verified/Supported/Unavailable”.

### Đầu ra

- product brief;
- user stories;
- glossary;
- data dictionary v1;
- source registry draft;
- acceptance criteria.

## Phase 1 — Dữ liệu và nền tảng bản đồ

### Công việc

- chuẩn bị geo units;
- chuẩn bị geometry;
- kiểm tra license;
- chuẩn hóa indicator;
- nạp observations;
- xây map layer;
- hiển thị popup provenance.

### Đầu ra

- map chạy được;
- 3–5 indicator;
- source link;
- quality badge;
- geography version.

## Phase 2 — Search, filter, profile

### Công việc

- search theo tên/mã;
- filter theo kỳ/chỉ tiêu/quality;
- market profile;
- missing data state;
- profile export.

## Phase 3 — Comparison và evidence

### Công việc

- comparison engine;
- compatibility rules;
- survey aggregate schema;
- customer evidence page;
- research gap list.

## Phase 4 — Decision support

### Công việc

- criterion model;
- weighting UI;
- normalization;
- formula engine;
- explanation;
- insufficient evidence state;
- decision report.

## Phase 5 — Data governance và legal

### Công việc

- import validation;
- source registry UI;
- versioning;
- review workflow;
- legal checklist;
- audit log.

## Phase 6 — QA, pilot và nghiệm thu

### Công việc

- unit/integration/E2E;
- user acceptance test;
- kiểm tra lại nguồn;
- kiểm thử quyền;
- kiểm thử export;
- demo end-to-end;
- lập known limitations.

---

# 20. Backlog triển khai theo epic

## EPIC-01 — Product foundation

- tạo application shell;
- routing;
- state management;
- error boundary;
- common loading/empty/error states;
- glossary và disclaimer component.

## EPIC-02 — Geography

- geography version;
- geo unit search;
- boundary loading;
- map renderer;
- geometry validation;
- crosswalk.

## EPIC-03 — Data catalog

- indicator definition;
- source registry;
- dataset version;
- provenance drawer;
- quality badge;
- data freshness.

## EPIC-04 — Observation layer

- observation reader;
- numeric formatting;
- missing data;
- layer styling;
- filter engine.

## EPIC-05 — Market profile

- profile page;
- metric cards;
- domain tabs;
- sources;
- limitations.

## EPIC-06 — Comparison

- selection tray;
- compatibility engine;
- table;
- charts;
- warning states.

## EPIC-07 — Customer evidence

- segment;
- study;
- question;
- aggregate;
- evidence display;
- no-evidence display.

## EPIC-08 — Decision support

- criteria;
- weights;
- normalization;
- score engine;
- explanation;
- missing-data refusal.

## EPIC-09 — Legal readiness

- legal source catalog;
- requirement mapping;
- checklist;
- disclaimer;
- review status.

## EPIC-10 — Export

- report templates;
- CSV/JSON;
- Excel/PDF;
- snapshot;
- export history.

## EPIC-11 — Admin/governance

- users;
- roles;
- import;
- validation;
- approval;
- audit.

## EPIC-12 — QA and observability

- automated tests;
- error logging;
- usage analytics without personal overcollection;
- performance checks;
- data quality dashboard.

---

# 21. User stories quan trọng

## US-01 — Tìm địa bàn

Là một nhà đầu tư, tôi muốn tìm địa phương theo tên hoặc mã để xem hồ sơ thị trường.

### Acceptance criteria

- tìm được tên có dấu và không dấu;
- kết quả cho biết cấp địa lý;
- tên trùng có địa bàn cha;
- click kết quả mở đúng profile.

## US-02 — Xem nguồn của số liệu

Là một analyst, tôi muốn click vào số liệu để biết nguồn, kỳ và phương pháp nhằm đánh giá có nên dùng không.

### Acceptance criteria

- có source;
- có URL/citation;
- có period;
- có unit;
- có quality;
- có limitation nếu có.

## US-03 — So sánh địa bàn

Là một nhà đầu tư, tôi muốn so sánh 2–3 địa bàn bằng cùng bộ chỉ tiêu.

### Acceptance criteria

- hiển thị chỉ tiêu chung;
- cảnh báo khác kỳ/định nghĩa;
- không silently mix data;
- có thể xuất bảng.

## US-04 — Kiểm tra nhu cầu

Là một market researcher, tôi muốn biết insight nhu cầu nào đã có bằng chứng.

### Acceptance criteria

- có segment;
- có n và method;
- có study period;
- nếu không có survey hiển thị rõ chưa có bằng chứng.

## US-05 — Chấm điểm có điều kiện

Là một analyst, tôi muốn đặt trọng số theo chiến lược công ty.

### Acceptance criteria

- tổng trọng số hợp lệ;
- nhìn thấy formula;
- nhìn thấy điểm từng criterion;
- thiếu dữ liệu bắt buộc thì không xếp hạng.

## US-06 — Quản trị dữ liệu

Là data steward, tôi muốn import dataset và biết dòng nào lỗi.

### Acceptance criteria

- mapping cột;
- validate;
- tải error report;
- dữ liệu lỗi không publish;
- có dataset version.

## US-07 — Checklist pháp lý

Là một nhà đầu tư, tôi muốn biết những điều kiện pháp lý còn phải kiểm tra.

### Acceptance criteria

- checklist gắn với ngành/kênh/địa bàn;
- link văn bản;
- trạng thái chưa rà soát/cần chuyên gia;
- có disclaimer.

---

# 22. Error states và thông điệp giao diện

## 22.1. Thiếu dữ liệu

```text
Chưa có dữ liệu cho địa bàn và kỳ đã chọn.
Không coi trạng thái này là giá trị 0.
```

## 22.2. Không tương thích

```text
Không thể so sánh trực tiếp.
Nguyên nhân: hai chỉ tiêu khác kỳ hoặc khác định nghĩa.
```

## 22.3. Thiếu bằng chứng nhu cầu

```text
Chưa có bằng chứng needs/wants cho phân khúc này.
Các chỉ tiêu dân số/POI bên dưới chỉ là dữ liệu bối cảnh, không phải nhu cầu đã xác nhận.
```

## 22.4. Không đủ điều kiện xếp hạng

```text
Không đủ bằng chứng để xếp hạng.
Thiếu: dữ liệu needs/wants, nguồn logistics và chỉ tiêu cạnh tranh.
```

## 22.5. Dữ liệu ước tính

```text
Supported/Estimated — giá trị có bằng chứng nhưng còn hạn chế hoặc được ước tính.
Xem phương pháp trước khi sử dụng trong decision scenario.
```

## 22.6. Pháp lý

```text
Thông tin này chỉ là checklist nghiên cứu và dẫn nguồn văn bản.
Không phải tư vấn pháp lý và không xác nhận đủ điều kiện gia nhập thị trường.
```

---

# 23. Hiệu năng và khả năng vận hành

## 23.1. B-Lite

- initial load mục tiêu dưới 3–5 giây với bộ dữ liệu demo;
- map interaction không bị treo khi bật/tắt layer;
- search trả kết quả tức thời với dữ liệu nhỏ;
- không tải toàn bộ observation không cần thiết nếu có thể lazy load;
- export không làm crash giao diện.

## 23.2. Production định hướng

- API p95 read dưới 500ms cho truy vấn phổ biến;
- map tile/vector query có cache;
- import dataset chạy background job;
- export lớn chạy asynchronous;
- có health check;
- có backup;
- có monitoring lỗi và latency;
- có data freshness monitoring.

## 23.3. Analytics và conversion tracking

Mục tiêu analytics là đo nhà đầu tư có đi từ xem thông tin tới hành động hay không, không phải thu thập quá mức dữ liệu cá nhân.

### Event cần đo

- `country_profile_view`;
- `map_open`;
- `map_layer_enabled`;
- `geo_profile_view`;
- `sector_profile_view`;
- `opportunity_list_view`;
- `opportunity_view`;
- `search_performed`;
- `comparison_created`;
- `shortlist_added`;
- `investor_profile_downloaded`;
- `legal_checklist_viewed`;
- `inquiry_started`;
- `inquiry_submitted`;
- `inquiry_failed`;
- `contact_clicked`.

### Funnel dashboard

```text
Country views
→ Map/sector/province exploration
→ Opportunity views
→ Shortlist/download
→ Inquiry started
→ Inquiry submitted
→ Assigned/contacted
```

### Quy tắc

- ưu tiên anonymous session ID;
- không đưa email, tên hoặc nội dung inquiry vào analytics event;
- có consent nếu dùng cookie/analytics cần consent;
- có thể phân tích theo ngôn ngữ, nguồn truy cập, quốc gia ở mức tổng hợp;
- không coi một lượt xem là một lead;
- báo cáo conversion phải phân biệt inquiry submitted và inquiry qualified.

---

# 24. Các quyết định cần chốt trước khi code production

Đây là danh sách không được tự đoán. Product Owner/Data Owner phải quyết định:

1. Geography version chính thức đầu tiên là version nào?
2. Có dùng polygon cấp xã/phường không?
3. Nguồn geometry nào được cấp phép?
4. Ngành demo cụ thể là gì?
5. Bộ 3–5 indicator đầu tiên là gì?
6. Dữ liệu nào được dùng để score?
7. Ngưỡng freshness từng domain là bao nhiêu?
8. Survey thật đã có chưa?
9. Ai là Data Owner của từng nguồn?
10. Dữ liệu nào public, internal, restricted?
11. Có cần đăng nhập trong B-Lite không?
12. Có cần multi-tenant không?
13. Có xuất PDF ngay không?
14. Có dùng dữ liệu OSM/POI không và theo license nào?
15. Decision score có được phép dùng partial policy không?
16. Khi score thiếu dữ liệu thì chỉ hiển thị qualitative hay reject hoàn toàn?
17. Ai duyệt legal reference?
18. Ai chịu trách nhiệm xác nhận insight khảo sát?
19. Có cần lưu raw survey response không?
20. Ngôn ngữ giao diện là tiếng Việt, tiếng Anh hay song ngữ?

---

# 25. Các khoảng trống dữ liệu hiện tại cần xử lý

Theo nội dung tài liệu nguồn, các hạng mục dưới đây chưa được coi là đã hoàn thành:

1. Bộ khảo sát khách hàng thật.
2. Dữ liệu needs/wants theo ngành và địa bàn.
3. Polygon địa giới đã xác minh và được phép sử dụng.
4. Crosswalk địa giới cũ/mới có phương pháp được duyệt.
5. Bộ POI toàn quốc đã kiểm chứng.
6. Dữ liệu logistics được cấp phép.
7. Dữ liệu hành vi TMĐT cấp địa phương.
8. Bộ chỉ tiêu chuyên ngành cho từng lĩnh vực.
9. Ngưỡng freshness chính thức.
10. Bằng chứng người dùng sẵn sàng trả tiền.
11. Đánh giá độ chính xác của kết quả decision support.
12. Quy trình pháp lý cụ thể cho từng ngành và kênh.

Những mục này phải xuất hiện trong hệ thống như **research gaps** hoặc **known limitations**, không được che giấu bằng giá trị mặc định.

---

# 26. Tiêu chí “done” cho toàn bộ sản phẩm B-Lite

B-Lite chỉ được đánh dấu hoàn thành khi tất cả điều kiện sau đạt:

## Sản phẩm

- có thể tạo và mở scenario;
- có map workspace;
- có search/filter;
- có comparison;
- có customer evidence state;
- có decision support;
- có legal checklist;
- có export.

## Dữ liệu

- dữ liệu có data dictionary;
- có source registry;
- có geography version;
- có quality status;
- có license;
- có dataset version;
- không dùng missing = 0;
- có dữ liệu demo đủ kiểm tra workflow.

## Nghiệp vụ

- không suy diễn needs từ dân số;
- compatibility được kiểm tra;
- score có công thức;
- score có giải thích;
- thiếu dữ liệu thì từ chối hoặc cảnh báo đúng policy;
- pháp lý có disclaimer;
- kết quả không gọi là ROI.

## Kỹ thuật

- unit test pass;
- integration test pass;
- E2E test pass;
- không có lỗi console nghiêm trọng;
- export mở được;
- dữ liệu snapshot tái hiện được kết quả;
- có logging cơ bản.

## Tài liệu

- có user guide;
- có data dictionary;
- có source catalog;
- có test report;
- có known limitations;
- có hướng dẫn nạp dữ liệu;
- có hướng dẫn demo end-to-end.

## 26.1. Tiêu chí done riêng cho mục tiêu thu hút đầu tư

B-Lite chưa đạt mục tiêu sản phẩm nếu chỉ có map và data table. Phải đạt thêm:

### Public investor journey

- nhà đầu tư mở được trang `Invest in Vietnam`;
- hiểu được thông điệp và các chỉ số tổng quan trong một màn hình;
- chuyển từ country map tới province profile;
- chuyển từ province profile tới sector/opportunity;
- xem được nguồn và ngày cập nhật;
- lưu được shortlist;
- tải được investor profile;
- gửi được investment inquiry;
- nhận được mã xác nhận inquiry;
- inquiry được routing tới một contact có cấu hình.

### Content credibility

- không có claim định lượng public không có source;
- opportunity có status và expiry;
- incentive có văn bản nguồn;
- province profile ghi rõ hạn chế dữ liệu;
- tiếng Anh không dịch sai tên đơn vị hành chính hoặc thuật ngữ pháp lý;
- số liệu public có period và last updated.

### Conversion measurement

- theo dõi được profile view;
- theo dõi được opportunity view;
- theo dõi được shortlist;
- theo dõi được download;
- theo dõi được inquiry started/submitted;
- phân biệt được inquiry submitted với qualified lead.

---

# 27. Kịch bản demo cuối cùng

## Bối cảnh

Một doanh nghiệp nước ngoài muốn nghiên cứu khả năng đưa một nhóm hàng tiêu dùng vào Việt Nam, phục vụ khách hàng B2C đô thị, kết hợp kênh offline và thương mại điện tử.

## Thao tác

1. Tạo scenario `Consumer Product Vietnam Entry — Demo`.
2. Chọn ngành `Consumer Goods`.
3. Chọn B2C.
4. Chọn phân khúc `Urban households`.
5. Chọn Hà Nội và TP.HCM.
6. Mở map.
7. Bật dân số.
8. Bật tổng bán lẻ và dịch vụ.
9. Bật bán lẻ hàng hóa.
10. Xem popup nguồn/kỳ/đơn vị.
11. Mở comparison.
12. Kiểm tra cảnh báo dữ liệu.
13. Mở Customer Evidence.
14. Nếu chưa có khảo sát, hệ thống hiển thị “chưa có bằng chứng”.
15. Tạo research gap cho nhu cầu và willingness-to-pay.
16. Tạo decision scenario với bộ tiêu chí demo.
17. Hệ thống kiểm tra eligibility.
18. Nếu dùng dữ liệu giả định, hiển thị nhãn DEMO.
19. Thay đổi trọng số.
20. Xem breakdown.
21. Xuất comparison report.
22. Xuất research gap report.
23. Kiểm tra report ghi snapshot và disclaimer.

## Kết quả mong đợi

Người dùng hiểu được:

- thị trường đang có những tín hiệu bối cảnh nào;
- hai địa bàn khác nhau ra sao;
- bằng chứng khách hàng đang thiếu ở đâu;
- điểm số chỉ là công cụ sàng lọc theo giả định;
- trước khi đầu tư cần xác minh điều gì.

## 27.1. Kịch bản demo thu hút nhà đầu tư nước ngoài

### Bối cảnh

Một doanh nghiệp nước ngoài truy cập hệ thống để tìm địa điểm đầu tư tại Việt Nam trong lĩnh vực sản xuất hoặc công nghệ.

### Hành trình

1. Chọn ngôn ngữ English.
2. Xem trang `Invest in Vietnam`.
3. Đọc các country proof points: market, workforce, connectivity, digital economy.
4. Mở bản đồ Việt Nam.
5. Bật layer provinces và population.
6. Chọn một tỉnh/thành.
7. Xem province investor profile.
8. Bật layer infrastructure, workforce và business ecosystem.
9. Chọn sector quan tâm.
10. Xem các opportunity cards tương ứng.
11. Mở một opportunity detail.
12. Xem quy mô, vị trí, readiness, incentive và legal status.
13. Lưu opportunity và province vào shortlist.
14. So sánh shortlist.
15. Tải investor profile.
16. Bấm `Discuss this opportunity`.
17. Gửi investment inquiry.
18. Nhận confirmation reference.

### Tiêu chí pass

- toàn bộ hành trình hoàn thành không bị đứt;
- dữ liệu bản đồ và profile cùng phiên bản;
- các claim chính đều có source;
- không xuất hiện opportunity đã hết hạn;
- inquiry được lưu và route đúng contact;
- người dùng hiểu rõ bước tiếp theo sau khi gửi inquiry.

---

# 28. Kết luận build

Để xây hệ thống này đúng với yêu cầu mới, đội triển khai không nên bắt đầu bằng việc vẽ một bản đồ đẹp nhưng đứng riêng lẻ. Thứ tự đúng là:

```text
Chốt quyết định cần hỗ trợ
→ Chốt mục tiêu thu hút đầu tư và investor funnel
→ Chốt ngành và phân khúc demo
→ Chốt geography version
→ Chốt data dictionary
→ Chốt source/license
→ Chuẩn hóa dữ liệu
→ Xây map/search/profile
→ Xây comparison
→ Xây customer evidence
→ Xây decision support
→ Xây country/province/sector/opportunity profiles
→ Xây shortlist và investment inquiry
→ Xây analytics conversion
→ Xây governance/legal/export
→ Test end-to-end
→ Nghiệm thu bằng dữ liệu có nguồn
```

Phiên bản đầu tiên nên là một **B-Lite Investor Attraction Platform có workflow hoàn chỉnh**, gồm:

1. `Invest in Vietnam` public landing page.
2. Country layer và country profile.
3. Province/municipality map layer và investor profile.
4. Ward/commune search; polygon triển khai ngay khi có nguồn hợp lệ.
5. Population và các data layer nền.
6. Visualization, search và comparison.
7. Sector/opportunity directory.
8. Decision support có điều kiện.
9. Shortlist, download và investment inquiry.
10. Source/provenance/quality/last updated.

Không cần bao phủ sâu mọi ngành hoặc mọi xã/phường ngay lập tức. Tuy nhiên, schema, provenance, versioning, quality status, public content workflow và các quy tắc chống suy diễn phải được thiết kế ngay từ đầu. Nếu bỏ qua các phần này, sản phẩm có thể nhìn giống một bản đồ dữ liệu nhưng không đủ hấp dẫn, tin cậy hoặc có khả năng chuyển đổi nhà đầu tư.

Điều kiện quan trọng nhất của hệ thống là khả năng nói rõ ba trạng thái:

1. **Đã có dữ liệu và có thể sử dụng.**
2. **Có dữ liệu nhưng chỉ được dùng có điều kiện.**
3. **Chưa có đủ bằng chứng và hệ thống phải từ chối kết luận.**

Đó là yêu cầu nghiệp vụ trung tâm cần được giữ xuyên suốt từ database, API, giao diện, thuật toán, báo cáo cho tới kiểm thử nghiệm thu.
