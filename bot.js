import express from "express";
import { Telegraf } from "telegraf";
import admin from "firebase-admin";
import dotenv from "dotenv";
import moment from "moment";

dotenv.config();

// Initialize Firebase
const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf-8")
);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Initialize Express
const app = express();
app.use(express.json());

// Initialize Telegram Bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Handle /Hello command
bot.command("hello", (ctx) => {
  ctx.reply("✅ Bot is active!");
});

// Handle /schedule command
bot.command("schedule", async (ctx) => {

  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const args = ctx.message.text.split(" ").slice(1);

  if (args.length < 2) {
    return ctx.reply("❌ Usage: /schedule HH:mm Your Message");
  }
  
  const [time, ...messageArray] = args;
  const message = messageArray.join(" ");

  if (!moment(time, "HH:mm", true).isValid()) {
    return ctx.reply("❌ Invalid time format! Use HH:mm (24-hour format).");
  }

  const scheduledTime = moment(time, "HH:mm").toISOString();

  const docRef = await db.collection("scheduledMessages").add({
    userId,
    chatId,
    message,
    scheduledTime,
  });
  console.log("Firestore write successful:", docRef.id); 

  ctx.reply(`✅ Scheduled: "${message}" at ${time}`);
});

// Webhook route
app.post("/", (req, res) => {
  console.log("Incoming request:", req.body); 
  try {
    bot.handleUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error);
    res.sendStatus(500);
  }
});

// 🔥 Prevent Vercel from sleeping
setInterval(() => {
  fetch("https://tele-bot-rosy.vercel.app/")
    .then(() => console.log("Keeping Vercel awake"))
    .catch(() => console.log("Vercel wake-up failed"));
}, 5 * 60 * 1000); // Every 5 minutes

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  // Set webhook
  const webhookURL = `https://tele-bot-rosy.vercel.app/`;
  await bot.telegram.setWebhook(webhookURL);
  console.log(`Webhook set: ${webhookURL}`);
});

export default app;
