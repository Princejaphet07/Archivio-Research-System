const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
const serviceAccount = require(serviceAccountPath);

if (!require('firebase-admin/app').getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();
const auth = getAuth();

// ==========================================
// 1. DEFAULT INSTITUTIONAL MILESTONE TEMPLATES
// ==========================================
const DEFAULT_REQUIREMENTS = [
  {
    id: 'Final Manuscript',
    title: 'Final Manuscript',
    desc: 'Complete approved research paper (PDF)',
    icon: '📄',
    type: 'file',
    scope: 'global',
    status: 'approved',
    priority: 1,
    storageEnabled: true,
    storageStatus: 'active'
  },
  {
    id: 'Approval Sheet',
    title: 'Approval Sheet',
    desc: 'Signed by adviser, dean, and defense panel',
    icon: '📑',
    type: 'file',
    scope: 'global',
    status: 'approved',
    priority: 2,
    storageEnabled: true,
    storageStatus: 'active'
  },
  {
    id: 'Dataset Files',
    title: 'Dataset Files',
    desc: 'Raw datasets used in the study (ZIP/CSV)',
    icon: '💾',
    type: 'file',
    scope: 'global',
    status: 'approved',
    priority: 3,
    storageEnabled: true,
    storageStatus: 'active'
  },
  {
    id: 'Video Pitch',
    title: 'Video Pitch',
    desc: 'Brief 3-5 min video presentation of research findings',
    icon: '🎥',
    type: 'file',
    scope: 'global',
    status: 'approved',
    priority: 4,
    storageEnabled: true,
    storageStatus: 'active'
  },
  {
    id: 'User Manual',
    title: 'User Manual',
    desc: 'Comprehensive manual for the developed software/system',
    icon: '📖',
    type: 'file',
    scope: 'global',
    status: 'approved',
    priority: 5,
    storageEnabled: true,
    storageStatus: 'active'
  },
  {
    id: 'Upload URL',
    title: 'Upload URL',
    desc: 'Source code repository, GitHub URL, or public publication',
    icon: '🔗',
    type: 'url',
    scope: 'global',
    status: 'approved',
    priority: 6,
    storageEnabled: true,
    storageStatus: 'active'
  },
  {
    id: 'Signature Page',
    title: 'Signature Page',
    desc: 'Original signed endorsement page from academic committee',
    icon: '✍️',
    type: 'file',
    scope: 'global',
    status: 'approved',
    priority: 7,
    storageEnabled: true,
    storageStatus: 'active'
  }
];

// ==========================================
// 2. DEFAULT RESEARCH CATEGORIES
// ==========================================
const DEFAULT_CATEGORIES = [
  { name: 'Artificial Intelligence & Machine Learning', icon: '🤖', desc: 'AI architectures, deep learning, NLP, computer vision' },
  { name: 'Web & Mobile Application Systems', icon: '📱', desc: 'Full-stack enterprise applications, progressive web systems' },
  { name: 'Data Science & Predictive Analytics', icon: '📊', desc: 'Statistical modeling, big data architectures, mining' },
  { name: 'Internet of Things (IoT) & Smart Devices', icon: '⚡', desc: 'Embedded systems, microcontroller automation, robotics' },
  { name: 'Cybersecurity & Network Infrastructure', icon: '🔒', desc: 'Network defense, vulnerability assessment, cryptographic protocols' },
  { name: 'Health Informatics & Medical Computing', icon: '🏥', desc: 'Clinical information systems, biomedical data processing' },
  { name: 'Educational Technology (EdTech)', icon: '🎓', desc: 'Virtual classrooms, automated learning analytics, institutional portals' }
];

// ==========================================
// 3. DEFAULT DEPARTMENTS & PROGRAMS
// ==========================================
const DEFAULT_DEPARTMENTS = [
  {
    id: 'ccs',
    name: 'College of Information Technology',
    code: 'CIT',
    desc: 'Computing, Software Engineering, Information Technology, and Data Science'
  },
  {
    id: 'shs',
    name: 'School of Health Sciences',
    code: 'SHS',
    desc: 'Nursing, Medical Laboratory Science, Pharmacy, and Allied Medicine'
  }
];

const DEFAULT_PROGRAMS = [
  {
    name: 'Bachelor of Science in Information Technology',
    code: 'BSIT',
    department: 'College of Information Technology'
  },
  {
    name: 'Bachelor of Science in Computer Science',
    code: 'BSCS',
    department: 'College of Information Technology'
  },
  {
    name: 'Bachelor of Science in Nursing',
    code: 'BSN',
    department: 'School of Health Sciences'
  },
  {
    name: 'Bachelor of Science in Pharmacy',
    code: 'BSP',
    department: 'School of Health Sciences'
  },
  {
    name: 'Bachelor of Science in Medical Technology',
    code: 'BSMT',
    department: 'School of Health Sciences'
  }
];

// ==========================================
// SEED EXECUTION ENGINE
// ==========================================
async function seedDatabase(options = { resetData: false }) {
  console.log('\n======================================================');
  console.log('🏛️  ARCHIVIO Institutional Defense Database Bootstrap');
  console.log('======================================================\n');

  // Clean out transactional data and non-admin users for a pristine fresh state
  if (options.resetData) {
    console.log('🧹 Purging all transactional data and non-admin accounts (Factory Wipeout)...');
    const resetCols = [
      'submissions',
      'groups',
      'studentInvitations',
      'invitations',
      'notifications',
      'activity_logs',
      'systemLogs',
      'mail',
      'emails',
      'published_papers',
      'user_bookmarks',
      'students',
      'advisers',
      'deans',
      'departments',
      'programs',
      'categories'
    ];
    for (const colName of resetCols) {
      const snap = await db.collection(colName).get();
      if (!snap.empty) {
        const batch = db.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        console.log(`   - Wiped ${snap.size} documents from [${colName}]`);
      }
    }

    // Purge non-admin users from users collection
    const userSnap = await db.collection('users').get();
    for (const d of userSnap.docs) {
      const data = d.data();
      const email = (data.email || '').toLowerCase().trim();
      const isAdmin = email === 'japhetvender00@gmail.com' || email.includes('admin') || data.role === 'admin' || data.role === 'super-admin';
      if (!isAdmin) {
        await d.ref.delete().catch(() => {});
      }
    }

    // Purge non-admin users from Firebase Auth
    const listAuth = await auth.listUsers(500);
    for (const u of listAuth.users) {
      const email = (u.email || '').toLowerCase().trim();
      const isAdmin = email === 'japhetvender00@gmail.com' || email.includes('admin');
      if (!isAdmin) {
        await auth.deleteUser(u.uid).catch(() => {});
        console.log(`   - Purged auth user: ${u.email}`);
      }
    }
  }

  // 1. Seed Requirements / Milestones
  console.log('📋 Checking Institutional Requirements (Milestones)...');
  const reqCol = db.collection('requirements');
  for (const req of DEFAULT_REQUIREMENTS) {
    const docRef = reqCol.doc(req.id);
    const existing = await docRef.get();
    if (!existing.exists) {
      await docRef.set({
        ...req,
        createdAt: new Date().toISOString()
      });
      console.log(`   + Created requirement: "${req.title}"`);
    } else {
      console.log(`   ✓ Verified requirement: "${req.title}"`);
    }
  }

  // 2. Seed Categories (Only if not a factory wipeout)
  if (!options.resetData) {
    console.log('\n🏷️  Checking Research Categories...');
    const catCol = db.collection('categories');
    const catSnap = await catCol.get();
    if (catSnap.empty) {
      for (const cat of DEFAULT_CATEGORIES) {
        await catCol.add({
          ...cat,
          createdAt: new Date().toISOString()
        });
        console.log(`   + Created category: "${cat.name}"`);
      }
    } else {
      console.log(`   ✓ Verified ${catSnap.size} existing categories.`);
    }
  }

  // 3. Seed Departments & Programs (Only if not a factory wipeout)
  if (!options.resetData) {
    console.log('\n🏫 Checking Departments & Programs...');
    const deptCol = db.collection('departments');
    for (const dept of DEFAULT_DEPARTMENTS) {
      const dRef = deptCol.doc(dept.id);
      const existing = await dRef.get();
      if (!existing.exists) {
        await dRef.set(dept);
        console.log(`   + Created department: "${dept.name}"`);
      }
    }

    const progCol = db.collection('programs');
    const progSnap = await progCol.get();
    if (progSnap.empty) {
      for (const prog of DEFAULT_PROGRAMS) {
        await progCol.add(prog);
        console.log(`   + Created program: "${prog.name} (${prog.code})"`);
      }
    } else {
      console.log(`   ✓ Verified ${progSnap.size} existing academic programs.`);
    }
  }

  // 4. Seed System Settings
  console.log('\n⚙️  Checking System Settings...');
  const settingsRef = db.collection('settings').doc('system');
  const settingsDoc = await settingsRef.get();
  if (!settingsDoc.exists) {
    await settingsRef.set({
      systemName: 'ARCHIVIO - Unified Research Portal',
      institution: 'Southwestern University PHINMA',
      academicYear: '2026-2027',
      allowStudentSignup: true,
      allowAdviserSignup: true,
      maintenanceMode: false,
      updatedAt: new Date().toISOString()
    });
    console.log('   + Created default system settings (SWU PHINMA).');
  } else {
    console.log('   ✓ Verified system settings.');
  }

  // 5. Auto-Provision & Sync Auth Users with Firestore Roles
  console.log('\n👥 Synchronizing Auth Users with Firestore Profiles...');
  
  // Guarantee Admin Account exists in Auth
  try {
    await auth.getUserByEmail('japhetvender00@gmail.com');
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      await auth.createUser({
        email: 'japhetvender00@gmail.com',
        password: '23571113V!!!',
        displayName: 'Prince Japhet Vender (Administrator)',
        emailVerified: true
      });
      console.log('   + Auto-created admin account in Firebase Auth: japhetvender00@gmail.com');
    }
  }

  const authUsers = await auth.listUsers(100);
  
  for (const user of authUsers.users) {
    const email = (user.email || '').toLowerCase().trim();
    const isAdmin = email === 'japhetvender00@gmail.com' || email.includes('admin');
    
    // Check users collection
    const userDocRef = db.collection('users').doc(user.uid);
    
    let assignedRole = isAdmin ? 'admin' : 'student';
    let displayName = user.displayName || user.email?.split('@')[0] || 'User';

    if (email === 'japhetvender00@gmail.com') displayName = 'Prince Japhet Vender (Administrator)';
    if (email.startsWith('prdo.vender')) displayName = 'Pronce Japhet Vender';
    if (email.startsWith('jemi.zamoras')) displayName = 'Jerika Zamoras';

    if (isAdmin) {
      // 1. Set in users collection with full monitor permissions
      await userDocRef.set({
        uid: user.uid,
        email: user.email,
        displayName,
        role: 'admin',
        department: 'College of Information Technology',
        status: 'active',
        createdAt: new Date().toISOString(),
        permissions: {
          manageDeans: true,
          manageAdvisers: true,
          manageStudents: true,
          manageDepartments: true,
          viewReports: true,
          systemSettings: true
        },
        moduleAccess: {
          dashboard: true,
          reports: true,
          allUsers: true,
          activityLogs: true
        }
      }, { merge: true });

      // 2. Also register in admins collection
      await db.collection('admins').doc(user.uid).set({
        uid: user.uid,
        email: user.email,
        displayName,
        role: 'admin',
        status: 'active',
        createdAt: new Date().toISOString()
      }, { merge: true });

      console.log(`   👑 Provisioned SYSTEM ADMIN: ${user.email} (${displayName})`);
    } else {
      // Non-admin user (student)
      await userDocRef.set({
        uid: user.uid,
        email: user.email,
        displayName,
        role: 'student',
        status: 'active',
        department: 'College of Information Technology',
        program: 'Bachelor of Science in Information Technology',
        createdAt: new Date().toISOString()
      }, { merge: true });

      // Also ensure in students collection
      await db.collection('students').doc(user.uid).set({
        uid: user.uid,
        email: user.email,
        displayName,
        role: 'student',
        status: 'active',
        department: 'College of Information Technology',
        program: 'Bachelor of Science in Information Technology',
        createdAt: new Date().toISOString()
      }, { merge: true });

      console.log(`   🎓 Provisioned STUDENT: ${user.email} (${displayName})`);
    }
  }

  console.log('\n======================================================');
  console.log('🎉 SUCCESS: ARCHIVIO is 100% Ready for Capstone Defense!');
  console.log('======================================================\n');
}

// Support CLI execution: node seed-defense.js [--reset]
if (require.main === module) {
  const shouldReset = process.argv.includes('--reset');
  seedDatabase({ resetData: shouldReset })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Bootstrap Error:', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase, DEFAULT_REQUIREMENTS, DEFAULT_CATEGORIES, DEFAULT_DEPARTMENTS, DEFAULT_PROGRAMS };
