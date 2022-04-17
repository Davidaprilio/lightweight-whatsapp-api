import MessageOptions, { MessageType } from "@adiwajshing/baileys";
import fs from "fs";
import Client from "./Client";
import { formatPhone, formatPhoneWA } from "./Helper";

interface IVCard {
  name: string;
  phone: string;
}

interface IButton {
  id?: string;
  text: string;
}

interface IListRow {
  title: string;
  rowId?: string;
  description?: string;
}

interface IList {
  title: string;
  rows: IListRow[];
}

enum EmoticonReaction {
  love = "💖",
  lough = "😂",
  pray = "🙏",
  khawatir = "😥",
  sip = "👍",
  mlongo = "😯",
}

export default class CreateMessage {
  private client: any;
  private timeTyping: number;
  private phone: string;
  private payload: { [k: string]: any } = {};

  constructor(client: Client, timeTyping?: number) {
    this.client = client;
    this.timeTyping = timeTyping ?? 2000; //2s
  }

  async send(phone: string, replay?: string): Promise<any> {
    phone = formatPhoneWA(phone);
    const sent = await this.client.sendMessageWithTyping(phone, this.payload);
    console.log("disend.. ", sent);
    return sent;
  }

  /**
   * Add Text
   */
  text(textMessage: string): this {
    this.payload.text = textMessage;
    return this;
  }

  /**
   * Add Mention Some Member or Contact
   */
  mentions(phones: string[]): this {
    phones.forEach((phone) => {
      this.mention(phone);
    });
    return this;
  }

  /**
   * Add Mention Member or Contact
   */
  mention(phone: string): this {
    if (this.payload.mentions === undefined) {
      this.payload.mentions = [];
    }
    this.payload.mentions.push(formatPhoneWA(phone));
    phone = formatPhone(phone);
    this.payload.text += `@${phone}`;
    return this;
  }

  /**
   * add Location
   */
  location(latitude: number, longtitude: number): this {
    this.payload.location = {
      degreesLatitude: latitude,
      degreesLongitude: longtitude,
    };
    return this;
  }

  /**
   * add VCard to Share Contact
   */
  contact(contactInfo: IVCard): this {
    const phone = formatPhone(contactInfo.phone);
    const vcard =
      "BEGIN:VCARD\n" + // metadata of the contact card
      "VERSION:3.0\n" +
      `FN:${contactInfo.name}\n` + // full name
      "ORG:Ashoka Uni;\n" + // the organization of the contact
      `TEL;type=CELL;type=VOICE;waid=${phone}:${contactInfo.phone}\n` + // WhatsApp ID
      "END:VCARD";

    this.payload.contacts = {
      displayName: contactInfo.name,
      contacts: [{ vcard }],
    };
    return this;
  }

  /**
   * Add Button Format
   */
  button(buttons: IButton[], footer?: string): this {
    // { buttonId: "id1", buttonText: { displayText: "Button 1" }, type: 1 }
    const buttonCollect = [];
    buttons.forEach((button) => {
      buttonCollect.push({
        buttonId: "btn-" + (buttonCollect.length + 1),
        buttonText: {
          displayText: button.text,
        },
        type: 1,
      });
    });

    this.payload.buttons = buttonCollect;
    this.payload.footer = footer;
    this.payload.headerType = 1;
    return this;
  }

  /**
   * Add List Format
   */
  list(
    sections: IList[],
    buttonText: string = "Menu",
    title?: string,
    footer?: string
  ): this {
    const sectionsCollect: IList[] = [];
    sections.forEach((listSection) => {
      sectionsCollect.push(listSection);
    });

    this.payload.footer = footer;
    this.payload.title = title;
    this.payload.buttonText = buttonText;
    this.payload.sections = sectionsCollect;

    return this;
  }

  /**
   * Add Reaction
   */
  reaction(key: string, reaction: string): this {
    this.payload.react = {
      text: "👍",
      key,
    };
    return this;
  }

  template(phone: string, textMessage: string) {
    //send a template message!
    const templateButtons = [
      {
        index: 1,
        urlButton: {
          displayText: "⭐ Star Baileys on GitHub!",
          url: "https://github.com/adiwajshing/Baileys",
        },
      },
      {
        index: 2,
        callButton: {
          displayText: "Call me!",
          phoneNumber: "+1 (234) 5678-901",
        },
      },
      {
        index: 3,
        quickReplyButton: {
          displayText: "This is a reply, just like normal buttons!",
          id: "id-like-buttons-message",
        },
      },
    ];

    const templateMessage = {
      text: "Hi it's a template message",
      footer: "Hello World",
      templateButtons: templateButtons,
    };
  }

  /**
   * Kirim Media
   */
  gif(phone: string, textMessage: string) {
    let phon = {
      video: fs.readFileSync("Media/ma_gif.mp4"),
      caption: "hello!",
      gifPlayback: true,
    };

    // Atau
    let phonea = {
      video: "./Media/ma_gif.mp4",
      caption: "hello!",
      gifPlayback: true,
    };
  }

  audio(phone: string, textMessage: string) {
    // {
    //   audio: {
    //     url: "./Media/audio.mp3",
    //   },
    //   mimetype: "audio/mp4",
    // },
    // {
    //   url: "Media/audio.mp3",
    // }
    // can send mp3, mp4, & ogg
  }

  print() {
    console.log(this.payload);
    return this.payload;
  }
}

const sendMsg = new CreateMessage("085231028718");
sendMsg
  .text("Hallo")
  .contact({
    name: "David A",
    phone: "019373263",
  })
  .print();
