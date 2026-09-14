# ARCHIVIO: Research Management & Archiving System
## Database Metadata & Data Dictionary

---

### 1. Database Specifications
| Attribute | Specification |
| :--- | :--- |
| **Database Management System (DBMS)** | Google Cloud Firestore (Serverless Document NoSQL) |
| **Project ID** | `archivio-research-system` |
| **Database Instance** | `(default)` |
| **Location / Multi-Region** | `nam5` (North America) |
| **Protocol & API** | gRPC / REST (Google APIs v1) |
| **Security Layer** | Firestore Security Rules (`firestore.rules`) |
| **Index Configuration** | Compound Indexes (`firestore.indexes.json`) |

---

### 2. Collection Schema & Data Dictionary

#### 2.1 Collection: `users`
Stores user profile credentials, academic role designations, and verification states.
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `uid` | String | Yes | Unique Firebase Authentication user identifier |
| `email` | String | Yes | School or institutional email address |
| `displayName` / `name` | String | Yes | Full legal name of user |
| `role` | String | Yes | Access tier: `'student'`, `'adviser'`, `'admin'`, `'superadmin'` |
| `department` / `program` | String | Yes | Department (e.g., `'Information Technology'`) |
| `status` | String | Yes | Account lifecycle state: `'active'`, `'pending'`, `'inactive'` |
| `createdAt` | Timestamp | Yes | Account registration timestamp |
| `updatedAt` | Timestamp | No | Last profile modification timestamp |

#### 2.2 Collection: `submissions`
Primary repository of student research manuscripts, review lifecycle, and public status.
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | String | Yes | Auto-generated submission document ID |
| `studentUid` | String | Yes | Group leader / submitter user UID |
| `studentName` | String | Yes | Submitter full name |
| `groupName` | String | Yes | Capstone / thesis group name |
| `adviserUid` | String | Yes | Assigned faculty adviser user UID |
| `adviserName` | String | Yes | Faculty adviser display name |
| `researchTitle` / `title` | String | Yes | Official research paper title |
| `abstract` | String | Yes | Research executive summary / abstract |
| `keywords` | Array<String> | Yes | Research indexing keywords |
| `program` / `department` | String | Yes | Academic program or department |
| `reviewStatus` | String | Yes | Lifecycle: `'pending'`, `'in_review'`, `'revision_needed'`, `'approved'`, `'published'` |
| `documents` | Map / Object | Yes | File metadata (e.g. `'Final Manuscript': { name, url, size, uploadedAt }`) |
| `views` | Number | Yes | Total views count in public archive |
| `likes` | Array<String> | Yes | List of user UIDs who liked the paper |
| `publishedAt` | Timestamp | No | Timestamp when approved and published to public archive |
| `createdAt` | Timestamp | Yes | Initial submission timestamp |

#### 2.3 Collection: `groups`
Manages capstone/thesis group registrations, member rosters, and adviser linkages.
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | String | Yes | Document identifier |
| `groupName` | String | Yes | Unique group moniker |
| `leaderUid` | String | Yes | Group leader user UID |
| `leaderName` | String | Yes | Group leader display name |
| `leaderEmail` | String | Yes | Group leader email address |
| `members` | Array<Object/String> | Yes | List of group members with names and emails |
| `adviserUid` | String | No | Assigned adviser UID |
| `adviserName` | String | No | Assigned adviser name |
| `program` | String | Yes | Academic program (e.g. `'Information Technology'`) |
| `researchTitle` | String | Yes | Approved thesis title |
| `status` | String | Yes | Registration approval state: `'pending'`, `'approved'` |
| `createdAt` | Timestamp | Yes | Registration timestamp |

#### 2.4 Collection: `activity_logs`
Audit trails recording critical system events, approval actions, and security operations.
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | String | Yes | Audit log document ID |
| `actorUid` | String | Yes | UID of the user who triggered the action |
| `actorName` | String | Yes | Display name of the actor |
| `actorRole` | String | Yes | Role of the actor |
| `action` | String | Yes | Type of action (e.g., `'USER_LOGIN'`, `'PAPER_APPROVED'`, `'PAPER_PUBLISHED'`) |
| `details` | String / Object | Yes | Detailed description or context payload |
| `timestamp` | Timestamp | Yes | Exact event occurrence timestamp |

#### 2.5 Collection: `user_bookmarks`
Stores saved research bookmarks for authenticated portal users.
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `bookmarks` | Array<String> | Yes | Array of bookmarked submission paper IDs |
| `updatedAt` | Timestamp | No | Last bookmark update timestamp |

---

### 3. Security & Access Control Metadata
- **Access Rule Engine**: Google Cloud Firestore Rules (version 2)
- **File Reference**: [firestore.rules](file:///c:/Users/Pronce%20Japhet%20Vender/Desktop/ARCHIVIO/firestore.rules)
- **Index Reference**: [firestore.indexes.json](file:///c:/Users/Pronce%20Japhet%20Vender/Desktop/ARCHIVIO/firestore.indexes.json)
