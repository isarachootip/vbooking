# vbooking(buildflow) System Guide / คู่มือการใช้งานระบบ vbooking(buildflow)

Welcome to the **vbooking(buildflow)** System Guide. This document provides a comprehensive overview of all system features, roles, and database configurations.
ยินดีต้อนรับสู่คู่มือการใช้งานระบบ **vbooking(buildflow)** เอกสารฉบับนี้อธิบายภาพรวมและคำแนะนำการใช้งานฟีเจอร์ บทบาทหน้าที่ และโครงสร้างฐานข้อมูลของระบบอย่างครบถ้วน

---

## 1. Access Roles & Permissions / บทบาทและสิทธิ์ผู้ใช้งาน

The system supports four global roles, defining access rights across projects, timesheets, and settings:
ระบบสนับสนุนบทบาทการเข้าใช้งาน 4 ระดับ ซึ่งกำหนดสิทธิ์การเข้าถึงโครงการ ใบลงเวลา และการตั้งค่าต่าง ๆ:

*   **Admin (ผู้ดูแลระบบ)**: Full administrative access to all data, settings, system configurations, and permission schemes. Can view, edit, and delete all projects, tasks, and timesheets.
    *สิทธิ์ผู้ดูแลระบบสูงสุด*: เข้าถึงและจัดการข้อมูลทั้งหมดในระบบ การตั้งค่า แผนสิทธิ์โครงการ สามารถสร้าง แก้ไข และลบโปรเจกต์ งาน และใบลงเวลาได้ทั้งหมด
*   **Manager (ผู้จัดการระบบ)**: Global management role. Has full administrative rights over projects, tasks, and timesheets. Can manage project plans, baselines, and approve/delete timesheets. Unlike Admin, cannot edit core system configs.
    *สิทธิ์ผู้บริหารระบบ*: มีสิทธิ์จัดการโปรเจกต์ งาน และใบลงเวลาได้ทั้งหมดเทียบเท่า Admin รวมถึงการบันทึกแผนฐานข้อมูล (Baseline) และอนุมัติ/ลบ Timesheet ได้ แต่จะไม่สามารถตั้งค่าระบบเชิงลึก (System Config) ได้
*   **Employee (พนักงาน)**: Regular project team member. Can view assigned projects, log timesheets, create tasks/subtasks, and transition task statuses within assigned projects. Cannot delete approved timesheets or configure project versions.
    *สิทธิ์พนักงานปฏิบัติงาน*: สามารถเข้าดูโครงการที่ได้รับมอบหมาย บันทึกชั่วโมงทำงาน (Timesheet) สร้างงานหรือเปลี่ยนสถานะงานได้ตาม Workflow แต่ไม่สามารถลบใบลงเวลาที่อนุมัติแล้ว หรือจัดการเวอร์ชันแผนโครงการได้
*   **User (ผู้ใช้ทั่วไป)**: Restricted project view role. Can only view projects they are members of and participate in their respective project chats. Can log hours but has no administrative or editing rights on project structures.
    *สิทธิ์ผู้ใช้งานทั่วไป*: สามารถดูได้เฉพาะโครงการที่ตนเองเป็นสมาชิก และแชทคุยในโครงการเหล่านั้นได้เท่านั้น สามารถลงเวลาได้ แต่ไม่มีสิทธิ์เข้าไปปรับเปลี่ยนโครงสร้างโครงการหรืองาน

---

## 2. Project Plan & Baselines / แผนงานโครงการและแผนฐานข้อมูล (Baseline)

The Project Plan module allows tracking progress and comparing it against baseline snapshots:
เมนู Project Plan & Timeline ใช้สำหรับวางแผนงานโครงการและเปรียบเทียบความคืบหน้าระหว่างแผนงานฐานข้อมูลกับความเป็นจริงในปัจจุบัน:

*   **Active Plan (Baseline Version) / แผนอ้างอิงหลัก**: A saved snapshot of project tasks at a specific point in time (e.g., "Initial Plan", "Phase 1 Baseline"). Changing the Active Plan swaps the active workspace tasks to match that saved version.
    *แผนอ้างอิงหลัก (Baseline)*: แผนงานที่ถูกจัดเก็บบันทึกสถานะไว้ ณ เวลาใดเวลาหนึ่ง (เช่น แผนตั้งต้น) เพื่อใช้เป็นเกณฑ์เปรียบเทียบ โดยผู้ดูแลระบบสามารถสลับเปลี่ยน Active Plan เพื่อดูเวอร์ชันต่าง ๆ ได้
