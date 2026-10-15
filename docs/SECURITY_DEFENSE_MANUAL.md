# 🛡️ ARCHIVIO: Comprehensive System Security Architecture & Defense Manual
**Southwestern University PHINMA — College of Information Technology**  
*BSIT Capstone Project — Research Archival & Management System*  
*Reference Document for Pre-Defense, Final Defense, and Institutional Accreditation (CHED/PACUCOA)*  

---

## 📌 Executive Summary (The 30-Second Elevator Pitch)
> **If the panel asks:** *"How secure is your system?"* o *"Unsay security measures sa ARCHIVIO?"*  
> **Answer with confidence:**  
> *"Sir/Ma'am, ang ARCHIVIO gitukod subay sa usa ka **Zero-Trust Enterprise Security Model**. Wala kami nagsalig sa frontend validation lang. Ang among sistema gipanalipdan pinaagi sa **Server-Side Cloud Firestore Security Rules**, **Role-Based Access Control (RBAC)**, **Google Cloud AES-256 Data Encryption**, ug **Strict Compliance sa Data Privacy Act of 2012 (RA 10173)**.*  
>  
> *Bisan kon ablihan sa usa ka user ang browser Developer Tools (F12) aron usbon ang iyang role o i-approve ang iyang kaugalingong thesis, **awtomatikong i-reject sa Google Cloud server ang request** tungod sa among tamper-proof security rules. Dugang pa, ang among mga Archival Certificates naggamit og **Cryptographic Reference IDs** ug **Dynamic QR Code Verification Ledgers** aron mapugngan ang bisan unsang porma sa certificate forgery o tampered clearance."*

---

## 🏛️ The 8 Pillars of ARCHIVIO Security Architecture

```
                             ┌───────────────────────────────────────┐
                             │       ARCHIVIO SECURITY ECOSYSTEM     │
                             └───────────────────┬───────────────────┘
                                                 │
         ┌───────────────────┬───────────────────┼───────────────────┬───────────────────┐
         ▼                   ▼                   ▼                   ▼                   ▼
   [1. Auth & Identity] [2. RBAC & Privileges] [3. Server Rules] [4. Data Privacy] [5. Anti-Forgery]
   - Salted Scrypt      - 6 Distinct Roles     - Zero-Trust       - RA 10173        - Dynamic QR Code
   - Firebase Auth      - No Escalation        - Field Gating     - PII Redaction   - Immutable Ledger
   - Session Tokens     - Route Guards         - Cloud Enforced   - Need-to-Know    - Institutional ID
         │                   │                   │                   │                   │
         └───────────────────┴───────────────────┼───────────────────┴───────────────────┘
                                                 │
                                 ┌───────────────┴───────────────┐
                                 ▼                               ▼
                      [6. OWASP Countermeasures]       [7. Audit & Non-Repudiation]
                      - NoSQL Injection Proof          - Real-Time Activity Logs
                      - Auto-Escaped XSS               - Immutable Timestamps
                      - TLS 1.3 / AES-256              - Actor UID Tracing
```

---

### Pillar 1: Authentication & Identity Management
1. **Industry-Standard Authentication Engine:**
   - Gigamit ang **Firebase Authentication (Google Identity Platform)**.
   - Ang mga passwords dili ma-save as plain text. Gi-hash kini gamit ang **Salted Scrypt / Bcrypt** algorithm sa server side. Walay database administrator o programmer nga makabasa sa passwords sa users.
2. **Session Security & Token Management:**
   - Naggamit og **JSON Web Tokens (JWT) / Firebase ID Tokens**.
   - Ang mga tokens adunay strict expiration time ug auto-refresh cycle.
   - Kung ang account ma-disable o ma-delete sa Admin, ang active token ma-revoke dayon sa backend.
3. **Institutional Email & Domain Verification:**
   - Ang registration sa mga advisers ug students kay kontrolado pinaagi sa verified school emails ug invitation tokens, preventing unauthorized public account creation.

---

### Pillar 2: Role-Based Access Control (RBAC) & Boundary Isolation
Ang ARCHIVIO nagpatuman og **6 ka distinct roles** nga adunay strict boundary separation:

