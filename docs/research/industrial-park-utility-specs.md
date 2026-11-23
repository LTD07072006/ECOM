# Verified Industrial Park Utility Specs Dossier

Tài liệu đối chiếu thông số kỹ thuật hạ tầng & chứng chỉ ESG của 16 khu công nghiệp / khu công nghệ cao trọng điểm trong [`src/features/map/province-detail-locations.ts`](../../src/features/map/province-detail-locations.ts), chuẩn hóa sẵn theo cấu trúc `utilitySpecs` để ghép vào mã nguồn sau khi OpenCode hoàn tất Phase 1.

> **Nguyên tắc toàn vẹn dữ liệu:** Mọi thông số chưa có con số xác minh rõ ràng (hoặc chỉ công bố dưới dạng khoảng ước lượng không có điểm chuẩn) được giữ nguyên giá trị `null` (hiển thị **"Chưa có dữ liệu"** / **"No data available"** trên UI), tuyệt đối không suy đoán hay ép về `0`.

## Bảng tổng hợp 16 KCN / KCNC trọng điểm

| ID | Mã tỉnh | Tên KCN / KCNC | Tổng quy mô (ha) | Đất sạch sẵn sàng (ha) | Công suất điện (MVA) | Nước thải (m³/ngày) | Hạn thuê đất | Chứng chỉ / Nhãn ESG | Nguồn tham chiếu chính |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| `HN-IZ-HOALAC` | `01` | Khu CNC Hòa Lạc (HHTP) | 1,586 | 220 | 189 | 42,600 | `null` | Eco & Smart City Master Plan | [hhtp.gov.vn](https://hhtp.gov.vn/) |
| `HN-IZ-TLIP` | `01` | KCN Bắc Thăng Long (TLIP I) | 302 | `null` | `null` | 3,000 | 2047 | `null` | [hpa.hanoi.gov.vn](https://hpa.hanoi.gov.vn/) |
| `HN-IZ-QUANGMINH` | `01` | KCN Quang Minh I & II | 344 | `null` | `null` | 3,000 | 2053 | `null` | [roxipark.vn](https://roxipark.vn/) |
| `HP-IZ-DEEPC` | `31` | Tổ hợp DEEP C Hải Phòng I–III | 1,700 | 185 | 626 | 12,000 | `null` | UNIDO-GEIPP Eco-IP (83%+) | [heza.gov.vn](https://heza.gov.vn/) |
| `HP-IZ-VSIP` | `31` | VSIP Hải Phòng | 1,600 | `null` | 200 | 4,500 | `null` | Green Industrial Park Award | [vsip.com.vn](https://www.vsip.com.vn/) |
| `HP-IZ-TRANGDUE` | `31` | KCN Tràng Duệ I–III | 1,088 | `null` | 126 | 5,000 | `null` | `null` | [trangdue-ip.com.vn](https://trangdue-ip.com.vn/) |
| `BN-IZ-YENPHONG` | `24` | KCN Yên Phong I & II-C | 658.71 | `null` | 693 | 40,000 | `null` | `null` | [biza.bacninh.gov.vn](https://biza.bacninh.gov.vn/) |
| `BN-IZ-VSIP` | `24` | VSIP Bắc Ninh I & II | 700 | `null` | 126 | 17,520 | 2057 | `null` | [vsip.com.vn](https://www.vsip.com.vn/) |
| `DN-IZ-DHTP` | `48` | Khu CNC Đà Nẵng | 1,128.4 | 140 | 40 | 18,000 | `null` | `null` | [dhtp.danang.gov.vn](https://dhtp.danang.gov.vn/) |
| `DN-IZ-HOAKHANH` | `48` | KCN Hòa Khánh | 394 | `null` | 80 | 5,000 | 2054 | `null` | [ipa.danang.gov.vn](https://ipa.danang.gov.vn/) |
| `DNA-IZ-LONGTHANH` | `75` | KCN Long Thành & Amata Long Thành | 488 | 115 | 126 | 10,000 | 2053 | `null` | [diza.dongnai.gov.vn](https://diza.dongnai.gov.vn/) |
| `DNA-IZ-NHONTRACH` | `75` | Cụm KCN Nhơn Trạch I–VI | 688 | `null` | 63 | 14,000 | 2058 | `null` | [diza.dongnai.gov.vn](https://diza.dongnai.gov.vn/) |
| `HCM-IZ-SHTP` | `79` | Khu CNC TP.HCM (SHTP) | 913 | `null` | `null` | 5,000 | 2065 | `null` | [shtp.hochiminhcity.gov.vn](https://shtp.hochiminhcity.gov.vn/) |
| `HCM-IZ-HIEPPHUOC` | `79` | KCN Hiệp Phước | 1,686 | `null` | `null` | 12,000 | 2058 | `null` | [hepza.hochiminhcity.gov.vn](https://hepza.hochiminhcity.gov.vn/) |
| `HUE-IZ-CHANMAY` | `46` | KCN Sài Gòn – Chân Mây / KKT | 657 | `null` | 160 | 4,900 | 2078 | `null` | [hue.gov.vn](https://hue.gov.vn/) |
| `CT-IZ-VSIP` | `92` | KCN VSIP Cần Thơ (Vĩnh Thạnh) | 900 | `null` | `null` | 6,000 | 2072 | `null` | [cantho.gov.vn](https://cantho.gov.vn/) |

Dữ liệu máy đọc được lưu tại [`docs/research/industrial-park-utility-specs.json`](./industrial-park-utility-specs.json).