*   **Current Live Plan / แผนงานจริงปัจจุบัน**: Represents the real-time status of project tasks, including active progress and actual logged hours.
    *แผนงานจริงปัจจุบัน*: สถานะโครงการล่าสุดตามการทำงานจริงของทีมงานและการอัปเดตงานแบบเรียลไทม์
*   **Drift & Variance Analysis / การวิเคราะห์การเบี่ยงเบนแผน**: The system automatically calculates variances between the Active Plan and Current Live Plan:
    *ระบบคำนวณส่วนต่างระหว่างแผนฐานข้อมูลกับแผนงานจริงให้อัตโนมัติ*:
    *   *Schedule Slippage (Drift)*: Deviation in timeline start/end dates. (ความล่าช้าของกำหนดการสะสมเป็นจำนวนวัน)
    *   *Estimate Drift*: Difference between planned and actual hours. (ชั่วโมงทำงานที่เบี่ยงเบนไปจากประมาณการเดิม)
    *   *Story Points (SP) Drift*: Variation in story points. (คะแนนความยากง่ายงานที่คลาดเคลื่อน)
*   **Support Project Exception / ข้อยกเว้นสำหรับโครงการ Support**: Support projects (where `projectType = 'support'`) bypass the baseline versioning and Gantt charts. The UI displays a warning message directing users to log timesheets or manage tasks on the board.
    *ข้อยกเว้นโครงการซัพพอร์ต*: สำหรับโครงการประเภท Support ระบบจะปิดการใช้งานแผนงานและ Baseline ทั้งหมด โดยจะมีปุ่มทางลัดนำทางไปยังบอร์ดหรือหน้าบันทึกเวลาแทนเพื่อให้ทีมงานสามารถเริ่มปฏิบัติงานและลงเวลาได้ทันที

---

## 3. Task & Subtask Management / การจัดการงานและงานย่อย (Subtasks)

Tasks can be organized into hierarchy levels to track milestone completion:
การจัดระเบียบงานสามารถแบ่งออกตามความสำคัญและระดับขั้นเพื่อการประเมินความสำเร็จของเป้าหมาย:

*   **Main Task (Milestone/Parent) / งานหลัก**: Represents major deliverables, milestones, or parent tasks.
    *งานหลัก*: ตัวแทนเป้าหมายสำคัญ (Milestones) หรือหัวข้อหลักของงานที่จะควบคุมงบประมาณเวลา
*   **Subtask / งานย่อย**: Smaller, actionable tasks created under a Main Task.
    *งานย่อย (Subtasks)*: รายการงานย่อยที่แบ่งออกจากงานหลัก เพื่อให้เห็นรายละเอียดการปฏิบัติงานได้ชัดเจน
*   **Progress Rollup / การคำนวณความคืบหน้าแบบเชื่อมโยง**: If a Main Task has subtasks, its progress percentage is calculated purely based on the ratio of completed (Done) subtasks (e.g., 2 of 4 subtasks completed = 50% progress for the Main Task).
    *การรวมผลความคืบหน้า*: งานหลักที่มีงานย่อย ความคืบหน้าจะคำนวณจากเปอร์เซ็นต์ของจำนวนงานย่อยที่เสร็จสิ้น (Done) เท่านั้น
*   **Hour Budgeting Limits / การจำกัดชั่วโมงงาน**: The sum of all subtasks' estimated hours cannot exceed the parent Main Task's budgeted estimated hours.
    *การควบคุมงบประมาณชั่วโมงงาน*: ผลรวมชั่วโมงประมาณการของงานย่อยทั้งหมดจะต้องไม่เกินจำนวนชั่วโมงประมาณการของงานหลัก

---

## 4. Timesheet Logging & Approvals / การบันทึกเวลาและการอนุมัติ

vbooking(buildflow) locks in logged time data while providing options for administrative corrections:
ระบบอำนวยความสะดวกในการบันทึกเวลาพร้อมทั้งควบคุมความถูกต้องของชั่วโมงปฏิบัติงาน:

