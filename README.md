# 🌐 HỆ THỐNG GIÁM SÁT MẠNG 7 NHÀ MÁY - SABIBECO
> Hệ thống giám sát mạng phân tán, tự động quét phát hiện thiết bị và kiểm tra Ping thời gian thực cho **7 Chi Nhánh Nhà Máy Sabibeco**:
> 1. **BSG Ninh Thuận** (`192.168.20.0/24`) &bull; `NT-77C9D48E177535414FC805FF`
> 2. **BSG Phủ Lý** (`192.168.30.0/24`) &bull; `PL-7BA3DF7289959A03A2ACDF03`
> 3. **NM-Bình Dương** (`192.168.40.0/24`, `192.168.41.0/24`) &bull; `BD-C3687A972CB91B18CCAD167A`
> 4. **NM-Đồng Tháp** (`192.168.50.0/24`) &bull; `DT-69EC881899064464BDEE46EA`
> 5. **NM-Hoàng Quỳnh** (`192.168.60.0/24`) &bull; `HQ-D92357730AA423A8E4EB1869`
> 6. **Sabibeco HO** (`10.10.1.0/24`, `10.10.2.0/24`) &bull; `HO-79601340F79939ED2FA0B2F5`
> 7. **TMDV BSG Bình Tây** (`192.168.70.0/24`) &bull; `BT-62584DFDAF9F80D44D56A915`

---

## 🛠️ 1. HƯỚNG DẪN TẠO MÔI TRƯỜNG VENV & KHỞI CHẠY BACKEND (PYTHON BE)

Backend được xây dựng bằng **FastAPI** hiệu năng cao, hỗ trợ Async SSE/WebSocket và tiếp nhận dữ liệu telemetry từ các nhà máy.

### Bước 1: Mở Terminal tại thư mục `backend`
```powershell
cd backend
```

### Bước 2: Tạo môi trường ảo `venv`
```powershell
python -m venv venv
```

