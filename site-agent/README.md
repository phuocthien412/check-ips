# SABIBECO SITE AGENT (WINDOWS SERVICE)

Site Agent là ứng dụng chạy ngầm trên máy chủ/máy trạm Windows tại mỗi nhà máy trong 7 nhà máy thuộc hệ thống.

## 1. Tính Năng Chính
- **Zero-Driver ARP Scanning**: Quét ARP siêu tốc qua Windows Native API `SendARP` (`iphlpapi.dll`), không cần cài Npcap hay WinPcap.
- **Tự động nhận diện Vendor**: Tích hợp từ điển OUI phát hiện thiết bị Cisco, Aruba, Ruijie, Mikrotik, Hikvision, Dahua,...
- **SNMP Polling**: Thu thập `sysName`, `sysDescr`, `sysUpTime`, và thống kê port traffic.
- **Store-and-Forward**: Tích hợp SQLite đệm dữ liệu cục bộ khi mất mạng Internet, tự động đồng bộ khi có mạng lại.
- **Chạy ngầm dạng Windows Service**: Tự khởi động cùng Windows và tự phục hồi khi có lỗi.

## 2. Cấu hình 7 Nhà Máy (`agent_config.json`)

Tùy vào nhà máy triển khai, sửa `site_code` và `scan_subnets` tương ứng:

| Nhà Máy | `site_code` | `scan_subnets` gợi ý |
| :--- | :--- | :--- |
| **BSG Ninh Thuận** | `BSG_NINH_THUAN` | `["192.168.20.0/24"]` |
| **BSG Phủ Lý** | `BSG_PHU_LY` | `["192.168.30.0/24"]` |
| **NM-Binh Duong** | `NM_BINH_DUONG` | `["192.168.40.0/24", "192.168.41.0/24"]` |
| **NM-Đồng Tháp** | `NM_DONG_THAP` | `["192.168.50.0/24"]` |
| **NM-Hoang Quynh** | `NM_HOANG_QUYNH` | `["192.168.60.0/24"]` |
| **Sabibeco HO** | `SABIBECO_HO` | `["10.10.1.0/24", "10.10.2.0/24"]` |
| **TMDV BSG Bình Tây** | `TMDV_BINH_TAY` | `["192.168.70.0/24"]` |

## 3. Cách Biên Dịch & Cài Đặt

### Bước 1: Cài đặt thư viện Python (môi trường build)
```bash
cd site-agent
pip install -r requirements.txt
```

### Bước 2: Đóng gói thành 1 file .exe duy nhất
```bash
python build_exe.py
```
File thực thi sẽ nằm tại: `site-agent/dist/site_agent.exe`.

### Bước 3: Triển khai tới máy tại Nhà máy
Copy 2 file vào cùng 1 thư mục (VD: `C:\SabibecoAgent\`):
1. `site_agent.exe`
2. `agent_config.json`

### Bước 4: Đăng ký Windows Service (Run as Administrator)
Mở PowerShell bằng quyền Admin tại thư mục đó:
```powershell
.\install_service.ps1 -Install
```
Service sẽ tự động chạy ngầm và gửi dữ liệu mỗi 30-60 giây về Central Server.