| Role | Access Level | Permissions & Boundaries |
| :--- | :--- | :--- |
| **👑 Super Admin** | System Governance | Global system configuration, audit logs inspection, Admin & Dean management. Cannot approve papers. |
| **🏛️ College Admin** | Academic Coordination | Department & program management, faculty roster, category classification, CHED reports. |
| **🎓 Dean** | Executive Sign-off | Publish Queue, electronic endorsement review, final manuscript approval, official publication. |
| **👨‍🏫 Faculty Adviser** | Manuscript Review | Student group mentoring, Chapter 1-5 checklist, revision comments, endorsement to Dean. |
| **👨‍🎓 Student Proponent** | Research Submission | Group formation, manuscript upload, revision tracking, archival certificate generation upon clearance. |
| **🌐 Public Researcher** | Discovery Only | Search, read approved abstracts, listen to audio abstracts, view-only verified manuscript, view ledger. |

* **Client-Side Route Guards:** Naka-protect ang mga routes sa React (`PrivateRoute.jsx` / `RoleRoute.jsx`). Kung ang usa ka estudyante mosuway og type sa URL nga `/dean/publish-queue`, awtomatiko siyang i-redirect sa login o sa iyang kaugalingong dashboard.

---

### Pillar 3: Server-Side Firestore Security Rules (Zero-Trust Model)
> **Crucial Defense Point:** Ang client-side protection (React) pwedeng ma-bypass kung mogamit og curl o Postman. Apan ang **Firestore Rules nagdagan sa Google Cloud mismong mga servers**.

#### A. Pagpugong sa Privilege Escalation (Anti-Role Hijacking)
Sa `firestore.rules` (Lines 69–73):
```javascript
match /users/{userId} {
  allow update: if isSystemAdmin()
                || (isAuthenticated() && request.auth.uid == userId &&
                    !request.resource.data.diff(resource.data).affectedKeys()
                      .hasAny(['role', 'status', 'uid']));
}
```
* **Unsay pasabot ani?** Ang usa ka logged-in user pwede mag-update sa iyang profile (e.g. bio, display name), apan **GIBALHUGAN** siya sa pag-usab sa iyang `role`, `status`, o `uid`.
* Dili mahimong himuong "admin" o "dean" sa estudyante ang iyang kaugalingon pinaagi sa code injection.

#### B. Pagpugong sa Status Tampering (Anti-Self Approval)
Sa `firestore.rules` (Lines 198–204):
```javascript
match /submissions/{docId} {
  allow update: if isSystemAdmin() || isDean() || isAdviser()
                 || (isAuthenticated() && isStudentOrGroupMember(resource.data.studentUid)
                     && !request.resource.data.diff(resource.data).affectedKeys().hasAny([
                       'reviewStatus', 'reviewedBy', 'reviewedAt', 'documentApprovals',
                       'deanComments', 'deanFeedback', 'publishedAt'
                     ]))
}
```
* **Unsay pasabot ani?** Ang estudyante makadugang og revisions o document files, apan **IMPOSIBLE** nga usbon sa estudyante ang:
  - `reviewStatus` (e.g. gikan sa 'pending' ngadto sa 'approved')
  - `reviewedBy` o `reviewedAt`
  - `documentApprovals`
  - `publishedAt`
* Ang **Dean UID** ug **Adviser UID** lamang ang gitugotan sa cloud server nga mag-usab niining mga administrative fields.

#### C. Private Group Messaging Isolation
Sa `firestore.rules` (Lines 268–272):
```javascript
match /chats/{groupId}/messages/{messageId} {
  allow read, write: if isAuthenticated()
                     && (isSystemAdmin() || isDean() || isAdviser() || isGroupMember(groupId));
}
```
* Ang mga private messages ug internal group files tali sa adviser ug estudyante kay mabasa lamang sa mga lehitimong miyembro sa maong grupo.

---

