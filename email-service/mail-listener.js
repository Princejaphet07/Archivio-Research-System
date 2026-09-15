const { getFirestore } = require('firebase-admin/firestore');

function setupMailListener(transporter, sendSystemEmail) {
  const db = getFirestore();
  console.log('📬 Setting up Firestore mail listener with redundant failover...');

  // Listen to the 'mail' collection for new documents
  db.collection('mail')
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const docData = change.doc.data();
          const docRef = change.doc.ref;

          // If it's already processed, skip
          if (docData.delivery && (docData.delivery.state === 'SUCCESS' || docData.delivery.state === 'ERROR')) {
            return;
          }

          try {
            // Mark as processing
            await docRef.update({
              'delivery.state': 'PENDING',
              'delivery.startTime': new Date()
            });

            const emailPayload = {
              to: docData.to,
              subject: docData.message?.subject || 'ARCHIVIO Notification',
              html: docData.message?.html || docData.message?.text || 'You have a new notification.'
            };

            let dispatchInfo;
            if (typeof sendSystemEmail === 'function') {
              dispatchInfo = await sendSystemEmail(emailPayload);
            } else if (transporter) {
              dispatchInfo = await transporter.sendMail({
                from: process.env.EMAIL_USER || '"ARCHIVIO" <noreply@archivio.com>',
                ...emailPayload
              });
            } else {
              throw new Error('No email transport or webhook configured');
            }
            
            // Mark as success
            await docRef.update({
              'delivery.state': 'SUCCESS',
              'delivery.endTime': new Date(),
              'delivery.info': dispatchInfo || { status: 'sent' }
            });

            console.log(`✅ Mail listener dispatched successfully to ${docData.to}`);
          } catch (error) {
            console.error(`❌ Mail listener failed to send to ${docData.to}:`, error.message);
            // Mark as error
            await docRef.update({
              'delivery.state': 'ERROR',
              'delivery.endTime': new Date(),
              'delivery.error': error.message
            });
          }
        }
      });
    }, (error) => {
      console.error('❌ Firestore mail listener error:', error);
    });
}

module.exports = { setupMailListener };
