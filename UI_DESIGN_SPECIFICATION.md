# Attend-Pro: Comprehensive UI Design Specification Report

This document serves as the frontend blueprint and UI architecture specification for **Attend-Pro**, an academic double-batch attendance-taking, roster scheduling, and parent alerting management system. 

It defines the UI/UX architecture, layout grid rules, component states, page-by-page specifications, forms, tables, modals, design system tokens, database mappings, and future modular integrations. This report matches the current codebase in `/Users/jayaprakash/Downloads/san/Attend-pro/client` and `/Users/jayaprakash/Downloads/san/Attend-pro/server` and serves as a direct implementation guide for developers and designers.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [User Roles](#2-user-roles)
3. [Application Flow](#3-application-flow)
4. [Sitemap](#4-sitemap)
5. [Screen Inventory](#5-screen-inventory)
6. [Navigation Structure](#6-navigation-structure)
7. [UI Components Inventory](#7-ui-components-inventory)
8. [Page-by-Page UI Requirements](#8-page-by-page-ui-requirements)
9. [Form Specifications](#9-form-specifications)
10. [Table Specifications](#10-table-specifications)
11. [Modal & Side Drawer Specifications](#11-modal--side-drawer-specifications)
12. [Design System](#12-design-system)
13. [Responsive Design Requirements](#13-responsive-design-requirements)
14. [User Experience Guidelines](#14-user-experience-guidelines)
15. [Database Mapping & API Specifications](#15-database-mapping--api-specifications)
16. [Future Features Integration](#16-future-features-integration)
17. [UI Development Priority](#17-ui-development-priority)
18. [Missing Screens & Views Recommended](#18-missing-screens--views-recommended)
19. [UI Consistency Audit & Recommendations](#19-ui-consistency-audit--recommendations)
20. [Final UI Blueprint & Conclusion](#20-final-ui-blueprint--conclusion)

---

## 1. Project Overview

### Purpose of the Application
Attend-Pro is a web-based, mobile-responsive attendance tracking system designed for academic institutions operating on double-batch (morning/evening) schedules. It replaces legacy manual paper registers with an optimized digital layout that enforces strict attendance timing windows, records class sessions, and compiles statistics for academic reports.

### Target Users
*   **Super Administrators (College Registry / Coordinators):** Responsible for configuring classes/batches, enrolling students, registering staff members, establishing timetable windows, assigning staff and students to sections, auditing live attendance status, manually overriding lock gates, and analyzing overall compliance reports.
*   **Staff Members (Faculty / Lecturers):** Responsible for logging into classrooms, reviewing their assigned classes, recording student check-ins during open timing windows, verifying attendance records, and submitting rosters.

### Primary Goals
1.  **Schedule Gating:** Prevent retroactive or late attendance modifications by enforcing automated time windows (morning/evening start & lock gates).
2.  **Automated Statistics Compilation:** Keep accurate statistics on attendance compliance and consecutive absences.
3.  **Registry Control:** Centralize management of students, faculty rosters, and class structures with bulk CSV upload systems.
4.  **Audit Compliance:** Enforce single-authority manual overrides with complete database logging for sessions that require unlocking after timing thresholds have expired.

### Overall Workflow
```
[Admin: Create Classes & Batches] ──► [Admin: Enroll Students & Staff] ──► [Admin: Map Assignments]
                                                                                   │
┌──────────────────────────────────────────────────────────────────────────────────┘
▼
[Staff: Log in to Portal] ──► [Staff: View Daily Assigned Sections]
                                         │
┌────────────────────────────────────────┘
▼
[Scheduled Timing Window Opens] ──► [Staff: Take Attendance (ABSENT ONLY focus)]
                                                 │
┌────────────────────────────────────────────────┘
▼
[Staff: Verify & Submit Sheet] ──► [PostgreSQL: Write Session & Records]
                                                 │
┌────────────────────────────────────────────────┘
▼
[Admin: Run Reports, Lock/Unlock overrides]
```

---

## 2. User Roles

### SUPER_ADMIN
*   **Responsibilities:** Full structural control over college records. Manages staff credentials, student enrollment directories, class timetables, and assignments. Oversees institutional compliance and exercises locking/unlocking overrides.
*   **Accessible Pages:**
    *   Dashboard Overview: `/super-admin/dashboard`
    *   Staff Registry Management: `/super-admin/staff`
    *   Student Directory Management: `/super-admin/students`
    *   Classes & Schedule Configurator: `/super-admin/classes`
    *   Dual-Panel Section Assignments: `/super-admin/assignments`
    *   Compliance & Analytics Reports: `/super-admin/reports`
    *   Administrative Attendance Monitoring Console: `/super-admin/attendance` *(unrouted but active on disk)*
*   **Permissions:** Full CREATE, READ, UPDATE, and DELETE (CRUD) permissions on staff accounts, classes, and students. Exclusive UPDATE permission to lock/unlock attendance sessions. READ access to system audit logs.
*   **Navigation:** Sidebar contains full database directories and logs menus. Accesses administrative actions from dashboard card links.
*   **Future Expansion:** System parameters dashboard (managing lock timeout rules).

### STAFF (Faculty)
*   **Responsibilities:** Daily classroom execution. Marks students present or absent, ensures submissions within time constraints, and reviews historical attendance sheets.
*   **Accessible Pages:**
    *   Academic Console Dashboard: `/staff/dashboard`
    *   Classroom Attendance Take Grid: `/staff/attendance/:classId`
    *   Attendance History Registry: `/staff/history`
*   **Permissions:** READ-only access to assigned classes and student rosters. WRITE (INSERT/UPDATE) access to attendance sessions and records *only* during active schedule windows.
*   **Navigation:** Clean, simplified sidebar presenting only Dashboard and History. (Navigating to attendance taking is done by clicking "Take Attendance" triggers on the Dashboard's open sections).
*   **Future Expansion:** Profile manager (updating own telephone number) and request proxy teacher shifts.

---

## 3. Application Flow

The navigation paths and auth guards are structured to isolate roles completely. 

### Core Routing Rules
*   **Root Redirect:** Visiting `/` redirects automatically to `/staff/login` (the most frequent path).
*   **Legacy Redirects:** Visiting `/login` redirects to `/staff/login`. Visiting `/admin/*` redirects to `/super-admin/dashboard`.
*   **Unauthorized Guard:** Users attempting to access pages outside their role privileges are routed to `/unauthorized`.
*   **Not Found Catchall:** Unmapped paths redirect to `/not-found`.

```
                       [Public Route]
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
       /staff/login                    /super-admin/login
             │                                 │
     [Auth Token Verify]               [Auth Token Verify]
             │                                 │
             ▼                                 ▼
   Role: 'staff' ?                     Role: 'super_admin' ?
             │                                 │
     ┌───────┴───────┐                 ┌───────┴───────────────────────────────┐
     ▼               ▼                 ▼                                       ▼
/staff/dashboard  /staff/history  /super-admin/dashboard              /super-admin/staff
     │                                 │                                       │
     ▼                                 ▼                                       ▼
/staff/attendance/:classId        /super-admin/students               /super-admin/classes
                                       │                                       │
                                       ▼                                       ▼
                                  /super-admin/assignments            /super-admin/reports
                                                                               │
                                                                               ▼
                                                                       /super-admin/attendance*
                                                                       *(admin monitoring logs)
```

---

## 4. Sitemap

```
├── Public & Auth Layouts (file:///Users/jayaprakash/Downloads/san/Attend-pro/client/src/layouts/AuthLayout.tsx)
│   ├── Staff Login (file:///Users/jayaprakash/Downloads/san/Attend-pro/client/src/pages/StaffLogin.tsx)
│   ├── Super Admin Login (file:///Users/jayaprakash/Downloads/san/Attend-pro/client/src/pages/SuperAdminLogin.tsx)
│   └── Reset Credentials (file:///Users/jayaprakash/Downloads/san/Attend-pro/client/src/pages/auth/ForgotPassword.tsx)
│
├── Staff Academic Workspace Portal (file:///Users/jayaprakash/Downloads/san/Attend-pro/client/src/layouts/StaffLayout.tsx)
│   ├── Workspace Dashboard (file:///Users/jayaprakash/Downloads/san/Attend-pro/client/src/pages/staff/Dashboard.tsx)
│   ├── Attendance Take Console (file:///Users/jayaprakash/Downloads/san/Attend-pro/client/src/pages/staff/Attendance.tsx)
│   └── Historical Logs (file:///Users/jayaprakash/Downloads/san/Attend-pro/client/src/pages/staff/History.tsx)
│
├── Super Admin Control Center Portal (file:///Users/jayaprakash/Downloads/san/Attend-pro/client/src/layouts/AdminLayout.tsx)
│   ├── Overview Dashboard (file:///Users/jayaprakash/Downloads/san/Attend-pro/client/src/pages/admin/Dashboard.tsx)
│   ├── Staff Registry Management (file:///Users/jayaprakash/Downloads/san/Attend-pro/client/src/pages/admin/Staff.tsx)
│   ├── Student Directory Directory (file:///Users/jayaprakash/Downloads/san/Attend-pro/client/src/pages/admin/Students.tsx)
│   ├── Class Timetable Configurations (file:///Users/jayaprakash/Downloads/san/Attend-pro/client/src/pages/admin/Classes.tsx)
│   ├── Dual-Panel Assignments Manager (file:///Users/jayaprakash/Downloads/san/Attend-pro/client/src/pages/admin/Assignments.tsx)
│   ├── Compliance & Analytical Reports (file:///Users/jayaprakash/Downloads/san/Attend-pro/client/src/pages/admin/Reports.tsx)
│   │   ├── Overview Tab
│   │   ├── Class Analytics Tab
│   │   └── Student Compliance Tab
│   └── Administrative Attendance Monitor Console (file:///Users/jayaprakash/Downloads/san/Attend-pro/client/src/pages/admin/Attendance.tsx)
│
└── System Fallback Pages
    ├── 403 Forbidden Access (file:///Users/jayaprakash/Downloads/san/Attend-pro/client/src/pages/auth/Unauthorized.tsx)
    └── 404 Route Not Registered (file:///Users/jayaprakash/Downloads/san/Attend-pro/client/src/pages/NotFound.tsx)
```

---

## 5. Screen Inventory

| Screen Name | Purpose | Route | User Role | Primary Actions | Secondary Actions | Required Components | Expected Data |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Staff Login** | Sign-in portal for classroom lecturers | `/staff/login` | Public | Submit Login credentials | Redirect to Admin Login | Input, Button, Card, Alert Banner | Authenticated Session JWT, User object |
| **Admin Login** | Sign-in portal for administrators | `/super-admin/login` | Public | Submit Admin credentials | Redirect to Staff Login | Input, Button, Card, Alert Banner | Authenticated Session JWT, User object |
| **Forgot Password** | Password reset request portal | `/staff/login` (legacy click) | Public | Request Reset email | Back to Sign-in | Input, Button, Card, Info Alerts | Reset link trigger status |
| **Staff Dashboard** | Staff schedule console showing assigned sections | `/staff/dashboard` | Staff | Open Attendance Take grids | Toggle menu / Log out | Class Card, Status Badges, Polling Loader | Array of Assigned Classes with today's Sessions |
| **Attendance Take Grid** | Grid to check off student absences | `/staff/attendance/:classId` | Staff | Click student (Absent/Present Toggle), Submit sheets | Search student, Cancel grid | Student Avatar Grid, Countdown Timer, Submit Modal | Class timetable info, Student assignment roster, Session status |
| **Staff History** | Review past sheets taken by faculty | `/staff/history` | Staff | View Session Detail side-drawer | Filter by Class / Month | Table, Filters Form, Details Drawer, Badges | Array of past Sessions, Session Record Details |
| **Admin Dashboard** | Real-time aggregate overview of college metrics | `/super-admin/dashboard` | Super Admin | Enroll Quick Actions buttons | Re-sync live stats | StatCards, Live Session Table, Quick Actions Card | Counts of (Staff, Student, Classes), Recent Sessions |
| **Staff Management** | Registry database for faculty credentials | `/super-admin/staff` | Super Admin | Create Staff, Edit profile details | Reset password, Deactivate staff | Table, Edit Modal, Reset Password form | Array of Staff Users, Form validation errors |
| **Student Directory** | Directory database for enrolled students | `/super-admin/students` | Super Admin | Enroll Student, Edit Student | Bulk import CSV spreadsheet, Deactivate student | Table, CSV Upload Modal, Form Modals | Array of Student records, CSV parse warnings |
| **Class Configurations** | Timetable schedules & locks setup | `/super-admin/classes` | Super Admin | Create Class, Edit Timing Windows | Delete Class structure | Table, Schedule Edit Form, Conflict banner | Array of Class Configurations |
| **Assignments Manager** | Map student and staff rosters to class slots | `/super-admin/assignments` | Super Admin | Assign Student/Staff, Unassign item | Bulk Assign filtered lists, Toggle modes | Dual List Panels, Search bars, Confirmation alerts | Array of Assigned & Unassigned items |
| **Reports Console** | Performance audits and analytics reporting | `/super-admin/reports` | Super Admin | Generate Reports, Export CSV | Tab switches, custom Date ranges | Tabs, StatCards, Aggregation Tables, Export buttons | Analytics reports (Overview, Class, Student lists) |
| **Admin Attendance Monitor** | Monitoring console for session locks | `/super-admin/attendance` | Super Admin | Manually Lock Session, Unlock override | View Student Record Ledger | Table, Drawer overlay, Confirm Dialogs | Array of sessions, records list |

---

## 6. Navigation Structure

### Sidebar
*   **Visual Layout:** High-contrast slate dark background (`bg-slate-900` / `#0f172a`), border right (`border-slate-800`).
*   **Header:** Standard `Logo` component. On hover, logo gets subtle scale micro-animations.
*   **Links:** Role-specific menus generated dynamically. Active menu items feature a blue glow (`bg-blue-600` / `#2563eb`), white text, and a right-aligned indicator strip. Inactive states feature hover highlights (`hover:bg-slate-800`).
*   **Footer Block:** Displays user's name initials inside a styled avatar ring (`bg-blue-600/20`), their full name, role badge, and email address. Below this, a blocky "Sign Out" button styled in deep transparent red (`bg-red-950/20 hover:bg-red-950/40 text-red-400`).

### Navbar
*   **Visual Layout:** Fixed-height (`h-16`), blur backdrop (`bg-white/80 backdrop-blur-md`), bottom border (`border-slate-100`).
*   **Desktop Navigation:** Displays current page title, system status badge (connected, PostgreSQL Live sync), and responsive breadcrumb trails.
*   **Mobile Navigation:** Hides full breadcrumbs. Displays a hamburger toggle button (`Menu`) to trigger the slide-over Sidebar Drawer.

### Footer
*   **Visual Layout:** Small-height bottom section. Clean neutral layout, light slate text (`text-slate-400`).
*   **Content:** Copyright notice, application version info, and contact links.

---

## 7. UI Components Inventory

Attend-Pro utilizes a modular typography and component library. All interactive items include hover state transitions.

```mermaid
graph TD
    subgraph Core Design Tokens
        Color[Color Palette: HSL/Tailwind Slate, Blue, Emerald, Rose]
        Typography[Typography: Inter / Outfit]
        Shadows[Elevation: MD/LG Glassmorphism]
    end

    subgraph Common Layout Components
        Sidebar[Sidebar Menu]
        Navbar[Navbar Breadcrumbs]
        Footer[Footer Copyright]
        PageHeader[Page Header Template]
    end

    subgraph User Interactive Elements
        Btn[Button: Loading/States]
        Inp[Input: Search/Inputs]
        Badg[Badge: Success/Warning/Danger]
        Tbl[Table: Pagination/EmptyState]
        Mdl[Modal: Verify/Spreadsheet]
        Drw[Drawer: Slide-over detailed records]
        Toast[Toast alerts popup]
    end

    Core Design Tokens --> Common Layout Components
    Common Layout Components --> User Interactive Elements
```

### 1. Button (`Button.tsx`)
*   **Variants:** `primary` (blue), `secondary` (gray), `success` (emerald), `danger` (rose), `warning` (amber), `neutral` (slate-700).
*   **Sizes:** `lg` (padding `px-6 py-3`), `md` (padding `px-4 py-2`), `sm` (padding `px-3 py-1.5`), `xs` (padding `px-2 py-1`).
*   **States:** Default, Hover (+10% lightness/scale shadow), Focus ring, Disabled (opacity 50%, cursor-not-allowed), Loading (replaces text with a Lucide spinner).

### 2. Input (`Input.tsx`)
*   **States:** Default (`border-slate-200`), Focused (`ring-2 ring-blue-500/20 border-blue-500`), Error (`border-red-500 text-red-900 ring-red-500/20`).

### 3. Status Badges (`Badge.tsx`)
*   **Success (Emerald):** Inactive/Active states (`bg-emerald-50 text-emerald-700 border-emerald-100`).
*   **Warning (Amber):** Pending/Morning batch states (`bg-amber-50 text-amber-700 border-amber-100`).
*   **Danger (Rose):** Deactivated/Absent/Failed states (`bg-rose-50 text-rose-700 border-rose-100`).
*   **Neutral (Slate/Blue):** Open/Evening/Double batch states (`bg-slate-50 text-slate-700 border-slate-100`).

### 4. Table (`Table.tsx`)
*   **Layout:** Borderless layout, styled header (`bg-slate-50 text-slate-400 font-bold tracking-wider`), alternating row highlights, and bottom pagination block.
*   **Inner Components:** Includes nested `EmptyState` and `LoadingSpinner` rows.

### 5. Dialog Modals (`Modal.tsx`)
*   **Layout:** Dark semi-transparent backdrop overlay (`bg-slate-900/50 backdrop-blur-sm`). Centered slide-down dialog card (`w-full max-w-lg bg-white rounded-2xl shadow-xl animate-scale-up`).
*   **Sections:** Header title with "X" close trigger, body content viewport (scroll-capped), and button footer panel (Confirm/Cancel).

### 6. Session Detail Slide-over Drawer
*   **Layout:** Slides in from the right edge. Displays session overview stats and the complete classroom list (students with present/absent checks).

---

## 8. Page-by-Page UI Requirements

### Staff Login & Super Admin Login
*   **Visual Architecture:** Centered vertical layouts. Features dynamic animated background dots, a brand card header with a portal identity badge (Staff Portal: Blue, Administration: Violet).
*   **Sections:** 
    *   Unified input forms for email and password.
    *   Error Banner: Red box that animates when credentials fail verification.
    *   Helper link: Navigates to reset credentials.
*   **Responsiveness:** Login card scales down to full width on mobile viewports.

### Staff Dashboard
*   **Visual Architecture:** Welcome header with dynamic greeting based on system time (e.g. "Good morning, Dr. Sanjay").
*   **Sections:** 
    *   Timetable grid. Each card represents an assigned class.
    *   **Class Cards:** Displays class name, batch type, and scheduled timing windows.
    *   **Interactive Call-to-Action:** Shows status pill (Not Open, Submitted, Locked). If open, renders a green button (`Take Attendance`).
*   **Responsiveness:** Cards flow from 3-columns (desktop) to 2-columns (tablet) to single-column stack (mobile).

### Staff Attendance Grid Taking Screen
*   **Visual Architecture:** Left-aligned back trigger button, class summary title, session badge, and timing countdown timer.
*   **Sections:** 
    *   **Status Countdown Timer:** Displays remaining time before session locks (e.g. `24m 15s remaining`).
    *   **Student Grid:** A grid of student blocks. Default state is green (Present). Clicking a block toggles it to red (Absent) and adds the student to the exclusion array.
    *   **Control Panel:** Renders total present/absent summary pills and a primary action button (`Submit Attendance`).
*   **Unsaved Changes Guard:** Activates a custom browser confirm prompt (`beforeunload`) if the user attempts to exit with modified lists.
*   **Empty State:** Displays a fallback graphic if no students are assigned to the class.

### Staff Attendance History Page
*   **Visual Architecture:** Double dropdown filters (Class selection, Month selection).
*   **Sections:** 
    *   Paginated log of historical sessions.
    *   Clicking a row triggers a side-drawer showing detail stats (Present/Absent counts, marks timeline) and the list of student states.
*   **Responsive Adaptation:** On mobile screens, the table scrolls horizontally, and the details drawer slides up to occupy full-screen height.

### Admin Dashboard Overview
*   **Visual Architecture:** Top row features three Statistics Cards with trend metrics (Students count, Staff count, Classes configured).
*   **Sections:** 
    *   **Middle Grid (2/3 width):** Renders a table of recent sessions today, showing class names, batches, submit status, and attendance rate percentages.
    *   **Sidebar Card (1/3 width):** Displays quick action navigation buttons with hover micro-animations (Enroll Student, Configure Classes, etc.).
    *   **Bottom Grid (Full width):** Admin Event Logs panel showing recent database updates.

### Admin Staff Registry & Student Directory
*   **Visual Architecture:** Header bar with search input and main actions (Add Staff, Enroll Student, Bulk Import).
*   **Sections:** 
    *   Paginated registry directory tables.
    *   Actions Column: Contains edit and inline deactivate button groups.
    *   Password reset popups for staff.
*   **Csv Import Modal:** Shows upload progress bar and reports validation errors (missing headers, incorrect phone formats).

### Admin Assignments Panel
*   **Visual Architecture:** Timetable dropdown filter and a mode switch toggle (Students vs Staff).
*   **Sections:** 
    *   **Dual-Panel Workspace:** Left panel lists unassigned names; right panel lists current members in the section.
    *   **Transfer Actions:** Displays single transfer buttons (Assign `→`, Unassign `←`) and top-aligned bulk select buttons.
*   **Data Validation:** Warns administrators if a class has no faculty assigned before attendance starts.

### Admin Reports Page
*   **Visual Architecture:** Primary top tab bar with three navigation filters: Overview Reports, By Class Analytics, and By Student Analytics.
*   **Sections:** 
    *   **Overview Tab:** Date filters, four summary cards, and a compliance list ordering classes from lowest attendance to highest.
    *   **Class Tab:** Dynamic analytics table showing attendance rates, class averages, and total sessions.
    *   **Student Tab:** Student lookup search bar and list showing individual attendance rates.
*   **Export Controls:** Secondary action buttons to download summaries in CSV spreadsheet format.

---

## 9. Form Specifications

### 1. Staff Login Form
*   **Fields:**
    *   `email`: Input type `email`, required, regex rule validation (`^[^\s@]+@[^\s@]+\.[^\s@]+$`).
    *   `password`: Input type `password`, required, minimum 6 characters.
*   **Database Mapping:** Read validation on `public.users` matching auth credentials.

### 2. Super Admin Login Form
*   **Fields:**
    *   `email`: Input type `email`, required.
    *   `password`: Input type `password`, required.
*   **Database Mapping:** Read validation on `public.users` (requires role matching `super_admin`).

### 3. Forgot Password Form
*   **Fields:**
    *   `email`: Input type `email`, required.
*   **Target API Endpoint:** `/api/auth/forgot-password` (triggers password reset emails).

### 4. Staff Registry Editor Form
*   **Fields:**
    *   `full_name`: Input type `text`, required, min 3 characters.
    *   `email`: Input type `email`, required, must be unique.
    *   `phone`: Input type `tel`, optional, format validation (`^[0-9+() -]*$`).
    *   `password`: Input type `password`, required for new entries only.
*   **Target API Endpoint:** `POST /api/super-admin/staff` / `PUT /api/super-admin/staff/:id`
*   **Database Table:** `public.users`

### 5. Student Enrollment Editor Form
*   **Fields:**
    *   `roll_number`: Input type `text`, required, must be unique.
    *   `full_name`: Input type `text`, required.
    *   `parent_phone`: Input type `tel`, required, validates to 10-digit number.
    *   `email`: Input type `email`, optional.
*   **Target API Endpoint:** `POST /api/super-admin/students` / `PUT /api/super-admin/students/:id`
*   **Database Table:** `public.students`

### 6. Class Configuration Form
*   **Fields:**
    *   `name`: Input type `text`, required, class name (e.g. `CSE-A`).
    *   `batch_type`: Input type `select`, required, values: `morning`, `evening`, `both`.
    *   `morning_start`: Input type `time`, required if batch is morning/both.
    *   `morning_lock`: Input type `time`, required if batch is morning/both, must be after start time.
    *   `evening_start`: Input type `time`, required if batch is evening/both.
    *   `evening_lock`: Input type `time`, required if batch is evening/both, must be after start time.
*   **Target API Endpoint:** `POST /api/super-admin/classes` / `PUT /api/super-admin/classes/:id`
*   **Database Table:** `public.classes`

### 7. Bulk Import Student Form (Spreadsheet Upload)
*   **Fields:**
    *   `csv_file`: Input type `file` (accepts `.csv` only), required.
*   **Target API Endpoint:** `POST /api/super-admin/students/import`
*   **Database Tables:** Inserts into `public.students`

---

## 10. Table Specifications

### 1. Staff Directory Table
*   **Columns:** Full Name, Email, Phone, Status Badge, Actions (Edit, Reset Password, Deactivate).
*   **Searching:** Filters rows client-side matching Name/Email/Phone.
*   **Actions:** Reset password modal trigger, inline toggle deactivate.

### 2. Student Directory Table
*   **Columns:** Roll Number, Full Name, Parent Phone, Email, Status Badge, Actions (Edit, Deactivate).
*   **Searching:** Server-side search on Roll Number/Name.
*   **Filtering:** Filter rows by Class Section.

### 3. Class Configurations Table
*   **Columns:** Class Section Name, Batch Type Badge, Morning Window (Start → Lock), Evening Window (Start → Lock), Assigned Metrics (Students Count, Staff Count Badge), Actions (Edit, Delete).
*   **Sorting:** Sort by Class Name.
*   **Row Actions:** Delete confirm alert triggers.

### 4. Attendance History Table
*   **Columns:** Session Date, Class Section, Session Type Badge, Present Count, Absent Count, Completion Status (Submitted/Locked), Actions (View Details).
*   **Filtering:** Dropdown selections filter by Class Section and Month.

---

## 11. Modal & Side Drawer Specifications

```
  Dialog Modal Pattern                      Slide-over Side Drawer Pattern
  ┌─────────────────────────────────┐       ┌───────────────────────────────┐
  │  Edit Student Roster     [ X ]  │       │ Detailed Session Records  [X] │
  ├─────────────────────────────────┤       ├───────────────────────────────┤
  │                                 │       │ Date: 2026-07-04              │
  │  [Roll Number]                  │       │ Class: CSE-A (Morning)        │
  │  [Full Name]                    │       │                               │
  │  [Parent Phone]                 │       │ ┌───────────────────────────┐ │
  │                                 │       │ │ search student...       Q │ │
  │                                 │       │ ├───────────────────────────┤ │
  │                                 │       │ │ Roll No │ Name    │Status │ │
  │                                 │       │ ├─────────┼─────────┼───────┤ │
  │                                 │       │ │ 101     │ Rahul   │[Abs]  │ │
  │                                 │       │ │ 102     │ Sneha   │[Pres] │ │
  ├─────────────────────────────────┤       │ └─────────┴─────────┴───────┘ │
  │  [ Cancel ]     [ Save Changes ]│       │ [Unlock Sheet Override]       │
  └─────────────────────────────────┘       └───────────────────────────────┘
```

### 1. Dialog Modals

#### Add / Edit Student Modal
*   **Trigger:** Clicking "Enroll Student" or "Edit" on row directories.
*   **Design & Layout:** Centered layout, stacked form inputs. Includes a cancel button to close without saving.

#### Bulk CSV Import Modal
*   **Trigger:** Clicking "Bulk Import CSV" on Student Directory page.
*   **Design & Layout:** Contains file drag-and-drop zone and a download link for the CSV template. 
*   **Progress Indicators:** Shows upload progress. Renders warning banners for duplicate roll numbers or formatting issues.

#### Reset Staff Password Modal
*   **Trigger:** Clicking the key icon on a staff row.
*   **Fields:** Renders a manual password input field. Displays validation feedback if the password is too short.

#### Attendance Submission Confirmation Modal
*   **Trigger:** Clicking "Submit Attendance" on the take page.
*   **Design & Layout:** Renders absent count metrics in red. Renders warning text: *"Submitting will lock records and finalize attendance statistics."*

---

### 2. Side Drawers

#### Session Details Slide-over Drawer
*   **Trigger:** Clicking a history log row or active monitoring row.
*   **Design & Layout:** Drawer slides in from the right. Shows summary counts (Present vs Absent) and the student records grid.
*   **Admin Overrides:** Admin drawer includes a secondary lock override button:
    *   If session is open: Button displays `Lock Session`.
    *   If session is locked: Button displays `Unlock Session`.

---

## 12. Design System

Attend-Pro utilizes a modern, clean typography and spacing system to maintain interface consistency.

### Typography
*   **Fonts:** Primary sans font family `Inter` or `Outfit`. Fallback `system-ui, sans-serif`. Monospace font `Fira Code` or `SFMono-Regular` for IDs and roll numbers.
*   **Hierarchy Scale:**
    *   `h1`: `text-xl font-bold tracking-tight text-slate-800` (e.g. page headers).
    *   `h2`: `text-lg font-bold text-slate-800` (e.g. section headers).
    *   `h3`: `text-sm font-bold text-slate-700` (e.g. card headers).
    *   `body`: `text-xs text-slate-500 font-medium` (e.g. descriptions, form labels).
    *   `details`: `text-[10px] font-mono text-slate-400`.

### Color Palette
```
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Primary Blue   : #2563eb (blue-600)  │  Slate Background: #f8fafc (slate-50)  │
  ├───────────────────────────────────────┼────────────────────────────────────────┤
  │  Dark Sidebar   : #0f172a (slate-900) │  Success Green   : #059669 (emerald-600)│
  ├───────────────────────────────────────┼────────────────────────────────────────┤
  │  Warning Orange : #d97706 (amber-600)   │  Danger Red      : #e11d48 (rose-600)   │
  └────────────────────────────────────────────────────────────────────────┘
```
*   **Borders:** Gray outlines (`border-slate-200/80` or `border-slate-100`).

### Spacing & Elevation
*   **Layout Spacing:** Sidebar padding `p-6`, main wrapper `p-6 md:p-8`, cards spacing `gap-5`.
*   **Border Radius:** Input fields `rounded-xl` (12px), UI cards `rounded-2xl` (16px), control badges `rounded-full` (9999px).
*   **Shadows:** Card elevation `shadow-md` (0 4px 6px -1px rgb(0 0 0 / 0.05)), hover highlights `shadow-lg`.
*   **Transitions:** Component animations set to `transition-all duration-200 ease-in-out`.

---

## 13. Responsive Design Requirements

### Responsive Layout Breakpoints
*   **Desktop (>= 1024px):** Fixed sidebar on the left (`w-64`). Main scroll container max-w-7xl with outer margins (`mx-auto`).
*   **Laptop (1024px - 1280px):** Sidebar remains locked. Grid systems scale down to fit smaller display areas.
*   **Tablet (768px - 1024px):** Sidebar collapses into a drawer layout. Top navbar displays a hamburger toggle button. Cards reflow from 3-columns to 2-columns.
*   **Mobile (< 768px):** Navigation transitions to a drawer menu. Layout margins reduce (`p-4`).

### Component Adaptations on Mobile
```
  Desktop Multi-column Grid                      Mobile Stacking Flow
  ┌───────────────┬───────────────┐              ┌────────────────────────┐
  │ Roll Number   │ Full Name     │              │ Roll: 101              │
  ├───────────────┼───────────────┤  ──────────► │ Name: Rahul Kumar      │
  │ 101           │ Rahul Kumar   │              │ Status: Present        │
  └───────────────┴───────────────┘              └────────────────────────┘
```
*   **Tables:** Tables feature overflow-x horizontal scroll, with cell margins adjusting automatically. Alternatively, tables adapt into stacked card structures.
*   **Forms:** Form structures switch to full-width input fields.
*   **Student Take Grid:** Student blocks grid adjusts from 6 columns down to 2 columns, expanding spacing to prevent accidental selections.

---

## 14. User Experience Guidelines

1.  **Clear Layout Framework:** Content structures are logically separated into three levels: Overview statistics, detailed list tables, and edit action modals.
2.  **Visual Status Indicators:** Color-coded badges represent current states. Green indicates submitted logs, red indicates deactivations/failures, and orange indicates pending classes.
3.  **Keyboard Accessibility:** Form modals support basic keyboard navigation (`Tab` focus, `Enter` submission, and `Esc` close trigger).
4.  **Instant Notifications:** Visual toast notifications confirm database updates. Banners render at the top of forms to display API errors.
5.  **Timing Warnings:** The countdown timer on the taking page displays in amber, turning red when the lock window is under five minutes.
6.  **Confirmation Dialogs:** Destructive actions (deactivating users, deleting classes) require confirmation.

---

## 15. Database Mapping & API Specifications

This section maps frontend screens to database operations and endpoints.

### Authentication & Password Pages
*   **Database Tables:** `public.users` (Auth schema)
*   **CRUD Operations:** READ (authentication check)
*   **HTTP API Endpoints:** 
    *   `POST /api/auth/login` (Staff and admin sessions)
    *   `POST /api/auth/forgot-password` (Reset links)

### Faculty Dashboard Page
*   **Database Tables:** `public.classes`, `public.staff_class_assignments`, `public.attendance_sessions`
*   **CRUD Operations:** READ (assigned sections and active sessions)
*   **HTTP API Endpoints:**
    *   `GET /api/staff/attendance/my-classes` (Returns assigned classes)

### Attendance Taking View
*   **Database Tables:** `public.students`, `public.attendance_sessions`, `public.attendance_records`
*   **CRUD Operations:** READ student lists, INSERT session and record data
*   **HTTP API Endpoints:**
    *   `GET /api/staff/attendance/session-status/:classId` (Checks time lock status)
    *   `GET /api/staff/attendance/students/:classId` (Loads student roster)
    *   `POST /api/staff/attendance/submit` (Submits check-ins)

### Staff History & Review Logs
*   **Database Tables:** `public.attendance_sessions`, `public.attendance_records`
*   **CRUD Operations:** READ sessions logs
*   **HTTP API Endpoints:**
    *   `GET /api/staff/attendance/sessions` (Loads history logs)
    *   `GET /api/staff/attendance/session/:id` (Loads student check-in detail records)

### Admin Registries Management (Staff, Students, Classes)
*   **Database Tables:** `public.users`, `public.students`, `public.classes`, `public.student_class_assignments`, `public.staff_class_assignments`
*   **CRUD Operations:** CREATE, READ, UPDATE, and DELETE (CRUD) entries
*   **HTTP API Endpoints:**
    *   `GET/POST/PUT /api/super-admin/staff`
    *   `PUT /api/super-admin/staff/:id/reset-password`
    *   `PUT /api/super-admin/staff/:id/deactivate`
    *   `GET/POST/PUT /api/super-admin/students`
    *   `PUT /api/super-admin/students/:id/deactivate`
    *   `POST /api/super-admin/students/import` (Processes bulk imports)
    *   `GET/POST/PUT/DELETE /api/super-admin/classes`

### Admin Section Assignments Panel
*   **Database Tables:** `public.student_class_assignments`, `public.staff_class_assignments`
*   **CRUD Operations:** CREATE and DELETE mappings
*   **HTTP API Endpoints:**
    *   `GET /api/super-admin/assignments/students/:classId`
    *   `POST /api/super-admin/assignments/students/assign`
    *   `POST /api/super-admin/assignments/students/unassign`
    *   `GET /api/super-admin/assignments/staff/:classId`
    *   `POST /api/super-admin/assignments/staff/assign`
    *   `POST /api/super-admin/assignments/staff/unassign`

### Admin Attendance Monitor Page
*   **Database Tables:** `public.attendance_sessions`, `public.attendance_records`, `public.audit_log`
*   **CRUD Operations:** READ check-in states, UPDATE lock overrides, INSERT audit override records
*   **HTTP API Endpoints:**
    *   `GET /api/super-admin/attendance/all-sessions` (Retrieves monitor logs)
    *   `PUT /api/super-admin/attendance/session/:id/lock` (Locks session)
    *   `PUT /api/super-admin/attendance/session/:id/unlock` (Unlocks session, logs entry)

### Administrative Reports
*   **Database Tables:** `public.attendance_sessions` (aggregate metrics)
*   **CRUD Operations:** READ analytics reports
*   **HTTP API Endpoints:**
    *   `GET /api/super-admin/reports/overview` (Retrieves general metrics)
    *   `GET /api/super-admin/reports/class/:classId`
    *   `GET /api/super-admin/reports/student/:studentId`

---

## 16. Future Features Integration

### 1. QR Code Attendance Scanning
*   **UI Requirement:** Staff Dashboard page includes a toggle control called `Enable QR Check-in`. If enabled, the page displays a large dynamic QR code on the projector screen. Students scan this QR code using their mobile devices.
*   **UX Pattern:** The QR code updates its validation token periodically to prevent code sharing. A live check-in ticker displays student photos as they scan.

### 2. RFID Card Reader Integration
*   **UI Requirement:** Student Form includes a text field to map card IDs: `RFID Tag ID`.
*   **UX Pattern:** An indicator light in the sidebar displays the reader status (Connected/Disconnected). A workspace dashboard modal renders when a tag scans to verify student info.

### 3. Facial Recognition Verification View
*   **UI Requirement:** Classroom take screen displays a camera widget.
*   **UX Pattern:** Displays a verification overlay. Renders color-coded scan tags over faces (Green: verified matching name, Yellow: unassigned, Red: database mismatch).

### 4. Advanced Analytics & Compliance Dashboard
*   **UI Requirement:** Reports page displays multi-axis line graphs and heatmaps showing attendance trends over time.
*   **UX Pattern:** Interactive controls allow hover tooltips to show detail metrics on specific dates. A risk warning widget flags students with attendance rates below 75%.

---

## 17. UI Development Priority

This roadmap schedules development from layout foundations to advanced pages.

```
  Phase 1: Foundations   ──► Phase 2: Registry        ──► Phase 3: Take & Process
  - Design system tokens      - Student enrollment code   - Staff take workspace
  - Core layouts config       - Staff registry views      - Submit Verify Modals
  - Auth Login portals        - Timetable scheduling      - Statistics compiler
                                                                    │
  ┌─────────────────────────────────────────────────────────────────┘
  ▼
  Phase 4: Management    ──► Phase 5: Polish & Expand
  - Reports & Analytics       - Interactive Settings
  - Monitoring lock views     - Audit Logs list
  - CSV Bulk imports          - Profile settings customizer
```

### Phase 1: Design System & Authentication
1.  Initialize typography, color tokens, and spacing variables.
2.  Build layout structures (`AdminLayout`, `StaffLayout`, responsive Sidebars).
3.  Implement authentication views (`StaffLogin`, `SuperAdminLogin`, `ForgotPassword`).

### Phase 2: Administrator Registry Management
1.  Build paginated data table components (`Table.tsx`).
2.  Develop forms and modals for managing Staff, Students, and Classes.
3.  Implement the assignments interface (dual list panels for mapping rosters).

### Phase 3: Attendance Grid & Staff Workspaces
1.  Develop the Staff Dashboard class card layouts.
2.  Build the grid layout and interactive controls for taking attendance.
3.  Develop the `VerifyModal` component for confirming submissions.

### Phase 4: Administrative Analytics & Monitoring
1.  Develop compliance overview reports.
2.  Build the Reports page tabs and data export filters.
3.  Implement the monitoring console to display live sessions and handle lock overrides.

### Phase 5: Customizations & Polish
1.  Build system setting panels (timing defaults).
2.  Develop the audit logs viewer table.
3.  Add micro-animations, loading skeleton elements, and transition effects.

---

## 18. Missing Screens & Views Recommended

These views are not currently routed in the application but are recommended to complete the frontend architecture.

### 1. Institutional Configuration Settings
*   **Purpose:** Allows administrators to manage system preferences.
*   **Sections:** 
    *   **Lock Policies:** Configurations for attendance locking timeouts (e.g. grace period in minutes).
    *   **Calendar Settings:** Defines college holidays to prevent scheduling sessions on off-days.
*   **Route:** `/super-admin/settings`

### 2. User Profile & Password Customizer
*   **Purpose:** Enables faculty to update contact info and change their passwords.
*   **Sections:** Contact information edit form and change password inputs (verifies old password before saving).
*   **Route:** `/staff/profile` and `/super-admin/profile`

### 3. Compliance Audit Logs Viewer
*   **Purpose:** Displays manual override actions taken by administrators.
*   **Sections:** Table displaying actor info, session details, manual actions, and timestamps.
*   **Route:** `/super-admin/audit-logs`

### 4. System Notification Center
*   **Purpose:** Aggregates warnings and system notifications.
*   **Sections:** Slide-out panel displaying logs for system audit or API sync errors.
*   **UX Pattern:** Renders a badge counts indicator on the top navbar.

---

## 19. UI Consistency Audit & Recommendations

An audit of the current frontend codebase identified the following styling and layout issues. These recommendations aim to improve consistency without changing backend business logic.

### 1. Styling Inconsistencies
*   **Issue:** The project uses Vite with Tailwind CSS utility classes, but some elements rely on raw CSS values inside `App.css` or use inline pixel offsets (e.g. padding and margins).
*   **Recommendation:** Migrate inline style values to standard Tailwind classes to maintain consistent spacing and sizing.

### 2. Table Responsiveness
*   **Issue:** Directory tables (Students, Staff) clip content on small screen viewports, hiding actions columns.
*   **Recommendation:** Implement responsive table wrappers (`overflow-x-auto min-w-[800px]`) to enable horizontal scrolling on smaller displays.

### 3. Inactive Admin Monitoring Page
*   **Issue:** The file `client/src/pages/admin/Attendance.tsx` exists on disk but is not registered in `AppRoutes.tsx` or linked in the Admin Sidebar menu.
*   **Recommendation:** Register `/super-admin/attendance` in the routing system and add a link in the Admin Sidebar under the label `Attendance Monitoring` to enable lock overrides.

### 4. Countdown Timer Clashes
*   **Issue:** If the client's system clock deviates from the database server time, the countdown timer displays incorrect remaining time.
*   **Recommendation:** Synchronize the client's time settings with the server clock using periodic sync checks.

### 5. Dialog Close Interactions
*   **Issue:** Clicking outside some modal screens closes the dialog, which can lead to accidental data loss in forms.
*   **Recommendation:** Disable closing when clicking outside form modals, requiring users to explicitly click the close button to prevent loss of input data.

---

## 20. Final UI Blueprint & Conclusion

### Summary Architecture
Attend-Pro is structured as a dual-portal interface, with a Super Admin control center for managing system structures, and a Staff workspace optimized for taking attendance quickly on mobile devices.

```
       Desktop Dashboard Layout                 Mobile Layout (Menu Drawer)
  ┌──────┬──────────────────────────┐         ┌──────────────────────────────┐
  │ Brand│ Overview Dashboard       │         │ [=] Logo   System Connected  │
  ├──────┼──────────────────────────┤         ├──────────────────────────────┤
  │ Dash │ [Stats1] [Stats2] [Stats3]│         │ Welcome, Sanjay!             │
  │ Staff│ ┌──────────────────────┐ │         │                              │
  │ Stud │ │ Recent Logs Table    │ │         │ ┌──────────────────────────┐ │
  │ Class│ │                      │ │         │ │ CSE-A (Morning Session)  │ │
  │ Assign│└──────────────────────┘ │         │ │ [Take Attendance Button] │ │
  ├──────┼──────────────────────────┤         │ └──────────────────────────┘ │
  │Avatar│ Footer copyright         │         │ Footer copyright             │
  └──────┴──────────────────────────┘         └──────────────────────────────┘
```

### Visual Experience Goals
*   **Super Admin Control Center:** Data-dense layout utilizing light background grids (`bg-slate-50`), structured tables, filter bars, and quick actions menus.
*   **Staff Workspace Console:** Minimalist layout utilizing card-based designs, touch-friendly grid buttons, and countdown indicators.

This specification document provides the layout rules, database relationships, and component behaviors needed to build the Attend-Pro frontend consistently.
