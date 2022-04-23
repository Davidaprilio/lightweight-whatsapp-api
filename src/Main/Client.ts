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
import Spinnies from "spinnies";
import EventEmitter from "events";
class ClientEvent extends EventEmitter {}

import MAIN_LOGGER from "../Utils/logger";
import { formatPhoneWA, log } from "./Helper";
// const logger = MAIN_LOGGER.child({});
// logger.level = "debug";

interface ClientInfo {
  id: string;
  multiDevice: boolean;
  auth: string;
  store: string;
  mode: string;
  more?: any;
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

  info: ClientInfo;
  sock: any; // Socket dari makeWALegacySocket | makeWASocket
  ev: any;
  private state: any;
  private saveState: any;
  private store: any;
  private logger: any;
  private versionBaileys: object;
  private spinnies: Spinnies;

  constructor(client_id: string, multiDevice: boolean = true) {
    const file = multiDevice ? `${client_id}.json` : `${client_id}-legacy.json`;
    this.info = {
      id: client_id,
      auth: `./session/auth/${file}`,
      store: `./session/storage/${file}`,
      multiDevice,
      mode: multiDevice ? "md" : "lg",
    };

    this.ev = new ClientEvent();
    this.spinnies = new Spinnies();

    const logger = MAIN_LOGGER.child({});
    logger.level = "silent";
    this.logger = logger;

    this.setStatusDeviceDeactive();
    this.store = makeInMemoryStore({ logger });
    this.store.readFromFile(this.info.store);
  }

  /**
   * Starting Socket Session Client
   */
  startSock = async () => {
    if (this.status == "active") {
      return "Device alredy connected";
    }
    this.spinnies.add("start-sock", {
      text: `[${this.info.id}]${this.info.mode} Starting`,
    });

    // buat sock dari client yang diberikan
    await this.createSock(this.info.id);

    this.store.bind(this.sock.ev);

    this.sock.ev.on("messages.upsert", async (m: any) => {
      if (m.type === "append" || m.type === "notify") {
        log(JSON.stringify(m, undefined, 2));
      }

      const msg = m.messages[0];
      if (!msg.key.fromMe && m.type === "notify") {
        log("replying to", m.messages[0].key.remoteJid);
        await this.sock!.chatRead(msg.key, 1);
      }
    });

    this.sock.ev.on("messages.update", (m: any) => {
      log("===============  messages.update  ================");
      log(JSON.stringify(m, undefined, 2));
    });

    // this.sock.ev.on("presence.update", (m: any) => log(m));
    this.sock.ev.on("chats.update", (m: any) => log(m));
    // this.sock.ev.on("contacts.update", (m: any) => log(m));

    this.sock.ev.on("connection.update", (update: any) => {
      this.connectionUpdate(update);
    });

    // listen for when the auth credentials is updated
    this.sock.ev.on("creds.update", this.saveState);

    setInterval(() => {
      this.store.writeToFile(this.info.store);
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
   * Perlu Mengisi this.info.multiDevice ke true
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

    const typeMode = this.info.multiDevice
      ? " Multi Device "
      : "=== Legacy ===";

    log(`======================${typeMode}======================`);
    log(` Using WA v${version.join(".")}, isLatest: ${isLatest} cid: ${host}`);
    log("==========================================================");

    // coba mengambil auth session
    if (this.info.multiDevice) {
      const { state, saveState } = useSingleFileAuthState(this.info.auth);
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
      const { state, saveState } = useSingleFileLegacyAuthState(this.info.auth);
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
    this.spinnies.update("start-sock", {
      text: `[${this.info.id}]${this.info.mode} Connecting`,
    });
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
      log("connection Debug:", err?.payload ?? err);

      // Reconnect jika connection close
      // tapi bukan gara-gara Logout
      if (err?.statusCode !== DisconnectReason.loggedOut) {
        const msg = lastDisconnect.error.message;
        this.spinnies.succeed("start-sock", {
          text: `[${this.info.id}]${this.info.mode} Reconnecting`,
        });
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
        this.spinnies.succeed("start-sock", {
          text: `[${this.info.id}]${this.info.mode} Logout`,
        });
        log("Client Is Logout");
        this.setStatusDeviceDeactive();
        this.removeSessionPath();
      }
    } // End Connection Close
    else {
      log("Connection Open", update);
      if (update.qr !== undefined) {
        log("QR Code Update");
        this.spinnies.update("start-sock", {
          text: `[${this.info.id}]${this.info.mode} Scanning QRcode`,
        });
      } else if (update?.legacy.phoneConnected === true) {
        this.spinnies.succeed("start-sock", {
          text: `[${this.info.id}]${this.info.mode} Connected`,
          color: "greenBright",
        });
        this.ev.emit(
          "device.connected",
          this.info.id,
          update.legacy.user,
          this.getDeviceMode()
        );
      }
    }
    // log("connection update", update);
  }

  /**
   * Handle Change Device Mode
   * msg: Pesan Error dari baileys
   */
  private changeDeviceMode(msg: string) {
    // jika Legacy pindah ke socket Multidevice(Beta)
    if (msg === "Require multi-device edition") {
      log("Pindah Socket ke MultiDevice 🏃‍♂️");
      this.info.multiDevice = true;
      this.info.mode = "md";
    }
    // jika Multidevice(Beta) pindah ke socket Legacy
    else if (msg === "Multi-device beta not joined") {
      log("Pindah Socket ke Legacy 🏃‍♂️");
      this.info.multiDevice = false;
      this.info.mode = "lg";
    }
    // kirim event mode diganti
    this.ev.emit(
      "device.changeMode",
      this.getDeviceMode(),
      this.info.multiDevice
    );
  }
  private getDeviceMode() {
    return this.info.multiDevice ? "MultiDevice" : "Legacy";
  }

  /**
   * Handle Remove Session Path
   */
  private removeSessionPath() {
    if (fs.existsSync(this.info.auth)) {
      fs.rmSync(this.info.auth, { recursive: true, force: true });
    }
    if (fs.existsSync(this.info.store)) {
      fs.rmSync(this.info.store, { recursive: true, force: true });
    }
  }

  private setStatusDeviceDeactive() {
    this.status = "not connected";
  }
  private setStatusDeviceActive() {
    this.status = "connected";
  }

  sendMessageWithTyping = async (
    jid: string,
    msg: AnyMessageContent,
    // replayMsgId?: string,
    timeTyping?: number
  ) => {
    await this.sock.presenceSubscribe(jid);
    await delay(500);

    await this.sock.sendPresenceUpdate("composing", jid);
    await delay(timeTyping ?? 2000); //ms

    await this.sock.sendPresenceUpdate("paused", jid);
    // const msgId = replayMsgId == null ? null : { quoted: replayMsgId };
    try {
      return await this.sock.sendMessage(jid, msg);
    } catch (error) {
      const err = (error as Boom)?.output;
      console.error("Send message", err?.payload ?? err);
      return {
        status: false,
        error: true,
        message: "failed to send message, format invalid",
      };
    }
  };

  /**
   * Checking Phone Number is Registration on Whatsapp
   */
  async isRegistWA(numberPhone: string): Promise<boolean> {
    const res = await this.sock.onWhatsApp(formatPhoneWA(numberPhone));
    return res?.exists ?? false;
  }
}