*   **Draft & Pending Status**: Logged hours are drafted or submitted as pending for PM approval. Users can edit or delete these entries freely.
    *สถานะร่าง & รออนุมัติ*: ใบลงเวลาอยู่ระหว่างจัดเตรียมหรือรอตรวจสอบ ซึ่งพนักงานสามารถกดลบประวัติเพื่อแก้ไขใหม่ได้เอง
*   **Approved Status**: Once approved by an Admin, Manager, or PM, the timesheet is locked for normal employees.
    *สถานะอนุมัติแล้ว*: ใบลงเวลาที่ได้รับการตรวจสอบและอนุมัติแล้วจะถูกล็อกสำหรับพนักงานทั่วไปเพื่อนำข้อมูลไปคำนวณค่าใช้จ่าย
*   **Administrative Deletion (Corrections) / การลบใบอนุมัติแล้ว**: Users with **Admin** or **Manager** global roles can delete approved timesheets directly on the Timesheet page to allow team members to correct logging errors.
    *การลบใบอนุมัติแล้ว*: ผู้ใช้งานบทบาท **Admin** และ **Manager** สามารถลบรายการที่ได้รับการอนุมัติ (Approved) แล้วได้ เพื่อเปิดโอกาสให้ลบข้อมูลที่ผิดพลาดและแก้ไขชั่วโมงการลงเวลาใหม่ได้ทันที

---

## 5. Project Chat / ระบบแชทโครงการ

Collaborative messaging rooms for project team members:
ช่องทางการติดต่อสื่อสารและประสานงานภายในทีมผู้ร่วมโปรเจกต์:

*   **Automatic Pre-selection / การระบุโปรเจกต์ปลายทางอัตโนมัติ**: Clicking the **Chat icon** in the project card in the **Projects** page redirects you directly to the Project Chat page, with the corresponding project pre-selected in the chat dropdown.
    *ทางลัดแชทโปรเจกต์*: การกดปุ่มแชทในการ์ดโปรเจกต์ที่หน้าโปรเจกต์รวม จะทำการสลับลิงก์ไปยังหน้าแชทและเลือกห้องโครงการดังกล่าวให้พร้อมพิมพ์ได้ทันที
*   **Access Control / การเข้าถึงแชท**: Admins and Managers have global access to all project chats. Employees and Users can only access chats of projects they are members of.
    *สิทธิ์การเข้าใช้งาน*: Admin และ Manager เข้าแชทได้ทุกห้อง ส่วน Employee และ User จะเห็นและแชทได้เฉพาะโครงการที่ตนมีรายชื่ออยู่เท่านั้น
*   **User Mentions (@) / การระบุตัวผู้ใช้งานด้วย @**: Typying `@` in the chat input presents a selection dropdown of project members. Selecting a user inserts `@Name ` and displays the mention with a distinct visual highlight inside the chat bubble.
    *การกล่าวถึงผู้ใช้ด้วย @*: การพิมพ์ `@` จะแสดงกล่องตัวเลือกสำหรับสมาชิกของโครงการเพื่อแทรกเข้าช่องพิมพ์ทันที พร้อมทั้งแสดงไฮไลต์สีฟ้าโดดเด่นในกล่องข้อความแชท
*   **Real-time Mentions Notification / การแจ้งเตือนเมื่อโดนแท็ก**: Mentioning a user triggers a red unread badge next to the project name and on the main sidebar menu. It also generates an unread alert in the system-wide **Notification Bell** that redirects the user directly to the target room when clicked.
    *ระบบแจ้งเตือนการกล่าวถึง*: เมื่อถูกกล่าวถึงจะมีป้ายเตือนสีแดงแสดงตรงชื่อโครงการและเมนูแถบข้าง รวมถึงการแสดงรายการแจ้งเตือนด่วนที่กระดิ่งระบบมุมขวาบน ซึ่งสามารถกดเพื่อสลับมาเปิดดูห้องแชทได้โดยตรง

---

## 6. Reports & Dashboards / รายงานสรุปและแดชบอร์ด

Advanced data visualization tools for project metrics and costs:
เครื่องมือสรุปผลและรายงานทางการเงินโครงการในรูปแบบกราฟ:

*   **Project Cost Summary**: Computes actual costs based on role day rates (MTD, YTD, and total costs). Shows budget consumption charts.
    *รายงานงบประมาณ*: แสดงภาพรวมชั่วโมงและงบประมาณสะสม (MTD, YTD และ ยอดรวมจริงทั้งหมด) เทียบกับงบประมาณที่กำหนดไว้
*   **Resource Trends Graph**: Line chart showing logged hours of team members over Daily, Monthly, and Yearly filters.
    *กราฟสถิติผู้ใช้งาน*: แสดงทิศทางชั่วโมงทำงานของพนักงานแต่ละคนตามตัวกรอง รายวัน รายเดือน และรายปี
*   **Subtasks Overview in Summary tab**: A dedicated analytics card on the Tasks Summary tab showing overall subtask completion percentages and status counts.
    *ภาพรวมงานย่อยในแดชบอร์ด*: แดชบอร์ดสรุปความคืบหน้ารวมของ Subtask ทั้งหมดในโปรเจกต์ในหน้า Tasks Summary
*   **Interactive Dashboard Categories**: Category filter tabs at the top of the main Dashboard (All, Quick Service, Installer, Renovate, Build-in, New House, Maintenance) which dynamically compute and update all dashboard stats on click.
    *ตัวกรองหมวดหมู่โครงการใน Dashboard*: ปุ่มตัวกรองด้านบนสุดเพื่อกรองข้อมูลโครงการตามประเภทการทำงาน ซึ่งช่วยในการคำนวณและวิเคราะห์สถิติต่างๆ ในแดชบอร์ดทันทีที่คลิกเลือก
*   **Full-Width Stage Progression & Project Details**: Reorganized dashboard layout to make the Stage Progression grid full-width, displaying a list of active projects under each workflow column (Project ID, Name, Start Date, Value) with direct project detail page redirection links.
    *สถิติและรายชื่อโครงการย่อยตามขั้นตอน*: ปรับเปลี่ยนการจัดวางหน้าแดชบอร์ดให้มีขนาดเต็มหน้าจอเพื่อจำแนกและระบุรายชื่อโครงการที่ค้างอยู่ในแต่ละขั้นตอนการทำงาน ช่วยให้เห็นภาพรวมของโครงการย่อยทั้งหมด

---

## 7. Database & Infrastructure on Coolify / ฐานข้อมูลและโครงสร้างพื้นฐานบน Coolify (vbooking_db)

⚠️ **หมายเหตุสำคัญ:** ระบบ **vbooking(buildflow)** ใช้ฐานข้อมูลแยกเฉพาะตัว (`vbooking_db`) **ไม่ใช้ร่วมกับ `timesheet_db`**

*   **Database Engine / ระบบฐานข้อมูล**: **PostgreSQL** (ชื่อฐานข้อมูลเฉพาะ: `vbooking_db`)
*   **Database Server / เซิร์ฟเวอร์ฐานข้อมูล**: Hostinger VPS (`187.77.147.16:5432`)
*   **Deployment Platform / แพลตฟอร์มการปรับใช้**: **Coolify** (ปรับใช้และ Build ผ่าน Nixpacks `nixpacks.toml` ด้วย Node.js / Express Backend `server.js`)
*   **Database Connection / การเชื่อมต่อฐานข้อมูล**: แอปพลิเคชัน **vbooking(buildflow)** บน Coolify เชื่อมต่อไปยัง `vbooking_db` บน PostgreSQL ผ่านตัวแปรสภาพแวดล้อม `DATABASE_URL`:
    ```env
    DATABASE_URL=postgresql://postgres:EsQShpeaGvSr21I5ieQGJRmCELp78GSlQn6hQHAIjbTnY4c1aWw56JleGierEk2t@187.77.147.16:5432/vbooking_db
    ```

### ขั้นตอนการสร้างฐานข้อมูลใหม่บน PostgreSQL Server:
```sql
-- 1. สร้างฐานข้อมูลใหม่สำหรับ vbooking(buildflow)
CREATE DATABASE vbooking_db;

-- 2. เชื่อมต่อเข้าฐานข้อมูล vbooking_db และนำเข้า Schema
\c vbooking_db;
-- จากนั้นรันคำสั่ง SQL จากไฟล์ db_schema.sql เพื่อสร้างโครงสร้างตารางทั้งหมด
```

---

## 8. Master Project Types Configuration / การตั้งค่าประเภทโครงการหลัก

