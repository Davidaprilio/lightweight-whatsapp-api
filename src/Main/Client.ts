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
import Gevent from "./GlobalEvent";

import MAIN_LOGGER from "../Utils/logger";
import { formatPhoneWA, log, jidToNumberPhone } from "./Helper";
// const logger = MAIN_LOGGER.child({});
// logger.level = "debug";

type ClientStatus = "disconnected" | "connecting" | "connected";
type ClientMode = "md" | "lg"; // Multi Device or Legacy

interface ClientInfo {
  id: string;
  multiDevice: boolean;
  authPath: string;
  storePath: string;
  mode: ClientMode;
  more?: any;
  status: ClientStatus;
  authenticated: boolean;
  qrCode: string;
  ppURL: string; // Profile Picture URL Whatsapp
  pushName: string; // name Whatsapp
  phoneNumber: string; // phone number Whatsapp
  jid: string; // id number from Whatsapp
  browser: string;
  connectedAt: string;
}

interface QueueMessage {
  type: string;
  text: string;
}

export default class Client {
  info: ClientInfo;
  sock: any; // Socket dari makeWALegacySocket | makeWASocket

  private queueMessage: [];
  private status: string;
  private saveState: any;
  private store: any;
  private logger: any;

  constructor(client_id: string, multiDevice: boolean = true) {
    const file = multiDevice ? `${client_id}.json` : `${client_id}-legacy.json`;
    const pathAuth = "./session/auth";
    const pathStorage = "./session/storage/";
    this.info = {
      id: client_id,
      authPath: `${pathAuth}/${file}`,
      storePath: `${pathStorage}/${file}`,
      multiDevice,
      mode: multiDevice ? "md" : "lg",
      ppURL: null,
      pushName: null,
      phoneNumber: null,
      jid: null,
      browser: null,
      connectedAt: null,
      status: "disconnected",
      authenticated: false,
      qrCode: null,
    };

    if (!fs.existsSync(pathAuth)) fs.mkdirSync(pathAuth, { recursive: true });

    if (!fs.existsSync(pathStorage))
      fs.mkdirSync(pathStorage, { recursive: true });

    const logger = MAIN_LOGGER.child({});
    logger.level = "silent";
    this.logger = logger;

    this.setStatusDeviceDeactive();
    this.store = makeInMemoryStore({ logger });
    this.store.readFromFile(this.info.storePath);
  }

  /**
   * Starting Socket Session Client
   */
  startSock = async () => {
    if (this.status == "active") {
      return "Device alredy connected";
    }

    // buat sock dari client yang diberikan
    await this.createSock(this.info.id);

    this.store.bind(this.sock.ev);

    // Set Event
    this.sock.ev.on("messages.upsert", async (m: any) => {
      if (m.type === "append" || m.type === "notify") {
        log("Pesan Masuk", JSON.stringify(m, undefined, 2));
      }

      const msg = m.messages[0];
      if (m.type === "notify") {
        if (!msg.key.fromMe) {
          log("replying to", msg.key.remoteJid);
          await this.sock!.chatRead(msg.key, 1);
        }

        const textMsg = msg?.message?.conversation;
        const templateButtons = [
          {
            index: 1,
            urlButton: {
              url: "https://github.com/Davidaprilio",
              displayText: "visit me",
            },
          },
        ];
        if (textMsg === "!id") {
          await this.sendMessageWithTyping(
            msg.key.remoteJid,
            {
              text: "id: " + msg.key.remoteJid,
              footer: "bot",
              // templateButtons,
            },
            50
          );
        }
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

    this.sock.ev.on("messages.reaction", async (a: any, b: any) => {
      log("Reaction");
      log(a, b);
    });

    // setInterval(() => {
    //   this.store.writeToFile(this.info.store);
    // }, 10_000);

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

    const typeMode = this.info.multiDevice
      ? " Multi Device "
      : "=== Legacy ===";

    log(`======================${typeMode}======================`);
    log(` Using WA v${version.join(".")}, isLatest: ${isLatest} cid: ${host}`);
    log("==========================================================");

    // coba mengambil auth session
    if (this.info.multiDevice) {
      const { state, saveState } = useSingleFileAuthState(this.info.authPath);
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
        this.info.authPath
      );
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
  private async connectionUpdate(update: any) {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const err = (lastDisconnect.error as Boom)?.output;
      log("connection Debug:", err?.payload ?? err);

      // Reconnect jika connection close
      // tapi bukan gara-gara Logout
      if (err?.statusCode !== DisconnectReason.loggedOut) {
        Gevent.emit("device.connecting", this.info.id);
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
        // Gevent.emit("device.disconnect", this.info.id);
        Gevent.emit("device.logout", this.info.id);
        log("Client Is Logout");
        this.setStatusDeviceDeactive();
        this.removeSessionPath();
      }
    } // End Connection Close
    else {
      log("Connection Open", update);
      if (update.qr !== undefined) {
        log("QR Code Update");
        this.resetStatusClient();
        this.info.qrCode = update.qr;
        Gevent.emit("qrcode.update", this.info.id, update.qr, this.info.mode);
      }
      // Client Connected Horeee !!!
      else if (update?.legacy.phoneConnected === true) {
        this.setStatusDeviceActive();
        this.info.status = "connected";
        this.info.qrCode = null;
        this.info.pushName = update.legacy.user.name;
        this.info.jid = update.legacy.user.id;
        this.info.authenticated = true;
        this.info.ppURL = await this.getProfilePicture(this.info.jid);
        this.info.connectedAt = new Date().toDateString();
        this.info.phoneNumber = jidToNumberPhone(this.info.jid);

        Gevent.emit("device.connected", this.info.id, this.info);
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
    Gevent.emit("device.changeMode", this.info.id, {
      mode: this.getDeviceMode(),
      isMultidevice: this.info.multiDevice,
    });
  }

  private getDeviceMode(): string {
    return this.info.multiDevice ? "MultiDevice" : "Legacy";
  }

  /**
   * Handle Remove Session Path
   */
  private removeSessionPath() {
    if (fs.existsSync(this.info.authPath)) {
      fs.rmSync(this.info.authPath, { recursive: true, force: true });
    }
    if (fs.existsSync(this.info.storePath)) {
      fs.rmSync(this.info.storePath, { recursive: true, force: true });
    }
  }

  private setStatusDeviceDeactive() {
    this.status = "not connected";
  }
  private setStatusDeviceActive() {
    this.status = "connected";
  }
  private resetStatusClient(): void {
    this.info.jid = null;
    this.info.status = "disconnected";
    this.info.qrCode = null;
    this.info.pushName = null;
    this.info.phoneNumber = null;
    this.info.authenticated = null;
  }

  sendMessageWithTyping = async (
    jid: string,
    msg: AnyMessageContent,
    // replayMsgId?: string,
    timeTyping?: number
  ) => {
    await this.sock.presenceSubscribe(jid);
    await delay(100);

    await this.sock.sendPresenceUpdate("composing", jid);
    await delay(timeTyping ?? 250); //ms

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
        message: "failed to send message",
        response: err?.payload ?? err,
        err: error.message,
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

  async statusContact(jid: string): Promise<string> {
    const status = await this.sock.fetchStatus(jid);
    console.log("status: " + status);
    return status;
  }

  async getProfilePicture(
    jid: string,
    highResolution = false
  ): Promise<string> {
    if (highResolution) {
      // for high res picture
      this.info.ppURL = await this.sock.profilePictureUrl(jid, "image");
    } else {
      // for low res picture
      this.info.ppURL = await this.sock.profilePictureUrl(jid);
    }
    return this.info.ppURL;
  }
}
