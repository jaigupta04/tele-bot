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
  console.log("Received /schedule command");
  ctx.reply("✅ Bot is active!");

  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const args = ctx.message.text.split(" ").slice(1);

  console.log("Arguments received:", args);
  
  if (args.length < 2) {
    return ctx.reply("❌ Usage: /schedule HH:mm Your Message");
  }
  
  const [time, ...messageArray] = args;
  const message = messageArray.join(" ");

  if (!moment(time, "HH:mm", true).isValid()) {
    return ctx.reply("❌ Invalid time format! Use HH:mm (24-hour format).");
  }

  const scheduledTime = moment(time, "HH:mm").toISOString();
  await db.collection("scheduledMessages").add({
    userId,
    chatId,
    message,
    scheduledTime,
  });

  ctx.reply(`✅ Scheduled: "${message}" at ${time}`);
});

// Webhook route
app.post("/", (req, res) => {
  console.log("Incoming request:", req.body);  // Log incoming requests
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













// require('dotenv').config();
// const TelegramBot = require('node-telegram-bot-api');
// const admin = require('firebase-admin');
// const moment = require('moment');

// // Initialize Firebase
// const serviceAccount = JSON.parse(
//   Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf-8")
// );

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });
// const db = admin.firestore();

// // Initialize Telegram Bot
// const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// // Handle /Hello command
// bot.onText(/\/Hello/, (msg) => {
//   bot.sendMessage(msg.chat.id, '✅ Bot is active!');
// });

// // Handle /schedule command
// bot.onText(/\/schedule (.+)/, async (msg, match) => {
//   const chatId = msg.chat.id;
//   const userId = msg.from.id;
//   const [time, ...messageArray] = match[1].split(' ');
//   const message = messageArray.join(' ');
  
//   if (!moment(time, 'HH:mm', true).isValid()) {
//     return bot.sendMessage(chatId, '❌ Invalid time format! Use HH:mm (24-hour format).');
//   }

//   const scheduledTime = moment(time, 'HH:mm').toISOString();
  
//   await db.collection('scheduledMessages').add({
//     userId,
//     chatId,
//     message,
//     scheduledTime
//   });

//   bot.sendMessage(chatId, `✅ Scheduled: "${message}" at ${time}`);
// });


// (async () => {
//   require('dotenv').config();
//   const axios = require('axios');

//   const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN;
//   const TELEGRAM_CHAT_ID = -1002412065184;

//   try {
//     const { data } = await axios.post(
//       `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
//       {
//         chat_id: TELEGRAM_CHAT_ID,
//         text: "jaiiii"
//       }
//     );

//     console.log(data);
//   } catch (error) {
//     console.error("Error sending message:", error.response ? error.response.data : error);
//   }
// })();
