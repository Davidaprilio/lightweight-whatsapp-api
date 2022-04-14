import makeWASocket, { DisconnectReason } from "@adiwajshing/baileys";
import { Boom } from "@hapi/boom";

async function connectToWhatsAppMultiDevice() {
  const sock = makeWASocket({
    // can provide additional config here
    printQRInTerminal: true,
  });
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      // cek apakah butuh menyambungkan ulang
      const shouldReconnect =
        (lastDisconnect.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;

      console.log(
        `[💥] Connection closed due to "${lastDisconnect.error.message}"`
      );
      console.log(`[🔄]reconnecting`, shouldReconnect);

      // Harus terhubung kembali true
      if (shouldReconnect) {
        if (lastDisconnect.error.message === "QR refs attempts ended") {
          return "App Stop QR attempt out";
        } else {
          connectToWhatsAppMultiDevice();
        }
      }
    } else if (connection === "open") {
      console.log("opened connection");
    }
  });
  sock.ev.on("messages.upsert", (m) => {
    console.log(JSON.stringify(m, undefined, 2));

    console.log("replying to", m.messages[0].key.remoteJid);
    sock.sendMessage(m.messages[0].key.remoteJid!, { text: "Hello there!" });
  });
}
// run in main file
connectToWhatsAppMultiDevice();
