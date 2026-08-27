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
*   **Progress Calculation & Rollup / การคำนวณความคืบหน้า**:
    *   **Milestone with Subtasks**: Calculated automatically as `(Completed Subtasks with status 'Done' / Total Subtasks) * 100%`.
        *สำหรับงานหลักที่มีงานย่อย*: คำนวณจากสัดส่วนของงานย่อยที่เสร็จสมบูรณ์ `(จำนวน Subtask สถานะ Done / จำนวน Subtask ทั้งหมด) * 100%`
    *   **Milestone without Subtasks**: Determined directly by the Milestone's status (`To Do = 0%`, `In Progress = 50%`, `Review = 90%`, `Done = 100%`).
        *สำหรับงานหลักที่ไม่มีงานย่อย*: คำนวณตามสถานะของงานหลักโดยตรง (`To Do = 0%`, `In Progress = 50%`, `Review = 90%`, `Done = 100%`)
    *   **Overall Project Progress (% Done)**: Mathematical average of all Main Milestones progress in the project: `Sum(Milestone Progress) / Total Milestones`.
        *ความก้าวหน้าภาพรวมโครงการ*: คำนวณจากค่าเฉลี่ยของ % Progress ของทุก Milestone หลักในโครงการ
*   **How to Update Progress / ช่องทางการอัปเดตความก้าวหน้า**:
    1.  *Project Plan & Gantt (แผนงาน / Gantt)*: Click the edit button (✏️) on any milestone/subtask in the table and change its status.
    2.  *Tasks & QC (ขั้นตอนงาน & QC)*: Complete inspection checklists and advance task statuses to `Done`.
    3.  *Project Board (Kanban)*: Drag and drop task cards to `In Progress`, `Review`, or `Done` columns.
    4.  *Site Logs & Check-In (บันทึกหน้างาน / เช็คอินช่าง)*: Technicians submit daily site reports and PMs verify and complete steps.
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

### Q4: ทำไมระบบถึงขึ้นจอ "no available server" (502 Bad Gateway) และในหน้าจอ Deploy ของ Coolify แจ้งเตือนว่า "Exited (10x restarts)"?
*   **A**: อาการนี้เกิดจากโค้ดฝั่ง Backend (ไฟล์ `server.js`) มี **Syntax Error** (เช่น พิมพ์เครื่องหมายผิด อักขระแปลกปลอม หรือลืมวงเล็บ) ทำให้เมื่อ Node.js พยายามสตาร์ทเซิร์ฟเวอร์ โปรแกรมจะแครช (Crash) ทันที 
    *   ระบบ Coolify จะพยายามรันเซิร์ฟเวอร์ขึ้นมาใหม่ (Restart) อัตโนมัติ แต่เมื่อรันแล้วแครชติดกัน 10 ครั้ง (10x restarts) Coolify จะสั่งหยุดทำงาน (Exited) ทันทีเพื่อประหยัดทรัพยากร
    *   เมื่อไม่มีเซิร์ฟเวอร์ทำงานอยู่เบื้องหลัง Nginx (Reverse Proxy) จึงไม่สามารถส่งต่อคำขอได้ และแสดงหน้าจอว่า `no available server` (502 Bad Gateway)
    *   **วิธีแก้**: ให้เข้าไปดู Log ในส่วนของการ Deploy บน Coolify เพื่อระบุบรรทัดที่เกิด Syntax Error ในไฟล์ `server.js` (เช่น ปัญหาหลุดเครื่องหมาย `\``) จากนั้นแก้ไขให้ถูกต้องและกด Deploy ใหม่

### Q5: ฟีเจอร์ Milestone Templates (แม่แบบโครงการ) ในหน้าตั้งค่ามีไว้เพื่ออะไรและทำงานอย่างไร?
*   **A**: สร้างขึ้นมาเพื่อเป็น **มาตรฐานขั้นตอนการทำงาน (Standardized Workflow)** และ **ช่วยเจนแผนงานอัตโนมัติในคลิกเดียว** โดยมีกลไกสำคัญดังนี้:
    1.  *Standardization (มาตรฐานการทำงาน)*: บังคับให้โครงการในกลุ่มเดียวกันทำตามขั้นตอนเหมือนกัน (เช่น เตรียมการ ➔ ติดตั้ง ➔ ตรวจสอบ QA ➔ ส่งมอบ)
    2.  *Auto-Instantiation (ลดเวลาคีย์งาน)*: คลิกเดียวเพื่อสร้างงานย่อยทั้งหมดตามเทมเพลตพร้อมชั่วโมงประมาณการเริ่มต้น โดยไม่ต้องกรอกเองทีละรายการ
    3.  *Relative Timeline (%)*: กำหนดระยะเวลางานย่อยในเทมเพลตเป็นเปอร์เซ็นต์สะสม (เช่น งานติดตั้งรันในช่วง 10%-70% ของเวลาโครงการ) เพื่อให้ระบบคำนวณวันเริ่มและสิ้นสุดจริงบน Gantt Chart ได้สัมพันธ์กับระยะเวลาของโครงการโดยอัตโนมัติ ไม่ว่าโครงการจะทำ 10 วันหรือ 30 วันก็ตาม

