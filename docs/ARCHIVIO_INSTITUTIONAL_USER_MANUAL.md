# ARCHIVIO: Institutional Research Archival & Repository Management System
## Official User Manual & Standard Operating Procedures (SOP)
**Academic Year 2026–2027 | Institutional Release Version 2.0**

---

### Document Control & Metadata
* **System Name:** ARCHIVIO Research Archival & Capstone Repository System
* **Institution:** South-Western University PHINMA / PHINMA Education
* **Prepared For:** Academic Deans, College Directors, Faculty Research Advisers, Student Researchers, and System Administrators
* **Document Classification:** Official Institutional Operations Manual
* **Effective Date:** Academic Year 2026–2027
* **Access Portals:**
  - **Unified Portal:** `https://archivio-research-system.web.app/` (or `http://localhost:5173/`)
  - **Public Open-Access Archive:** `https://archivio-public.web.app/` (or `http://localhost:5174/`)
  - **Interactive API Documentation:** `https://archivio-research-system.web.app/docs` (or `http://localhost:3001/docs`)

---

## Table of Contents
1. [Executive Summary & System Architecture](#1-executive-summary--system-architecture)
2. [Stakeholder Roles & Permission Matrix](#2-stakeholder-roles--permission-matrix)
3. [Account Access & Security Protocol](#3-account-access--security-protocol)
4. [Dean & Academic Leadership Operations Manual](#4-dean--academic-leadership-operations-manual)
   - 4.1 Dean Dashboard & Departmental Telemetry
   - 4.2 The One-Click Dual-Role Switcher (Dean + Adviser)
   - 4.3 Manuscript Review, Endorsement & Archival Workflow
   - 4.4 College Research Records & Catalog Inspection
   - 4.5 Faculty & Adviser Load Oversight
   - 4.6 Accreditation Reports & Analytics Export
5. [Research Adviser Operations Manual](#5-research-adviser-operations-manual)
   - 5.1 Advising Dashboard & Capstone Groups
   - 5.2 Milestone Verification (The 7 Institutional Deliverables)
   - 5.3 Reviewing Submissions & Requesting Revisions
   - 5.4 Formal Endorsement to the Dean
6. [Student Researcher Operations Manual](#6-student-researcher-operations-manual)
   - 6.1 Account Creation & Team Registration
   - 6.2 Adviser Selection & Capstone Registration
   - 6.3 Uploading Defense Milestones
   - 6.4 Tracking Review Progress
   - 6.5 Generating the Official Certificate of Archival
7. [System Administrator Operations Manual](#7-system-administrator-operations-manual)
   - 7.1 User Management & Role Lifecycle
   - 7.2 Storage Management & Cloud Governance
   - 7.3 Institutional Reporting & Executive PDF Export
   - 7.4 System Audit Trails & Activity Logging
8. [Public Open-Access Archive & Verification Engine](#8-public-open-access-archive--verification-engine)
   - 8.1 Public Research Discovery & Advanced Search
   - 8.2 Interactive Document Viewer & Citation Engine
   - 8.3 QR Code & Digital Certificate Verification
9. [Troubleshooting & Frequently Asked Questions (FAQ)](#9-troubleshooting--frequently-asked-questions-faq)
10. [Institutional Approval & Sign-Off Sheet](#10-institutional-approval--sign-off-sheet)

---

## 1. Executive Summary & System Architecture

### 1.1 Purpose of ARCHIVIO
**ARCHIVIO** is an institutional digital research repository and capstone governance platform designed to modernize the management, evaluation, preservation, and public dissemination of undergraduate and graduate scholarly output.

### 1.2 Key Objectives
* **Zero Paper Wastage & Zero-Loss Archival:** Fully digital, cloud-backed repository replacing physical hardbound submissions.
* **Streamlined Academic Governance:** Strict verification hierarchy where research papers progress through Student $\rightarrow$ Adviser $\rightarrow$ Dean approval gates.
* **Automated Institutional Compliance:** Automated verification of 7 defense milestone deliverables, plagiarism declarations, and signed approval sheets.
* **Accreditation Readiness:** Instant generation of executive-grade research compliance reports formatted with official institutional letterheads and Dean signature blocks.
* **Public Knowledge Transfer:** Dedicated Open-Access Public Archive featuring high-performance PDF reading, multi-standard citation generator (APA, MLA, IEEE, Chicago), and tamper-proof digital certificate verification.

### 1.3 High-Level System Workflow
```
[ STUDENT GROUP ]
       │
       ▼ (1. Uploads 7 Defense Milestones)
[ SUBMISSION QUEUE ]
       │
       ▼ (2. Mentorship, Plagiarism Check & Revision Requests)
[ RESEARCH ADVISER ]
       │
       ├─► (Revisions Needed ──► Returned to Student)
       │
       ▼ (3. Formal Adviser Endorsement)
[ DEAN REVIEW QUEUE ]
       │
       ├─► (Further Revisions ──► Returned to Group/Adviser)
       │
       ▼ (4. Dean Final Approval & Institutional Seal)
[ ARCHIVIO REPOSITORY ]
       ├──► Official Certificate of Archival Generated (QR-coded)
       └──► Published to Public Open-Access Archive (Searchable worldwide)
```

---

## 2. Stakeholder Roles & Permission Matrix

| Module / Feature | Student Researcher | Research Adviser | College Dean | Dean + Adviser (Dual Role) | System Administrator |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Group Registration & Members** | Create / Edit Own | View Assigned | View College | View College & Manage Own | View & Manage All |
| **Upload Defense Milestones** | Yes | No | No | No | Governance Only |
| **Milestone Review & Revision Feedback** | View Feedback | Review & Return | Review & Return | Full Dual Review | Audit View |
| **Endorse Submission to Dean** | No | **Yes** | N/A | **Yes** | Override Only |
| **Final Approval & Institutional Archival** | No | No | **Yes** | **Yes** | Override Only |
| **Departmental Analytics & Reports** | No | Group Level | **College Level** | **College Level** | **Institutional Level** |
| **Generate Archival Certificate** | Download Own | Verify | Sign & Verify | Sign & Verify | Master Verify |
| **User & Account Management** | None | None | College Faculty | College Faculty | **Full Administrative** |
| **Storage Governance & Quotas** | View Quota | View | View | View | **Full Configuration** |

---

## 3. Account Access & Security Protocol

### 3.1 Unified Login Portal (`/`)
ARCHIVIO features a centralized, intelligent authentication gateway:
1. Navigate to the ARCHIVIO web URL.
2. Enter your institutional email address (`@phinmaed.com` or `@swu.phinmaed.com`).
3. Enter your secure password.
4. Complete the Google reCAPTCHA v2 verification.
5. Click **Sign In**. The system will automatically identify your role and redirect you to your designated portal:
   - System Administrator $\rightarrow$ `/admin/dashboard`
   - College Dean $\rightarrow$ `/dean/dashboard`
   - Research Adviser $\rightarrow$ `/adviser/dashboard`
   - Student Researcher $\rightarrow$ `/student/dashboard`

### 3.2 Dean First-Time Account Activation (`/dean-activate`)
When a Dean is provisioned by the Administrator:
1. An official institutional welcome email is dispatched containing your temporary credentials and a secure one-time activation link.
2. Log in using your email and temporary password.
3. The system automatically routes you to the **Dean Activation Gateway** (`/dean-activate`).
4. Read and accept the institutional **Privacy Policy** and **Terms & Conditions**.
5. Set your new permanent password (minimum 8 characters, with uppercase, lowercase, numbers, and symbols).
6. Click **Activate Account**. Both your Dean profile and any associated Adviser privileges are synchronized instantly.

### 3.3 Password Recovery Protocol
* If you forget your password, click **Forgot Password?** on the login screen.
* Enter your institutional email address.
* ARCHIVIO’s Cloud Email Service will dispatch an authenticated password reset link valid for 1 hour.

---

## 4. Dean & Academic Leadership Operations Manual

> **Note for the Dean:** As Dean, you hold the highest academic authority in ARCHIVIO for your college. No capstone project or manuscript can be officially archived or published without your formal approval.

### 4.1 Dean Dashboard & Departmental Telemetry
Upon entering `/dean/dashboard`, the Dean is greeted with real-time academic intelligence:
* **Department Total Submissions:** Overall count of capstone projects submitted within your college.
* **Under Review / Publish Queue Counter:** Number of manuscripts currently awaiting your final review.
* **Active Research Advisers:** Number of faculty advisers actively supervising groups.
* **Research Category Distribution:** Pie chart visual of active specializations (e.g., AI/Machine Learning, Healthcare Informatics, Cloud Systems).
* **Recent Activity Feed:** Live timestamps of manuscript uploads, adviser endorsements, and student milestones.

### 4.2 The One-Click Dual-Role Switcher (Dean + Adviser)
Many Deans actively mentor capstone groups in addition to their executive duties. ARCHIVIO includes a **Dual-Role Switcher**:
1. At the top-right header of your portal, locate the **Role Badge** indicating `Dean + Adviser`.
2. Click **Switch to Adviser Portal** to immediately manage your personal advising groups, review drafts, and submit feedback.
3. When finished mentoring, click **Switch to Dean Portal** to return to college-level executive oversight.
4. No re-login or separate accounts required.

### 4.3 Manuscript Review, Endorsement & Archival Workflow
1. Navigate to **Publish Queue** (`/dean/publish-queue`) or **Research Records**.
2. Locate manuscripts with the badge `Endorsed by Adviser`.
3. Click on the manuscript row to launch the **Dean Review Modal**.
4. **Inspect All 7 Defense Milestones:**
   - **Manuscript Document:** Read the full PDF within the built-in document viewer.
   - **Approval Sheet:** Verify physical or electronic signatures of the panel members and adviser.
   - **Dataset & Code/URL:** Review supporting source code, links, and collected research datasets.
   - **Video Pitch & User Manual:** Validate the system demonstration and technical documentation.
5. **Take Action:**
   - **Approve & Archive:** Click the green **Approve for Archival** button. Enter optional commendation remarks. The system applies the institutional digital seal, generates the verification certificate, and publishes the paper to the open-access repository.
   - **Request Revision:** Click the amber **Request Revision** button. Type precise feedback detailing what the student group must revise before re-evaluation. The group and adviser receive instant notification.

### 4.4 College Research Records & Catalog Inspection
* Navigate to **Research Records** (`/dean/research-records`).
* Filter papers by Academic Year, Program (e.g., BSIT, BSCS, BSN), or Approval Status.
* Click **Export Catalog** to download an Excel or CSV register of all college research for departmental filing.

### 4.5 Faculty & Adviser Load Oversight
* Navigate to **User Management** (`/dean/user-management`).
* View all research advisers assigned to your college.
* Inspect adviser workload (number of active student groups mentored per faculty member).

### 4.6 Accreditation Reports & Analytics Export
* Navigate to **Reports** (`/dean/research-records`).
* Generate summaries formatted specifically for CHED, PACUCOA, and institutional accreditation bodies.

---

## 5. Research Adviser Operations Manual

### 5.1 Advising Dashboard & Capstone Groups
* Access `/adviser/dashboard` to view your active advisees.
* Click **My Groups** (`/adviser/my-groups`) to inspect all student teams under your mentorship.
* Track individual group progress bars from Proposal $\rightarrow$ Defense $\rightarrow$ Final Milestone Compliance.

### 5.2 Milestone Verification (The 7 Institutional Deliverables)
Under ARCHIVIO institutional policy, advisers must verify all 7 artifacts before endorsing:
1. **Final Manuscript (PDF):** Checked for formatting, completeness, and plagiarism compliance.
2. **Signed Approval Sheet (PDF):** Verified against panel chair signatures.
3. **Dataset Files (CSV/XLSX/ZIP):** Validated for empirical accuracy.
4. **Video Pitch / Demo (MP4/MKV):** Validated functional walkthrough of the system.
5. **System User Manual (PDF/DOCX):** Technical and user operations documentation.
6. **Production Upload URL:** Verified live working link or repository.
7. **Institutional Signature Page:** Confirms compliance with university ethics standards.

### 5.3 Reviewing Submissions & Requesting Revisions
* Navigate to **Review Submissions** (`/adviser/review-submissions`).
* Select a submission to preview documents.
* If updates are needed, write specific instructions and click **Send Revisions**. The group’s progress status reverts to `Revisions Requested`.

### 5.4 Formal Endorsement to the Dean
* When all 7 milestones pass faculty standards, click **Endorse to Dean**.
* Enter formal endorsement remarks.
* The paper is elevated to the Dean’s **Publish Queue**, and the students are notified that their paper has received faculty clearance.

---

## 6. Student Researcher Operations Manual

### 6.1 Account Creation & Team Registration
1. Access the login screen and click **Create Student Account**.
2. Register using your PHINMA Education email.
3. Upon entering `/student/dashboard`, create your **Research Group**:
   - Enter your Capstone / Research Project Title.
   - Add group member names, student IDs, and assigned roles.
   - Select your College and Degree Program.

### 6.2 Adviser Selection
1. In the **Group Setup** tab, select your designated faculty adviser from the institutional directory.
2. An automated invitation and pairing request will be sent to the adviser’s portal.

### 6.3 Uploading Defense Milestones
1. Navigate to **Milestones / Requirements** (`/student/requirements`).
2. Upload each of the 7 required deliverables into its designated slot:
   - File formats accepted: `.pdf` for documents, `.zip`/`.xlsx`/`.csv` for datasets, `.mp4`/`.mkv` for videos.
   - Max file size: 50 MB per file (or external URL for large video drives).
3. Confirm institutional ethics and plagiarism statements by checking the certification box.
4. Click **Submit for Adviser Review**.

### 6.4 Tracking Review Progress
Monitor the real-time status banner on your dashboard:
* 🟡 **Under Adviser Review:** Your mentor is evaluating your files.
* 🟠 **Revisions Requested:** Click to view remarks, replace files, and re-submit.
* 🔵 **Endorsed to Dean:** Passed adviser review; awaiting Dean’s institutional seal.
* 🟢 **Archived & Published:** Officially completed and archived!

### 6.5 Generating the Official Certificate of Archival
1. Once your project reaches **Archived & Published** status, a green **Download Archival Certificate** button appears.
2. Click to download your high-resolution, tamper-proof **Certificate of Archival**.
3. The certificate includes:
   - Project Title & Author Names
   - College & Degree Program
   - Date of Archival & Academic Year
   - Dean and Adviser digital signatures
   - Official Institutional QR Code linking directly to the verification page.

---

## 7. System Administrator Operations Manual

### 7.1 User Management & Role Lifecycle (`/admin/user-management`)
* **Add New Dean / Faculty:** Click **Add User**, enter name, institutional email, college, and role (`Dean`, `Dean + Adviser`, or `Adviser`).
* **Manage Dual Roles:** Administrators can upgrade any Dean to a dual role (`Dean + Adviser`) with a single click. The system provisions dual records and maintains unified activation.
* **Account Deactivation / Re-activation:** Temporarily toggle account access without deleting historical research links.
* **Permanent User Deletion:** Secure hard wipe removing orphaned credentials while preserving institutional research ownership.

### 7.2 Storage Management & Cloud Governance (`/admin/settings`)
* **Storage Meter & Telemetry:** Monitors live cloud storage utilization (e.g., `1.3% Used — 390.4 MB of 30 GB capacity`).
* **Requirement Governance:** Admins can temporarily pause or re-enable file uploads for specific milestone categories.
* **Academic Year Management:** Switch the active academic school year (e.g., `SY 2026-2027`) to partition research archives cleanly.

### 7.3 Institutional Reporting & Executive PDF Export (`/admin/reports`)
1. Navigate to **Reports**.
2. Select target Academic Year, College, or Status.
3. Click **Export to PDF**.
4. The system renders an institutional report:
   - Official University header and maroon emblem.
   - Summary metric cards (Total Submissions, Approval Rate, Active Programs).
   - Departmental breakdown table with alternating zebra rows.
   - Formal signature blocks for **Prepared by (System Admin)** and **Approved by (College Dean)**.

### 7.4 System Audit Trails & Activity Logging (`/admin/activity-logs`)
* Real-time ledger recording every login, upload, endorsement, approval, and administrative action.
* Searchable by user email, action keyword, date range, or IP address.

---

## 8. Public Open-Access Archive & Verification Engine

### 8.1 Public Research Discovery (`/`)
The Public Archive is accessible without logging in at `https://archivio-public.web.app/`:
* **Universal Search Bar:** Instant keyword search across paper titles, abstracts, authors, and categories.
* **Department Filter:** Browse by College (e.g., College of IT, College of Nursing).
* **School Year Filter:** Filter published works by academic batch.

### 8.2 Interactive Document Viewer & Citation Engine
* Click on any published research paper card to launch the **Archive Paper Viewer**:
  - Full-screen distraction-free reader with zoom, page jump, and text search.
  - Read abstract, keywords, authors, and adviser details.
* **Automatic Citation Generator:** Click **Cite This Paper** to copy citations instantly in:
  - **APA 7th Edition**
  - **MLA 9th Edition**
  - **IEEE Style**
  - **Chicago Author-Date**

### 8.3 QR Code & Digital Certificate Verification (`/verify/:id`)
* Anyone scanning the QR code on a student’s printed Certificate of Archival is directed to the public verification endpoint.
* Displays verified confirmation directly from Cloud Firestore:
  - Authentic University Seal
  - Verification Status: `AUTHENTIC & RECORDED`
  - Canonical Research Title, Authors, College, and Timestamp of Archival.

---

## 9. Troubleshooting & Frequently Asked Questions (FAQ)

### Q1: A Dean is unable to log in with temporary credentials.
* **Solution:** Verify that the Dean is using the exact institutional email registered in User Management. Check if the link has expired; the Administrator can resend an invitation with a fresh temporary password directly from User Management.

### Q2: How does a Dean switch between reviewing faculty papers and mentoring their own students?
* **Solution:** If the Dean has been assigned the `Dean + Adviser` dual role, look at the top header bar and click **Switch to Adviser Portal** (or **Switch to Dean Portal**). Both dashboards are linked to the same login.

### Q3: What happens if a student uploads an incorrect file?
* **Solution:** As long as the paper has not yet received Dean approval, the Research Adviser or Dean can click **Request Revisions**, which unlocks the upload slots for the student to upload corrected files.

### Q4: Are uploaded files secure and protected from unauthorized alteration?
* **Solution:** Yes. All research documents are stored on Google Cloud Storage with strict security rules. Once approved by the Dean, the manuscript record is locked and immutable.

### Q5: Can the Public Archive be scraped by malicious bots?
* **Solution:** ARCHIVIO enforces Google reCAPTCHA v2 and rate-limiting headers across public endpoints to safeguard institutional intellectual property.

---

## 10. Institutional Approval & Sign-Off Sheet

This User Manual has been reviewed and officially adopted as the Standard Operating Procedure for research defense and digital archiving.

<br />

```
Reviewed and Verified by:


________________________________________              ________________________________________
DR. ANDREA PEROTE                                    PROF. JERIKA ZAMORAS
Dean, College of Nursing                             Dean, College of Information Technology
South-Western University PHINMA                      South-Western University PHINMA

Date: _________________________________              Date: _________________________________



Approved by:


________________________________________              ________________________________________
SYSTEM ADMINISTRATOR                                 VICE PRESIDENT FOR ACADEMIC AFFAIRS
ARCHIVIO Institutional Governance                    South-Western University PHINMA

Date: _________________________________              Date: _________________________________
```

---
*ARCHIVIO Institutional Research System © 2026. All Rights Reserved. South-Western University PHINMA.*
