import { Boom } from "@hapi/boom";
import {
  AnyMessageContent,
  delay,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  makeWALegacySocket,
  useSingleFileLegacyAuthState,
} from "@adiwajshing/baileys";
import MAIN_LOGGER from "./../Utils/logger";
import chalk from "chalk";

const logger = MAIN_LOGGER.child({});
logger.level = "debug";
// the store maintains the data of the WA connection in memory
// can be written out to a file & read from it
const CLIENT_ID = "david14";
const CLIENT_STORAGE = `./session/storage/${CLIENT_ID}-legacy.json`;
const CLIENT_AUTH = `./session/auth/${CLIENT_ID}-legacy.json`;

const store = makeInMemoryStore({ logger });
store.readFromFile(CLIENT_STORAGE);
// save every 10s
setInterval(() => {
  store.writeToFile(CLIENT_STORAGE);
}, 10_000);

const { state, saveState } = useSingleFileLegacyAuthState(CLIENT_AUTH);

// start a socket connection Client
const startSock = async () => {
  // fetch latest version of WA Web
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(
    "=============================================================== \n",
    chalk.blue(`Using WA v${version.join(".")}, isLatest: ${isLatest} \n`),
    "=============================================================== \n"
  );

  const sock = makeWALegacySocket({
    version,
    logger,
    browser: [
      "david14", // Browser Host
      "Chrome", // Browser Type  Chrome|Firefox|Safari|Custom name
      "22.20", // Browser Version
    ],
    printQRInTerminal: true,
    auth: state,
  });

  store.bind(sock.ev);

  const sendMessageWTyping = async (msg: AnyMessageContent, jid: string) => {
    await sock.presenceSubscribe(jid);
    await delay(500);

    await sock.sendPresenceUpdate("composing", jid);
    await delay(2000);

    await sock.sendPresenceUpdate("paused", jid);

    await sock.sendMessage(jid, msg);
  };

  sock.ev.on("messages.upsert", async (m) => {
    if (m.type === "append" || m.type === "notify") {
      console.log(JSON.stringify(m, undefined, 2));
    }

    const msg = m.messages[0];
    if (!msg.key.fromMe && m.type === "notify") {
      console.log("replying to", m.messages[0].key.remoteJid);
      await sock!.chatRead(msg.key, 1);
      await sendMessageWTyping({ text: "Hello there!" }, msg.key.remoteJid);
    }
  });

  sock.ev.on("messages.update", (m) => {
    console.log("==================================================");
    console.log(JSON.stringify(m, undefined, 2));
    console.log("==================================================");
  });

  sock.ev.on("presence.update", (m) => console.log(m));
  sock.ev.on("chats.update", (m) => console.log(m));
  sock.ev.on("contacts.update", (m) => console.log(m));

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      // reconnect if not logged out
      if (
        (lastDisconnect.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut
      ) {
        startSock();
      } else {
        console.log("connection closed");
      }
    }

    console.log("connection update", update);
  });

  // listen for when the auth credentials is updated
  sock.ev.on("creds.update", saveState);

  return sock;
};

startSock();
