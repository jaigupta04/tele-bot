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


require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');
const fs = require('fs');


// Load environment variables
const botToken = process.env.BOT_TOKEN;

// Initialize Firebase
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();


// Initialize Telegram Bot
const bot = new TelegramBot(botToken, { polling: true });

// Handle file uploads
bot.on('message', async (msg) => {
  if (msg.document) {
      const fileId = msg.document.file_id;
      const fileName = msg.document.file_name;
      const userId = msg.from.id;

      // Save file metadata to Firestore
      await db.collection('files').add({
          fileId,
          fileName,
          userId,
          date: admin.firestore.FieldValue.serverTimestamp()
      });

      bot.sendMessage(msg.chat.id, `✅ File *${fileName}* uploaded successfully!`, { parse_mode: 'Markdown' });
  }
});

// Retrieve file using command `/getfile <file_name>`
bot.onText(/\/getfile (.+)/, async (msg, match) => {
  const fileName = match[1];
  const userId = msg.from.id;

  // Retrieve file metadata from Firestore
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

// Command to list all uploaded files
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
