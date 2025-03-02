require('dotenv').config();
const axios = require('axios');
const admin = require('firebase-admin');
const moment = require('moment');

// Initialize Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;



const botToken = process.env.BOT_TOKEN;
if (!botToken) {
  console.error("BOT_TOKEN is not defined!");
  process.exit(1);
}

const firebaseAdmin = require("firebase-admin");

try {
  const firebaseCredentials = JSON.parse(process.env.FIREBASE_CREDENTIALS);
  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(firebaseCredentials),
  });
} catch (error) {
  console.error("Error parsing FIREBASE_CREDENTIALS:", error);
  process.exit(1);
}




(async () => {
  const now = moment().toISOString();
  const snapshot = await db.collection('scheduledMessages').where('scheduledTime', '<=', now).get();

  if (snapshot.empty) return console.log('No messages to send.');

  snapshot.forEach(async (doc) => {
    const { chatId, message } = doc.data();
    await axios.post(TELEGRAM_API, { chat_id: chatId, text: message });
    await db.collection('scheduledMessages').doc(doc.id).delete();
    console.log(`Sent: ${message}`);
  });
})();
