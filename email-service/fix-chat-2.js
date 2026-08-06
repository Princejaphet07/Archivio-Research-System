const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function fixChatNames() {
  console.log('Fixing old chat sender names...');
  const groupsSnap = await db.collection('groups').get();
  
  for (const groupDoc of groupsSnap.docs) {
    const messagesSnap = await db.collection(`chats/${groupDoc.id}/messages`).get();
    
    for (const msgDoc of messagesSnap.docs) {
      const data = msgDoc.data();
      if (data.senderName === 'Adviser' && data.senderRole === 'student') {
        let newName = 'Student';
        const userSnap = await db.collection('users').doc(data.senderUid).get();
        if (userSnap.exists) {
          newName = userSnap.data().displayName;
        }
        await db.collection(`chats/${groupDoc.id}/messages`).doc(msgDoc.id).update({
          senderName: newName
        });
        console.log(`- Re-updated student to ${newName}`);
      }
    }
  }
  console.log('Done!');
  process.exit(0);
}

fixChatNames();
