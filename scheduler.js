require('dotenv').config();
const axios = require('axios');
const admin = require('firebase-admin');
const moment = require('moment');

// Initialize Firebase
const serviceAccount = require("./serviceAccountKey.json"); // Directly import the file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

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