ระบบสนับสนุนการกำหนดประเภทโครงการหลัก (Master Project Types) เพื่อจัดหมวดหมู่โครงการ วิเคราะห์สถิติ และจัดทำรูปแบบเลขรหัสโครงการที่เป็นระเบียบโดยอัตโนมัติ:

| ลำดับ | ประเภทโครงการ (Name) | รหัส ID ในระบบ (ID) | ป้ายกำกับ (Badge) | ตัวนำหน้ารหัสโครงการ (Code Prefix) |
| :---: | :--- | :---: | :---: | :---: |
| 1 | **Quick service** | `quick_service` | `Quick service ⚡` | **`PQ`** |
| 2 | **Installer (งานติดตั้ง)** | `installer` | `งานติดตั้ง 🛠️` | **`PI`** |
| 3 | **Renovate (งานรีโนเวท)** | `renovate` | `Renovate 🏡` | **`PR`** |
| 4 | **Build-in (งานบิวท์อิน)** | `build_in` | `Build-in 🛋️` | **`PB`** |
| 5 | **New house (สร้างบ้านใหม่)** | `new_house` | `New house 🏠` | **`PN`** |
| 6 | **Maintenance (งานซ่อมบำรุง MA)**| `maintenance` | `MA 🔧` | **`PM`** |
| 7 | *ประเภทสร้างใหม่เอง (เช่น test)* | *ระบบจะสร้าง ID อัตโนมัติ* | *ตามผู้ใช้ระบุ* | **`P`** + อักษรแรก (เช่น **`PT`**) |

### การแปลงรหัสและคำนวณแดชบอร์ดโครงการ (Dashboard Compatibility Mapping):
เพื่อความยืดหยุ่นในการคำนวณสถิติของแดชบอร์ด ข้อมูลโครงการในฐานข้อมูลอาจมีโครงสร้าง ID แบบสั้น (Legacy Format) หรือแบบยาว (New Format) โดยระบบจะรวบรวมเข้าด้วยกันเพื่อออกรายงานอย่างถูกต้องดังนี้:
*   **หมวดหมู่ Quick service**: รวบรวมข้อมูลโครงการที่มีสถานะ `projectType = 'quick'` หรือ `'quick_service'`
*   **หมวดหมู่ Installer**: รวบรวมข้อมูลโครงการที่มีสถานะ `projectType = 'install'`, `'installation'` หรือ `'installer'`
*   **หมวดหมู่ Renovate**: รวบรวมข้อมูลโครงการที่มีสถานะ `projectType = 'renovate'` หรือไม่มีการระบุประเภท
*   **หมวดหมู่ Build-in**: รวบรวมข้อมูลโครงการที่มีสถานะ `projectType = 'build'` หรือ `'build_in'`
*   **หมวดหมู่ New (สร้างบ้านใหม่)**: รวบรวมข้อมูลโครงการที่มีสถานะ `projectType = 'new_house'` หรือ `'construction'`
*   **หมวดหมู่ Maintenance**: รวบรวมข้อมูลโครงการที่มีสถานะ `projectType = 'ma'`, `'support'` หรือ `'maintenance'`

---

## 9. Frequently Asked Questions (FAQ) & KM / คำถามที่พบบ่อยและคลังความรู้ระบบ

### Q1: ทำไมการเพิ่มประเภทโครงการแบบกำหนดเอง (Custom Project Type) ถึงได้รหัสคำนำหน้าเป็นตัวอื่นที่ไม่เหมือนค่าเริ่มต้น?
*   **A**: สำหรับประเภทโครงการเริ่มต้น 6 ประเภทหลัก ระบบจะมีรหัสโค้ดนำหน้าเฉพาะเจาะจง (เช่น `PQ` สำหรับ Quick service และ `PI` สำหรับ Installer) แต่หากสร้างประเภทใหม่ขึ้นมานอกเหนือจากนี้ผ่านเมนูตั้งค่าระบบ (เช่น `test` หรือ `design`) ตัวระบบจะกำหนดตัวอักษรนำหน้าเป็นตัว `P` ตามด้วยอักษรตัวแรกของชื่อประเภทโครงการนั้น ๆ เป็นอักษรตัวใหญ่ (เช่น `test` ➔ `PT`, `design` ➔ `PD`) เพื่อสร้างรูปแบบโครงการที่เป็นระเบียบโดยอัตโนมัติ