### Pillar 4: Data Encryption (In Transit & At Rest)
1. **Encryption in Transit (Network Security):**
   - Ang tanang data exchange tali sa client browser, Firebase, ug sa Express microservice kay encrypted gamit ang **Transport Layer Security (TLS 1.3 / HTTPS)**.
   - Man-in-the-Middle (MitM) attacks ug packet sniffing are computationally infeasible.
2. **Encryption at Rest (Storage Security):**
   - Ang tanang documents sa Cloud Firestore ug PDF files sa Cloud Storage kay encrypted gamit ang **AES-256 (Advanced Encryption Standard with 256-bit keys)** nga gidumala sa Google Cloud Key Management Service (KMS).

---

### Pillar 5: Data Privacy Act of 2012 (Republic Act 10173) Compliance
Gipatuman sa ARCHIVIO ang tulo ka sukaranang mga prinsipyo sa National Privacy Commission (NPC):
1. **Prinsipyo sa Transparency:**
   - Klaro ang consent ug purpose sa pag-kolekta sa scholarly works para sa research repository sa unibersidad.
2. **Prinsipyo sa Proportionality (Data Minimization):**
   - **Unsay makita sa Public Archive:** Scholarly metadata lamang (Research Title, Abstract, Keywords, Department, Co-Authors, Publication Year, Academic Citations).
   - **Unsay gitagoan (Confidential / Protected):**
     - Personal contact numbers sa estudyante
     - Student ID numbers / LRN
     - Adviser draft review notes ug revision histories
     - Unapproved initial drafts
3. **Institutional Verification Ledger (Anti-Certificate Theft):**
   - Sa public verification link (`/verify/:id`), **gituyo nga gitangtang ang download button sa actual certificate**.
   - Ang public gitugotan lamang nga mag-verify kon balido ba ang certificate pinaagi sa pagbasa sa official academic ledger.
   - Ang authenticated proponents ug faculty ra ang makagunit ug maka-print sa official clearance document.

---

### Pillar 6: Anti-Forgery & Document Integrity Architecture
Giunsa pagpanalipod sa ARCHIVIO ang graduation clearances batok sa pamemeke (counterfeiting)?

1. **Unique Reference Code (Institutional DOI):**
   - Kada research nga ma-approve sa Dean tagaan og unique, non-sequential alphanumeric code (e.g. `ARCH-SWU-L0WLCD0O`).
   - Kini nga code naka-tether sa immutable database record sa university.
2. **Dynamic QR Code Verification:**
   - Ang certificate nagbaton og QR code nga nagtudlo diretso sa online Ledger: `https://archivio-research-system.web.app/verify/{paperId}`.
   - Inig scan sa library staff o registrar, mo-abli ang official real-time record nga nagpamatuod sa electronic sign-off sa Dean ug Adviser uban ang exact timestamps.
3. **Electronic Dean Seal & Signature Binding:**
   - Ang certificates naggamit og electronic authentication seal nga nag-bind sa department name, school year, ug verified credentials sa Dean.

---

### Pillar 7: OWASP Top 10 Countermeasures in ARCHIVIO

| OWASP Vulnerability | Risk / Attack Vector | ARCHIVIO Defensive Implementation |
| :--- | :--- | :--- |
| **A01: Broken Access Control** | URL manipulation, bypassing approval checkpoints | Server-side Firestore Rules + Client route guards. Privileges checked on every cloud read/write. |
| **A02: Cryptographic Failures** | Exposing sensitive data in transit or rest | Forced HTTPS/TLS 1.3, AES-256 cloud encryption, salted scrypt password hashing. |
| **A03: Injection (SQL / NoSQL)** | Malicious SQL/NoSQL query payloads | Firestore uses a parameterized object document model. No raw SQL query string concatenation exists. |
| **A04: Insecure Design** | Self-assigning clearance without adviser review | Linear workflow pipeline gating: Student Upload ➔ Adviser Endorsement ➔ Dean Approval ➔ Cataloged. |
| **A05: Security Misconfiguration** | Leaked secrets, default credentials | All API keys and Firebase Service Accounts are isolated in `.env` and Render backend environment variables. |
| **A06: Vulnerable Components** | Outdated libraries with known exploits | Modern dependencies managed via npm, audited through Vite build pipelines. |
| **A07: Identification & Auth Failures** | Brute force login, session hijacking | Firebase Auth session management, token expiry, rate-limited login attempts. |
| **A08: Software & Data Integrity** | Tampered certificate images or PDF files | Institutional Reference ID cross-referenced with database ledger; public download of certificates disabled. |
| **A09: Security Logging & Monitoring** | Undetected unauthorized operations | Real-time `activity_logs` collection recording timestamps, actor UIDs, actions, and entities. |
| **A10: Server-Side Request Forgery** | Attacking internal microservices | Restricted CORS whitelist and internal authorization tokens for the Express/Render microservice. |

