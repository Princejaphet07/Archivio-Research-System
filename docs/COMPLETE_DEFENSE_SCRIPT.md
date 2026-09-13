# 🎓 ARCHIVIO: The Complete Institutional Defense Script & Demonstration Manual
**Southwestern University PHINMA — College of Information Technology**  
*BSIT Capstone Project — Research Archival & Management System*  
*Authors: Prince Japhet Vender (Lead Programmer), Jerika Zamoras (UI/UX Designer), Hylla Mae Tejada (Project Manager), Andrea Cañete Perote (Assistant Programmer)*

---

## 📌 Talaan sa mga Bahin (Table of Contents)
1. [🎤 Opening Statement & System Overview](#1-opening-statement--system-overview)
2. [👑 Super Admin Portal Walkthrough Script](#2-super-admin-portal-walkthrough-script)
3. [🏛️ Admin Portal Walkthrough Script](#3-admin-portal-walkthrough-script)
4. [🎓 Dean Portal Walkthrough Script](#4-dean-portal-walkthrough-script)
5. [👨‍🏫 Faculty Adviser Portal Walkthrough Script](#5-faculty-adviser-portal-walkthrough-script)
6. [👨‍🎓 Student Proponent Portal Walkthrough Script](#6-student-proponent-portal-walkthrough-script)
7. [🌐 Public Research Archive (Discovery Platform) Script](#7-public-research-archive-discovery-platform-script)
8. [🧠 AI Microservice & Backend Architecture Script](#8-ai-microservice--backend-architecture-script)
9. [🛡️ System Security & Data Privacy Architecture (Security Defense Guide)](#9-system-security--data-privacy-architecture-security-defense-guide)
10. [🎯 Top 12 Defense Questions & Winning Answers (Cheatsheet)](#10-top-12-defense-questions--winning-answers-cheatsheet)
11. [🏆 Powerful Closing Statement](#11-powerful-closing-statement)

---

## 1. 🎤 Opening Statement & System Overview
> **Kinsa ang mosulti:** Lead Presenter / Lead Programmer (Prince Japhet Vender)  
> **Gitas-on:** 2-3 ka minutos  
> **Tono:** Kumpyansa, pormal, ug klaro.

### 🎙️ English / Taglish Speech:
> *"Good morning, esteemed members of the panel, our research coordinator, and guests. We are honored to present our Capstone Project entitled **ARCHIVIO: An Institutional Digital Research Archiving and Management System for Southwestern University PHINMA**.*
>
> *For years, universities have faced critical challenges in managing thesis manuscripts: papers stored physically in filing cabinets get lost, student-adviser review cycles are delayed by paper-based revisions, and there is no centralized, tamper-proof repository for institutional memory. Furthermore, once physical certificates are issued, verifying their authenticity requires manual library searches.*
>
> *ARCHIVIO solves this through an end-to-end cloud ecosystem built on Google Cloud Firebase and a resilient AI Microservice. It bridges **Super Admins, College Admins, the Dean's Office, Research Advisers, Student Proponents, and Public Researchers** into a single, cohesive, role-based workflow.*
>
> *Allow us to demonstrate how ARCHIVIO orchestrates the entire academic research lifecycle from initial group submission to Dean sign-off, anti-forgery verification, and public discovery."*

---

## 2. 👑 Super Admin Portal Walkthrough Script
> **Tumong:** Ipakita ang kinatibuk-ang pagdumala sa sistema, mga global settings, audit logs, ug system health.

### 🎬 Action on Screen:
1. Log in gamit ang Super Admin credentials.
2. Ipakita ang **Super Admin Dashboard**.
3. I-open ang **Audit & Activity Logs** ug **System Settings**.

### 🎙️ What to Say (Script):
> *"We begin with the highest administrative authority: the **Super Admin Portal**.*
>
> *As you can see on the dashboard, the Super Admin has global oversight across all colleges in Southwestern University PHINMA. This includes:*
> 1. *Overall metrics of active users, published papers, and pending reviews.*
> 2. *Managing Administrative personnel: assigning College Admins, Deans, and verifying institutional privileges.*
> 3. *The **System Audit Trail & Activity Logs**: Every critical action—from user logins to file uploads and status changes—is immutably recorded with timestamps and user UIDs, ensuring compliance with institutional accountability and security.*
> 4. *Global Configuration: The Super Admin controls university-wide parameters without altering codebase infrastructure."*

---

## 3. 🏛️ Admin Portal Walkthrough Script
> **Tumong:** Ipakita kon giunsa pag-organisa ang mga departamento, programs, research categories, ug institutional reports.

### 🎬 Action on Screen:
1. Navigate sa **Departments & Programs**.
2. I-show ang **User Management** (Advisers & Students).
3. I-open ang **Reports & Analytics**.

### 🎙️ What to Say (Script):
> *"Next is the **College Admin Portal**, tailored for academic management.*
>
> *Here, the College Admin manages:*
> 1. ***Departmental Architecture:** Seamlessly organizing programs under the College of Information Technology and other university units.*
> 2. ***Faculty & Student Roster:** Provisioning user roles, issuing invitation tokens, and ensuring students are officially mapped to their respective curriculum batches.*
> 3. ***Research Categories:** Standardizing research classifications such as Machine Learning, Internet of Things, Health Informatics, and Web Development.*
> 4. ***Comprehensive Reporting:** The Admin can instantly export accreditation-ready reports, tracking published research counts, adviser workloads, and annual student submission rates."*

---

## 4. 🎓 Dean Portal Walkthrough Script
> **Tumong:** Ipakita ang kinapungkayan sa academic review — ang Publish Queue, Dean's clearance, electronic sign-off, ug archiving certification.

### 🎬 Action on Screen:
1. Log in isip Dean.
2. I-open ang **Publish Queue**.
3. I-click ang usa ka submission nga na-endorse na sa Adviser.
4. Ipakita ang Dean Review Modal, i-click ang **Approve & Publish**, ug i-preview ang **Archival Certificate**.

### 🎙️ What to Say (Script):
> *"Now, we arrive at the executive authority of the college: the **Dean Portal**.*
>
> *The Dean acts as the final gatekeeper of institutional research quality.*
> 1. ***The Publish Queue:** Only papers that have received 100% endorsement from the designated Research Adviser enter this queue.*
> 2. ***Executive Review:** The Dean examines the adviser's endorsement remarks, verifies compliance with institutional formatting standards, and confirms ethics clearances.*
> 3. ***Formal Archival Sign-off:** With a single click on 'Approve & Publish', the system automatically:*
>    - *Generates a unique institutional control number: the **Reference ID** (e.g., `ARCH-SWU-XXXXXX`).*
>    - *Digitally stamps the record with the Dean's authentication signature.*
>    - *Triggers an automated email notification to the student proponents.*
>    - *Instantly indexes the manuscript into the **Public Research Archive**.*
> 4. *The Dean can also inspect the official parchment **Certificate of Archiving** generated for academic accreditation."*

---

## 5. 👨‍🏫 Faculty Adviser Portal Walkthrough Script
> **Tumong:** Ipakita ang pag-evaluate, chapter-by-chapter feedback, line-by-line review, ug digital endorsement.

### 🎬 Action on Screen:
1. Log in isip Faculty Adviser.
2. Ablihi ang **Review Submissions** dashboard.
3. I-open ang usa ka pending student paper.
4. Ipakita ang chapter status (Introduction to Conclusion), paghatag og feedback comment, ug pag-click sa **Endorse to Dean**.

### 🎙️ What to Say (Script):
> *"Here is the **Faculty Adviser Portal**, the academic engine of ARCHIVIO.*
>
> *Previously, advisers had to print thick reams of paper, mark red inks by hand, and risk manuscripts getting misplaced.*
> 1. ***Interactive Manuscript Review:** The adviser reviews student submissions online with access to the full document viewer.*
> 2. ***Chapter-by-Chapter Milestones:** The adviser evaluates each chapter—from Chapter 1 Introduction down to Chapter 5 Recommendations—updating their status as 'Approved' or 'Needs Revision'.*
> 3. ***Real-time Feedback Loop:** When the adviser leaves review notes, the students receive real-time notifications, accelerating the turnaround time for thesis revisions.*
> 4. ***Digital Endorsement:** Once all revisions are satisfied, the Adviser signs off digitally, endorsing the manuscript directly to the Dean's Publish Queue."*

---

## 6. 👨‍🎓 Student Proponent Portal Walkthrough Script
> **Tumong:** Ipakita ang student journey gikan sa group registration, upload, milestone tracking, hangtod sa pag-claim sa Archival Certificate para sa graduation clearance.

### 🎬 Action on Screen:
1. Log in isip Student.
2. I-show ang **Progress Page** nga may milestone timeline.
3. Ipakita ang **Submit / Manuscript Upload** form.
4. I-click ang **View / Print Certificate** button aron ipakita ang nindot nga parchment certificate nga naay complete QR code.

### 🎙️ What to Say (Script):
> *"Next is the **Student Proponent Portal**, crafted with an intuitive, student-centric interface.*
>
> 1. ***Research Group Collaboration:** Students can register their research group, designate co-authors, and select their assigned adviser.*
> 2. ***Milestone Progress Tracker:** Instead of being in the dark, students see a visual step-by-step pipeline: Submission → Adviser Review → Revision Needed → Adviser Endorsed → Dean Approval → Officially Cataloged.*
> 3. ***Manuscript Upload:** Uploading the final PDF manuscript automatically captures document metadata, abstracts, and proponent details.*
> 4. ***Official Certificate of Archiving:** Once approved by the Dean, students can generate and print their official Archival Certificate. This certificate features:*
>    - *Authentic SWU PHINMA seal and parchment layout.*
>    - *Dean & Adviser electronic sign-offs.*
>    - *A dynamic **Cryptographic QR Code** printed cleanly at the bottom.*
>    - *This serves as the student's official **Graduation Clearance Document** for hardbound thesis submission to the University Library."*

---

## 7. 🌐 Public Research Archive (Discovery Platform) Script
> **Tumong:** Ipakita ang public-facing web app (PWA), search, filtering, modern viewer features (Audio TTS, Dictionary, Citation), ug ang bag-ong **Verified Institutional Ledger**.

### 🎬 Action on Screen:
1. Open ang Public Archive (`/` ug `/browse`).
2. Pag-search og keyword o pag-filter gamit ang categories ug departments.
3. Ablihi ang usa ka research paper sa **Archive Paper Viewer**:
   - I-play ang **Audio Abstract (Text-to-Speech)**.
   - I-double click ang usa ka pulong sa abstract aron mogawas ang **Dictionary Popup**.
   - Ipakita ang **Citation Exporter** (APA, MLA, Chicago).
   - I-click ang sleek **`Verified Record | Verify ›`** badge sa header.
4. Mo-load ang **Institutional Verification Ledger** (`/verify/:id`):
   - I-highlight ang Dean sign-off, Adviser endorsement, Ref Code, ug ang security notice.
   - I-emphasize nga **gikuha ang certificate download sa public** para dili ma-tamper o ma-forge.

### 🎙️ What to Say (Script):
> *"Now we present the flagship public face of our university: the **ARCHIVIO Public Discovery Archive**.*
>
> *This is a **Progressive Web App (PWA)** that can be installed on any device with offline caching support.*
>
> 1. ***Discovery & Intelligent Filtering:** Public researchers, students, and foreign academics can explore the repository filtered by Department, College, Year, or Category.*
> 2. ***State-of-the-Art Manuscript Viewer:** Designed with robust academic integrity:*
>    - *🎧 **Text-to-Speech Abstract Reader:** Built using the native Web Speech API, allowing users to listen to research abstracts hands-free.*
>    - *📖 **Interactive In-Viewer Dictionary:** Double-clicking any technical academic word immediately opens a contextual lexicon popup.*
>    - *📑 **Instant Multi-Format Citation:** Generates ready-to-use citations in APA, MLA, Chicago, Harvard, and BibTeX.*
> 3. ***Tamper-Proof Institutional Verification Ledger:** Look at this sleek 'Verified Record' badge.*
>    - *When clicked, it opens the **Official Institutional Verification Ledger**.*
>    - *It provides an authentic audit trail: Dean approval timestamp, Adviser digital authentication, and the unique Reference ID.*
>    - *Crucially, **we strictly restricted the printable certificate to authenticated students and faculty**. Anonymous visitors can verify authenticity via the ledger, but cannot download or forge the student's physical credential—fully complying with university credential security and the Data Privacy Act."*

---

## 8. 🧠 AI Microservice & Backend Architecture Script
> **Tumong:** I-explain ang backend engineering, Google Cloud Firebase, ug ang resilient multi-model AI failover sa Render.

### 🎬 Action on Screen:
1. Ipakita ang **Homepage Chatbot** sa Public Archive.
2. Pangutan-a ang chatbot: *"What is this research about?"* o *"Who programmed ARCHIVIO?"*
3. Ipakita ang paspas nga intelligent reply sa AI.

### 🎙️ What to Say (Script):
> *"Under the hood, ARCHIVIO is powered by an enterprise cloud architecture:*
>
> 1. ***Google Cloud Firebase:** Serves as our primary data foundation:*
>    - *Cloud Firestore: Delivers sub-second real-time data sync across all roles.*
>    - *Firebase Authentication: Enforces strict Role-Based Access Control (RBAC).*
>    - *Firebase Cloud Storage: Securely hosts and delivers PDF manuscripts via Google CDN.*
> 2. ***Resilient AI & Notification Microservice:** Hosted on Render:*
>    - *Instead of relying on a single AI model, our backend implements a **Multi-Model Cascading Architecture**.*
>    - *It prioritizes high-speed **Google Gemini Flash**, and in the event of rate limits or network congestion, it seamlessly cascades to **Groq SDK** as an automatic failover.*
>    - *This powers our interactive research assistant, automated abstract summarization, and transactional email notification delivery."*

---

## 9. 🛡️ System Security & Data Privacy Architecture (Security Defense Guide)
> **Tumong:** Kompleto ug lig-on nga giya kon pangutan-on sa Panel bahin sa **Security, Hacking Prevention, Anti-Forgery, ug Data Privacy Compliance**.

### 🏛️ Ang 7 ka Haligi sa ARCHIVIO Security (The 7 Pillars):

#### 1. 🔐 Role-Based Access Control (RBAC) & Principle of Least Privilege
* **Unsay pasabot:** Ang matag user naay estrikto nga utlanan sa ilang mahimo:
  - **Student:** Makatan-aw ug maka-edit lang sa ilang kaugalingong group submission.
  - **Adviser:** Makabasa ug maka-review lang sa mga papers nga gi-assign sa ilaha; dili sila maka-publish sa archive.
  - **Dean:** Ang bugtong authorized person nga maka-click og "Approve & Publish" ug mo-isyu og official Reference ID.
  - **Public Visitors:** View-only access sa approved metadata; walay write o delete permissions.

#### 2. 🛡️ Database-Level Security Rules (Firestore Rules)
* **Pang-Defense Explanation:**
  > *"Dili lang sa Frontend namo gipanalipdan ang system. Sa backend, ang among **Cloud Firestore Security Rules** nag-validate sa matag request. Pananglitan: Bisan kon ang usa ka estudyante mogamit og Developer Tools sa browser aron usbon ang iyang status gikan sa 'pending' ngadto sa 'published', ang Firebase server-side rules **awtomatikong mo-block ug mo-reject sa request** tungod kay ang Dean UID ra ang naay write permission sa status field."*

#### 3. 📜 Anti-Forgery & Credential Protection
* **Pang-Defense Explanation:**
  > *"Aron masiguro ang katinuod sa **Certificate of Archiving**:*
  > 1. *Matag papel nagdala og talagsaon nga **Reference ID (`ARCH-SWU-XXXXXX`)**.*
  > 2. *Ang QR Code naka-link sa among live **Institutional Verification Ledger** (`/verify/:id`) nga nagpakita sa exact Dean ug Adviser electronic approval timestamps.*
  > 3. *Aron malikayan ang peke nga kopya o tampering, **among gi-restrict ang pag-download sa official certificate ngadto lamang sa authenticated student proponents ug faculty**. Ang public makakita lamang sa resibo sa ledger, apan dili maka-download sa physical clearance document sa estudyante."*

#### 4. 🇵🇭 Data Privacy Act of 2012 (Republic Act 10173) Compliance
* **Pang-Defense Explanation:**
  > *"Ang ARCHIVIO 100% compliant sa Data Privacy Act ubos sa mga prinsipyo sa **Transparency, Legitimate Purpose, ug Proportionality**:*
  > - *Ang Public Archive nagpakita lamang sa **Scholarly Academic Metadata** (Research Title, Author Names, Abstract, Department, ug Year).*
  > - *Ang mga personal ug sensitibong impormasyon—sama sa student mobile numbers, personal emails, student ID numbers, ug unapproved draft remarks—kay **estriktorong gitagoan ug dili ma-access sa public API**."*

#### 5. 🔒 Anti-Scraping & Intellectual Property (IP) Defense
* **Pang-Defense Explanation:**
  > *"Gipanalipdan ang intellectual property sa mga estudyante pinaagi sa among **Secure Canvas-based Viewer**. Ang PDF renderer nag-convert sa mga panid ngadto sa canvas elements nga protektado sa view-only security layers, nga nagpugong sa automatic bot scraping sa tibuok manuscript."*

#### 6. 🔑 Secret Management & Environment Isolation
* **Pang-Defense Explanation:**
  > *"Walay bisan unsang sensitive API keys o Firebase Admin Private Service Account keys nga na-expose sa public frontend code. Ang tanang email credentials ug backend admin tokens naka-encrypt sulod sa secure server environment variables sa Render ug gitagoan gikan sa git pinaagi sa among `.gitignore`."*

#### 7. 🌐 Network & API Resilience (CORS & Rate Limiting)
* **Pang-Defense Explanation:**
  > *"Ang among Express AI microservice gipanalipdan sa **Cross-Origin Resource Sharing (CORS)** whitelist aron ang among verified domains lamang ang maka-send og requests, samtang ang **Rate Limiting** nagpugong sa Denial of Service (DoS) o bot abuse."*

---

## 10. 🛡️ Top 12 Defense Questions & Winning Answers (Cheatsheet)

### Q1: "Nganong dili na lang mo mogamit og Google Drive o Google Forms para sa thesis submission?"
> **Tubag:**
> *"Google Drive is merely an unmanaged file storage folder. It lacks academic milestone tracking, cannot enforce Chapter-by-Chapter adviser approvals, does not have automated Dean publish queues, cannot generate cryptographically verifiable Archival Certificates with QR codes, and does not provide an interactive public discovery viewer with citations and audio abstract readers. ARCHIVIO is a dedicated Academic Enterprise System, not just a storage drive."*

### Q2: "Unsaon ninyo paglikay sa certificate forgery o peke nga certificates?"
> **Tubag:**
> *"First, every certificate generates a **Unique Reference ID (`ARCH-SWU-XXXXXX`)** and a **Dynamic QR Code**. Second, when that QR code is scanned, it points to our server-verified **Institutional Ledger** which displays the cryptographic approval timestamp of the Dean and Adviser. Third, public visitors cannot download or modify the certificates; only authenticated proponents and faculty have certificate clearance."*

### Q3: "Unsaon pagpanalipod sa Intellectual Property (IP) sa mga estudyante aron dili ma-scrape o kawaton ang ilang research?"
> **Tubag:**
> *"Our Public Viewer implements **View-Only Access Controls**. The PDF renderer uses HTML5 Canvas rendering protected against direct file scraping, while full manuscripts are restricted to verified academic users. Furthermore, public users only see the verified metadata and abstract unless granted authenticated permissions by the university."*

### Q4: "Nganong Firebase inyong gigamit kaysa traditional MySQL / PHP?"
> **Tubag:**
> *"Firebase provides **Real-Time Data Synchronization**, meaning when an Adviser posts a revision or the Dean approves a paper, the student's dashboard updates immediately without manual browser refreshes. Additionally, Firebase provides **Offline Persistence**, serverless auto-scaling, Google-grade encryption at rest and in transit, and eliminates local database server maintenance."*

### Q5: "Unsay mahitabo kon ma-down o ma-rate limit ang Gemini AI API?"
> **Tubag:**
> *"Our AI microservice is architected with a **Resilient Multi-Model Failover Gateway**. If the primary Gemini model experiences quota limits or throttling, the backend automatically cascades through secondary flash models and seamlessly switches to the ultra-fast **Groq API** as a backup. This ensures 99.9% uptime for our AI chatbot and research assistance."*

### Q6: "Unsa ang gibuhat ninyo aron mosunod sa Data Privacy Act of 2012 (RA 10173)?"
> **Tubag:**
> *"We enforce strict **Role-Based Access Control (RBAC)**. Students can only view and edit their assigned group submissions. Sensitive faculty credentials and Dean private signatures are secured in server-side environment variables. Public users cannot view student personal contact numbers or unapproved manuscripts."*

### Q7: "Unsay buhaton kon hinay o maputol ang internet sa school samtang nagbasa ang estudyante?"
> **Tubag:**
> *"ARCHIVIO is built as a **Progressive Web App (PWA)** with a service worker and **Firestore IndexedDB local caching**. Previously loaded research abstracts and dashboard data remain cached in the browser storage, allowing students to continue reading even during temporary network interruptions."*

### Q8: "Unsa ang papel sa Reference Code (`ARCH-SWU-XXXXXX`)?"
> **Tubag:**
> *"It functions exactly like an institutional **DOI (Digital Object Identifier)** or **ISBN**. It provides a standardized university cataloging index used by the library for physical hardbound cross-referencing and accreditation auditing."*

### Q9: "Kinsa man ang tag-iya sa system kon ma-deploy na kini sa tibuok unibersidad?"
> **Tubag:**
> *"The institutional rights and administrative ownership belong to **Southwestern University PHINMA**, administered through the College of Information Technology and the Office of the Dean, with full administrative delegation via the Super Admin portal."*

### Q10: "Unsay inyong Future Works o plano para sa Version 2.0?"
> **Tubag:**
> *"For Version 2.0, we plan to integrate automated **Plagiarism & Similarity Index Checking** directly into the upload pipeline, integrate university RFID student ID scanning at the library kiosk, and deploy native mobile apps via Android & iOS bundles."*

### Q11: "Unsaon pagsiguro nga dili ma-edit sa student ang submission status o grado sa Firestore?"
> **Tubag:**
> *"Through **Cloud Firestore Security Rules**. In our `firestore.rules`, permissions are strictly enforced on the database server. Even if a user executes custom JavaScript code from their browser console, Firestore validates whether `request.auth.token.role == 'dean'`. If an unauthorized student attempts to modify the `reviewStatus` or `publishedAt` fields, the database rejects the write operation at the protocol level."*

### Q12: "Unsay panalipod ninyo batok sa SQL Injection ug Cross-Site Scripting (XSS)?"
> **Tubag:**
> *"First, because we utilize Google Cloud Firestore, it is a NoSQL document store that does not concatenate raw SQL strings, effectively eliminating traditional SQL Injection vulnerabilities. Second, against XSS, React automatically sanitizes and escapes all user-supplied variables before rendering into the DOM. Furthermore, inputs are strictly type-checked and validated both client-side and on our Node.js microservice."*

---

## 11. 🎯 Powerful Closing Statement
> **Kinsa ang mosulti:** Lead Programmer / Team Representative  
> **Gitas-on:** 1 ka minuto  

### 🎙️ Closing Speech:
> *"Distinguished panelists, ARCHIVIO is not just a concept—it is a production-ready, fully deployed, secure, and intelligent institutional ecosystem. It honors the intellectual hard work of student researchers, streamlines the academic workflow of our dedicated advisers, and elevates the prestige and research footprint of **Southwestern University PHINMA**.*
>
> *We are now open and eager to answer your questions and hear your valuable insights to further enrich this project. Thank you very much!"*
