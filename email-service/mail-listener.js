const { getFirestore } = require('firebase-admin/firestore');

function setupMailListener(transporter) {
  const db = getFirestore();
  console.log('📬 Setting up Firestore mail listener...');

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

            const mailOptions = {
              from: process.env.EMAIL_USER || '"ARCHIVIO" <noreply@archivio.com>',
              to: docData.to,
              subject: docData.message?.subject || 'ARCHIVIO Notification',
              html: docData.message?.html || docData.message?.text || 'You have a new notification.'
            };

            const info = await transporter.sendMail(mailOptions);
            
            // Mark as success
            await docRef.update({
              'delivery.state': 'SUCCESS',
              'delivery.endTime': new Date(),
              'delivery.info': {
                messageId: info.messageId,
                response: info.response
              }
            });

            console.log(`✅ Mail sent successfully to ${docData.to}`);
          } catch (error) {
            console.error(`❌ Failed to send mail to ${docData.to}:`, error);
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
