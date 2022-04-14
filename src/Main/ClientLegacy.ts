import { Boom } from "@hapi/boom";
import fs from "fs";
import {
  AnyMessageContent,
  delay,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  makeWALegacySocket,
  useSingleFileLegacyAuthState,
} from "@adiwajshing/baileys";

import MAIN_LOGGER from "../Utils/logger";
// const logger = MAIN_LOGGER.child({});
// logger.level = "debug";

interface Client {
  id: string;
  auth: string;
  store: string;
}

export class ClientLegacy {
  private sockClient: Client;
  private sock: any;
  private state: any;
  private saveState: any;
  private store: any;
  private logger: any;
  private versionBaileys: object;

  constructor(client_id: string) {
    this.sockClient = {
      id: client_id,
      auth: `./session/auth/${client_id}-legacy.json`,
      store: `./session/storage/${client_id}-legacy.json`,
    };

    const logger = MAIN_LOGGER.child({});
    logger.level = "debug";

    this.logger = logger;
    this.store = makeInMemoryStore({ logger });
    this.store.readFromFile(this.sockClient.store);
  }

  startSock = async () => {
    // save every 10s
    // setInterval(() => {
    //   store.writeToFile(this.sockClient.store);
    // }, 10_000);

    // buat sock dari client yang diberikan
    await this.createSock(this.sockClient.id);

    this.store.bind(this.sock.ev);

    const sendMessageWTyping = async (msg: AnyMessageContent, jid: string) => {
      await this.sock.presenceSubscribe(jid);
      await delay(500);

      await this.sock.sendPresenceUpdate("composing", jid);
      await delay(2000);

      await this.sock.sendPresenceUpdate("paused", jid);

      await this.sock.sendMessage(jid, msg);
    };

    this.sock.ev.on("messages.upsert", async (m: any) => {
      if (m.type === "append" || m.type === "notify") {
        console.log(JSON.stringify(m, undefined, 2));
      }

      const msg = m.messages[0];
      if (!msg.key.fromMe && m.type === "notify") {
        console.log("replying to", m.messages[0].key.remoteJid);
        await this.sock!.chatRead(msg.key, 1);
        await sendMessageWTyping({ text: "Hello there!" }, msg.key.remoteJid);
      }
    });

    this.sock.ev.on("messages.update", (m: any) => {
      console.log("==================================================");
      console.log(JSON.stringify(m, undefined, 2));
      console.log("==================================================");
    });

    // this.sock.ev.on("presence.update", (m: any) => console.log(m));
    this.sock.ev.on("chats.update", (m: any) => console.log(m));
    // this.sock.ev.on("contacts.update", (m: any) => console.log(m));

    this.sock.ev.on("connection.update", (update: any) => {
      this.connectionUpdate(update);
    });

    // listen for when the auth credentials is updated
    this.sock.ev.on("creds.update", this.saveState);

    setInterval(() => {
      this.store.writeToFile(this.sockClient.store);
    }, 10_000);

    return this.sock;
  };

  /**
   * Membuat Sock Client
   *
   * @param host: Browser Host name
   * @param browser: Browser Type  Chrome(default)|Firefox|Safari|Custom name
   * @param browserVerison: Browser Version 22.14(default)
   * @returns Object
   */
  async createSock(
    host: string = "DevDav",
    browser: string = "Chrome",
    browserVerison: string = "22.21"
  ) {
    // Cek Latest version dari Baileys
    const { version, isLatest } = await fetchLatestBaileysVersion();
    this.versionBaileys = { version, isLatest };

    console.log("==========================================================");
    console.log(` Using WA v${version.join(".")}, isLatest: ${isLatest}`);
    console.log("==========================================================");

    // coba mengambil auth session
    const { state, saveState } = useSingleFileLegacyAuthState(
      this.sockClient.auth
    );

    this.state = state;
    this.saveState = saveState;

    // membuat socket
    this.sock = makeWALegacySocket({
      version,
      logger: this.logger,
      browser: [host, browser, browserVerison],
      printQRInTerminal: true,
      auth: state,
    });

    return this.sock;
  }

  connectionUpdate(update: any) {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      // reconnect if not logged out
      if (
        (lastDisconnect.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut
      ) {
        const msg = lastDisconnect.error.message;
        console.log("connection Debug:", msg);
        // jika device waBeta pindahkan ke socket Beta
        if (msg == "Require multi-device edition") {
          console.log("Pindah Socket ke Beta 🏃‍♂️");
        } else {
          this.startSock();
        }
      } else {
        // Mungkin nang kene iki ke logout
        console.log("connection closed");
        if (fs.existsSync(this.sockClient.auth)) {
          fs.rmSync(this.sockClient.auth, { recursive: true, force: true });
        }
        if (fs.existsSync(this.sockClient.store)) {
          fs.rmSync(this.sockClient.store, { recursive: true, force: true });
        }
      }
    }

    // console.log("connection update", update);
  }
}
