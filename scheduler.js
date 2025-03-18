require("dotenv").config();
const axios = require("axios");
const admin = require("firebase-admin");
const moment = require("moment");

// Initialize Firebase
const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf-8")
);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

// Function to send a Telegram message
const sendMessage = async (chatId, text) => {
  try {
    await axios.post(TELEGRAM_API, { chat_id: chatId, text });
    console.log(`✅ Sent: ${text}`);
  } catch (error) {
    console.error("❌ Error sending message:", error.response?.data || error);
  }
};

// 🔥 1️⃣ Process Scheduled Reminders
(async () => {
  const now = moment().toISOString();
  const snapshot = await db
    .collection("scheduledMessages")
    .where("scheduledTime", "<=", now)
    .get();

  if (snapshot.empty) {
    console.log("⏳ No scheduled messages to send.");
  } else {
    for (const doc of snapshot.docs) {
      const { chatId, message } = doc.data();
      await sendMessage(chatId, message);
      await db.collection("scheduledMessages").doc(doc.id).delete();
    }
  }
})();

// 🔥 2️⃣ Process Birthday Reminders
(async () => {
  const now = new Date();
  const today = now.toLocaleDateString("en-GB").slice(0, 5); // Get DD/MM
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString("en-GB").slice(0, 5);

  // Fetch all birthdays from Firestore
  const snapshot = await db.collection("birthdays").get();

  if (!snapshot.empty) {
    for (const doc of snapshot.docs) {
      const { chatId, name, date } = doc.data();

      if (date === today) {
        await sendMessage(chatId, `🎂 Today is ${name}'s birthday! 🎊`);
      } else if (date === tomorrowStr) {
        await sendMessage(chatId, `🎉 Reminder: ${name}'s birthday is tomorrow!`);
      }
    }
  }
})();
