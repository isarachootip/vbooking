# NexTime — System Setup & Reference Guide

> อัปเดตล่าสุด: 2026-06-11  
> โปรเจกต์: ระบบบันทึกเวลาและจัดการโปรเจกต์ภายในองค์กร

---

## 📁 โครงสร้างโปรเจกต์

```
c:\atgv\time_sheet\
├── src/
│   ├── components/         # React components ทั้งหมด
│   │   ├── Dashboard.tsx   # หน้าหลัก / ภาพรวมระบบ
│   │   ├── Projects.tsx    # จัดการโปรเจกต์
│   │   ├── ProjectPlan.tsx # Gantt chart / แผนงาน
│   │   ├── Tasks.tsx       # Kanban board / จัดการ task
│   │   ├── Timesheet.tsx   # บันทึกเวลาทำงาน
│   │   ├── TeamApprovals.tsx # จัดการทีม + อนุมัติ timesheet
│   │   ├── Reports.tsx     # รายงาน
│   │   ├── Settings.tsx    # ตั้งค่า task templates
│   │   └── Login.tsx       # หน้าเข้าสู่ระบบ
│   ├── data/
│   │   └── mockData.ts     # ข้อมูล mock (fallback เมื่อ DB ไม่ได้ต่อ)
│   ├── types/              # TypeScript type definitions
│   ├── App.tsx             # Root component + state management
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── server.js               # Express backend + PostgreSQL API
├── .env                    # ⚠️ ตัวแปร environment (อย่าลบ!)
├── nixpacks.toml           # Config สำหรับ deploy บน Coolify
├── scratch/
│   └── test_db.js          # Script ทดสอบการเชื่อมต่อ DB
├── database_setup_guide.md # คู่มือตั้งค่า PostgreSQL บน VPS
└── system_setup.md         # ไฟล์นี้
```

---

## 🗄️ ฐานข้อมูล (PostgreSQL)

### Connection Details

| รายการ       | ค่า                        |
|--------------|----------------------------|
| **Host**     | `187.77.147.16`            |
| **Port**     | `5432`                     |
| **Database** | `timesheet_db`             |
| **Username** | `isara_admin`              |
| **Password** | `MySecretPass123!`         |
| **Server**   | Hostinger VPS              |

### Connection String (ใช้ใน .env)

```
DATABASE_URL=postgresql://isara_admin:MySecretPass123!@187.77.147.16:5432/timesheet_db
```

### ตารางในฐานข้อมูล

| ตาราง           | คำอธิบาย                            |
|-----------------|--------------------------------------|
| `users`         | ข้อมูลผู้ใช้งานทั้งหมด              |
| `projects`      | ข้อมูลโปรเจกต์                       |
| `tasks`         | งานย่อยภายในแต่ละโปรเจกต์          |
| `timesheets`    | บันทึกชั่วโมงการทำงาน               |
| `task_templates`| เทมเพลต task สำหรับสร้างโปรเจกต์ใหม่ |

---

## ⚙️ ไฟล์ `.env` (สำคัญมาก!)

> ⚠️ ไฟล์นี้ถูก `.gitignore` ไว้ — **จะไม่ถูก push ขึ้น Git**  
> ถ้าไฟล์นี้หายไป ระบบจะเชื่อมต่อ `localhost` แทน และข้อมูลจะหาย!

ไฟล์ `.env` ต้องอยู่ที่ `c:\atgv\time_sheet\.env` และมีเนื้อหา:

```env
DATABASE_URL=postgresql://isara_admin:MySecretPass123!@187.77.147.16:5432/timesheet_db
```

### วิธีสร้าง `.env` ใหม่ (ถ้าหาย)

```powershell
# รันใน PowerShell ที่ c:\atgv\time_sheet
echo "DATABASE_URL=postgresql://isara_admin:MySecretPass123!@187.77.147.16:5432/timesheet_db" > .env
```

---

## 🚀 วิธีรันโปรเจกต์ (Development)

ต้องเปิด **2 Terminal** พร้อมกันเสมอ:

### Terminal 1 — Backend (Express API + Database)

```powershell
cd c:\atgv\time_sheet
npm run start
```

- รันที่ port `3000`
- เชื่อมต่อ PostgreSQL บน VPS
- ให้บริการ API endpoints ทั้งหมด

### Terminal 2 — Frontend (React + Vite)

```powershell
cd c:\atgv\time_sheet
npm run dev
```

- รันที่ `http://localhost:5173`
- เปิดใน browser เพื่อใช้งาน

