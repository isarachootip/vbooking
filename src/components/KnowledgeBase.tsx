import React, { useState, useEffect } from 'react';
import { HelpCircle, ChevronDown, ChevronRight, BookOpen, Database, BarChart3, Clock, Languages, CalendarRange, Users, Star, Shield, MessageSquare, Zap, Layers } from 'lucide-react';
import { marked } from 'marked';
import type { User } from '../types';

type Lang = 'en' | 'th';

interface KnowledgeBaseProps {
  currentUser?: User | null;
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ currentUser }) => {
  const [lang, setLang] = useState<Lang>('th');
  const [expandedId, setExpandedId] = useState<string | null>('q1');
  const [expandedFeatureId, setExpandedFeatureId] = useState<string | null>('f1');
  const [activeTab, setActiveTab] = useState<'faq' | 'manual' | 'features'>('faq');
  const [manualHtml, setManualHtml] = useState<string>('');
  const [loadingManual, setLoadingManual] = useState<boolean>(false);

  const isAdmin = currentUser?.globalRole === 'Admin';

  useEffect(() => {
    if (activeTab === 'manual' && !manualHtml) {
      setLoadingManual(true);
      fetch('/api/user-manual')
        .then(res => res.json())
        .then(async data => {
          if (data.success && data.content) {
            const html = await marked.parse(data.content);
            setManualHtml(html);
          }
          setLoadingManual(false);
        })
        .catch(err => {
          console.error(err);
          setLoadingManual(false);
        });
    }
  }, [activeTab, manualHtml]);

  const content = {
    en: {
      title: "Help & FAQ",
      subtitle: "System documentation and frequently asked questions.",
      needHelpTitle: "Need more help?",
      needHelpDesc: "If you have additional questions or need technical support, you can access the Chat Widget in the bottom right corner of your screen to communicate with the AI assistant.",
      faqs: [
        {
          id: 'q0',
          question: 'What are the main features of NexTime?',
          icon: Star,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>NexTime is a comprehensive project and resource management system. Here are the core features:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Agile Task Management:</strong> Kanban boards, Backlog grooming, and Sprints for managing Stories, Tasks, and Bugs with Story Points (SP).</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Gantt Chart & Timeline:</strong> Visual project planning to see overlapping tasks and bottlenecks.</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Timesheet & Approvals:</strong> Employees can log daily work hours, which are sent to PMs or Admins for approval.</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Resource & Cost Tracking:</strong> Manage Project Roles, setup Labor Rates, and calculate Man-Days and budgets automatically.</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>AI Assistant:</strong> Built-in Chatbot powered by Google Gemini (or OpenAI) to help answer system questions.</li>
                <li><strong>Role-Based Access Control (RBAC):</strong> Granular permission schemes for Admins, Managers, PMs, and Members.</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q1',
          question: 'How is the Milestone Progress calculated?',
          icon: BarChart3,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>The progress calculation depends on whether a task has subtasks:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Tasks WITHOUT Subtasks:</strong> Progress is strictly 0% or 100%. If the task is in "In Progress", it becomes 50%. If in "Review", it is 90%. It only reaches 100% when moved to "Done".</li>
                <li><strong>Tasks WITH Subtasks:</strong> Progress is calculated purely by the percentage of its subtasks that are in "Done" status (e.g., 2 out of 4 subtasks done = 50%), regardless of which column the main task is in.</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q2',
          question: 'How do I delete Timesheets, Tasks, or Subtasks?',
          icon: Clock,
          answer: (
            <div>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}>
                  <strong>Timesheets:</strong> Go to the "Timesheet" menu. In your logged time history list, look for the red trash bin icon at the end of the row.
                  <br />
                  <em>* Note: Employees can only delete logs in Draft, Pending, or Rejected status. Approved timesheets can only be deleted/corrected by an Admin or Manager.</em>
                </li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Tasks (Board View):</strong> On the "Tasks" board, hover over the task card and click the small red trash bin icon in the top right corner.</li>
                <li><strong>Tasks (Bulk Delete):</strong> Go to the "Backlog" or "Summary" view under Tasks, check the boxes next to multiple items, and click the red "Delete Selected" button at the top.</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q3',
          question: 'How do I move Tasks between Sprints?',
          icon: BookOpen,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>You can move tasks to different sprints easily:</p>
              <ol style={{ listStyleType: 'decimal', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}>Go to the <strong>Backlog</strong> tab under Tasks.</li>
                <li style={{ marginBottom: '0.25rem' }}>Find the task you want to move. On the right side of the row, there is a dropdown menu displaying its current Sprint.</li>
                <li>Click the dropdown and select the desired Sprint, or select "Backlog" to remove it from all sprints. You can also select multiple tasks using the checkboxes on the left and use the Bulk Action button at the top to reassign them simultaneously.</li>
              </ol>
            </div>
          )
        },
        {
          id: 'q4',
          question: 'Where is my application data stored?',
          icon: Database,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>All system data and user configurations are stored safely on your VPS server:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Application Data:</strong> Tasks, Projects, Timesheets, and Sprints are permanently stored in a <strong>PostgreSQL Database</strong> on your Coolify server.</li>
                <li><strong>Agent Memory:</strong> Any special rules or knowledge taught to the AI Agent (e.g., via the <code>/learn</code> command) are stored as customized rules in a local <code>.agents</code> folder on your device.</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q5',
          question: 'What do Monthly Summary and Approval Status mean on the Timesheet page?',
          icon: Clock,
          answer: (
            <div>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Monthly Summary:</strong> This shows the total hours you have logged during the <strong>current month</strong> (not week). The "Target: 160h" represents a standard full-time working month (e.g., 40 hours/week &times; 4 weeks).</li>
                <li><strong>Approval Status:</strong> This breaks down your logged hours for the current month into "Approved" (accepted) and "Pending" (awaiting approval). <br/><br/><em>* Note: Timesheets can be approved by anyone with an <strong>Admin</strong>, <strong>Manager</strong>, or <strong>Project Manager (PM)</strong> role.</em></li>
              </ul>
            </div>
          )
        },
        {
          id: 'q6',
          question: 'What do the Issue Types (Task, Story, Bug) mean?',
          icon: BookOpen,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>These are standard Agile categories used to organize work:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Story (Green):</strong> Stands for "User Story". It represents a new feature or requirement that delivers direct value to the user (e.g., "Login Page", "Export Report").</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Task (Blue):</strong> Represents technical work, chores, or background tasks that need to be done but aren't necessarily user-facing features (e.g., "Setup Database", "Configure Server").</li>
                <li><strong>Bug (Red):</strong> Represents a defect or error in the system that needs to be fixed (e.g., "App crashes on login").</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q7',
          question: 'What does "1 SP" or "Story Points" mean?',
          icon: BarChart3,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}><strong>SP (Story Points)</strong> is a unit of measure used in Agile to estimate the overall effort, complexity, and risk of a task.</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}>It uses the Fibonacci sequence (1, 2, 3, 5, 8, 13...) because estimating exact hours for complex tasks is often inaccurate.</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>1 SP</strong> represents the smallest, simplest baseline task (e.g., changing a text label).</li>
                <li>If a new task feels about twice as complex or takes twice as much effort as your baseline "1 SP" task, you would estimate it as "2 SP". If it's much harder, maybe "5 SP", and so on.</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q8',
          question: 'What do Timeline, Releases/Versions, and Backlog Grooming mean in the Tasks page?',
          icon: BookOpen,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>These are different views and tools for planning your project:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Timeline:</strong> A visual roadmap (Gantt chart) showing when tasks start and end. It helps you see the overall schedule and how tasks overlap.</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Releases / Versions:</strong> A way to group tasks that will be launched or delivered together. For example, all features needed for "Version 1.0".</li>
                <li><strong>Backlog Grooming:</strong> A dedicated view to review, estimate (SP), and prioritize unassigned tasks so they are ready for upcoming sprints.</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q9',
          question: 'What is the Timeline tab in Tasks used for?',
          icon: CalendarRange,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>The Timeline tab is a <strong>Gantt Chart</strong> view used for long-term scheduling and visual planning:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>All Sprints visible:</strong> It displays tasks from <strong>all sprints</strong> simultaneously, as long as they have a Start Date and End Date assigned.</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Interactive adjustments:</strong> You can quickly change schedules by dragging the task bars left or right, or stretching their edges to adjust the duration, without opening the task form.</li>
                <li><strong>Identify bottlenecks:</strong> It helps Project Managers easily spot overlapping work and potential scheduling conflicts.</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q10',
          question: 'How do "Project Roles" work in the Team directory?',
          icon: Users,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>The <strong>Project Roles</strong> section in a user's profile is a real-time summary of their current responsibilities across all projects:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Automatic Aggregation:</strong> The system automatically pulls this data from the "Manage Members" tab of every active project and displays it here, along with the project's timeframe (Start and End dates).</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>History / Resume View:</strong> This information remains on their profile even after the project's status changes to "Done", serving as a historical record of their contributions.</li>
                <li><strong>Automatic Removal:</strong> If a member is removed from a project before it is completed, or if the project itself is deleted, the role will automatically disappear from their profile history.</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q11',
          question: 'Can I view the Project Cost report by daily, monthly, or yearly?',
          icon: BarChart3,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>Yes, you can view the Project Cost report by different time periods:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}>Go to the <strong>Reports</strong> page and select the <strong>Project Cost</strong> tab.</li>
                <li>Use the Date Filter buttons (Daily, Monthly, Yearly) to choose your preferred time period and select the corresponding date/month/year to see the cost breakdown for that period.</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q12',
          question: 'What are Subtasks and how do they work?',
          icon: BookOpen,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>Subtasks are smaller, actionable items created under a Main Task (Milestone / Parent):</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>How to create:</strong> Click "Add Task" on the Tasks page, select "Subtask (To Do under Main Task)" in the level dropdown, and select the corresponding parent task under "Under Main Task".</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Progress Calculation:</strong> For Main Tasks with Subtasks, the parent task's progress is automatically calculated as the percentage of completed subtasks (e.g., 2 of 4 subtasks Done = 50% progress).</li>
                <li><strong>Hour Budgeting:</strong> The combined estimated hours of all subtasks under a parent task cannot exceed the parent task's budgeted estimated hours.</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q13',
          question: "Why can't I see a specific project, its tasks, or its sprints?",
          icon: Users,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>Project visibility in NexTime is restricted by user roles and membership:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Global Admins & Managers:</strong> Can view all projects, plans, tasks, and sprints automatically.</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Employees & Users:</strong> Can only see projects (including their tasks and sprints) where they are listed as members.</li>
                <li><strong>How to fix:</strong> Ask a Global Admin or the Project Manager (PM) of that project to add you as a member. They can do this by going to the "Projects" page, clicking the edit icon on the project, and adding you under the "Manage Members" section.</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q14',
          question: 'How many types of system users are there and what are their permissions?',
          icon: Shield,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>NexTime supports four user roles, which determine their system permissions:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Admin:</strong> Full system access, including editing system configurations, managing all projects, tasks, timesheets, and permissions.</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Manager:</strong> Administrative access to manage all projects, tasks, baselines, and approve/delete timesheets. Cannot edit core system settings.</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Employee (Internal Staff):</strong> Access to assigned projects. Can log hours, create tasks/subtasks, and transition task statuses. Cannot modify project baselines or delete approved timesheets.</li>
                <li><strong>User (External / Client):</strong> Restricted visibility. Can only view projects they are assigned to as members and join project chats. Has no editing or administration rights over project plans.</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q15',
          question: 'What is the Team Chat feature and how does it work?',
          icon: MessageSquare,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>Team Chat is a project-specific real-time messaging space for collaboration:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Dedicated Rooms:</strong> Every project has its own dedicated chat room. Conversations and attachments are kept organized by project.</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Access Rights:</strong> Employees and Users can only see and chat in rooms of projects they are members of. Admins and Managers can access all rooms.</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>File Sharing & Collaboration:</strong> Upload files, tag teammates, and communicate directly inside the project room.</li>
                <li><strong>Quick Link:</strong> Click the Chat icon on any project card in the Projects directory to jump straight to that project's chat.</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q16',
          question: 'How do I record my work results and attach images in a Timesheet?',
          icon: Clock,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>The Timesheet form is divided into Goal and Work Results to clearly capture your progress:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Goal / Description:</strong> This mandatory field is where you write the target or activity you intended to accomplish.</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Work Results:</strong> This optional field is where you describe the actual outcome or results achieved during that time.</li>
                <li><strong>Proof of Work Image:</strong> You can click "Choose Image" to attach an image (e.g., screenshot or photo) to provide visual proof of your work results.</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q17',
          question: "Why doesn't the \"Auto-Generated Plan\" appear immediately on a new project card?",
          icon: Zap,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>This can happen due to two main reasons:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}>
                  <strong>Need to Refresh:</strong> When a new project is created, the system auto-generates milestones on the server/database. However, the client-side task state is not synchronized immediately. Try <strong>refreshing your page (F5 / Reload)</strong> to load the new tasks.
                </li>
                <li>
                  <strong>Missing End Date:</strong> The auto-generation logic only triggers if the project is created with both a <strong>Start Date</strong> and <strong>End Date</strong>. If you created the project without an End Date and added it later via Edit, the tasks won't auto-generate. To fix this, go to the <strong>Project Plan</strong> tab, select your project, and click the <strong>🚀 Generate Milestones from Templates</strong> button.
                </li>
              </ul>
            </div>
          )
        },
        {
          id: 'q18',
          question: 'How do I filter tasks by Sprint on the Board and Timeline views?',
          icon: Layers,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>The <strong>Sprint Filter</strong> dropdown lets you focus on tasks belonging to a specific sprint on the Kanban Board and Timeline (Gantt chart):</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Where to find it:</strong> When you are on the <strong>Board</strong> or <strong>Timeline</strong> tab, a Sprint dropdown (stacked-layers icon) appears in the top-right header, right next to the Project filter.</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Auto-selection:</strong> When you select a project, the system automatically selects the <strong>current Active Sprint</strong> so you see only the tasks in progress right now.</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>All Sprints:</strong> Choose <em>"All Sprints"</em> to display tasks from every sprint (Planned, Active, and Completed) at once.</li>
                <li><strong>Backlog &amp; Grooming tabs are unaffected:</strong> The filter is intentionally not applied there so you can still manage all unassigned tasks regardless of sprint.</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q19',
          question: 'How does Auto-Generate Timesheet work when a task is moved to "In Progress"?',
          icon: Zap,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>NexTime has a smart automation that <strong>automatically creates a draft Timesheet record</strong> when a task is moved to <em>"In Progress"</em>:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Trigger:</strong> Moving a task to <strong>"In Progress"</strong> on the Board (drag-and-drop or dropdown) triggers the automation.</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>What it creates:</strong> A new Timesheet entry pre-filled with — the task's Start Date, Estimated Hours, the linked project, and your user account — saved in <strong>Draft</strong> status.</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Why Draft?</strong> The entry is created as Draft so you can review, adjust hours or description, and then submit for approval. Nothing is auto-submitted.</li>
                <li><strong>Where to find it:</strong> Go to the <strong>Timesheet</strong> page. The auto-generated entry appears in your log list with status <em>"Draft"</em>, ready to edit and submit.</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q20',
          question: 'What is the "Work Period" time bar, and what happens with 40h (multi-day) tasks?',
          icon: Clock,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>When you move a task to <strong>"In Progress"</strong>, the <strong>Log Actual Hours</strong> modal appears. The draggable "Work Period" time bar is shown for all tasks to let you log your work window for today:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}>
                  <strong>Interactive Time Bar:</strong> Shows a draggable timeline (06:00–22:00) where you can select your actual work window for today. Start time, End time, and Hours are automatically computed and can also be adjusted manually.
                </li>
                <li style={{ marginBottom: '0.25rem' }}>
                  <strong>Sensible Defaults:</strong> If a task is planned for 8h or more, the time bar defaults to 09:00 - 17:00 (8h). If it is planned for 4h, it defaults to 09:00 - 13:00 (4h). For multi-day tasks (e.g. 40h), the bar is shown so you can log your actual work window for today.
                </li>
                <li>
                  <strong>Planned vs Actual:</strong> Planned hours come from the task's Estimated Hours. Actual hours logged are submitted. Managers can see both figures and the work period on the <strong>Pending Approvals</strong> screen.
                </li>
              </ul>
            </div>
          )
        },
        {
          id: 'q21',
          question: 'What are the recent updates to Projects, Tasks, and Dashboard widgets?',
          icon: Zap,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>Recent productivity enhancements include:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}>
                  <strong>Project Plan Milestone Duplication Protection:</strong> When you generate milestones from templates in the <em>Project Plan</em>, once they are generated, the button changes to a disabled green <strong>Already</strong> badge. This prevents duplicate milestone creation.
                </li>
                <li style={{ marginBottom: '0.25rem' }}>
                  <strong>Dashboard My Tasks Filters & sorting:</strong> The "My Tasks" widget now includes a <strong>Project Selector</strong> and <strong>Status Tabs</strong> (always displaying To Do, In Progress, Review, and Done). Tasks are sorted by the latest update/activity first.
                </li>
                <li style={{ marginBottom: '0.25rem' }}>
                  <strong>Tasks Assignee Filter:</strong> In the <em>Tasks & Agile Planner</em> board, you can click on any project member's avatar on the right side of the sub-navbar to filter the active view to only show tasks assigned to them.
                </li>
                <li>
                  <strong>Smart Log Time Button:</strong> In the Dashboard task list, the <em>"+ Log Time"</em> button is automatically hidden if a task is moved past the "In Progress" status (e.g. Done, Review, pending).
                </li>
              </ul>
            </div>
          )
        }
      ]
    },
    th: {
      title: "คำถามที่พบบ่อย (FAQ)",
      subtitle: "คำถามและคำแนะนำที่พบบ่อยเกี่ยวกับการใช้งานระบบ",
      needHelpTitle: "ต้องการความช่วยเหลือเพิ่มเติม?",
      needHelpDesc: "หากคุณมีคำถามเพิ่มเติมหรือต้องการความช่วยเหลือด้านเทคนิค สามารถกดไอคอนแชทที่มุมขวาล่างเพื่อสอบถามผู้ช่วย AI ได้ตลอดเวลาครับ",
      faqs: [
        {
          id: 'q0',
          question: 'ฟีเจอร์หลักของระบบ NexTime มีอะไรบ้าง?',
          icon: Star,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>NexTime เป็นระบบบริหารจัดการโปรเจกต์และทรัพยากรบุคคลแบบครบวงจร โดยมีฟีเจอร์เด่นดังนี้ครับ:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Agile Task Management:</strong> จัดการงานด้วย Kanban Board, จัดลำดับ Backlog, และวางแผน Sprint พร้อมประเมินความยากด้วย Story Points (SP)</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Gantt Chart & Timeline:</strong> ดูแผนงานระยะยาวแบบปฏิทิน เพื่อป้องกันคอขวดและงานทับซ้อน</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Timesheet & Approvals:</strong> ระบบลงเวลาทำงานรายวัน และส่งให้ PM หรือ Admin กดอนุมัติ (Approve) ได้ง่ายๆ</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Resource & Cost Tracking:</strong> สรุปประวัติ Project Roles, ตั้งค่าฐานเงินเดือน (Labor Rates) และคำนวณต้นทุน Man-Days ของโปรเจกต์อัตโนมัติ</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>AI Assistant:</strong> แชทบอทอัจฉริยะที่เชื่อมต่อกับ Google Gemini (หรือ OpenAI) ช่วยตอบคำถามและให้คำแนะนำ</li>
                <li><strong>Role-Based Access Control (RBAC):</strong> ระบบกำหนดสิทธิ์การเข้าถึงข้อมูลที่ละเอียด ตั้งแต่ระดับ Admin, Manager, PM จนถึง Member</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q1',
          question: 'เปอร์เซ็นต์ความคืบหน้า (Progress) คำนวณอย่างไร?',
          icon: BarChart3,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>ระบบจะคำนวณ % ความคืบหน้าต่างกัน ขึ้นอยู่กับว่า Task นั้นมีงานย่อย (Subtasks) หรือไม่:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Task ที่ไม่มีงานย่อย:</strong> ถ้าลากไปช่อง "In Progress" จะนับเป็น 50%, ลากไป "Review" นับเป็น 90% และจะเป็น 100% ก็ต่อเมื่อลากไปช่อง "Done" ครับ</li>
                <li><strong>Task ที่มีงานย่อย:</strong> ระบบจะไม่สนใจว่าตัว Task หลักอยู่ช่องไหน แต่จะคำนวณจากสัดส่วนของ Subtask ที่เสร็จแล้วเท่านั้น (เช่น มี 4 งานย่อย ทำเสร็จไป 2 งานย่อย = 50%)</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q2',
          question: 'วิธีลบข้อมูล Timesheet, Task และ Subtask ทำอย่างไร?',
          icon: Clock,
          answer: (
            <div>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}>
                  <strong>Timesheet:</strong> ไปที่เมนู "Timesheet" ด้านซ้ายมือ เลื่อนลงมาที่ตารางประวัติ จะมีไอคอนถังขยะสีแดงอยู่ขวาสุดของแต่ละรายการครับ
                  <br />
                  <em>* หมายเหตุ: พนักงานทั่วไปสามารถลบรายการได้เฉพาะสถานะ Draft, Pending หรือ Rejected เท่านั้น หากรายการถูกอนุมัติ (Approved) แล้ว จะต้องให้ผู้ดูแลระบบ (Admin) หรือเมเนเจอร์ (Manager) เป็นผู้ดำเนินการลบเพื่อแก้ไขครับ</em>
                </li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Task (หน้า Board):</strong> เอาเมาส์ไปชี้ที่การ์ดงาน จะมีไอคอนถังขยะสีแดงเล็กๆ โผล่ขึ้นมาที่มุมขวาบนของการ์ดครับ</li>
                <li><strong>Task (ลบทีละหลายๆ อัน):</strong> ไปที่แท็บ "Backlog" หรือ "Summary" ติ๊กถูกที่ช่องสี่เหลี่ยมด้านหน้า Task ที่ต้องการลบ แล้วกดปุ่ม "Delete Selected" สีแดงที่ด้านบนครับ</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q3',
          question: 'สามารถย้าย Task ไปอยู่ Sprint อื่นได้ไหม?',
          icon: BookOpen,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>สามารถทำได้ง่ายๆ ตามนี้เลยครับ:</p>
              <ol style={{ listStyleType: 'decimal', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}>ไปที่เมนู Tasks แล้วเลือกแท็บ <strong>Backlog</strong></li>
                <li style={{ marginBottom: '0.25rem' }}>ตรงด้านขวาสุดของแต่ละบรรทัด จะมีปุ่ม Dropdown ระบุชื่อ Sprint ปัจจุบันอยู่</li>
                <li>คลิกที่ Dropdown นั้นเพื่อเลือก Sprint ใหม่ หรือเลือกคำว่า "Backlog" เพื่อถอดงานออกจาก Sprint ครับ (สามารถติ๊กถูกด้านหน้าหลายๆ งานเพื่อย้ายพร้อมกันได้ด้วย)</li>
              </ol>
            </div>
          )
        },
        {
          id: 'q4',
          question: 'ข้อมูลต่างๆ ถูกเก็บไว้ที่ไหน?',
          icon: Database,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>ข้อมูลในระบบถูกแบ่งการจัดเก็บออกเป็น 2 ส่วนหลักๆ ครับ:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>ข้อมูลแอปพลิเคชัน:</strong> พวก Task, Timesheet, Project จะถูกบันทึกไว้อย่างถาวรใน <strong>PostgreSQL Database</strong> บนเซิร์ฟเวอร์ Coolify ของคุณครับ</li>
                <li><strong>ความจำของ AI:</strong> กฎระเบียบและวิธีคิดที่ AI เรียนรู้ (เช่น ผ่านคำสั่ง <code>/learn</code>) จะถูกเก็บไว้เป็นไฟล์ระบบในโฟลเดอร์ <code>.agents</code> บนคอมพิวเตอร์ของคุณเองครับ</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q5',
          question: 'ช่อง Monthly Summary และ Approval Status ในหน้า Timesheet คืออะไร?',
          icon: Clock,
          answer: (
            <div>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Monthly Summary (สรุปรายเดือน):</strong> แสดงจำนวนชั่วโมงทั้งหมดที่คุณลงเวลาไว้ใน <strong>เดือนนี้</strong> (ไม่ใช่รายสัปดาห์ครับ) โดยตัวเลข Target: 160h คือเป้าหมายเวลาทำงานมาตรฐานต่อเดือน (เช่น สัปดาห์ละ 40 ชม. &times; 4 สัปดาห์)</li>
                <li><strong>Approval Status (สถานะอนุมัติ):</strong> แสดงยอดรวมชั่วโมงในเดือนนี้ที่ "ผ่านการอนุมัติแล้ว" (Approved) เทียบกับชั่วโมงที่ "กำลังรอการอนุมัติ" (Pending) ครับ <br/><br/><em>* หมายเหตุ: ผู้ที่มีสิทธิ์กดอนุมัติ Timesheet ได้คือคนที่มีตำแหน่ง <strong>Admin</strong>, <strong>Manager</strong> หรือ <strong>Project Manager (PM)</strong> ครับ</em></li>
              </ul>
            </div>
          )
        },
        {
          id: 'q6',
          question: 'ประเภทของงาน (Issue Type) อย่าง Task, Story, Bug หมายความว่าอย่างไร?',
          icon: BookOpen,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>เป็นหมวดหมู่งานตามหลักการทำงานแบบ Agile ครับ:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Story (สีเขียว):</strong> ย่อมาจาก "User Story" หมายถึงฟีเจอร์ใหม่หรือความต้องการจากมุมมองของผู้ใช้งาน (เช่น "สร้างหน้า Login", "ระบบออกรายงาน") ซึ่งมักจะเป็นงานที่ส่งมอบ Value ให้ลูกค้าโดยตรง</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Task (สีฟ้า):</strong> หมายถึงงานด้านเทคนิค, งานเตรียมการ, หรืองานย่อยๆ ที่ไม่ได้เป็นฟีเจอร์โดยตรง แต่จำเป็นต้องทำเพื่อให้ระบบสมบูรณ์ (เช่น "ติดตั้ง Database", "คอนฟิกเซิร์ฟเวอร์")</li>
                <li><strong>Bug (สีแดง):</strong> หมายถึงข้อผิดพลาดหรือจุดบกพร่องของระบบที่ต้องได้รับการแก้ไข (เช่น "กดปุ่มแล้วแอปค้าง", "ตัวเลขคำนวณผิด")</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q7',
          question: '1 SP (Story Points) คืออะไร?',
          icon: BarChart3,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}><strong>SP (Story Points)</strong> คือหน่วยวัดในระบบ Agile ที่ใช้ประเมิน "ขนาดความยาก-ง่าย ความซับซ้อน และแรงงาน" ที่ต้องใช้ในการทำงานชิ้นนั้นๆ ครับ</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}>ตัวเลขจะเรียงตามลำดับฟีโบนัชชี (1, 2, 3, 5, 8, 13...) เพราะงานยิ่งใหญ่ความไม่แน่นอนยิ่งสูง จึงไม่กะเกณฑ์เป็นตัวเลขเรียงกันตรงๆ</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>1 SP</strong> มักจะถูกใช้ตั้งเป็นเกณฑ์มาตรฐานของ "งานที่เล็กและง่ายที่สุด" (เช่น แก้ไขคำผิดบนหน้าเว็บ)</li>
                <li>เวลาประเมินงานชิ้นใหม่ ทีมจะเปรียบเทียบกับงาน 1 SP เช่น "งานนี้ดูยากและใช้แรงมากกว่างาน 1 SP ประมาณ 3 เท่า" ก็จะตีค่าประเมินงานนั้นเป็น "3 SP" ครับ</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q8',
          question: 'เมนู Timeline, Releases/Versions และ Backlog Grooming ในหน้า Tasks คืออะไร?',
          icon: BookOpen,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>ทั้ง 3 เมนูนี้เป็นเครื่องมือที่ช่วยในการวางแผนโปรเจกต์ครับ:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Timeline:</strong> คือหน้าจอที่แสดงแผนงานในรูปแบบของปฏิทินยาว (Gantt Chart) ทำให้เห็นภาพรวมว่าแต่ละงานเริ่มและจบเมื่อไหร่ หรืองานไหนทับซ้อนกันอยู่บ้างครับ</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Releases / Versions:</strong> คือการจัดกลุ่ม Task หลายๆ อันรวมกัน เพื่อกำหนดว่าจะปล่อยอัปเดตระบบพร้อมกันในเวอร์ชันไหน (เช่น ฟีเจอร์ทั้งหมดนี้คือของอัปเดต Version 1.0)</li>
                <li><strong>Backlog Grooming:</strong> เป็นหน้าจอสำหรับใช้เคลียร์งานที่ยังค้างอยู่ (Backlog) โดยเฉพาะ เพื่อนำมาจัดลำดับความสำคัญ ประเมินคะแนนความยาก (SP) และเตรียมความพร้อมก่อนที่จะดึงเข้า Sprint ถัดไปครับ</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q9',
          question: 'แท็บ Timeline ในหน้า Tasks มีไว้ทำอะไร?',
          icon: CalendarRange,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>แท็บ Timeline คือหน้าจอ <strong>Gantt Chart</strong> ที่เอาไว้วางแผนและดูภาพรวมเรื่อง "เวลา" ของโปรเจกต์ครับ:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>แสดงทุก Sprint:</strong> ระบบจะดึง Task จากทุกๆ Sprint มาแสดงผลให้เห็นพร้อมกัน (โดย Task นั้นจะต้องมีการระบุวันเริ่มต้นและสิ้นสุดเอาไว้)</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>ปรับเวลาได้ทันที:</strong> สามารถเอาเมาส์คลิกลาก (Drag & Drop) ที่ตัวแท่งสีๆ เพื่อเลื่อนวัน หรือดึงขอบซ้าย/ขวาเพื่อยืด-หดระยะเวลาทำงานได้ทันที โดยไม่ต้องกดเข้าไปแก้ในฟอร์มครับ</li>
                <li><strong>ดูคอขวดของงาน:</strong> ช่วยให้มองเห็นแผนงานระยะยาว ว่ามีงานไหนดำเนินการทับซ้อนกันอยู่บ้าง ช่วยป้องกันคอขวดและจัดตารางงานได้ง่ายขึ้นครับ</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q10',
          question: 'Project Roles ในหน้า Team ทำงานอย่างไร?',
          icon: Users,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>ส่วน <strong>Project Roles</strong> ในหน้า Team คือสรุป "สถานะปัจจุบันและประวัติการทำงาน" ว่าพนักงานรับผิดชอบงานอะไร ในโปรเจกต์ไหนบ้างครับ:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>ดึงข้อมูลอัตโนมัติ:</strong> ระบบจะดึงข้อมูลมาจากหน้าจัดการโปรเจกต์ (Manage Members) ทั่วทั้งระบบมาสรุปให้ดูที่นี่ที่เดียว พร้อมแสดงช่วงเวลา (Timeframe) ของโปรเจกต์นั้นๆ</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>ทำหน้าที่เป็น Resume:</strong> ข้อมูลนี้จะยังคงอยู่แม้โปรเจกต์จะเสร็จสิ้น (Status: Done) ไปแล้ว เพื่อเก็บไว้ดูเป็นประวัติย้อนหลังได้ครับ</li>
                <li><strong>ระบบลบอัตโนมัติ:</strong> หากพนักงานถูกเอาชื่อออกจากโปรเจกต์ก่อนที่โปรเจกต์จะเสร็จสิ้น หรือโปรเจกต์นั้นถูกลบทิ้งไป ระบบจะเคลียร์ประวัตินั้นออกจากหน้าโปรไฟล์ให้โดยอัตโนมัติครับ</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q11',
          question: 'สามารถดูรายงานสรุปค่าใช้จ่ายโปรเจกต์ (Project Cost) เป็นรายวัน หรือ รายปี ได้ไหม?',
          icon: BarChart3,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>ได้ครับ คุณสามารถดูรายงานสรุปค่าใช้จ่ายโปรเจกต์แยกตามช่วงเวลาได้:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}>Go to the <strong>Reports</strong> page and select the <strong>Project Cost</strong> tab.</li>
                <li>ใช้ปุ่มตัวกรอง (Daily, Monthly, Yearly) เพื่อเลือกรูปแบบช่วงเวลา และระบุ วัน/เดือน/ปี ที่ต้องการ เพื่อดูสรุปค่าใช้จ่ายของช่วงเวลานั้นๆ ครับ</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q12',
          question: 'Subtask (งานย่อย) คืออะไรและทำงานอย่างไร?',
          icon: BookOpen,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>Subtask คือรายการงานขนาดเล็กที่อยู่ภายใต้งานหลัก (Main Task / Milestone) เพื่อช่วยแยกรายละเอียดและติดตามความคืบหน้าครับ:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>วิธีการสร้าง:</strong> กดปุ่ม "Add Task" ในเมนู Tasks จากนั้นเลือกประเภทระดับงานเป็น "Subtask (To Do under Main Task)" และเลือกงานหลักที่ต้องการเชื่อมโยงในดรอปดาวน์ "Under Main Task"</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>การคิดความคืบหน้า:</strong> งานหลักที่มีงานย่อยจะคิดเปอร์เซ็นต์ความคืบหน้า (% Progress) อิงตามสัดส่วนของจำนวนงานย่อยที่อยู่ในสถานะ Done (เช่น ทำเสร็จ 2 จาก 4 งานย่อย = 50% ความคืบหน้า)</li>
                <li><strong>การควบคุมงบประมาณชั่วโมงงาน:</strong> ชั่วโมงประมาณการ (Estimated Hours) ของงานย่อยทั้งหมดรวมกันภายใต้งานหลัก จะต้องไม่เกินจำนวนชั่วโมงประมาณการที่กำหนดไว้ในงานหลัก (Main Task) ครับ</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q13',
          question: 'ทำไมฉันถึงมองไม่เห็นบางโครงการ (Projects) งาน (Tasks) หรือสปรินต์ (Sprints)?',
          icon: Users,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>การเข้าถึงโครงการในระบบ NexTime ถูกควบคุมด้วยสิทธิ์และรายชื่อสมาชิกของโปรเจกต์นั้น ๆ ครับ:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Admin และ Manager:</strong> จะมองเห็นทุกโครงการ ทุกงาน และทุกสปรินต์ในระบบโดยอัตโนมัติ</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Employee และ User (พนักงานทั่วไป):</strong> จะมองเห็นเฉพาะโครงการ งาน และสปรินต์ที่ตนเองมีชื่อเป็นสมาชิกโปรเจกต์เท่านั้น</li>
                <li><strong>วิธีแก้ไขเมื่อมองไม่เห็นโครงการ:</strong> ให้แจ้งผู้ดูแลระบบ (Admin) หรือผู้จัดการโครงการ (PM) ของโปรเจกต์นั้นเพิ่มชื่อคุณเข้าร่วมโครงการ โดยไปที่หน้า "Projects" &rarr; กดไอคอนดินสอ (แก้ไข) &rarr; แล้วเพิ่มรายชื่อคุณที่แท็บ "Manage Members" ครับ</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q14',
          question: 'ผู้ใช้งานในระบบมีกี่ประเภท และมีสิทธิ์แตกต่างกันอย่างไร?',
          icon: Shield,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>ระบบ NexTime แบ่งผู้ใช้งานออกเป็น 4 ประเภท (Roles) เพื่อควบคุมสิทธิ์การเข้าถึงข้อมูลดังนี้ครับ:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Admin (ผู้ดูแลระบบสูงสุด):</strong> สามารถเข้าถึงและจัดการข้อมูลทุกอย่างในระบบ ตั้งค่าการทำงาน จัดการโครงการ งาน ใบลงเวลา และสิทธิ์สมาชิกได้ทั้งหมด</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Manager (ผู้จัดการระบบ):</strong> มีสิทธิ์จัดการโครงการ แผนงาน (Baselines) งาน และสปรินต์ รวมถึงอนุมัติหรือลบใบลงเวลาได้ทั้งหมด แต่ไม่สามารถแก้ไขส่วนตั้งค่าหลักของระบบ (System Config) ได้</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Employee (พนักงานปฏิบัติงาน):</strong> มองเห็นเฉพาะโครงการที่ตนมีชื่อเข้าร่วม สามารถบันทึกเวลาทำงาน (Timesheet) สร้างงานหรือเปลี่ยนสถานะงานได้ แต่ไม่มีสิทธิ์จัดการ Baseline หรือลบใบลงเวลาที่อนุมัติแล้ว</li>
                <li><strong>User (ผู้ใช้ทั่วไป / บุคคลภายนอก):</strong> สิทธิ์การเข้าดูแบบจำกัดเป็นพิเศษ สามารถมองเห็นได้เฉพาะโปรเจกต์ที่ได้รับมอบหมาย และมีส่วนร่วมในแชทคุยของโปรเจกต์นั้นได้เท่านั้น ไม่มีสิทธิ์ในการแก้ไขงานหรือจัดการแผนงานใด ๆ ครับ</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q15',
          question: 'ฟีเจอร์ Team Chat (แชททีมโครงการ) คืออะไรและใช้งานอย่างไร?',
          icon: MessageSquare,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>ระบบ Team Chat ออกแบบมาเพื่อเพิ่มความสะดวกในการคุยประสานงานกันในแต่ละโปรเจกต์แบบเรียลไทม์ครับ:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>ห้องแชทแยกรายโปรเจกต์:</strong> ทุกโครงการจะมีห้องแชทของตัวเองแยกต่างหาก ทำให้การคุยรายละเอียดงานเป็นระเบียบและไม่ปะปนกัน</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>ระบบสิทธิ์การเข้าใช้งาน:</strong> พนักงานทั่วไปจะมองเห็นและพิมพ์แชทได้เฉพาะห้องโปรเจกต์ที่ตนเป็นสมาชิกเท่านั้น ส่วนแอดมินหรือเมเนเจอร์จะเข้าดูได้ทุกห้อง</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>การส่งไฟล์และการพูดคุย:</strong> สามารถคุยงานโต้ตอบ อัปโหลดไฟล์แนบประกอบการทำงาน และแท็กหาเพื่อนร่วมทีมได้โดยตรง</li>
                <li><strong>ทางเข้าด่วนแชทโปรเจกต์:</strong> สามารถกดไอคอนรูปกล่องข้อความที่มุมขวาบนของการ์ดโครงการที่หน้า Projects เพื่อลิ้งก์ตรงเข้ามายังห้องแชทโครงการนั้น ๆ ได้ทันทีครับ</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q16',
          question: 'การบันทึกผลการทำงานและแนบรูปภาพใน Timesheet ทำอย่างไร?',
          icon: Clock,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>ฟอร์มลงเวลา (Timesheet) ถูกแบ่งออกเป็นส่วนเป้าหมายและผลการทำงาน เพื่อให้การรายงานผลชัดเจนยิ่งขึ้น:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>เป้าหมาย / Description:</strong> ช่องบังคับกรอก สำหรับระบุว่าเป้าหมายของงาน หรือสิ่งที่คุณตั้งใจจะทำในชั่วโมงนั้นคืออะไร</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>ผลการทำงาน / Work Results:</strong> ช่องเสริม (ไม่บังคับ) สำหรับอธิบายผลลัพธ์ที่ทำได้จริง หรือผลผลิตที่เกิดขึ้น</li>
                <li><strong>แนบรูปภาพ (Proof of Work):</strong> สามารถกดปุ่ม "Choose Image" เพื่อแนบไฟล์รูปภาพ (เช่น สกรีนช็อตหรือภาพถ่าย) เพื่อใช้เป็นหลักฐานประกอบผลการทำงานได้ครับ</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q17',
          question: 'ทำไมแถบ "Auto-Generated Plan" ถึงไม่แสดงทันทีหลังสร้างโปรเจกต์ใหม่?',
          icon: Zap,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>ปัญหานี้สามารถเกิดขึ้นได้จาก 2 สาเหตุหลักๆ ครับ:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}>
                  <strong>ข้อมูลหน้าจอยังไม่ได้ดึงล่าสุด (ต้องกดรีเฟรช):</strong> เมื่อสร้างโปรเจกต์ใหม่ ระบบจะดึง Milestone Tasks มาลง Database ทันที แต่ฝั่งหน้าเว็บยังไม่ได้ดึงอัปเดตงานล่าสุดเข้ามา ให้ลอง **กดรีเฟรชหน้าจอ (F5 / Reload)** เพื่อดึงข้อมูลใหม่มาแสดงผลครับ
                </li>
                <li>
                  <strong>ไม่ได้ระบุ End Date ในตอนแรก:</strong> ระบบหลังบ้านจะสร้างแผนงานอัตโนมัติเฉพาะตอนที่ระบุทั้ง **Start Date** และ **End Date** พร้อมกันตั้งแต่สร้างโปรเจกต์ หากคุณแก้ไขเพื่อเพิ่ม End Date ทีหลัง แผนงานจะไม่ถูกสร้างอัตโนมัติ ให้ไปที่แท็บ **Project Plan** เลือกโปรเจกต์ และกดปุ่ม **🚀 Generate Milestones from Templates** เพื่อสั่งสร้างแผนงานด้วยตนเองครับ
                </li>
              </ul>
            </div>
          )
        },
        {
          id: 'q18',
          question: 'กรองงานตาม Sprint บนหน้า Board และ Timeline ทำอย่างไร?',
          icon: Layers,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>ระบบมี <strong>Sprint Filter Dropdown</strong> ให้คุณโฟกัสเฉพาะงานของ Sprint ที่ต้องการบนหน้า Kanban Board และ Timeline (Gantt chart) ครับ:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>ตำแหน่งที่อยู่:</strong> เมื่ออยู่ที่แท็บ <strong>Board</strong> หรือ <strong>Timeline</strong> จะมี Dropdown Sprint (ไอคอนสี่เหลี่ยมซ้อนกัน) ปรากฏขึ้นบริเวณมุมขวาบน ถัดจากตัวกรองโปรเจกต์</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>เลือก Sprint อัตโนมัติ:</strong> เมื่อคุณเลือกโปรเจกต์ ระบบจะ <strong>เลือก Active Sprint ปัจจุบันให้โดยอัตโนมัติ</strong> เพื่อให้เห็นเฉพาะงานที่กำลังทำในช่วงนี้ทันที</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>ดูทุก Sprint:</strong> เลือก <em>"All Sprints"</em> เพื่อดูงานจากทุก Sprint (Planned, Active, Completed) พร้อมกันในมุมมองเดียว</li>
                <li><strong>แท็บ Backlog / Grooming ไม่ได้รับผล:</strong> Sprint Filter จะไม่ถูกนำไปใช้กับแท็บ Backlog และ Grooming โดยตั้งใจ เพื่อให้คุณยังสามารถจัดการงานทุกชิ้นใน Backlog ได้อยู่ครับ</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q19',
          question: 'ระบบสร้าง Timesheet อัตโนมัติเมื่อ mark งานเป็น "In Progress" ได้อย่างไร?',
          icon: Zap,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>NexTime มีระบบ Automation ที่ <strong>สร้าง Timesheet record แบบร่าง (Draft) ให้อัตโนมัติ</strong> เมื่อคุณเลื่อน task ไปที่ status <em>"In Progress"</em> ครับ:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>เงื่อนไขที่ trigger:</strong> การย้าย task จาก status ใดก็ตาม ไปที่ <strong>"In Progress"</strong> บนหน้า Board (ลาก-วาง หรือเปลี่ยนจาก dropdown) จะเป็น trigger ของระบบนี้</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>ข้อมูลที่สร้าง:</strong> Timesheet entry ถูกสร้างขึ้นพร้อมข้อมูล — วันที่เริ่มงาน (Start Date ของ task), ชั่วโมงประมาณการ (Estimated Hours), โปรเจกต์ที่ task สังกัด และบัญชีผู้ใช้ของคุณ — โดยบันทึกในสถานะ <strong>Draft</strong></li>
                <li style={{ marginBottom: '0.25rem' }}><strong>ทำไมถึงเป็น Draft?</strong> Timesheet ถูกสร้างเป็น Draft เพื่อให้คุณมีโอกาสตรวจสอบ, แก้ไขชั่วโมง หรือเพิ่มรายละเอียด ก่อนส่งขออนุมัติจริง ไม่มีการส่งอัตโนมัติครับ</li>
                <li><strong>ดูได้ที่ไหน:</strong> ไปที่เมนู <strong>Timesheet</strong> — รายการที่ถูกสร้างอัตโนมัติจะปรากฏในรายการ Log ของคุณ พร้อมสถานะ <em>"Draft"</em> รอให้คุณแก้ไขและส่งได้ทันทีครับ</li>
              </ul>
            </div>
          )
        },
        {
          id: 'q20',
          question: '"Work Period" time bar คืออะไร และสำหรับงาน 40h (หลายวัน) จะบันทึกเวลาอย่างไร?',
          icon: Clock,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>เมื่อคุณย้าย task ไปที่ <strong>"In Progress"</strong> ระบบจะแสดง modal <strong>Log Actual Hours</strong> โดยแถบลากจะถูกแสดงสำหรับทุกงานเสมอเพื่อความยืดหยุ่นในการบันทึกเวลาจริงในแต่ละวัน:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}>
                  <strong>แถบเลือกเวลาแบบลาก (Interactive Time Bar):</strong> แสดงช่วงเวลา 06:00–22:00 สามารถคลิกลากเพื่อบันทึกช่วงเวลาที่เข้าทำงานจริงในวันนี้ โดยระบบจะคำนวณ Start, End และ Hours ให้ตามสัดส่วนการลากโดยอัตโนมัติ
                </li>
                <li style={{ marginBottom: '0.25rem' }}>
                  <strong>ค่าเริ่มต้นอัตโนมัติ:</strong> เพื่อความสะดวกรวดเร็ว หากงานมีชั่วโมงตามแผนตั้งแต่ 8h ขึ้นไป แถบเวลาจะเลือกช่วง 09:00 - 17:00 (8h) ไว้ให้ก่อนโดยอัตโนมัติ และหากแผนงานคือ 4h จะเลือกช่วง 09:00 - 13:00 (4h) ให้โดยอัตโนมัติ
                </li>
                <li>
                  <strong>การบันทึกงานหลายวัน:</strong> สำหรับงานระยะยาว (เช่น 40h) แถบลากจะปรากฏตามปกติเพื่อให้คุณสามารถระบุช่วงเวลาที่คุณลงมือทำงานดังกล่าวสำหรับวันนี้ได้เลยครับ
                </li>
              </ul>
            </div>
          )
        },
        {
          id: 'q21',
          question: 'ฟีเจอร์ใหม่ที่อัปเดตเพิ่มเติมในส่วน Projects, Tasks และ Dashboard มีอะไรบ้าง?',
          icon: Zap,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>ระบบได้เพิ่มการอำนวยความสะดวกในส่วนต่างๆ ดังนี้ครับ:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}>
                  <strong>ป้องกันการสร้างแผนงานซ้ำ (Milestone Protection):</strong> ในหน้า <em>Project Plan</em> เมื่อกดปุ่ม Generate Milestones ไปเรียบร้อยแล้ว ปุ่มสีส้มเดิมจะเปลี่ยนเป็นปุ่มสีเขียว <strong>Already</strong> และอยู่ในสถานะ Disabled เพื่อแจ้งเตือนและป้องกันการกดซ้ำซ้อน
                </li>
                <li style={{ marginBottom: '0.25rem' }}>
                  <strong>ตัวกรองและเรียงลำดับใหม่ใน Dashboard:</strong> ในกล่อง "My Tasks" หน้าแรกสุด ได้เพิ่ม <strong>Dropdown ค้นหาตาม Project</strong> และ <strong>แถบปุ่มสถานะ</strong> (มี To Do, In Progress, Review, Done แสดงไว้ตลอดเวลา) พร้อมทั้งจัดเรียงลำดับงานตามความเคลื่อนไหวล่าสุดขึ้นก่อนเสมอ
                </li>
                <li style={{ marginBottom: '0.25rem' }}>
                  <strong>กรองงานตามผู้รับผิดชอบ (Assignee Filter):</strong> ในหน้า <em>Tasks</em> (หน้าคัมบังบอร์ด) คุณสามารถคลิกที่รูปโปรไฟล์ (Avatar) ของสมาชิกแต่ละคนในโปรเจกต์ได้เลยเพื่อเลือกดูเฉพาะงานของคนนั้นในหน้าบอร์ด, แบ็กล็อก, ไทม์ไลน์ ฯลฯ
                </li>
                <li>
                  <strong>ซ่อนปุ่มบันทึกเวลาตามสถานะงาน (Smart Log Time):</strong> ในหน้า Dashboard ปุ่ม <em>"+ Log Time"</em> จะถูกซ่อนอัตโนมัติเมื่องานถูกย้ายเลยสถานะ In Progress ไปแล้ว (เช่น เมื่อขึ้น Review, Done หรือ pending) เพื่อลดความผิดพลาดในการลงเวลาการทำงานครับ
                </li>
              </ul>
            </div>
          )
        }
      ]
    }
  };

  const current = content[lang];

  // Bilingual system features content
  const featureContent = {
    en: {
      title: "System Features Guide (Admin)",
      subtitle: "Detailed guides for administrators on baseline management and advanced concepts.",
      features: [
        {
          id: 'f1',
          question: 'What is the difference between Active Plan and Current Live Plan?',
          icon: CalendarRange,
          answer: (
            <div>
              <p style={{ marginBottom: '0.75rem' }}>Here is the explanation of the two plans in the Project Plan & Timeline module:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>Active Plan (Baseline Version):</strong> This represents a saved snapshot or baseline plan of the project (e.g., "Initial Plan", "Phase 1 Baseline") that is currently active. Changing the Active Plan restores all workspace tasks to the state of this baseline version.
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>Current Live Plan:</strong> This represents the real-time status of the project tasks, including active work, task completion percentages, and timesheets logged up to the present moment.
                </li>
                <li>
                  <strong>Comparison & Drift:</strong> By comparing the <strong>Active Plan</strong> against the <strong>Current Live Plan</strong>, the system calculates critical drift metrics:
                  <ul style={{ listStyleType: 'circle', paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                    <li><em>Schedule Slippage (Drift):</em> Days the timeline has shifted.</li>
                    <li><em>Estimate Drift:</em> Variance in estimated vs actual hours.</li>
                    <li><em>Story Points (SP) Drift:</em> Discrepancy in planned story points.</li>
                    <li><em>Approved Actual Hours:</em> Total hours approved from timesheets.</li>
                  </ul>
                </li>
              </ul>
            </div>
          )
        },
        {
          id: 'f2',
          question: 'How do I save project baselines and switch active plans?',
          icon: Database,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>Administrators can save versions of project tasks to establish baseline plans:</p>
              <ol style={{ listStyleType: 'decimal', paddingLeft: '1.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}>Go to the <strong>Project Plan</strong> page.</li>
                <li style={{ marginBottom: '0.25rem' }}>Click the <strong>Save Version</strong> button to capture the current state of tasks and milestones.</li>
                <li>To switch the active plan, select your saved baseline from the <strong>Active Plan</strong> dropdown. Note that this will swap the active workspace tasks to that version.</li>
              </ol>
            </div>
          )
        },
        {
          id: 'f3',
          question: 'Who has permissions to edit and delete tasks / projects?',
          icon: Users,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>Below are the task and project administration privileges by user role:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Global Admins & Managers:</strong> Have complete administration access. They can edit and delete tasks, milestones, and project baselines on any project in the system regardless of membership.</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Project Managers (PM):</strong> Have editing and deletion privileges on all tasks, sprints, and baselines within their assigned projects.</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Task Assignees:</strong> Can edit the details of tasks assigned to them (such as status, description, and subtasks) but cannot delete tasks.</li>
                <li><strong>Regular Members:</strong> Can create tasks and transition statuses, but cannot delete tasks or configure sprints/releases.</li>
              </ul>
            </div>
          )
        },
        {
          id: 'f4',
          question: 'What is the Team Chat module and how is access managed?',
          icon: MessageSquare,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>The Team Chat module provides real-time collaborative communication for project members:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Dedicated Project Channels:</strong> Each project automatically has its own chat room. Messages are partitioned so that project-related discussions are kept organized.</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Access Rights & Visibility:</strong> Only project members can view and chat in the project's channel. Admins and Managers have global access to all chat rooms.</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Collaborative Tools:</strong> Users can upload attachments, send links, and tag project members to collaborate in real-time.</li>
                <li><strong>Quick Navigation Shortcut:</strong> Clicking the Chat icon on any project card in the Projects directory immediately opens the chat room for that specific project.</li>
              </ul>
            </div>
          )
        },
        {
          id: 'f5',
          question: 'Timesheet: Separation of Goals and Actual Work Results',
          icon: Clock,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>Timesheets now support dual-tracking for better accountability:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}>Users can record what they <em>planned</em> to do (Goal) separately from what they <em>actually achieved</em> (Work Result).</li>
                <li style={{ marginBottom: '0.25rem' }}>Provides more precise reporting for managers reviewing timesheet logs.</li>
                <li>Image attachments (Proof of Work) complement the Work Results for visual verification.</li>
              </ul>
            </div>
          )
        },
        {
          id: 'f6',
          question: 'Development Projects vs. Support Projects & Auto-Task Generation',
          icon: Star,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>Administrators can now choose a Project Type when creating or editing projects:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Development Projects:</strong> Follow standard Agile workflows, timelines, and Gantt charts with Sprints, Releases, and Baselines.</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Support Projects:</strong> Geared towards ongoing service maintenance (OpEx tracking) without timeline limits. Gantt chart is disabled in the UI.</li>
                <li>
                  <strong>Support Task Auto-generation:</strong>
                  <ul style={{ listStyleType: 'circle', paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                    <li><em>Category-based Tasks:</em> Automatically generates 3 default tasks: <code>User Support & Helpdesk</code>, <code>System Maintenance & Operations</code>, and <code>Bug Fixing & Enhancement Support</code>. Perfect for system-specific or BU-specific categorization.</li>
                    <li><em>Monthly Tasks:</em> Generates monthly bucket tasks (e.g. <code>[2026-01] Support & Maintenance</code>) for the duration of the project to cleanly partition timesheet reports month-by-month.</li>
                  </ul>
                </li>
              </ul>
            </div>
          )
        }
      ]
    },
    th: {
      title: "คู่มือฟีเจอร์และการจัดการระบบ (Admin Only)",
      subtitle: "คู่มือฟีเจอร์พิเศษสำหรับการวางแผนและตั้งค่าสำหรับผู้ดูแลระบบเท่านั้น",
      features: [
        {
          id: 'f1',
          question: 'Active Plan กับ Current Live Plan แตกต่างกันอย่างไร?',
          icon: CalendarRange,
          answer: (
            <div>
              <p style={{ marginBottom: '0.75rem' }}>คำอธิบายการทำงานของทั้งสองแผนในเมนูวางแผนและปฏิทินงานโครงการ (Project Plan):</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>Active Plan (แผนงานหลัก/แผนอ้างอิงหลัก):</strong> คือแผนงานฐานข้อมูล (Baseline Plan) ที่บันทึกสแนปช็อตของโครงการในอดีต (เช่น แผนตั้งต้น Initial Plan หรือ แผนแต่ละเฟส) ซึ่งกำลังเปิดใช้งานเป็นมาตรฐานในระบบ หากสลับเปลี่ยน Active Plan จะเป็นการดึงข้อมูลงานในสแนปช็อตนั้นกลับมาเป็นหน้างานหลัก
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>Current Live Plan (แผนงานจริงในปัจจุบัน):</strong> คือข้อมูลโปรเจกต์และรายการงานที่กำลังดำเนินการอัปเดตแบบเรียลไทม์ในปัจจุบัน รวมถึงความคืบหน้าของ Task ล่าสุด และชั่วโมงการลงเวลางานล่าสุดของทีมงาน
                </li>
                <li>
                  <strong>การวิเคราะห์ความแตกต่าง (Variance & Drift):</strong> เมื่อสลับเปรียบเทียบระหว่าง <strong>Active Plan</strong> และ <strong>Current Live Plan</strong> ระบบจะคำนวณหาส่วนต่าง:
                  <ul style={{ listStyleType: 'circle', paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                    <li><em>Schedule Slippage (Drift):</em> แผนงานล่าช้ากว่ากำหนดการจริงไปกี่วัน</li>
                    <li><em>Estimate Drift:</em> ประมาณการชั่วโมงงานคลาดเคลื่อนไปจากแผนกี่ชั่วโมง</li>
                    <li><em>Story Points Drift:</em> คะแนนความยากงานเบี่ยงเบนจากแผนเท่าไร</li>
                    <li><em>Approved Actual Hours:</em> ยอดชั่วโมงทำงานจริงที่อนุมัติแล้ว</li>
                  </ul>
                </li>
              </ul>
            </div>
          )
        },
        {
          id: 'f2',
          question: 'วิธีการบันทึกและสลับแผนงาน Baseline ทำอย่างไร?',
          icon: Database,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>ผู้ดูแลระบบสามารถบันทึกเวอร์ชันและเปลี่ยนแผนงานหลักได้ดังนี้:</p>
              <ol style={{ listStyleType: 'decimal', paddingLeft: '1.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}>ไปที่เมนู <strong>Project Plan</strong> ด้านซ้ายมือ</li>
                <li style={{ marginBottom: '0.25rem' }}>กดปุ่ม <strong>Save Version</strong> เพื่อบันทึกเก็บสถานะของ Milestone และงานต่างๆ ไว้เป็น Baseline ใหม่</li>
                <li>สามารถสลับหรือคืนค่าแผนงานโดยการเลือก Baseline ที่บันทึกไว้ในดรอปดาวน์ <strong>Active Plan</strong> (ระบบจะสลับเอา Task ของ baseline นั้นมาไว้ในหน้างานจริง)</li>
              </ol>
            </div>
          )
        },
        {
          id: 'f3',
          question: 'ผู้ใช้งานตำแหน่งใดบ้างที่มีสิทธิ์แก้ไขและลบงาน (Tasks) หรือโปรเจกต์?',
          icon: Users,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>สิทธิ์ในการสร้าง แก้ไข และลบงานโครงการถูกระบุตามบทบาทหน้าที่ดังนี้ครับ:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>ผู้ดูแลระบบ (Admin) & เมเนเจอร์ (Manager) ระดับระบบ:</strong> มีสิทธิ์เข้าจัดการแบบครอบคลุม สามารถสร้าง แก้ไข และลบงาน สปรินต์ หรือเวอร์ชันแผนงานฐานข้อมูล (Baseline) ได้ในทุกโปรเจกต์ของระบบโดยไม่มีข้อจำกัด</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>ผู้จัดการโครงการ (PM):</strong> มีสิทธิ์แก้ไข ลบ และจัดการงาน รวมถึงสปรินต์/เวอร์ชัน ทั้งหมดในโครงการที่ตนเองได้รับมอบหมายดูแล</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>ผู้รับผิดชอบงาน (Assignee):</strong> มีสิทธิ์แก้ไขรายละเอียดงาน หรือย้ายสถานะเฉพาะงานที่ได้รับมอบหมายเท่านั้น แต่ไม่มีสิทธิ์ลบงาน</li>
                <li><strong>สมาชิกทั่วไป (Member/SA/Frontend dev/ฯลฯ):</strong> มีสิทธิ์สร้างและบันทึกงานใหม่ หรือปรับสถานะงานตามลำดับกระบวนการ (Workflow) แต่ไม่มีสิทธิ์ลบงาน</li>
              </ul>
            </div>
          )
        },
        {
          id: 'f4',
          question: 'ระบบ Team Chat (แชททีมโครงการ) ทำงานอย่างไร และสิทธิ์การใช้งานเป็นแบบใด?',
          icon: MessageSquare,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>ระบบ Team Chat ออกแบบมาเพื่อเพิ่มความสะดวกในการคุยงานกันภายในแต่ละโครงการแบบเรียลไทม์:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>ห้องแชทแยกรายโปรเจกต์:</strong> ทุกโครงการจะมีห้องแชทของตัวเองอัตโนมัติ ทำให้บทสนทนาไม่ปะปนกัน และเป็นระเบียบตามแต่ละโครงการ</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>การจำกัดสิทธิ์ความปลอดภัย:</strong> สมาชิกทั่วไป (Employee และ User) จะสามารถมองเห็นและคุยแชทเฉพาะโครงการที่ตนมีชื่อร่วมอยู่ในโปรเจกต์นั้น ๆ เท่านั้น ขณะที่ Admin และ Manager สามารถเข้าถึงได้ทุกห้องเพื่อควบคุมความเรียบร้อย</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>เครื่องมือการทำงานร่วมกัน:</strong> สมาชิกสามารถอัปโหลดไฟล์แนบ ส่งลิงก์ และประสานงานกันได้โดยตรง</li>
                <li><strong>ปุ่มลัดเข้าถึงห้องแชททันที:</strong> สามารถกดไอคอนรูปกล่องข้อความที่มุมขวาบนของการ์ดโครงการที่หน้า Projects เพื่อลิ้งก์ตรงเข้ามายังห้องแชทของโครงการนั้น ๆ ได้ทันทีครับ</li>
              </ul>
            </div>
          )
        },
        {
          id: 'f5',
          question: 'ระบบบันทึกเวลา (Timesheet): การแยกเป้าหมายงานออกจากผลงานจริง',
          icon: Clock,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>Timesheet รองรับการกรอกข้อมูล 2 ระดับเพื่อความโปร่งใสและตรวจสอบง่ายขึ้น:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}>ผู้ใช้งานสามารถระบุ <strong>เป้าหมายงานที่ตั้งใจทำ (Goal)</strong> ควบคู่ไปกับ <strong>ผลลัพธ์การทำงานจริง (Work Result)</strong> ในแต่ละวันได้แยกกัน</li>
                <li style={{ marginBottom: '0.25rem' }}>ช่วยให้ผู้บริหารหรือผู้จัดการโครงการประเมินประสิทธิผลการทำงานจริงได้อย่างถูกต้อง</li>
                <li>สามารถแนบไฟล์ภาพเพื่อเป็นหลักฐานอ้างอิงผลงาน (Proof of Work) ได้โดยตรง</li>
              </ul>
            </div>
          )
        },
        {
          id: 'f6',
          question: 'ความแตกต่างของ Development Project และ Support Project รวมถึงการสร้างงานออโต้',
          icon: Star,
          answer: (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>ผู้ดูแลระบบสามารถเลือก <strong>Project Type</strong> ได้ในขั้นตอนการสร้างหรือแก้ไขโปรเจกต์:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}><strong>Development Projects (โครงการพัฒนา):</strong> ใช้สำหรับโครงการปกติ มีการติดตาม Timeline, กำหนด Milestone ย่อย, ทำแผน Baseline และวางแผนแบบ Agile Sprints / Releases</li>
                <li style={{ marginBottom: '0.25rem' }}><strong>Support Projects (โครงการซัพพอร์ต):</strong> ใช้สำหรับงานบำรุงรักษาหรืองานบริการดูแลระบบย่อย/BU ซึ่งไม่มีกำหนดสิ้นสุดแผนงานแบบ CapEx โดยระบบจะซ่อนหน้า Timeline Gantt Chart เพื่อลดความซับซ้อน</li>
                <li>
                  <strong>การสร้างงานอัตโนมัติ (Support Task Auto-generation):</strong>
                  <ul style={{ listStyleType: 'circle', paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                    <li><em>Category-based Tasks:</em> สร้างถังงานแยกประเภทหลัก 3 รายการ ได้แก่ <code>User Support & Helpdesk</code>, <code>System Maintenance & Operations</code> และ <code>Bug Fixing & Enhancement Support</code> เพื่อให้พนักงานเข้ามาเลือกกรอกเวลาสะสมได้ตามระบบหรือหน่วยธุรกิจ (BU)</li>
                    <li><em>Monthly Tasks:</em> สร้างถังงานอิงตามเดือนปฏิทินตลอดระยะสัญญาซัพพอร์ต (เช่น <code>[2026-01] Support & Maintenance</code>) ช่วยแยกชั่วโมงทำงานออกเป็นรายเดือนอย่างมีระเบียบ</li>
                  </ul>
                </li>
              </ul>
            </div>
          )
        }
      ]
    }
  };

  const currentFeatures = featureContent[lang];

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', color: 'var(--text-primary)' }}>
      <header style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HelpCircle size={24} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }} className="text-gradient">
              {activeTab === 'faq' 
                ? current.title 
                : activeTab === 'manual' 
                  ? (lang === 'en' ? 'User Manual' : 'คู่มือการใช้งานระบบ')
                  : currentFeatures.title}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {activeTab === 'faq' 
                ? current.subtitle 
                : activeTab === 'manual' 
                  ? (lang === 'en' ? 'Detailed guides and walkthroughs for system functions.' : 'คู่มือแนะนำการใช้งานระบบและฟังก์ชันต่าง ๆ อย่างละเอียด')
                  : currentFeatures.subtitle}
            </p>
          </div>
        </div>

        {/* Language Switcher Button */}
        <button
          onClick={() => setLang(lang === 'en' ? 'th' : 'en')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}
          className="hover-lift"
        >
          <Languages size={18} />
          {lang === 'en' ? '🇹🇭 ภาษาไทย' : '🇬🇧 English'}
        </button>
      </header>

      {/* Tab Switcher - Now visible to all users to switch between FAQ and Manual */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setActiveTab('faq')}
          style={{
            background: activeTab === 'faq' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'faq' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            border: 'none',
            padding: '0.6rem 1.25rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
            transition: 'all 0.2s ease',
            outline: 'none',
            boxShadow: activeTab === 'faq' ? '0 0 12px rgba(56, 189, 248, 0.05)' : 'none'
          }}
        >
          {lang === 'en' ? 'FAQ' : 'คำถามที่พบบ่อย (FAQ)'}
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          style={{
            background: activeTab === 'manual' ? 'rgba(0, 245, 255, 0.15)' : 'transparent',
            color: activeTab === 'manual' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            border: 'none',
            padding: '0.6rem 1.25rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
            transition: 'all 0.2s ease',
            outline: 'none',
            boxShadow: activeTab === 'manual' ? '0 0 12px rgba(0, 245, 255, 0.05)' : 'none'
          }}
        >
          {lang === 'en' ? 'User Manual' : 'คู่มือการใช้งาน (Manual)'}
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('features')}
            style={{
              background: activeTab === 'features' ? 'rgba(167, 139, 250, 0.15)' : 'transparent',
              color: activeTab === 'features' ? '#a78bfa' : 'var(--text-secondary)',
              border: 'none',
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'all 0.2s ease',
              outline: 'none',
              boxShadow: activeTab === 'features' ? '0 0 12px rgba(167, 139, 250, 0.05)' : 'none'
            }}
          >
            {lang === 'en' ? 'System Features' : 'คู่มือฟีเจอร์สำหรับ Admin'}
          </button>
        )}
      </div>

      <style>{`
        .manual-content h1 { font-size: 1.8rem; margin-top: 1.5rem; margin-bottom: 1rem; color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; }
        .manual-content h2 { font-size: 1.4rem; margin-top: 1.5rem; margin-bottom: 0.75rem; color: var(--accent-primary); }
        .manual-content h3 { font-size: 1.15rem; margin-top: 1.25rem; margin-bottom: 0.5rem; color: var(--accent-secondary); }
        .manual-content p { margin-bottom: 1rem; line-height: 1.6; color: var(--text-secondary); }
        .manual-content ul, .manual-content ol { margin-bottom: 1rem; padding-left: 1.5rem; color: var(--text-secondary); }
        .manual-content li { margin-bottom: 0.35rem; }
        .manual-content blockquote { border-left: 4px solid var(--accent-primary); background: rgba(0, 245, 255, 0.05); padding: 0.75rem 1rem; margin-bottom: 1rem; border-radius: 4px; }
        .manual-content table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
        .manual-content th, .manual-content td { border: 1px solid var(--border-color); padding: 0.75rem; text-align: left; }
        .manual-content th { background: var(--bg-tertiary); color: var(--text-primary); font-weight: 600; }
        .manual-content tr:nth-child(even) { background: rgba(255,255,255,0.02); }
        .manual-content a { color: var(--accent-primary); }
        .manual-content a:hover { text-decoration: underline; }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1.5s linear infinite;
        }
      `}</style>

      {activeTab === 'faq' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {current.faqs.map(faq => {
            const Icon = faq.icon;
            const isExpanded = expandedId === faq.id;
            
            return (
              <div 
                key={faq.id} 
                style={{ 
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '12px', 
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : faq.id)}
                  style={{
                    width: '100%',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--text-primary)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    <div style={{ 
                      width: '36px', height: '36px', borderRadius: '8px', 
                      background: isExpanded ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center' 
                    }}>
                      <Icon size={18} color={isExpanded ? '#818cf8' : 'var(--text-secondary)'} />
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, color: isExpanded ? 'white' : 'var(--text-primary)' }}>
                      {faq.question}
                    </h3>
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                </button>
                
                {isExpanded && (
                  <div style={{ 
                    padding: '0 1.25rem 1.5rem 1.25rem',
                    marginLeft: '44px',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.6',
                    fontSize: '0.95rem'
                  }}>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0 0 1rem 0' }} />
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'manual' && (
        <div className="glass-panel manual-content" style={{ padding: '2rem', borderRadius: '12px' }}>
          {loadingManual ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '250px', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <Clock className="animate-spin" size={32} />
                <span>{lang === 'en' ? 'Loading manual...' : 'กำลังโหลดคู่มือการใช้งาน...'}</span>
              </div>
            </div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: manualHtml }} />
          )}
        </div>
      )}

      {activeTab === 'features' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {currentFeatures.features.map(feat => {
            const Icon = feat.icon;
            const isExpanded = expandedFeatureId === feat.id;
            
            return (
              <div 
                key={feat.id} 
                style={{ 
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '12px', 
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}
              >
                <button
                  onClick={() => setExpandedFeatureId(isExpanded ? null : feat.id)}
                  style={{
                    width: '100%',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--text-primary)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    <div style={{ 
                      width: '36px', height: '36px', borderRadius: '8px', 
                      background: isExpanded ? 'rgba(167, 139, 250, 0.15)' : 'rgba(255,255,255,0.05)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center' 
                    }}>
                      <Icon size={18} color={isExpanded ? '#a78bfa' : 'var(--text-secondary)'} />
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, color: isExpanded ? 'white' : 'var(--text-primary)' }}>
                      {feat.question}
                    </h3>
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                </button>
                
                {isExpanded && (
                  <div style={{ 
                    padding: '0 1.25rem 1.5rem 1.25rem',
                    marginLeft: '44px',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.6',
                    fontSize: '0.95rem'
                  }}>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0 0 1rem 0' }} />
                    {feat.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <HelpCircle size={24} color="#818cf8" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#e0e7ff', margin: '0 0 0.5rem 0' }}>{current.needHelpTitle}</h4>
          <p style={{ color: '#c7d2fe', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
            {current.needHelpDesc}
          </p>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
