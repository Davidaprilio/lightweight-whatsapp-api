import { Boom } from "@hapi/boom";
import fs from "fs";
import makeWASocket, {
  AnyMessageContent,
  delay,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  makeWALegacySocket,
  useSingleFileLegacyAuthState,
  useSingleFileAuthState,
} from "@adiwajshing/baileys";
import EventEmitter from "events";
class ClientEvent extends EventEmitter {}

import MAIN_LOGGER from "../Utils/logger";
// const logger = MAIN_LOGGER.child({});
// logger.level = "debug";

interface ClientType {
  id: string;
  multiDevice: boolean;
  auth: string;
  store: string;
}

interface ClientStatus {
  // Phone Info
  os: string;
  number: string;
  // WA Client Info
  sessionName: string;
  browser: string;
  connectedAt: string;
  sessionPathAuth: string;
  authenticated: boolean;
  qrCode: string;
}

export default class Client {
  private status: string;
  private QrCode: string;

  sockClient: ClientType;
  sock: any;
  ev: any;
  private state: any;
  private saveState: any;
  private store: any;
  private logger: any;
  private versionBaileys: object;

  constructor(client_id: string, multiDevice: boolean = true) {
    const file = multiDevice ? `${client_id}.json` : `${client_id}-legacy.json`;
    this.sockClient = {
      id: client_id,
      auth: `./session/auth/${file}`,
      store: `./session/storage/${file}`,
      multiDevice,
    };

    this.ev = new ClientEvent();

    const logger = MAIN_LOGGER.child({});
    logger.level = "silent";
    this.logger = logger;

    this.setStatusDeviceDeactive();
    this.store = makeInMemoryStore({ logger });
    this.store.readFromFile(this.sockClient.store);
  }

  /**
   * Starting Socket Session Client
   */
  startSock = async () => {
    if (this.status == "active") {
      return "Device alredy connected";
    }

    // buat sock dari client yang diberikan
    await this.createSock(this.sockClient.id);

    this.store.bind(this.sock.ev);

    this.sock.ev.on("messages.upsert", async (m: any) => {
      if (m.type === "append" || m.type === "notify") {
        console.log(JSON.stringify(m, undefined, 2));
      }

      const msg = m.messages[0];
      if (!msg.key.fromMe && m.type === "notify") {
        console.log("replying to", m.messages[0].key.remoteJid);
        await this.sock!.chatRead(msg.key, 1);
        await this.sendMessageWTyping(
          { text: "Hello there!" },
          msg.key.remoteJid
        );
      }
    });

    this.sock.ev.on("messages.update", (m: any) => {
      console.log("===============  messages.update  ================");
      console.log(JSON.stringify(m, undefined, 2));
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
   * Loggout Socket Session Client
   */
  logout() {
    // this.sock.ws.close();
    this.sock.logout();
    this.removeSessionPath();
  }

  /**
   * Membuat Sock Client
   *
   * Perlu Mengisi this.sockClient.multiDevice ke true
   * terlibih dahulu jika ingin menggunakan multi device
   *
   * @param host: Browser Host name
   * @param browser: Browser Type  Chrome(default)|Firefox|Safari|Custom name
   * @param browserVerison: Browser Version 22.14(default)
   * @param multiDevice: Mode Client Legacy|MultiDevice(default)
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

    const typeMode = this.sockClient.multiDevice
      ? " Multi Device "
      : "=== Legacy ===";
    console.log(`======================${typeMode}======================`);
    console.log(` Using WA v${version.join(".")}, isLatest: ${isLatest}`);
    console.log("==========================================================");

    // coba mengambil auth session
    if (this.sockClient.multiDevice) {
      const { state, saveState } = useSingleFileAuthState(this.sockClient.auth);
      this.state = state;
      this.saveState = saveState;
      this.sock = makeWASocket({
        version,
        logger: this.logger,
        browser: [host, browser, browserVerison],
        printQRInTerminal: true,
        auth: state,
      });
    } else {
      const { state, saveState } = useSingleFileLegacyAuthState(
        this.sockClient.auth
      );
      this.state = state;
      this.saveState = saveState;
      this.sock = makeWALegacySocket({
        version,
        logger: this.logger,
        browser: [host, browser, browserVerison],
        printQRInTerminal: true,
        auth: state,
      });
    }
    return this.sock;
  }

  /**
   * Handle Connection Update
   *
   */
  private connectionUpdate(update: any) {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const err = (lastDisconnect.error as Boom)?.output;
      console.log("connection Debug:", err?.payload ?? err);

      // Reconnect jika connection close
      // tapi bukan gara-gara Logout
      if (err?.statusCode !== DisconnectReason.loggedOut) {
        const msg = lastDisconnect.error.message;

        // Mode Device Mismatch (yang scan salah mode)
        if (err?.statusCode === 411) {
          this.changeDeviceMode(msg);
          this.startSock();
        } else {
          // Memulai Socket
          this.startSock();
        }
      }
      // Handle If Logout CODE:401
      else if (err?.statusCode === DisconnectReason.loggedOut) {
        console.log("Client Is Logout");
        this.setStatusDeviceDeactive();
        this.removeSessionPath();
      }
    } // End Connection Close
    else {
      console.log("Connection Open", update);
      if (update.qr !== undefined) {
        console.log("QR Code Update");
      }
    }
    // console.log("connection update", update);
  }

  /**
   * Handle Change Device Mode
   * msg: Pesan Error dari baileys
   */
  private changeDeviceMode(msg: string) {
    // jika Legacy pindah ke socket Multidevice(Beta)
    if (msg === "Require multi-device edition") {
      console.log("Pindah Socket ke MultiDevice 🏃‍♂️");
      this.sockClient.multiDevice = true;
    }
    // jika Multidevice(Beta) pindah ke socket Legacy
    else if (msg === "Multi-device beta not joined") {
      console.log("Pindah Socket ke Legacy 🏃‍♂️");
      this.sockClient.multiDevice = false;
    }
    // kirim event mode diganti
    this.ev.emit(
      "deviceModeChanged",
      this.sockClient.multiDevice ? "MultiDevice" : "Legacy",
      this.sockClient.multiDevice
    );
  }

  /**
   * Handle Remove Session Path
   */
  private removeSessionPath() {
    if (fs.existsSync(this.sockClient.auth)) {
      fs.rmSync(this.sockClient.auth, { recursive: true, force: true });
    }
    if (fs.existsSync(this.sockClient.store)) {
      fs.rmSync(this.sockClient.store, { recursive: true, force: true });
    }
  }

  private setStatusDeviceDeactive() {
    this.status = "not connected";
  }
  private setStatusDeviceActive() {
    this.status = "connected";
  }

  sendMessageWTyping = async (jid: string, msg: AnyMessageContent) => {
    await this.sock.presenceSubscribe(jid);
    await delay(500);

    await this.sock.sendPresenceUpdate("composing", jid);
    await delay(2000);

    await this.sock.sendPresenceUpdate("paused", jid);

    return await this.sock.sendMessage(jid, msg);
  };

  formatPhoneWA = (numberPhone: string, prefix = 62) => {
    var type: string;
    if (numberPhone.endsWith("@g.us")) {
      type = "@g.us";
    } else {
      type = "@c.us";
    }

    // 1. menghilangkan karakter selain angka
    let number: string = numberPhone.replace(/\D/g, "");
    // 2. ganti angka 0 didepan menjadi prefix
    if (number.startsWith("0")) {
      number = prefix + number.substr(1);
    }
    return (number += type);
  };
}