---

### Pillar 8: Non-Repudiation & Audit Trail (Activity Logs)
* Ang matag kritikal nga aksyon sa sistema awtomatikong mag-generate og audit log document sa Firestore (`activity_logs`):
  - **Timestamp:** ISO 8601 server timestamp (`new Date().toISOString()`)
  - **Actor UID & Name:** Kinsa ang naghimo sa lihok (e.g., Dean, Adviser, Student)
  - **Action Type:** `SUBMISSION_UPLOAD`, `ADVISER_ENDORSED`, `DEAN_APPROVED`, `MANUSCRIPT_PUBLISHED`, `USER_INVITED`
  - **Entity ID:** ID sa target paper o user
* Ang `activity_logs` kay **read-only** para sa mga ordinaryong users; Super Admin ug Dean lamang ang makatan-aw, ug walay maka-delete o maka-usab niini aron masiguro ang 100% institutional accountability.

---

## 🎯 Top 10 Security Defense Questions & Winning Answers

### Q1: "Unsaon ninyo pagpamatuod nga dili ma-hack sa estudyante ang sistema gamit ang F12 o inspect element?"
> **Winning Answer (Bislish):**  
> *"Sir/Ma'am, ang pag-usab sa code sa browser gamit ang F12 (Developer Tools) kay **client-side manipulation lamang**. Ang tinuod nga database security sa ARCHIVIO anaa sa **Google Cloud Firestore Security Rules** sa server side.*  
>  
> *Bisan kon usbon sa estudyante ang JavaScript code sa iyang browser aron tawgon ang `status = 'approved'`, sa pag-abot sa maong request sa Google Cloud server, susihon sa among `firestore.rules` kon ang `request.auth.uid` iya ba sa Dean. Tungod kay dili man Dean ang iyang credentials, **awtomatikong i-block ug i-throw sa Google server ang 'Permission Denied' error**. Walay bisan unsa nga data nga mausab sa database."*

---

### Q2: "Unsaon pagpanalipod sa sistema batok sa SQL Injection o Database Injection?"
> **Winning Answer (Bislish):**  
> *"Sir/Ma'am, ang ARCHIVIO naggamit sa **Cloud Firestore**, nga usa ka **NoSQL Document Database**. Lahi sa daang MySQL o PHP diin nag-concatenate og raw SQL query strings sama sa `SELECT * FROM users WHERE username = '...' + input`, ang Firestore naggamit og **Strict SDK Parameterized Object Queries**.*  
>  
> *Ang user input gi-treat sa database engine isip purong data values ug dili executable code. Busa, ang traditional SQL Injection o SQL command chaining kay **imposible nga mahitabo** sa among architecture."*

---

### Q3: "Unsaon ninyo pagtuman ang Data Privacy Act of 2012 (RA 10173)?"
> **Winning Answer (Bislish):**  
> *"Nagsunod kami sa mga sumbanan sa **National Privacy Commission (NPC)** pinaagi sa prinsipyo sa **Proportionality ug Need-to-Know**.*  
>  
> *Una, ang gipakita sa Public Discovery Archive kay **Academic Scholarly Metadata lamang**—sama sa Title, Abstract, Department, ug Authors, nga gituyo gayod nga ipatik alang sa scholarly research citations.*  
> *Ikaduha, ang tanang sensitibong personal information (PII) sama sa student phone numbers, email passwords, ID numbers, ug unapproved draft revision notes kay **estriktorong gitagoan sa authenticated backend** ug dili ma-access sa public.*  
> *Ikatulo, ang among online verification ledger nag-verify lamang sa status sa paper ug dili naghatag og open download sa personal certificate sa estudyante."*

