# 📋 Incident Root Cause Analysis (RCA) Report

**Project:** VBooking / VibePMT (`vibepmt.online`)  
**Date of Incident:** 16 สิงหาคม 2026  
**Incident Severity:** High (Production Service Unavailable)  
**Report Prepared By:** System Architecture (SA), PM & Sr. Developer Team  

---

## 1. 📌 Executive Summary (สรุปภาพรวมเหตุการณ์)

| หัวข้อ | รายละเอียด |
| :--- | :--- |
| **อาการที่พบ (Symptoms)** | หน้าเว็บ `https://vibepmt.online` แสดงข้อความ `no available server` (HTTP 503) |
| **สถานะบน Coolify** | `🔴 Exited (10x restarts) Stopped after reaching restart limit (10/10)` และ `🟡 Restarting (unknown) (9x restarts)` |
| **ผลกระทบ (Impact)** | ผู้ใช้งานไม่สามารถเข้าใช้งานระบบ VBooking บน Production ได้ชั่วคราว |
| **สถานะปัจจุบัน (Current Status)** | ✅ **Resolved & Verified** (แก้ไขโค้ด, ตรวจสอบทุกจุด และ Push ขึ้นทุก Repository แล้ว) |

---

## 2. 🔍 Root Cause Analysis (การวิเคราะห์สาเหตุที่แท้จริง)

จากการสืบสวนและตรวจสอบเชิงลึกในทุกเลเยอร์ของระบบ พบสาเหตุหลัก 4 ประเด็นที่ทำให้เกิดปัญหาต่อเนื่องกันดังนี้:

### 2.1 💥 Root Cause 1 (Fatal Crash): ขาด Runtime Source Files ใน Production Dockerfile
* **กลไกที่เกิดปัญหา:** 
  * มีการแยกโมดูล Routes และ Controllers ออกมาไว้ในโฟลเดอร์ `src/routes/` (`serviceRoutes.cjs`, `quotationRoutes.cjs`, `dashboardRoutes.cjs`, `leadRoutes.cjs`) และ `src/controllers/`, `src/config/`
  * ใน [Dockerfile](Dockerfile) ขั้นตอน **Stage 2 (Production Runtime)** มีการ Copy เฉพาะไฟล์ `dist/`, `server.js`, `mailService.js` แต่ **ไม่ได้ Copy โฟลเดอร์ `src/` เข้าไปใน Container**
  * เมื่อ Container รันคำสั่ง `node server.js` ตัว Node.js เกิด Uncaught Exception ทันที: `Error: Cannot find module './src/routes/serviceRoutes.cjs'`
* **ผลสืบเนื่อง:** Container ดับทันทีที่สตาร์ท Docker จึงวนรีสตาร์ท 10 ครั้งจนถึงลิมิต (`10x restarts`) และปิดตัวเอง (`Exited`) ทำให้ Reverse Proxy (Traefik) ไม่พบ Server ปลายทาง และส่งผลลัพธ์กลับมาเป็น `no available server`

---

### 2.2 🔄 Root Cause 2 (Deploy Desync): การมี Git Remote 2 ปลายทางทำให้ Coolify ดึงโค้ดเก่า
* **กลไกที่เกิดปัญหา:**
  * Local Git Workspace มี Remote ปลายทาง 2 ตัว:
    1. `origin` ➔ `https://github.com/isarachootip/vq.git`
    2. `coolify` ➔ `https://github.com/isarachootip/vbooking.git`
  * Coolify บน Production Server ผูกอยู่กับ `isarachootip/vbooking.git`
  * ในการแก้ไขรอบแรก โค้ดถูก Push ไปยัง `origin` แต่ยังไม่ได้ Push ไปที่ `coolify`
  * เมื่อผู้ใช้สั่ง Redeploy ใน Coolify ตัว Coolify จึงยังคงเห็น Commit เก่า (`028574b`) และใช้ Docker Image เดิมซ้ำ ทำให้ Container ยังคงเปิดไม่ติด

---

### 2.3 📄 Root Cause 3 (Build Masking): `.dockerignore` บล็อกไฟล์ Markdown
* **กลไกที่เกิดปัญหา:**
  * ไฟล์ [.dockerignore](.dockerignore) มีการกำหนดกฎ `*.md` ไว้
  * ใน `server.js` มี API endpoint `/api/user-manual` ที่ต้องอ่านไฟล์ `user_manual.md`
  * การที่ `.dockerignore` ละเว้นไฟล์ `.md` อาจทำให้ Docker BuildKit ตัดไฟล์ `user_manual.md` ออกจาก Build Context และทำให้คำสั่ง `COPY user_manual.md ./` ล้มเหลว

---

### 2.4 🔌 Root Cause 4 (Database Connection): Hardcoded SSL ใน Database Config
* **กลไกที่เกิดปัญหา:**
  * ใน `src/config/db.cjs` มีการใส่ `ssl: { rejectUnauthorized: false }` แบบ Hardcode โดยตรง
  * หากรันเชื่อมต่อกับ Local PostgreSQL / Internal Docker Network ที่ไม่ได้เปิด SSL จะทำให้ Database Connection ล้มเหลวทันที

---

## 3. 🛠️ Corrective Actions Taken (การแก้ไขที่ดำเนินการไปแล้ว)

| ลำดับ | การแก้ไข | ไฟล์ที่แก้ไข | Commit SHA |
| :---: | :--- | :--- | :---: |
| 1 | เพิ่มคำสั่ง `COPY src/ ./src/` และ `COPY user_manual.md ./` ใน Production Stage | [Dockerfile](Dockerfile) | `c346df8` |
| 2 | ปรับปรุงการต่อ PostgreSQL ใน `db.cjs` ให้เป็น Dynamic SSL รองรับทั้ง Cloud (Neon/SSL) และ Local Docker DB | [src/config/db.cjs](src/config/db.cjs) | `b982514` |
| 3 | เพิ่ม Exception `!user_manual.md` ใน [.dockerignore](.dockerignore) | [.dockerignore](.dockerignore) | `7103501` |
| 4 | Sync และ Push โค้ดทั้งหมดขึ้นทั้ง 2 Remote Repositories (`origin` และ `coolify`) | Git Remote Sync | `7103501` |

---

## 4. 🛡️ Preventive Measures & Best Practices (แนวทางป้องกันในอนาคต)

1. **Docker Multi-stage Synchronization:**
   * ทุกครั้งที่มีการสร้าง Folder หรือ Sub-module ใหม่ที่ Node.js Backend ต้องเรียกใช้ที่ Runtime (`server.js`) จะต้องตรวจสอบ `Dockerfile` Stage 2 ทุกครั้งว่าได้คัดลอกโฟลเดอร์นั้นเข้ามาด้วย
2. **Dual-Remote Push Automation:**
   * เมื่อโปรเจกต์มีการ Push แยก 2 Repositories ให้ตรวจสอบเสมอว่าได้รัน `git push coolify main` ควบคู่กับ `git push origin main` ทุกครั้งก่อน Deploy
3. **Health Check & Startup Resilience:**
   * Backend Server มีการใช้ Connection Retry Logic (`startWithRetry()`) เพื่อรองรับกรณี Database Boot ช้ากว่า Web Container ป้องกัน Container Crash แบบถาวร