---

## 🔌 API Endpoints

Base URL (local): `http://localhost:3000`

| Method   | Endpoint                 | คำอธิบาย                          |
|----------|--------------------------|-----------------------------------|
| `GET`    | `/api/initial-data`      | โหลดข้อมูลทั้งหมดครั้งแรก         |
| `POST`   | `/api/users`             | เพิ่ม/แก้ไข user                  |
| `DELETE` | `/api/users/:id`         | ลบ user                           |
| `POST`   | `/api/projects`          | เพิ่ม/แก้ไข project               |
| `POST`   | `/api/tasks`             | เพิ่ม/แก้ไข task                  |
| `DELETE` | `/api/tasks/:id`         | ลบ task                           |
| `POST`   | `/api/timesheets`        | เพิ่ม/แก้ไข timesheet entry      |
| `DELETE` | `/api/timesheets/:id`    | ลบ timesheet entry                |
| `POST`   | `/api/task-templates`    | เพิ่ม/แก้ไข task template         |
| `DELETE` | `/api/task-templates/:id`| ลบ task template                  |
| `GET`    | `/api/db-status`         | ตรวจสอบสถานะการเชื่อมต่อ DB      |

---

## 🧪 ทดสอบการเชื่อมต่อ DB

```powershell
cd c:\atgv\time_sheet
node scratch/test_db.js
```

ผลลัพธ์ที่ถูกต้อง:
```
Testing connection to 187.77.147.16:5432...
Successfully connected to the database!
Existing tables: [ 'users', 'projects', 'tasks', 'task_templates', 'timesheets' ]
```

---

## 🌐 การ Deploy (Production)

โปรเจกต์ใช้ **Coolify** บน Hostinger VPS เพื่อ deploy

- Config ไฟล์: `nixpacks.toml`
- Build command: `npm install && npm run build`
- Start command: `node server.js`
- Production URL: `https://vibe.project.online` *(ตรวจสอบกับ Coolify dashboard)*

### Environment Variables ที่ต้องตั้งใน Coolify

```
DATABASE_URL=postgresql://isara_admin:MySecretPass123!@187.77.147.16:5432/timesheet_db
```

> ตั้งค่าใน Coolify → Project → Environment Variables

---

## 👥 สถาปัตยกรรมสิทธิ์และบทบาทผู้ใช้งาน (Role & Permissions)

ระบบแยกแยะบทบาทและความปลอดภัยในการเข้าถึงข้อมูลออกเป็น **2 ระดับ** เพื่อให้การทำงานปฏิบัติงานหน้างานสะดวก และมีระบบป้องกันข้อมูลก้าวก่ายข้ามโครงการ

### 1. สิทธิ์ระดับระบบ (System-level / Global Role)
เก็บค่าในคอลัมน์ `global_role` ของตาราง `users` เพื่อใช้ควบคุมการเข้าถึงเมนูและระบบโดยภาพรวม:

| Role | สิทธิ์การเข้าถึงข้อมูลระบบ |
| :--- | :--- |
| **`Admin`** | **สิทธิ์สูงสุดในระบบ:** สามารถจัดการพนักงาน (เพิ่ม/ลบ/แก้ไข), ปรับแต่งเทมเพลตแผนงานเริ่มต้น (Milestone Template), สร้าง/แก้ไขโปรเจกต์ทั้งหมด และอนุมัติเวลางานของทุกคนในบริษัทได้ |
| **`Owner`** | **ผู้บริหาร / เจ้าของโครงการหลัก:** สามารถสร้างโครงการใหม่ และดูแล/จัดการหลายโปรเจกต์ที่ตนเองรับผิดชอบได้พร้อมกัน แต่ไม่มีสิทธิ์เข้าถึงเมนูการจัดการข้อมูลพนักงานหรือตั้งค่าโครงสร้างระบบ |
| **`Employee`** | **พนักงานทั่วไป:** (รวมถึงบทบาท Dev, SA, Team Lead, PM) มีสิทธิ์เข้าใช้งานระบบเพื่อลงเวลางาน (Timesheet) และดูสถานะงานในโครงการที่ตนเองสังกัดเท่านั้น |

### 2. บทบาทระดับโครงการ (Project-level Role)
บันทึกอยู่ในตารางสมาชิกของโครงการ (`members` ในตาราง `projects`) โดยทุกคนจะมีฐานะบัญชีเป็น User (พนักงาน) เหมือนกัน แต่สามารถมีบทบาทแตกต่างกันไปตามโครงการที่ได้รับมอบหมาย:

