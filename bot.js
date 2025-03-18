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
bot.command("remind", async (ctx) => {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const args = ctx.message.text.split(" ").slice(1);

  if (args.length < 1) {
    return ctx.reply("❌ Usage: /remind [DD[/MM[/YYYY]]] [HH:mm] Reminder text");
  }

  let time = "00:00"; // Default time is 00:00
  let messageParts = args;
  
  // Check if a time is provided
  const timeIndex = args.findIndex((arg) => arg.match(/^\d{1,2}:\d{2}$/));
  if (timeIndex !== -1) {
    time = args[timeIndex];
    messageParts = args.slice(timeIndex + 1);
  }

  if (messageParts.length === 0) {
    return ctx.reply("❌ Please provide a reminder message.");
  }

  const message = messageParts.join(" ");

  // Extract date
  const dateParts = args.slice(0, timeIndex === -1 ? args.length : timeIndex).join("").split("/");
  const now = moment();
  let day = now.date();
  let month = now.month() + 1; // Moment months are 0-indexed
  let year = now.year();

  if (dateParts.length === 1 && dateParts[0]) {
    day = parseInt(dateParts[0]);
  } else if (dateParts.length === 2) {
    day = parseInt(dateParts[0]);
    month = parseInt(dateParts[1]);
  } else if (dateParts.length === 3) {
    day = parseInt(dateParts[0]);
    month = parseInt(dateParts[1]);
    year = parseInt(dateParts[2]);
  }

  // Validate date and time
  const scheduledTime = moment(`${day}/${month}/${year} ${time}`, "D/M/YYYY HH:mm", true);
  if (!scheduledTime.isValid()) {
    return ctx.reply("❌ Invalid date or time format.");
  }

  // Save reminder to Firestore
  const docRef = await db.collection("scheduledMessages").add({
    userId,
    chatId,
    message,
    scheduledTime: scheduledTime.toISOString(),
  });

  ctx.reply(`✅ Reminder set for ${scheduledTime.format("D MMM YYYY, HH:mm")} - "${message}"`);
});



bot.command("birthday", async (ctx) => {
  const chatId = ctx.chat.id;
  const args = ctx.message.text.split(" ").slice(1);

  if (args.length < 2) {
    return ctx.reply("❌ Usage: /birthday DD/MM Name_of_person");
  }

  const [date, ...nameArray] = args;
  const name = nameArray.join(" ");

  if (!moment(date, "DD/MM", true).isValid()) {
    return ctx.reply("❌ Invalid date format! Use DD/MM.");
  }

  // Check if the birthday already exists in Firestore
  const snapshot = await db.collection("birthdays").where("chatId", "==", chatId).where("name", "==", name).get();

  if (!snapshot.empty) {
    return ctx.reply(`⚠️ ${name}'s birthday is already saved.`);
  }

  await db.collection("birthdays").add({
    chatId,
    name,
    date,
    lastSent: "" // Initialize lastSent to empty
  });

  ctx.reply(`✅ Birthday reminder set for ${name} on ${date}.`);
});



// Webhook route
app.post(`/${process.env.BOT_TOKEN}`, (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
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
