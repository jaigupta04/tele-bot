require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');

// Initialize Firebase
const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Initialize the bot (without polling)
const bot = new TelegramBot(process.env.BOT_TOKEN);
// const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Webhook API Route (Vercel Serverless Function)
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const body = req.body;
  bot.processUpdate(body);
  res.status(200).json({ status: "OK" });
};

// Handle file uploads
bot.on('message', async (msg) => {
  if (msg.document) {
    const fileId = msg.document.file_id;
    const fileName = msg.document.file_name;
    const userId = msg.from.id;

    // Save to Firestore
    await db.collection('files').add({
      fileId,
      fileName,
      userId,
      date: admin.firestore.FieldValue.serverTimestamp(),
    });

    bot.sendMessage(msg.chat.id, `✅ File *${fileName}* uploaded successfully!`, { parse_mode: 'Markdown' });
  }
});

// Retrieve file using `/getfile <file_name>`
bot.onText(/\/getfile (.+)/, async (msg, match) => {
  const fileName = match[1];
  const userId = msg.from.id;

  const fileRef = await db.collection('files')
    .where('fileName', '==', fileName)
    .where('userId', '==', userId)
    .get();

  if (!fileRef.empty) {
    const file = fileRef.docs[0].data();
    bot.sendDocument(msg.chat.id, file.fileId);
  } else {
    bot.sendMessage(msg.chat.id, `❌ File *${fileName}* not found.`, { parse_mode: 'Markdown' });
  }
});

// List all files using `/listfiles`
bot.onText(/\/listfiles/, async (msg) => {
  const userId = msg.from.id;
  const filesRef = await db.collection('files')
    .where('userId', '==', userId)
    .orderBy('date', 'desc')
    .get();

  if (filesRef.empty) {
    return bot.sendMessage(msg.chat.id, "No files found.");
  }

  let response = "📂 *Your Files:*\n";
  filesRef.forEach(doc => {
    response += `📌 ${doc.data().fileName}\n`;
  });

  bot.sendMessage(msg.chat.id, response, { parse_mode: 'Markdown' });
});