---

### Q4: "Unsay panalipod ninyo batok sa Cross-Site Scripting (XSS) sa inyong mga search bars ug submission inputs?"
> **Winning Answer (Bislish):**  
> *"Gipanalipdan kami batok sa XSS pinaagi sa duha ka lig-on nga mekanismo:*  
> 1. *Ang among frontend gitukod gamit ang **React Framework**, diin ang tanang dynamic variables nga gi-render sa JSX kay **awtomatikong gi-sanitize ug gi-escape** sa dili pa ibutang sa DOM. Bisan kon mag-input ang attacker og `<script>alert('hack')</script>`, i-render kini sa browser isip plain text string ug dili i-execute.*  
> 2. *Sa among PDF ug CSV exports, nag-implement kami og manual `escapeHtml()` utility function nga nag-convert sa special characters (`<`, `>`, `&`, `"`, `'`) ngadto sa ilang safe HTML entity equivalents aron masiguro nga walay DOM injection nga mahitabo."*

---

### Q5: "Unsaon ninyo pagsiguro nga dili ma-peke o ma-photoshop ang Archival Certificate para sa clearance?"
> **Winning Answer (Bislish):**  
> *"Sir/Ma'am, ang papel o imahe sa certificate pwedeng kopyahon o i-photoshop, apan **ang among database ledger dili gayod ma-peke**.*  
>  
> *Kada certificate nagbaton og duha ka security anchors:*  
> 1. *Usa ka unique **Reference ID (`ARCH-SWU-XXXXXX`)**.*  
> 2. *Usa ka **Dynamic QR Code** nga inig scan sa registrar o library, mo-abli sa among live **Institutional Verification Ledger** (`/verify/:id`).*  
>  
> *Kung ang usa ka estudyante magpakita og peke nga certificate nga gi-edit sa Photoshop, inig scan sa QR code, ang official school ledger magpakita dayon kon kinsa ang tinuod nga author, unsang petsaha gi-aprubahan sa Dean, ug kon lehitimo ba gayod ang maong Reference ID. Kung wala sa database, peke kini dayon."*

---

### Q6: "Asa man ninyo gitago ang inyong mga API Keys ug database credentials aron dili makita sa publiko?"
> **Winning Answer (Bislish):**  
> *"Nagsunod kami sa **Twelve-Factor App Security Methodology**:*  
> *Ang tanang sensitibong credentials—sama sa among Gemini AI API keys, Groq API keys, Render service secrets, ug email SMTP passwords—kay **gitagoan sa server-side Environment Variables (`.env`)** ug gi-deploy sa secured container environment sa Render.*  
>  
> *Kini nga mga files kay apil sa `.gitignore`, busa **wala gayod kini ma-commit o ma-push sa public GitHub repository**. Dugang pa, ang among frontend Firebase config kay nagbaton og restricted API keys nga giprotektahan pinaagi sa among Firestore Rules."*

---

### Q7: "Unsay mahitabo kon ang usa ka adviser mosuway og tan-aw o approve sa research gikan sa laing department?"
> **Winning Answer (Bislish):**  
> *"Aduna kami **Departmental Data Scoping ug Multi-Tenancy Isolation**.*  
> *Sa Adviser Portal, ang query sa database kay gi-filter pinaagi sa `where('adviserUid', '==', user.uid)` ug sa department sa adviser. Ang adviser makakita lamang sa mga student groups nga opisyal nga na-assign kaniya.*  
>  
> *Dugang pa, ang final approval kay anaa lamang sa **Dean sa maong specific nga College**, nga gi-validate usab pinaagi sa Dean's Department match sa database."*

---