### Q2: หากโครงการในฐานข้อมูลรุ่นเก่าใช้ ID ย่อ เช่น 'quick' หรือ 'install' แดชบอร์ดจะทำงานผิดพลาดหรือไม่?
*   **A**: **ไม่ผิดพลาดครับ** ระบบแดชบอร์ด (Dashboard Overview) ได้รับการพัฒนาให้รองรับการเข้ากันได้แบบย้อนหลัง (Backward Compatibility) โดยจะดึงข้อมูลโครงการทั้งแบบชื่อย่อเดิมและชื่อเต็มที่ใช้ในปัจจุบันมารวบรวมคำนวณให้โดยอัตโนมัติ จึงมั่นใจได้ว่าข้อมูลสถิติของโครงการในระบบจะไม่ตกหล่น

### Q3: ปัญหาดีพลอยล้มเหลว (Failed Deployment) บน Coolify เกิดจากอะไรและแก้ไขอย่างไร?
*   **A**: เกิดจาก 2 จุดหลักและได้รับการแก้ไขแล้วดังนี้ครับ:
    1.  *ปัญหาการคัดลอก Context เกินขนาด*: เนื่องจากระบบไม่ได้เพิ่มไฟล์ `.dockerignore` ทำให้เวลา Docker Build ระบบจะพยายามส่งไฟล์ `node_modules` บนเครื่องโลคอล และคู่มือระบบที่เป็นไฟล์ Word (`.docx`) และ HTML ตัวใหญ่เข้าไปส่งผลให้ Memory ของเซิร์ฟเวอร์เต็มและ Build Container ถูกลบออกกะทันหัน (Exit code 255) ➔ *แก้ไขโดยสร้างไฟล์ `.dockerignore` เพื่อคัดกรองโฟลเดอร์และไฟล์ขนาดใหญ่ที่ไม่เกี่ยวข้องออกทั้งหมด*
    2.  *ปัญหาการกรองนามสกุล HTML*: ในตอนแรกการกำหนด `*.html` ใน `.dockerignore` ส่งผลให้ไปลบไฟล์ `index.html` (ซึ่งเป็นตัวหลักในการคอมไพล์ฝั่ง React) ไปด้วย ทำให้คอมไพล์ไม่ผ่านด้วยข้อความ `Could not resolve entry module "index.html"` ➔ *แก้ไขโดยการระบุชื่อคู่มือ `user_manual.html` ตรงตัวแทนการใช้ `*.html`*
    3.  *ปรับปรุง Base Docker Image*: เปลี่ยนไปรันระบบบน Docker Multi-stage Build โดยใช้ `node:22-slim` ซึ่งเป็นตัวเดียวกับโปรเจกต์ `vq` ช่วยประหยัดการดึงข้อมูลจาก Docker Hub ผ่านตัว Cache ในระบบ VPS

### Q4: ฟีเจอร์ Milestone Templates (แม่แบบโครงการ) ในหน้าตั้งค่ามีไว้เพื่ออะไรและทำงานอย่างไร?
*   **A**: สร้างขึ้นมาเพื่อเป็น **มาตรฐานขั้นตอนการทำงาน (Standardized Workflow)** และ **ช่วยเจนแผนงานอัตโนมัติในคลิกเดียว** โดยมีกลไกสำคัญดังนี้:
    1.  *Standardization (มาตรฐานการทำงาน)*: บังคับให้โครงการในกลุ่มเดียวกันทำตามขั้นตอนเหมือนกัน (เช่น เตรียมการ ➔ ติดตั้ง ➔ ตรวจสอบ QA ➔ ส่งมอบ)
    2.  *Auto-Instantiation (ลดเวลาคีย์งาน)*: คลิกเดียวเพื่อสร้างงานย่อยทั้งหมดตามเทมเพลตพร้อมชั่วโมงประมาณการเริ่มต้น โดยไม่ต้องกรอกเองทีละรายการ
    3.  *Relative Timeline (%)*: กำหนดระยะเวลางานย่อยในเทมเพลตเป็นเปอร์เซ็นต์สะสม (เช่น งานติดตั้งรันในช่วง 10%-70% ของเวลาโครงการ) เพื่อให้ระบบคำนวณวันเริ่มและสิ้นสุดจริงบน Gantt Chart ได้สัมพันธ์กับระยะเวลาของโครงการโดยอัตโนมัติ ไม่ว่าโครงการจะทำ 10 วันหรือ 30 วันก็ตาม

