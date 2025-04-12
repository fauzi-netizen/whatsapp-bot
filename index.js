require('dotenv').config();
const { makeWASocket, useSingleFileAuthState, delay } = require('@whiskeysockets/baileys');
const fs = require('fs-extra');
const path = require('path');
const express = require('express');
const axios = require('axios');
const moment = require('moment');
const { Low, JSONFile } = require('lowdb');
const app = express();
const PORT = process.env.PORT || 3000;

// Setup database
const adapter = new JSONFile(path.join(__dirname, 'data', 'products.json'));
const db = new Low(adapter);

// Inisialisasi database
async function initDB() {
  await db.read();
  db.data ||= { products: [], orders: [] };
  await db.write();
}

// Config paths
const STICKER_PATH = path.join(__dirname, 'assets', 'stickers');
const IMAGE_PATH = path.join(__dirname, 'assets', 'images');

// Buat folder jika belum ada
fs.ensureDirSync(STICKER_PATH);
fs.ensureDirSync(IMAGE_PATH);
fs.ensureDirSync(path.join(__dirname, 'data'));

// Inisialisasi WhatsApp
async function startBot() {
  await initDB();
  
  const { state, saveState } = useSingleFileAuthState('./auth_info.json');
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ['Bot WA Full Fitur', '', ''],
    getMessage: async (key) => {
      return null;
    }
  });

  // Handle pairing code
  sock.ev.on('connection.update', (update) => {
    const { connection, qr, pairingCode } = update;
    
    if (pairingCode) {
      console.log('╔════════════════════════════════════════╗');
      console.log('║          KODE PAIRING BOT WA           ║');
      console.log('╠════════════════════════════════════════╣');
      console.log(`║ Kode: ${pairingCode}                  ║`);
      console.log('╚════════════════════════════════════════╝');
      
      // Kirim pairing code ke owner via WhatsApp
      sock.sendMessage('62895418378531@s.whatsapp.net', { 
        text: `Kode Pairing Bot: ${pairingCode}\n\nGunakan kode ini untuk menghubungkan bot ke perangkat Anda.`
      });
    }
    
    if (connection === 'open') {
      console.log('Bot terhubung!');
      sendToOwner(sock, '🤖 Bot telah aktif!');
    }
    
    if (connection === 'close') {
      console.log('Koneksi terputus, mencoba menghubungkan kembali...');
      setTimeout(() => startBot(), 5000);
    }
  });

  // Simpan session
  sock.ev.on('creds.update', saveState);

  // Handle pesan
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const text = msg.message.conversation?.toLowerCase() || '';
    const isGroup = msg.key.remoteJid.endsWith('@g.us');
    const pushName = msg.pushName || 'Pengguna';

    try {
      // [FITUR UTAMA] ===================================
      if (text === '!allmenu') await sendAllMenu(sock, sender);
      else if (text === '!menu') await sendMainMenu(sock, sender);
      else if (text === '!gamemenu') await sendGameMenu(sock, sender);
      else if (text === '!aimenu') await sendAiMenu(sock, sender);
      else if (text === '!owner') await sendOwnerInfo(sock, sender);
      
      // [FITUR STICKER] =================================
      else if ((text === '!sticker' || text === '!stiker') && msg.message.imageMessage) {
        await createSticker(sock, msg, 'full');
      }
      else if ((text === '!stickercrop' || text === '!stikercrop') && msg.message.imageMessage) {
        await createSticker(sock, msg, 'crop');
      }
      
      // [FITUR JUALAN] ==================================
      else if (text === '!produk') await sendProductList(sock, sender);
      else if (text === '!order') await sendOrderInfo(sock, sender);
      else if (text === '!payment') await sendPaymentInfo(sock, sender);
      else if (text.startsWith('!beli ')) await handleOrder(sock, sender, text.substring(6), pushName);
      
      // [FITUR GRUP] ====================================
      else if (isGroup) {
        await handleGroupMessage(sock, msg, pushName);
      }
      
      // [FITUR AI] ======================================
      else if (text.startsWith('!ai ')) {
        const question = text.substring(4);
        await sendAiResponse(sock, sender, question, pushName);
      }
      
    } catch (error) {
      console.error('Error:', error);
      await sock.sendMessage(sender, { text: '⚠️ Terjadi kesalahan saat memproses permintaan Anda.' });
    }
  });

  // Web Server
  app.get('/', (req, res) => {
    res.send('WhatsApp Bot Full Fitur Active');
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// ==================== FUNGSI BANTUAN ====================

async function sendToOwner(sock, message) {
  await sock.sendMessage('62895418378531@s.whatsapp.net', { text: message });
}

async function sendAllMenu(sock, jid) {
  const menu = `
📱 *ALL MENU BOT WHATSAPP* 📱

🛍️ *FITUR JUALAN:*
!produk - Lihat daftar produk
!order - Cara pemesanan
!payment - Info pembayaran
!beli [kode_produk] - Beli produk

🎮 *FITUR GAME:*
!tebakgambar - Game tebak gambar
!tebakkata - Game tebak kata
!kuis - Kuis harian

🤖 *FITUR AI:*
!ai [pertanyaan] - Tanya ke AI
!aimenu - Menu lengkap AI

🖼️ *FITUR STICKER:*
!sticker - Buat sticker dari gambar
!stickercrop - Buat sticker cropped

👥 *FITUR GRUP:*
!antilink on/off - Atur anti link
!welcome on/off - Atur welcome
!promote @user - Jadikan admin
!demote @user - Turunkan admin

ℹ️ *LAINNYA:*
!menu - Menu utama
!owner - Hubungi owner
!info - Info bot

🔗 *Payment:* DANA 0895-4183-78531
`;
  await sock.sendMessage(jid, { text: menu });
}

async function sendPaymentInfo(sock, jid) {
  const payment = `
💳 *INFO PEMBAYARAN* 💳

Pembayaran bisa melalui:
1. *DANA:* 0895-4183-78531 (A/N: Owner)
2. *OVO:* 0895-4183-78531
3. *GOPAY:* 0895-4183-78531
4. *Bank Transfer:* 
   - BCA: 1234567890
   - BRI: 0987654321

📌 *Setelah transfer:*
1. Screenshot bukti transfer
2. Kirim ke owner dengan format:
   !konfirmasi [kode_produk] [nominal]
   
Contoh:
!konfirmasi P001 50000
`;
  await sock.sendMessage(jid, { text: payment });
}

async function createSticker(sock, msg, type) {
  const buffer = await sock.downloadMediaMessage(msg);
  const stickerPath = path.join(STICKER_PATH, `sticker_${Date.now()}.webp`);
  
  await fs.writeFile(stickerPath, buffer);
  await sock.sendMessage(msg.key.remoteJid, {
    sticker: { url: stickerPath },
    mimetype: 'image/webp'
  });
  
  await fs.unlink(stickerPath);
}

async function handleGroupMessage(sock, msg, pushName) {
  const text = msg.message.conversation?.toLowerCase() || '';
  const groupJid = msg.key.remoteJid;
  const participant = msg.key.participant;
  
  // Welcome message
  if (msg.message?.protocolMessage?.type === 5) {
    const welcome = `
👋 *Selamat datang* @${pushName} di grup!

📌 *Peraturan Grup:*
1. Dilarang spam
2. Dilarang share link
3. Harap sopan

Jangan lupa baca deskripsi grup!
`;
    await sock.sendMessage(groupJid, { 
      text: welcome,
      mentions: [participant]
    });
    return;
  }
  
  // Anti link
  if ((text.includes('http://') || text.includes('https://') || text.includes('www.')) {
    await sock.sendMessage(groupJid, {
      text: `@${pushName}, maaf tidak boleh share link di grup ini!`,
      mentions: [participant]
    });
    
    await delay(2000);
    await sock.groupParticipantsUpdate(groupJid, [participant], 'remove');
    return;
  }
  
  // Fitur admin grup
  if (text.startsWith('!promote ') && msg.key.fromMe) {
    const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
    if (mentioned && mentioned.length > 0) {
      await sock.groupParticipantsUpdate(groupJid, mentioned, 'promote');
    }
  }
  
  if (text.startsWith('!demote ') && msg.key.fromMe) {
    const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
    if (mentioned && mentioned.length > 0) {
      await sock.groupParticipantsUpdate(groupJid, mentioned, 'demote');
    }
  }
}

// ==================== PRODUK & ORDER ====================

async function sendProductList(sock, jid) {
  await db.read();
  const products = db.data.products;
  
  if (products.length === 0) {
    await sock.sendMessage(jid, { text: '📭 Belum ada produk yang tersedia.' });
    return;
  }
  
  let productList = '🛒 *DAFTAR PRODUK* 🛒\n\n';
  products.forEach((prod, i) => {
    productList += `*${i+1}. ${prod.name}*
Kode: ${prod.code}
Harga: Rp ${prod.price.toLocaleString()}
Stok: ${prod.stock}\n\n`;
  });
  
  productList += 'Ketik !beli [kode_produk] untuk memesan.';
  await sock.sendMessage(jid, { text: productList });
}

async function handleOrder(sock, jid, productCode, buyerName) {
  await db.read();
  const product = db.data.products.find(p => p.code === productCode.toUpperCase());
  
  if (!product) {
    await sock.sendMessage(jid, { text: '❌ Produk tidak ditemukan. Ketik !produk untuk melihat daftar.' });
    return;
  }
  
  if (product.stock <= 0) {
    await sock.sendMessage(jid, { text: '❌ Maaf, stok produk ini habis.' });
    return;
  }
  
  // Simpan order
  const order = {
    id: `ORD-${Date.now()}`,
    productCode: product.code,
    productName: product.name,
    price: product.price,
    buyer: buyerName,
    buyerJid: jid,
    date: new Date().toISOString(),
    status: 'pending'
  };
  
  db.data.orders.push(order);
  product.stock -= 1;
  await db.write();
  
  // Kirim konfirmasi ke pembeli
  await sock.sendMessage(jid, { 
    text: `✅ *Pesanan Diterima!*
    
Produk: ${product.name}
Kode: ${product.code}
Harga: Rp ${product.price.toLocaleString()}
Order ID: ${order.id}

Silakan transfer ke:
DANA: 0895-4183-78531

Setelah transfer, kirim bukti dengan format:
!konfirmasi ${order.id} [nominal]`
  });
  
  // Kirim notifikasi ke owner
  await sendToOwner(sock, 
    `📦 *Ada Pesanan Baru!*
    
Produk: ${product.name}
Pembeli: ${buyerName}
Order ID: ${order.id}
Harga: Rp ${product.price.toLocaleString()}
`);
}

// Mulai bot
startBot().catch(err => console.error('Error starting bot:', err));
