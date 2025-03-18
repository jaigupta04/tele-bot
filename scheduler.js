require("dotenv").config();
const axios = require("axios");
const admin = require("firebase-admin");
const moment = require("moment");

const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf-8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;


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
  const now = moment();
  const today = now.format("DD/MM"); 
  const birthdaySnapshot = await db.collection("birthdays").get();
  
  birthdaySnapshot.forEach(async (doc) => {
    const { chatId, name, date, lastSent } = doc.data();

    if (date === today) {
      if (lastSent === now.format("YYYY-MM-DD")) return;

      await axios.post(TELEGRAM_API, { chat_id: chatId, text: `🎉 Today is ${name}'s birthday! 🎂` });
      await db.collection("birthdays").doc(doc.id).update({ lastSent: now.format("YYYY-MM-DD") });
      console.log(`Sent birthday reminder for ${name}`);
    }

    if (now.format("HH:mm") === "18:00") {
      const tomorrow = now.clone().add(1, "day").format("DD/MM");
      if (date === tomorrow && lastSent !== now.format("YYYY-MM-DD") + " pre") {
        await axios.post(TELEGRAM_API, { chat_id: chatId, text: `⚠️ Reminder: Tomorrow is ${name}'s birthday! 🎂` });
        await db.collection("birthdays").doc(doc.id).update({ lastSent: now.format("YYYY-MM-DD") + " pre" });
        console.log(`Sent pre-birthday reminder for ${name}`);
      }
    }
  });

})();
