import dotenv from "dotenv";
import axios from "axios";
import admin from "firebase-admin";
import moment from "moment-timezone";

dotenv.config();

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

const sendMessage = async (chatId, message) => {
  await axios.post(TELEGRAM_API, { chat_id: chatId, text: message });
};

// Function to send scheduled reminders
const sendReminders = async () => {
  const now = moment().tz("Asia/Kolkata").toISOString();
  const snapshot = await db.collection("scheduledMessages").where("scheduledTime", "<=", now).get();

  if (!snapshot.empty) {
    for (const doc of snapshot.docs) {
      const { chatId, message } = doc.data();
      await sendMessage(chatId, message);
      await db.collection("scheduledMessages").doc(doc.id).delete();
      console.log(`Sent reminder: ${message}`);
    }
  }
};

// Function to send birthday reminders
const sendBirthdayReminders = async () => {
  const today = moment().tz("Asia/Kolkata");
  const todayStr = today.format("DD/MM");
  const tomorrowStr = today.clone().add(1, "day").format("DD/MM");

  const snapshot = await db.collection("birthdays").get();
  
  if (!snapshot.empty) {
    for (const doc of snapshot.docs) {
      const { chatId, name, date } = doc.data();

      if (date === todayStr) {
        await sendMessage(chatId, `🎂 Today is ${name}'s birthday! 🎊`);
      } else if (date === tomorrowStr && today.format("HH:mm") === "18:00") {
        await sendMessage(chatId, `Reminder: ${name}'s birthday is tomorrow! 🎉`);
      }
    }
  }
};

// Run both functions
(async () => {
  await sendReminders();
  await sendBirthdayReminders();
})();
