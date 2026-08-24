# 🧪 Test Scenario Master: 30 Cases (End-to-End QA & Tester Guide)
**Filename:** `Test_newscenrio30case.csv` / `Test_newscenrio30case.md`  
**System:** NexTime / vbooking  
**Target Coverage:** Phase 01 ➔ Phase 04 + Convert to Project Engine + Multi-Trade WBS + Maintain Master + Gatekeepers & Edge Cases  
**Ready for Google Sheets Import:** `Test_newscenrio30case.csv`

---

## 📑 สรุปชุดการทดสอบทั้ง 5 หมวด (Total 30 Test Cases)

| หมวดการทดสอบ (Test Suite) | จำนวนเคส | ขอบเขตการทดสอบ |
| :--- | :---: | :--- |
| **🏡 TS-01: Full Standard Renovate (11 Stages + Multi-Trade WBS)** | 15 Cases | Phase 01 ถึง Phase 04 ครบกระบวนการ (รวมงานหลายหมวดช่าง) |
| **⚡ TS-02: Quick Service Fast-Track (8 Stages + Online QC)** | 5 Cases | 8 ขั้นตอน Kanban + ตรวจ Online QC ผ่านรูปถ่าย |
| **🔧 TS-03: Maintenance / MA Service (10 Stages)** | 2 Cases | 10 ขั้นตอน Kanban + MA Checklist ประจำงวดสัญญา |
| **⚙️ TS-04: Maintain Master & Dynamic Configuration** | 3 Cases | เปิด-ปิดประเภทงาน Active/Inactive, แม่แบบชุดงานช่าง, Price Book Margin |
| **🛡️ TS-05: Exception & Gatekeepers** | 5 Cases | ล็อกมัดจำ, GPS นอกรัศมี 500m, QC Defect & Rework Loop, ล้าง Canvas |
| **🏁 รวมทั้งสิ้น (Total)** | **30 Cases** | ครอบคลุมทุกฟังก์ชันการทำงาน |

---

## 📋 ตารางรายละเอียดชุดการทดสอบ 30 ข้อ (Test Scenarios Matrix)

