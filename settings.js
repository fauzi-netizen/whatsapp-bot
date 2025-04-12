module.exports = {
  // 1. Pengaturan Owner
  owner: {
    number: "62895418378531",    // Nomor owner (WA)
    name: "Owner Bot"           // Nama owner
  },

  // 2. Pengaturan Pembayaran
  payment: {
    dana: "0895418378531",
    ovo: "0895418378531",
    gopay: "0895418378531"
  },

  // 3. Pengaturan Grup
  group: {
    welcomeMessage: "👋 Selamat datang @user di grup!",
    antiLink: true,             // Aktifkan anti link
    muteDuration: "1h"          // Durasi mute jika melanggar
  },

  // 4. Pengaturan Sticker
  sticker: {
    packName: "My Bot Sticker",
    author: "My Bot"
  },

  // 5. Pengaturan Database
  database: {
    url: "mongodb://localhost:27017",  // Jika pakai MongoDB
    name: "whatsapp_bot"
  }
};