---

## 10. Milestone Templates / แม่แบบโครงการ

แม่แบบโครงการ (Milestone Templates) คือเครื่องมือจัดทำโครงสร้างงานมาตรฐานสำหรับโครงการแต่ละประเภท เพื่อให้องค์กรสามารถควบคุมคุณภาพของกระบวนการทำงานและเพิ่มความเร็วในการเริ่มดำเนินงานโครงการใหม่

### ส่วนประกอบสำคัญในเทมเพลต (ฟิลด์ข้อมูลหน้า Add New Milestone Template):
*   **Project Template Name (ชื่อแม่แบบโครงการ)**: หมวดหมู่ที่แม่แบบนี้จะถูกนำไปใช้ เช่น งานสร้างใหม่, งานรีโนเวทบ้าน
*   **Milestone Title (ชื่อขั้นตอนการทำงาน)**: ชื่อของงานย่อยหลักที่ทีมงานจะมองเห็น เช่น รื้อถอนระบบไฟฟ้าเพิ่มเติม, เทปูนฐานราก
*   **Description**: รายละเอียดหรือขอบเขตงาน (Scope of work) ที่จะให้ทีมช่างหรือทีมงานอ่านเมื่อเปิดการ์ดงานนี้
*   **Priority**: ความสำคัญของงาน (Low, Medium, High, Critical)
*   **Default Est. Hours (ชั่วโมงประมาณการเริ่มต้น)**: ค่าประมาณเวลาเฉลี่ยที่ใช้ในการทำงานนั้น ๆ สำหรับนำไปใช้ตั้งต้นควบคุมงบประมาณชั่วโมงงานย่อย (เช่น 48 ชั่วโมง)
*   **Timeline Start Percent (0-100%)**: จุดเริ่มต้นของงานเมื่อเทียบกับระยะเวลาทั้งหมดของโปรเจกต์
*   **Timeline End Percent (0-100%)**: จุดสิ้นสุดของงานเมื่อเทียบกับระยะเวลาทั้งหมดของโปรเจกต์
*(หมายเหตุ: ระบบจะแปลง % เหล่านี้เป็นวันที่ในปฏิทินจริงโดยอัตโนมัติ ตามระยะเวลาของแต่ละโครงการที่เปิดใช้งาน)*

### วิธีการใช้งานในโครงการจริง:
เมื่อสร้างโครงการใหม่ขึ้นมาในระบบ PM สามารถเปิดแถบแผนงานโครงการ (Gantt/Project Plan) และเลือกปุ่มดึงเทมเพลตโครงการที่เหมาะสมเข้าใช้งานได้ทันที ตัวระบบจะแปลงร้อยละเวลาเป็นตารางเวลาการทำงานจริงบนบอร์ด Kanban และแถบ Gantt Chart ให้อัตโนมัติทันที

---

## 11. VQ Installer System Integration / การเชื่อมโยงข้อมูลกับระบบจัดการช่าง (VQ)