### Bước 3: Kích hoạt môi trường `venv`
- **Trên PowerShell**:
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
  *(Nếu gặp lỗi script policy, chạy: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` rồi chạy lại)*
- **Trên Command Prompt (CMD)**:
  ```cmd
  venv\Scripts\activate.bat
  ```

### Bước 4: Cài đặt các thư viện cần thiết
```powershell
pip install -r requirements.txt
```

### Bước 5: Khởi chạy Backend Server
```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
```terminal
python -m uvicorn app.main:app --reload
```

- ✅ **API Docs (Swagger UI)**: `http://localhost:8000/api/v1/docs`
- ✅ **Endpoint nhận dữ liệu Agent**: `POST http://localhost:8000/api/v1/telemetry/ingest`

---

## 💻 2. HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY FRONTEND (REACT FE)

Frontend được xây dựng bằng **React + TypeScript + TailwindCSS + TanStack Query + i18n**.

### Bước 1: Mở một cửa sổ Terminal mới tại thư mục `frontend`
```powershell
cd frontend
```

### Bước 2: Cài đặt các gói thư viện Node.js (chỉ cần chạy lần đầu)
```powershell
npm install
```

### Bước 3: Khởi chạy máy chủ giao diện
```powershell
npm run dev
```

- 🖥️ **Mở trình duyệt Web tại**: `http://localhost:5173`
- 🔑 **Tài khoản đăng nhập**:
  - **Tài khoản**: `admin`
  - **Mật khẩu**: `sabibeco@2026`
  - **Mã Captcha**: Nhập kết quả phép tính cộng hiển thị trên màn hình.

---

## 📡 3. HƯỚNG DẪN CHẠY SITE AGENT TẠI CÁC NHÀ MÁY (2 CÁCH)

### Cách 1: Gửi 1 file duy nhất cho bạn bè tại nhà máy (Khuyên dùng)
Bạn chỉ cần copy file duy nhất **`site-agent/SABIBECO_AGENT.bat`** gửi cho bạn bè ở nhà máy khác:
1. Người nhận **không cần cài Python**, **không cần cài Node.js**, **không cần cấu hình venv**.
2. Chỉ cần **nhấp đúp chuột (Double-click)** vào file `SABIBECO_AGENT.bat`.
3. Chương trình tự động nhận diện nhà máy theo dải IP máy đang kết nối.
4. Nhập IP máy chủ của bạn (hoặc nhấn Enter nếu dùng máy chủ mặc định).
5. File tự động dùng đa luồng .NET quét toàn bộ thiết bị và truyền dữ liệu về Dashboard trung tâm mỗi 30 giây.

### Cách 2: Chạy Site Agent bằng Python
Dành cho máy tính đã có sẵn môi trường Python:
```powershell
cd site-agent
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python agent.py
```

---

## 🌟 4. CÁC TÍNH NĂNG NỔI BẬT ĐÃ TÍCH HỢP

1. **Sơ Đồ Mạng Trực Quan (Interactive Network Topology)**:
   - Hiển thị trung tâm điều phối **SABIBECO CENTRAL CORE** (`10.10.0.1`) kết nối đa điểm tới 7 nhà máy.
   - Bấm vào bất kỳ nhà máy nào trên sơ đồ để quản lý trực tiếp danh sách IP và xem kết quả Ping.
   - Nút chuyển đổi linh hoạt giữa **Sơ Đồ Mạng** và **Dạng Thẻ**.
2. **Cơ Chế Ping Kép (Auto Scan + Manual Add Ping)**:
   - Tự động quét dải mạng Subnet của nhà máy.
   - Hỗ trợ thêm IP thủ công qua nút **Thêm IP Giám Sát (Add Ping)**.
   - Khi chạy kiểm tra, hệ thống tự động **ping đồng thời cả hai loại IP**.
3. **Phân Loại Trạng Thái 3 Mức Độ Trễ**:
   - 🟢 **Online**: Kết nối bình thường, độ trễ tốt.
   - 🟡 **Chậm (Slow)**: Phản hồi chậm (độ trễ $\ge 100\text{ms}$).
   - 🔴 **Mất kết nối (Offline)**: Thiết bị không phản hồi.
   - ⚪ **Sẵn sàng (Standby)**: Sẵn sàng nhận tín hiệu.
4. **Hỗ Trợ Đa Ngôn Ngữ (i18n)**:
   - Chuyển đổi ngôn ngữ tức thì giữa **Tiếng Việt `[🇻🇳 VN]`** và **Tiếng Anh `[🇬🇧 EN]`** ngay góc trên Navbar.
5. **Thanh Sidebar Hiện Đại**:
   - Nút đóng/mở Sidebar được tích hợp trực tiếp lên thanh Navbar trên cùng.
   - Mục quản trị viên ở chân Sidebar: Có nút **Thoát (Logout)** riêng biệt, bấm vào ảnh đại diện để mở trang **Hồ Sơ**.
   - Hỗ trợ **Đổi ảnh đại diện** (tải ảnh từ máy) và **Đổi mật khẩu** đăng nhập.

---

## 📁 5. CẤU TRÚC THƯ MỤC DỰ ÁN ĐÃ ĐƯỢC TỐI ƯU
```text
check-ips/
├── backend/                # Server trung tâm (FastAPI + WebSocket + Telemetry Ingest)
│   ├── app/                # Mã nguồn API & Database
│   ├── requirements.txt    # Thư viện Python BE
│   └── Dockerfile          # Cấu hình container
├── frontend/               # Giao diện giám sát (React + TypeScript + TailwindCSS)
│   ├── src/
│   │   ├── components/     # Các component Dashboard, Sơ đồ mạng, Hồ sơ
│   │   ├── i18n/           # Thư mục từ điển đa ngôn ngữ (vi.ts, en.ts)
│   │   └── services/       # Kết nối API Backend & WebSocket
│   └── package.json        # Thư viện Frontend
├── site-agent/             # Mã nguồn Agent chạy tại nhà máy (Không cần Python)
│   ├── SABIBECO_AGENT.bat  # 1 FILE DUY NHẤT gửi cho bạn bè ở nhà máy (Chạy 1-Click)
│   ├── agent.py            # Agent chạy bằng Python (Tùy chọn)
│   ├── scanner.py          # Bộ quét Ping & ARP đa luồng
│   └── agent_config.json   # Cấu hình Agent
├── docker-compose.yml      # File chạy nhanh Docker nếu cần
└── README.md               # Tài liệu hướng dẫn sử dụng
```