| บทบาทในโครงการ | คำอธิบายสิทธิ์เฉพาะโปรเจกต์นั้น ๆ |
| :--- | :--- |
| **`PM` (Project Manager)** | **แอดมินประจำโปรเจกต์:** เป็นผู้จัดการและอนุมัติการลงเวลางาน (Timesheet Approval) ของพนักงานในโปรเจกต์ตนเอง, จัดการแบ่งงานและมอบหมาย Task (Kanban) และจัดการสมาชิกทีมได้เฉพาะโครงการที่ตนเองดูแล (ไม่มีสิทธิ์ข้ามไปแก้ไขหรือดูข้อมูลโครงการอื่น) |
| **`Team Lead`** | **หัวหน้าทีมปฏิบัติงาน:** ดูแลความคืบหน้าการทำงาน และติดตามมอบหมายงานย่อยของลูกทีมในโครงการ |
| **`dev` / `SA` / `Designer`** | **ผู้ปฏิบัติงาน:** อัปเดตสถานะงานของตนเอง และส่งบันทึกเวลางานประจำวัน (Timesheet Log) ของตนเองให้ PM อนุมัติ |

---

## 🛠️ Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | React 19 + TypeScript + Vite        |
| Backend     | Express 5 (Node.js)                 |
| Database    | PostgreSQL (Hostinger VPS)          |
| Drag & Drop | @dnd-kit                            |
| Icons       | lucide-react                        |
| Routing     | react-router-dom v7                 |
| Date Utils  | date-fns                            |
| Deploy      | Coolify + Nixpacks                  |

---

## ⚠️ ข้อควรระวัง

1. **อย่าลบไฟล์ `.env`** — ถ้าหายต้องสร้างใหม่ตาม section ด้านบน
2. **ไฟล์ `.env` ไม่อยู่ใน Git** — ต้องสร้างทุกครั้งที่ clone โปรเจกต์ใหม่
3. **ต้องรัน backend ก่อน** — frontend จะ fallback ไปใช้ mock data ถ้า backend ไม่ตอบ
4. **VPS ต้องเปิด port 5432** — ถ้าเชื่อมต่อไม่ได้ ให้ตรวจสอบ UFW firewall บน VPS

---

## 🔑 ระบบ LINE Login & 2-Factor Authentication (2FA)

ระบบล็อกอินใช้ LINE Login (OAuth 2.0) เป็นหลักร่วมกับระบบการตรวจสอบสิทธิ์แบบ 2 ปัจจัย (2FA) ผ่านทางอีเมลบริษัทเพื่อความปลอดภัยของข้อมูลองค์กร

### 1. วิธีการตั้งค่า LINE Developers Console (เพื่อรับค่า Key)
ผู้ดูแลระบบต้องตั้งค่าช่องทาง LINE Login บน LINE Developers Console เพื่อรับคีย์และอนุญาตสิทธิ์การล็อกอินก่อนใช้งานจริง:

1. เข้าสู่หน้า [LINE Developers Console](https://developers.line.biz/) และล็อกอินด้วยบัญชี LINE
2. สร้าง **Provider** (หากยังไม่มี) จากนั้นกดสร้าง Channel ใหม่ โดยเลือกประเภทเป็น **`LINE Login`** (⚠️ *ต้องเลือก LINE Login เท่านั้น ห้ามเลือก Messaging API หรือ LINE OA ทั่วไป*)
3. ไปที่แท็บ **LINE Login**:
   - ที่หัวข้อ **Callback URL** กด Edit และเพิ่มค่า: `https://vibe.project.online/api/auth/line/callback` (และเพิ่ม `http://localhost:3000/api/auth/line/callback` หากคุณต้องการทดสอบบนเครื่อง Local ของผู้พัฒนา)
   - สลับสถานะของ Channel ด้านบนจาก **Developing** เป็น **Published** (เพื่อให้คนนอกทั่วไปล็อกอินระบบได้)
4. ไปที่แท็บ **Basic settings**:
   - คัดลอกค่า **Channel ID** และ **Channel Secret**
   - ที่หัวข้อ **Email address permission** ด้านล่างสุด ให้กดส่งขอสิทธิ์การเข้าถึงข้อมูลอีเมลของผู้ใช้ (Email Address Access) เพื่อให้ระบบสามารถดึงอีเมลมาตรวจและจับคู่กับอีเมลบริษัทของพนักงานโดยอัตโนมัติได้
5. นำคีย์ที่คัดลอกได้ไปกำหนดค่าในระบบ Coolify และไฟล์ `.env` ตามข้อถัดไป

### 2. การตั้งค่าตัวแปรสิ่งแวดล้อม (.env)
ต้องเพิ่มค่าคอนฟิกสำหรับ LINE Developers Console และการส่งอีเมลแจ้งเตือน (SMTP) ในไฟล์ `.env` ทั้งเครื่อง Local และบนระบบ Coolify:

```env
# Database Connection
DATABASE_URL=postgresql://isara_admin:MySecretPass123!@187.77.147.16:5432/timesheet_db

# LINE Login & Security
LINE_CHANNEL_ID=2010371232
LINE_CHANNEL_SECRET=57c874e33889f41b975c570bccbddfd5
LINE_CALLBACK_URL=https://vibeproject.online/api/auth/line/callback
JWT_SECRET=your_jwt_private_key

# SMTP Email Notifications (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=vibeproject2026@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM=vibeproject2026@gmail.com
```

### 2. API Endpoints สำหรับระบบ Authentication
เพิ่ม API ใน `server.js` เพื่อให้บริการระบบล็อกอินและการยืนยันสิทธิ์:

| Method | Endpoint | คำอธิบาย |
| :--- | :--- | :--- |
| `GET`  | `/api/auth/line` | Redirect ผู้ใช้ไปยังหน้าล็อกอินของ LINE OAuth (LINE Auth URL) |
| `GET`  | `/api/auth/line/callback` | Callback endpoint รับ Authorization Code จาก LINE เพื่อแลกเปลี่ยนเป็น User Profile, ตรวจสอบผู้ใช้งาน และสร้าง OTP |
| `POST` | `/api/auth/verify-2fa` | ตรวจสอบรหัส OTP 6 หลักที่พนักงานได้รับทางอีเมล เพื่อออกสิทธิ์ Access Token (JWT) ให้ใช้เข้าสู่ระบบ |

### 3. ตารางข้อมูลสิทธิ์และความปลอดภัย (Database Schema Setup)
รันคำสั่ง SQL นี้บน PostgreSQL เพื่ออัปเดตตารางรองรับ LINE Login และรหัสลับ 2FA:

```sql
-- เพิ่มคอลัมน์ในตาราง users เพื่อรองรับการผูกบัญชี LINE และระบบ 2FA
ALTER TABLE users ADD COLUMN IF NOT EXISTS line_user_id VARCHAR(100) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
```

### 4. ลำดับขั้นตอนการล็อกอินแบบผูกระบบพนักงาน (First-time Binding & 2FA Flow)
1. **ลงทะเบียนล่วงหน้า:** Admin สร้างโปรไฟล์พนักงานในระบบด้วย **อีเมลบริษัท** (เช่น `thjitpanu@central.co.th`)
2. **เข้าใช้ครั้งแรก:** เมื่อพนักงานกดปุ่ม "Sign in with LINE" ระบบจะรับค่า UUID (`line_user_id`) และอีเมลของผู้ใช้จาก LINE
3. **ส่งรหัส 2FA:** ระบบทำการสร้างรหัส OTP 6 หลักส่งเข้าอีเมลบริษัทของพนักงานคนนั้นเพื่อยืนยันตัวตน
4. **ผูกบัญชีถาวร:** พนักงานนำรหัส OTP 6 หลักมากรอกยืนยันในแอป ระบบจะทำการผูก LINE UUID เข้ากับข้อมูลพนักงานคนดังกล่าวในระบบถาวร
5. **การล็อกอินครั้งถัดไป:** พนักงานสามารถล็อกอินผ่าน LINE ได้ทันทีโดยไม่ต้องยืนยันตัวตนซ้ำ (ยกเว้นกรณีที่ต้องการความปลอดภัยสูงเป็นพิเศษ เช่น ระดับสิทธิ์ Admin / Owner ที่สามารถเปิดตั้งค่าให้ถาม OTP ทุกครั้งที่เข้าสู่ระบบจากเครื่องใหม่)

### 5. ข้อมูลการตั้งค่า LINE Login ของระบบ (Production Credentials)

| รายการ | ค่า |
|---|---|
| **Channel Name** | `PJ_Management` |
| **Channel ID** | `2010371232` |
| **Channel Secret** | `57c874e33889f41b975c570bccbddfd5` |
| **LINE User ID (Admin)** | `U4705c60091e36513849ba962929e0254` |
| **Callback URL** | `https://vibe.project.online/api/auth/line/callback` |
