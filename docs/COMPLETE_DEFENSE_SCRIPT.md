# 🎓 ARCHIVIO: The Complete Institutional Defense Script & Demonstration Manual
**Southwestern University PHINMA — College of Information Technology**  
*BSIT Capstone Project — Research Archival & Management System*  
*Authors: Prince Japhet Vender (Lead Programmer), Jerika Zamoras (UI/UX Designer), Hylla Mae Tejada (Project Manager), Andrea Cañete Perote (Assistant Programmer)*

---

## 📌 Talaan sa mga Bahin (Table of Contents)
1. [🎤 1. Opening Statement & Rationale (Pasiuna)](#1--opening-statement--rationale-pasiuna)
2. [👑 2. Super Admin Portal Walkthrough](#2--super-admin-portal-walkthrough)
3. [🏛️ 3. College Admin Portal Walkthrough](#3--college-admin-portal-walkthrough)
4. [🎓 4. Dean Portal Walkthrough (Publish Queue & Approval)](#4--dean-portal-walkthrough-publish-queue--approval)
5. [👨‍🏫 5. Faculty Adviser Portal Walkthrough (Review & Endorsement)](#5--faculty-adviser-portal-walkthrough-review--endorsement)
6. [👨‍🎓 6. Student Proponent Portal Walkthrough (Milestones & Certificate)](#6--student-proponent-portal-walkthrough-milestones--certificate)
7. [🌐 7. Public Research Archive (The Discovery Platform)](#7--public-research-archive-the-discovery-platform)
8. [🧠 8. AI Microservice & Backend Cloud Architecture](#8--ai-microservice--backend-cloud-architecture)
9. [🛡️ 9. System Security & Data Privacy Architecture (The 7 Pillars)](#9--system-security--data-privacy-architecture-the-7-pillars)
10. [🎯 10. Top 12 Defense Questions & Winning Answers (Cheatsheet)](#10--top-12-defense-questions--winning-answers-cheatsheet)
11. [🏆 11. Powerful Closing Statement (Panapos)](#11--powerful-closing-statement-panapos)

---

## 1. 🎤 Opening Statement & Rationale (Pasiuna)
> **Kinsa ang mosulti:** Lead Presenter / Lead Programmer (Prince Japhet Vender)  
> **Gitas-on:** 2-3 ka minutos  
> **Tono:** Kumpyansa, pormal pero natural nga Bisaya-English (Bislish).

### 🎬 Action on Screen:
* I-project ang Landing Page sa ARCHIVIO nga may hapsay nga Maroon & Gold SWU branding.

### 🎙️ Unsay Isulti (Script):
> *"Good morning esteemed members of the panel, our dean, research coordinator, and fellow students. We are proud to present our Capstone Project entitled **ARCHIVIO: An Institutional Digital Research Archiving and Management System for Southwestern University PHINMA**.*
>
> *Sa dugay na nga panahon, ang atong university nag-atubang og dakong hagit sa traditional thesis management:*
> 1. *Ang mga physical hardbound copies matambak lang sa filing cabinets o library shelves, diin dali kining ma-abog, madaot, o mawala.*
> 2. *Ang submission ug review process tali sa estudyante ug adviser kay manual ug hasol kaayo tungod sa balik-balik nga print sa papel.*
> 3. *Ug pinaka-importante: walay centralized ug tamper-proof system aron ma-verify dayon kon lehitimo ba gayod ang usa ka thesis certificate o research paper.*
>
> *Mao kini ang hinungdan ngano among gitukod ang **ARCHIVIO**. Kini usa ka full-stack, cloud-based academic ecosystem built on Google Cloud Firebase and a dedicated AI Microservice. Gi-connect niini ang unom (6) ka core roles:*
> - *Super Admin, College Admin, Dean, Faculty Advisers, Student Proponents, ug ang Public Researchers.*
>
> *Karon, tugoti kami nga i-demonstrate kon giunsa paglihok sa tibuok research lifecycle gikan sa pag-upload sa estudyante, pag-review sa adviser, pag-apruba sa Dean, hangtod sa public discovery ug anti-forgery verification."*

---

## 2. 👑 Super Admin Portal Walkthrough
> **Tumong:** Ipakita ang global governance, management sa mga admins, ug ang immutable audit logs.

### 🎬 Action on Screen:
1. Log in gamit ang Super Admin credentials.
2. Ipakita ang **Super Admin Dashboard** nga naay university-wide analytics.
3. Ablihi ang **Audit & Activity Logs** ug **System Settings**.

### 🎙️ Unsay Isulti (Script):
> *"Magsugod kita sa pinakataas nga administrative authority: ang **Super Admin Portal**.*
>
> *Diri sa Super Admin Dashboard, makita nato ang global overview sa tibuok university across different colleges. Ang Super Admin maoy nagkupot sa mga vital institutional functions:*
> 1. ***Admin & Dean Provisioning:** Ang Super Admin ra ang naay katungod mag-assign o mag-verify sa mga College Admins ug Deans aron masiguro nga verified faculty members lang ang makadumala sa sistema.*
> 2. ***System-Wide Activity & Audit Logs:** Kini ang usa sa among pinaka-importanteng security features. Matag lihok sa sistema—login man, pag-upload og manuscript, o pag-usab sa approval status—awtomatikong ma-record sa atong audit trail uban ang exact timestamp ug User UID. Walay bisan kinsa nga maka-usab o maka-delete niini, ensuring full institutional accountability.*
> 3. ***Global University Settings:** Diri ma-manage ang system parameters ug maintenance controls nga dili na kinahanglan mag-usab sa source code."*

---

## 3. 🏛️ College Admin Portal Walkthrough
> **Tumong:** Ipakita ang academic department management, user accounts (advisers & students), ug reports.

### 🎬 Action on Screen:
1. I-switch sa **Admin Portal**.
2. Ipakita ang **Departments & Programs** (College of Information Technology).
3. Ipakita ang **User Management** (Adviser invitations & Student roster).
4. Ablihi ang **Reports & Analytics**.

### 🎙️ Unsay Isulti (Script):
> *"Sunod nato mao ang **College Admin Portal**, nga gi-design para sa adlaw-adlaw nga academic coordination.*
>
> *Ang College Admin maoy nagdumala sa:*
> 1. ***Departmental Architecture:** Pwede sila magdugang o mag-configure sa departments sama sa BSIT, Computer Science, o ubang programs ubos sa university.*
> 2. ***Faculty & Student Roster:** Diri ginadumala ang registration sa mga research advisers ug student groups pinaagi sa secure invitation links ug school email verification.*
> 3. ***Research Categories:** Ginaklasipikar diri ang mga research areas—pananglitan: Machine Learning, IoT, Mobile Development, ug Health Informatics—aron organisado ang archival tags.*
> 4. ***Institutional Reporting:** Sa usa lang ka click, ang Admin makahimo og comprehensive reports nga andam gamiton para sa **CHED ug PACUCOA accreditation**, sama sa ihap sa na-publish nga research matag tuig ug adviser workload distribution."*

---

## 4. 🎓 Dean Portal Walkthrough (Publish Queue & Approval)
> **Tumong:** Ipakita ang final executive clearance, electronic approval, ug automated cataloging.

### 🎬 Action on Screen:
1. Log in gamit ang Dean account.
2. Ablihi ang **Publish Queue**.
3. I-select ang usa ka submission nga na-endorse na sa Adviser.
4. Ipakita ang Dean Review Modal, i-click ang **Approve & Publish**, ug i-preview ang **Archival Certificate**.

### 🎙️ Unsay Isulti (Script):
> *"Karon, ania kita sa kinatas-ang academic gatekeeper sa college: ang **Dean Portal**.*
>
> *Dili basta-basta ma-publish ang usa ka research paper. Moagi una kini sa **Publish Queue** sa Dean.*
> 1. ***Endorsed Manuscripts Only:** Ang makasulod ra sa Publish Queue mao kadtong mga papel nga 100% endorsed na sa ilahang designated Research Adviser.*
> 2. ***Dean's Final Review:** Basahon ug susihon sa Dean ang endorsement remarks sa adviser, research format compliance, ug ethics approvals.*
> 3. ***Electronic Archival Sign-off:** Sa higayon nga i-click sa Dean ang 'Approve & Publish', tulo ka mahinungdanong butang ang awtomatikong mahitabo sa background:*
>    - *Una: Mo-generate ang sistema og unique **Reference ID** (e.g., `ARCH-SWU-XXXXXX`), nga nagsilbing official institutional DOI o catalog number.*
>    - *Ikaduha: Mo-trigger ang atong Render email microservice og live email notification sa mga estudyante nga approved na ang ilang research.*
>    - *Ikatulo: Awtomatikong ma-index ang papel padulong sa **Public Research Archive**.*
> 4. *Dugang pa niini, makita usab sa Dean ang official **Certificate of Archiving** nga may Dean electronic seal para sa institutional accreditation records."*

---

## 5. 👨‍🏫 Faculty Adviser Portal Walkthrough (Review & Endorsement)
> **Tumong:** Ipakita ang paper review, chapter-by-chapter milestones, line-by-line feedback, ug digital endorsement.

### 🎬 Action on Screen:
1. Log in isip Faculty Adviser.
2. Ablihi ang **Review Submissions** page.
3. I-open ang usa ka pending student submission.
4. Ipakita ang Chapter 1 to Chapter 5 checklist, pagbutang og feedback comment, ug ang **Endorse to Dean** button.

### 🎙️ Unsay Isulti (Script):
> *"Sunod nato nga paborito sa mga faculty: ang **Faculty Adviser Portal**.*
>
> *Kaniadto, ang adviser mag-print pa og baga kaayong draft, maglingkod bitbit ang red ballpen, unya magbalik-balik og hatag og hardcopy revisions nga dali rang mawala.*
>
> *Sa ARCHIVIO:*
> 1. ***Interactive Document Review:** Makabasa ang adviser sa full manuscript PDF direkta sa browser gamit ang atong document viewer.*
> 2. ***Chapter-by-Chapter Milestone Tracking:** Naay checklist gikan sa Chapter 1 (Introduction) hangtod Chapter 5 (Conclusion). Matag chapter, pwede i-mark sa adviser kon 'Approved' ba o 'Needs Revision'.*
> 3. ***Live Feedback Loop:** Diri pwede mo-type ang adviser og specific revision notes. Inig submit sa feedback, real-time kining mo-reflect sa dashboard sa estudyante.*
> 4. ***Digital Endorsement:** Kon ma-satisfy na sa mga estudyante ang tanang revisions, i-click sa adviser ang **'Endorse to Dean'**. Kini nagpamatuod nga gi-authenticate sa adviser ang katinuod ug kalidad sa maong research."*

---

## 6. 👨‍🎓 Student Proponent Portal Walkthrough (Milestones & Certificate)
> **Tumong:** Ipakita ang student journey gikan sa group registration, upload, revision updates, hangtod sa pag-print sa Archival Certificate para sa graduation clearance.

### 🎬 Action on Screen:
1. Log in isip Student Proponent.
2. Ipakita ang **Milestone Pipeline** (Progress Page).
3. Ipakita ang **Submit / Manuscript Upload** form.
4. Ipakita ang **View / Print Certificate** button nga mo-display sa authentic parchment certificate nga naay QR Code.

### 🎙️ Unsay Isulti (Script):
> *"Ania na kita sa kasingkasing sa sistema: ang **Student Proponent Portal**.*
>
> *Gi-disenyo kini nga user-friendly kaayo aron dili maglibog ang mga estudyante sa ilang requirements:*
> 1. ***Group Formation & Adviser Assignment:** Ang estudyante makadugang sa iyang mga co-authors ug makapili sa ilang official research adviser.*
> 2. ***Real-time Milestone Pipeline:** Dili na kinahanglan magsigeg pangutana ang estudyante sa adviser kon asa na ilang papel. Makita nila sa screen ang visual progress: Submission → Adviser Review → Revision Needed → Endorsed → Dean Approval → Cataloged.*
> 3. ***Manuscript Upload:** Dali ra kaayong i-upload ang final PDF document, title, abstract, ug keywords.*
> 4. ***Official Certificate of Archiving (Pang-Graduation Clearance):** Sa higayon nga ma-approve sa Dean, ma-unlock dayon sa estudyante ang ilang **Archival Certificate**.*
>    - *Naka-format kini sa opisyal nga SWU PHINMA parchment layout.*
>    - *Naay electronic signatures sa Dean ug Adviser.*
>    - *Ug labaw sa tanan, naay **Dynamic QR Code** sa ubos nga pwedeng i-scan aron ma-verify.*
>    - *Mao kini ang official clearance document nga i-attach sa estudyante para sa ilahang hardbound submission sa library ug Registrar."*

---

## 7. 🌐 Public Research Archive (The Discovery Platform)
> **Tumong:** Ipakita ang PWA features, smart search, Text-to-Speech audio abstract, in-viewer dictionary, citations, ug ang **Institutional Verification Ledger**.

### 🎬 Action on Screen:
1. Ablihi ang Public Archive (`/browse`).
2. Pag-search og topic, pag-filter gamit ang categories ug departments.
3. Ablihi ang usa ka paper sa **Archive Paper Viewer**:
   - I-play ang **Audio Abstract (Play 🎧)**.
   - I-double-click ang usa ka technical word sa abstract aron mo-pop up ang **Dictionary**.
   - I-click ang **Cite** button (APA, MLA, Chicago).
   - I-click ang bag-ong sleek badge: **`Verified Record | Verify ›`**.
4. Mo-abli ang **Institutional Verification Ledger** (`/verify/:id`):
   - Ipakita ang Dean & Adviser electronic approval timestamps, Reference ID, ug ang Read Full Manuscript button.
   - **I-explain nga gikuha ang certificate download para walay makapangopya o maka-forge.**

### 🎙️ What to Say (Script):
> *"Karon, atong ipasigarbo ang public face sa atong unibersidad: ang **ARCHIVIO Public Discovery Archive**.*
>
> *Kini usa ka **Progressive Web App (PWA)** nga pwedeng ma-install sa cellphone o laptop, ug naay offline caching aron magamit bisan hinay ang data.*
>
> *Tan-awa ang mga advanced academic features sulod sa atong Viewer:*
> 1. ***🎧 Text-to-Speech Abstract Reader:** Gamit ang Web Speech API, pwede paminawon sa estudyante ang abstract samtang nagbasa—nindot kaayo ni para sa accessibility.*
> 2. ***📖 In-Viewer Interactive Dictionary:** Kon naay lisod nga technical term sa abstract, i-double-click lang kini sa user ug awtomatikong mo-gawas ang dictionary definition.*
> 3. ***📑 Instant Multi-Format Citation:** Sa usa lang ka click, makahatag dayon kini og eksaktong citation sa APA, MLA, Chicago, Harvard, ug BibTeX para sa mga researchers nga mo-cite sa thesis sa SWU.*
> 4. ***🛡️ Tamper-Proof Institutional Verification Ledger:** Tan-awa kining sleek nga 'Verified Record' badge sa ibabaw.*
>    - *Inig click nato ani, dili kini mo-abli og bag-ong window; mo-navigate kini diha ra sa samang tab padulong sa **Official Institutional Verification Ledger**.*
>    - *Makita diri ang resibo sa eskwelahan: Reference Code (`ARCH-SWU-XXXXXX`), petsa sa archival, ug ang digital authentication sa Dean ug Adviser.*
>    - *Ug labing importante: **Among gituyo nga gikuha ang download button sa certificate sa public view**. Ang public gitugotan lamang nga mag-verify sa audit trail, samtang ang actual printable certificate kay eksklusibo lamang sa authenticated authors. Kini aron masiguro nga walay estranghero nga maka-download o maka-tamper sa personal nga certificate sa estudyante—fully adhering to credential security and the Data Privacy Act!"*

---

## 8. 🧠 AI Microservice & Backend Cloud Architecture
> **Tumong:** Ipakita ang live chatbot ug i-explain ang Multi-Model Cascading AI ug Cloud Firestore.

### 🎬 Action on Screen:
1. I-open ang **Homepage Chatbot** sa Public Archive.
2. Mangutana: *"Unsa man kining ARCHIVIO?"* o *"Who created this system?"*
3. Ipakita ang paspas nga tubag sa AI.

### 🎙️ What to Say (Script):
> *"Sa luyo sa nindot nga interface sa ARCHIVIO, nagdagan ang usa ka lig-on nga cloud architecture:*
>
> 1. ***Google Cloud Firebase Foundation:**
>    - *Cloud Firestore: Naghatag og sub-second real-time sync tali sa estudyante ug adviser.*
>    - *Firebase Authentication: Nagdumala sa salted-hash password encryption ug session security.*
>    - *Cloud Storage: Nag-host sa mga bug-at nga PDF manuscripts pinaagi sa Google CDN.*
> 2. ***Resilient Multi-Model AI Microservice (Hosted on Render):**
>    - *Wala kami mosalig sa usa lang ka AI model. Ang among Express backend naggamit og **Multi-Model Cascading Architecture**.*
>    - *Gi-prioritize niini ang high-speed nga **Google Gemini Flash**; ug kon pananglitan ma-busy, ma-traffic, o ma-rate limit ang Google API, **awtomatiko kining mo-cascade ug mo-switch sa Groq SDK** isip failover backup.*
>    - *Tungod niini, ang atong AI Chatbot, Abstract Summarizer, ug Transactional Email Service kay nagpabiling 99.9% online ug walay downtime."*

---

## 9. 🛡️ System Security & Data Privacy Architecture (The 7 Pillars)
> **Tumong:** Pamatud-an sa Panel nga ang sistema kay enterprise-grade, dili ma-hack, ug mosunod sa Balaod sa Pilipinas (Data Privacy Act of 2012).

### 🎙️ Unsay Isulti (Script):
> *"Kon hisgotan ang Security, ang ARCHIVIO gitukod subay sa **Pito ka Haligi sa Enterprise Security (The 7 Pillars)**:*
>
> 1. ***Role-Based Access Control (RBAC):** Naay estrikto nga boundary ang privileges. Ang student dili maka-approve sa iyang papel; ang adviser dili maka-publish sa archive; ug ang public view-only ra gayod.*
> 2. ***Server-Side Firestore Security Rules:** Dili lang sa frontend gipanalipdan ang system. Sa Firestore rules mismo sa cloud, gi-validate ang token sa user. Bisan kon ang estudyante mang-hack gamit ang browser console (F12) aron usbon ang iyang status ngadto sa 'published', ang Firebase server **awtomatikong mo-block sa request** kay Dean UID ra ang naay write privilege.*
> 3. ***Anti-Forgery Verification:** Pinaagi sa Reference ID ug QR code nga naka-tether sa among live ledger, mapugngan ang paghimo og peke nga clearance certificates.*
> 4. ***Data Privacy Act of 2012 (RA 10173) Compliance:** Scholarly metadata lamang (Title, Authors, Abstract, Department) ang makita sa public. Ang personal phone numbers, student ID numbers, ug unapproved draft remarks kay estriktorong gitagoan sa backend.*
> 5. ***Anti-Scraping & IP Protection:** Ang PDF manuscripts giprotektahan gamit ang Canvas rendering ug view-only restrictions aron malikayan ang automated web scraping.*
> 6. ***Environment Secret Isolation:** Ang tanang API keys, service accounts (`firebase-service-account.json`), ug SMTP credentials kay encrypted sa server environment variables sa Render ug gitagoan sa `.gitignore`.*
> 7. ***Network Rate Limiting & CORS:** Gipanalipdan ang atong API batok sa bot flooding ug Denial of Service (DoS) attacks gamit ang CORS whitelist ug express rate-limiters."*

---

## 10. 🎯 Top 12 Defense Questions & Winning Answers (Cheatsheet)

### Q1: "Nganong dili na lang mo mogamit og Google Drive o Google Forms para sa thesis submission?"
> **Tubag (Bislish):**
> *"Sir/Ma'am, ang Google Drive kay simple file storage lang. Lahi ra kaayo kini sa ARCHIVIO nga usa ka **Dedicated Academic Enterprise System**. Sa Google Drive, walay milestone pipeline tracking, walay Chapter-by-Chapter adviser checklist, walay Dean's publish queue, dili makahimo og cryptographically verifiable certificates nga may QR codes, ug walay interactive public discovery archive nga may Text-to-Speech ug automated citations."*

### Q2: "Unsaon ninyo paglikay sa certificate forgery o peke nga certificates?"
> **Tubag (Bislish):**
> *"Tulo ka paagi Sir/Ma'am: Una, ang matag certificate nagdala og unique **Reference ID (`ARCH-SWU-XXXXXX`)**. Ikaduha, ang QR code naka-link sa among live **Institutional Verification Ledger** nga nagpakita sa exact electronic approval timestamp sa Dean ug Adviser. Ikatulo, among **gi-disable ang pag-download sa certificate sa public**, aron ang authenticated proponents ug faculty ra ang makagunit sa opisyal nga clearance document."*

### Q3: "Unsaon pagpanalipod sa Intellectual Property (IP) sa mga estudyante aron dili makopya o ma-scrape ang ilang research?"
> **Tubag (Bislish):**
> *"Ang atong Public Viewer naggamit og **HTML5 Canvas-based rendering** nga may **View-Only Access Controls**. Dili kini direct raw PDF download link nga dali rang i-scrape sa bot. Dugang pa, ang public igo ra makabasa sa verified abstract ug metadata gawas kon tagaan sila og authenticated access sa university."*

### Q4: "Nganong Firebase inyong gigamit kaysa traditional MySQL / PHP?"
> **Tubag (Bislish):**
> *"Duha ka dagkong rason Sir/Ma'am: Una, **Real-Time Data Syncing**—inig comment sa adviser o inig approve sa Dean, diretso mo-update ang dashboard sa estudyante nga dili na kinahanglan mag-manual refresh. Ikaduha, **Serverless Scalability ug Offline Persistence**—wala nay labad sa pag-maintain og physical local database server, ug Google-grade ang encryption at rest ug in transit."*

### Q5: "Unsay mahitabo kon ma-down o ma-rate limit ang Gemini AI API?"
> **Tubag (Bislish):**
> *"Nindot kaayo na nga pangutana Sir/Ma'am. Sa among backend sa Render, nag-implement mi og **Multi-Model Cascading Failover Gateway**. Kon pananglitan ma-quota o ma-busy ang Google Gemini, ang among server awtomatikong mo-cascade sa secondary models ug mo-shift sa **Groq SDK** isip backup. Busa, 99.9% ang uptime sa atong AI assistant."*

### Q6: "Unsaon pagsiguro nga mosunod ang sistema sa Data Privacy Act of 2012 (RA 10173)?"
> **Tubag (Bislish):**
> *"Nagsunod kami sa prinsipyo sa **Proportionality ug Need-to-Know**. Ang gipagawas sa Public Archive kay purely academic scholarly metadata lamang (Title, Authors, Abstract). Ang mga sensitibong impormasyon sama sa personal contact numbers, student ID numbers, ug faculty private draft notes kay estriktorong gitagoan sa among database ug dili ma-access sa public."*

### Q7: "Unsay buhaton kon hinay o maputol ang internet connection samtang nagbasa ang user?"
> **Tubag (Bislish):**
> *"Ang ARCHIVIO gitukod isip **Progressive Web App (PWA)** nga may **Firestore IndexedDB Local Caching**. Sa ato pa, ang mga abstract ug data nga na-load na daan sa browser kay magpabiling mabasa sa estudyante bisan temporaryong mawala ang internet."*

### Q8: "Unsa man ang gamit anang Reference ID sama sa `ARCH-SWU-L0WLCD0O`?"
> **Tubag (Bislish):**
> *"Kini naglihok isip **Institutional DOI (Digital Object Identifier)** o **Catalog Number**. Mao kini ang standard reference code nga gamiton sa library aron dali ma-cross reference ang physical hardbound book ngadto sa digital record sa database."*

### Q9: "Kinsa man ang opisyal nga tag-iya sa sistema kon kini i-turn over na?"
> **Tubag (Bislish):**
> *"Ang tibuok institutional rights ug intellectual ownership mapanag-iya sa **Southwestern University PHINMA**, ubos sa pagdumala sa College of Information Technology ug Office of the Dean, samtang ang technical administration i-turn over sa University IT Department pinaagi sa Super Admin credentials."*

### Q10: "Unsay inyong plano para sa Version 2.0 (Future Works)?"
> **Tubag (Bislish):**
> *"Para sa Version 2.0, plano namo i-integrate ang **Automated Plagiarism & Similarity Index Checker** direkta sa upload pipeline, pag-integrate sa **RFID Student ID Tap-to-Verify** sa library entrance kiosk, ug native mobile apps para sa iOS ug Android."*

### Q11: "Unsaon pagsiguro nga dili ma-hack sa student ang iyang status gikan sa 'Pending' ngadto sa 'Approved' sa database?"
> **Tubag (Bislish):**
> *"Pinaagi sa **Cloud Firestore Security Rules**. Ang verification dili gibuhat sa browser; gibuhat kini sa Google Cloud server mismo. Sa among `firestore.rules`, naka-code nga kon ang `request.auth.token.role` dili 'dean', **i-reject ug i-block sa Firebase ang write operation**, bisan unsaon pa pag-inject og code sa estudyante gikan sa browser."*

### Q12: "Unsay panalipod ninyo batok sa SQL Injection ug Cross-Site Scripting (XSS)?"
> **Tubag (Bislish):**
> *"Una, ang Cloud Firestore kay usa ka **NoSQL Document Database**, busa walay raw SQL strings nga pwedeng i-concatenate o i-inject. Ikaduha, batok sa XSS, ang React framework awtomatikong nag-sanitize ug nag-escape sa tanang dynamic text sa dili pa kini i-render sa DOM."*

---

## 11. 🏆 Powerful Closing Statement (Panapos)
> **Kinsa ang mosulti:** Lead Presenter / Team Representative  
> **Gitas-on:** 1 ka minuto  
> **Tono:** Pormal, mapasalamaton, ug masaligon.

### 🎙️ Unsay Isulti (Script):
> *"Distinguished members of the panel, ang **ARCHIVIO** dili lang kay basta usa ka school project—kini usa ka production-ready, fully deployed, secure, ug intelligent institutional ecosystem.*
>
> *Kini naghatag og dungog sa kahago sa atong mga student researchers, nagpagaan sa trabaho sa atong mga faculty advisers, ug nagpataas sa academic prestige sa **Southwestern University PHINMA**.*
>
> *Andam na kami karon sa pagtubag sa inyong mga pangutana ug sa pagpaminaw sa inyong bililhong mga tambag aron mas mapalambo pa kini nga proyekto. Daghang kaayong salamat kaninyong tanan!"*