| ID | Phase / หมวด | Workflow | ขั้นตอน | ชื่อเคสทดสอบ | ขั้นตอนการทดสอบ (Action / Steps) | ข้อมูลทดสอบ (Test Data) | ผลลัพธ์ที่คาดหวัง (Expected Result) | สถานะ |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| **TS-01-01** | Phase 01: Lead & Survey | Standard Renovate | 1.1 | เพิ่มลูกค้ามุ่งหวังรายใหม่ | ไปที่ `/leads` ➔ คลิก `+ เพิ่มลูกค้าใหม่` ➔ กรอกข้อมูลแล้วบันทึก | ชื่อ: คุณสมชาย ใจดี, เบอร์: 081-234-5678, งาน: Renovate | Lead ใหม่แสดงในตาราง พร้อมสถานะ `New Lead` | Untested |
| **TS-01-02** | Phase 01: Lead & Survey | Standard Renovate | 1.2 | นัดหมายช่างประเมิน (Smart QC Dispatch) | คลิก `นัดหมายช่างประเมิน` ➔ เลือกวันเวลา ➔ เลือกช่าง QC ที่ว่าง ➔ ตรวจแผนที่ Preview ➔ บันทึก | นัด: พรุ่งนี้ 10:00 น., ช่าง QC คิวว่าง, พิกัด: 13.8519, 100.6434 | ระบบคำนวณคิวว่าง +-3 ชม. บันทึกสำเร็จ หมุดขึ้นตรงพิกัด | Untested |
| **TS-01-03** | Phase 01: Lead & Survey | Standard Renovate | 1.3 | บันทึกผลการลงพื้นที่จริง (Site Visit) | คลิก `บันทึกผล Visit` ➔ กรอกสภาพบ้านและขอบเขตงาน ➔ บันทึก | ผล: เข้า Visit สำเร็จ, งาน: ปรับปรุงห้องรับแขก & ปูพื้นใหม่ | สถานะ Lead ปรับเป็น `Pending Quote` อัตโนมัติ | Untested |
| **TS-01-04** | Phase 02: Design & Payment | Standard Renovate | 1.4 | อัปโหลดแบบแปลน 2D/3D (Design & Revisions) | คลิก `แบบ 2D/3D` ➔ เลือก 3D Perspective ➔ กำหนด Rev A ➔ อัปโหลดภาพ | แบบ 3D Perspective, เวอร์ชัน Rev A, แนบรูปภาพ | Thumbnail แสดงผลชัดเจน และบันทึก Rev A ในประวัติ | Untested |
| **TS-01-05** | Phase 02: Design & Payment | Standard Renovate | 1.5 | ลูกค้าอนุมัติแบบแปลน (Design Approved) | ในหน้าต่างแบบ 2D/3D คลิก `ลูกค้าอนุมัติแบบ` พร้อมใส่ Feedback | Feedback: "ลูกค้าชอบโทนสีและแปลนห้อง สรุปตามแบบ Rev A" | สถานะ Lead ปรับเป็น `Design Approved` สีเขียว | Untested |
| **TS-01-06** | Phase 02: Design & Payment | Standard Renovate | 1.6 | ออกใบเสนอราคา BOQ (Quotation) | ไปที่หน้า Quotations ➔ ดึงรายการจาก Price Book ➔ ออกใบเสนอราคา | รายการ: งานฝ้า + ไฟ + แอร์ + พื้น ยอดรวม: 120,000 บาท | ออกใบเสนอราคา `QT-xxx` สถานะ Approved 120,000 บาท | Untested |
| **TS-01-07** | Phase 02: Design & Payment | Standard Renovate | 1.7 | รับชำระเงินมัดจำ (Down Payment Gatekeeper) | คลิก `รับมัดจำ & แปลงงาน` ➔ ระบบแนะนำ 50% (60,000 บาท) ➔ แนบสลิป ➔ บันทึก | ยอดมัดจำ 60,000 บาท, โอนเงินผ่านธนาคาร, แนบสลิป | บันทึกมัดจำสำเร็จ ➔ ปลดล็อกปุ่ม `Convert to Project` | Untested |
| **TS-01-08** | Phase 03: Project Execution | Standard Renovate | 1.8 | แปลงเป็นโครงการจริง (Renovate 11 Stages) | คลิก `แปลงเป็นโครงการติดตั้ง` หรือเมนูลัด `🚀 5. แปลงเป็นโครงการ` | ยืนยันการแปลง Lead คุณสมชาย ใจดี (Renovate Service) | ออก Smart Project ID (`PRBNA...`), สืบทอด Geofence 500m, เปิด 11 สเตจ | Untested |
| **TS-01-09** | Phase 03: Project Execution | Standard Renovate | 1.9 | นำเข้าแม่แบบหลายหมวดช่าง (Multi-Trade WBS) | ในหน้า Project Plan คลิก `+ นำเข้า Tasks ตามหมวดงาน` ➔ ระบุ "ห้องรับแขก" ➔ ติ๊กเลือก `ไฟฟ้า + แอร์ + ฝ้า + พื้น` | พื้นที่: ห้องรับแขก, หมวด: [✓] ไฟฟ้า [✓] แอร์ [✓] ฝ้า [✓] พื้น | รวม Tasks ย่อยทั้ง 4 หมวดเข้าสู่โครงการ พร้อมติดแท็กชัดเจน | Untested |
| **TS-01-10** | Phase 03: Project Execution | Standard Renovate | 1.10 | ช่างเช็คอินพิกัดดาวเทียม & กล้องสด | ไปที่ `/site-checkin` ➔ ดึงพิกัด GPS ➔ เปิดกล้องสดถ่ายรูป ➔ Check-In | พิกัดเบราว์เซอร์อยู่ในรัศมี 500 เมตร, ภาพถ่ายสดหน้างาน | Geofencing ผ่าน บันทึกเวลาเริ่มงานและรูปถ่ายเข้า Timesheet | Untested |
| **TS-01-11** | Phase 03: Project Execution | Standard Renovate | 1.11 | ช่างเฉพาะทางกรองการ์ดงาน & ลงเวลา Timesheet | ช่างไฟกรองแท็ก `#ไฟฟ้า`, ช่างแอร์กรอง `#แอร์` บน Kanban ➔ ลงเวลา | บันทึกเวลาช่างไฟ 8 ชม., ช่างแอร์ 6 ชม., ช่างฝ้า 12 ชม. | บอร์ดแสดงเฉพาะการ์ดงานที่กรอง และรวมต้นทุนค่าแรงแยกหมวด | Untested |
| **TS-01-12** | Phase 04: QC, Handover & Settle | Standard Renovate | 1.12 | เปิดหน้าต่างตรวจงาน On-site QC | คลิก `QC & ส่งมอบงาน (Phase 04)` ➔ เลือก On-site QC Inspection | โหมด: On-site QC Inspection | แสดง Digital QC Checklist 5 ด้านหลัก | Untested |
| **TS-01-13** | Phase 04: QC, Handover & Settle | Standard Renovate | 1.13 | ประเมิน Checklist 5 ด้าน (On-site Passed) | ตรวจ Checklist ครบ 5 ข้อ ➔ ติ๊ก `ผ่าน (Pass)` ครบทุกข้อ ➔ แนบรูป ➔ บันทึก | ผล: `Passed On-site`, รูปถ่ายห้องรับแขกที่เสร็จสมบูรณ์ | บันทึกสำเร็จ ➔ สลับไป Tab 2: ส่งมอบงาน & E-Sign ทันที | Untested |
| **TS-01-14** | Phase 04: QC, Handover & Settle | Standard Renovate | 1.14 | ลูกค้าประเมิน 5 ดาว & เซ็นชื่อ E-Signature | ใน Tab 2 กดให้คะแนน 5 ดาว ➔ เซ็นชื่อบนจอ Canvas ➔ กำหนดรับประกัน 1 ปี | คะแนน: 5 ดาว ⭐⭐⭐⭐⭐, ลายเซ็นลูกค้า, รับประกัน 12 เดือน | ลายเซ็นและคะแนนดาวแสดงผลชัดเจน ➔ กดไปขั้นตอนปิด Job | Untested |
| **TS-01-15** | Phase 04: QC, Handover & Settle | Standard Renovate | 1.15 | บันทึกเงินงวดสุดท้าย & ปิดโครงการใน BMT | ใน Tab 3 ตรวจสอบสรุปช่าง JMT ➔ บันทึกยอดเงินงวดสุดท้าย ➔ ยืนยันปิดงาน | ยอดเงินงวดสุดท้าย: 60,000 บาท (Paid), ช่างติดตั้ง JMT | สถานะโครงการเปลี่ยนเป็น `Completed` สมบูรณ์ | Untested |
| **TS-02-01** | Phase 03: Project Execution | Quick Service | 2.1 | สร้าง Lead บริการด่วน & แปลงงาน 8 สเตจ | สร้าง Lead ประเภท `Quick service` ➔ กดปุ่ม Convert to Project | ชื่องาน: ซ่อมกระเบื้องร่อนด่วน, ประเภท: Quick service | สร้างโครงการพร้อมจัดสรร 8 ขั้นตอน Kanban อัตโนมัติ | Untested |
| **TS-02-02** | Phase 03: Project Execution | Quick Service | 2.2 | ช่างปฏิบัติงาน & ถ่ายรูปงานเสร็จรายงานผล | ช่างเข้าซ่อมกระเบื้อง ➔ แนบรูปถ่ายงานเสร็จ ➔ บันทึก Check-out | ภาพถ่ายกระเบื้องที่ปูใหม่และยาแนวเรียบร้อย | รูปภาพถูกบันทึกเข้าระบบพร้อมสำหรับการตรวจ Online QC | Untested |
| **TS-02-03** | Phase 04: QC, Handover & Settle | Quick Service | 2.3 | เปิดโหมดตรวจ Online QC Review | เจ้าหน้าที่ QC / PM เปิดหน้าต่าง `QC & ส่งมอบงาน` | ระบบ Auto-select โหมด: `Online QC Review` | แสดงเกณฑ์ตรวจประเมิน 4 ข้อสำหรับงานด่วน | Untested |
| **TS-02-04** | Phase 04: QC, Handover & Settle | Quick Service | 2.4 | ตรวจสอบรูปถ่าย & อนุมัติ Online QC | ตรวจรูปภาพ ➔ ติ๊ก `ผ่าน (Pass)` ทั้ง 4 ข้อ ➔ คลิกบันทึกผล | ผล: `Approved Online` | ผ่านการตรวจ QC ทางออนไลน์ทันทีโดยไม่ต้องลงพื้นที่ | Untested |
| **TS-02-05** | Phase 04: QC, Handover & Settle | Quick Service | 2.5 | ลูกค้าเซ็นชื่อ E-Sign & ปิดโครงการด่วน | ลูกค้าเซ็นชื่อรับมอบงานบนหน้าจอ ➔ ยืนยันปิด Job ในแท็บ Settlement | ลายเซ็นลูกค้า, ยอดเงินบริการด่วน | ปิด Job เสร็จสิ้น รวดเร็ว สมบูรณ์ | Untested |
| **TS-03-01** | Phase 03: Project Execution | MA Service | 3.1 | สร้างโครงการ MA & เปิดสเตจ 10 ขั้นตอน | สร้าง Lead ประเภท `Maintenance` ➔ Convert เป็นโครงการ | ชื่องาน: ตรวจเช็คระบบแอร์และฝ้ารายปี, ประเภท: Maintenance | สร้างโครงการพร้อมจัดสรร 10 ขั้นตอน Kanban | Untested |
| **TS-03-02** | Phase 03: Project Execution | MA Service | 3.2 | ดึง Checklist MA & บันทึกผลตรวจตามงวด | เปิดหน้า Tasks ➔ นำเข้าแม่แบบ MA Checklist ➔ บันทึกเวลาและผลตรวจ | Checklist ตรวจเช็ค 10 รายการ และรูปถ่ายงานบำรุงรักษา | บันทึกผลการบำรุงรักษาและเก็บหลักฐานพร้อมส่งมอบตามงวด | Untested |
| **TS-04-01** | Maintain Master | System Admin | 4.1 | ตั้งค่าเปิด-ปิดประเภทโครงการ (Project Types) | ไปที่ Maintain Master ➔ แท็บ `1. Project Types` ➔ กดสลับ Active / Inactive | ปิด/เปิดประเภทโครงการ เช่น Installer | ระบบบันทึกทันที และแสดงเฉพาะประเภทที่ Active ในฟอร์ม | Untested |
| **TS-04-02** | Maintain Master | System Admin | 4.2 | จัดการแม่แบบชุดงานช่าง (Task Templates) | Maintain Master ➔ แท็บ `2. Task Templates` ➔ เพิ่มชุดแม่แบบใหม่ | เพิ่มชุดงาน: `[Template] งานสุขาภิบาลและประปา` พร้อม 4 Tasks | ชุดแม่แบบใหม่ปรากฏในรายการ และพร้อมให้ดึงไปใช้งาน | Untested |
| **TS-04-03** | Maintain Master | System Admin | 4.3 | ตรวจสอบ Margin ใน Service Price Book | Maintain Master ➔ แท็บ `Price Book` ➔ ตรวจการคำนวณ Margin % | ราคาขาย 1,000 บาท ต้นทุน 600 บาท (Margin 40%) | แสดงป้ายกำไรสีเขียวสำหรับ Margin >= 30% | Untested |
| **TS-05-01** | Exception & Gatekeeper | Edge Case | 5.1 | ทดสอบการล็อกปุ่มหากยังไม่จ่ายมัดจำ | ที่หน้า Leads พยายามกดปุ่ม `แปลงเป็นโครงการ` โดยยังไม่จ่ายมัดจำ | Lead ที่ยังไม่ได้บันทึกยอดเงินมัดจำ | ปุ่ม `Convert to Project` ถูกล็อก ไม่สามารถเปิดงานได้ | Untested |
| **TS-05-02** | Exception & Gatekeeper | Edge Case | 5.2 | ทดสอบการเช็คอินนอกรัศมีไซต์งาน (> 500m) | ช่างกด Check-in ณ ตำแหน่งที่อยู่นอกรัศมี 500 เมตรจากพิกัดไซต์งาน | พิกัดห่างจากไซต์งาน > 500 เมตร | ระบบแจ้งเตือนระยะห่างเกินเกณฑ์ และบันทึกพิกัดจริงลง Log | Untested |
| **TS-05-03** | Exception & Gatekeeper | Edge Case | 5.3 | ทดสอบตรวจ QC ไม่ผ่านและสั่งแก้งาน (Rework) | ในหน้า QC ให้ติ๊ก `ไม่ผ่าน (Defect)` และเลือกผล `สั่งช่างแก้งาน (Rework)` | ระบุ Defect: "แนวฝ้าเพดานมีรอยต่อไม่เรียบ ให้ช่างเก็บสีใหม่" | สถานะเป็น `In Progress / Reworking` ส่งงานกลับไปให้ช่างแก้ | Untested |
| **TS-05-04** | Exception & Gatekeeper | Edge Case | 5.4 | ตรวจ QC ซ้ำหลังช่างแก้ไขงานเสร็จ (Re-inspection) | หลังช่างแก้ไขงานเสร็จ เปิด QC Modal ตรวจสอบซ้ำและเลือก `Passed` | ภาพถ่ายแนวฝ้าเพดานที่เก็บสีเรียบร้อยแล้ว | ปลดล็อกเข้าสู่ขั้นตอน Handover & E-Signature ได้ตามปกติ | Untested |
| **TS-05-05** | Exception & Gatekeeper | Edge Case | 5.5 | ทดสอบการล้างและเซ็นลายเซ็นใหม่ (Canvas Clear) | ทดลองเซ็นชื่อผิดบนหน้าจอ Canvas จากนั้นคลิกปุ่ม `ล้างลายเซ็น` | การวาดเส้นลายเซ็นบน Canvas | กระดาน Canvas ถูกล้างว่างเปล่า พร้อมให้เซ็นใหม่ | Untested |

---

## ✍️ UAT Sign-Off Sheet

```
สรุปผลการทดสอบระบบ:
• ผ่าน (Passed): ________ / 30 ข้อ
• ไม่ผ่าน (Failed): ________ / 30 ข้อ
• บล็อก (Blocked): ________ / 30 ข้อ

ผู้จัดการโครงการ (PM Lead): _________________________ วันที่: _____/_____/_________
หัวหน้าทีมทดสอบ (QA Lead):  _________________________ วันที่: _____/_____/_________
```