ระบบ vbooking(buildflow) ได้เชื่อมโยงข้อมูลแบบเรียลไทม์กับระบบบริหารจัดการช่างติดตั้ง VQ (https://vibepjm.online) เพื่อเพิ่มประสิทธิภาพและความสอดคล้องของข้อมูลการดำเนินงาน:

*   **Dynamic Branch Integration / การดึงข้อมูลสาขาแบบไดนามิก**:
    *   *กลไกการทำงาน*: ตัว backend ของระบบ BuildFlow จะทำการคิวรีรายชื่อสาขาทั้งหมด (เช่น สาขาบางนา, สาขาพระราม 9, และสาขาอื่น ๆ รวมกว่า 99 สาขา) ส่งตรงมาจาก backend ของระบบ VQ ผ่าน API `https://vibepjm.online/api/branches` แบบเบื้องหลัง (Background fetching)
    *   *ระบบทนทานความเสถียร (Robust Cacheing)*: Backend จะบันทึกผลลัพธ์ลงใน Cache ความจำเครื่องเพื่อความรวดเร็วและอัปเดตทุก ๆ 1 ชั่วโมง โดยหากระบบ VQ ขัดข้องหรือไม่สามารถเข้าถึงได้ ระบบจะสลับไปใช้รายการสาขาสำรอง (Fallback) โดยอัตโนมัติ ทำให้ระบบ BuildFlow สามารถเปิดหน้ากรอก Lead และโปรเจกต์ได้แบบไม่หยุดชะงัก
    *   *การแสดงผลบนหน้าจอ UI*: Dropdown เลือกสาขาในส่วนของการสร้าง Lead ใหม่ (Leads Creation Form), การกรองข้อมูลโครงการ (Projects Filter) และฟอร์มสร้างโครงการใหม่ (Projects Creation Form) จะโหลดข้อมูลสาขาขึ้นมาแสดงผลแบบไดนามิกทันที ทำให้มั่นใจได้ว่าข้อมูลสาขาระหว่างสองระบบตรงกัน 100%

---

## 12. Lead Management & Smart Survey Booking (12-Step Pipeline: Step 1 & 2) / การบริหารจัดการลูกค้าเป้าหมายและการนัดหมายสำรวจหน้างาน

กระบวนการบริหารโครงการ 12 ขั้นตอน (12-Step Project Pipeline) เริ่มต้นที่ขั้นตอนที่ 1 และ 2 ซึ่งเป็นสะพานเชื่อมสำคัญระหว่างทีมงานฝ่ายขายและทีมงานช่างควบคุมคุณภาพหน้างาน (QC Surveyor):

```mermaid
flowchart TD
    A["1. Lead & Requirement<br/>(บันทึกข้อมูลลูกค้า/ความต้องการ)"] --> B["2. นัดหมายสำรวจหน้างาน<br/>(Site Visit & Logistics)"]
    
    subgraph Step2 ["ขั้นตอนที่ 2: Survey Booking"]
        B --> C["ระบุข้อมูลผู้ประสานงาน<br/>• ชื่อ, เบอร์โทร, LINE ID<br/>• พิกัด GPS / แผนที่ Google Maps"]
        C --> D["เลือกวัน-เวลาเข้าสำรวจ<br/>(survey_date)"]
        D --> E["⚡ Smart QC Dispatch Engine<br/>(ตรวจคิวว่างช่าง QC อัตโนมัติ)"]
        E --> F["มอบหมายช่าง QC ประจำพื้นที่<br/>(surveyor_id)"]
    end
    
    Step2 --> G["3. แปลงเป็นโครงการ (Convert to Project)<br/>• สร้าง Project Smart ID<br/>• เปิด Workflow: Buy-Survey / Survey"]
    G --> H["4. ส่งต่องานเข้าขั้นตอนที่ 3<br/>Survey QC Inspection (ลงพื้นที่สำรวจจริง)"]
```

### 12.1 ส่วนประกอบสำคัญในขั้นตอนที่ 2 (Survey Booking Details):
1. **ข้อมูลโลจิสติกส์หน้างาน (Site Visit & Logistics Info):**
   * บังคับกรอกชื่อผู้ประสานงานหน้างาน (Site Coordinator Name), เบอร์โทรศัพท์ติดต่อ และ LINE ID
   * **Smart GPS / DMS Parser**: ระบบรองรับการป้อนข้อมูลพิกัดทั้งแบบทศนิยม (`13.851979, 100.643406`), องศาลิปดา DMS (`13°51'08.1"N 100°38'36.5"E`) หรือ URL จาก Google Maps โดยระบบจะแยกแยะและดึงพิกัดจริง พร้อมแสดง **Live Google Maps Preview** ทันทีในแบบฟอร์ม เพื่อป้องกันปัญหาช่างหลงทางหรือเข้าผิดสถานที่

2. **ระบบคัดกรองคิวว่างช่าง QC อัจฉริยะ (Smart QC Dispatch Engine):**
   * เมื่อผู้ใช้เลือกวัน-เวลาที่ต้องการเข้าสำรวจ (`survey_date`) Frontend จะเรียก API `/api/users/available-surveyors?date=...`
   * **ตรรกะการตรวจสอบ (Availability Logic):**
     * คัดเลือกเฉพาะผู้ใช้ในตาราง `users` ที่มีทักษะ **`'QC'`** อยู่ในอาเรย์ `skills` (เช่น ทีม QC ทั้ง 6 ท่าน)
     * ตรวจสอบประวัติการนัดหมายในตาราง `leads` ว่าในช่วงเวลา **$\pm$ 3 ชั่วโมง (10,800 วินาที)** ช่าง QC ท่านนั้นมีงานนัดหมายสำรวจอื่นซ้อนทับอยู่หรือไม่
     * ส่งคืนเฉพาะรายชื่อช่างที่ว่างจริงให้เลือกมอบหมาย (`surveyor_id`)

3. **ประวัติการติดตามและการนัดหมาย (Lead Follow-up History):**
   * บันทึกประวัติการเปลี่ยนแปลงและข้อความติดตามทุกครั้งลงในตาราง `lead_followups`
   * อัปเดตจำนวนครั้งการติดต่อ (Follow-up Count) และแสดงผลไทม์ไลน์แบบเรียลไทม์

4. **การแปลงเป็นโครงการและเปิด Workflow (Convert to Project Pipeline):**
   * เมื่อยืนยันการสำรวจและกด Convert Lead ระบบจะสร้าง **Smart Project ID** ตามประเภทงานและสาขา (เช่น `PRBNA2608170001`)
   * สร้าง Workflow Columns สำหรับประเภทงาน เช่น `Buy-Survey` ➔ `Survey` ➔ `Design` ➔ `ชำระเงิน` ➔ `Assign ช่าง` ➔ `Check-in` ➔ `QC` ➔ `Close`
   * ส่งมอบงานให้ช่าง QC เข้าสู่ **ขั้นตอนที่ 3: Survey QC Inspection** (เช็คอินหน้างานด้วย GPS และบันทึกรูปถ่ายผลการสำรวจ)

---

## 13. Site Visit Results & Post-Visit Action Management / การบันทึกผลการเข้า Visit Site ลูกค้าและการดำเนินการต่อ

หลังจากที่ทีมงานฝ่ายขาย (Sales), ผู้จัดการโครงการ (PM) หรือช่างสำรวจ (QC Surveyor) เดินทางกลับจากการลงพื้นที่หน้างานจริง ระบบมีโมดูลเฉพาะสำหรับบันทึกและสรุปข้อมูลสนาม:

```mermaid
flowchart TD
    A["ออกไป Visit Site ลูกค้าจริง"] --> B["กดปุ่ม '📋 บันทึกผล Visit' / '📝 บันทึกผล Visit หน้างาน'"]
    B --> C["กรอกแบบฟอร์ม 4 ส่วน:<br/>1. ข้อมูลการ Visit<br/>2. สภาพหน้างาน & ขอบเขต<br/>3. ความต้องการลูกค้า & การตัดสินใจ<br/>4. Next Action & หมายเหตุภายใน"]
    C --> D["บันทึกลงตาราง lead_site_visit_results"]
    D --> E{"Next Action คืออะไร?"}
    E -->|"ส่งใบเสนอราคา"| F["อัปเดตสถานะ Lead ➔ 'Pending Quote'"]
    E -->|"โทรติดตาม / นัดหมายใหม่"| G["Auto-Create งานติดตามใน lead_followups"]
    E -->|"ปิดงาน (ไม่สนใจ)"| H["อัปเดตสถานะ Lead ➔ 'Lost'"]
    F & G & H --> I["แสดงผลในประวัติย้อนหลัง (History Timeline)"]
```

### 13.1 รายละเอียดฟิลด์ข้อมูลในตาราง `lead_site_visit_results`:
* `visited_by_id` / `visited_by_name`: พนักงานหรือช่างที่ลงพื้นที่จริง
* `visit_date`: วัน-เวลาที่ไปปฏิบัติงานจริง
* `visit_result`: ผลการเข้าพบ (`Visited`, `Customer Absent`, `Cancelled`, `Rescheduled`)
* `site_condition`: สภาพอาคาร/พื้นที่จริงที่พบ
* `work_scope_summary`: สรุปขอบเขตงานที่ต้องดำเนินการ
* `estimated_budget`: งบประมาณประเมินเบื้องต้น (บาท)
* `customer_interest`: ความต้องการหรือข้อกังวลของลูกค้า
* `customer_decision`: สถานะการตัดสินใจของลูกค้า (`Interested`, `Need More Info`, `Pending Quote`, `Not Interested`)
* `next_action`: การดำเนินการขั้นถัดไป (`send_quotation`, `follow_up_call`, `reschedule_visit`, `close_lost`)
* `next_action_date`: วันนัดหมายครั้งถัดไป
* `internal_notes`: หมายเหตุลับภายในเฉพาะทีมงาน (PM/SA/Admin)