---

## 10. Milestone Templates / แม่แบบโครงการ

แม่แบบโครงการ (Milestone Templates) คือเครื่องมือจัดทำโครงสร้างงานมาตรฐานสำหรับโครงการแต่ละประเภท เพื่อให้องค์กรสามารถควบคุมคุณภาพของกระบวนการทำงานและเพิ่มความเร็วในการเริ่มดำเนินงานโครงการใหม่

### ส่วนประกอบสำคัญในเทมเพลต:
*   **ชื่อขั้นตอนการทำงาน (Task/Milestone Name)**: เช่น เตรียมความพร้อม, ขั้นตอนการทำงานจริง, การทดสอบระบบ และการส่งมอบ
*   **สัดส่วนระยะเวลาทำงาน (Phase Range %)**: กำหนดในรูปแบบ Start % ถึง End % ของโครงการ เช่น `10% - 70%` ซึ่งระบบจะแปลงเป็นวันที่ในปฏิทินจริงโดยอัตโนมัติตามระยะเวลา (Duration) ของแต่ละโครงการที่เปิดใช้
*   **ชั่วโมงประมาณการเริ่มต้น (Default Estimated Hours)**: ค่าประมาณเวลาเฉลี่ยที่ใช้ในการทำงานนั้น ๆ สำหรับนำไปใช้ตั้งต้นควบคุมงบประมาณชั่วโมงงานย่อย

### วิธีการใช้งานในโครงการจริง:
เมื่อสร้างโครงการใหม่ขึ้นมาในระบบ PM สามารถเปิดแถบแผนงานโครงการ (Gantt/Project Plan) และเลือกปุ่มดึงเทมเพลตโครงการที่เหมาะสมเข้าใช้งานได้ทันที ตัวระบบจะแปลงร้อยละเวลาเป็นตารางเวลาการทำงานจริงบนบอร์ด Kanban และแถบ Gantt Chart ให้อัตโนมัติทันที

---

## 11. VQ Installer System Integration / การเชื่อมโยงข้อมูลกับระบบจัดการช่าง (VQ)

ระบบ vbooking(buildflow) ได้เชื่อมโยงข้อมูลแบบเรียลไทม์กับระบบบริหารจัดการช่างติดตั้ง VQ (https://vibepjm.online) เพื่อเพิ่มประสิทธิภาพและความสอดคล้องของข้อมูลการดำเนินงาน:

*   **Dynamic Branch Integration / การดึงข้อมูลสาขาแบบไดนามิก**:
    *   *กลไกการทำงาน*: ตัว backend ของระบบ BuildFlow จะทำการคิวรีรายชื่อสาขาทั้งหมด (เช่น สาขาบางนา, สาขาพระราม 9, และสาขาอื่น ๆ รวมกว่า 99 สาขา) ส่งตรงมาจาก backend ของระบบ VQ ผ่าน API `https://vibepjm.online/api/branches` แบบเบื้องหลัง (Background fetching)
    *   *ระบบทนทานความเสถียร (Robust Cacheing)*: Backend จะบันทึกผลลัพธ์ลงใน Cache ความจำเครื่องเพื่อความรวดเร็วและอัปเดตทุก ๆ 1 ชั่วโมง โดยหากระบบ VQ ขัดข้องหรือไม่สามารถเข้าถึงได้ ระบบจะสลับไปใช้รายการสาขาสำรอง (Fallback) โดยอัตโนมัติ ทำให้ระบบ BuildFlow สามารถเปิดหน้ากรอก Lead และโปรเจกต์ได้แบบไม่หยุดชะงัก
    *   *การแสดงผลบนหน้าจอ UI*: Dropdown เลือกสาขาในส่วนของการสร้าง Lead ใหม่ (Leads Creation Form), การกรองข้อมูลโครงการ (Projects Filter) และฟอร์มสร้างโครงการใหม่ (Projects Creation Form) จะโหลดข้อมูลสาขาขึ้นมาแสดงผลแบบไดนามิกทันที ทำให้มั่นใจได้ว่าข้อมูลสาขาระหว่างสองระบบตรงกัน 100%


