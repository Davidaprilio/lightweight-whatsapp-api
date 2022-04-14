import MessageOptions, { MessageType } from "@adiwajshing/baileys";
import { formatPhoneWA } from "./Helper";

export class SendMessage {
  private sock: any;

  constructor(sock: any) {
    this.sock = sock;
  }

  send(phone: string, options: object) {
    phone = formatPhoneWA(phone);
    this.sock.sendMessage(phone, {});
  }

  text(textMessage: string) {
    this.sock.sendMessage(textMessage);
  }
}