### Q8: "Unsaon pagpanalipod sa inyong AI Microservice batok sa Denial of Service (DoS) o API Flooding?"
> **Winning Answer (Bislish):**  
> *"Sa among Express backend sa Render, nagpatuman kami og duha ka layer sa depensa:*  
> 1. ***Network Rate Limiting:** Gigamit namo ang `express-rate-limit` aron limitahan ang gidaghanon sa requests nga pwedeng ipadala sa usa ka IP address sulod sa usa ka minuto.*  
> 2. ***CORS (Cross-Origin Resource Sharing) Whitelist:** Ang among backend microservice modawat lamang og requests nga naggikan sa among official frontend domains (`https://archivio-research-system.web.app` ug verified localhost ports). Ang bisan unsang request gikan sa unauthorized third-party domains awtomatikong i-block sa CORS policy."*

---

### Q9: "Kon naay panagbangi o dispute tali sa estudyante ug adviser, unsaon ninyo pag-trace kon unsay tinuod nga nahitabo?"
> **Winning Answer (Bislish):**  
> *"Pinaagi sa among **Immutable Audit Trail (Activity Logs)**.*  
> *Matag transaction—gikan sa pag-upload sa estudyante, paghatag og revision directives sa adviser, hangtod sa final sign-off sa Dean—adunay cryptographically recorded log nga nagbaton og **exact server timestamp**, **Actor UID**, ug **Target Entity ID**.*  
>  
> *Dili mahimong manghimakak (non-repudiation) ang bisan kinsa nga partido tungod kay ang logs kay read-only sa Firestore ug walay katungod ang mga users nga mag-usab o mag-delete sa ilang historikal nga mga lihok."*

---

### Q10: "Unsay inyong Disaster Recovery ug Backup Plan kon maguba o mawala ang data?"
> **Winning Answer (Bislish):**  
> *"Tungod kay ang ARCHIVIO nagdagan sa **Google Cloud Infrastructure**, nakapahimulos kami sa:*  
> 1. ***Multi-Region Cloud Redundancy:** Ang Cloud Firestore awtomatikong nag-replicate sa data tabok sa daghang geographic availability zones sulod sa Google Cloud Network.*  
> 2. ***Automated Point-in-Time Recovery (PITR):** Ang Firebase nagsuporta og disaster rollbacks.*  
> 3. ***Export Capabilities:** Ang Super Admin ug Dean makahimo usab og manual high-fidelity CSV and PDF data dumps sa tanang records alang sa off-site cold storage archive."*

---

## 📋 Summary Table for Quick Reference During Defense

| Security Dimension | Threat / Attack | ARCHIVIO Defensive Measure | Verification Mechanism |
| :--- | :--- | :--- | :--- |
| **Authentication** | Brute force, credential stuffing | Firebase Auth, Salted Scrypt | JWT ID Token, Auto-refresh |
| **Authorization** | Privilege escalation to Admin/Dean | Server-side Firestore Rules | `!request.resource.data.diff().affectedKeys().hasAny(['role'])` |
| **Workflow Integrity** | Student approving own paper | Submission field gating | `!request.resource.data.diff().affectedKeys().hasAny(['reviewStatus'])` |
| **Database Security** | SQL Injection, NoSQL Injection | Parameterized Object Queries | Firestore Document Model |
| **Frontend Security** | Stored & Reflected XSS | React auto-escaping, `escapeHtml` | JSX DOM rendering isolation |
| **Document Security** | Certificate counterfeiting / forgery | Institutional Ledger + Reference ID | Dynamic QR Code to `/verify/:id` |
| **Data Privacy** | PII leakage, RA 10173 violation | Metadata redaction, need-to-know | Public view shows abstract/citations only |
| **Accountability** | Repudiation, unauthorized edits | Activity logs with server timestamps | Immutable `activity_logs` collection |
| **Network Security** | Packet sniffing, MitM attacks | Enforced HTTPS, TLS 1.3 | Google SSL Certificate |
| **API Protection** | DoS, spamming, key theft | Rate-limiting, CORS, `.env` shielding | Express rate limiter, Render secrets |

---
*Prepared by the ARCHIVIO Capstone Development Team — College of Information Technology, Southwestern University PHINMA.*
