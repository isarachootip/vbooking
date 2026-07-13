# NexTime System Guide / คู่มือการใช้งานระบบ NexTime

Welcome to the NexTime System Guide. This document provides a comprehensive overview of all system features, roles, and functionalities.
ยินดีต้อนรับสู่คู่มือการใช้งานระบบ NexTime เอกสารฉบับนี้อธิบายภาพรวมและคำแนะนำการใช้งานฟีเจอร์ บทบาทหน้าที่ และฟังก์ชันการทำงานทั้งหมดของระบบอย่างครบถ้วน

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

NexTime locks in logged time data while providing options for administrative corrections:
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
